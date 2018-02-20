"""The type file for the collection Antibody.

   logic for autopopulating 'antibody_id' unique key upon update or create
"""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)
import string
import re


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

    def _update(self, properties, sheets=None):
        # set antibody_id based on values of antibody_name and product_no
        exclude = re.escape(string.punctuation)
        regex = r"[" + exclude + r"\s]+"
        abid = properties['antibody_name']
        if properties.get('antibody_product_no'):
            abid = abid + ' ' + properties['antibody_product_no']
        abid = re.sub(regex, "-", abid)
        #abid = re.sub('-', ' ', abid)
        #abid = ''.join(ch for ch in abid if ch not in exclude)
        #abid = re.sub(r"\s+", '-', abid)
        properties['antibody_id'] = abid
        super(Antibody, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request):
        dt = self.properties.get('antibody_name')
        if self.properties.get('antibody_product_no'):
            dt = dt + ' (' + self.properties['antibody_product_no'] + ')'
        return dt
