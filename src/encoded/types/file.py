from snovault import (
    AfterModified,
    BeforeModified,
    CONNECTION,
    calculated_property,
    collection,
    load_schema,
    abstract_collection,
)
from snovault.schema_utils import schema_validator
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch,
    validate_item_content_in_place,
    no_validate_item_content_post,
    no_validate_item_content_put,
    no_validate_item_content_patch
)
from snovault.crud_views import (
    collection_add,
    item_edit,
)
from snovault.attachment import ItemWithAttachment
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD,
    get_item_if_you_can,
    # lab_award_attribution_embed_list
)
from pyramid.httpexceptions import (
    HTTPForbidden,
    HTTPTemporaryRedirect,
    HTTPNotFound,
)
from pyramid.response import Response
from pyramid.settings import asbool
from pyramid.view import view_config
from urllib.parse import (
    parse_qs,
    urlparse,
)
import boto3
from botocore.exceptions import ClientError
import datetime
import json
import pytz
import os
from pyramid.traversal import resource_path
from encoded.search import make_search_subreq
from snovault.elasticsearch import ELASTIC_SEARCH
from copy import deepcopy
from . import TrackingItem
from ..authentication import session_properties
import structlog
import logging
logging.getLogger('boto3').setLevel(logging.CRITICAL)
log = structlog.getLogger(__name__)

BEANSTALK_ENV_PATH = "/opt/python/current/env"

file_workflow_run_embeds = [
    'workflow_run_inputs.workflow.title',
    'workflow_run_inputs.input_files.workflow_argument_name',
    'workflow_run_inputs.input_files.value.filename',
    'workflow_run_inputs.input_files.value.display_title',
    'workflow_run_inputs.input_files.value.file_format',
    'workflow_run_inputs.input_files.value.uuid',
    'workflow_run_inputs.input_files.value.accession',
    'workflow_run_inputs.output_files.workflow_argument_name',
    'workflow_run_inputs.output_files.value.display_title',
    'workflow_run_inputs.output_files.value.file_format',
    'workflow_run_inputs.output_files.value.uuid',
    'workflow_run_inputs.output_files.value.accession',
    'workflow_run_inputs.output_files.value_qc.url',
    'workflow_run_inputs.output_files.value_qc.overall_quality_status'
]

file_workflow_run_embeds_processed = file_workflow_run_embeds + [e.replace('workflow_run_inputs.', 'workflow_run_outputs.') for e in file_workflow_run_embeds]


def show_upload_credentials(request=None, context=None, status=None):
    if request is None or status not in ('uploading', 'to be uploaded by workflow', 'upload failed'):
        return False
    return request.has_permission('edit', context)


def force_beanstalk_env(profile_name, config_file=None):
    # set env variables if we are on elasticbeanstalk
    if not config_file:
        config_file = BEANSTALK_ENV_PATH
    if os.path.exists(config_file):
        if not os.environ.get("AWS_ACCESS_KEY_ID"):
            import subprocess
            command = ['bash', '-c', 'source ' + config_file + ' && env']
            proc = subprocess.Popen(command, stdout=subprocess.PIPE, universal_newlines=True)
            for line in proc.stdout:
                key, _, value = line.partition("=")
                os.environ[key] = value[:-1]

            proc.communicate()
    conn = boto3.client('sts', aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
                        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"))
    return conn


def external_creds(bucket, key, name=None, profile_name=None):
    '''
    if name is None, we want the link to s3 but no need to generate
    an access token.  This is useful for linking metadata to files that
    already exist on s3.
    '''

    import logging
    logging.getLogger('boto3').setLevel(logging.CRITICAL)
    credentials = {}
    if name is not None:
        policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Effect': 'Allow',
                    'Action': 's3:PutObject',
                    'Resource': 'arn:aws:s3:::{bucket}/{key}'.format(bucket=bucket, key=key),
                }
            ]
        }
        # boto.set_stream_logger('boto3')
        conn = force_beanstalk_env(profile_name)
        token = conn.get_federation_token(Name=name, Policy=json.dumps(policy))
        # 'access_key' 'secret_key' 'expiration' 'session_token'
        credentials = token.get('Credentials')
        credentials.update({
            'upload_url': 's3://{bucket}/{key}'.format(bucket=bucket, key=key),
            'federated_user_arn': token.get('FederatedUser').get('Arn'),
            'federated_user_id': token.get('FederatedUser').get('FederatedUserId'),
            'request_id': token.get('ResponseMetadata').get('RequestId'),
            'key': key
        })
    return {
        'service': 's3',
        'bucket': bucket,
        'key': key,
        'upload_credentials': credentials,
    }


