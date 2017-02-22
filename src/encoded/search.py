import re
import math
from pyramid.view import view_config
from snovault import (
    AbstractCollection,
    TYPES,
)
from snovault.elasticsearch import ELASTIC_SEARCH
from snovault.resource_views import collection_view_listing_db
from elasticsearch.helpers import scan
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.security import effective_principals
from urllib.parse import urlencode
from collections import OrderedDict


def includeme(config):
    config.add_route('search', '/search{slash:/?}')
    config.add_route('browse', '/browse{slash:/?}')
    config.add_route('available_facets', '/facets{slash:/?}')
    config.scan(__name__)

sanitize_search_string_re = re.compile(r'[\\\+\-\&\|\!\(\)\{\}\[\]\^\~\:\/\\\*\?]')

@view_config(route_name='search', request_method='GET', permission='search')
def search(context, request, search_type=None, return_generator=False, forced_type='Search'):
    """
    Search view connects to ElasticSearch and returns the results
    """
    types = request.registry[TYPES]
    search_base = normalize_query(request)
    ### INITIALIZE RESULT
    result = {
        '@context': request.route_path('jsonld_context'),
        '@id': '/' + forced_type.lower() + '/' + search_base,
        '@type': [forced_type],
        'title': forced_type,
        'filters': [],
        'facets': [],
        '@graph': [],
        'notification': '',
        'sort': {}  # probably could eliminate
    }
    principals = effective_principals(request)

    es = request.registry[ELASTIC_SEARCH]
    es_index = request.registry.settings['snovault.elasticsearch.index']
    search_audit = request.has_permission('search_audit')

    from_, size = get_pagination(request)

    ### PREPARE SEARCH TERM
    prepared_terms = prepare_search_term(request)

    doc_types = set_doc_types(request, types, search_type)

    # set up clear_filters path
    result['clear_filters'] = clear_filters_setup(request, doc_types, forced_type)

    ### SET TYPE FILTERS
    build_type_filters(result, request, doc_types, types)

    ### GET FILTERED QUERY
    # Builds filtered query which supports multiple facet selection
    result_fields = sorted(list_result_fields(request, doc_types))
    query = get_filtered_query(prepared_terms,
                               result_fields,
                               principals,
                               doc_types)

    # TODO: decide if the schemas are useful
    # commented out as not returning them currently
    # schemas = [types[doc_type].schema for doc_type in doc_types]

    ### Set sort order
    # has_sort = set_sort_order(request, search_term, types, doc_types, query, result)
    # TODO: implement BOOST here? For now, don't set a sort order
    has_sort = False

    ### Set filters
    used_filters = set_filters(request, query, result)

    ### Set starting facets
    facets = initialize_facets(types, doc_types, search_audit, principals)

    ### Adding facets to the query
    query['aggs'] = set_facets(facets, used_filters, principals, doc_types)

    ### Execute the query
    if size == 'all':
        es_results = get_all_results(request, query)
    elif size:
        es_results = es.search(body=query, index=es_index, from_=from_, size=size)
    else:
        # fallback size for elasticsearch is 10
        es_results = es.search(body=query, index=es_index)

    ### Record total number of hits
    result['total'] = total = es_results['hits']['total']

    schemas = (types[item_type].schema for item_type in doc_types)
    result['facets'] = format_facets(es_results, facets, used_filters, schemas, total)

    # Add batch actions
    # TODO: figure out exactly what this does. Provide download URLs?
    # Implement later
    # result.update(search_result_actions(request, doc_types, es_results))

    ### Add all link for collections
    if size not in (None, 'all') and size < result['total']:
        params = [(k, v) for k, v in request.params.items() if k != 'limit']
        params.append(('limit', 'all'))
        result['all'] = '%s?%s' % (request.resource_path(context), urlencode(params))

    if not result['total']:
        # http://googlewebmastercentral.blogspot.com/2014/02/faceted-navigation-best-and-5-of-worst.html
        request.response.status_code = 404
        result['notification'] = 'No results found'
        result['@graph'] = []
        return result if not return_generator else []

    result['notification'] = 'Success'

    ### Format results for JSON-LD
    graph = format_results(request, es_results['hits']['hits'])

    if request.__parent__ is not None or return_generator:
        if return_generator:
            return graph
        else:
            result['@graph'] = list(graph)
            return result
    else:
        result['@graph'] = list(graph)
        return result


