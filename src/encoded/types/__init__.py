"""init.py lists all the collections that do not have a dedicated types file."""

import boto3
import transaction

from mimetypes import guess_type
from urllib.parse import quote
from snovault.attachment import ItemWithAttachment
from snovault.crud_views import collection_add as sno_collection_add
from snovault.schema_utils import validate_request
from snovault.validation import ValidationFailure
from snovault.util import debug_log
from snovault import (
    calculated_property,
    collection,
    load_schema,
    # CONNECTION,
    COLLECTIONS,
    BLOBS
)
# from pyramid.traversal import find_root
from .base import (
    Item,
    set_namekey_from_title,
    lab_award_attribution_embed_list,
    ALLOW_OWNER_EDIT_ACL,
    ALLOW_CURRENT_ACL,
    DELETED_ACL,
    ONLY_ADMIN_VIEW_ACL,
    ALLOW_LAB_SUBMITTER_EDIT_ACL
)
from .dependencies import DependencyEmbedder
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import (
    HTTPForbidden,
    # HTTPTemporaryRedirect,
    HTTPFound,
    HTTPNotFound,
    # HTTPBadRequest
)


def includeme(config):
    """include me method."""
    config.scan()


def _build_analysis_step_embedded_list():
    """ Helper function intended to be used to create the embedded list for analysis_step.
        All types should implement a function like this going forward.
    """
    return Item.embedded_list + [
        'software_used.name',
        'software_used.title',
        'qa_stats_generated.attachment'
    ]


@collection(
    name='analysis-steps',
    unique_key='analysis_step:name',
    properties={
        'title': 'AnalysisSteps',
        'description': 'Listing of analysis steps for 4DN analyses',
    })
class AnalysisStep(Item):
    """The AnalysisStep class that descrbes a step in a workflow."""

    item_type = 'analysis_step'
    schema = load_schema('encoded:schemas/analysis_step.json')
    embedded_list = _build_analysis_step_embedded_list()


def _build_biosample_cell_culture_embedded_list():
    """ Helper function intended to be used to create the embedded list for biosample_cell_culture.
        All types should implement a function like this going forward.
    """
    protocols_additional_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='protocols_additional',
                                                                             t='protocol')
    authentication_protocols_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='authentication_protocols',
                                                                                 t='protocol')
    return Item.embedded_list + protocols_additional_embeds + authentication_protocols_embeds


@collection(
    name='biosample-cell-cultures',
    properties={
        'title': 'Biosample Cell Culture Information',
        'description': 'Listing Biosample Cell Culture Information',
    })
class BiosampleCellCulture(Item):
    """Cell culture details for Biosample."""

    item_type = 'biosample_cell_culture'
    schema = load_schema('encoded:schemas/biosample_cell_culture.json')
    embedded_list = _build_biosample_cell_culture_embedded_list()


def _build_construct_embedded_list():
    """ Helper function intended to be used to create the embedded list for construct.
        All types should implement a function like this going forward.
    """
    expression_products_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='expression_products',
                                                                            t='bio_feature')
    return Item.embedded_list + expression_products_embeds + [
        # Vendor linkTo
        'construct_vendor.title'
    ]


@collection(
    name='constructs',
    properties={
        'title': 'Constructs',
        'description': 'Listing of Constructs',
    })
class Construct(Item):
    """Construct class."""

    item_type = 'construct'
    schema = load_schema('encoded:schemas/construct.json')
    embedded_list = _build_construct_embedded_list()


@collection(
    name='documents',
    properties={
        'title': 'Documents',
        'description': 'Listing of Documents',
    })
class Document(ItemWithAttachment, Item):
    """Document class."""

    item_type = 'document'
    schema = load_schema('encoded:schemas/document.json')

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title",
        "type": "string"
    })
    def display_title(self, attachment=None):
        if attachment:
            return attachment.get('download')
        return Item.display_title(self)


@view_config(name='download', context=ItemWithAttachment, request_method='GET',
             permission='view', subpath_segments=2)
