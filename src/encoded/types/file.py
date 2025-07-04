import boto3
import datetime
import json
import logging
import os
import pytz
import requests
import structlog
import transaction
import urllib.parse

from botocore.exceptions import ClientError
from copy import deepcopy
from pyramid.httpexceptions import (
    HTTPForbidden,
    HTTPTemporaryRedirect,
    HTTPNotFound,
)
from pyramid.settings import asbool
from pyramid.threadlocal import get_current_request
from pyramid.traversal import resource_path
from pyramid.view import view_config
from pyramid.response import Response
from snovault import (
    AfterModified,
    BeforeModified,
    CONNECTION,
    calculated_property,
    collection,
    load_schema,
    abstract_collection,
)
from snovault.attachment import ItemWithAttachment
from snovault.crud_views import (
    collection_add,
    item_edit,
)
from snovault.elasticsearch import ELASTIC_SEARCH
from snovault.invalidation import add_to_indexing_queue
from snovault.schema_utils import schema_validator
from snovault.util import debug_log
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch,
    validate_item_content_in_place,
    no_validate_item_content_post,
    no_validate_item_content_put,
    no_validate_item_content_patch
)
from dcicutils.secrets_utils import assume_identity
from dcicutils.misc_utils import override_environ
from urllib.parse import (
    parse_qs,
    urlparse,
)
from uuid import uuid4
from ..authentication import session_properties
from ..search import make_search_subreq
from ..util import check_user_is_logged_in
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD_ACL,
    get_item_or_none,
    lab_award_attribution_embed_list
)
from .dependencies import DependencyEmbedder


logging.getLogger('boto3').setLevel(logging.CRITICAL)

log = structlog.getLogger(__name__)

# XXX: Need expanding to cover display_title
file_workflow_run_embeds = [
    'workflow_run_inputs.workflow.title',
    'workflow_run_inputs.input_files.workflow_argument_name',
    'workflow_run_inputs.input_files.value.filename',
    'workflow_run_inputs.input_files.value.display_title',
    'workflow_run_inputs.input_files.value.file_format.file_format',
    'workflow_run_inputs.input_files.value.uuid',
    'workflow_run_inputs.input_files.value.accession',
    'workflow_run_inputs.output_files.workflow_argument_name',
    'workflow_run_inputs.output_files.value.display_title',
    'workflow_run_inputs.output_files.value.file_format.file_format',
    'workflow_run_inputs.output_files.value.uuid',
    'workflow_run_inputs.output_files.value.accession',
    'workflow_run_inputs.output_files.value_qc.url',
    'workflow_run_inputs.output_files.value_qc.overall_quality_status'
]

file_workflow_run_embeds_processed = (file_workflow_run_embeds
                                      + [e.replace('workflow_run_inputs.', 'workflow_run_outputs.')
                                         for e in file_workflow_run_embeds])


def show_upload_credentials(request=None, context=None, status=None):
    if request is None or status not in ('uploading', 'to be uploaded by workflow', 'upload failed'):
        return False
    return request.has_permission('edit', context)