@view_config(route_name='browse', request_method='GET', permission='search')
def browse(context, request, search_type=None, return_generator=False):
    """
    Simply use search results for browse view
    """
    return search(context, request, search_type, return_generator, forced_type='Browse')


@view_config(context=AbstractCollection, permission='list', request_method='GET',
             name='listing')
def collection_view(context, request):
    """
    Simply use search results for collections views (e.g./biosamples/)
    """
    return search(context, request, context.type_info.name)


@view_config(route_name='available_facets', request_method='GET', permission='search', renderer='json')
def get_available_facets(context, request, search_type=None):
    """
    Method to get available facets for a content/data type; built off of search() without querying Elasticsearch.
    Unlike in search(), due to lack of ES query, does not return possible terms nor counts of experiments matching the terms.
    """

    types = request.registry[TYPES]
    doc_types = set_doc_types(request, types, search_type)
    principals = effective_principals(request)
    facets = initialize_facets(types, doc_types, request.has_permission('search_audit'), principals)

    ### Mini version of format_facets
    result = []
    for field, facet in facets:
        result.append({
            'field': field,
            'title': facet.get('title', field)
        })

    return result


def get_pagination(request):
    """
    Fill from_ and size parameters for search if given in the query string
    """
    from_ = request.params.get('from', 0)
    size = request.params.get('limit', 25)
    if size in ('all', ''):
       size = "all"
    else:
        try:
            size = int(size)
        except ValueError:
            size = 25
    return from_, size


def get_all_results(request, origQuery):
    es = request.registry[ELASTIC_SEARCH]
    es_index = request.registry.settings['snovault.elasticsearch.index']
    from_ = 0
    sizeIncrement = 1000 # Decrease this to like 5 or 10 to test.

    es_result = es.search(body=origQuery, index=es_index, from_=from_, size=sizeIncrement) # get our aggregations from here
    total = es_result['hits'].get('total',0)
    extraRequestsNeeded = int(math.ceil(total / sizeIncrement)) - 1 # Decrease by 1 (first es_result already happened)

    if extraRequestsNeeded <= 0:
        return es_result

    # We don't need to grab aggs for subsequent queries, already obtained from first one, incr. performance instead maybe.
    query = { k:v for k,v in origQuery.items() if k != 'aggs' }

    while extraRequestsNeeded > 0:
        # print(str(extraRequestsNeeded) + " requests left to get all results.")
        from_ = from_ + sizeIncrement
        subsequent_es_result = es.search(body=query, index=es_index, from_=from_, size=sizeIncrement)
        es_result['hits']['hits'] = es_result['hits']['hits'] + subsequent_es_result['hits'].get('hits', [])
        extraRequestsNeeded -= 1
        # print("Found " + str(len(es_result['hits']['hits'])) + ' results so far.')
    return es_result


def normalize_query(request):
    """
    Normalize the query used to make the search. If no type is provided,
    use type=Item
    """
    types = request.registry[TYPES]
    fixed_types = (
        (k, types[v].name if k == 'type' and v in types else v)
        for k, v in request.params.items()
    )
    qs = urlencode([
        (k.encode('utf-8'), v.encode('utf-8'))
        for k, v in fixed_types
    ])
    # default to type=Item if no type is specified
    qs = '?' + qs if qs else '?type=Item'
    if 'type=' not in qs:
        qs += '&type=Item'
    return qs


