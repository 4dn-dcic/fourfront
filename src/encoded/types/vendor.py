"""The type file for the collection Vendor (Encode Source).
    moving this out of __init.py__ and into it's own file as
    add logic for autopopulating 'name' upon update or create"""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
)

@collection(
    name='vendors',
    unique_key='vendor:name',
    properties={
        'title': 'Vendors',
        'description': 'Listing of sources and vendors for 4DN material',
    })
class Vendor(Item):
    item_type = 'vendor'
    schema = load_schema('encoded:schemas/vendor.json')
    name_key = 'name'

    def _update(self, properties, sheets=None):
        # set name based on what is entered into title
        properties['name'] = properties['title'].replace(' ','-').lower()

        super(Vendor, self)._update(properties, sheets)
