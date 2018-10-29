import re
import math
import itertools
from pyramid.view import view_config
from snovault import (
    AbstractCollection,
    TYPES,
    COLLECTIONS
)
from snovault.embed import make_subrequest
from snovault.elasticsearch import ELASTIC_SEARCH
from snovault.elasticsearch.create_mapping import determine_if_is_date_field
from snovault.resource_views import collection_view_listing_db
from snovault.fourfront_utils import get_jsonld_types_from_collection_type
from elasticsearch.helpers import scan
from elasticsearch_dsl import Search
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.security import effective_principals
from urllib.parse import urlencode
from collections import OrderedDict
from copy import deepcopy
import uuid


def includeme(config):
    config.add_route('search', '/search{slash:/?}')
    config.add_route('browse', '/browse{slash:/?}')
    config.add_route('available_facets', '/facets{slash:/?}')
    config.scan(__name__)

sanitize_search_string_re = re.compile(r'[\\\+\-\&\|\!\(\)\{\}\[\]\^\~\:\/\\\*\?]')

@view_config(route_name='search', request_method='GET', permission='search')
def search(context, request, search_type=None, return_generator=False, forced_type='Search', custom_aggregations=None):
    """
    Search view connects to ElasticSearch and returns the results
    """
    types = request.registry[TYPES]
    search_base = normalize_query(request, search_type)
    ### INITIALIZE RESULT.
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

    # get desired frame for this search
    search_frame = request.params.get('frame', 'embedded')

    ### PREPARE SEARCH TERM
    prepared_terms = prepare_search_term(request)

    doc_types = set_doc_types(request, types, search_type)
    schemas = [types[item_type].schema for item_type in doc_types]

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

    # get the fields that will be used as source for the search
    # currently, supports frame=raw/object but live faceting does not work
    # this is okay because the only non-embedded access will be programmatic
    source_fields = sorted(list_source_fields(request, doc_types, search_frame))

    ### GET FILTERED QUERY
    # Builds filtered query which supports multiple facet selection
    search, string_query = build_query(search, prepared_terms, source_fields)

    ### Set sort order
    search = set_sort_order(request, search, prepared_terms, types, doc_types, result)
    # TODO: implement BOOST here?

    ### Set filters
    search, query_filters = set_filters(request, search, result, principals, doc_types, types)

    ### Set starting facets
    facets = initialize_facets(types, doc_types, prepared_terms, schemas)

    ### Adding facets, plus any optional custom aggregations.
    ### Uses 'size' and 'from_' to conditionally skip (no facets if from > 0; no aggs if size > 0).
    search = set_facets(search, facets, query_filters, string_query, types, doc_types, custom_aggregations, size, from_)

    ### Add preference from session, if available
    search_session_id = None
    if request.__parent__ is None and not return_generator and size != 'all': # Probably unnecessary, but skip for non-paged, sub-reqs, etc.
        search_session_id = request.cookies.get('searchSessionID', 'SESSION-' + str(uuid.uuid1()))
        search = search.params(preference=search_session_id)

    ### Execute the query
    if size == 'all':
        es_results = execute_search_for_all_results(search)
    else:
        size_search = search[from_:from_ + size]
        es_results = execute_search(size_search)

    ### Record total number of hits
    result['total'] = total = es_results['hits']['total']
    result['facets'] = format_facets(es_results, facets, total, search_frame)
    result['aggregations'] = format_extra_aggregations(es_results)

    # Add batch actions
    # TODO: figure out exactly what this does. Provide download URLs?
    # Implement later
    # result.update(search_result_actions(request, doc_types, es_results))

    ### Add all link for collections
    if size not in (None, 'all') and size < result['total']:
        params = [(k, v) for k, v in request.params.items() if k != 'limit']
        params.append(('limit', 'all'))
        if context:
            result['all'] = '%s?%s' % (request.resource_path(context), urlencode(params))

    # add actions (namely 'add')
    result['actions'] = get_collection_actions(request, types[doc_types[0]])

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
    graph = format_results(request, es_results['hits']['hits'], search_frame)

    if request.__parent__ is not None or return_generator:
        if return_generator:
            return graph
        else:
            result['@graph'] = list(graph)
            return result

    result['@graph'] = list(graph)
    if search_session_id: # Is 'None' if e.g. limit=all
        request.response.set_cookie('searchSessionID', search_session_id) # Save session ID for re-requests / subsequent pages.
    return result