def clear_filters_setup(request, doc_types, forced_type):
    # Clear Filters path -- make a path that clears all non-datatype filters.
    # http://stackoverflow.com/questions/16491988/how-to-convert-a-list-of-strings-to-a-query-string#answer-16492046
    searchterm_specs = request.params.getall('searchTerm')
    searchterm_only = urlencode([("searchTerm", searchterm) for searchterm in searchterm_specs])
    if searchterm_only:
        # Search term in query string; clearing keeps that
        clear_qs = searchterm_only
    else:
        # Possibly type(s) in query string
        clear_qs = urlencode([("type", typ) for typ in doc_types])
    return request.route_path(forced_type.lower(), slash='/') + (('?' + clear_qs) if clear_qs else '')


def build_type_filters(result, request, doc_types, types):
    """
    Set the type filters for the search. If no doc_types, default to Item
    """
    if not doc_types:
        doc_types = ['Item']
    else:
        for item_type in doc_types:
            ti = types[item_type]
            qs = urlencode([
                (k.encode('utf-8'), v.encode('utf-8'))
                for k, v in request.params.items() if not (k == 'type' and types['Item' if v == '*' else v] is ti)
            ])
            result['filters'].append({
                'field': 'type',
                'term': ti.name,
                'remove': '{}?{}'.format(request.path, qs)
            })


def prepare_search_term(request):
    """
    Prepares search terms by making a dictionary where the keys are fields
    and the values are arrays of query strings
    Ignore certain keywords, such as type, format, and field
    """
    prepared_terms = {}
    prepared_vals = []
    for field, val in request.params.iteritems():
        if field not in ['type', 'frame', 'format', 'limit', 'sort', 'from', 'field']:
            if 'embedded.' + field not in prepared_terms.keys():
                prepared_terms['embedded.' + field] = []
            prepared_terms['embedded.' + field].append(val)
    return prepared_terms


def set_doc_types(request, types, search_type):
    """
    Set the type of documents resulting from the search; order and check for
    invalid types as well.
    """
    doc_types = []
    if search_type is None:
        doc_types = request.params.getall('type')
        if '*' in doc_types:
            doc_types = ['Item']
    else:
        doc_types = [search_type]
    # Normalize to item_type
    try:
        doc_types = sorted({types[name].name for name in doc_types})
    except KeyError:
        # Check for invalid types
        bad_types = [t for t in doc_types if t not in types]
        msg = "Invalid type: {}".format(', '.join(bad_types))
        raise HTTPBadRequest(explanation=msg)
    if len(doc_types) == 0:
        doc_types = ['Item']
    return doc_types

def get_search_fields(request, doc_types):
    """
    Returns set of columns that are being searched and highlights
    """
    fields = {'uuid'}
    highlights = {}
    types = request.registry[TYPES]
    for doc_type in doc_types:
        type_info = types[doc_type]
        for value in type_info.schema.get('boost_values', ()):
            fields.add('embedded.' + value)
            highlights['embedded.' + value] = {}
    return fields, highlights


def list_result_fields(request, doc_types):
    """
    Returns set of fields that are requested by user or default fields.
    These fields are used to further limit the results from the search.
    Note that you must provide the full fieldname with embeds, such as:
    'field=biosample.biosource.individual.organism.name' and not just
    'field=name'
    """
    frame = request.params.get('frame')
    fields_requested = request.params.getall('field')
    if fields_requested:
        fields = {'embedded.@id', 'embedded.@type'}
        fields.update('embedded.' + field for field in fields_requested)
    elif frame in ['embedded', 'object']:
        fields = [frame + '.*']
    else:
        fields = ['embedded.*']
    return fields


# TODO: Make ES5 complaint query dsl ('query' should be ok, but not 'filter')
def get_filtered_query(prepared_terms, result_fields, principals, doc_types):
    # prepare the query from prepared_terms
    bool_query = {"should":[]}
    for field, terms in prepared_terms.items():
        # Replaces query_search (text search?) w/ specific tests for field/term.
        this_query = {"query_string":{ "default_operator" : "OR" }}
        this_query["query_string"]["fields"] = [field]

        query_prep = ['\"{0}\"'.format(term) for term in terms]
        this_query["query_string"]["query"] = ' '.join(query_prep)
        bool_query["should"].append(this_query)
    ### FOR ES1
    return {
        "query": {
            "bool" : bool_query
        },
        'filter': {
            'and': {
                'filters': [
                    {
                        'terms': {
                            'principals_allowed.view': principals
                        }
                    },
                    {
                        'terms': {
                            'embedded.@type.raw': doc_types
                        }
                    }
                ]
            }
        },
        '_source': list(result_fields),
    }


