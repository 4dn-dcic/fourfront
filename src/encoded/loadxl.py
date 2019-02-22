"""Load collections and determine the order."""
import mimetypes
import structlog
import os.path
import boto3
import magic
import json
import os
from dcicutils.beanstalk_utils import get_beanstalk_real_url
from past.builtins import basestring
from pyramid.view import view_config
from pyramid.paster import get_app
from datetime import datetime
from base64 import b64encode
from PIL import Image

text = type(u'')
logger = structlog.getLogger('encoded')


def includeme(config):
    # provide an endpoint to do bulk uploading that just uses loadxl
    config.add_route('load_data', '/load_data')
    config.scan(__name__)

# order of items references in 'required' field in schemas
ORDER = [
    'user',
    'award',
    'lab',
    'file_format',
    'experiment_type',
    'biosource',
    'biosample',
    'workflow',
    'vendor'
]

IS_ATTACHMENT = [
    'attachment',
    'file_format_specification',
]


@view_config(route_name='load_data', request_method='POST', permission='add')
def load_data_view(context, request):
    '''
    expected input data

    {'local_dir': inserts folder on your computer
     'fdn_dir': inserts folder under encoded
     'store': if not local_dir or fdn_dir, use the dictionary
     'overwrite' (Bool): overwrite if existing data
     'itype': (list or str): only pick some types from the source
     'config_uri': user supplied configuration file}

    post can contain 2 different styles of data
    1) reference to a folder
    2) store in form of {'item_type': [items], 'item_type2': [items]}
       item_type should be same as insert file names i.e. file_fastq
    '''
    # this is a bit wierd but want to reuse load_data functionality so I'm rolling with it
    config_uri = request.json.get('config_uri', 'production.ini')
    app = get_app(config_uri, 'app')
    from webtest import TestApp
    environ = {'HTTP_ACCEPT': 'application/json', 'REMOTE_USER': 'TEST'}
    testapp = TestApp(app, environ)
    # expected response
    request.response.status = 200
    result = {
        'status': 'success',
        '@type': ['result'],
    }
    from pkg_resources import resource_filename
    store = request.json.get('store', {})
    fdn_dir = request.json.get('fdn_dir')
    local_dir = request.json.get('local_dir')
    overwrite = request.json.get('overwrite', False)
    itype = request.json.get('itype', None)

    if fdn_dir:
        fdn_inserts = resource_filename('encoded', 'tests/data/' + fdn_dir + '/')
        res = load_all(testapp, fdn_inserts, None, overwrite=overwrite, itype=itype)
    elif local_dir:
        res = load_all(testapp, local_dir, None, overwrite=overwrite, itype=itype)
    elif store:
        res = load_all(testapp, store, None, overwrite=overwrite, itype=itype, from_json=True)
    else:
        res = 'No uploadable content found!'

    # Expect res to be empty if load_all is success?
    if res:
        request.response.status = 422
        result['status'] = 'error'
        result['@graph'] = str(res)
    return result


