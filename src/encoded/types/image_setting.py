"""The type file for the collection Image Settings."""
from snovault import (
    # calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD,
    lab_award_attribution_embed_list
)


def _build_lab_embedded_list():
    """ Helper function intended to be used to create the embedded list for image-settings.
        All types should implement a function like this going forward.
    """
    return Item.embedded_list + lab_award_attribution_embed_list


@collection(
    name='image-settings',
    acl=ALLOW_SUBMITTER_ADD,
    properties={
        'title': 'Image Settings',
        'description': 'Listing of ImageSetting Items.',
    })
class ImageSetting(Item):
    """Image Settings class."""

    item_type = 'image_setting'
    schema = load_schema('encoded:schemas/image_setting.json')
    embedded_list = _build_lab_embedded_list()