def property_closure(request, propname, root_uuid):
    # Must avoid cycles
    conn = request.registry[CONNECTION]
    seen = set()
    remaining = {str(root_uuid)}
    while remaining:
        seen.update(remaining)
        next_remaining = set()
        for uuid in remaining:
            obj = conn.get_by_uuid(uuid)
            next_remaining.update(obj.__json__(request).get(propname, ()))
        remaining = next_remaining - seen
    return seen


@abstract_collection(
    name='files',
    unique_key='accession',
    acl=ALLOW_SUBMITTER_ADD,
    properties={
        'title': 'Files',
        'description': 'Listing of Files',
    })
class File(Item):
    """Collection for individual files."""
    item_type = 'file'
    base_types = ['File'] + Item.base_types
    schema = load_schema('encoded:schemas/file.json')
    embedded_list = Item.embedded_list + [
        'file_format.file_format',
        'related_files.relationship_type',
        'related_files.file.accession',
        'quality_metric.display_title',
        'quality_metric.@type'
    ]  # + lab_award_attribution_embed_list
    name_key = 'accession'

    @calculated_property(schema={
        "title": "Display Title",
        "description": "Name of this File",
        "type": "string"
    })
    def display_title(self, request, file_format, accession=None, external_accession=None):
        accession = accession or external_accession
        file_format_item = get_item_if_you_can(request, file_format, 'file-formats')
        try:
            file_extension = '.' + file_format_item.get('standard_file_extension')
        except AttributeError:
            file_extension = ''
        return '{}{}'.format(accession, file_extension)

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of File",
        "type": "string"
    })
    def file_type_detailed(self, request, file_format, file_type=None):
        outString = (file_type or 'other')
        file_format_item = get_item_if_you_can(request, file_format, 'file-formats')
        try:
            fformat = file_format_item.get('file_format')
            outString = outString + ' (' + fformat + ')'
        except AttributeError:
            pass
        return outString

    # def generate_track_title(self, track_info, props):
    #     if not props.get('higlass_uid'):
    #         return None
    #     exp_type = track_info.get('experiment_type', None)
    #     if exp_type is None:
    #         return None
    #     bname = track_info.get('biosource_name', 'unknown sample')
    #     ftype = props.get('file_type', 'unspecified type')
    #     assay = track_info.get('assay_info', '')
    #
    #     title = '{ft} for {bs} {et} {ai}'.format(
    #         ft=ftype, ai=assay, et=exp_type, bs=bname
    #     )
    #     return title.replace('  ', ' ').rstrip()

    def _get_file_expt_bucket(self, request, item2check):
        fatid = self.jsonld_id(request)
        if 'files' in item2check:
            if fatid in item2check.get('files'):
                return 'raw file'
        if 'processed_files' in item2check:
            if fatid in item2check.get('processed_files'):
                return 'processed file'
        of_info = item2check.get('other_processed_files', [])
        for obucket in of_info:
            ofiles = obucket.get('files')
            if [of for of in ofiles if of == fatid]:
                return obucket.get('title')
        return None


    def _update(self, properties, sheets=None):
        if not properties:
            return
        # ensure we always have s3 links setup
        sheets = {} if sheets is None else sheets.copy()
        uuid = self.uuid
        old_creds = self.propsheets.get('external', None)
        new_creds = old_creds

        # don't get new creds
        if properties.get('status', None) in ('uploading', 'to be uploaded by workflow',
                                              'upload failed'):
            new_creds = self.build_external_creds(self.registry, uuid, properties)
            sheets['external'] = new_creds

        # handle extra files
        updated_extra_files = []
        extra_files = properties.get('extra_files', [])
        if extra_files:
            # get @id for parent file
            try:
                at_id = resource_path(self)
            except:
                at_id = "/" + str(uuid) + "/"
            # ensure at_id ends with a slash
            if not at_id.endswith('/'):
                at_id += '/'

            file_formats = []
            for xfile in extra_files:
                # ensure a file_format (identifier for extra_file) is given and non-null
                if not('file_format' in xfile and bool(xfile['file_format'])):
                    continue
                eformat = xfile['file_format']
                if eformat.startswith('/file-formats/'):
                    eformat = eformat[len('/file-formats/'):-1]
                xfile_format = self.registry['collections']['FileFormat'].get(eformat)
                xff_uuid = str(xfile_format.uuid)
                if not xff_uuid:
                    raise Exception("Cannot find format item for the extra file")

                if xff_uuid in file_formats:
                    raise Exception("Each file in extra_files must have unique file_format")
                file_formats.append(xff_uuid)
                xfile['file_format'] = xff_uuid

                xfile['accession'] = properties.get('accession')
                # just need a filename to trigger creation of credentials
                xfile['filename'] = xfile['accession']
                xfile['uuid'] = str(uuid)
                # if not 'status' in xfile or not bool(xfile['status']):
                #    xfile['status'] = properties.get('status')
                ext = self.build_external_creds(self.registry, uuid, xfile)
                # build href
                file_extension = xfile_format.properties.get('standard_file_extension')
                filename = '{}.{}'.format(xfile['accession'], file_extension)
                xfile['href'] = at_id + '@@download/' + filename
                xfile['upload_key'] = ext['key']
                sheets['external' + xfile['file_format']] = ext
                updated_extra_files.append(xfile)

        if extra_files:
            properties['extra_files'] = updated_extra_files

        if old_creds:
            if old_creds.get('key') != new_creds.get('key'):
                try:
                    # delete the old sumabeach
                    conn = boto3.client('s3')
                    bname = old_creds['bucket']
                    conn.delete_object(Bucket=bname, Key=old_creds['key'])
                except Exception as e:
                    print(e)

        # update self first to ensure 'related_files' are stored in self.properties
        super(File, self)._update(properties, sheets)

        # handle related_files. This is quite janky; must manually invalidate
        # the relation made on `related_fl` item because we are calling its
        # update() method directly, which circumvents snovault.crud_view.item_edit
        DicRefRelation = {
            "derived from": "parent of",
            "parent of": "derived from",
            "supercedes": "is superceded by",
            "is superceded by": "supercedes",
            "paired with": "paired with"
        }

        if 'related_files' in properties:
            my_uuid = str(self.uuid)
            # save these values
            curr_txn = None
            curr_request = None
            for relation in properties["related_files"]:
                try:
                    switch = relation["relationship_type"]
                    rev_switch = DicRefRelation[switch]
                    related_fl = relation["file"]
                    relationship_entry = {"relationship_type": rev_switch, "file": my_uuid}
                except:
                    log.error('Error updating related_files on %s _update. %s'
                              % (my_uuid, relation))
                    continue

                target_fl = self.collection.get(related_fl)
                target_fl_props = deepcopy(target_fl.properties)
                # This is a cool python feature. If break is not hit in the loop,
                # go to the `else` statement. Works for empty lists as well
                for target_relation in target_fl_props.get('related_files', []):
                    if (target_relation.get('file') == my_uuid and
                        target_relation.get('relationship_type') == rev_switch):
                        break
                else:
                    import transaction
                    from pyramid.threadlocal import get_current_request
                    from snovault.invalidation import add_to_indexing_queue
                    # Get the current request in order to queue the forced
                    # update for indexing. This is bad form.
                    # Don't do this anywhere else, please!
                    if curr_txn is None:
                        curr_txn = transaction.get()
                    if curr_request is None:
                        curr_request = get_current_request()
                    # handle related_files whether or not any currently exist
                    target_related_files = target_fl_props.get('related_files', [])
                    target_related_files.append(relationship_entry)
                    target_fl_props.update({'related_files': target_related_files})
                    target_fl._update(target_fl_props)
                    to_queue = {'uuid': str(target_fl.uuid), 'sid': target_fl.sid,
                                'info': 'queued from %s _update' % my_uuid}
                    curr_txn.addAfterCommitHook(add_to_indexing_queue,
                                                args=(curr_request, to_queue, 'edit'))

    @property
    def __name__(self):
        properties = self.upgrade_properties()
        if properties.get('status') == 'replaced':
            return self.uuid
        return properties.get(self.name_key, None) or self.uuid

    def unique_keys(self, properties):
        keys = super(File, self).unique_keys(properties)
        if properties.get('status') != 'replaced':
            if 'md5sum' in properties:
                value = 'md5:{md5sum}'.format(**properties)
                keys.setdefault('alias', []).append(value)
        return keys

    @calculated_property(schema={
        "title": "Title",
        "type": "string",
        "description": "Accession of this file"
    })
    def title(self, accession=None, external_accession=None):
        return accession or external_accession

    @calculated_property(schema={
        "title": "Download URL",
        "type": "string",
        "description": "Use this link to download this file."
    })
    def href(self, request, file_format, accession=None, external_accession=None):
        fformat = get_item_if_you_can(request, file_format, 'file-formats')
        try:
            file_extension = '.' + fformat.get('standard_file_extension')
        except AttributeError:
            file_extension = ''
        accession = accession or external_accession
        filename = '{}{}'.format(accession, file_extension)
        return request.resource_path(self) + '@@download/' + filename

    @calculated_property(schema={
        "title": "Upload Key",
        "type": "string",
    })
    def upload_key(self, request):
        properties = self.properties
        external = self.propsheets.get('external', {})
        if not external:
            try:
                external = self.build_external_creds(self.registry, self.uuid, properties)
            except ClientError:
                log.error(os.environ)
                log.error(properties)
                return 'UPLOAD KEY FAILED'
        return external['key']

    @calculated_property(condition=show_upload_credentials, schema={
        "type": "object",
    })
    def upload_credentials(self):
        external = self.propsheets.get('external', None)
        if external is not None:
            return external['upload_credentials']

    @calculated_property(condition=show_upload_credentials, schema={
        "type": "object",
    })
    def extra_files_creds(self):
        external = self.propsheets.get('external', None)
        if external is not None:
            extras = []
            for extra in self.properties.get('extra_files', []):
                eformat = extra.get('file_format')
                xfile_format = self.registry['collections']['FileFormat'].get(eformat)
                try:
                    xff_uuid = str(xfile_format.uuid)
                except AttributeError:
                    print("Can't find required format uuid for %s" % eformat)
                    continue
                extra_creds = self.propsheets.get('external' + xff_uuid)
                extra['upload_credentials'] = extra_creds['upload_credentials']
                extras.append(extra)
            return extras

    @classmethod
    def get_bucket(cls, registry):
        return registry.settings['file_upload_bucket']

    @classmethod
    def build_external_creds(cls, registry, uuid, properties):
        bucket = cls.get_bucket(registry)
        fformat = properties.get('file_format')
        if fformat.startswith('/file-formats/'):
            fformat = fformat[len('/file-formats/'):-1]
        prop_format = registry['collections']['FileFormat'].get(fformat)
        try:
            file_extension = prop_format.properties['standard_file_extension']
        except KeyError:
            raise Exception('File format not in list of supported file types')
        key = '{uuid}/{accession}.{file_extension}'.format(
            file_extension=file_extension, uuid=uuid,
            accession=properties.get('accession'))

        # remove the path from the file name and only take first 32 chars
        fname = properties.get('filename')
        name = None
        if fname:
            name = fname.split('/')[-1][:32]

        profile_name = registry.settings.get('file_upload_profile_name')
        return external_creds(bucket, key, name, profile_name)

    @classmethod
    def create(cls, registry, uuid, properties, sheets=None):
        if properties.get('status') in ('uploading', 'to be uploaded by workflow'):
            sheets = {} if sheets is None else sheets.copy()
            sheets['external'] = cls.build_external_creds(registry, uuid, properties)
        return super(File, cls).create(registry, uuid, properties, sheets)

    class Collection(Item.Collection):
        pass