def external_creds(bucket, key, name=None, profile_name=None):
    """
    if name is None, we want the link to s3 but no need to generate
    an access token.  This is useful for linking metadata to files that
    already exist on s3.
    """

    logging.getLogger('boto3').setLevel(logging.CRITICAL)
    credentials = {}
    if name is not None:
        policy = {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Effect': 'Allow',
                    'Action': 's3:PutObject',
                    'Resource': f'arn:aws:s3:::{bucket}/{key}',
                }
            ]
        }
        if 'IDENTITY' in os.environ:
            identity = assume_identity()
            with override_environ(**identity):
                conn = boto3.client('sts',
                                    aws_access_key_id=os.environ.get('S3_AWS_ACCESS_KEY_ID'),
                                    aws_secret_access_key=os.environ.get('S3_AWS_SECRET_ACCESS_KEY'))
                token = conn.get_federation_token(Name=name, Policy=json.dumps(policy))
        else:
            # boto.set_stream_logger('boto3')
            conn = boto3.client('sts')
            token = conn.get_federation_token(Name=name, Policy=json.dumps(policy))
        # 'access_key' 'secret_key' 'expiration' 'session_token'
        credentials = token.get('Credentials')
        # Convert Expiration datetime object to string via cast
        # Uncaught serialization error picked up by Docker - Will 2/25/2021
        credentials['Expiration'] = str(credentials['Expiration'])
        credentials.update({
            'upload_url': f's3://{bucket}/{key}',
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
        # User linkTo
        'files_in_set.submitted_by.first_name',
        'files_in_set.submitted_by.last_name',
        'files_in_set.submitted_by.job_title',

        # Lab linkTo
        'files_in_set.lab.title',
        'files_in_set.lab.name',

        # File linkTo
        'files_in_set.accession',
        'files_in_set.href',
        'files_in_set.file_size',
        'files_in_set.upload_key',
        'files_in_set.file_classification',

        # FileFormat linkTo
        'files_in_set.file_format.file_format',
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
        # User linkTo
        'files_in_set.submitted_by.first_name',
        'files_in_set.submitted_by.last_name',
        'files_in_set.submitted_by.job_title',

        # Lab linkTo
        'files_in_set.lab.title',
        'files_in_set.lab.name',

        # File linkTo
        'files_in_set.accession',
        'files_in_set.href',
        'files_in_set.file_size',
        'files_in_set.upload_key',
        'files_in_set.file_classification',

        # FileFormat linkTo
        'files_in_set.file_format.file_format',
    ]


@abstract_collection(
    name='files',
    unique_key='accession',
    acl=ALLOW_SUBMITTER_ADD_ACL,
    properties={
        'title': 'Files',
        'description': 'Listing of Files',
    })
class File(Item):
    """Collection for individual files."""
    item_type = 'file'
    base_types = ['File'] + Item.base_types
    schema = load_schema('encoded:schemas/file.json')

    # TODO: embed file_format
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        # Experiment linkTo
        'experiments.accession',
        'experiments.last_modified.date_modified',

        # ExperimentType linkTo
        'experiments.experiment_type.title',

        # ExperimentSet linkTo
        'experiments.experiment_sets.accession',
        'experiments.experiment_sets.experimentset_type',
        'experiments.experiment_sets.@type',

        # Enzyme linkTo
        'experiments.digestion_enzyme.name',

        # Biosample linkTo
        'experiments.biosample.accession',
        'experiments.biosample.biosource_summary',  # REQUIRES additional embeds #1
        'experiments.biosample.modifications_summary',
        'experiments.biosample.treatments_summary',

        # Biosource linkTo
        'experiments.biosample.biosource.biosource_type',
        'experiments.biosample.biosource.cell_line_tier',
        'experiments.biosample.biosource.override_biosource_name',
        'experiments.biosample.cell_culture_details.in_vitro_differentiated',  # needed for calc prop #1

        # OntologyTerm linkTo
        'experiments.biosample.biosource.cell_line.preferred_name',
        'experiments.biosample.biosource.cell_line.term_name',
        'experiments.biosample.biosource.cell_line.term_id',

        # OntologyTerm linkTo
        'experiments.biosample.biosource.tissue.preferred_name',
        'experiments.biosample.biosource.tissue.term_name',
        'experiments.biosample.biosource.tissue.term_id',

        # Modification linkTo
        'experiments.biosample.biosource.modifications.modification_type',
        'experiments.biosample.biosource.modifications.genomic_change',
        'experiments.biosample.biosource.modifications.override_modification_name',

        # BioFeature linkTo
        'experiments.biosample.biosource.modifications.target_of_mod.feature_type.uuid',
        'experiments.biosample.biosource.modifications.target_of_mod.preferred_label',
        'experiments.biosample.biosource.modifications.target_of_mod.cellular_structure',
        'experiments.biosample.biosource.modifications.target_of_mod.organism_name',
        'experiments.biosample.biosource.modifications.target_of_mod.relevant_genes.uuid',
        'experiments.biosample.biosource.modifications.target_of_mod.feature_mods.*',
        'experiments.biosample.biosource.modifications.target_of_mod.genome_location.uuid',

        # Individual linkTo
        'experiments.biosample.biosource.individual.protected_data',

        # Organism linkTo
        'experiments.biosample.biosource.organism.name',
        'experiments.biosample.biosource.organism.scientific_name',

        # FileFormat linkTo
        'file_format.file_format',

        # File linkTo
        'related_files.relationship_type',
        'related_files.file.accession',

        # QualityMetric linkTo
        'quality_metric.url',
        'quality_metric.@type',
        'quality_metric.Total reads',

        # Calc prop depends on qc_list
        'quality_metric.quality_metric_summary.*',

        # QualityMetric linkTo
        'quality_metric.qc_list.qc_type',
        'quality_metric.qc_list.value.url',
        'quality_metric.qc_list.value.@type',
        'quality_metric.qc_list.value.Total reads'
    ]
    # the following fields are patched by the update method and should always be included in the invalidation diff
    default_diff = [
        # open_data_url,  # consistency reliant on CNAME swap (full reindex) after transfer to open-data - uncomment if inconsistency with linking items becomes problematic
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
        # TODO: refactor to use file_format embed
        accession = accession or external_accession
        file_format_item = get_item_or_none(request, file_format, 'file-formats')
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
        out_string = (file_type or 'other')
        file_format_item = get_item_or_none(request, file_format, 'file-formats')
        try:
            fformat = file_format_item.get('file_format')
            out_string = out_string + ' (' + fformat + ')'
        except AttributeError:
            pass
        return out_string

    def generate_track_title(self, track_info, props):
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

    def _get_ds_cond_lab_from_repset(self, request, repset):
        elab = get_item_or_none(request, repset.get('lab'))
        if elab:
            elab = elab.get('display_title')
        return (repset.get('dataset_label', None),
                repset.get('condition', None),
                elab)

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
            rep_set_info = get_item_or_none(request, repsetid)
            if not rep_set_info:
                return info
            # pieces of info to get from the repset if there is one
            ds, c, el = self._get_ds_cond_lab_from_repset(request, rep_set_info)
            info['dataset'] = ds
            info['condition'] = c
            info['experimental_lab'] = el
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
            exp_info = get_item_or_none(request, expid)
            if not exp_info:  # sonmethings fishy - abort
                return info
            # check to see if we have experimental lab
            if 'experimental_lab' not in info or info.get('experimental_lab') is None:
                elab = get_item_or_none(request, exp_info.get('lab'))
                if elab:
                    info['experimental_lab'] = elab.get('display_title')
            exp_type = get_item_or_none(request, exp_info.get('experiment_type'))
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
                    rep_set_info = get_item_or_none(request, repset)
                    if rep_set_info is not None:
                        ds, c, el = self._get_ds_cond_lab_from_repset(request, rep_set_info)
                        info['dataset'] = ds
                        info['condition'] = c
                        if info.get('experimental_lab') is None:
                            info['experimental_lab'] = el
                        rep_exps = rep_set_info.get('replicate_exps', [])
                        for rep in rep_exps:
                            if rep.get('replicate_exp') == expid:
                                repstring = f"Biorep {rep.get('bio_rep_no')}, Techrep {rep.get('tec_rep_no')}"
                                info['replicate_info'] = repstring
            if 'biosource_name' not in currinfo:
                sample_id = exp_info.get('biosample')
                if sample_id is not None:
                    sample = get_item_or_none(request, sample_id)
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
            "experimental_lab": {
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
        props = self.upgrade_properties()
        # order matters here at leat for last 2 fields
        fields = ['experiment_type', 'assay_info', 'experimental_lab', 'dataset', 'condition',
                  'biosource_name', 'replicate_info', 'experiment_bucket', 'lab_name', 'track_title']
        # look for existing _props
        track_info = {field: props.get('override_' + field) for field in fields}
        track_info = {k: v for k, v in track_info.items() if v is not None}

        # vistrack only pass in biosource_name because _biosource_name is
        # a calc prop of vistrack - from linked Biosource
        if biosource_name and 'biosource_name' not in track_info:
            track_info['biosource_name'] = biosource_name

        if len(track_info) != len(fields):  # if track_info has same number of items as fields we have all we need
            if not all(field in track_info for field in fields[:-2]):
                # only if everything but lab and track_title exists can we avoid getting expt
                einfo = self._get_file_experiment_info(request, track_info)
                track_info.update({k: v for k, v in einfo.items() if k not in track_info})

            # file lab_name is same as lab - we need this property to account for FileVistrack
            # or any other file that are generated with override_ values
            if 'lab_name' not in track_info:
                labid = props.get('lab')
                lab = get_item_or_none(request, labid)
                if lab:
                    track_info['lab_name'] = lab.get('display_title')

        if 'track_title' not in track_info:
            track_title = self.generate_track_title(track_info, props)
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
            except Exception:
                at_id = "/" + str(uuid) + "/"
            # ensure at_id ends with a slash
            if not at_id.endswith('/'):
                at_id += '/'

            file_formats = []
            for xfile in extra_files:
                # ensure a file_format (identifier for extra_file) is given and non-null
                if not ('file_format' in xfile and bool(xfile['file_format'])):
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
            "paired with": "paired with",
            "matched with": "matched with",
            # "grouped with": "grouped with"
        }

        if 'related_files' in properties:
            my_uuid = str(self.uuid)
            # save these values
            curr_txn = None
            curr_request = None
            for relation in properties["related_files"]:
                # skip "grouped with" type from update, to avoid circularity issues
                # which are more likely to arise with larger groups
                if relation["relationship_type"] == "grouped with":
                    continue
                try:
                    switch = relation["relationship_type"]
                    rev_switch = DicRefRelation[switch]
                    related_fl = relation["file"]
                    relationship_entry = {"relationship_type": rev_switch, "file": my_uuid}
                except Exception:
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
        fformat = get_item_or_none(request, file_format, 'file-formats')
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
    def upload_key(self, request, filename=None):
        properties = self.properties
        external = self.propsheets.get('external', {})
        extkey = external.get('key')
        # od_url = self._open_data_url(self.properties['status'], filename=filename)
        # if od_url:
        #     return f'No upload key for open data file {filename}'
        if not external or not extkey or extkey != self.build_key(self.registry, self.uuid, properties):
            try:
                external = self.build_external_creds(self.registry, self.uuid, properties)
            except ClientError as e:
                return f'Failed to acquire upload credentials for {self.uuid} with error {e}'
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

    def get_presigned_url_location(self, external, request, filename) -> str:
        """ Opens an S3 boto3 client and returns a presigned url for the requested file to be downloaded"""
        conn = boto3.client('s3')
        param_get_object = {
            'Bucket': external['bucket'],
            'Key': external['key'],
            'ResponseContentDisposition': "attachment; filename=" + filename
        }
        if request.range:
            param_get_object.update({'Range': request.headers.get('Range')})
            del param_get_object['ResponseContentDisposition']
        location = conn.generate_presigned_url(
            ClientMethod='get_object',
            Params=param_get_object,
            ExpiresIn=36*60*60
        )
        return location

    def get_open_data_url_or_presigned_url_location(self, external, request, filename, datastore_is_database) -> str:
        """ Returns the Open Data S3 url for the file if present (as a calculated property), and otherwise returns
            a presigned S3 URL to a 4DN bucket. """
        open_data_url = None
        if datastore_is_database:  # view model came from DB - must compute calc prop
            open_data_url = self._open_data_url(self.properties['status'], filename=filename)
        else:  # view model came from elasticsearch - calc props should be here
            if hasattr(self.model, 'source'):
                es_model_props = self.model.source['embedded']
                open_data_url = es_model_props.get('open_data_url', '')
                if filename not in open_data_url:  # we requested an extra_file, so recompute with correct filename
                    open_data_url = self._open_data_url(self.properties['status'], filename=filename)
            if not open_data_url:  # fallback to DB
                open_data_url = self._open_data_url(self.properties['status'], filename=filename)
        if open_data_url:
            return open_data_url
        else:
            location = self.get_presigned_url_location(external, request, filename)
            return location

    @staticmethod
    def _head_s3(client, bucket, key):
        """ Helper for below method for mocking purposes. """
        return client.head_object(Bucket=bucket, Key=key)

    def _open_data_url(self, status, filename):
        """ Helper for below method containing core functionality. """
        if not filename:
            return None
        if status in ['released', 'archived']:
            open_data_bucket = '4dn-open-data-public'
            bucket_type = 'wfoutput'  # almost always going to be wfoutput
            open_data_key = 'fourfront-webprod/{bucket_type}/{uuid}/{filename}'.format(
                bucket_type=bucket_type, uuid=self.uuid, filename=filename,
            )
            extra_open_data_key = 'fourfront-webprod/{bucket_type}/{uuid}/{filename}'.format(
                bucket_type='files', uuid=self.uuid, filename=filename,
            )
            # Check if the file exists in the Open Data S3 bucket under both wfoutput and files paths
            client = boto3.client('s3')
            for key in [open_data_key, extra_open_data_key]:
                # If the file exists in the Open Data S3 bucket, client.head_object will succeed (not throw ClientError)
                # Returning a valid S3 URL to the public url of the file
                try:
                    self._head_s3(client, open_data_bucket, key)
                except ClientError:
                    continue  # try the other key
                location = 'https://{open_data_bucket}.s3.amazonaws.com/{open_data_key}'.format(
                    open_data_bucket=open_data_bucket, open_data_key=key,
                )
                return location
            else:
                return None  # got client error for both possibilities
        else:
            return None

    @calculated_property(schema={
        "title": "Open Data URL",
        "description": "Location of file on Open Data Bucket, if it exists",
        "type": "string"
    })
    def open_data_url(self, request, accession, file_format, status=None):
        """ Computes the open data URL and checks if it exists. """
        fformat = get_item_or_none(request, file_format, frame='raw')  # no calc props needed
        filename = "{}.{}".format(accession, fformat.get('standard_file_extension', ''))
        return self._open_data_url(status, filename)

    @classmethod
    def get_bucket(cls, registry):
        return registry.settings['file_upload_bucket']

    @classmethod
    def build_key(cls, registry, uuid, properties):
        fformat = properties.get('file_format')
        if fformat.startswith('/file-formats/'):
            fformat = fformat[len('/file-formats/'):-1]
        prop_format = registry['collections']['FileFormat'].get(fformat)
        try:
            file_extension = prop_format.properties['standard_file_extension']
        except KeyError:
            raise Exception('File format not in list of supported file types')
        return '{uuid}/{accession}.{file_extension}'.format(
            file_extension=file_extension, uuid=uuid,
            accession=properties.get('accession'))

    @classmethod
    def build_external_creds(cls, registry, uuid, properties):
        """ This function is very important in that it determines both the upload
            and download location of files - so we have two distinct cases to handle.

            It is sometimes the case that we build_external_creds for extra files that
            may not be in the same bucket as the source file. So we first assume the
            common (download) case and check for file presence in both buckets and use
            the one where the file actually is (prioritizing the wfoutput bucket).

            We could also be doing an upload, in which case we will do two head requests
            that will give us nothing and we should fallback to the bucket associated
            with the type.
        """
        conn = boto3.client('s3')
        bucket = None
        key = cls.build_key(registry, uuid, properties)
        # _head_s3 for both files and wfoutput buckets if we are doing a download
        for b in [registry.settings['file_wfout_bucket'], registry.settings['file_upload_bucket']]:
            try:
                cls._head_s3(conn, b, key)
                bucket = b
            except ClientError:
                continue  # try other key

        # file doesn't exist, so we are doing an upload, use bucket consistent with type
        if not bucket:
            bucket = cls.get_bucket(registry)

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

    @calculated_property(schema={
        "title": "Notes to tsv file",
        "description": "Notes that go into the metadata.tsv file",
        "type": "string"
    })
    def tsv_notes(self, request, notes_to_tsv=None):
        if notes_to_tsv is None:
            return ''
        else:
            notes_to_tsv_string = ','.join(notes_to_tsv)
        return notes_to_tsv_string


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
        # QualityMetric linkTo
        'quality_metric.overall_quality_status',
        'quality_metric.Total Sequences',
        'quality_metric.Sequence length',
        'quality_metric.url'
    ]
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
        # ExperimentSet linkTo
        'experiment_sets.accession',
        'experiment_sets.last_modified.date_modified',

        # QualityMetric linkTo
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
        return list(set(self.rev_link_atids(request, "experiment_sets")
                        + self.rev_link_atids(request, "other_experiment_sets")))

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
        return list(set(self.rev_link_atids(request, "experiments")
                        + self.rev_link_atids(request, "other_experiments")))

    @calculated_property(schema={
        "title": "Pairsqc Quality Metric Table",
        "description": "Link to a PairsQC quality metric table tsv file",
        "type": "string"
    })
    def pairsqc_table(self, request, file_format, accession, quality_metric=None):
        if file_format.endswith('pairs/') and quality_metric:
            bucket = request.registry.settings.get('file_wfout_bucket')
            s3_url = 'https://s3.amazonaws.com/{bucket}/{accession}/{accession}.plot_table.out'
            return s3_url.format(bucket=bucket, accession=accession)
        else:
            return None

    # processed files don't want md5 as unique key
    def unique_keys(self, properties):
        keys = super(FileProcessed, self).unique_keys(properties)
        if keys.get('alias'):
            keys['alias'] = [k for k in keys['alias'] if not k.startswith('md5:')]
        return keys

    @calculated_property(schema={
        "title": "Source",
        "description": "Gets all experiments (if experiment is found, find its experiment) associated w/ this file",
        "type": "array",
        "items": {
            "title": "Experiment Set",
            "type": "string",
            "linkTo": "ExperimentSet"
        }
    })
    def source_experiment_sets(self, request):
        exp_sets = set(self.rev_link_atids(request, "experiment_sets") +
                       self.rev_link_atids(request, "other_experiment_sets"))
        exps = set(self.rev_link_atids(request, "experiments") +
                   self.rev_link_atids(request, "other_experiments"))
        if not exps == []:
            for exp in exps:
                exp_data = request.embed(exp, '@@object')
                if not exp_data['experiment_sets'] == []:
                    exp_sets.update(exp_data['experiment_sets'])
        return list(exp_sets)


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

    # reference files don't want md5 as unique key
    def unique_keys(self, properties):
        keys = super(FileReference, self).unique_keys(properties)
        if keys.get('alias'):
            keys['alias'] = [k for k in keys['alias'] if not k.startswith('md5:')]
        return keys


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
    def track_and_facet_info(self, request, biosource_name=None, biosource=None):
        return super().track_and_facet_info(request, biosource_name=self.override_biosource_name(request, biosource))

    @calculated_property(schema={
        "title": "Biosource Name",
        "type": "string"
    })
    def override_biosource_name(self, request, biosource=None):
        if biosource:
            return request.embed(biosource, '@@object').get('biosource_name')

    @calculated_property(schema={
        "title": "Display Title",
        "description": "Name of this File",
        "type": "string"
    })
    def display_title(self, request, file_format, accession=None, external_accession=None, dbxrefs=None):
        if dbxrefs:
            acclist = [d.replace('ENCODE:', '') for d in dbxrefs if 'ENCFF' in d]
            if acclist:
                accession = acclist[0]
        if not accession:
            accession = accession or external_accession
        file_format_item = get_item_or_none(request, file_format, 'file-formats')
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


