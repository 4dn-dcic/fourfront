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
    validate_item_content_patch
)
from snovault.attachment import ItemWithAttachment
from .base import (
    Item,
    collection_add,
    item_edit,
    ALLOW_SUBMITTER_ADD,
    get_item_if_you_can,
    lab_award_attribution_embed_list
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
    embedded_list = Item.embedded_list + [
        'files_in_set.submitted_by.job_title',
        'files_in_set.lab.title',
        'files_in_set.accession',
        'files_in_set.href',
        'files_in_set.file_size',
        'files_in_set.upload_key',
        'files_in_set.file_format.file_format',
        'files_in_set.file_classification'
    ]


@collection(
    name='file-set-microscope-qcs',
    unique_key='accession',
    properties={
        'title': 'Microscope QC File Sets',
        'description': 'Listing of File Sets',
    })
class FileSetMicroscopeQc(ItemWithAttachment, FileSet):
    """Collection of files stored under fileset."""
    base_types = ['FileSet'] + Item.base_types
    item_type = 'file_set_microscope_qc'
    schema = load_schema('encoded:schemas/file_set_microscope_qc.json')
    name_key = 'accession'
    embedded_list = Item.embedded_list + [
        'files_in_set.submitted_by.job_title',
        'files_in_set.lab.title',
        'files_in_set.accession',
        'files_in_set.href',
        'files_in_set.file_size',
        'files_in_set.upload_key',
        'files_in_set.file_format.file_format',
        'files_in_set.file_classification'
    ]


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
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        'experiments.display_title',
        'experiments.accession',
        'experiments.experiment_type.title',
        'experiments.experiment_sets.accession',
        'experiments.experiment_sets.experimentset_type',
        'experiments.experiment_sets.@type',
        'experiments.biosample.biosource.display_title',
        'experiments.biosample.biosource.biosource_type',
        'experiments.biosample.biosource_summary',
        'experiments.biosample.modifications_summary',
        'experiments.biosample.treatments_summary',
        'experiments.biosample.biosource.individual.organism.name',
        'experiments.digestion_enzyme.name',
        'experiments.last_modified.date_modified',
        'file_format.file_format',
        'related_files.relationship_type',
        'related_files.file.accession',
        'quality_metric.display_title'
    ]
    name_key = 'accession'
    rev = {
        'experiments': ('Experiment', 'files'),
    }

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

    def generate_track_title(self, track_info):
        props = self.properties
        if not props.get('higlass_uid'):
            return None
        exp_type = track_info.get('experiment_type', None)
        if exp_type is None:
            return None
        bname = track_info.get('biosource_name', 'unknown sample')
        ftype = props.get('file_type', 'unspecified type')
        assay = track_info.get('assay_info', '')

        title = '{ft} for {bs} {et} {ai}'.format(
            ft=ftype, ai=assay, et=exp_type, bs=bname
        )
        return title.replace('  ', ' ').rstrip()

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

    def _get_ds_cond_from_repset(self, repset):
        return (repset.get('dataset_label', None), repset.get('condition', None))

    def _get_file_experiment_info(self, request, currinfo):
        """
        Get info about an experiment that a file belongs given a File.
        A file may also be linked to an experiment set only
        Checks the rev_linked experiments and experiment_sets
        """
        info = {}
        expid = None
        repsetid = None
        rev_exps = self.experiments(request)
        if rev_exps:
            if len(rev_exps) != 1:
                # most files with experiments revlinks linked to only one
                # edge case eg. sci-Hi-C -- punt and add info 'manually'
                return info
            expid = rev_exps[0]
        elif hasattr(self, 'experiment_sets'):  # FileProcessed only
            rev_exp_sets = self.experiment_sets(request)
            if rev_exp_sets:
                repset = [rs for rs in rev_exp_sets if 'replicate' in rs]
                if len(repset) != 1:
                    # some microscopy files linked to multiple repsets
                    # for these edge cases add info 'manually'
                    return info
                repsetid = repset[0]
        else:
            return info

        # here we have either an expid or a repsetid
        if repsetid:  # get 2 fields and get an expt to get other info
            rep_set_info = get_item_if_you_can(request, repsetid)
            if not rep_set_info:
                return info
            # pieces of info to get from the repset if there is one
            ds, c = self._get_ds_cond_from_repset(rep_set_info)
            info['dataset'] = ds
            info['condition'] = c
            expts_in_set = rep_set_info.get('experiments_in_set', [])
            if not expts_in_set:
                return info
            elif len(expts_in_set) == 1:
                info['replicate_info'] = 'unreplicated'
            else:
                info['replicate_info'] = 'merged replicates'
            info['experiment_bucket'] = self._get_file_expt_bucket(request, rep_set_info)

            # get the first experiment of set and set to experiment of file shared info
            expid = expts_in_set[0]

        if expid:
            exp_info = get_item_if_you_can(request, expid)
            if not exp_info:  # sonmethings fishy - abort
                return info
            exp_type = get_item_if_you_can(request, exp_info.get('experiment_type'))
            if exp_type is not None:
                info['experiment_type'] = exp_type.get('title')
            if 'experiment_bucket' not in info:  # did not get it from rep_set
                info['experiment_bucket'] = self._get_file_expt_bucket(request, exp_info)
            assay_info = exp_info.get('experiment_categorizer')
            if assay_info:
                info['assay_info'] = assay_info.get('value')
            if 'replicate_info' not in info:
                # we did not get repinfo from a repset so rep nos for an expt are relevant
                possible_repsets = exp_info.get('experiment_sets', [])
                # only check experiment-set-replicate items for replicate_exps
                repset = [rs for rs in possible_repsets if 'replicate' in rs]
                if repset:
                    repset = repset[0]
                    rep_set_info = get_item_if_you_can(request, repset)
                    if rep_set_info is not None:
                        ds, c = self._get_ds_cond_from_repset(rep_set_info)
                        info['dataset'] = ds
                        info['condition'] = c
                        rep_exps = rep_set_info.get('replicate_exps', [])
                        for rep in rep_exps:
                            if rep.get('replicate_exp') == expid:
                                repstring = 'Biorep ' + str(rep.get('bio_rep_no')) + ', Techrep ' + str(rep.get('tec_rep_no'))
                                info['replicate_info'] = repstring
            if 'biosource_name' not in currinfo:
                sample_id = exp_info.get('biosample')
                if sample_id is not None:
                    sample = get_item_if_you_can(request, sample_id)
                    if sample is not None:
                        info['biosource_name'] = sample.get('biosource_summary')
        return {k: v for k, v in info.items() if v is not None}

    @calculated_property(schema={
        "title": "Track and Facet Info",
        "description": "Useful faceting and visualization info",
        "type": "object",
        "properties": {
            "experiment_type": {
                "type": "string"
            },
            "assay_info": {
                "type": "string"
            },
            "lab_name": {
                "type": "string"
            },
            "biosource_name": {
                "type": "string"
            },
            "replicate_info": {
                "type": "string"
            },
            "experiment_bucket": {
                "type": "string"
            },
            "dataset": {
                "type": "string"
            },
            "condition": {
                "type": "string"
            },
            "track_title": {
                "type": "string"
            }
        }
    })
    def track_and_facet_info(self, request, biosource_name=None):
        props = self.properties
        fields = ['experiment_type', 'assay_info', 'lab_name', 'dataset', 'condition',
                  'biosource_name', 'replicate_info', 'experiment_bucket']
        # look for existing _props
        track_info = {field: props.get('override_' + field) for field in fields}
        track_info = {k: v for k, v in track_info.items() if v is not None}

        # vistrack only pass in biosource_name because _biosource_name is
        # a calc prop of vistrack - from linked Biosource
        if biosource_name is not None and 'biosource_name' not in track_info:
            track_info['biosource_name'] = biosource_name

        if len(track_info) != 8:  # if length==6 we have everything we need
            if not (len(track_info) == 7 and 'lab_name' not in track_info):
                # only if everything but lab exists can we avoid getting expt
                einfo = self._get_file_experiment_info(request, track_info)
                track_info.update({k: v for k, v in einfo.items() if k not in track_info})
            # if 'experiment_type' not in track_info:
                # avoid more unnecessary work if we don't have key piece
                # return

            if track_info.get('lab_name') is None:
                labid = props.get('lab')
                lab = get_item_if_you_can(request, labid)
                if lab is not None:
                    track_info['lab_name'] = lab.get('display_title')

        track_title = self.generate_track_title(track_info)
        if track_title is not None:
            track_info['track_title'] = track_title
        return track_info

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
        "description": "Accession of this file"
    })
    def title(self):
        return self.properties.get('accession', self.properties.get('external_accession'))

    @calculated_property(schema={
        "title": "Download URL",
        "type": "string",
        "description": "Use this link to download this file."
    })
    def href(self, request):
        file_format = self.properties.get('file_format')
        fformat = get_item_if_you_can(request, file_format, 'file-formats')
        try:
            file_extension = '.' + fformat.get('standard_file_extension')
        except AttributeError:
            file_extension = ''
        accession = self.properties.get('accession', self.properties.get('external_accession'))
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
                log.error(self.properties)
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
    embedded_list = File.embedded_list + file_workflow_run_embeds + [
        "quality_metric.overall_quality_status",
        "quality_metric.Total Sequences",
        "quality_metric.Sequence length",
        "quality_metric.url",
        "badges.badge.title",
        "badges.badge.commendation",
        "badges.badge.warning",
        "badges.badge.badge_classification",
        "badges.badge.description",
        "badges.badge.badge_icon",
        "badges.messages"
    ]
    aggregated_items = {
        "badges": [
            "messages",
            "badge.commendation",
            "badge.warning",
            "badge.uuid",
            "badge.@id",
            "badge.badge_icon",
            "badge.description"
        ]
    }
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
    embedded_list = File.embedded_list + file_workflow_run_embeds_processed + [
        'experiment_sets.last_modified.date_modified',
        "quality_metric.Total reads",
        "quality_metric.Trans reads",
        "quality_metric.Cis reads (>20kb)",
        "quality_metric.Short cis reads (<20kb)",
        "quality_metric.url"
    ]
    name_key = 'accession'
    rev = dict(File.rev, **{
        'workflow_run_inputs': ('WorkflowRun', 'input_files.value'),
        'workflow_run_outputs': ('WorkflowRun', 'output_files.value'),
        'experiments': ('Experiment', 'processed_files'),
        'experiment_sets': ('ExperimentSet', 'processed_files'),
        'other_experiments': ('Experiment', 'other_processed_files.files'),
        'other_experiment_sets': ('ExperimentSet', 'other_processed_files.files')
    })
    aggregated_items = {
        "last_modified":[
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
    def workflow_run_inputs(self, request):
        # switch this calc prop off for some processed files, i.e. control exp files
        if not self.properties.get('disable_wfr_inputs'):
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

    @calculated_property(schema={
        "title": "Experiment Sets",
        "description": "All Experiment Sets that this file belongs to",
        "type": "array",
        "items": {
            "title": "Experiment Set",
            "type": "string",
            "linkTo": "ExperimentSet"
        }
    })
    def experiment_sets(self, request):
        return list(set(self.rev_link_atids(request, "experiment_sets") + self.rev_link_atids(request, "other_experiment_sets")))

    @calculated_property(schema={
        "title": "Experiments",
        "description": "Experiments that this file belongs to",
        "type": "array",
        "items": {
            "title": "Experiment",
            "type": "string",
            "linkTo": "Experiment"
        }
    })
    def experiments(self, request):
        return list(set(self.rev_link_atids(request, "experiments") + self.rev_link_atids(request, "other_experiments")))

    # processed files don't want md5 as unique key
    def unique_keys(self, properties):
        keys = super(FileProcessed, self).unique_keys(properties)
        if keys.get('alias'):
            keys['alias'] = [k for k in keys['alias'] if not k.startswith('md5:')]
        return keys


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
    embedded_list = File.embedded_list
    name_key = 'accession'


@collection(
    name='files-vistrack',
    unique_key='accession',
    properties={
        'title': 'Visualization Track Files',
        'description': 'Listing of External Files available as HiGlass visualization tracks',
    })
class FileVistrack(File):
    """Collection for individual visualization track files."""
    item_type = 'file_vistrack'
    schema = load_schema('encoded:schemas/file_vistrack.json')
    embedded_list = File.embedded_list
    name_key = 'accession'

    @classmethod
    def get_bucket(cls, registry):
        return registry.settings['file_wfout_bucket']

    @calculated_property(schema={
        "title": "Track and Facet Info",
        "description": "Useful faceting and visualization info",
        "type": "object",
        "properties": {
            "experiment_type": {
                "type": "string"
            },
            "assay_info": {
                "type": "string"
            },
            "lab_name": {
                "type": "string"
            },
            "biosource_name": {
                "type": "string"
            },
            "replicate_info": {
                "type": "string"
            },
            "experiment_bucket": {
                "type": "string"
            },
            "track_title": {
                "type": "string"
            }
        }
    })
    def track_and_facet_info(self, request, biosource_name=None):
        return super().track_and_facet_info(request, biosource_name=self.override_biosource_name(request))

    @calculated_property(schema={
        "title": "Biosource Name",
        "type": "string"
    })
    def override_biosource_name(self, request):
        bios = self.properties.get('biosource')
        if bios is not None:
            return request.embed(bios, '@@object').get('biosource_name')

    @calculated_property(schema={
        "title": "Display Title",
        "description": "Name of this File",
        "type": "string"
    })
    def display_title(self, request, file_format, accession=None, external_accession=None):
        dbxrefs = self.properties.get('dbxrefs')
        if dbxrefs:
            acclist = [d.replace('ENC:', '') for d in dbxrefs if 'ENCFF' in d]
            if acclist:
                accession = acclist[0]
        if not accession:
            accession = accession or external_accession
        file_format_item = get_item_if_you_can(request, file_format, 'file-formats')
        try:
            file_extension = '.' + file_format_item.get('standard_file_extension')
        except AttributeError:
            file_extension = ''
        return '{}{}'.format(accession, file_extension)


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
    embedded_list = File.embedded_list
    name_key = 'accession'


@collection(
    name='files-microscopy',
    unique_key='accession',
    properties={
        'title': 'Microscopy Files',
        'description': 'Listing of Microscopy Files',
    })
class FileMicroscopy(ItemWithAttachment, File):
    """Collection for individual microscopy files."""
    item_type = 'file_microscopy'
    schema = load_schema('encoded:schemas/file_microscopy.json')
    embedded_list = File.embedded_list + [
        "experiments.@type",
        "experiments.imaging_paths.channel",
        "experiments.imaging_paths.path",
        "experiments.files.microscope_settings.ch00_light_source_center_wl",
        "experiments.files.microscope_settings.ch01_light_source_center_wl",
        "experiments.files.microscope_settings.ch02_light_source_center_wl",
        "experiments.files.microscope_settings.ch03_light_source_center_wl",
        "experiments.files.microscope_settings.ch00_lasers_diodes",
        "experiments.files.microscope_settings.ch01_lasers_diodes",
        "experiments.files.microscope_settings.ch02_lasers_diodes",
        "experiments.files.microscope_settings.ch03_lasers_diodes"
    ]
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

    tracking_values['experiment_type'] = get_file_experiment_type(request, context, properties)
    # create a tracking_item to track this download
    tracking_item = {'status': 'in review by lab', 'tracking_type': 'download_tracking',
                     'download_tracking': tracking_values}
    try:
        TrackingItem.create_and_commit(request, tracking_item, clean_headers=True)
    except Exception as e:
        log.error('Cannot create TrackingItem on download of %s' % context.uuid, error=str(e))

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


def get_file_experiment_type(request, context, properties):
    """
    Get the string experiment_type value given a File context and properties.
    Checks the source_experiments, rev_linked experiments and experiment_sets
    """
    # identify which experiments to use
    experiments_using_file = []
    if properties.get('source_experiments'):
        experiments_using_file = properties['source_experiments']
    else:
        rev_exps = context.experiments(request)
        if rev_exps:
            experiments_using_file = rev_exps
        elif hasattr(context, 'experiment_sets'):  # FileProcessed only
            rev_exp_sets = context.experiment_sets(request)
            if rev_exp_sets:
                for exp_set in rev_exp_sets:
                    exp_set_info = get_item_if_you_can(request, exp_set)
                    if exp_set_info:
                        experiments_using_file.extend(exp_set_info.get('experiments_in_set', []))
    found_experiment_type = 'None'
    for file_experiment in experiments_using_file:
        exp_info = get_item_if_you_can(request, file_experiment)
        if exp_info is None:
            continue
        exp_type = exp_info.get('experiment_type')
        if found_experiment_type == 'None' or found_experiment_type == exp_type:
            found_experiment_type = exp_type
        else:  # multiple experiment types
            return 'Integrative analysis'
    if found_experiment_type != 'None':
        found_item = get_item_if_you_can(request, found_experiment_type)
        if found_item is None:
            found_experiment_type = 'None'
        else:
            found_experiment_type = found_item.get('title')
    return found_experiment_type


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
            request.errors.add('body', None, msg)
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
        request.errors.add('body', None, msg)
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
            msg = 'Filename %s extension does not agree with specified file format. Valid extension(s): %s' % (filename, msg)
        request.errors.add('body', None, msg)


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
            request.errors.add('body', None, 'md5sum %s already exists for accession %s' %
                               (data['md5sum'], found))
    else:  # find it in the database
        conn = request.registry['connection']
        res = conn.get_by_json('md5sum', data['md5sum'], 'file_processed')
        if res is not None:
            # md5 already exists
            found = res.properties['accession']
            request.errors.add('body', None, 'md5sum %s already exists for accession %s' %
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
            request.errors.add('body', ['produced_from', i], "'%s' not found" % f)
            # bad_files.append(f)
        else:
            if not fid:
                files_ok = False
                request.errors.add('body', ['produced_from', i], "'%s' not found" % f)

    if files_ok:
        request.validated.update({})


def validate_extra_file_format(context, request):
    '''validator to check to be sure that file_format of extrafile is not the
       same as the file and is a known format for the schema
    '''
    files_ok = True
    data = request.json
    if 'extra_files' not in data:
        return
    extras = data['extra_files']
    # post should always have file_format as it is required patch may or may not
    ff = data.get('file_format')
    if not ff:
        ff = context.properties.get('file_format')
    file_format_item = get_item_if_you_can(request, ff, 'file-formats')
    if not file_format_item or 'standard_file_extension' not in file_format_item:
        request.errors.add('body', None, "Can't find parent file format for extra_files")
        return
    parent_format = file_format_item['uuid']
    schema_eformats = file_format_item.get('extrafile_formats')
    if not schema_eformats:  # means this parent file shouldn't have any extra files
        request.errors.add('body', None, "File with format %s should not have extra_files" % file_format_item.get('file_format'))
        return
    else:
        valid_ext_formats = []
        for ok_format in schema_eformats:
            ok_format_item = get_item_if_you_can(request, ok_format, 'file-formats')
            try:
                off_uuid = ok_format_item.get('uuid')
            except AttributeError:
                raise  Exception("FileFormat Item %s contains unknown FileFormats in the extrafile_formats property" % file_format_item.get('uuid'))
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
            request.errors.add('body', ['extra_files', i], "'%s' not a valid or known file format" % eformat)
            files_ok = False
            break
        if ef_uuid in seen_ext_formats:
            request.errors.add('body', ['extra_files', i], "Multple extra files with '%s' format cannot be submitted at the same time" % eformat)
            files_ok = False
            break
        else:
            seen_ext_formats.append(ef_uuid)
        if ef_uuid == parent_format:
            request.errors.add('body', ['extra_files', i], "'%s' format cannot be the same for file and extra_file" % file_format_item.get('file_format'))
            files_ok = False
            break

        if ef_uuid not in valid_ext_formats:
            request.errors.add('body', ['extra_files', i], "'%s' not a valid extrafile_format for '%s'" % (eformat, file_format_item.get('file_format')))
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
def file_edit(context, request, render=None):
    return item_edit(context, request, render)
