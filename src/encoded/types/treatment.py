"""The type file for the collection Treatment."""
from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item,
    secure_embed
    # paths_filtered_by_status,
)


@abstract_collection(
    name='treatments',
    properties={
        'title': "Treatments",
        'description': 'Listing of all types of treatments.',
    })
class Treatment(Item):
    """Treatment class."""

    base_types = ['Treatment'] + Item.base_types
    schema = load_schema('encoded:schemas/treatment.json')
    embedded = []

    @calculated_property(schema={
        "title": "Treatment_type",
        "type": "string",
    })
    def treatment_type(self, request, rnai_type=None, target=None, chemical=None):
        if rnai_type and target:
            targetObj = secure_embed(request, target)
            rnai_value = rnai_type + " for " + targetObj['target_summary']
        else:
            rnai_value = rnai_type
        return rnai_value or chemical or "None"


@collection(
    name='treatments-chemical',
    properties={
        'title': 'Treatments-Chemicals',
        'description': 'Listing Chemical or Drug Treatments',
    })
class TreatmentChemical(Treatment):
    """Subclass of treatment for chemical treatments."""

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
    """Subclass of treatment for RNAi treatments."""

    item_type = 'treatment_rnai'
    schema = load_schema('encoded:schemas/treatment_rnai.json')
    embedded = ['rnai_vendor.*', 'rnai_constructs.*', 'target.*']