@view_config(route_name='browse', request_method='GET', permission='search')
def browse(context, request, search_type='ExperimentSetReplicate', return_generator=False):
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
    schemas = (types[item_type].schema for item_type in doc_types)
    principals = effective_principals(request)
    prepared_terms = prepare_search_term(request)
    facets = initialize_facets(types, doc_types, request.has_permission('search_audit'), principals, prepared_terms, schemas)

    ### Mini version of format_facets
    result = []
    for field, facet in facets:
        result.append({
            'field': field,
            'title': facet.get('title', field)
        })

    return result


def get_collection_actions(request, type_info):
    collection = request.registry[COLLECTIONS].get(type_info.name)
    if collection and hasattr(collection, 'actions'):
        return collection.actions(request)
    else:
        return None


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


def get_all_subsequent_results(initial_search_result, search, extra_requests_needed_count, size_increment):
    from_ = 0
    while extra_requests_needed_count > 0:
        #print(str(extra_requests_needed_count) + " requests left to get all results.")
        from_ = from_ + size_increment
        subsequent_search = search[from_:from_ + size_increment]
        subsequent_search_result = execute_search(subsequent_search)
        extra_requests_needed_count -= 1
        for hit in subsequent_search_result['hits'].get('hits', []):
            yield hit

def execute_search_for_all_results(search):
    size_increment = 100 # Decrease this to like 5 or 10 to test.

    first_search = search[0:size_increment] # get aggregations from here
    es_result = execute_search(first_search)

    total_results_expected = es_result['hits'].get('total',0)
    extra_requests_needed_count = int(math.ceil(total_results_expected / size_increment)) - 1 # Decrease by 1 (first es_result already happened)

    if extra_requests_needed_count > 0:
        es_result['hits']['hits'] = itertools.chain(es_result['hits']['hits'], get_all_subsequent_results(es_result, search, extra_requests_needed_count, size_increment))
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
    # Clear Filters path -- make a path that clears all non-datatype filters
    # and leaves in search query, if present
    seach_query_specs = request.params.getall('q')
    seach_query_url = urlencode([("q", seach_query) for seach_query in seach_query_specs])
    # types_url will always be present (always >=1 doc_type)
    types_url = urlencode([("type", typ) for typ in doc_types])

    clear_qs = types_url or ''
    if seach_query_url:
        clear_qs += '&' + seach_query_url
    current_search_sort = request.params.getall('sort')
    current_search_sort_url = urlencode([("sort", s) for s in current_search_sort])
    if current_search_sort_url:
        clear_qs += '&' + current_search_sort_url
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
                for k, v in request.params.items() if not (k == 'type' and types.all.get('Item' if v == '*' else v) is ti)
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
        elif field == 'q': # searched string has field 'q'
            # people shouldn't provide multiple queries, but if they do,
            # combine them with AND logic
            if 'q' in prepared_terms:
                join_list = [prepared_terms['q'], val]
                prepared_terms['q'] = ' AND '.join(join_list)
            else:
                prepared_terms['q'] = val
        elif field not in ['type', 'frame', 'format', 'limit', 'sort', 'from', 'field', 'before', 'after']:
            if 'embedded.' + field not in prepared_terms.keys():
                prepared_terms['embedded.' + field] = []
            prepared_terms['embedded.' + field].append(val)
    if 'q' in prepared_terms:
        prepared_terms['q'] = process_query_string(prepared_terms['q'])
    return prepared_terms


def process_query_string(search_query):
    from antlr4 import IllegalStateException
    from lucenequery.prefixfields import prefixfields
    from lucenequery import dialects
    if search_query == '*':
        return search_query
    # avoid interpreting slashes as regular expressions
    search_query = search_query.replace('/', r'\/')
    try:
        query = prefixfields('embedded.', search_query, dialects.elasticsearch)
    except (IllegalStateException):
        msg = "Invalid query: {}".format(search_query)
        raise HTTPBadRequest(explanation=msg)
    else:
        return query.getText()


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


def list_source_fields(request, doc_types, frame):
    """
    Returns set of fields that are requested by user or default fields.
    These fields are used to further limit the results from the search.
    Note that you must provide the full fieldname with embeds, such as:
    'field=biosample.biosource.individual.organism.name' and not just
    'field=name'
    Add audit to this so we can look at that as well
    """
    fields_requested = request.params.getall('field')
    if fields_requested:
        fields = ['embedded.@id', 'embedded.@type']
        for field in fields_requested:
            fields.append('embedded.' + field)
    elif frame in ['embedded', 'object', 'raw']:
        if frame != 'embedded':
            # frame=raw corresponds to 'properties' in ES
            if frame == 'raw':
                frame = 'properties'
            # let embedded be searched as well (for faceting)
            fields = ['embedded.*', frame + '.*']
        else:
            fields = [frame + '.*']
    else:
        fields = ['embedded.*']
    return fields


