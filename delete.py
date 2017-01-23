#!/usr/bin/env python3
import requests

from html.parser import HTMLParser

class BioRxivExtractor(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.title = ''
        self.abstract = ''
        self.author_list = []
        self.date = ''

    def handle_starttag(self, tag, attrs):
        attr = {}
        if tag == 'meta':
            attr = {k[0]: k[1] for k in attrs}
            print(attr)
            if attr.get('name') == "DC.Title":
                self.title = attr.get('content')
            if attr.get('name') == "DC.Description":
                self.abstract = attr.get('content')
            if attr.get('name') == "DC.Contributor":
                self.author_list.append(attr.get('content'))
            if attr.get('name') == "DC.Description":
                self.abstract = attr.get('content')


def fetch_biorxiv(url_b):
    """Takes Url, uses the BioRxivExtractor class and returns title abstract authors url"""
    title = ''
    abstract = ''
    authors = ''
    url = ''
    date = ''
    r = requests.get(url_b)
    resp = r.text.encode('utf-8').decode('ascii', 'ignore')
    parser = BioRxivExtractor()
    parser.feed(resp)
    title = parser.title
    abstract = parser.abstract
    authors = ", ".join(parser.author_list)
    return title, abstract, authors, url, date

def map_doi_biox(doi):
    "If a doi is not mapped to pubmed, check where it goes"
    DOIad = "https://doi.org/"
    www = "{DOIad}{doi}".format(DOIad=DOIad, doi=doi)
    print(www)
    landing_page = requests.get(www).url
    if "biorxiv" in landing_page.lower():
        return landing_page
    else:
        return

url = map_doi_biox("10.1101/083659")
print(url)
fetch_biorxiv(url)