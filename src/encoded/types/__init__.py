"""init.py lists all the collections that do not have a dedicated types file."""

from snovault.attachment import ItemWithAttachment

from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)

from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.traversal import find_root
from .base import (
    Item
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
    embedded_list = ['pi.*']

    # define some customs acls; awards can only be created/edited by admin
    ONLY_ADMIN_VIEW = [
        (Allow, 'group.admin', ['view', 'edit']),
        (Allow, 'group.read-only-admin', ['view']),
        (Allow, 'remoteuser.INDEXER', ['view']),
        (Allow, 'remoteuser.EMBED', ['view']),
        (Deny, Everyone, ['view', 'edit'])
    ]

    SUBMITTER_CREATE = []

    ALLOW_EVERYONE_VIEW = [
        (Allow, Everyone, 'view'),
    ]

    ALLOW_EVERYONE_VIEW_AND_ADMIN_EDIT = [
        (Allow, Everyone, 'view'),
    ] + ONLY_ADMIN_VIEW

    STATUS_ACL = {
        'current': ALLOW_EVERYONE_VIEW_AND_ADMIN_EDIT,
        'deleted': ONLY_ADMIN_VIEW,
        'revoked': ALLOW_EVERYONE_VIEW,
        'replaced': ALLOW_EVERYONE_VIEW,
        'inactive': ALLOW_EVERYONE_VIEW
    }


@collection(
    name='antibodys',
    unique_key='antibody:antibody_name',
    properties={
        'title': 'Antibodies',
        'description': 'Listing of antibodies',
    })
class Antibody(Item):
    """Antibody class."""

    item_type = 'antibody'
    schema = load_schema('encoded:schemas/antibody.json')
    name_key = 'antibody_name'

    def display_title(self):
        dt = ''
        if self.properties.get('antibody_name'):
            dt = self.properties.get('antibody_name')
        if self.properties.get('antibody_product_no'):
            prod = self.properties.get('antibody_product_no')
            dt = dt + ' (' + prod + ')'
        return dt


@collection(
    name='badges',
    unique_key='badge:badgename',
    properties={
        'title': 'Badges',
        'description': 'Listing of badges for 4DN items',
    })
class Badge(Item):
    """The Badge class that descrbes a badge that can be associated with an item."""

    item_type = 'badge'
    schema = load_schema('encoded:schemas/badge.json')


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