def build_query(search, prepared_terms, source_fields):
    """
    Prepare the query within the Search object.
    """
    query_info = {}
    string_query = None
    # set _source fields for the search
    search = search.source(list(source_fields))
    # prepare the query from prepared_terms
    for field, value in prepared_terms.items():
        if field == 'q':
            query_info['query'] = value
            query_info['lenient'] = True
            query_info['default_operator'] = 'AND'
            query_info['default_field'] = '_all'
            break
    if query_info != {}:
        string_query = {'must': {'query_string': query_info}}
        query_dict = {'query': {'bool': string_query}}
    else:
        query_dict = {'query': {'bool':{}}}
    search.update_from_dict(query_dict)
    return search, string_query


def set_sort_order(request, search, search_term, types, doc_types, result):
    """
    sets sort order for elasticsearch results
    example: /search/?type=Biosource&sort=display_title
    will sort by display_title in ascending order. To set descending order,
    use the "-" flag: sort_by=-date_created.
    Sorting is done alphatbetically, case sensitive by default.
    TODO: add a schema flag for case sensitivity/insensitivity?

    ES5: simply pass in the sort OrderedDict into search.sort
    """
    sort = OrderedDict()
    result_sort = OrderedDict()
    if len(doc_types) == 1:
        type_schema = types[doc_types[0]].schema
    else:
        type_schema = None

    def add_to_sort_dict(requested_sort):
        if requested_sort.startswith('-'):
            name = requested_sort[1:]
            order = 'desc'
        else:
            name = requested_sort
            order = 'asc'
        sort_schema = type_schema.get('properties', {}).get(name) if type_schema else None
        if sort_schema:
            sort_type = sort_schema.get('type')
        else:
            sort_type = 'string'

        # ES type != schema types
        if sort_type == 'integer':
            sort['embedded.' + name] = result_sort[name] = {
                'order': order,
                'unmapped_type': 'long',
                'missing': '_last'
            }
        elif sort_type == 'number':
            sort['embedded.' + name] = result_sort[name] = {
                'order': order,
                'unmapped_type': 'float',
                'missing': '_last'
            }
        else:
            # fallback case, applies to all string type:string fields
            sort['embedded.' + name + '.lower_case_sort.keyword'] = result_sort[name] = {
                'order': order,
                'unmapped_type': 'keyword',
                'missing': '_last'
            }

    # Prefer sort order specified in request, if any
    requested_sorts = request.params.getall('sort')
    if requested_sorts:
        for rs in requested_sorts:
            add_to_sort_dict(rs)

    text_search = search_term.get('q')

    # Otherwise we use a default sort only when there's no text search to be ranked
    if not sort and (text_search == '*' or not text_search):
        # If searching for a single type, look for sort options in its schema
        if type_schema:
            if 'sort_by' in type_schema:
                for k, v in type_schema['sort_by'].items():
                    # Should always sort on raw field rather than analyzed field
                    # OR search on lower_case_sort for case insensitive results
                    sort['embedded.' + k + '.lower_case_sort.keyword'] = result_sort[k] = v
        # Default is most recent first, then alphabetical by label
        if not sort:
            sort['embedded.date_created.raw'] = result_sort['date_created'] = {
                'order': 'desc',
                'unmapped_type': 'keyword',
            }
            sort['embedded.label.raw'] = result_sort['label'] = {
                'order': 'asc',
                'missing': '_last',
                'unmapped_type': 'keyword',
            }
    elif not sort and text_search and text_search != '*':
        search = search.sort(                   # Multi-level sort. See http://www.elastic.co/guide/en/elasticsearch/guide/current/_sorting.html#_multilevel_sorting & https://stackoverflow.com/questions/46458803/python-elasticsearch-dsl-sorting-with-multiple-fields
            { '_score' : { "order": "desc" } },
            { 'embedded.date_created.raw' : { 'order': 'desc', 'unmapped_type': 'keyword' }, 'embedded.label.raw' : { 'order': 'asc',  'unmapped_type': 'keyword', 'missing': '_last' } },
            { '_uid' : { 'order': 'asc' } }     # 'embedded.uuid.raw' (instd of _uid) sometimes results in 400 bad request : 'org.elasticsearch.index.query.QueryShardException: No mapping found for [embedded.uuid.raw] in order to sort on'
        )
        result['sort'] = result_sort = { '_score' : { "order" : "desc" } }
        return search

    if sort and result_sort:
        result['sort'] = result_sort
        search = search.sort(sort)
    return search


