from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
from pyramid.security import Authenticated
from .base import (
    Item,
    paths_filtered_by_status,
)


@abstract_collection(
    name='experimends',
    unique_key='accession',
    properties={
        'title': "Experiments",
        'description': 'Listing of all types of experiments.',
    })
class Experimend(Item):
    base_types = ['Experimend'] + Item.base_types
    embedded = [
     "protocol",
     "protocol_variation"
    ]
    name_key = 'accession'


@collection(
    name='experiments_hic',
    unique_key='accession',
    properties={
        'title': 'Experiments Hi-C',
        'description': 'Listing Hi-C Experiments',
    })
class ExperimentHiC(Experimend):
    item_type = 'experiment_hic'
    schema = load_schema('encoded:schemas/experiment_hic.json')