def trim(value):
    """Shorten excessively long fields in error log."""
    if isinstance(value, dict):
        return {k: trim(v) for k, v in value.items()}
    if isinstance(value, list):
        return [trim(v) for v in value]
    if isinstance(value, basestring) and len(value) > 160:
        return value[:77] + '...' + value[-80:]
    return value


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
        attach = {'download': filename,
                  'type': mime_type,
                  'href': 'data:%s;base64,%s' % (mime_type, b64encode(stream.read()).decode('ascii'))}
        if mime_type in ('application/pdf', "application/zip", 'text/plain',
                         'text/tab-separated-values', 'text/html', 'application/msword', 'application/vnd.ms-excel',
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
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


def format_for_attachment(json_data, docsdir):
    for field in IS_ATTACHMENT:
        if field in json_data:
            if isinstance(json_data[field], dict):
                pass
            elif isinstance(json_data[field], str):
                path = find_doc(docsdir, json_data[field])
                json_data[field] = attachment(path)
            else:
                # malformatted attachment
                del json_data[field]
                logger.error('Removing {} form {}, expecting path'.format(field, json_data['uuid']))
    return json_data


def load_all(testapp, inserts, docsdir, overwrite=True, itype=None, from_json=False):
    """convert data to store format dictionary (same format expected from from_json=True),
    assume main function is to load reasonable number of inserts from a folder
    args:
        testapp
        inserts : either a folder, or a dictionary in the store format
        docsdir : attachment folder
        overwrite (bool)   : if the database contains the item already, skip or patch
        itype (list or str): limit selection to certain type/types
        from_json (bool)   : if set to true, inserts should be dict instead of folder name
    """
    # Collect Items
    store = {}
    if from_json:
        store = inserts
    if not from_json:
        # grab json files
        if not inserts.endswith('/'):
            inserts += '/'
        files = [i for i in os.listdir(inserts) if i.endswith('.json')]
        for a_file in files:
            item_type = a_file.split('/')[-1].replace(".json", "")
            with open(inserts + a_file) as f:
                store[item_type] = json.loads(f.read())
    # if there is a defined set of items, subtract the rest
    if itype is not None:
        if isinstance(itype, list):
            store = {i: store[i] for i in itype if i in store}
        else:
            store = {itype: store.get(itype, [])}
    # clear empty values
    store = {k: v for k, v in store.items() if v is not None}
    if not store:
        logger.error('No items found in %s %s', inserts, item_type)
        return
    # order Items

    all_types = list(store.keys())
    for ref_item in reversed(ORDER):
        if ref_item in all_types:
            all_types.insert(0, all_types.pop(all_types.index(ref_item)))
    # collect schemas
    profiles = testapp.get('/profiles/?frame=raw').json

    # run step1 - if item does not exist, post with minimal metadata
    second_round_items = {}
    for a_type in all_types:
        # this conversion of schema name to object type works for all existing schemas at the moment
        obj_type = "".join([i.title() for i in a_type.split('_')])
        # minimal schema
        schema_info = profiles[obj_type]
        req_fields = schema_info.get('required', [])
        ids = schema_info.get('identifyingProperties', [])
        # some schemas did not include aliases
        if 'aliases' not in ids:
            ids.append('aliases')
        first_fields = list(set(req_fields+ids))
        remove_existing_items = []
        posted = 0
        patched = 0
        skip_exist = 0
        for an_item in store[a_type]:
            try:
                testapp.get('/'+an_item['uuid'], status=200)
                exists = True
            except:
                exists = False
            # skip the items that exists, if overwrite is not allowed, they them out from patch list
            if exists:
                skip_exist += 1
                if not overwrite:
                    remove_existing_items.append(an_item['uuid'])
                continue
            post_first = {key: value for (key, value) in an_item.items() if key in first_fields}
            post_first = format_for_attachment(post_first, docsdir)
            try:
                res = testapp.post_json('/'+a_type, post_first)
                assert res.status_code == 201
                posted += 1
            except Exception as e:
                logger.error(str(trim(e)))
                return e
        second_round_items[a_type] = [i for i in store[a_type] if i['uuid'] not in remove_existing_items]
        logger.info('{} 1st: {} items posted, {} items exists.'.format(a_type, posted, skip_exist))
        logger.info('{} 1st: {} items will be patched in second round'.format(a_type, str(len(second_round_items.get(a_type, [])))))

    # Round II - patch the rest of the metadata
    for a_type in all_types:
        obj_type = "".join([i.title() for i in a_type.split('_')])
        if not second_round_items[a_type]:
            logger.info('{} 2nd: no items to patch'.format(a_type))
            continue
        for an_item in second_round_items[a_type]:
            an_item = format_for_attachment(an_item, docsdir)
            try:
                res = testapp.patch_json('/'+an_item['uuid'], an_item)
                assert res.status_code == 200
                patched += 1
            except Exception as e:
                logger.error(trim(str(e)))
                return e
        logger.info('{} 2nd: {} items patched .'.format(a_type, patched))


def generate_access_key(testapp, store_access_key, email='4dndcic@gmail.com'):

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


def load_data(app, access_key_loc=None, indir='inserts', docsdir=None,
              clear_tables=False, overwrite=False):
    '''
    This function will take the inserts folder as input, and place them to the given environment.
    args:
        app:
        access_key_loc (None):
        indir (inserts): inserts folder, should be relative to tests/data/
        docsdir (None): folder with attachment documents, relative to tests/data
        clear_tables (False): Not sure- clear existing database before loading inserts
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
    load_all(testapp, inserts, docsdir, overwrite=overwrite)
    keys = generate_access_key(testapp, access_key_loc)
    store_keys(app, access_key_loc, keys)


def load_test_data(app, access_key_loc=None, clear_tables=False, overwrite=False):
    """
    Load inserts and master-inserts
    """
    load_data(app, access_key_loc, docsdir='documents', indir='inserts',
              clear_tables=clear_tables, overwrite=overwrite)


def load_local_data(app, access_key_loc=None, clear_tables=False, overwrite=False):
    """
    Load temp-local-inserts. If not present, load inserts and master-inserts
    """
    from pkg_resources import resource_filename
    # if we have any json files in temp-local-inserts, use those
    chk_dir = resource_filename('encoded', 'tests/data/temp-local-inserts')
    use_temp_local = False
    for (dirpath, dirnames, filenames) in os.walk(chk_dir):
        use_temp_local = any([fn for fn in filenames if fn.endswith('.json')])

    if use_temp_local:
        load_data(app, access_key_loc, docsdir='documents', indir='temp-local-inserts',
                  clear_tables=clear_tables, use_master_inserts=False, overwrite=overwrite)
    else:
        load_data(app, access_key_loc, docsdir='documents', indir='inserts',
                  clear_tables=clear_tables, overwrite=overwrite)


def load_prod_data(app, access_key_loc=None, clear_tables=False, overwrite=False):
    """
    Load master-inserts
    """
    load_data(app, access_key_loc, indir='master-inserts',
              clear_tables=clear_tables, overwrite=overwrite)


def load_ontology_terms(app, post_json=None, patch_json=None):
    from webtest import TestApp
    from webtest.app import AppError
    # change the data format from list to store
    if post_json:
        post_json = {'ontology_term': post_json}
    if patch_json:
        patch_json = {'ontology_term': patch_json}

    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    if post_json:
        load_all(testapp, post_json, None, itype='ontology_term')
    if patch_json:
        load_all(testapp, patch_json, None, itype='ontology_term', overwrite=True)

    # now keep track of the last time we loaded these suckers
    data = {"name": "ffsysinfo", "ontology_updated": datetime.today().isoformat()}
    try:
        testapp.post_json("/sysinfo", data)
    except AppError:
        testapp.patch_json("/sysinfo/%s" % data['name'], data)