def set_filters(request, search, result, principals, doc_types, types):
    """
    Sets filters in the query
    """

    # these next two dictionaries should each have keys equal to query_field
    # and values: must_terms: [<list of terms>], must_not_terms: [<list of terms>], add_no_value: True/False/None
    field_filters = {
        'principals_allowed.view' : {
            'must_terms': principals,
            'must_not_terms': [],
            'add_no_value': None
        },
        'embedded.@type.raw' : {
            'must_terms': doc_types,
            'must_not_terms': [],
            'add_no_value': None
        },
        'embedded.status.raw' : {
            'must_terms': [],
            'must_not_terms': [],
            'add_no_value': None
        }
    }

    range_filters = {}

    # Exclude status=deleted Items unless explicitly requested/filtered-in.
    if 'deleted' not in request.params.getall('status'):
        field_filters['embedded.status.raw']['must_not_terms'].append('deleted')
    if 'replaced' not in request.params.getall('status'):
        field_filters['embedded.status.raw']['must_not_terms'].append('replaced')



    for field, term in request.params.items():
        not_field = False # keep track if query is NOT (!)
        exists_field = False # keep track of null values
        range_type = False # If we determine is a range request (field.to, field.from), will be populated with string 'date' or 'numerical'
        range_direction = None
        if field in ['limit', 'y.limit', 'x.limit', 'mode', 'redirected_from',
                     'format', 'frame', 'datastore', 'field', 'region', 'genome',
                     'sort', 'from', 'referrer', 'q']:
            continue
        elif field == 'type' and term != 'Item':
            continue
        elif term == 'No value':
            exists_field = True


        # Check for date or numerical range filters
        if (len(field) > 3 and field[-3:] == '.to') or (len(field) > 5 and field[-5:] == '.from'):
            if field[-3:] == '.to':
                f_field = field[:-3]
                range_direction = "lte"
            else:
                f_field = field[:-5]
                range_direction = "gte"
            # The field schema below will only be found for top-level fields.
            # If schema for field is not found (and range_type thus not set), then treated as ordinary term filter (likely will get 0 results)
            field_schema = schema_for_field(f_field, types, doc_types)
            if field_schema:
                range_type = 'date' if determine_if_is_date_field(f_field, field_schema) else 'numerical'


        # Add filter to result
        qs = urlencode([
            (k.encode('utf-8'), v.encode('utf-8'))
            for k, v in request.params.items()
            if (k != field or v != term)
        ])
        remove_path = '{}?{}'.format(request.path, qs)

        # default to searching type=Item rather than empty filter path
        if remove_path[-1] == '?':
            remove_path += 'type=Item'

        result['filters'].append({
            'field' : field,
            'term'  : term,
            'remove': remove_path
        })

        if field == 'searchTerm':
            continue


        # handle NOT
        elif field.endswith('!'):
            field = field[:-1]
            not_field = True

        # Add filter to query
        if range_type and f_field and range_type in ('date', 'numerical'):
            query_field = 'embedded.' + f_field
        elif field.startswith('audit'):
            query_field = field + '.raw'
        elif field == 'type':
            query_field = 'embedded.@type.raw'
        else:
            query_field = 'embedded.' + field + '.raw'


        if range_type:

            if query_field not in range_filters:
                range_filters[query_field] = {}
                if range_type == 'date':
                    range_filters[query_field]['format'] = 'yyyy-MM-dd HH:mm'

            if range_direction in ('gt', 'gte', 'lt', 'lte'):

                if len(term) == 10:
                    # Correct term to have hours, e.g. 00:00 or 23:59, if not otherwise supplied.
                    if range_direction == 'gt' or range_direction == 'lte':
                        term += ' 23:59'
                    elif range_direction == 'gte' or range_direction == 'lt':
                        term += ' 00:00'

                if range_filters[query_field].get(range_direction) is None:
                    range_filters[query_field][range_direction] = term
                else:
                    # If have a value already (e.g. multiple ranges selected), choose the widening option.
                    if range_direction == 'gt' or range_direction == 'gte':
                        if term < range_filters[query_field][range_direction]:
                            range_filters[query_field][range_direction] = term
                    elif range_direction == 'lt' or range_direction == 'lte':
                        if term > range_filters[query_field][range_direction]:
                            range_filters[query_field][range_direction] = term
        else:
            if query_field not in field_filters:
                field_filters[query_field] = {
                    'must_terms': [],
                    'must_not_terms': [],
                    'add_no_value': None
                }

            # handle case of filtering for null values
            if exists_field:
                # the value below is True when we want to include 'No value' as a filter
                field_filters[query_field]['add_no_value'] = False if not_field else True
                continue

            if not_field:
                field_filters[query_field]['must_not_terms'].append(term)
            else:
                field_filters[query_field]['must_terms'].append(term)

    must_filters = []
    must_not_filters = []
    for query_field, filters in field_filters.items():
        must_terms = {'terms': {query_field: filters['must_terms']}} if filters['must_terms'] else {}
        must_not_terms = {'terms': {query_field: filters['must_not_terms']}} if filters['must_not_terms'] else {}
        if filters['add_no_value'] is True:
            # add to must_not in an OR case, which is equivalent to filtering on 'No value'
            should_arr = [must_terms] if must_terms else []
            should_arr.append({'bool': {'must_not': {'exists': {'field': query_field}}}})
            must_filters.append({'bool': {'should': should_arr}})
        elif filters['add_no_value'] is False:
            # add to must_not in an OR case, which is equivalent to filtering on '! No value'
            should_arr = [must_terms] if must_terms else []
            should_arr.append({'exists': {'field': query_field}})
            must_filters.append({'bool': {'should': should_arr}})
        else: # no filtering on 'No value'
            if must_terms: must_filters.append(must_terms)
        if must_not_terms: must_not_filters.append(must_not_terms)

    # lastly, add range limits to filters if given
    for range_field, range_def in range_filters.items():
        must_filters.append({
            'range' : { range_field : range_def }
        })

    # To modify filters of elasticsearch_dsl Search, must call to_dict(),
    # modify that, then update from the new dict
    prev_search = search.to_dict()
    # initialize filter hierarchy
    final_filters = {'bool': {'must': must_filters, 'must_not': must_not_filters}}
    prev_search['query']['bool']['filter'] = final_filters
    search.update_from_dict(prev_search)

    return search, final_filters


