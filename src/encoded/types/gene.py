"""Collection for Entrez gene records
    given an entrez gene id
    most data fetched from ncbi entrez gene"""
import requests
import json
from snovault import (
    collection,
    load_schema,
    calculated_property
)
from .base import (
    Item,
    lab_award_attribution_embed_list
)
from html.parser import HTMLParser


################################################
# Outside methods for online data fetch
################################################


@collection(
    name='genes',
    unique_key='gene:geneid',
    lookup_key='preferred_symbol'
    properties={
        'title': 'Genes',
        'description': 'Entrez gene items',
    })
class Gene(Item):
    """Gene class."""
    item_type = 'gene'
    name_key = 'geneid'
    schema = load_schema('encoded:schemas/gene.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + []

    def _update(self, properties, sheets=None):
        if properties.get('preferred_symbol', None) is None:
            symbol = properties.get('official_symbol')
            if symbol:
                properties['preferred_symbol'] = termname

        super(Gene, self)._update(properties, sheets)
        return

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request):
        return Item.display_title(self)
