"""Load collections and determine the order."""
from past.builtins import basestring
from .typedsheets import cast_row_values
from functools import reduce
import io
import json
import structlog
import os.path
import boto3
import os
from datetime import datetime
from dcicutils.beanstalk_utils import get_beanstalk_real_url
from pyramid.paster import get_app

from pyramid.view import view_config


text = type(u'')

logger = structlog.getLogger('encoded')

def includeme(config):
    # provide an endpoint to do bulk uploading that just uses loadxl
    config.add_route('load_data', '/load_data')
    config.scan(__name__)

ORDER = [
    'user',
    'award',
    'lab',
    'static_section',
    'page',
    'ontology',
    'ontology_term',
    'file_format',
    'badge',
    'organism',
    'genomic_region',
    'target',
    'imaging_path',
    'publication',
    'publication_tracking',
    'document',
    'image',
    'vendor',
    'construct',
    'modification',
    'protocol',
    'sop_map',
    'biosample_cell_culture',
    'individual_human',
    'individual_mouse',
    'individual_fly',
    'biosource',
    'antibody',
    'enzyme',
    'treatment_rnai',
    'treatment_agent',
    'biosample',
    'quality_metric_fastqc',
    'quality_metric_bamqc',
    'quality_metric_pairsqc',
    'quality_metric_dedupqc_repliseq',
    'microscope_setting_d1',
    'microscope_setting_d2',
    'microscope_setting_a1',
    'microscope_setting_a2',
    'file_fastq',
    'file_processed',
    'file_reference',
    'file_calibration',
    'file_microscopy',
    'file_set',
    'file_set_calibration',
    'file_set_microscope_qc',
    'experiment_hi_c',
    'experiment_capture_c',
    'experiment_repliseq',
    'experiment_atacseq',
    'experiment_chiapet',
    'experiment_damid',
    'experiment_seq',
    'experiment_tsaseq',
    'experiment_mic',
    'experiment_set',
    'experiment_set_replicate',
    'data_release_update',
    'software',
    'analysis_step',
    'workflow',
    'workflow_mapping',
    'workflow_run_sbg',
    'workflow_run_awsem'
]

IS_ATTACHMENT = [
    'attachment',
    'file_format_specification',
    'IDR_plot_true',
    'IDR_plot_rep1_pr',
    'IDR_plot_rep2_pr',
    'IDR_plot_pool_pr',
    'IDR_parameters_true',
    'IDR_parameters_rep1_pr',
    'IDR_parameters_rep2_pr',
    'IDR_parameters_pool_pr',
    'cross_correlation_plot'
]



@view_config(route_name='load_data', request_method='POST', permission='add')
def load_data_view(context, request):
    '''
    we expect to get posted data in the form of
    {'item_type': [items], 'item_type2': [items]}
    then we just use load_all to load all that stuff in
    '''

    # this is a bit wierd but want to reuse load_data functionality so I'm rolling with it
    config_uri = request.json.get('config_uri', 'production.ini')
    app = get_app(config_uri, 'app')
    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    # expected response
    request.response.status = 200
    result = {
        'status': 'success',
        '@type': ['result'],
    }
    # if we post local_dir key then we use local data
    # actually load the stuff
    from pkg_resources import resource_filename
    local_dir = request.json.get('local_dir')
    if  local_dir:
        local_inserts = resource_filename('encoded', 'tests/data/' + local_dir + '/')
        res = load_all(testapp, local_inserts, [])
    else:
        res = load_all(testapp, request.json, [], from_json=True)

    if res:
        request.response.status = 422
        result['status'] = 'error'
        result['@graph'] = res

    return result


##############################################################################
# Pipeline components
#
# http://www.stylight.com/Numbers/pipes-and-filters-architectures-with-python-generators/
#
# Dictionaries are passed through the pipeline. By convention, values starting
# with an underscore (_) are ignored by the component posting a final value
# so are free for communicating information down the pipeline.


def noop(dictrows):
    """ No-op component

    Useful for pipeline component factories.
    """
    return dictrows


def remove_keys_with_empty_value(dictrows):
    for row in dictrows:
        yield {
            k: v for k, v in row.items()
            if k and v not in ('', None, [])
        }


##############################################################################
# Pipeline component factories


def warn_keys_with_unknown_value_except_for(*keys):
    def component(dictrows):
        for row in dictrows:
            for k, v in row.items():
                if k not in keys and text(v).lower() == 'unknown':
                    logger.warn('unknown %r for %s' % (k, row.get('uuid', '<empty uuid>')))
            yield row

    return component


