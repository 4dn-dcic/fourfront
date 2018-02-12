"""The type file for the collection Antibody.

   logic for autopopulating 'antibody_id' unique key upon update or create
"""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


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
        abid = properties['antibody_name']
        if properties.get('antibody_product_no'):
            abid = abid + ' (' + properties['antibody_product_no'] + ')'
        properties['antibody_id'] = abid
        super(Antibody, self)._update(properties, sheets)

    def display_title(self):
        return self.properties.get('antibody_id')
