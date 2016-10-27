#!/usr/bin/env python3
# -*- coding: latin-1 -*-
import requests
import json
from bs4 import BeautifulSoup

url = "http://biorxiv.org/content/early/2016/10/26/083790"
r = requests.get(url)
resp = r.text.encode('utf-8').decode('ascii', 'ignore')
soup = BeautifulSoup(resp, "html.parser")

title = soup.find_all('meta', {'name': "DC.Title"})[0]['content']
abstract = soup.find_all('meta', {'name': "DC.Description"})[0]['content']
authors = ", ".join([i['content']for i in soup.find_all('meta', {'name': "DC.Contributor"})])

print(title)
print(abstract)
print(authors)

# print()
# print(soup)