def skip_rows_missing_all_keys(*keys):
    def component(dictrows):
        for row in dictrows:
            if not any(key in row for key in keys):
                row['_skip'] = True
            yield row

    return component


def skip_rows_with_all_key_value(**kw):
    def component(dictrows):
        for row in dictrows:
            if all(row[k] == v if k in row else False for k, v in kw.items()):
                row['_skip'] = True
            yield row

    return component


def skip_rows_in_excludes(**kw):
    def component(dictrows):
        for row in dictrows:
            excludes = kw.get('excludes')
            if excludes is None:
                excludes = []
            if row.get('uuid') in excludes:
                row['_skip'] = True
            yield row

    return component


def skip_rows_without_all_key_value(**kw):
    def component(dictrows):
        for row in dictrows:
            if not all(row[k] == v if k in row else False for k, v in kw.items()):
                row['_skip'] = True
            yield row

    return component


def remove_keys(*keys):
    def component(dictrows):
        for row in dictrows:
            for key in keys:
                row.pop(key, None)
            yield row

    return component


def skip_rows_with_all_falsey_value(*keys):
    def component(dictrows):
        for row in dictrows:
            if all(not row[key] if key in row else False for key in keys):
                row['_skip'] = True
            yield row

    return component


def add_attachments(docsdir):
    def component(dictrows):
        for row in dictrows:
            for attachment_property in IS_ATTACHMENT:
                filename = row.get(attachment_property, None)
                if filename is None:
                    continue
                try:
                    path = find_doc(docsdir, filename)
                    row[attachment_property] = attachment(path)
                except ValueError as e:
                    row['_errors'] = repr(e)
            yield row

    return component


##############################################################################
# Read input from spreadsheets
#
# Downloading a zipfile of xlsx files from Google Drive is most convenient
# but it's better to check tsv into git.


def read_single_sheet(path, name=None):
    """ Read an xlsx, csv, json, or tsv from a zipfile or directory
    """
    from zipfile import ZipFile
    from . import xlreader
    if name is None or path.endswith('.json'):
        root, ext = os.path.splitext(path)
        stream = open(path, 'r')

        if ext == '.xlsx':
            return read_xl(stream)

        if ext == '.tsv':
            return read_csv(stream, dialect='excel-tab')

        if ext == '.csv':
            return read_csv(stream)

        if ext == '.json':
            return read_json(stream)

        raise ValueError('Unknown file extension for %r' % path)

    if path.endswith('.xlsx'):
        return cast_row_values(xlreader.DictReader(open(path, 'rb'), sheetname=name))

    if path.endswith('.zip'):
        zf = ZipFile(path)
        names = zf.namelist()

        if (name + '.xlsx') in names:
            stream = zf.open(name + '.xlsx', 'r')
            return read_xl(stream)

        if (name + '.tsv') in names:
            stream = io.TextIOWrapper(zf.open(name + '.tsv'), encoding='utf-8')
            return read_csv(stream, dialect='excel-tab')

        if (name + '.csv') in names:
            stream = io.TextIOWrapper(zf.open(name + '.csv'), encoding='utf-8')
            return read_csv(stream)

        if (name + '.json') in names:
            stream = io.TextIOWrapper(zf.open(name + '.json'), encoding='utf-8')
            return read_json(stream)

    if os.path.isdir(path):
        root = os.path.join(path, name)

        if os.path.exists(root + '.xlsx'):
            stream = open(root + '.xlsx', 'rb')
            return read_xl(stream)

        if os.path.exists(root + '.tsv'):
            stream = open(root + '.tsv', 'rU')
            return read_csv(stream, dialect='excel-tab')

        if os.path.exists(root + '.csv'):
            stream = open(root + '.csv', 'rU')
            return read_csv(stream)

        if os.path.exists(root + '.json'):
            stream = open(root + '.json', 'r')
            return read_json(stream)

    return []


def read_xl(stream):
    from . import xlreader
    return cast_row_values(xlreader.DictReader(stream))


def read_csv(stream, **kw):
    import csv
    return cast_row_values(csv.DictReader(stream, **kw))


def read_json(stream):
    import json
    obj = json.load(stream)
    if isinstance(obj, dict):
        return [obj]
    return obj


##############################################################################
# Posting json
#
# This would a one liner except for logging