@collection(
    name='files-fastq',
    unique_key='accession',
    properties={
        'title': 'FASTQ Files',
        'description': 'Listing of FASTQ Files',
    })
class FileFastq(File):
    """Collection for individual fastq files."""
    item_type = 'file_fastq'
    schema = load_schema('encoded:schemas/file_fastq.json')
    embedded_list = File.embedded_list + [
        "quality_metric.overall_quality_status",
        "quality_metric.Total Sequences",
        "quality_metric.Sequence length",
        "quality_metric.url"
    ]  # + file_workflow_run_embeds
    name_key = 'accession'
    rev = dict(File.rev, **{
        'workflow_run_inputs': ('WorkflowRun', 'input_files.value'),
        'workflow_run_outputs': ('WorkflowRun', 'output_files.value'),
    })

    @calculated_property(schema={
        "title": "Input of Workflow Runs",
        "description": "All workflow runs that this file serves as an input to",
        "type": "array",
        "items": {
            "title": "Input of Workflow Run",
            "type": ["string", "object"],
            "linkTo": "WorkflowRun"
        }
    })
    def workflow_run_inputs(self, request):
        return self.rev_link_atids(request, "workflow_run_inputs")

    @calculated_property(schema={
        "title": "Output of Workflow Runs",
        "description": "All workflow runs that this file serves as an output from",
        "type": "array",
        "items": {
            "title": "Output of Workflow Run",
            "type": "string",
            "linkTo": "WorkflowRun"
        }
    })
    def workflow_run_outputs(self, request):
        return self.rev_link_atids(request, "workflow_run_outputs")


