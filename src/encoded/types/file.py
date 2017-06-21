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
from snovault.validators import validate_item_content_post
from snovault.attachment import ItemWithAttachment
from .base import (
    Item,
    collection_add,
    paths_filtered_by_status
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
import boto
import datetime
import json
import pytz

import logging
logging.getLogger('boto').setLevel(logging.CRITICAL)

def show_upload_credentials(request=None, context=None, status=None):
    if request is None or status not in ('uploading', 'to be uploaded by workflow', 'upload failed'):
        return False
    return request.has_permission('edit', context)


def external_creds(bucket, key, name=None, profile_name=None):
    '''
    if name is None, we want the link to s3 but no need to generate
    an access token.  This is useful for linking metadata to files that
    already exist on s3.
    '''

    import logging
    logging.getLogger('boto').setLevel(logging.CRITICAL)
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
        # boto.set_stream_logger('boto')
        conn = boto.connect_sts(profile_name=profile_name)
        token = conn.get_federation_token(name, policy=json.dumps(policy))
        # 'access_key' 'secret_key' 'expiration' 'session_token'
        credentials = token.credentials.to_dict()
        credentials.update({
            'upload_url': 's3://{bucket}/{key}'.format(bucket=bucket, key=key),
            'federated_user_arn': token.federated_user_arn,
            'federated_user_id': token.federated_user_id,
            'request_id': token.request_id,
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


@collection(
    name='file-sets',
    unique_key='accession',
    properties={
        'title': 'File Sets',
        'description': 'Listing of File Sets',
    })
class FileSet(Item):
    """Collection of files stored under fileset."""
    item_type = 'file_set'
    schema = load_schema('encoded:schemas/file_set.json')
    name_key = 'accession'
    embedded = []


@collection(
    name='file-set-calibrations',
    unique_key='accession',
    properties={
        'title': 'Calibration File Sets',
        'description': 'Listing of File Sets',
    })
class FileSetCalibration(FileSet):
    """Collection of files stored under fileset."""

    base_types = ['FileSet'] + Item.base_types
    item_type = 'file_set_calibration'
    schema = load_schema('encoded:schemas/file_set_calibration.json')
    name_key = 'accession'
    embedded = ['files_in_set.submitted_by',
                'files_in_set.lab',
                'files_in_set'
                ]


@abstract_collection(
    name='files',
    unique_key='accession',
    properties={
        'title': 'Files',
        'description': 'Listing of Files',
    })
class File(Item):
    """Collection for individual files."""
    item_type = 'file'
    base_types = ['File'] + Item.base_types
    schema = load_schema('encoded:schemas/file.json')
    embedded = ['lab', 'file_format', 'related_files.file']
    name_key = 'accession'
    rev = {
        'workflow_run_inputs': ('WorkflowRun', 'input_files.value'),
        'workflow_run_outputs': ('WorkflowRun', 'output_files.value'),
        'experiments': ('Experiment', 'files')
    }

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

    @calculated_property(schema={
        "title": "Experiments",
        "description": "Experiments that this file is associated with",
        "type": "array",
        "items": {
            "title": "Experiments",
            "type": ["string", "object"],
            "linkTo": "Experiment"
        }
    })
    def experiments(self, request):
        return self.rev_link_atids(request, "experiments")

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
            file_formats = [properties.get('file_format'), ]

            # handle extra files
            for idx, xfile in enumerate(properties.get('extra_files', [])):
                # todo, make sure file_format is unique
                if xfile['file_format'] in file_formats:
                    raise Exception("Each file in extra_files must have unique file_format")
                file_formats.append(xfile['file_format'])
                xfile['accession'] = properties.get('accession')
                # just need a filename to trigger creation of credentials
                xfile['filename'] = xfile['accession']
                xfile['uuid'] = str(uuid)
                xfile['status'] = properties.get('status')
                ext = self.build_external_creds(self.registry, uuid, xfile)
                # build href
                file_extension = self.schema['file_format_file_extension'][xfile['file_format']]
                filename = '{}{}'.format(xfile['accession'], file_extension)
                xfile['href'] = '/' + str(uuid) + '/@@download/' + filename
                xfile['upload_key'] = ext['key']
                sheets['external' + xfile['file_format']] = ext
                properties[idx] = xfile

        if old_creds:
            if old_creds.get('key') != new_creds.get('key'):
                try:
                    # delete the old sumabeach
                    conn = boto.connect_s3()
                    bname = old_creds['bucket']
                    bucket = boto.s3.bucket.Bucket(conn, bname)
                    bucket.delete_key(old_creds['key'])
                except Exception as e:
                    print(e)

        # update self first to ensure 'related_files' are stored in self.properties
        super(File, self)._update(properties, sheets)
        DicRefRelation = {
            "derived from": "parent of",
            "parent of": "derived from",
            "supercedes": "is superceded by",
            "is superceded by": "supercedes",
            "paired with": "paired with"
        }
        acc = str(self.uuid)

        if 'related_files' in properties.keys():
            for relation in properties["related_files"]:
                try:
                    switch = relation["relationship_type"]
                    rev_switch = DicRefRelation[switch]
                    related_fl = relation["file"]
                    relationship_entry = {"relationship_type": rev_switch, "file": acc}
                    rel_dic = {'related_files': [relationship_entry, ]}
                except:
                    print("invalid data, can't update correctly")
                    return

                target_fl = self.collection.get(related_fl)
                # case one we don't have relations
                if 'related_files' not in target_fl.properties.keys():
                    target_fl.properties.update(rel_dic)
                    target_fl.update(target_fl.properties)
                else:
                    # case two we have relations but not the one we need
                    for target_relation in target_fl.properties['related_files']:
                        if target_relation.get('file') == acc:
                            break
                    else:
                        # make data for new related_files
                        target_fl.properties['related_files'].append(relationship_entry)
                        target_fl.update(target_fl.properties)

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
        "description" : "Accession of this file"
    })
    def title(self, accession=None, external_accession=None):
        return accession or external_accession

    @calculated_property(schema={
        "title": "Download URL",
        "type": "string",
    })
    def href(self, request, file_format, accession=None, external_accession=None):
        accession = accession or external_accession
        file_extension = self.schema['file_format_file_extension'][file_format]
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
            external = self.build_external_creds(self.registry, self.uuid, properties)
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
            for idx, extra in enumerate(self.properties.get('extra_files'), []):
                extra_creds = self.propsheets.get('external' + extra['file_format'])
                extra['upload_credentials'] = extra_creds['upload_credentials']
                extras.append(extra)
            return extras

    @classmethod
    def build_external_creds(cls, registry, uuid, properties):
        bucket = registry.settings['file_upload_bucket']
        mapping = cls.schema['file_format_file_extension']
        file_extension = mapping[properties['file_format']]
        key = '{uuid}/{accession}{file_extension}'.format(
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
    embedded = File.embedded
    name_key = 'accession'


@collection(
    name='files-fasta',
    unique_key='accession',
    properties={
        'title': 'FASTA Files',
        'description': 'Listing of FASTA Files',
    })
class FileFasta(File):
    """Collection for individual fasta files."""
    item_type = 'file_fasta'
    schema = load_schema('encoded:schemas/file_fasta.json')
    embedded = File.embedded
    name_key = 'accession'


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
    embedded = File.embedded
    name_key = 'accession'


@collection(
    name='files-reference',
    unique_key='accession',
    properties={
        'title': 'Refenrence Files',
        'description': 'Listing of Reference Files',
    })
class FileReference(File):
    """Collection for individual reference files."""
    item_type = 'file_reference'
    schema = load_schema('encoded:schemas/file_reference.json')
    embedded = File.embedded
    name_key = 'accession'


@collection(
    name='files-calibration',
    unique_key='accession',
    properties={
        'title': 'Calibration Files',
        'description': 'Listing of Calibration Files',
    })
class FileCalibration(ItemWithAttachment, File):
    """Collection for individual calibration files."""
    item_type = 'file_calibration'
    schema = load_schema('encoded:schemas/file_calibration.json')
    embedded = File.embedded
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
        mapping = context.schema['file_format_file_extension']
        file_extension = mapping[properties['file_format']]

        key = '{uuid}/{accession}{file_extension}'.format(
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


def is_file_to_download(properties, mapping, expected_filename=None):
    file_extension = mapping[properties['file_format']]
    accession_or_external = properties.get('accession') or properties['external_accession']
    filename = accession_or_external + file_extension
    if expected_filename is None:
        return filename
    elif expected_filename != filename:
        return False
    else:
        return filename


@view_config(name='download', context=File, request_method='GET',
             permission='view', subpath_segments=[0, 1])
def download(context, request):

    #import pdb; pdb.set_trace()
    # to use or not to use the proxy
    proxy = asbool(request.params.get('proxy')) or 'Origin' in request.headers
    try:
        use_download_proxy = request.client_addr not in request.registry['aws_ipset']
    except TypeError:
        # this fails in testing due to testapp not having ip
        use_download_proxy = False

    # with extra_files the user may be trying to download the main file
    # or one of the files in extra files, the following logic will 
    # search to find the "right" file and redirect to a download link for that one
    properties = context.upgrade_properties()
    mapping = context.schema['file_format_file_extension']

    _filename = None
    if request.subpath:
        _filename, = request.subpath
    filename = is_file_to_download(properties, mapping, _filename)
    if not filename:
        found = False
        for extra in properties.get('extra_files'):
            filename = is_file_to_download(extra, mapping, _filename)
            if filename:
                found = True
                properties = extra
                external = context.propsheets.get('external' + extra['file_format'])
                break
        if not found:
            raise HTTPNotFound(_filename)
    else:
        external = context.propsheets.get('external', {})

    if not external:
        external = context.build_external_creds(request.registry, context.uuid, properties)
    if external.get('service') == 's3':
        conn = boto.connect_s3()
        location = conn.generate_url(
            36*60*60, request.method, external['bucket'], external['key'],
            force_http=proxy or use_download_proxy, response_headers={
                'response-content-disposition': "attachment; filename=" + filename,
            })
    else:
        raise ValueError(external.get('service'))
    if asbool(request.params.get('soft')):
        expires = int(parse_qs(urlparse(location).query)['Expires'][0])
        return {
            '@type': ['SoftRedirect'],
            'location': location,
            'expires': datetime.datetime.fromtimestamp(expires, pytz.utc).isoformat(),
        }

    if proxy:
        return Response(headers={'X-Accel-Redirect': '/_proxy/' + str(location)})

    # We don't use X-Accel-Redirect here so that client behaviour is similar for
    # both aws and non-aws users.
    if use_download_proxy:
        location = request.registry.settings.get('download_proxy', '') + str(location)

    # 307 redirect specifies to keep original method
    raise HTTPTemporaryRedirect(location=location)

# validator for filename field
def validate_file_filename(context, request):
    data = request.json
    if 'filename' not in data or 'file_format' not in data:
        return
    filename = data['filename']
    file_format = data['file_format']
    valid_schema = context.type_info.schema
    file_extensions = valid_schema['file_format_file_extension'][file_format]
    if not isinstance(file_extensions, list):
        file_extensions = [file_extensions]
    found_match = False
    for extension in file_extensions:
        if extension == "":
            found_match = True
            break
        elif filename[-len(extension):] == extension:
            found_match = True
            break
    if not found_match:
        file_extensions_msg = ["'"+ext+"'" for ext in file_extensions]
        file_extensions_msg = ', '.join(file_extensions_msg)
        request.errors.add('body', None, 'Filename extension does not '
         'agree with specified file format. Valid extension(s):  ' + file_extensions_msg)
    else:
        request.validated.update({})


@view_config(context=File.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post,validate_file_filename])
def file_add(context, request, render=None):
    return collection_add(context, request, render)
