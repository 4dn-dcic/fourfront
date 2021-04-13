from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list
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
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list