@collection(
    name='files-processed',
    unique_key='accession',
    properties={
        'title': 'Processed Files',
        'description': 'Listing of Processed Files',
    })
class FileProcessed(File):
    """Collection for individual processed files."""
    item_type = 'file_processed'
    schema = load_schema('encoded:schemas/file_processed.json')
    embedded_list = File.embedded_list + [
        'experiment_sets.last_modified.date_modified',
        "quality_metric.Total reads",
        "quality_metric.Trans reads",
        "quality_metric.Cis reads (>20kb)",
        "quality_metric.Short cis reads (<20kb)",
        "quality_metric.url"
    ]  # + file_workflow_run_embeds_processed
    name_key = 'accession'
    rev = dict(File.rev, **{
        'workflow_run_inputs': ('WorkflowRun', 'input_files.value'),
        'workflow_run_outputs': ('WorkflowRun', 'output_files.value'),
    })
    aggregated_items = {
        "last_modified": [
            "date_modified"
        ],
    }

    @classmethod
    def get_bucket(cls, registry):
        return registry.settings['file_wfout_bucket']

    @calculated_property(schema={
        "title": "Input of Workflow Runs",
        "description": "All workflow runs that this file serves as an input to",
        "type": "array",
        "items": {
            "title": "Input of Workflow Run",
            "type": ["string", "object"],
            "linkTo": "WorkflowRun"
        }
    })
    def workflow_run_inputs(self, request, disable_wfr_inputs=False):
        # switch this calc prop off for some processed files, i.e. control exp files
        if not disable_wfr_inputs:
            return self.rev_link_atids(request, "workflow_run_inputs")
        else:
            return []

    @calculated_property(schema={
        "title": "Output of Workflow Runs",
        "description": "All workflow runs that this file serves as an output from",
        "type": "array",
        "items": {
            "title": "Output of Workflow Run",
            "type": "string",
            "linkTo": "WorkflowRun"
        }
    })
    def workflow_run_outputs(self, request):
        return self.rev_link_atids(request, "workflow_run_outputs")