@debug_log
def download(context, request):
    """Implementation mostly cloned from snovault/attachment.py/download function.
    We customized it since default implementation renames filename w/ s3 blob id.
    """

    # first check for restricted status
    if context.properties.get('status') == 'restricted':
        raise HTTPForbidden('This is a restricted file not available for download')

    prop_name, filename = request.subpath
    try:
        downloads = context.propsheets['downloads']
    except KeyError:
        raise HTTPNotFound("Cannot find downloads propsheet. Update item.")
    try:
        download_meta = downloads[prop_name]
    except KeyError:
        raise HTTPNotFound(prop_name)

    if download_meta['download'] != filename:
        raise HTTPNotFound(filename)

    mimetype, content_encoding = guess_type(filename, strict=False)
    if mimetype is None:
        mimetype = 'application/octet-stream'

    # If blob is on s3, redirect us there
    blob_storage = request.registry[BLOBS]
    if 'bucket' in download_meta:
        location = get_s3_presigned_url(download_meta, filename)
        raise HTTPFound(location=location)
    elif hasattr(blob_storage, 'get_blob_url'):  # default fallback - filename is s3 blob id
        blob_url = blob_storage.get_blob_url(download_meta)
        raise HTTPFound(location=str(blob_url))

    # Otherwise serve the blob data ourselves
    blob = blob_storage.get_blob(download_meta)
    headers = {
        'Content-Type': mimetype,
    }
    return Response(body=blob, headers=headers)


def get_s3_presigned_url(download_meta, filename):
    conn = boto3.client('s3')
    param_get_object = {
        'Bucket': download_meta['bucket'],
        'Key': download_meta['key'],
        'ResponseContentDisposition': "inline; filename=" + quote(filename)
    }
    location = conn.generate_presigned_url(
        ClientMethod='get_object',
        Params=param_get_object,
        ExpiresIn=36 * 60 * 60  # 36 hours
    )
    return location


@collection(
    name='enzymes',
    unique_key='enzyme:name',
    properties={
        'title': 'Enzymes',
        'description': 'Listing of enzymes',
    })
class Enzyme(Item):
    """Enzyme class."""

    item_type = 'enzyme'
    schema = load_schema('encoded:schemas/enzyme.json')
    name_key = 'name'
    embedded_list = Item.embedded_list + [
        'enzyme_source.title',

        # Enzyme linkTo
        'mixed_enzymes.name'
    ]


def _build_experiment_type_embedded_list():
    """ Helper function intended to be used to create the embedded list for experiment_type.
        All types should implement a function like this going forward.
    """
    sop_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='sop', t='protocol')
    other_protocol_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='other_protocols', t='protocol')
    controlled_term_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='controlled_term', t='ontology_term')
    return Item.embedded_list + sop_embeds + other_protocol_embeds + controlled_term_embeds + [
        # Publication linkTo
        'reference_pubs.short_attribution',
        'reference_pubs.authors',
        'reference_pubs.date_published',
        'reference_pubs.journal',
    ]


@collection(
    name='experiment-types',
    unique_key='experiment_type:experiment_name',
    lookup_key='title',
    properties={
        'title': 'Experiment Types',
        'description': 'Listing of experiment types for 4DN items',
    }
)
class ExperimentType(Item):
    """The ExperimentType class that descrbes an experiment type that can be associated with an experiment."""

    item_type = 'experiment_type'
    schema = load_schema('encoded:schemas/experiment_type.json')
    name_key = 'experiment_name'
    embedded_list = _build_experiment_type_embedded_list()

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['experiment_name'] = set_namekey_from_title(properties)
        super(ExperimentType, self)._update(properties, sheets)


@collection(
    name='file-formats',
    unique_key='file_format:file_format',
    lookup_key='file_format',
    properties={
        'title': 'File Formats',
        'description': 'Listing of file formats used by 4DN'
    }
)
class FileFormat(Item, ItemWithAttachment):
    """The class to store information about 4DN file formats"""
    item_type = 'file_format'
    schema = load_schema('encoded:schemas/file_format.json')
    name_key = 'file_format'
    embedded_list = Item.embedded_list + [
        'extrafile_formats.file_format'
    ]

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title",
        "type": "string"
    })
    def display_title(self, file_format):
        return file_format


@collection(
    name='genomic-regions',
    properties={
        'title': 'Genomic Regions',
        'description': 'Listing of genomic regions',
    })
class GenomicRegion(Item):
    """The GenomicRegion class that describes a region of a genome."""

    item_type = 'genomic_region'
    schema = load_schema('encoded:schemas/genomic_region.json')

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title",
        "type": "string"
    })
    def display_title(self, genome_assembly, location_description=None,
                      start_coordinate=None, end_coordinate=None, chromosome=None):
        """ If you have full genome coordinates use those, otherwise use a
            location description (which should be provided if not coordinates)
            with default just being genome assembly (required)
        """
        if location_description and not (start_coordinate or end_coordinate):
            value = location_description
        else:
            value = genome_assembly
            if chromosome is not None:
                value += (':' + chromosome)
            if start_coordinate and end_coordinate:
                value += ':' + str(start_coordinate) + '-' + str(end_coordinate)
        return value


