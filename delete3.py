#!/usr/bin/env python3
# -*- coding: latin-1 -*-
import requests
import json
from html.parser import HTMLParser


class Extractor(HTMLParser):
    def handle_starttag(self, tag, attrs):
        title = ''
        abstract = ''
        authors = ''
        if tag == 'meta':
            attr = {k[0]: k[1] for k in attrs}
            print(attr)
            # if attr.get('name') == "DC.Title":
            #     title = attr.get('content')
            # if attr.get('name') == "DC.Description":
            #     abstract = attr.get('content')
            # if attr.get('name') == "DC.Contributor":
            #     title = attr.get('content')
            # return title, abstract, authors

parser = Extractor()


url = "http://biorxiv.org/content/early/2016/10/26/083790"
r = requests.get(url)
resp = r.text.encode('utf-8').decode('ascii', 'ignore')
soup = parser.feed(resp)

print(soup.tag)

'''

title = soup.find_all('meta', {'name': "DC.Title"})[0]['content']
abstract = soup.find_all('meta', {'name': "DC.Description"})[0]['content']
authors = ", ".join([i['content']for i in soup.find_all('meta', {'name': "DC.Contributor"})])

print(title)
print(abstract)
print(authors)

# print()
# print(soup)

'''