@collection(
    name='files-reference',
    unique_key='accession',
    properties={
        'title': 'Reference Files',
        'description': 'Listing of Reference Files',
        })
class FileReference(File):
    """Collection for individual reference files."""
    item_type = 'file_reference'
    schema = load_schema('encoded:schemas/file_reference.json')
    embedded_list = File.embedded_list
    name_key = 'accession'


@view_config(name='upload', context=File, request_method='GET',
             permission='edit')
def get_upload(context, request):
    external = context.propsheets.get('external', {})
    upload_credentials = external.get('upload_credentials')
    # Show s3 location info for files originally submitted to EDW.

    if upload_credentials is None and external.get('service') == 's3':
        upload_credentials = {
            'upload_url': 's3://{bucket}/{key}'.format(**external),
        }
    return {
        '@graph': [{
            '@id': request.resource_path(context),
            'upload_credentials': upload_credentials,
            'extra_files_creds': context.extra_files_creds(),
        }],
    }


@view_config(name='upload', context=File, request_method='POST',
             permission='edit', validators=[schema_validator({"type": "object"})])
def post_upload(context, request):
    properties = context.upgrade_properties()
    if properties['status'] not in ('uploading', 'to be uploaded by workflow', 'upload failed'):
        raise HTTPForbidden('status must be "uploading" to issue new credentials')
    accession_or_external = properties.get('accession')
    external = context.propsheets.get('external', None)

    if external is None:
        # Handle objects initially posted as another state.
        bucket = request.registry.settings['file_upload_bucket']
        # maybe this should be properties.uuid
        uuid = context.uuid
        file_format = get_item_if_you_can(request, properties.get('file_format'), 'file-formats')
        try:
            file_extension = '.' + file_format.get('standard_file_extension')
        except AttributeError:
            file_extension = ''

        key = '{uuid}/{accession}.{file_extension}'.format(
            file_extension=file_extension, uuid=uuid, **properties)

    elif external.get('service') == 's3':
        bucket = external['bucket']
        key = external['key']
    else:
        raise ValueError(external.get('service'))

    # remove the path from the file name and only take first 32 chars
    name = None
    if properties.get('filename'):
        name = properties.get('filename').split('/')[-1][:32]
    profile_name = request.registry.settings.get('file_upload_profile_name')
    creds = external_creds(bucket, key, name, profile_name)
    # in case we haven't uploaded a file before
    context.propsheets['external'] = creds

    new_properties = properties.copy()
    if properties['status'] == 'upload failed':
        new_properties['status'] = 'uploading'

    registry = request.registry
    registry.notify(BeforeModified(context, request))
    context.update(new_properties, {'external': creds})
    registry.notify(AfterModified(context, request))

    rendered = request.embed('/%s/@@object' % context.uuid, as_user=True)
    result = {
        'status': 'success',
        '@type': ['result'],
        '@graph': [rendered],
    }
    return result


