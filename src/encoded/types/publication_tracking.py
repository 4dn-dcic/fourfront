from snovault.attachment import ItemWithAttachment
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
# from pyramid.traversal import find_root
from .base import (
    Item
    # paths_filtered_by_status,
)


@collection(
    name='publication-trackings',
    unique_key='publication:PMID',
    properties={
        'title': 'Publication Tracking',
        'description': 'Abstract title collection for future 4DN publications',
    })
class PublicationTracking(Item):
    """Publication Tracking class."""

    item_type = 'publication_tracking'
    schema = load_schema('encoded:schemas/publication_tracking.json')
    embedded_list = []
