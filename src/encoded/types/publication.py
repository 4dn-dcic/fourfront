"""Create publication class and contain methods for data fetching."""
import time
import requests
import json
from snovault import (
    collection,
    load_schema,
    calculated_property,
    CONNECTION
)
from snovault.crud_views import (
    collection_add,
    item_edit,
)
from snovault.attachment import ItemWithAttachment
from snovault.util import debug_log
from .base import (
    Item,
    lab_award_attribution_embed_list
)
from pyramid.view import (
    view_config
)
from html.parser import HTMLParser
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch,
    validate_item_content_in_place,
    no_validate_item_content_post,
    no_validate_item_content_put,
    no_validate_item_content_patch
)


################################################
# Outside methods for online data fetch
################################################


def find_best_date(date_data):
    date = None
    a2d = {'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
           'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'}
    if 'DP' in date_data:
        ymd = [d.strip() for d in date_data['DP'].split(' ')]
        if not ymd or len(ymd[0]) != 4:  # problem with the year
            pass
        else:
            date = ymd.pop(0)
            if ymd:
                mm = a2d.get(ymd.pop(0))
                if mm:
                    date += '-{}'.format(mm)
                    if ymd:
                        dd = ymd.pop(0)
                        if len(dd) <= 2:
                            date += '-{}'.format(dd.zfill(2))
            return date
    if 'DEP' in date_data:
        date = date_data['DEP']
        if len(date) != 8:
            date = None
    if not date and 'DA' in date_data:
        date = date_data['DA']
    if date:
        datestr = date[:4]+"-"+date[4:6]+"-"+date[6:8]
        if len(datestr) == 10:
            return datestr
    return None


def fetch_pubmed(PMID):
    "Takes the number part of PMID and returns title, abstract and authors"

    field2prop = {'TI': 'title', 'AB': 'abstract', 'DP': 'date_published',
                  'DEP': 'date_published', 'DA': 'date_published', 'JT': 'journal',
                  'AU': 'authors', 'CN': 'authors'}
    pub_data = {v: None for v in field2prop.values()}
    pub_data['authors'] = []
    pub_data['date_published'] = {}
    NIHe = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    NIHw = "https://www.ncbi.nlm.nih.gov/pubmed/"
    url = NIHw + PMID
    pub_data['url'] = url
    www = "{NIH}efetch.fcgi?db=pubmed&id={id}&rettype=medline".format(NIH=NIHe, id=PMID)
    # try fetching data 5 times
    for count in range(5):
        resp = requests.get(www)
        if resp.status_code == 200:
            break
        if resp.status_code == 429:
            time.sleep(5)
            continue
        if count == 4:
            return {}
    # parse the text to get the fields
    r = resp.text
    full_text = r.replace('\n      ', ' ')
    for line in full_text.split('\n'):
        if line.strip():
            key, val = [a.strip() for a in line.split('-', 1)]
            if key in field2prop:
                if key in ['DP', 'DEP', 'DA']:
                    pub_data[field2prop[key]][key] = val
                elif key in ['AU', 'CN']:
                    pub_data[field2prop[key]].append(val)
                else:
                    pub_data[field2prop[key]] = val
    # deal with date
    if pub_data['date_published']:  # there is some date data
        pub_data['date_published'] = find_best_date(pub_data['date_published'])
    return {k: v for k, v in pub_data.items() if v is not None}


def fetch_biorxiv(url, doi):
    """Takes url and doi, returns title abstract authors date url journal version"""
    fdn2biorxiv = {
        'title': 'title',
        'abstract': 'abstract',
        'authors': 'authors',
        'date_published': 'date',
        'version': 'version'
    }
    biorxiv_api = 'https://api.biorxiv.org/details/biorxiv/'
    # try fetching data 5 times and return empty if fails
    for count in range(5):
        r = requests.get(biorxiv_api + doi)
        if r.status_code == 200:
            break
        if count == 4:
            return
    record_dict = r.json()['collection'][-1]  # get latest version
    pub_data = {k: record_dict.get(v) for k,v in fdn2biorxiv.items() if record_dict.get(v)}
    if pub_data.get('authors'):  # format authors according to 4DN schema
        pub_data['authors'] = [a.replace(" ", "").replace(".", "").replace(",", " ") for a in pub_data['authors'].split(";") if a]
    pub_data['url'] = url
    pub_data['journal'] = 'bioRxiv'
    return pub_data


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
        return str(res['records'][0]['pmid'])
    except Exception:
        return


def map_doi_biox(doi):
    "If a doi is not mapped to pubmed, check where it goes"
    DOIapi = "https://doi.org/api/handles/"
    www = "{DOIapi}{doi}".format(DOIapi=DOIapi, doi=doi)
    for count in range(5):
        resp = requests.get(www)
        if resp.status_code == 200:
            break
    if resp.json().get('values'):
        for value in resp.json()['values']:
            if value.get('type', '') == 'URL':
                landing_page = value['data']['value']
                break
    if "biorxiv" in landing_page:
        return landing_page
    else:
        return


################################################
# Outside methods for online data fetch
################################################