def is_file_to_download(properties, file_format, expected_filename=None):
    try:
        file_extension = '.' + file_format.get('standard_file_extension')
    except AttributeError:
        file_extension = ''
    accession_or_external = properties.get('accession') or properties.get('external_accession')
    if not accession_or_external:
        return False
    filename = '{accession}{file_extension}'.format(
        accession=accession_or_external, file_extension=file_extension)
    if expected_filename is None:
        return filename
    elif expected_filename != filename:
        return False
    else:
        return filename


@view_config(name='download', context=File, request_method='GET',
             permission='view', subpath_segments=[0, 1])
def download(context, request):
    # first check for restricted status
    if context.properties.get('status') == 'restricted':
        raise HTTPForbidden('This is a restricted file not available for download')
    try:
        user_props = session_properties(request)
    except Exception as e:
        user_props = {'error': str(e)}
    tracking_values = {'user_agent': request.user_agent, 'remote_ip': request.remote_addr,
                       'user_uuid': user_props.get('details', {}).get('uuid', 'anonymous'),
                       'request_path': request.path_info, 'request_headers': str(dict(request.headers))}

    # proxy triggers if we should use Axel-redirect, useful for s3 range byte queries
    try:
        use_download_proxy = request.client_addr not in request.registry['aws_ipset']
    except TypeError:
        # this fails in testing due to testapp not having ip
        use_download_proxy = False

    # with extra_files the user may be trying to download the main file
    # or one of the files in extra files, the following logic will
    # search to find the "right" file and redirect to a download link for that one
    properties = context.upgrade_properties()
    file_format = get_item_if_you_can(request, properties.get('file_format'), 'file-formats')
    _filename = None
    if request.subpath:
        _filename, = request.subpath
    filename = is_file_to_download(properties, file_format, _filename)
    if not filename:
        found = False
        for extra in properties.get('extra_files', []):
            eformat = get_item_if_you_can(request, extra.get('file_format'), 'file-formats')
            filename = is_file_to_download(extra, eformat, _filename)
            if filename:
                found = True
                properties = extra
                external = context.propsheets.get('external' + eformat.get('uuid'))
                if eformat is not None:
                    tracking_values['file_format'] = eformat.get('file_format')
                break
        if not found:
            raise HTTPNotFound(_filename)
    else:
        external = context.propsheets.get('external', {})
        if file_format is not None:
            tracking_values['file_format'] = file_format.get('file_format')
    tracking_values['filename'] = filename

    if not external:
        external = context.build_external_creds(request.registry, context.uuid, properties)
    if external.get('service') == 's3':
        conn = boto3.client('s3')
        param_get_object = {
            'Bucket': external['bucket'],
            'Key': external['key'],
            'ResponseContentDisposition': "attachment; filename=" + filename
        }
        if 'Range' in request.headers:
            tracking_values['range_query'] = True
            param_get_object.update({'Range': request.headers.get('Range')})
        else:
            tracking_values['range_query'] = False
        location = conn.generate_presigned_url(
            ClientMethod='get_object',
            Params=param_get_object,
            ExpiresIn=36*60*60
        )
    else:
        raise ValueError(external.get('service'))

    # tracking_values['experiment_type'] = get_file_experiment_type(request, context, properties)
    # # create a tracking_item to track this download
    # tracking_item = {'status': 'in review by lab', 'tracking_type': 'download_tracking',
    #                  'download_tracking': tracking_values}
    # try:
    #     TrackingItem.create_and_commit(request, tracking_item, clean_headers=True)
    # except Exception as e:
    #     log.error('Cannot create TrackingItem on download of %s' % context.uuid, error=str(e))

    if asbool(request.params.get('soft')):
        expires = int(parse_qs(urlparse(location).query)['Expires'][0])
        return {
            '@type': ['SoftRedirect'],
            'location': location,
            'expires': datetime.datetime.fromtimestamp(expires, pytz.utc).isoformat(),
        }

    if 'Range' in request.headers:
        try:
            response_body = conn.get_object(**param_get_object)
        except Exception as e:
            raise e
        response_dict = {
            'body': response_body.get('Body').read(),
            # status_code : 206 if partial, 200 if the ragne covers whole file
            'status_code': response_body.get('ResponseMetadata').get('HTTPStatusCode'),
            'accept_ranges': response_body.get('AcceptRanges'),
            'content_length': response_body.get('ContentLength'),
            'content_range': response_body.get('ContentRange')
        }
        return Response(**response_dict)

    # We don't use X-Accel-Redirect here so that client behaviour is similar for
    # both aws and non-aws users.
    if use_download_proxy:
        location = request.registry.settings.get('download_proxy', '') + str(location)

    # 307 redirect specifies to keep original method
    raise HTTPTemporaryRedirect(location=location)