def initialize_facets(types, doc_types, prepared_terms, schemas):
    """
    Initialize the facets used for the search. If searching across multiple
    doc_types, only use the default 'Data Type' and 'Status' facets.
    Add facets for custom url filters whether or not they're in the schema

        :param types:          Instance of TypesTool from app registry.
        :type  types:          snovault.TypesTool
        :param doc_types:      Item types (@type) for which we are performing a search for.
        :type  doc_types:      List of strings
        :param prepared_terms: Lists of terms to match in ElasticSearch, keyed by ElasticSearch field name.
        :type  prepared_terms: dict
        :param schemas:        List of schemas for our doc_types.
        :type  schemas:        List of OrderedDicts
        :returns: List of tuples containing (0) ElasticSearch-formatted field name (e.g. `embedded.status`) and (1) list of terms for it.
    """

    facets = [
        # More facets will be appended to this list from item schema plus from any currently-active filters (as requested in URI params).
        ('type', {'title': 'Data Type'})
    ]
    append_facets = [
        # Facets which will be appended after those which are in & added to `facets`
        ('status', {'title': 'Status'}),

        # TODO: Re-enable below line if/when 'range' URI param queries for date & numerical fields are implemented.
        # ('date_created', {'title': 'Date Created', 'hide_from_view' : True, 'aggregation_type' : 'date_histogram' })
    ]
    audit_facets = [
        ('audit.ERROR.category', {'title': 'Audit category: ERROR'}),
        ('audit.NOT_COMPLIANT.category', {'title': 'Audit category: NOT COMPLIANT'}),
        ('audit.WARNING.category', {'title': 'Audit category: WARNING'}),
        ('audit.INTERNAL_ACTION.category', {'title': 'Audit category: DCC ACTION'})
    ]
    # hold disabled facets from schema; we also want to remove these from the prepared_terms facets
    disabled_facets = []

    # Add facets from schema if one Item type is defined.
    # Also, conditionally add extra appendable facets if relevant for type from schema.
    if len(doc_types) == 1 and doc_types[0] != 'Item':
        current_type_schema = types[doc_types[0]].schema
        if 'facets' in current_type_schema:
            schema_facets = OrderedDict(current_type_schema['facets'])
            for schema_facet in schema_facets.items():
                if schema_facet[1].get('disabled', False):
                    disabled_facets.append(schema_facet[0])
                    continue # Skip disabled facets.
                facets.append(schema_facet)

    ## Add facets for any non-schema ?field=value filters requested in the search (unless already set)
    used_facets = [ facet[0] for facet in facets + append_facets ]
    for field in prepared_terms:
        if field.startswith('embedded'):
            split_field = field.strip().split('.') # e.g. ['embedded', 'experiments_in_set', 'files', 'file_size', 'from']
            use_field = '.'.join(split_field[1:])
            aggregation_type = 'terms' # default for all non-schema facets

            # use the last part of the split field to get the title
            title_field = split_field[-1]
    
            if title_field in used_facets or title_field in disabled_facets:
                continue  # Cancel if already in facets or is disabled

            if title_field == 'from' or title_field == 'to':
                # Range filters are only supported on root-level schema fields, e.g. ['embedded', >>'date_created'<<, 'from']
                if len(split_field) == 3:
                    f_field = split_field[-2]
                    field_schema = schema_for_field(f_field, types, doc_types)
                    if field_schema:
                        title_field = f_field
                        use_field = '.'.join(split_field[1:-1])
                        aggregation_type = 'stats'

            for schema in schemas:
                if title_field in schema['properties']:
                    title_field = schema['properties'][title_field].get('title', title_field)
                    break

            facet_tuple = (use_field, {'title': title_field, 'aggregation_type' : aggregation_type})

            if aggregation_type != 'terms': # Temporary until we handle these better on front-end
                facet_tuple[1]['hide_from_view'] = True

            facets.append(facet_tuple)

    ## Append additional facets (status, audit, ...) at the end of list unless were already added via schemas, etc.
    used_facets = [ facet[0] for facet in facets ] # Reset this var
    for ap_facet in append_facets + audit_facets:
        if ap_facet[0] not in used_facets:
            facets.append(ap_facet)
        else: # Update with better title if not already defined from e.g. requested filters.
            existing_facet_index = used_facets.index(ap_facet[0])
            if facets[existing_facet_index][1].get('title') in (None, facets[existing_facet_index][0]):
                facets[existing_facet_index][1]['title'] = ap_facet[1]['title']

    return facets


