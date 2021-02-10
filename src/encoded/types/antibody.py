"""The type file for the collection Antibody.

   logic for autopopulating 'antibody_id' unique key upon update or create
"""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list
)
from .dependencies import DependencyEmbedder
import string
import re


def _build_antibody_embedded_list():
    """ Helper function intended to be used to create the embedded list for ontology_term.
        All types should implement a function like this going forward.
    """
    antibody_target_embeds = DependencyEmbedder.embed_defaults_for_type(base_path='antibody_target', t='bio_feature')
    return Item.embedded_list + lab_award_attribution_embed_list + antibody_target_embeds + [
        # Vendor linkTo
        'antibody_vendor.title'
    ]


@collection(
    name='antibodys',
    unique_key='antibody:antibody_id',
    properties={
        'title': 'Antibodies',
        'description': 'Listing of antibodies',
    })
class Antibody(Item):
    """Antibody class."""

    item_type = 'antibody'
    schema = load_schema('encoded:schemas/antibody.json')
    name_key = 'antibody_id'
    embedded_list = _build_antibody_embedded_list()

    def _update(self, properties, sheets=None):
        # set antibody_id based on values of antibody_name and product_no
        exclude = re.escape(string.punctuation)
        regex = r"[" + exclude + r"\s]+"
        abid = properties['antibody_name'] + '-' + properties['antibody_product_no']
        abid = re.sub(regex, "-", abid)
        properties['antibody_id'] = abid
        super(Antibody, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, antibody_name, antibody_product_no=None):
        if antibody_product_no:
            antibody_name += ' ({})'.format(antibody_product_no)
        return antibody_name