def validate_file_format_validity_for_file_type(context, request):
    """Check if the specified file format (e.g. fastq) is allowed for the file type (e.g. FileFastq).
    """
    data = request.json
    if 'file_format' in data:
        file_format_item = get_item_if_you_can(request, data['file_format'], 'file-formats')
        if not file_format_item:
            # item level validation will take care of generating the error
            return
        file_format_name = file_format_item['file_format']
        allowed_types = file_format_item.get('valid_item_types', [])
        file_type = context.type_info.name
        if file_type not in allowed_types:
            msg = 'File format {} is not allowed for {}'.format(file_format_name, file_type)
            request.errors.add('body', 'File: invalid format', msg)
        else:
            request.validated.update({})


def validate_file_filename(context, request):
    ''' validator for filename field '''
    found_match = False
    data = request.json
    if 'filename' not in data:
        # see if there is an existing file_name
        filename = context.properties.get('filename')
        if not filename:
            return
    else:
        filename = data['filename']
    ff = data.get('file_format')
    if not ff:
        ff = context.properties.get('file_format')
    file_format_item = get_item_if_you_can(request, ff, 'file-formats')
    if not file_format_item:
        msg = 'Problem getting file_format for %s' % filename
        request.errors.add('body', 'File: no format', msg)
        return
    msg = None
    try:
        file_extensions = [file_format_item.get('standard_file_extension')]
        if file_format_item.get('other_allowed_extensions'):
            file_extensions.extend(file_format_item.get('other_allowed_extensions'))
            file_extensions = list(set(file_extensions))
    except (AttributeError, TypeError):
        msg = 'Problem getting file_format for %s' % filename
    else:
        if file_format_item.get('file_format') == 'other':
            found_match = True
        elif not file_extensions:  # this shouldn't happen
            pass
        for extension in file_extensions:
            if filename[-(len(extension) + 1):] == '.' + extension:
                found_match = True
                break
    if found_match:
        request.validated.update({})
    else:
        if not msg:
            msg = ["'." + ext + "'" for ext in file_extensions]
            msg = ', '.join(msg)
            msg = ('Filename %s extension does not agree with specified file format. '
                   'Valid extension(s): %s' % (filename, msg))
        request.errors.add('body', 'File: invalid extension', msg)


def validate_processed_file_unique_md5_with_bypass(context, request):
    '''validator to check md5 on processed files, unless you tell it
       not to'''
    # skip validator if not file processed
    if context.type_info.item_type != 'file_processed':
        return
    data = request.json
    if 'md5sum' not in data or not data['md5sum']:
        return
    if 'force_md5' in request.query_string:
        return
    # we can of course patch / put to ourselves the same md5 we previously had
    if context.properties.get('md5sum') == data['md5sum']:
        return

    if ELASTIC_SEARCH in request.registry:
        search = make_search_subreq(request, '/search/?type=File&md5sum=%s' % data['md5sum'])
        search_resp = request.invoke_subrequest(search, True)
        if search_resp.status_int < 400:
            # already got this md5
            found = search_resp.json['@graph'][0]['accession']
            request.errors.add('body', 'File: non-unique md5sum', 'md5sum %s already exists for accession %s' %
                               (data['md5sum'], found))
    else:  # find it in the database
        conn = request.registry['connection']
        res = conn.get_by_json('md5sum', data['md5sum'], 'file_processed')
        if res is not None:
            # md5 already exists
            found = res.properties['accession']
            request.errors.add('body', 'File: non-unique md5sum', 'md5sum %s already exists for accession %s' %
                               (data['md5sum'], found))


def validate_processed_file_produced_from_field(context, request):
    '''validator to make sure that the values in the
    produced_from field are valid file identifiers'''
    # skip validator if not file processed
    if context.type_info.item_type != 'file_processed':
        return
    data = request.json
    if 'produced_from' not in data:
        return
    files_ok = True
    files2chk = data['produced_from']
    for i, f in enumerate(files2chk):
        try:
            fid = get_item_if_you_can(request, f, 'files').get('uuid')
        except AttributeError:
            files_ok = False
            request.errors.add('body', 'File: invalid produced_from id', "'%s' not found" % f)
            # bad_files.append(f)
        else:
            if not fid:
                files_ok = False
                request.errors.add('body', 'File: invalid produced_from id', "'%s' not found" % f)

    if files_ok:
        request.validated.update({})