def schema_for_field(field, types, doc_types):
    '''Filter down schemas to the one for our field'''
    schema = types[doc_types[0]].schema
    if schema and schema.get('properties') is not None:
        return schema['properties'].get(field, None)
    return None

def is_linkto_or_object_array_root_field(field, types, doc_types):
    '''Not used currently. May be useful for if we want to enabled "type" : "nested" mappings on lists of dictionaries'''
    schema = types[doc_types[0]].schema
    field_root = field.split('.')[0]
    fr_schema = (schema and schema.get('properties', {}).get(field_root, None)) or None
    if fr_schema and fr_schema['type'] == 'array' and (fr_schema['items'].get('linkTo') is not None or fr_schema['items']['type'] == 'object'):
        return True
    return False

def generate_filters_for_terms_agg_from_search_filters(query_field, search_filters, string_query):
    '''
    We add a copy of our filters to each facet, minus that of
    facet's field itself so that we can get term counts for other terms filters.
    And be able to filter w/ it.

    Remove filters from fields they apply to.
    For example, the 'biosource_type' aggs should not have any
    biosource_type filter in place.
    Handle 'must' and 'must_not' filters separately

    Returns
        Copy of search_filters, minus filter for current query_field (if one set).
    '''

    facet_filters = deepcopy(search_filters['bool'])

    for filter_type in ['must', 'must_not']:
        if search_filters['bool'][filter_type] == []:
            continue
        for active_filter in search_filters['bool'][filter_type]:  # active_filter => e.g. { 'terms' : { 'embedded.@type.raw': ['ExperimentSetReplicate'] } }
            if 'bool' in active_filter and 'should' in active_filter['bool']:
                # handle No value case
                inner_bool = None
                inner_should = active_filter.get('bool').get('should', [])
                for or_term in inner_should:
                    # this may be naive, but assume first non-terms
                    # filter is the No value quqery
                    if 'terms' in or_term:
                        continue
                    else:
                        inner_bool = or_term
                        break
                if 'exists' in inner_bool:
                    compare_field = inner_bool['exists'].get('field')
                else:
                    # attempt to get the field from the alternative No value syntax
                    compare_field = inner_bool.get('bool', {}).get('must_not', {}).get('exists', {}).get('field')
                if compare_field == query_field and query_field != 'embedded.@type.raw':
                    facet_filters[filter_type].remove(active_filter)

            if 'terms' in active_filter:
                # there should only be one key here
                for compare_field in active_filter['terms'].keys():
                    # remove filter for a given field for that facet
                    # skip this for type facet (field = 'type')
                    # since we always want to include that filter.
                    if compare_field == query_field and query_field != 'embedded.@type.raw':
                        facet_filters[filter_type].remove(active_filter)

            elif 'range' in active_filter:
                for compare_field in active_filter['range'].keys():
                    # Do same as for terms
                    if compare_field == query_field:
                        facet_filters[filter_type].remove(active_filter)

    # add the string_query, if present, to the bool term with facet_filters
    if string_query and string_query['must']:
        # combine statements within 'must' for each
        facet_filters['must'].append(string_query['must'])

    return facet_filters


