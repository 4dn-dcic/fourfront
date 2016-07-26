"""init.py lists all the collections that do not have a dedicated types file."""

from snovault.attachment import ItemWithAttachment
from snovault import (
    calculated_property,
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
    name='labs',
    unique_key='lab:name',
    properties={
        'title': 'Labs',
        'description': 'Listing of 4D Nucleome labs',
    })
class Lab(Item):
    """Lab class."""

    item_type = 'lab'
    schema = load_schema('encoded:schemas/lab.json')
    name_key = 'name'
    embedded = ['awards']


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


@collection(
    name='publications',
    unique_key='publication:identifier',
    properties={
        'title': 'Publications',
        'description': 'Publication pages',
    })
class Publication(Item):
    """Publication class."""

    item_type = 'publication'
    schema = load_schema('encoded:schemas/publication.json')
    # embedded = ['datasets']

    def unique_keys(self, properties):
        """unique keys."""
        keys = super(Publication, self).unique_keys(properties)
        if properties.get('identifiers'):
            keys.setdefault('alias', []).extend(properties['identifiers'])
        return keys

    @calculated_property(condition='date_published', schema={
        "title": "Publication year",
        "type": "string",
    })
    def publication_year(self, date_published):
        """publication year."""
        return date_published.partition(' ')[0]


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


@collection(
    name='biosources',
    properties={
        'title': 'Biosources',
        'description': 'Cell lines and tissues used for biosamples',
    })
class Biosource(Item):
    """Biosource class."""

    item_type = 'biosource'
    schema = load_schema('encoded:schemas/biosource.json')


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


@collection(
    name='modifications',
    properties={
        'title': 'Modifications',
        'description': 'Listing of Stable Genomic Modifications',
    })
class Modification(Item):
    """Modification class."""

    item_type = 'modification'
    schema = load_schema('encoded:schemas/modification.json')
    embedded = ['constructs']


@collection(
    name='quality_metric_flags',
    properties={
        'title': 'Quality Metric Flags'
    })
class QualityMetricFlag(Item):
    """Quality Metrics Flag class."""

    item_type = 'quality_metric_flag'
    schema = load_schema('encoded:schemas/quality_metric_flag.json')
    embedded = ['quality_metrics']


@collection(
    name='softwares',
    unique_key='software:name',
    properties={
        'title': 'Softwares',
        'description': 'Listing of software for 4DN analyses',
    })
class Software(Item):
    """The Software class that contains the software... used."""

    item_type = 'software'
    schema = load_schema('encoded:schemas/software.json')
    name_key = 'name'

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['name'] = properties['title'].replace(' ', '-').lower()

        super(Software, self)._update(properties, sheets)
