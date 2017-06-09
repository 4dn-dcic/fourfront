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
from elasticsearch_dsl import Search, Q
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
    search_base = normalize_query(request, search_type)
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
        'sort': {}
    }
    principals = effective_principals(request)

    es = request.registry[ELASTIC_SEARCH]
    search_audit = request.has_permission('search_audit')

    from_, size = get_pagination(request)

    ### PREPARE SEARCH TERM
    prepared_terms = prepare_search_term(request)

    doc_types = set_doc_types(request, types, search_type)

    # set ES index based on doc_type (one type per index)
    # if doc_type is item, search all indexes by setting es_index to None
    # If multiple, search all specified
    if 'Item' in doc_types:
        es_index = '_all'
    else:
        es_index = find_index_by_doc_types(request, doc_types, ['Item'])

    # establish elasticsearch_dsl class that will perform the search
    search = Search(using=es, index=es_index)

    # set up clear_filters path
    result['clear_filters'] = clear_filters_setup(request, doc_types, forced_type)

    ### SET TYPE FILTERS
    build_type_filters(result, request, doc_types, types)

    ### GET FILTERED QUERY
    # Builds filtered query which supports multiple facet selection
    result_fields = sorted(list_result_fields(request, doc_types))
    search = build_query_and_filters(
        search,
        prepared_terms,
        result_fields,
        principals,
        doc_types
    )

    ### Set sort order
    search = set_sort_order(request, search, prepared_terms, types, doc_types, result)
    # TODO: implement BOOST here?

    ### Set filters
    search, used_filters = set_filters(request, search, result)

    ### Set starting facets
    facets = initialize_facets(types, doc_types, search_audit, principals)

    ### Adding facets to the query
    search = set_facets(search, facets, used_filters, principals, doc_types)
    ### Execute the query
    if size == 'all':
        es_results = get_all_results(search)
    elif size:
        offset_size = from_ + size
        size_search = search[from_:offset_size]
        es_results = size_search.execute().to_dict()
    else:
        # fallback size for elasticsearch is 10
        es_results = search.execute().to_dict()

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

    columns = list_visible_columns_for_schemas(request, schemas)
    if columns:
        result['columns'] = columns

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


@view_config(context=AbstractCollection, permission='list', request_method='GET')
def collection_view(context, request):
    """
    Simply use search results for collections views (e.g./biosamples/)
    This is a redirect directly to the search page
    """
    return search(context, request, context.type_info.name, False, forced_type='Search')


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
        try:
            from_ = int(from_)
        except ValueError:
            size = 0
    return from_, size


def get_all_results(search):
    from_ = 0
    sizeIncrement = 1000 # Decrease this to like 5 or 10 to test.
    size = from_ + sizeIncrement

    first_search = search[from_:size] # get aggregations from here
    es_result = first_search.execute().to_dict()

    total = es_result['hits'].get('total',0)
    extraRequestsNeeded = int(math.ceil(total / sizeIncrement)) - 1 # Decrease by 1 (first es_result already happened)

    if extraRequestsNeeded <= 0:
        return es_result

    # We don't need to grab aggs for subsequent queries, already obtained from first one, incr. performance instead maybe.
    query = { k:v for k,v in origQuery.items() if k != 'aggs' }

    while extraRequestsNeeded > 0:
        # print(str(extraRequestsNeeded) + " requests left to get all results.")
        from_ = from_ + sizeIncrement
        size = from_ + sizeIncrement
        subsequent_search = search[from_:size]
        subsequent_es_result = subsequent_search.execute().to_dict()
        es_result['hits']['hits'] = es_result['hits']['hits'] + subsequent_es_result['hits'].get('hits', [])
        extraRequestsNeeded -= 1
        # print("Found " + str(len(es_result['hits']['hits'])) + ' results so far.')
    return es_result