def _build_file_microscopy_embedded_list():
    """ Helper function intended to be used to create the embedded list for FileMicroscopy.
        All types should implement a function like this going forward.
    """
    imaging_path_embeds = DependencyEmbedder.embed_for_type(
        base_path='experiments.imaging_paths.path',
        t='imaging_path',
        additional_embeds=['imaging_rounds', 'experiment_type.title'])
    imaging_path_target_embeds = DependencyEmbedder.embed_defaults_for_type(
        base_path='experiments.imaging_paths.path.target',
        t='bio_feature')
    return (File.embedded_list + imaging_path_embeds + imaging_path_target_embeds + [
        # Experiment linkTo
        'experiments.accession',
        'experiments.@type',
        'experiments.imaging_paths.channel',

        # Microscope linkTo
        'experiments.files.microscope_settings.ch00_light_source_center_wl',
        'experiments.files.microscope_settings.ch01_light_source_center_wl',
        'experiments.files.microscope_settings.ch02_light_source_center_wl',
        'experiments.files.microscope_settings.ch03_light_source_center_wl',
        'experiments.files.microscope_settings.ch04_light_source_center_wl',
        'experiments.files.microscope_settings.ch00_lasers_diodes',
        'experiments.files.microscope_settings.ch01_lasers_diodes',
        'experiments.files.microscope_settings.ch02_lasers_diodes',
        'experiments.files.microscope_settings.ch03_lasers_diodes',
        'experiments.files.microscope_settings.ch04_lasers_diodes',

        # MicroscopeConfiguration linkTo
        'microscope_configuration.title',
        'microscope_configuration.microscope.Name',
        ]
    )


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
    embedded_list = _build_file_microscopy_embedded_list()
    name_key = 'accession'