def request_url(item_type, method):
    def component(rows):
        for row in rows:
            if method == 'POST':
                url = row['_url'] = '/' + item_type
                yield row
                continue

            if '@id' in row:
                url = row['@id']
                if not url.startswith('/'):
                    url = '/' + url
                row['_url'] = url
                yield row
                continue

            # XXX support for aliases
            for key in ['uuid', 'accession']:
                if key in row:
                    url = row['_url'] = '/' + row[key]
                    break
            else:
                row['_errors'] = ValueError('No key found. Need uuid or accession.')

            yield row

    return component


def make_request(testapp, item_type, method):
    json_method = getattr(testapp, method.lower() + '_json')

    def component(rows):
        for row in rows:
            if row.get('_skip') or row.get('_errors') or not row.get('_url'):
                continue

            # Keys with leading underscores are for communicating between
            # sections
            value = row['_value'] = {
                k: v for k, v in row.items() if not k.startswith('_') and not k.startswith('@')
            }

            url = row['_url']
            row['_response'] = json_method(url, value, status='*')

            yield row

    return component


##############################################################################
# Logging


def trim(value):
    """Shorten excessively long fields in error log."""
    if isinstance(value, dict):
        return {k: trim(v) for k, v in value.items()}
    if isinstance(value, list):
        return [trim(v) for v in value]
    if isinstance(value, basestring) and len(value) > 160:
        return value[:77] + '...' + value[-80:]
    return value


def pipeline_logger(item_type, phase):
    def component(rows):
        created = 0
        updated = 0
        errors = 0
        skipped = 0
        count = 0
        for index, row in enumerate(rows):
            row_number = index + 2  # header row
            count = index + 1
            res = row.get('_response')

            if res is None:
                # _skip = row.get('_skip')
                _errors = row.get('_errors')
                if row.get('_skip'):
                    skipped += 1
                elif _errors:
                    errors += 1
                    logger.error('%s row %d: Error PROCESSING: %s\n%r\n' % (item_type, row_number, _errors, trim(row)))
                yield row
                continue

            url = row.get('_url')
            # uuid = row.get('uuid')

            if res.status_int == 200:
                updated += 1
                logger.debug('UPDATED: %s' % url)

            if res.status_int == 201:
                created += 1
                logger.debug('CREATED: %s' % res.location)

            if res.status_int == 409:
                logger.error('CONFLICT: %r' % res.json['detail'])

            if res.status_int == 422:
                logger.error('VALIDATION FAILED: %r' % trim(res.json['errors']))

            if res.status_int // 100 == 4:
                errors += 1
                logger.error('%s row %d: %s (%s)\n%r\n' % (item_type, row_number, res.status, url, trim(row['_value'])))

            yield row

        loaded = created + updated
        logger.info('Loaded %d of %d %s (phase %s). CREATED: %d, UPDATED: %d, SKIPPED: %d, ERRORS: %d' % (
            loaded, count, item_type, phase, created, updated, skipped, errors))

    return component


##############################################################################
# Attachments


def find_doc(docsdir, filename):
    """smth."""
    path = None
    for dirpath in docsdir:
        candidate = os.path.join(dirpath, filename)
        if not os.path.exists(candidate):
            continue
        if path is not None:
            msg = 'Duplicate filenames: %s, %s' % (path, candidate)
            raise ValueError(msg)
        path = candidate
    if path is None:
        raise ValueError('File not found: %s' % filename)
    return path


