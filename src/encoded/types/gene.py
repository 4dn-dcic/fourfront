"""Collection for Entrez gene records
    given an entrez gene id
    most data fetched from ncbi entrez gene"""
import requests
import time
from snovault import (
    collection,
    load_schema,
    calculated_property
)
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_patch,
    validate_item_content_put,
)
from pyramid.view import view_config
from .base import (
    Item,
    collection_add,
    item_edit,
    lab_award_attribution_embed_list
)


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
        if resp.status_code == 429:  # pragma: no cover
            time.sleep(3)
            continue
        if count == 4:  # pragma: no cover
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
    return {field_map[k]: v for k, v in geneinfo.items() if k in field_map and v}


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
    embedded_list = lab_award_attribution_embed_list + ["organism.scientific_name"]

    def _update(self, properties, sheets=None):
        # fetch info from ncbi gene based on id provided
        geneid = properties.get('geneid')
        gene_info = {}
        try:
            gene_info = fetch_gene_info_from_ncbi(geneid)
        except Exception:
            pass
        if gene_info:
            gene_info = map_ncbi2schema(gene_info)
            if 'organism' in gene_info:
                try:
                    # make sure the organism is in the db
                    gene_info['organism'] = str(self.registry['collections']['Organism'].get(gene_info['organism']).uuid)
                except Exception:
                    # otherwise remove the organism
                    del gene_info['organism']
            properties.update(gene_info)

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
    def display_title(self, request, geneid, preferred_symbol=None):
        if preferred_symbol:
            return preferred_symbol
        return 'GENE ID:{}'.format(geneid)

    class Collection(Item.Collection):
        pass
