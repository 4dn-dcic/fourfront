"""Collection for Entrez gene records
    given an entrez gene id
    most data fetched from ncbi entrez gene"""
import requests
import json
import os
import time
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

def get_gene_info_from_response_text(response):
    ''' use NCBI url rather than eutils so we can get tabular report
        get the stuff between the pre tag
    '''
    if '<pre>' not in response or '</pre>' not in response:
        # misformatted or empty response
        return {}
    if 'Error occurred' in response:
        # id not found or other bad response
        return{}
    _, info, _ = response.split('pre>')
    info = info.replace('</', '')
    lines = info.split('\n')
    if len(lines) != 2:
        # pre section should only contain 2 lines - header and values
        return {}
    fields = lines[0].split('\t')
    values = lines[1].split('\t')
    return dict(zip(fields, values))


def fetch_gene_info_from_ncbi(geneid):
    url = "https://www.ncbi.nlm.nih.gov/gene/{id}".format(id=geneid)
    NCBI = url + "?report=tabular&format=text"
    for count in range(5):
        resp = requests.get(NCBI)
        if resp.status_code == 200:
            break
        if resp.status_code == 429:
            time.sleep(3)
            continue
        if count == 4:
            return {}
    text = resp.text
    gene_info = get_gene_info_from_response_text(text)
    syns = gene_info.get('Aliases')
    if syns:
        gene_info['Aliases'] = [s.strip() for s in syns.split(',')]
    if gene_info:
        gene_info['url'] = url
    return gene_info


def map_ncbi2schema(geneinfo):
    ''' Mapping of NCBI field names to corresponding 4dn schema properties
    '''
    field_map = {'tax_id': 'organism', 'Status': 'ncbi_entrez_status', 'Symbol': 'official_symbol',
                 'Aliases': 'synonyms', 'description': 'fullname', 'url': 'url'}
    return {field_map[k]: v for k, v in geneinfo.items() if k in field_map}


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
    import pdb; pdb.set_trace()
    item_type = 'gene'
    name_key = 'geneid'
    schema = load_schema('encoded:schemas/gene.json')
    embedded_list = Item.embedded_list  # + lab_award_attribution_embed_list + []

    def _update(self, properties, sheets=None):
        # fetch info from ncbi gene based on id provided
        geneid = properties.get('geneid')
        geneinfo = {}
        try:
            gene_info = fetch_gene_info_from_ncbi(geneid)
        except Exception as e:
            pass
        if gene_info:
            properties.update(map_ncbi2schema(gene_info))

        if properties.get('preferred_symbol', None) is None:
            symbol = properties.get('official_symbol')
            if symbol:
                properties['preferred_symbol'] = symbol

        super(Gene, self)._update(properties, sheets)
        return

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, request):
        return self.properties.get('preferred_symbol')
