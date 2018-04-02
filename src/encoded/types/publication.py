"""Create publication class and contain methods for data fetching."""
import requests
import json
from snovault import (
    collection,
    load_schema,
    calculated_property
)
from snovault.attachment import ItemWithAttachment
from .base import (
    Item
)
from html.parser import HTMLParser
from encoded.types.experiment_set import invalidate_linked_items

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
    journal = ''
    NIHe = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    NIHw = "https://www.ncbi.nlm.nih.gov/pubmed/"
    url = NIHw + PMID
    www = "{NIH}efetch.fcgi?db=pubmed&id={id}&rettype=medline".format(NIH=NIHe, id=PMID)
    # try fetching data 5 times
    for count in range(5):
        resp = requests.get(www)
        if resp.status_code == 200:
            break
        if count == 4:
            return
    # parse the text to get the fields
    r = resp.text
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
        # grab the date added
        if key_pb == 'DEP':
            date_flat = data_pb.strip()
            date = date_flat[:4]+"-"+date_flat[4:6]+"-"+date_flat[6:8]
        # if date not set by DEP yet, assign from DA in case DEP does not exist
        if date == "":
            if key_pb == 'DA':
                date_flat = data_pb.strip()
                date = date_flat[:4]+"-"+date_flat[4:6]+"-"+date_flat[6:8]
        # get journal name
        if key_pb == 'JT':
            journal = data_pb.strip()
        # accumulate authors
        if key_pb == 'AU':
            author_list.append(data_pb.strip())
        # add consortiums to author list
        if key_pb == 'CN':
            author_list.append(data_pb.strip())
        authors = author_list
    return title, abstract, authors, url, date, journal


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
    journal = "bioRxiv"
    # try fetching data 5 times and return empty if fails
    for count in range(5):
        r = requests.get(url)
        if r.status_code == 200:
            break
        if count == 4:
            return
    resp = r.text.encode('utf-8').decode('ascii', 'ignore')
    parser = BioRxivExtractor()
    parser.feed(resp)
    title = parser.title
    abstract = parser.abstract
    date = parser.date
    authors = parser.author_list
    return title, abstract, authors, url, date, journal


def map_doi_pmid(doi):
    """If a doi is given, checks if it maps to pmid"""
    NIHid = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/"
    www = "{NIH}?ids={id}&versions=no&format=json".format(NIH=NIHid, id=doi)
    # try fetching data 5 times
    for count in range(5):
        resp = requests.get(www)
        if resp.status_code == 200:
            break
    # parse the text to get the fields
    r = resp.text
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
    for count in range(5):
        resp = requests.get(www)
        if resp.status_code == 200:
            break
    landing_page = resp.url
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
class Publication(Item, ItemWithAttachment):
    """Publication class."""
    item_type = 'publication'
    schema = load_schema('encoded:schemas/publication.json')
    embedded_list = [
        'award.project',
        "exp_sets_prod_in_pub.experimentset_type",
        "exp_sets_prod_in_pub.accession",
        "exp_sets_used_in_pub.experimentset_type",
        "exp_sets_used_in_pub.accession"
    ]

    def _update(self, properties, sheets=None):
        # import pdb; pdb.set_trace()
        self.upgrade_properties()
        title = ''
        abstract = ''
        authors = []
        url = ''
        date = ''
        journal = ''
        p_id = properties['ID']
        # parse if id is from pubmed
        try:
            if p_id.startswith('PMID'):
                pubmed_id = p_id[5:]
                title, abstract, authors, url, date, journal = fetch_pubmed(pubmed_id)
            # if id is doi, first check if it maps to pubmed id, else see where it goes
            elif p_id.startswith('doi'):
                doi_id = p_id[4:]
                if map_doi_pmid(doi_id):
                    pubmed_id = map_doi_pmid(doi_id)
                    title, abstract, authors, url, date, journal = fetch_pubmed(pubmed_id)
                # if it goes to biorxiv fetch from biorxiv
                elif map_doi_biox(doi_id):
                    biox_url = map_doi_biox(doi_id)
                    title, abstract, authors, url, date, journal = fetch_biorxiv(biox_url)
                else:
                    pass
        except:
            pass
        if title:
            properties['title'] = title
        if abstract:
            properties['abstract'] = abstract
        if authors:
            properties['authors'] = authors
        if url:
            properties['url'] = url
        if date:
            properties['date_published'] = date
        if journal:
            properties['journal'] = journal

        super(Publication, self)._update(properties, sheets)
        return

    @calculated_property(schema={
        "title": "Short Attribution",
        "description": "Short string containing <= 2 authors & year published.",
        "type": "string"
    })
    def short_attribution(self, authors=None, date_published=None):
        minipub = ''
        if authors is not None:
            minipub = authors[0]
            if len(authors) > 2:
                minipub = minipub + ' et al.'
            elif len(authors) == 2:
                minipub = minipub + ' and ' + authors[1]
        if date_published is not None:
            minipub = minipub + ' (' + date_published[0:4] + ')'
        return minipub

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, authors=None, date_published=None, title=None):
        minipub = self.short_attribution(authors, date_published)
        if minipub and title is not None:
            return minipub + ' ' + title[0:100]
        if not minipub and title is not None:
            return title[0:120]
        return Item.display_title(self)