def attachment(path):
    """Create an attachment upload object from a filename Embeds the attachment as a data url."""
    import magic
    import mimetypes
    from PIL import Image
    from base64 import b64encode

    filename = os.path.basename(path)
    mime_type, encoding = mimetypes.guess_type(path)
    major, minor = mime_type.split('/')
    try:
        detected_type = magic.from_file(path, mime=True).decode('ascii')
    except AttributeError:
        detected_type = magic.from_file(path, mime=True)

    # XXX This validation logic should move server-side.
    if not (detected_type == mime_type or
            detected_type == 'text/plain' and major == 'text'):
        raise ValueError('Wrong extension for %s: %s' % (detected_type, filename))

    with open(path, 'rb') as stream:
        attach = {
            'download': filename,
            'type': mime_type,
            'href': 'data:%s;base64,%s' % (mime_type, b64encode(stream.read()).decode('ascii'))
        }

        if mime_type in ('application/pdf', "application/zip", 'text/plain',
                         'text/tab-separated-values', 'text/html', 'application/msword',
                         'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
            # XXX Should use chardet to detect charset for text files here.
            return attach

        if major == 'image' and minor in ('png', 'jpeg', 'gif', 'tiff'):
            # XXX we should just convert our tiffs to pngs
            stream.seek(0, 0)
            im = Image.open(stream)
            im.verify()
            if im.format != minor.upper():
                msg = "Image file format %r does not match extension for %s"
                raise ValueError(msg % (im.format, filename))

            attach['width'], attach['height'] = im.size
            return attach

    raise ValueError("Unknown file type for %s" % filename)


##############################################################################
# Pipelines


def combine(source, pipeline):
    """Construct a combined generator from a source and pipeline."""
    return reduce(lambda x, y: y(x), pipeline, source)


def process(rows):
    """Pull rows through the pipeline."""
    for row in rows:
        pass


def get_pipeline(testapp, docsdir, test_only, item_type, phase=None, exclude=None, method=None):
    """smth."""
    pipeline = [
        skip_rows_with_all_key_value(test='skip'),
        skip_rows_with_all_key_value(_test='skip'),
        skip_rows_in_excludes(excludes=exclude),
        skip_rows_with_all_falsey_value('test') if test_only else noop,
        skip_rows_with_all_falsey_value('_test') if test_only else noop,
        remove_keys_with_empty_value,
        skip_rows_missing_all_keys('uuid', 'accession', '@id', 'name'),
        remove_keys('schema_version'),
        warn_keys_with_unknown_value_except_for(
            'lot_id', 'sex', 'life_stage', 'health_status', 'ethnicity',
            'strain_background', 'age', 'version',
            'model_organism_health_status',
            'model_organism_age',
            'model_organism_sex',
            'mouse_life_stage',
            # 'flowcell_details.machine',
        ),
        add_attachments(docsdir),
    ]
    # special case for incremental ontology updates
    if phase == 'patch_ontology':
        method = 'PATCH'
    elif phase is None and method is not None:
        method = method
    elif phase == 1:
        method = 'POST'
        pipeline.extend(PHASE1_PIPELINES.get(item_type, []))
    elif phase == 2:
        method = 'PUT'
        pipeline.extend(PHASE2_PIPELINES.get(item_type, []))

    pipeline.extend([
        request_url(item_type, method),
        remove_keys('uuid') if method in ('PUT', 'PATCH') else noop,
        make_request(testapp, item_type, method),
        pipeline_logger(item_type, phase),
    ])
    return pipeline


# Additional pipeline sections for item types

PHASE1_PIPELINES = {
    'ontology': [
        remove_keys('synonym_terms', 'definition_terms', 'relation_terms')
    ],
    'ontology_term': [
        remove_keys('parents', 'slim_terms')
    ],
    'user': [
        remove_keys('lab', 'submits_for'),
    ],
    'file_fastq': [
        remove_keys('related_files'),
    ],
    'file_fasta': [
        remove_keys('related_files'),
    ],
    'file_processed': [
        remove_keys('related_files', "workflow_run", "source_experiments", 'produced_from'),
    ],
    'file_reference': [
        remove_keys('related_files'),
    ],
    'file_calibration': [
        remove_keys('related_files'),
    ],
    'file_microscopy': [
        remove_keys('related_files'),
    ],
    'file_set': [
        remove_keys('files_in_set'),
    ],
    'file_set_calibration': [
        remove_keys('files_in_set'),
    ],
    'file_set_microscope_qc': [
        remove_keys('files_in_set'),
    ],
    'experiment_hi_c': [
        remove_keys('experiment_relation'),
    ],
    'experiment_capture_c': [
        remove_keys('experiment_relation'),
    ],
    'experiment_repliseq': [
        remove_keys('experiment_relation'),
    ],
    'experiment_atacseq': [
        remove_keys('experiment_relation'),
    ],
    'experiment_chiapet': [
        remove_keys('experiment_relation'),
    ],
    'experiment_damid': [
        remove_keys('experiment_relation'),
    ],
    'experiment_seq': [
        remove_keys('experiment_relation'),
    ],
    'experiment_tsaseq': [
        remove_keys('experiment_relation'),
    ],
    'publication': [
        remove_keys('exp_sets_prod_in_pub', 'exp_sets_used_in_pub'),
    ],
    'publication_tracking': [
        remove_keys('experiment_sets_in_pub'),
    ],
    'biosource': [
        remove_keys('cell_line')
    ]
}


##############################################################################
# Phase 2 pipelines
#
# A second pass is required to cope with reference cycles. Only rows with
# filtered out keys are updated.


PHASE2_PIPELINES = {
    'ontology': [
        skip_rows_missing_all_keys('synonym_terms', 'definition_terms', 'relation_terms'),
    ],
    'ontology_term': [
        skip_rows_missing_all_keys('parents', 'slim_terms'),
    ],
    'user': [
        skip_rows_missing_all_keys('lab', 'submits_for'),
    ],
    'file_fastq': [
        skip_rows_missing_all_keys('related_files'),
    ],
    'file_fasta': [
        skip_rows_missing_all_keys('related_files'),
    ],
    'file_processed': [
        skip_rows_missing_all_keys('related_files', "workflow_run", "source_experiments", 'produced_from'),
    ],
    'file_reference': [
        skip_rows_missing_all_keys('related_files'),
    ],
    'file_calibration': [
        skip_rows_missing_all_keys('related_files'),
    ],
    'file_microscopy': [
        skip_rows_missing_all_keys('related_files'),
    ],
    'file_set': [
        skip_rows_missing_all_keys('files_in_set'),
    ],
    'file_set_calibration': [
        skip_rows_missing_all_keys('files_in_set'),
    ],
    'file_set_microscope_qc': [
        skip_rows_missing_all_keys('files_in_set'),
    ],
    'experiment_hi_c': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_capture_c': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_repliseq': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_atacseq': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_chiapet': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_damid': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_seq': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'experiment_tsaseq': [
        skip_rows_missing_all_keys('experiment_relation'),
    ],
    'publication': [
        skip_rows_missing_all_keys('exp_sets_prod_in_pub', 'exp_sets_used_in_pub'),
    ],
    'publication_tracking': [
        skip_rows_missing_all_keys('experiment_sets_in_pub'),
    ],
    'biosource': [
        skip_rows_missing_all_keys('cell_line')
    ]
}


def load_all(testapp, filename, docsdir, test=False, phase=None, itype=None, from_json=False):
    """smth."""
    # exclude_list is for items that fail phase1 to be excluded from phase2
    exclude_list = []
    errors = []
    order = list(ORDER)
    # default incase no data comes in
    force_return = False
    if itype is not None:
        if isinstance(itype, list):
            order = itype
        else:
            order = [itype]
    for item_type in order:
        try:
            if from_json:
                source = filename.get(item_type)
                if source == None:
                    continue
            else:
                source = read_single_sheet(filename, item_type)
        except ValueError:
            logger.error('Opening %s %s failed.', filename, item_type)
            continue

        # special case for patching ontology terms
        if item_type == 'ontology_term' and phase == 'patch_ontology':
            force_return = True
        else:
            force_return = False
            phase = 1

        pipeline = get_pipeline(testapp, docsdir, test, item_type, phase=phase)
        processed_data = combine(source, pipeline)

        for result in processed_data:
            if result.get('_response') and result.get('_response').status_code not in [200, 201]:
                errors.append({'uuid': result['uuid'],
                               'error': result['_response'].json})
                # import pdb; pdb.set_trace()
                exclude_list.append(result['uuid'])
                print("excluding uuid %s do to error" % result['uuid'])
    if force_return:
        return

    for item_type in order:
        if item_type not in PHASE2_PIPELINES:
            continue
        try:
            if from_json:
                source = filename.get(item_type)
                if source == None:
                    continue
            else:
                source = read_single_sheet(filename, item_type)
        except ValueError:
            continue
        pipeline = get_pipeline(testapp, docsdir, test, item_type, phase=2, exclude=exclude_list)
        process(combine(source, pipeline))
    return errors


def generate_access_key(testapp, store_access_key,
                        email='4dndcic@gmail.com'):

    # get admin user and generate access keys
    if store_access_key:
        # we probably don't have elasticsearch index updated yet
        admin = testapp.get('/users/%s?datastore=database' % (email)).follow().json

        access_key_req = {
            'user': admin['@id'],
            'description': 'key for submit4dn',
        }
        res = testapp.post_json('/access_key', access_key_req).json
        if store_access_key == 'local':
            # for local storing we always connecting to local server
            server = 'http://localhost:8000'
        else:
            health = testapp.get('/health?format=json').json
            env = health.get('beanstalk_env')
            server = get_beanstalk_real_url(env)
            print("server is %s" % server)

        akey = {'default':
                {'secret': res['secret_access_key'],
                 'key': res['access_key_id'],
                 'server': server,
                 }
                }
        return json.dumps(akey)


def store_keys(app, store_access_key, keys, s3_file_name='illnevertell'):
        if (not keys):
            return
        # write to ~/keypairs.json
        if store_access_key == 'local':
            home_dir = os.path.expanduser('~')
            keypairs_filename = os.path.join(home_dir, 'keypairs.json')

            print("Storing access keys to %s", keypairs_filename)
            with open(keypairs_filename, 'w') as keypairs:
                    # write to file for local
                    keypairs.write(keys)

        elif store_access_key == 's3':
            # if access_key_loc == 's3', always generate new keys
            s3bucket = app.registry.settings['system_bucket']
            secret = os.environ.get('AWS_SECRET_KEY')
            if not secret:
                print("no secrets for s3 upload, you probably shouldn't be doing"
                      "this from your local machine")
                print("halt and catch fire")
                return

            s3 = boto3.client('s3', region_name='us-east-1')
            secret = secret[:32]

            print("Uploading S3 object with SSE-C")
            s3.put_object(Bucket=s3bucket,
                          Key=s3_file_name,
                          Body=keys,
                          SSECustomerKey=secret,
                          SSECustomerAlgorithm='AES256')


def load_data(app, access_key_loc=None, indir='inserts', docsdir=None, clear_tables=False):
    '''
    generic load data function
    indir for inserts should be relative to tests/data/
    docsdir is relative to tests/data and defaults to no docs dir
    '''
    if clear_tables:
        from snovault import DBSESSION
        from snovault.storage import Base
        session = app.registry[DBSESSION]
        # this can timeout if others are holding connection
        # to database
        import transaction
        try:
            Base.metadata.drop_all(session.connection().engine)
            Base.metadata.create_all(session.connection().engine)
        except Exception as e:
            logger.error("error droping tables: %s" % str(e))
            transaction.abort()
        else:
            transaction.commit()
        transaction.begin()

    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)
    from pkg_resources import resource_filename
    if indir != 'master-inserts':  # Always load up master_inserts
        master_inserts = resource_filename('encoded', 'tests/data/master-inserts/')
        load_all(testapp, master_inserts, [])

    if not indir.endswith('/'):
        indir += '/'
    inserts = resource_filename('encoded', 'tests/data/' + indir)
    if docsdir is None:
        docsdir = []
    else:
        if not docsdir.endswith('/'):
            docsdir += '/'
        docsdir = [resource_filename('encoded', 'tests/data/' + docsdir)]
    load_all(testapp, inserts, docsdir)
    keys = generate_access_key(testapp, access_key_loc)
    store_keys(app, access_key_loc, keys)


