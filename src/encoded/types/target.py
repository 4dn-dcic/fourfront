"""Targets types file."""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item,
    lab_award_attribution_embed_list
)


@collection(
    name='targets',
    properties={
        'title': 'Targets',
        'description': 'Listing of genes and regions targeted for some purpose',
    })
class Target(Item):
    """The Target class that describes a target of something."""

    item_type = 'target'
    schema = load_schema('encoded:schemas/target.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list
