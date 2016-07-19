"""The type file for the collection Treatment."""
from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
from pyramid.security import Authenticated
from .base import (
    Item,
    paths_filtered_by_status
)


@abstract_collection(
    name='treatments',
    properties={
        'title': "Treatments",
        'description': 'Listing of all types of treatments.',
    })
class Treatment(Item):
    base_types = ['Treatment'] + Item.base_types

@collection(
    name='treatments-chemical',
    properties={
        'title': 'Treatments-Chemicals',
        'description': 'Listing Chemical or Drug Treatments',
    })
class TreatmentChemical(Treatment):
    item_type = 'treatment_chemical'
    schema = load_schema('encoded:schemas/treatment_chemical.json')
    embedded = Treatment.embedded

@collection(
    name='treatments-rnai',
    properties={
        'title': 'Treatments-RNAi',
        'description': 'Listing RNAi Treatments',
    })
class TreatmentRnai(Treatment):
    item_type = 'treatment_rnai'
    schema = load_schema('encoded:schemas/treatment_rnai.json')
    embedded = ['rnai_vendor', 'rnai_constructs']
