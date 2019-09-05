"""The type file for the collection Individual (Encode Donor)."""
from snovault import (
    abstract_collection,
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD,
    lab_award_attribution_embed_list
)


@abstract_collection(
    name='individuals',
    unique_key='accession',
    acl=ALLOW_SUBMITTER_ADD,
    properties={
        'title': "Individuals",
        'description': 'Listing of all types of individuals.',
    })
class Individual(Item):
    """the base class for individual collection."""
    item_type = 'individual'
    base_types = ['Individual'] + Item.base_types
    schema = load_schema('encoded:schemas/individual.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + ['organism.name']
    name_key = 'accession'


@collection(
    name='individuals-human',
    unique_key='accession',
    properties={
        'title': 'Individuals-Humans',
        'description': 'Listing Biosample Human Individuals',
    })
class IndividualHuman(Individual):
    """the sub class of individuals for human species."""

    item_type = 'individual_human'
    schema = load_schema('encoded:schemas/individual_human.json')
    embedded_list = Individual.embedded_list


@collection(
    name='individuals-primate',
    unique_key='accession',
    properties={
        'title': 'Individuals-Primates',
        'description': 'Listing Biosample Primate Individuals',
    })
class IndividualPrimate(Individual):
    """the sub class of individuals for primate species."""

    item_type = 'individual_primate'
    schema = load_schema('encoded:schemas/individual_primate.json')
    embedded_list = Individual.embedded_list


@collection(
    name='individuals-mouse',
    unique_key='accession',
    properties={
        'title': 'Individuals-Mice',
        'description': 'Listing Biosample Mouse Individuals',
    })
class IndividualMouse(Individual):
    """the sub class of individuals for mouse species."""

    item_type = 'individual_mouse'
    schema = load_schema('encoded:schemas/individual_mouse.json')
    embedded_list = Individual.embedded_list + ['mouse_vendor.name']


@collection(
    name='individuals-fly',
    unique_key='accession',
    properties={
        'title': 'Individuals-Flies',
        'description': 'Listing Biosample Fly Individuals',
    })
class IndividualFly(Individual):
    """the sub class of individuals for flies."""

    item_type = 'individual_fly'
    schema = load_schema('encoded:schemas/individual_fly.json')
    embedded_list = Individual.embedded_list + ['fly_vendor.name']


@collection(
    name='individuals-chicken',
    unique_key='accession',
    properties={
        'title': 'Individuals-Chickens',
        'description': 'Listing Biosample Chicken Individuals',
    })
class IndividualChicken(Individual):
    """the sub class of individuals for chickens."""

    item_type = 'individual_chicken'
    schema = load_schema('encoded:schemas/individual_chicken.json')
    embedded_list = Individual.embedded_list + ['chicken_vendor.name']


@collection(
    name='individuals-zebrafish',
    unique_key='accession',
    properties={
        'title': 'Individuals-Zebrafish',
        'description': 'Listing Zebrafish Sources',
    })
class IndividualZebrafish(Individual):
    """the sub class of individuals for zebrafish."""

    item_type = 'individual_zebrafish'
    schema = load_schema('encoded:schemas/individual_zebrafish.json')
    embedded_list = Individual.embedded_list + ['zebrafish_vendor.name']
