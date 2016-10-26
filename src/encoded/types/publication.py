"""Create publication class and contain methods for data fetching."""
import requests
import json
from snovault import (collection, load_schema)
from .base import Item


def fetch_pubmed(PMID):
    "Takes the number part of PMID and returns title, abstract and authors"
    title = ''
    abstract = ''
    author_list = []
    authors = ''
    NIHe = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    NIHw = "https://www.ncbi.nlm.nih.gov/pubmed/"
    url = NIHw + PMID
    www = "{NIH}efetch.fcgi?db=pubmed&id={id}&rettype=medline".format(NIH=NIHe, id=PMID)
    r = requests.get(www).text
    full_text = r.replace('\n      ', ' ')
    data_list = [a.split('-', 1) for a in full_text.split('\n') if a != '']
    for key_pb, data_pb in data_list:
        key_pb = key_pb.strip()
        # grab title
        if key_pb == 'TI':
            title = data_pb.strip()
        # grab the abstract
        if key_pb == 'AB':
            abstract = data_pb.strip()
        # accumulate authors
        if key_pb == 'AU':
            author_list.append(data_pb.strip())
        # add consortiums to author list
        if key_pb == 'CN':
            author_list.append(data_pb.strip())
        authors = ', '.join(author_list)
    return title, abstract, authors, url


def fetch_biorxiv(url):
    title = ''
    abstract = ''
    authors = ''
    return title, abstract, authors, url


def map_doi_pmid(doi):
    "if a doi is given, checks if it maps to pmid"
    NIHid = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/"
    www = "{NIH}?ids={id}&versions=no&format=json".format(NIH=NIHid, id=doi)
    r = requests.get(www).text
    res = json.loads(r)
    try:
        return res['records'][0]['pmid']
    except:
        return


def map_doi_biox(doi):
    "If a doi is not mapped to pubmed, check where it goes"
    DOIad = "https://doi.org/"
    www = "{DOIad}{doi}".format(DOIad=DOIad, doi=doi)
    landing_page = requests.get(www).url
    if "biorxiv" in landing_page.lower():
        return landing_page
    else:
        return


@collection(
    name='publications',
    unique_key='publication:ID',
    properties={
        'title': 'Publications',
        'description': 'Publication pages',
    })
class Publication(Item):
    """Publication class."""
    item_type = 'publication'
    schema = load_schema('encoded:schemas/publication.json')

    def _update(self, properties, sheets=None):
        title = ''
        abstract = ''
        authors = ''
        url = ''
        p_id = properties['ID']
        # parse if id is from pubmed
        if p_id.startswith('PMID'):
            pubmed_id = p_id[5:]
            title, abstract, authors, url = fetch_pubmed(pubmed_id)
        # if id is doi, first check if it maps to pubmed id, else see where it goes
        elif p_id.startswith('doi'):
            doi_id = p_id[4:]
            if map_doi_pmid(doi_id):
                pubmed_id = map_doi_pmid(doi_id)
                title, abstract, authors, url = fetch_pubmed(pubmed_id)
            # if it goes to biorxiv fetch from biorxiv
            elif map_doi_biox(doi_id):
                biox_url = map_doi_biox(doi_id)
                title, abstract, authors, url = fetch_biorxiv(biox_url)
            else:
                pass
        properties['title'] = title
        properties['abstract'] = abstract
        properties['authors'] = authors
        properties['url'] = url
        super(Publication, self)._update(properties, sheets)