def set_facets(search, facets, search_filters, string_query, types, doc_types, custom_aggregations=None, size=25, from_=0):
    """
    Sets facets in the query as ElasticSearch aggregations, with each aggregation to be
    filtered by search_filters minus filter affecting facet field in order to get counts
    for other facet term options.
    ES5 - simply sets aggs by calling update_from_dict after adding them in

        :param facets:         Facet field (0) in object dot notation, and a dict or OrderedDict with title property (1).
        :type  facets:         List of tuples.
        :param search_filters: Dict of filters which are set for the ES query in set_filters
        :param string_query:   Dict holding the query_string used in the search
    """

    if from_ != 0:
        return search

    aggs = OrderedDict()

    for field, facet in facets: # E.g. 'type','experimentset_type','experiments_in_set.award.project', ...

        field_schema = schema_for_field(field, types, doc_types)
        is_date_field = field_schema and determine_if_is_date_field(field, field_schema)
        is_numerical_field = field_schema and field_schema['type'] in ("integer", "float", "number")

        if field == 'type':
            query_field = 'embedded.@type.raw'
        elif field.startswith('audit'):
            query_field = field + '.raw'
        elif facet.get('aggregation_type') in ('stats', 'date_histogram', 'histogram', 'range'):
            query_field = 'embedded.' + field
        else:
            query_field = 'embedded.' + field + '.raw'


        ## Create the aggregation itself, extend facet with info to pass down to front-end
        agg_name = field.replace('.', '-')

        if facet.get('aggregation_type') == 'stats':

            if is_date_field:
                facet['field_type'] = 'date'
            elif is_numerical_field:
                facet['field_type'] = 'number'

            aggs[agg_name] = {
                'aggs': {
                    agg_name : {
                        'stats' : {
                            'field' : query_field
                        }
                    }
                },
                'filter': search_filters
            }

        else: # Default -- facetable terms

            facet['aggregation_type'] = 'terms'
            facet_filters = generate_filters_for_terms_agg_from_search_filters(query_field, search_filters, string_query)
            term_aggregation = {
                "terms" : {
                    'size'    : 100,            # Maximum terms returned (default=10); see https://github.com/10up/ElasticPress/wiki/Working-with-Aggregations
                    'field'   : query_field,
                    'missing' : facet.get("missing_value_replacement", "No value")
                }
            }

            aggs[agg_name] = {
                'aggs': {
                    agg_name : term_aggregation
                },
                'filter': {'bool': facet_filters},
            }

    # to achieve OR behavior within facets, search among GLOBAL results,
    # not just returned ones. to do this, wrap aggs in ['all_items']
    # and add "global": {} to top level aggs query
    # see elasticsearch global aggs for documentation (should be ES5 compliant)
    search_as_dict = search.to_dict()
    search_as_dict['aggs'] = {
        'all_items': {
            'global': {},
            'aggs': aggs
        }
    }

    if size == 0:
        # Only perform aggs if size==0 requested, to improve performance for search page queries.
        # We do currently have (hidden) monthly date histogram facets which may yet to be utilized for common size!=0 agg use cases.
        set_additional_aggregations(search_as_dict, types, doc_types, custom_aggregations)

    search.update_from_dict(search_as_dict)
    return search


def set_additional_aggregations(search_as_dict, types, doc_types, extra_aggregations=None):
    '''
    Per-type aggregations may be defined in schemas. Apply them OUTSIDE of globals so they act on our current search filters.
    Warning: `search_as_dict` is modified IN PLACE.
    '''

    schema = types[doc_types[0]].schema

    if schema.get('aggregations'):
        for schema_agg_name in schema['aggregations'].keys():
            if schema_agg_name == 'all_items':
                raise Exception('all_items is a reserved agg name and not allowed as an extra aggregation name.')
            search_as_dict['aggs'][schema_agg_name] = schema['aggregations'][schema_agg_name]

    if extra_aggregations:
        for extra_agg_name in extra_aggregations.keys():
            if extra_agg_name == 'all_items':
                raise Exception('all_items is a reserved agg name and not allowed as an extra aggregation name.')
            search_as_dict['aggs'][extra_agg_name] = extra_aggregations[extra_agg_name]

    return search_as_dict

def execute_search(search):
    """
    Use a general try-except here for now
    """
    try:
        es_results = search.execute().to_dict()
    except:
        raise HTTPBadRequest(explanation='Failed search query')
    return es_results