def set_filters(request, query, result):
    """
    Sets filters in the query. Use only for types. Specific fields are contained
    within the query_string.
    """
    query_filters = query['filter']['and']['filters']
    used_filters = {}
    for field, term in request.params.items():
        if field in ['limit', 'y.limit', 'x.limit', 'mode', 'annotation',
                     'format', 'frame', 'datastore', 'field', 'region', 'genome',
                     'sort', 'from', 'referrer']:
            continue
        elif field == 'type' and term != 'Item':
            continue
        # Add filter to result
        qs = urlencode([
            (k.encode('utf-8'), v.encode('utf-8'))
            for k, v in request.params.items() if v != term
        ])
        remove_path = '{}?{}'.format(request.path, qs)
        # default to searching type=Item rather than empty filter path
        if remove_path[-1] == '?':
            remove_path += 'type=Item'

        result['filters'].append({
            'field': field,
            'term': term,
            'remove': remove_path
        })

        if field == 'searchTerm':
            continue

        # Add filter to query
        if field.startswith('audit'):
            query_field = field
        else:
            query_field = 'embedded.' + field + '.raw'

        if field not in used_filters.keys():
            used_filters[field] = [term]
            query_filters.append({
                'terms' : { query_field : used_filters[field] }
            })
        else:
            # Update query['filters']['and']['filters'][N] where N === { 'terms' : ... } 
            # with term.
            query_filters.remove({
                'terms' : { query_field : used_filters[field] }
            })
            used_filters[field].append(term)
            query_filters.append({
                'terms' : { query_field : used_filters[field] }
            })

        #used_filters[field].append(term)

    return used_filters


def initialize_facets(types, doc_types, search_audit, principals):
    """
    Initialize the facets used for the search. If searching across multiple
    doc_types, only use the 'Data Type' facet
    """
    facets = [
        ('type', {'title': 'Data Type'}),
    ]
    audit_facets = [
        ('audit.ERROR.category', {'title': 'Audit category: ERROR'}),
        ('audit.NOT_COMPLIANT.category', {'title': 'Audit category: NOT COMPLIANT'}),
        ('audit.WARNING.category', {'title': 'Audit category: WARNING'}),
        ('audit.INTERNAL_ACTION.category', {'title': 'Audit category: DCC ACTION'})
    ]
    if len(doc_types) == 1 and 'facets' in types[doc_types[0]].schema:
        facets.extend(types[doc_types[0]].schema['facets'].items())

    # Display all audits if logged in, or all but INTERNAL_ACTION if logged out
    for audit_facet in audit_facets:
        if search_audit and 'group.submitter' in principals or 'INTERNAL_ACTION' not in audit_facet[0]:
            facets.append(audit_facet)
    return facets