@collection(
    name='files-other',
    unique_key='accession',
    properties={
        'title': 'Other Files',
        'description': 'Listing of Other Files for Ingestion',
    })
class FileOther(File):
    """Collection for other files for ingestion."""
    item_type = 'file_other'
    schema = load_schema('encoded:schemas/file_other.json')
    embedded_list = File.embedded_list
    name_key = 'accession'

    @classmethod
    def get_bucket(cls, registry):
        return registry.settings['blob_bucket']


@view_config(name='upload', context=File, request_method='GET',
             permission='edit')
@debug_log
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
@debug_log
def post_upload(context, request):
    properties = context.upgrade_properties()
    if properties['status'] not in ('uploading', 'to be uploaded by workflow', 'upload failed'):
        raise HTTPForbidden('status must be "uploading" to issue new credentials')
    # accession_or_external = properties.get('accession')
    external = context.propsheets.get('external', None)

    if external is None:
        # Handle objects initially posted as another state.
        bucket = request.registry.settings['file_upload_bucket']
        # maybe this should be properties.uuid
        uuid = context.uuid
        file_format = get_item_or_none(request, properties.get('file_format'), 'file-formats')
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


def update_google_analytics(context, request, ga_config, filename, file_size_downloaded,
                            file_at_id, lab, user_uuid, user_groups, file_experiment_type, file_type='other'):
    """ Helper for @@download that updates GA in response to a download.
    """
    registry = request.registry
    ga4_secret = registry.settings.get('ga4.secret')
    if not ga4_secret:
        raise Exception("No valid GA4 api secret found")

    ga_cid = request.cookies.get("clientIdentifier")
    if not ga_cid:  # Fallback, potentially can stop working as GA is updated
        ga_cid = request.cookies.get("_ga")
        if ga_cid:
            ga_cid = ".".join(ga_cid.split(".")[2:])
        else:
            ga_cid = "programmatic"

    ga_tid_mapping = ga_config["hostnameTrackerIDMapping"].get(request.host,
                                                       ga_config["hostnameTrackerIDMapping"].get("default"))
    ga_tid = ga_tid_mapping[1] if isinstance(ga_tid_mapping, list) and len(ga_tid_mapping) > 1 else None

    if ga_tid is None:
        raise Exception("No valid tracker id found in ga_config.json > hostnameTrackerIDMapping")

    file_extension =  os.path.splitext(filename)[1][1:]
    item_types = [ty for ty in reversed(context.jsonld_type()[:-1])]
    lab_title = lab.get("display_title")

    ga_payload = {
        "client_id": ga_cid,
        "timestamp_micros": str(int(datetime.datetime.now().timestamp() * 1000000)),
        "non_personalized_ads": False,
        "events": [
            {
                "name": "purchase",
                "params": {
                    "name": filename,
                    "source": "Serverside File Download",
                    "action": "Range Query" if request.range else "File Download",
                    "file_name": filename,
                    "file_extension": file_extension,
                    "link_url": request.url,
                    "file_size": file_size_downloaded,
                    "downloads": 0 if request.range else 1,
                    "experiment_type": file_experiment_type or "None",
                    "lab": lab_title or "None",
                    # Product Category from @type, e.g. "File/FileProcessed"
                    "file_classification": "/".join(item_types),
                    "file_type": file_type,
                    "items": [
                        {
                            "item_id": file_at_id,
                            "item_name": filename,
                            "item_category": item_types[0] if len(item_types) >= 1 else "Unknown",
                            "item_category2": item_types[1] if len(item_types) >= 2 else "Unknown",
                            "item_brand": lab_title or "None",
                            "item_variant": file_type,
                            "quantity": 1
                        }
                    ]
                }
            }
        ]
    }

    if user_uuid:
        ga_payload['events'][0]['params']['user_uuid'] = user_uuid
        ga_payload['user_id'] = user_uuid

    if user_groups:
        groups_json = json.dumps(user_groups, separators=(',', ':'))  # Compcact JSON; aligns w. what's passed from JS.
        ga_payload['events'][0]['params']['user_groups'] = groups_json

    # Catch error here
    try:
        def remove_none_fields(obj):
            if isinstance(obj, dict):
                return {k: remove_none_fields(v) for k, v in obj.items() if v is not None}
            elif isinstance(obj, (list, tuple)):
                return [remove_none_fields(item) for item in obj if item is not None]
            else:
                return obj

        _ = requests.post(
            url="https://www.google-analytics.com/mp/collect?measurement_id={m_tid}&api_secret={api_secret}".format(m_tid=ga_tid, api_secret=ga4_secret),
            data=json.dumps(remove_none_fields(ga_payload)),
            verify=True)
    except Exception as e:
        log.error('Exception encountered posting to GA: %s' % e)