def format_facets(es_results, facets, total, search_frame='embedded'):
    """
    Format the facets for the final results based on the es results
    These are stored within 'aggregations' of the result.

    If the frame for the search != embedded, return no facets
    """
    result = []
    if search_frame != 'embedded':
        return result

    # Loading facets in to the results
    if 'aggregations' not in es_results:
        return result

    aggregations = es_results['aggregations']['all_items']
    used_facets = set()
    for field, facet in facets:
        result_facet = {
            'field' : field,
            'title' : facet.get('title', field),
            'total' : 0
            # To be added depending on facet['aggregation_type']: 'terms', 'min', 'max', 'min_as_string', 'max_as_string', ...
        }
        result_facet.update({ k:v for k,v in facet.items() if k not in result_facet.keys() })
        used_facets.add(field)
        field_agg_name = field.replace('.', '-')

        if field_agg_name in aggregations:
            result_facet['total'] = aggregations[field_agg_name]['doc_count']
            if facet['aggregation_type'] == 'stats':
                # Used for fields on which can do range filter on, to provide min + max bounds
                for k in aggregations[field_agg_name][field_agg_name].keys():
                    result_facet[k] = aggregations[field_agg_name][field_agg_name][k]
            else:
                # Default - terms, range, or histogram buckets.
                result_facet['terms'] = aggregations[field_agg_name][field_agg_name]['buckets']
                # Choosing to show facets with one term for summary info on search it provides
                if len(result_facet.get('terms', [])) < 1:
                    continue

            if len(aggregations[field_agg_name].keys()) > 2:
                result_facet['extra_aggs'] = { k:v for k,v in aggregations[field_agg_name].items() if k not in ('doc_count', field_agg_name) }

        result.append(result_facet)

    return result

def format_extra_aggregations(es_results):
    if 'aggregations' not in es_results:
        return {}
    return { k:v for k,v in es_results['aggregations'].items() if k != 'all_items' }


def format_results(request, hits, search_frame):
    """
    Loads results to pass onto UI
    For now, add audits to the results so we can facet/not facet on audits
    """
    fields_requested = request.params.getall('field')
    if fields_requested:
        frame = 'embedded'
    elif search_frame:
        frame = search_frame
    else:
        frame = 'embedded'

    if frame in ['embedded', 'object', 'raw']:
        # transform 'raw' to 'properties', which is what is stored in ES
        if frame == 'raw':
            frame = 'properties'
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


def make_search_subreq(request, path):
    subreq = make_subrequest(request, path)
    if hasattr(request, "_stats"):
        subreq._stats = request._stats
    subreq.registry = request.registry
    if hasattr(request, "context"):
        subreq.context = request.context
    else:
        subreq.context = None
    subreq.headers['Accept'] = 'application/json'
    return subreq

DEFAULT_BROWSE_PARAM_LISTS = {
    'type'                  : ["ExperimentSetReplicate"],
    'experimentset_type'    : ['replicate'],
    'award.project'         : ['4DN']
}

def get_iterable_search_results(request, search_path='/search/', param_lists=None, **kwargs):
    '''
    Loops through search results, returns 100 (or search_results_chunk_row_size) results at a time. Pass it through itertools.chain.from_iterable to get one big iterable of results.
    TODO: Maybe make 'limit=all', and instead of calling invoke_subrequest(subrequest), instead call iter_search_results!

    :param request: Only needed to pass to do_subreq to make a subrequest with.
    :param search_path: Root path to call, defaults to /search/ (can also use /browse/).
    :param param_lists: Dictionary of param:lists_of_vals which is converted to URL query.
    :param search_results_chunk_row_size: Amount of results to get per chunk. Default should be fine.
    '''
    if param_lists is None:
        param_lists = deepcopy(DEFAULT_BROWSE_PARAM_LISTS)
    else:
        param_lists = deepcopy(param_lists)
    param_lists['limit'] = ['all']
    param_lists['from'] = [0]
    param_lists['sort'] = param_lists.get('sort','uuid')
    subreq = make_search_subreq(request, '{}?{}'.format(search_path, urlencode(param_lists, True)) )
    return iter_search_results(None, subreq, **kwargs)


# Update? used in ./batch_download.py
def iter_search_results(context, request, **kwargs):
    return search(context, request, return_generator=True, **kwargs)

def list_visible_columns_for_schemas(request, schemas):
    columns = OrderedDict()
    for schema in schemas:
        if 'columns' in schema:
            schema_columns = OrderedDict(schema['columns'])
            for name,obj in schema_columns.items():
                columns[name] = obj
    return columns

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