def load_test_data(app, access_key_loc=None, clear_tables=False):
    load_data(app, access_key_loc, docsdir='documents', indir='inserts',
              clear_tables=clear_tables)


def load_prod_data(app, access_key_loc=None, clear_tables=False):
    load_data(app, access_key_loc, indir='prod-inserts',
              clear_tables=clear_tables)


def load_jin_data(app, access_key_loc=None, clear_tables=False):
    load_data(app, access_key_loc, indir='jin_inserts',
              clear_tables=clear_tables)

def load_wfr_data(app, access_key_loc=None, clear_tables=False):
    load_data(app, access_key_loc, indir='wfr-grouping-inserts',
              clear_tables=clear_tables)


def load_ontology_terms(app,
                        post_json='tests/data/ontology-term-inserts/ontology_post.json',
                        patch_json='tests/data/ontology-term-inserts/ontology_patch.json',):

    from webtest import TestApp
    from webtest.app import AppError
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    from pkg_resources import resource_filename
    posts = resource_filename('encoded', post_json)
    patches = resource_filename('encoded',patch_json)
    docsdir = []
    load_all(testapp, posts, docsdir, itype='ontology_term')
    load_all(testapp, patches, docsdir, itype='ontology_term', phase='patch_ontology')

    # now keep track of the last time we loaded these suckers
    data = {"name" : "ffsysinfo", "ontology_updated":datetime.today().isoformat()}
    try:
        testapp.post_json("/sysinfo", data)
    except AppError:
        testapp.patch_json("/sysinfo/%s" % data['name'], data)