def normalize_query(request, search_type):
    """
    Normalize the query used to make the search. If no type is provided,
    use type=Item
    """
    item_type = search_type if search_type != None else 'Item'
    types = request.registry[TYPES]
    fixed_types = (
        (k, types[v].name if k == 'type' and v in types else v)
        for k, v in request.params.items()
    )
    qs = urlencode([
        (k.encode('utf-8'), v.encode('utf-8'))
        for k, v in fixed_types
    ])
    # default to the search_type or type=Item if no type is specified
    qs = '?' + qs if qs else '?type=' + item_type
    if 'type=' not in qs:
        qs += ('&type=' + item_type)
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
        if field.startswith('audit'):
            continue
        elif field not in ['type', 'frame', 'format', 'limit', 'sort', 'from', 'field']:
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
    Add audit to this so we can look at that as well
    """
    frame = request.params.get('frame')
    fields_requested = request.params.getall('field')
    if fields_requested:
        fields = ['embedded.@id', 'embedded.@type']
        for field in fields_requested:
            fields.append('embedded.' + field)
    elif frame in ['embedded', 'object']:
        fields = [frame + '.*']
    else:
        fields = ['embedded.*']
    return fields


def build_query_and_filters(search, prepared_terms, result_fields, principals, doc_types):
    """
    Prepare the query within the Search object
    """
    # intialize the query object, Q
    query = Q('bool')
    # set _source fields for the search
    search = search.source(list(result_fields))
    # prepare the query from prepared_terms
    or_queries = []
    for field, terms in prepared_terms.items():
        this_query = Q("query_string")
        this_query.fields = [field]
        query_prep = ['\"{0}\"'.format(term) for term in terms]
        this_query.query = ' '.join(query_prep)
        or_queries.append(this_query)
    query.should = or_queries
    search = search.query(query)
    # add filters for principals and doc_types
    search = search.filter('terms', **{'principals_allowed.view': principals})
    search = search.filter('terms', **{'embedded.@type.raw': doc_types})
    return search


def set_sort_order(request, search, search_term, types, doc_types, result):
    """
    sets sort order for elasticsearch results
    example: /search/?type=Biosource&sort_by=display_title
    will sort by display_title in ascending order. To set descending order,
    use the "-" flag: sort_by=-date_created.
    Sorting is done alphatbetically, case sensitive by default.
    TODO: add a schema flag for case sensitivity/insensitivity?

    ES5: simply pass in the sort OrderedDict into search.sort
    """
    sort = OrderedDict()
    result_sort = OrderedDict()
    # Prefer sort order specified in request, if any
    requested_sort = request.params.get('sort')
    if requested_sort:
        if requested_sort.startswith('-'):
            name = requested_sort[1:]
            order = 'desc'
        else:
            name = requested_sort
            order = 'asc'
        sort['embedded.' + name + '.lower_case_sort.keyword'] = result_sort[name] = {
            'order': order,
            'unmapped_type': 'long',
        }
    # Otherwise we use a default sort only when there's no text search to be ranked
    if not sort and search_term == '*':
        # If searching for a single type, look for sort options in its schema
        if len(doc_types) == 1:
            type_schema = types[doc_types[0]].schema
            if 'sort_by' in type_schema:
                for k, v in type_schema['sort_by'].items():
                    # Should always sort on raw field rather than analyzed field
                    # OR search on lower_case_sort for case insensitive results
                    sort['embedded.' + k + '.lower_case_sort.keyword'] = result_sort[k] = v
        # Default is most recent first, then alphabetical by label
        if not sort:
            sort['embedded.date_created.raw'] = result_sort['date_created'] = {
                'order': 'desc',
                'ignore_unmapped': True,
            }
            sort['embedded.label.raw'] = result_sort['label'] = {
                'order': 'asc',
                'missing': '_last',
                'ignore_unmapped': True,
            }
    if sort and result_sort:
        result['sort'] = result_sort
        search = search.sort(sort)
    return search


def set_filters(request, search, result):
    """
    Sets filters in the query
    """
    query_filters = search.to_dict()['query']['bool']['filter']
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
        elif field == 'type':
            query_field = 'embedded.@type.raw'
        else:
            query_field = 'embedded.' + field + '.raw'

        if field not in used_filters.keys():
            used_filters[field] = [term]
            query_filters.append({
                'terms' : { query_field : used_filters[field] }
            })
        else:
            # Update query['filters']['and']['filters'][N] with term
            # where N === { 'terms' : ... }

            query_filters.remove({
                'terms' : { query_field : used_filters[field] }
            })
            used_filters[field].append(term)
            query_filters.append({
                'terms' : { query_field : used_filters[field] }
            })
        #used_filters[field].append(term)
    # To modify filters of elasticsearch_dsl Search, must call to_dict(),
    # modify that, then update from the new dict
    prev_search = search.to_dict()
    prev_search['query']['bool']['filter'] = query_filters
    search.update_from_dict(prev_search)

    return search, used_filters


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


def set_facets(search, facets, used_filters, principals, doc_types):
    """
    Sets facets in the query using filters
    ES5: simply sets aggs by calling update_from_dict after adding them in

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
            query_field = field + '.raw'
        else:
            query_field = 'embedded.' + field + '.raw'

        agg_name = field.replace('.', '-')

        # default was size = 10, so only top 10 agg results were returned.
        # set size to 100.
        # https://github.com/10up/ElasticPress/wiki/Working-with-Aggregations
        aggregation = {
            'terms': {
                'size': 100,
                'field': query_field,
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
    # to achieve OR behavior within facets, search among GLOBAL results,
    # not just returned ones. to do this, wrap aggs in ['all_items']
    # and add "global": {} to top level aggs query
    # see elasticsearch global aggs for documentation (should be ES5 compliant)
    final_aggs = {
        'all_items': {
            'global': {},
            'aggs': aggs
        }
    }

    prev_search = search.to_dict()
    prev_search['aggs'] = final_aggs
    search.update_from_dict(prev_search)

    return search


def format_facets(es_results, facets, used_filters, schemas, total):
    """
    Format the facets for the final results based on the es results
    These are stored within 'aggregations' of the result
    """
    result = []
    # Loading facets in to the results
    if 'aggregations' not in es_results:
        return result

    aggregations = es_results['aggregations']['all_items']
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
        if len(resultFacet.get('terms', [])) < 1:
            continue

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
    For now, add audits to the results so we can facet/not facet on audits
    """
    fields_requested = request.params.getall('field')
    if fields_requested:
        frame = 'embedded'
    elif request.params.get('frame'):
        frame = request.params.get('frame')
    else:
        frame = 'embedded'

    if frame in ['embedded', 'object', ]:
        for hit in hits:
            frame_result = hit['_source'][frame]
            if 'audit' in hit['_source'] and 'audit' not in frame_result:
                frame_result['audit'] = hit['_source']['audit']
            yield frame_result
        return


def find_index_by_doc_types(request, doc_types, ignore):
    """
    Find the correct index(es) to be search given a list of doc_types.
    The types in doc_types are the collection names, formatted like
    'Experiment HiC' and index names are the jsonld_types, formatted like
    'experiment_hi_c'.
    Ignore any collection names provided in the ignore param, an array.
    Formats output indexes as a string usable by elasticsearch
    """
    indexes = []
    for doc_type in doc_types:
        if doc_type in ignore:
            continue
        else:
            result = get_jsonld_types_from_collection_type(request, doc_type)
            indexes.extend(result)
    # remove any duplicates
    indexes = list(set(indexes))
    index_string = ','.join(indexes)
    return index_string


def get_jsonld_types_from_collection_type(request, doc_type):
    types_found = []
    try:
        registry_type = request.registry['types'][doc_type]
    except KeyError:
        return [] # no types found
    # add the item_type of this collection if applicable
    if hasattr(registry_type, 'item_type'):
        types_found.append(registry_type.item_type)
    # see if we're dealing with an abstract type
    elif hasattr(registry_type, 'subtypes'):
        subtypes = registry_type.subtypes
        for subtype in subtypes:
            types_found.extend(get_jsonld_types_from_collection_type(request, subtype))
    return types_found


### stupid things to remove; had to add because of other fxns importing

# Update? used in ./batch_download.py
def iter_search_results(context, request):
    return search(context, request, return_generator=True)

# DUMMY FUNCTION. TODO: update ./batch_download.py to use embeds instead of cols
def list_visible_columns_for_schemas(request, schemas):
    columns = OrderedDict()
    for schema in schemas:
        if 'columns' in schema:
            columns.update(OrderedDict(
                (name, obj.get('title'))
                for name,obj in schema['columns'].items() #if name in schema['properties']
            ))
    return columns

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
