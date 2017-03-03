"""init.py lists all the collections that do not have a dedicated types file."""

from snovault.attachment import ItemWithAttachment
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.traversal import find_root
from .base import (
    Item,
    add_default_embeds
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
    name_key = 'name'
    schema = load_schema('encoded:schemas/analysis_step.json')
    embedded = ['software_used', 'qa_stats_generated']
    embedded = add_default_embeds(embedded, schema)


@collection(
    name='awards',
    unique_key='award:name',
    properties={
        'title': 'Awards (Grants)',
        'description': 'Listing of awards (aka grants)',
    })
class Award(Item):
    """Award class."""

    item_type = 'award'
    schema = load_schema('encoded:schemas/award.json')
    name_key = 'name'
    embedded = ['pi']
    embedded = add_default_embeds(embedded, schema)


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
    embedded = []
    embedded = add_default_embeds(embedded, schema)


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
    embedded = ['lab', 'award', 'submitted_by']
    embedded = add_default_embeds(embedded, schema)

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
    embedded = ['enzyme_source']
    embedded = add_default_embeds(embedded, schema)


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
    embedded = []
    embedded = add_default_embeds(embedded, schema)


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
    embedded = []
    embedded = add_default_embeds(embedded, schema)


@collection(
    name='protocols',
    properties={
        'title': 'Protocols',
        'description': 'Listing of protocols',
    })
class Protocol(Item):
    """Protocol class."""

    item_type = 'protocol'
    schema = load_schema('encoded:schemas/protocol.json')
    embedded = []
    embedded = add_default_embeds(embedded, schema)