def _build_publication_embedded_list():
    """ Helper function intended to be used to create the embedded list for publication.
        All types should implement a function like this going forward.
    """
    return Item.embedded_list + lab_award_attribution_embed_list + [
        # ExperimentSet linkTo
        "exp_sets_prod_in_pub.accession",

        # ExperimentType linkTo
        "exp_sets_prod_in_pub.experimentset_type",
        "exp_sets_used_in_pub.experimentset_type",

        # ExperimentType linkTo
        "exp_sets_prod_in_pub.experiments_in_set.experiment_type.title",
    ]


@collection(
    name='publications',
    properties={
        'title': 'Publications',
        'description': 'Publication pages',
    })
class Publication(Item, ItemWithAttachment):
    """Publication class."""
    item_type = 'publication'
    schema = load_schema('encoded:schemas/publication.json')
    embedded_list = _build_publication_embedded_list()
    # the following fields are patched by the update method and should always be included in the invalidation diff
    default_diff = [
        'title',
        'abstract',
        'authors',
        'date_published',
        'journal',
        'version',
        'url'
    ]

    class Collection(Item.Collection):
        pass

    def _update(self, properties, sheets=None):
        # logic for determing whether to use manually-provided date_published
        try:
            prev_date_published = self.properties.get('date_published')
        except KeyError:  # if new user, previous properties do not exist
            prev_date_published = None
        new_date_published = properties.get('date_published')
        self.upgrade_properties()
        pub_data = {}
        p_id = properties['ID']
        # parse if id is from pubmed
        try:
            if p_id.startswith('PMID'):
                pubmed_id = p_id[5:]
                pub_data = fetch_pubmed(pubmed_id)
            # if id is doi, first check if it maps to pubmed id, else see where it goes
            elif p_id.startswith('doi'):
                doi_id = p_id[4:]
                pubmed_id = map_doi_pmid(doi_id)
                if pubmed_id:
                    pub_data = fetch_pubmed(pubmed_id)
                # if it goes to biorxiv fetch from biorxiv
                else:
                    biox_url = map_doi_biox(doi_id)
                    if biox_url:
                        pub_data = fetch_biorxiv(biox_url, doi_id)
                    else:
                        pass
        except Exception:
            pass
        if pub_data:
            for k, v in pub_data.items():
                properties[k] = v
        # allow override of date_published
        if new_date_published is not None and prev_date_published != new_date_published:
            properties['date_published'] = new_date_published

        super(Publication, self)._update(properties, sheets)
        return

    @calculated_property(schema={
        "title": "Short Attribution",
        "description": "Short string containing <= 2 authors & year published.",
        "type": "string"
    })
    def short_attribution(self, authors=None, date_published=None):
        minipub = ''
        if authors:
            minipub = authors[0]
            if len(authors) > 2:
                minipub = minipub + ' et al.'
            elif len(authors) == 2:
                minipub = minipub + ' and ' + authors[1]
        if date_published:
            minipub = minipub + ' (' + date_published[0:4] + ')'
        return minipub

    @calculated_property(schema={
        "title": "Display Title",
        "description": "Publication short attribution, year, and ID (if available).",
        "type": "string"
    })
    def display_title(self, ID, authors=None, date_published=None):
        minipub = self.short_attribution(authors, date_published)
        if minipub:
            return minipub + ' ' + ID
        return ID

    @calculated_property(schema={
        "title": "Number of Experiment Sets",
        "description": "The number of experiment sets produced by this publication.",
        "type": "integer"
    })
    def number_of_experiment_sets(self, request, exp_sets_prod_in_pub=None):
        if exp_sets_prod_in_pub:
            return len(exp_sets_prod_in_pub)


#### Add validator to ensure ID field is unique

def validate_unique_pub_id(context, request):
    '''validator to ensure publication 'ID' field is unique
    '''
    data = request.json
    # ID is required; validate_item_content_post/put/patch will handle missing field
    if 'ID' in data:
        lookup_res = request.registry[CONNECTION].storage.get_by_json('ID', data['ID'], 'publication')
        if lookup_res:
            # check_only + POST happens on GUI edit; we cannot confirm if found
            # item is the same item. Let the PATCH take care of validation
            if request.method == 'POST' and request.params.get('check_only', False):
                return
            # editing an item will cause it to find itself. That's okay
            if hasattr(context, 'uuid') and getattr(lookup_res, 'uuid', None) == context.uuid:
                return
            error_msg = ("publication %s already exists with ID '%s'. This field must be unique"
                         % (lookup_res.uuid, data['ID']))
            request.errors.add('body', 'Publication: non-unique ID',  error_msg)
            return


@view_config(context=Publication.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post, validate_unique_pub_id])
@view_config(context=Publication.Collection, permission='add_unvalidated', request_method='POST',
             validators=[no_validate_item_content_post],
             request_param=['validate=false'])
@debug_log
def publication_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=Publication, permission='edit', request_method='PUT',
             validators=[validate_item_content_put, validate_unique_pub_id])
@view_config(context=Publication, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_unique_pub_id])
@view_config(context=Publication, permission='edit_unvalidated', request_method='PUT',
             validators=[no_validate_item_content_put],
             request_param=['validate=false'])
@view_config(context=Publication, permission='edit_unvalidated', request_method='PATCH',
             validators=[no_validate_item_content_patch],
             request_param=['validate=false'])
@view_config(context=Publication, permission='index', request_method='GET',
             validators=[validate_item_content_in_place, validate_unique_pub_id],
             request_param=['check_only=true'])
@debug_log
def publication_edit(context, request, render=None):
    return item_edit(context, request, render)
