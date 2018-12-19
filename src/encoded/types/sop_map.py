"""Collection for the SopMap object."""
from snovault import (
    collection,
    load_schema
)
from .base import (
    Item,
    lab_award_attribution_embed_list
)


@collection(
    name='sop-maps',
    unique_key='sop_map:mapid',
    properties={
        'title': 'SOP and field mappings',
        'description': 'Listing of SOPs with the default values for fields from them',
    })
class SopMap(Item):
    """The SopFields class that lists the default values of fields if the SOP is followed."""

    item_type = 'sop_map'
    schema = load_schema('encoded:schemas/sop_map.json')
    name_key = 'mapid'
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list

    def _update(self, properties, sheets=None):
        delim = '_'
        id_string = properties["associated_item_type"] + delim
        if "id_values" in properties.keys():
            for val in properties["id_values"]:
                val = ''.join(val.split())
                id_string = id_string + val + delim
        id_string += str(properties["sop_version"])
        properties['mapid'] = id_string
        super(SopMap, self)._update(properties, sheets)