@view_config(name='download', context=File, request_method='GET',
             permission='view', subpath_segments=[0, 1])
@debug_log
def download(context, request):
    """ Endpoint for handling /@@download/ URLs """

    # download is resricted for anonymous users unless it is
    # for vitessce range requests
    if not is_range_request_for_vitessce(context, request):
        check_user_is_logged_in(request)

    # first check for restricted status
    if context.properties.get('status') == 'restricted':
        raise HTTPForbidden('This is a restricted file not available for download')
    try:
        user_props = session_properties(request)
    except Exception as e:
        user_props = {"error": str(e)}

    user_uuid = user_props.get('details', {}).get('uuid', None)
    user_groups = user_props.get('details', {}).get('groups', None)
    if user_groups:
        user_groups.sort()

    # TODO:
    # if not user_uuid or file_size_downloaded < 25 * (1024**2):  # TODO: Should this be greater-than? -kmp 1-Feb-2022
    #     # Downloads, mostly for range queries (HiGlass, etc), are allowed if less than 25mb
    #     raise HTTPForbidden("Must login or provide access keys to download files larger than 5mb")

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
    file_format = get_item_or_none(request, properties.get('file_format'), 'file-formats')
    lab = properties.get('lab') and get_item_or_none(request, properties.get('lab'), 'labs')
    _filename = None
    if request.subpath:
        _filename, = request.subpath
    filename = is_file_to_download(properties, file_format, _filename)
    if not filename:
        found = False
        external = None  # in case none found
        for extra in properties.get('extra_files', []):
            eformat = get_item_or_none(request, extra.get('file_format'), 'file-formats')
            filename = is_file_to_download(extra, eformat, _filename)
            if filename:
                found = True
                properties = extra
                external = context.propsheets.get('external' + eformat.get('uuid'))
                break
        if not found:
            raise HTTPNotFound(_filename)
    else:
        external = context.propsheets.get('external', {})

    # Calculate bytes downloaded from Range header
    headers = None
    file_size_downloaded = properties.get('file_size', 0)
    if request.range:
        file_size_downloaded = 0
        headers = {'Range': request.headers.get('Range')}
        # Assume range unit is bytes. Because there's no spec for others really, atm, afaik..
        if hasattr(request.range, "ranges"):
            for (range_start, range_end) in request.range.ranges:
                file_size_downloaded += (
                    (range_end or properties.get('file_size', 0)) -
                    (range_start or 0)
                )
        else:
            file_size_downloaded = (
                (request.range.end or properties.get('file_size', 0)) -
                (request.range.start or 0)
            )

    request_datastore_is_database = (request.datastore == 'database')
    if not external:
        external = context.build_external_creds(request.registry, context.uuid, properties)
    if external.get('service') == 's3':
        location = context.get_open_data_url_or_presigned_url_location(external, request, filename,
                                                                       request_datastore_is_database)
    else:
        raise ValueError(external.get('service'))

    # Analytics Stuff
    ga_config = request.registry.settings.get('ga_config')
    file_experiment_type = get_file_experiment_type(request, context, properties)
    file_at_id = context.jsonld_id(request)

    if ga_config:
        update_google_analytics(context, request, ga_config, filename, file_size_downloaded, file_at_id, lab,
                                user_uuid, user_groups, file_experiment_type, properties.get('file_type'))

    # TODO does not handle range queries
    if asbool(request.params.get('soft')):
        expires = int(parse_qs(urlparse(location).query)['Expires'][0])
        return {
            '@type': ['SoftRedirect'],
            'location': location,
            'expires': datetime.datetime.fromtimestamp(expires, pytz.utc).isoformat(),
        }

    # We don't use X-Accel-Redirect here so that client behaviour is similar for
    # both aws and non-aws users.
    if use_download_proxy:
        location = request.registry.settings.get('download_proxy', '') + str(location)

    # 307 redirect specifies to keep original method
    if headers is not None:  # forward Range header to open data, redundant for our buckets
        raise HTTPTemporaryRedirect(location=location, headers=headers)
    else:
        raise HTTPTemporaryRedirect(location=location)


