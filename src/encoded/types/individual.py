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
    ALLOW_SUBMITTER_ADD
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

    base_types = ['Individual'] + Item.base_types
    schema = load_schema('encoded:schemas/individual.json')
    embedded_list = ['organism.name']
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
