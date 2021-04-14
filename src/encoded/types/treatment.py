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
    ALLOW_SUBMITTER_ADD,
    lab_award_attribution_embed_list,
    get_item_or_none
)


@abstract_collection(
    name='treatments',
    acl=ALLOW_SUBMITTER_ADD,
    properties={
        'title': "Treatments",
        'description': 'Listing of all types of treatments.',
    })
class Treatment(Item):
    """Treatment class."""
    item_type = 'treatment'
    base_types = ['Treatment'] + Item.base_types
    schema = load_schema('encoded:schemas/treatment.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list


def _build_treatments_agent_embedded_list():
    """ Helper function intended to be used to create the embedded list for treatments_agent.
        All types should implement a function like this going forward.
    """
    return Treatment.embedded_list + [
        # Construct linkTo
        'constructs.name'
    ]


@collection(
    name='treatments-agent',
    properties={
        'title': 'Treatments-Agentbased',
        'description': 'Listing Physical or Chemical Treatments',
    })
class TreatmentAgent(Treatment):
    """Subclass of treatment for physical/chemical treatments."""

    item_type = 'treatment_agent'
    schema = load_schema('encoded:schemas/treatment_agent.json')
    embedded_list = _build_treatments_agent_embedded_list()

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, treatment_type=None, chemical=None,
                      biological_agent=None, constructs=None, duration=None,
                      duration_units=None, concentration=None,
                      concentration_units=None, temperature=None):
        conditions = ""
        if concentration and concentration_units:
            conditions += str(concentration) + " " + concentration_units
        if duration and duration_units:
            if conditions:
                conditions += ", "
            conditions += str(duration) + duration_units[0]
        if temperature:
            if conditions:
                conditions += " "
            conditions += "at " + str(temperature) + "°C"
        if conditions:
            conditions = " (" + conditions + ")"

        if chemical:
            action = "treatment" if concentration != 0 else "washout"
            disp_title = chemical + " " + action + conditions
        elif treatment_type == "Transient Transfection" and constructs:
            plasmids = ", ".join(
                [get_item_or_none(request, construct).get('name') for construct in constructs]
            )
            disp_title = "Transient transfection of " + plasmids + conditions
        elif treatment_type == "Biological" and biological_agent:
            disp_title = biological_agent + " treatment" + conditions
        elif treatment_type == "Other":
            disp_title = "Other treatment" + conditions
        else:
            disp_title = treatment_type + conditions
        return disp_title


def _build_treatments_rnai_embedded_list():
    """ Helper function intended to be used to create the embedded list for treatments_rnai.
        All types should implement a function like this going forward.
    """
    return Treatment.embedded_list + [
        # Vendor linkTo
        'rnai_vendor.name',
        'rnai_vendor.title',

        # Construct linkTo
        'constructs.designed_to_target',
        'constructs.name',
    ]


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
    embedded_list = _build_treatments_rnai_embedded_list()

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request, rnai_type=None, target=None):
        if rnai_type and target:
            tstring = ''
            for t in target:
                target = request.embed(t, '@@object')
                tstring += '{}, '.format(target['display_title'])
            rnai_value = rnai_type + " of " + tstring[:-2]
        else:
            rnai_value = rnai_type + " treatment"
        return rnai_value