@collection(
    name='organisms',
    unique_key='organism:taxon_id',
    lookup_key='name',
    properties={
        'title': 'Organisms',
        'description': 'Listing of all registered organisms',
    })
class Organism(Item):
    """Organism class."""

    item_type = 'organism'
    schema = load_schema('encoded:schemas/organism.json')
    name_key = 'taxon_id'

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title",
        "type": "string"
    })
    def display_title(self, name, scientific_name=None):
        if scientific_name:
            scientific_name_parts = scientific_name.split(' ')
            if len(scientific_name_parts) > 1:
                return ' '.join([scientific_name_parts[0][0].upper() + '.'] + scientific_name_parts[1:])
            else:
                return scientific_name
        return name


@collection(
    name='tracking-items',
    properties={
        'title': 'TrackingItem',
        'description': 'For internal tracking of Fourfront events',
    })
class TrackingItem(Item):
    """tracking-item class."""

    item_type = 'tracking_item'
    schema = load_schema('encoded:schemas/tracking_item.json')
    embedded_list = []
    STATUS_ACL = Item.STATUS_ACL.copy()
    STATUS_ACL.update({
        'released': ALLOW_OWNER_EDIT_ACL + ALLOW_CURRENT_ACL,
        'deleted': ALLOW_OWNER_EDIT_ACL + DELETED_ACL,
        'draft': ALLOW_OWNER_EDIT_ACL + ONLY_ADMIN_VIEW_ACL,
        'in review by lab': ALLOW_OWNER_EDIT_ACL + ALLOW_LAB_SUBMITTER_EDIT_ACL,
    })

    @classmethod
    def create_and_commit(cls, request, properties, clean_headers=False):
        """
        Create a TrackingItem with a given request and properties, committing
        it directly to the DB. This works by manually committing the
        transaction, which may cause issues if this function is called as
        part of another POST. For this reason, this function should be used to
        track GET requests -- otherwise, use the standard POST method.
        If validator issues are hit, will not create the item but log to error

        Args:
            request: current request object
            properties (dict): TrackingItem properties to post
            clean_headers(bool): If True, remove 'Location' header created by POST

        Returns:
            dict response from snovault.crud_views.collection_add

        Raises:
            ValidationFailure if TrackingItem cannot be validated
        """
        collection = request.registry[COLLECTIONS]['TrackingItem']
        # set remote_user to standarize permissions
        prior_remote = request.remote_user
        request.remote_user = 'EMBED'
        # remove any missing attributes from DownloadTracking
        properties['download_tracking'] = {
            k: v for k, v in properties.get('download_tracking', {}).items() if v is not None
        }
        validate_request(collection.type_info.schema, request, properties)
        if request.errors:  # added from validate_request
            request.remote_user = prior_remote
            raise ValidationFailure('body', 'TrackingItem: create_and_commit',
                                    'Cannot validate request')
        ti_res = sno_collection_add(collection, request, False)  # render=False
        transaction.get().commit()
        if clean_headers and 'Location' in request.response.headers:
            del request.response.headers['Location']
        request.remote_user = prior_remote
        return ti_res

    @calculated_property(schema={
        "title": "Title",
        "type": "string",
    })
    def display_title(self, tracking_type, date_created=None, google_analytics=None):
        if date_created:  # pragma: no cover should always be true
            date_created = date_created[:10]
        if tracking_type == 'google_analytics':
            for_date = None
            if google_analytics:
                for_date = google_analytics.get('for_date', None)
            if for_date:
                return 'Google Analytics for ' + for_date
            return 'Google Analytics Item'
        elif tracking_type == 'download_tracking':
            title = 'Download Tracking Item'
            if date_created:
                title = title + ' from ' + date_created
            return title
        else:
            title = 'Tracking Item'
            if date_created:
                title = title + ' from ' + date_created
            return title


@collection(
    name='vendors',
    unique_key='vendor:name',
    properties={
        'title': 'Vendors',
        'description': 'Listing of sources and vendors for 4DN material',
    })
class Vendor(Item):
    """The Vendor class that contains the company/lab sources for reagents/cells... used."""

    item_type = 'vendor'
    schema = load_schema('encoded:schemas/vendor.json')
    name_key = 'name'
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['name'] = set_namekey_from_title(properties)

        super(Vendor, self)._update(properties, sheets)
