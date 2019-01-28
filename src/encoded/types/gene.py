"""Collection for Entrez gene records
    given an entrez gene id
    most data fetched from ncbi entrez gene"""
import requests
import json
import os
from pyramid.path import DottedNameResolver
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
def get_gene_info_from_4dn_gene_info_file(geneid):


def get_gene_info_from_response_text(response):
    # just get the stuff between the pre tag
    _, info, _ = response.split('pre>')
    info = info.replace('</', '')
    lines = info.split('\n')
    if len(lines) != 2:
        return {}
    fields = lines[0].split('\t')
    values = lines[1].split('\t')
    return dict(zip(fields, values))


def fetch_gene_info_from_ncbi(geneid):
    NCBI = "https://www.ncbi.nlm.nih.gov/gene/{id}?report=tabular&format=text".format(id=geneid)
    for count in range(5):
        resp = requests.get(NCBI)
        if resp.status_code == 200:
            break
        if resp.status_code == 429:
            time.sleep(5)
            continue
        if count == 4:
            return {}
    text = resp.text
    if '<pre>' not in text:
        return {}
    return get_gene_dict_from_response_text(text)


@collection(
    name='genes',
    unique_key='gene:geneid',
    lookup_key='preferred_symbol',
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

        # fetch info from ncbi gene based on id provided
        geneid = properties.get('geneid')
        try:
            gene_info = fetch_gene_info_from_ncbi(geneid)
        except Exception as e:
            pass
        super(Gene, self)._update(properties, sheets)
        return

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request):
        return Item.display_title(self)
