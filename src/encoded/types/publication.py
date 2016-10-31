"""Create publication class and contain methods for data fetching."""
import requests
import json
from snovault import (collection, load_schema)
from .base import Item
from html.parser import HTMLParser

################################################
# Outside methods for online data fetch
################################################


def fetch_pubmed(PMID):
    "Takes the number part of PMID and returns title, abstract and authors"
    title = ''
    abstract = ''
    author_list = []
    authors = ''
    date = ''
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
        # grab the date
        if key_pb == 'DP':
            date = data_pb.strip()
        # accumulate authors
        if key_pb == 'AU':
            author_list.append(data_pb.strip())
        # add consortiums to author list
        if key_pb == 'CN':
            author_list.append(data_pb.strip())
        authors = ', '.join(author_list)
    return title, abstract, authors, url, date


class BioRxivExtractor(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.title = ''
        self.abstract = ''
        self.author_list = []
        self.date = ''

    def handle_starttag(self, tag, attrs):
        attr = ''
        if tag == 'meta':
            attr = {k[0]: k[1] for k in attrs}
            if attr.get('name') == "DC.Title":
                self.title = attr.get('content')
            if attr.get('name') == "DC.Description":
                self.abstract = attr.get('content')
            if attr.get('name') == "DC.Contributor":
                self.author_list.append(attr.get('content'))
            if attr.get('name') == "DC.Date":
                self.date = attr.get('content')


def fetch_biorxiv(url):
    """Takes Url, uses the BioRxivExtractor class and returns title abstract authors url"""
    title = ''
    abstract = ''
    authors = ''
    date = ''
    r = requests.get(url)
    resp = r.text.encode('utf-8').decode('ascii', 'ignore')
    parser = BioRxivExtractor()
    parser.feed(resp)
    title = parser.title
    abstract = parser.abstract
    date = parser.date
    authors = ", ".join(parser.author_list)
    return title, abstract, authors, url, date


def map_doi_pmid(doi):
    """If a doi is given, checks if it maps to pmid"""
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

################################################
# Outside methods for online data fetch
################################################


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
        date = ''
        p_id = properties['ID']
        # parse if id is from pubmed
        try:
            if p_id.startswith('PMID'):
                pubmed_id = p_id[5:]
                title, abstract, authors, url, date = fetch_pubmed(pubmed_id)
            # if id is doi, first check if it maps to pubmed id, else see where it goes
            elif p_id.startswith('doi'):
                doi_id = p_id[4:]
                if map_doi_pmid(doi_id):
                    pubmed_id = map_doi_pmid(doi_id)
                    title, abstract, authors, url, date = fetch_pubmed(pubmed_id)
                # if it goes to biorxiv fetch from biorxiv
                elif map_doi_biox(doi_id):
                    biox_url = map_doi_biox(doi_id)
                    title, abstract, authors, url, date = fetch_biorxiv(biox_url)
                else:
                    pass
        except:
            pass
        properties['title'] = title
        properties['abstract'] = abstract
        properties['authors'] = authors
        properties['url'] = url
        properties['date_published'] = date
        super(Publication, self)._update(properties, sheets)