# TODO: polish this
def set_facets(facets, used_filters, principals, doc_types):
    """
    Sets facets in the query using filters

    :param facets: A list of tuples containing (0) field in object dot notation,  and (1) a dict or OrderedDict with title property.
    :param used_filters: Dict of filters which are set for the ES query. Key is field type, e.g. 'experiments_in_set.award.project', and value is list of terms (strings).
    """

    aggs = {}
    facetFields = dict(facets).keys() # List of first entry of tuples in facets list. 
    # E.g. 'type','experimentset_type','experiments_in_set.award.project', ...

    for field in facetFields:
        if field == 'type':
            query_field = 'embedded.@type.raw'
        elif field.startswith('audit'):
            query_field = field
        else:
            query_field = 'embedded.' + field + '.raw'

        agg_name = field.replace('.', '-')

        aggregation = {
            'terms': {
                'field': query_field,
                'min_doc_count': 0,
                'size': 100
            }
        }

        termFilter = {
            'bool': {
                'must': [
                    {'terms': {'principals_allowed.view': principals}},
                    {'terms': {'embedded.@type.raw': doc_types}},
                ],
            },
        }

        # Adding facets based on filters
        for q_field, q_terms in used_filters.items():
            if q_field not in facetFields:
                continue
            
            if q_field == field:
                continue

            elif q_field != field: # Get reduced count aggregation for term in field not set in filters.
                if q_field.startswith('audit'):
                    termFilter['bool']['must'].append({'terms' : { q_field : q_terms }})
                elif not q_field.endswith('!'):
                    termFilter['bool']['must'].append({'terms' : { 'embedded.' + q_field + '.raw' : q_terms }})
                elif q_field.endswith('!'):
                    if termFilter['bool'].get('must_not') is None:
                        termFilter['bool']['must_not'] = []
                    termFilter['bool']['must_not'].append({'terms' : {'embedded.' + q_field[:-1] + '.raw': q_terms}})

        aggs[agg_name] = {
            'aggs': {
                agg_name : aggregation
            },
            'filter': termFilter,
        }

    return aggs


def format_facets(es_results, facets, used_filters, schemas, total):
    """
    Format the facets for the final results based on the es results
    These are stored within 'aggregations' of the result
    """
    result = []
    # Loading facets in to the results
    if 'aggregations' not in es_results:
        return result

    aggregations = es_results['aggregations']
    used_facets = set()
    for field, facet in facets:
        resultFacet = {
            'field' : field,
            'title' : facet.get('title', field),
            'total' : 0,
            'terms' : None
        }
        used_facets.add(field)
        agg_name = field.replace('.', '-')

        if agg_name in aggregations:
            resultFacet['total'] = aggregations[agg_name]['doc_count']
            resultFacet['terms'] = aggregations[agg_name][agg_name]['buckets']
            
        # Choosing to show facets with one term for summary info on search it provides
        #if len(terms) < 1:
        #    continue

        result.append(resultFacet)

    # Show any filters that aren't facets as a fake facet with one entry,
    # so that the filter can be viewed and removed
    for field, values in used_filters.items():
        if field not in used_facets:
            title = field
            for schema in schemas:
                if field in schema['properties']:
                    title = schema['properties'][field].get('title', field)
                    break
            result.append({
                'field': field,
                'title': title,
                'terms': [{'key': v} for v in values],
                'total': total,
                })

    return result

def format_results(request, hits):
    """
    Loads results to pass onto UI
    """
    fields_requested = request.params.getall('field')
    if fields_requested:
        frame = 'embedded'
    elif request.params.get('frame'):
        frame = request.params.get('frame')
    else:
        frame = 'embedded'

    if frame in ['embedded', 'object']:
        for hit in hits:
            yield hit['_source'][frame]
        return

### stupid things to remove; had to add because of other fxns importing

# Update? used in ./batch_download.py
def iter_search_results(context, request):
    return search(context, request, return_generator=True)

# DUMMY FUNCTION. TODO: update ./batch_download.py to use embeds instead of cols
def list_visible_columns_for_schemas(request, schemas):
    return []

# DUMMY FUNCTION. TODO: update ./region_search.py
def search_result_actions(request, doc_types, es_results, position=None):
    return {}

_ASSEMBLY_MAPPER = {
    'GRCh38-minimal': 'hg38',
    'GRCh38': 'hg38',
    'GRCh37': 'hg19',
    'GRCm38': 'mm10',
    'GRCm37': 'mm9',
    'BDGP6': 'dm4',
    'BDGP5': 'dm3',
    'WBcel235': 'WBcel235'
}

hgConnect = ''.join([
    'http://genome.ucsc.edu/cgi-bin/hgTracks',
    '?hubClear=',
])
