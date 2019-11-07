"""The type file for image collection."""

from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list
)
from snovault.attachment import ItemWithAttachment


@collection(
    name='images',
    unique_key='image:filename',
    properties={
        'title': 'Image',
        'description': 'Listing of portal images',
    })
class Image(ItemWithAttachment, Item):
    """Class image,defines accepted file types."""

    item_type = 'image'
    schema = load_schema('encoded:schemas/image.json')
    schema['properties']['attachment']['properties']['type']['enum'] = [
        'image/png',
        'image/jpeg',
        'image/gif',
    ]
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        'microscopy_file.accession',
        'microscopy_file.omerolink'
    ]

    def unique_keys(self, properties):
        """smth."""
        keys = super(Image, self).unique_keys(properties)
        value = properties['attachment']['download']
        keys.setdefault('image:filename', []).append(value)
        return keys