def validate_extra_file_format(context, request):
    '''validator to check to be sure that file_format of extrafile is not the
       same as the file and is a known format for the schema
    '''
    files_ok = True
    data = request.json
    if not data.get('extra_files'):
        return
    extras = data['extra_files']
    # post should always have file_format as it is required patch may or may not
    ff = data.get('file_format')
    if not ff:
        ff = context.properties.get('file_format')
    file_format_item = get_item_if_you_can(request, ff, 'file-formats')
    if not file_format_item or 'standard_file_extension' not in file_format_item:
        request.errors.add('body', 'File: no extra_file format', "Can't find parent file format for extra_files")
        return
    parent_format = file_format_item['uuid']
    schema_eformats = file_format_item.get('extrafile_formats')
    if not schema_eformats:  # means this parent file shouldn't have any extra files
        request.errors.add(
            'body', 'File: invalid extra files',
            "File with format %s should not have extra_files" % file_format_item.get('file_format')
        )
        return
    else:
        valid_ext_formats = []
        for ok_format in schema_eformats:
            ok_format_item = get_item_if_you_can(request, ok_format, 'file-formats')
            try:
                off_uuid = ok_format_item.get('uuid')
            except AttributeError:
                raise  Exception("FileFormat Item %s contains unknown FileFormats"
                                 " in the extrafile_formats property" % file_format_item.get('uuid'))
            valid_ext_formats.append(off_uuid)
    seen_ext_formats = []
    # formats = request.registry['collections']['FileFormat']
    for i, ef in enumerate(extras):
        eformat = ef.get('file_format')
        if eformat is None:
            return  # will fail the required extra_file.file_format
        eformat_item = get_item_if_you_can(request, eformat, 'file-formats')
        try:
            ef_uuid = eformat_item.get('uuid')
        except AttributeError:
            request.errors.add(
                'body', 'File: invalid extra_file format', "'%s' not a valid or known file format" % eformat
            )
            files_ok = False
            break
        if ef_uuid in seen_ext_formats:
            request.errors.add(
                'body', 'File: invalid extra_file formats',
                "Multple extra files with '%s' format cannot be submitted at the same time" % eformat
            )
            files_ok = False
            break
        else:
            seen_ext_formats.append(ef_uuid)
        if ef_uuid == parent_format:
            request.errors.add(
                'body', 'File: invalid extra_file formats',
                "'%s' format cannot be the same for file and extra_file" % file_format_item.get('file_format')
            )
            files_ok = False
            break

        if ef_uuid not in valid_ext_formats:
            request.errors.add(
                'body', 'File: invalid extra_file formats',
                "'%s' not a valid extrafile_format for '%s'" % (eformat, file_format_item.get('file_format'))
            )
            files_ok = False
    if files_ok:
        request.validated.update({})


@view_config(context=File.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post,
                         validate_file_filename,
                         validate_extra_file_format,
                         validate_file_format_validity_for_file_type,
                         validate_processed_file_unique_md5_with_bypass,
                         validate_processed_file_produced_from_field])
@view_config(context=File.Collection, permission='add_unvalidated', request_method='POST',
             validators=[no_validate_item_content_post],
             request_param=['validate=false'])
def file_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=File, permission='edit', request_method='PUT',
             validators=[validate_item_content_put,
                         validate_file_filename,
                         validate_extra_file_format,
                         validate_file_format_validity_for_file_type,
                         validate_processed_file_unique_md5_with_bypass,
                         validate_processed_file_produced_from_field])
@view_config(context=File, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch,
                         validate_file_filename,
                         validate_extra_file_format,
                         validate_file_format_validity_for_file_type,
                         validate_processed_file_unique_md5_with_bypass,
                         validate_processed_file_produced_from_field])
@view_config(context=File, permission='edit_unvalidated', request_method='PUT',
             validators=[no_validate_item_content_put],
             request_param=['validate=false'])
@view_config(context=File, permission='edit_unvalidated', request_method='PATCH',
             validators=[no_validate_item_content_patch],
             request_param=['validate=false'])
@view_config(context=File, permission='index', request_method='GET',
             validators=[validate_item_content_in_place,
                         validate_file_filename,
                         validate_extra_file_format,
                         validate_file_format_validity_for_file_type,
                         validate_processed_file_unique_md5_with_bypass,
                         validate_processed_file_produced_from_field],
            request_param=['check_only=true'])
def file_edit(context, request, render=None):
    return item_edit(context, request, render)