def build_drs_object_from_props(drs_object_base, props):
    """ Takes in base properties for a DRS object we expect on all items and expands them if corresponding
        properties exist
    """
    # fields that match exactly in name and structure
    for exact_field in [
        'description',
    ]:
        if exact_field in props:
            drs_object_base[exact_field] = props[exact_field]

    # size is required by DRS so take it or default to 0
    drs_object_base['size'] = props.get('file_size', 0)

    # use system uuid as alias
    drs_object_base['aliases'] = [props['uuid']]

    # fields that are mapped to different names/structure
    if 'content_md5sum' in props or 'md5sum' in props:
        md5 = props.get('md5sum', props.get('content_md5sum'))
        drs_object_base['checksums'] = [
            {
                'checksum': md5,
                'type': 'md5'
            }
        ]
        # use md5sum as version
        drs_object_base['version'] = md5
    if 'filename' in props:
        drs_object_base['name'] = props['filename']
    if 'last_modified' in props:
        drs_object_base['updated_time'] = props['last_modified']['date_modified']
    return drs_object_base


@view_config(name='drs', context=File, request_method='GET',
             permission='view', subpath_segments=[0, 1])
def drs(context, request):
    """ DRS object implementation for file. """
    rendered_object = request.embed(str(context.uuid), '@@object', as_user=True)
    accession = rendered_object['accession']
    open_data_url = rendered_object.get('open_data_url', None)
    # TODO: implement access_id mechanism
    if not open_data_url:
        return Response('Access ID support planned for the future', status=404)
    s3_uri = '/'.join(open_data_url.split(".s3.amazonaws.com/")).replace('https', 's3')
    drs_object_base = {
        'id': accession,
        'created_time': rendered_object['date_created'],
        'self_uri': f'drs://{request.host}/{accession}',
        'access_methods': [
            {
                # always use open data
                'access_url': {
                    'url': open_data_url
                },
                'type': 'https',
                'access_id': 'https'
            },
            {
                # add s3 method for open data
                'access_url': {
                    'url': s3_uri
                },
                'type': 's3',
                'access_id': 's3',
                'region': 'us-east-1'
            }
        ]
    }
    return build_drs_object_from_props(drs_object_base, rendered_object)


