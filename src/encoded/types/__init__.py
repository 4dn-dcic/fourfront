"""init.py lists all the collections that do not have a dedicated types file."""

from snovault.attachment import ItemWithAttachment
from snovault.crud_views import collection_add as sno_collection_add
from snovault import (
    # calculated_property,
    collection,
    load_schema,
    CONNECTION
)
# from pyramid.traversal import find_root
from .base import (
    Item,
    set_namekey_from_title
    # paths_filtered_by_status,
)


def includeme(config):
    """include me method."""
    config.scan()


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
    embedded_list = ['software_used.*', 'qa_stats_generated.*']


@collection(
    name='badges',
    unique_key='badge:badge_name',
    properties={
        'title': 'Badges',
        'description': 'Listing of badges for 4DN items',
    })
class Badge(Item):
    """The Badge class that descrbes a badge that can be associated with an item."""

    item_type = 'badge'
    schema = load_schema('encoded:schemas/badge.json')
    name_key = 'badge_name'

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['badge_name'] = set_namekey_from_title(properties)

        super(Badge, self)._update(properties, sheets)


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
    embedded_list = []


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
    embedded_list = []

    def display_title(self):
        if self.properties.get('attachment'):
            attach = self.properties['attachment']
            if attach.get('download'):
                return attach['download']


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
    embedded_list = ['enzyme_source.title']


@collection(
    name='experiment-types',
    unique_key='experiment_type:experiment_name',
    properties={
        'title': 'Experiment Types',
        'description': 'Listing of experiment types for 4DN items',
    })
class ExperimentType(Item):
    """The ExperimentType class that descrbes an experiment type that can be associated with an experiment."""

    item_type = 'experiment_type'
    schema = load_schema('encoded:schemas/experiment_type.json')
    name_key = 'experiment_name'

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['experiment_name'] = set_namekey_from_title(properties)

        if properties.get('processed_files') or properties.get('static_header'):
            headers = [properties.get('static_header'), properties.get('processed_files')]
            properties['static_headers'] = [header for header in headers if header]

        super(ExperimentType, self)._update(properties, sheets)


@collection(
    name='file-formats',
    unique_key='file_format:file_format',
    properties={
        'title': 'File Formats',
        'description': 'Listing of file formats used by 4DN'
    }
)
class FileFormat(Item, ItemWithAttachment):
    """The class to store information about 4DN file formats"""
    item_type = 'file_format'
    schema = load_schema('encoded:schemas/file_format.json')
    embedded_list = []
    name_key = 'file_format'

    def display_title(self):
        return self.properties.get('file_format')


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
    embedded_list = []


@collection(
    name='organisms',
    unique_key='organism:name',
    properties={
        'title': 'Organisms',
        'description': 'Listing of all registered organisms',
    })
class Organism(Item):
    """Organism class."""

    item_type = 'organism'
    schema = load_schema('encoded:schemas/organism.json')
    name_key = 'name'
    embedded_list = []

    def display_title(self):
        if self.properties.get('scientific_name'):  # Defaults to "" so check if falsy not if is None
            scientific_name_parts = self.properties['scientific_name'].split(' ')
            if len(scientific_name_parts) > 1:
                return ' '.join([scientific_name_parts[0][0].upper() + '.'] + scientific_name_parts[1:])
            else:
                return self.properties['scientific_name']


@collection(
    name='protocols',
    properties={
        'title': 'Protocols',
        'description': 'Listing of protocols',
    })
class Protocol(Item, ItemWithAttachment):
    """Protocol class."""

    item_type = 'protocol'
    schema = load_schema('encoded:schemas/protocol.json')
    embedded_list = ["award.project", "lab.title"]

    def display_title(self):
        if self.properties.get('attachment'):
            attach = self.properties['attachment']
            if attach.get('download'):  # this must be or attachment shouldn't be valid
                return attach['download']
        else:
            ptype = self.properties.get('protocol_type')
            if ptype == 'Other':
                ptype = 'Protocol'
            return ptype + " from " + self.properties.get("date_created", None)[:10]


@collection(
    name='sysinfos',
    unique_key='sysinfo:name',
    properties={
        'title': 'Sysinfo',
        'description': 'Just for internal use',
    })
class Sysinfo(Item):
    """sysinfo class."""

    item_type = 'sysinfo'
    schema = load_schema('encoded:schemas/sysinfo.json')
    name_key = 'name'
    embedded_list = []


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

    @classmethod
    def create_and_commit(cls, request, properties, render=False):
        """
        Create a TrackingItem with a given request and properties, committing
        it directly to the DB. This works by manually committing the
        transaction, which may cause issues if this function is called as
        part of another POST. For this reason, this function should be used to
        track GET requests -- otherwise, use the standard POST method.
        Skips validators.
        Setting render to True/None may cause permission issues
        """
        import transaction
        import uuid
        tracking_uuid = str(uuid.uuid4())
        model = request.registry[CONNECTION].create(cls.__name__, tracking_uuid)
        properties['uuid'] = tracking_uuid
        # no validators run, so status must be set manually if we want it
        if 'status' not in properties:
            properties['status'] = 'in review by lab'
        request.validated = properties
        res = sno_collection_add(TrackingItem(request.registry, model), request, render)
        transaction.get().commit()
        del request.response.headers['Location']
        return res


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
    embedded_list = ['award.project']

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['name'] = set_namekey_from_title(properties)

        super(Vendor, self)._update(properties, sheets)