def get_file_experiment_type(request, context, properties):
    """
    Get the string experiment_type value given a File context and properties.
    Checks the source_experiments, rev_linked experiments and experiment_sets
    """

    # first, try to find exp type in track_and_facet_info
    # if track_and_facet_info is missing, the context is possibly in 'raw' frame which lacks track_and_facet_info,
    # so retrieve file item in 'object' frame
    if properties.get('track_and_facet_info') is None:
        file_item = get_item_or_none(request, context.uuid)
        if file_item is not None and file_item.get('track_and_facet_info') and file_item['track_and_facet_info'].get('experiment_type'):
            return file_item['track_and_facet_info']['experiment_type']

    # legacy code to find experiment_type when calc prop track_and_facet_info is missing
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
                    exp_set_info = get_item_or_none(request, exp_set)
                    if exp_set_info:
                        experiments_using_file.extend(exp_set_info.get('experiments_in_set', []))
    found_experiment_type = 'None'
    for file_experiment in experiments_using_file:
        exp_info = get_item_or_none(request, file_experiment)
        if exp_info is None:
            continue
        exp_type = exp_info.get('experiment_type')
        if found_experiment_type == 'None' or found_experiment_type == exp_type:
            found_experiment_type = exp_type
        else:  # multiple experiment types
            return 'Integrative analysis'
    if found_experiment_type != 'None':
        found_item = get_item_or_none(request, found_experiment_type)
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
        file_format_item = get_item_or_none(request, data['file_format'], 'file-formats')
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
    """ validator for filename field """
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
    file_format_item = get_item_or_none(request, ff, 'file-formats')
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
    """validator to check md5 on processed files and reference files, unless
    you tell it not to"""
    # skip validator if not file processed or file reference
    if context.type_info.item_type not in ['file_processed', 'file_reference']:
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
    """validator to make sure that the values in the
    produced_from field are valid file identifiers"""
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
            fid = get_item_or_none(request, f, 'files').get('uuid')
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
    """validator to check to be sure that file_format of extrafile is not the
       same as the file and is a known format for the schema
    """
    files_ok = True
    data = request.json
    if not data.get('extra_files'):
        return
    extras = data['extra_files']
    # post should always have file_format as it is required patch may or may not
    ff = data.get('file_format')
    if not ff:
        ff = context.properties.get('file_format')
    file_format_item = get_item_or_none(request, ff, 'file-formats')
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
            ok_format_item = get_item_or_none(request, ok_format, 'file-formats')
            try:
                off_uuid = ok_format_item.get('uuid')
            except AttributeError:
                raise Exception("FileFormat Item %s contains unknown FileFormats"
                                " in the extrafile_formats property" % file_format_item.get('uuid'))
            valid_ext_formats.append(off_uuid)
    seen_ext_formats = []
    # formats = request.registry['collections']['FileFormat']
    for i, ef in enumerate(extras):
        eformat = ef.get('file_format')
        if eformat is None:
            return  # will fail the required extra_file.file_format
        eformat_item = get_item_or_none(request, eformat, 'file-formats')
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


def is_range_request_for_vitessce(context, request) -> bool:
    tags = context.properties.get('tags', [])
    if 'vitessce' in tags and request.range:
        return True
    return False


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
@debug_log
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
@debug_log
def file_edit(context, request, render=None):
    return item_edit(context, request, render)
