import re
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
    # config.add_route('report', '/report{slash:/?}')
    # config.add_route('matrix', '/matrix{slash:/?}')
    # config.add_route('available_facets', '/facets{slash:/?}')
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
    # These are the fields I need to fill
    result = {
        '@context': request.route_path('jsonld_context'),
        '@id': '/' + forced_type.lower() + '/' + search_base,
        '@type': [forced_type],
        'title': forced_type,
        'filters': [],
        'columns': [],  # will eliminate
        'facets': [],
        '@graph': [],
        'notification': '',
        'views': [],  # probably could eliminate
        'sort': {}  # probably could eliminate
    }
    principals = effective_principals(request)

    es = request.registry[ELASTIC_SEARCH]
    es_index = request.registry.settings['snovault.elasticsearch.index']
    search_audit = request.has_permission('search_audit')

    from_, size = 0, 25

    ### PREPARE SEARCH TERM
    # search_term = prepare_search_term(request)
    # Using * is okay for now because we haven't implemented any specific
    # searching (i.e. the search bar)
    # TODO: adapt prepare_search_term when specific searching is needed
    search_term = '*'

    doc_types = set_doc_types(request, types, search_type)

    ### ADD VIEWS AND FILTERS TO RESULT
    # use result['filters'] and result['views']

    ### GET SEARCH FIELDS
    # we probably don't need this. Searching should be schemaless
    # search_fields, highlights = get_search_fields(request, doc_types)
    search_fields = {'uuid'}

    ### GET FILTERED QUERY
    # Builds filtered query which supports multiple facet selection
    query = get_filtered_query(search_term,
                               search_fields,
                               sorted(list_result_fields(request, doc_types)),
                               principals,
                               doc_types)
    # TODO: decide if the schemas are useful
    schemas = [types[doc_type].schema for doc_type in doc_types]

    # DON'T NEED COLUMNS b/c metadata is already precisely embedded
    # columns = list_visible_columns_for_schemas(request, schemas)
    # if columns:
    #     result['columns'] = columns


    ### Set sort order
    # has_sort = set_sort_order(request, search_term, types, doc_types, query, result)
    # TODO: implement BOOST here? For now, don't set a sort order
    has_sort = False

    ### Setting filters
    # TODO: implement (see set_filters fxn in this file)
    # used_filters = set_filters(request, query, result)
    used_filters = {}

    ### Set starting facets
    facets = initialize_facets(types, doc_types, search_audit, principals)

    ### Adding facets to the query
    query['aggs'] = set_facets(facets, used_filters, principals, doc_types)

    # TODO: Implement search constraints based on size variable
    # # Decide whether to use scan for results.
    # do_scan = size is None or size > 1000
    #
    # # Execute the query
    # if do_scan:
    #     query['size'] = 0
    #     es_results = es.search(body=query, index=es_index)
    #     # es_results = es.search(body=query, index=es_index, search_type='count')
    # else:
    #     es_results = es.search(body=query, index=es_index, from_=from_, size=size)
    es_results = es.search(body=query, index=es_index, from_=from_, size=size)

    # record total number of hits
    result['total'] = total = es_results['hits']['total']

    schemas = (types[item_type].schema for item_type in doc_types)
    result['facets'] = format_facets(
        es_results, facets, used_filters, schemas, total)

    # Add batch actions
    # TODO: figure out exactly what this does. Provide download URLs?
    # Implement later
    # result.update(search_result_actions(request, doc_types, es_results))

    # Add all link for collections
    if size is not None and size < result['total']:
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
    # import pdb; pdb.set_trace()
    return search(context, request, search_type, return_generator, forced_type='Browse')


def normalize_query(request):
    types = request.registry[TYPES]
    fixed_types = (
        (k, types[v].name if k == 'type' and v in types else v)
        for k, v in request.params.items()
    )
    qs = urlencode([
        (k.encode('utf-8'), v.encode('utf-8'))
        for k, v in fixed_types
    ])
    return '?' + qs if qs else ''


def set_doc_types(request, types, search_type):
    """
    Set the type of documents resulting from the search; order and check for
    invalid types as well.
    """
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
    Returns set of fields that are requested by user or default fields
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
def get_filtered_query(term, search_fields, result_fields, principals, doc_types):
    ### FOR ES1
    return {
        'query': {
            'query_string': {
                'query': term,
                'fields': search_fields,
                'default_operator': 'AND'
            }
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
    ### FOR ES5
    # return {
    #     'query': {
    #         'simple_query_string': {
    #             'query': term,
    #             'fields': ["_all"],
    #             'default_operator': 'AND'
    #         }
    #     },
    #     'filter': {
    #         'and': {
    #             'filters': [
    #                 {
    #                     'terms': {
    #                         'principals_allowed.view': principals
    #                     }
    #                 },
    #                 {
    #                     'terms': {
    #                         'embedded.@type.raw': doc_types
    #                     }
    #                 }
    #             ]
    #         }
    #     },
    #     '_source': list(result_fields),
    # }


# TODO: Refine this fxn. Basically just setting the filters used in Result
def set_filters(request, query, result):
    """
    Sets filters in the query
    """
    query_filters = query['filter']['and']['filters']
    used_filters = {}
    for field, term in request.params.items():
        if field in ['type', 'limit', 'y.limit', 'x.limit', 'mode', 'annotation',
                     'format', 'frame', 'datastore', 'field', 'region', 'genome',
                     'sort', 'from', 'referrer']:
            continue

        # Add filter to result
        qs = urlencode([
            (k.encode('utf-8'), v.encode('utf-8'))
            for k, v in request.params.items() if v != term
        ])
        result['filters'].append({
            'field': field,
            'term': term,
            'remove': '{}?{}'.format(request.path, qs)
        })

        if field == 'searchTerm':
            continue

        # Add filter to query
        if field.startswith('audit'):
            query_field = field
        else:
            query_field = 'embedded.' + field + '.raw'

        if field.endswith('!'):
            if field not in used_filters:
                # Setting not filter instead of terms filter
                query_filters.append({
                    'not': {
                        'terms': {
                            'embedded.' + field[:-1] + '.raw': [term],
                        }
                    }
                })
                query_terms = used_filters[field] = []
            else:
                query_filters.remove({
                    'not': {
                        'terms': {
                            'embedded.' + field[:-1] + '.raw': used_filters[field]
                        }
                    }
                })
                used_filters[field].append(term)
                query_filters.append({
                    'not': {
                        'terms': {
                            'embedded.' + field[:-1] + '.raw': used_filters[field]
                        }
                    }
                })
        else:
            if field not in used_filters:
                query_terms = used_filters[field] = []
                query_filters.append({
                    'terms': {
                        query_field: query_terms,
                    }
                })
            else:
                query_filters.remove({
                    'terms': {
                        query_field: used_filters[field]
                    }
                })
                used_filters[field].append(term)
                query_filters.append({
                    'terms': {
                        query_field: used_filters[field]
                    }
                })
        used_filters[field].append(term)
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
    """
    aggs = {}
    for field, _ in facets:
        exclude = []
        if field == 'type':
            query_field = 'embedded.@type.raw'
            exclude = ['Item']
        elif field.startswith('audit'):
            query_field = field
        else:
            query_field = 'embedded.' + field + '.raw'
        agg_name = field.replace('.', '-')

        terms = [
            {'terms': {'principals_allowed.view': principals}},
            {'terms': {'embedded.@type.raw': doc_types}},
        ]
        # Adding facets based on filters
        for q_field, q_terms in used_filters.items():
            if q_field != field and q_field.startswith('audit'):
                terms.append({'terms': {q_field: q_terms}})
            elif q_field != field and not q_field.endswith('!'):
                terms.append({'terms': {'embedded.' + q_field + '.raw': q_terms}})
            elif q_field != field and q_field.endswith('!'):
                terms.append({'not': {'terms': {'embedded.' + q_field[:-1] + '.raw': q_terms}}})

        aggs[agg_name] = {
            'aggs': {
                agg_name: {
                    'terms': {
                        'field': query_field,
                        'exclude': exclude,
                        'min_doc_count': 0,
                        'size': 100
                    }
                }
            },
            'filter': {
                'bool': {
                    'must': terms,
                },
            },
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
        used_facets.add(field)
        agg_name = field.replace('.', '-')
        if agg_name not in aggregations:
            continue
        terms = aggregations[agg_name][agg_name]['buckets']
        if len(terms) < 2:
            continue
        result.append({
            'field': field,
            'title': facet.get('title', field),
            'terms': terms,
            'total': aggregations[agg_name]['doc_count']
        })

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

## stupid things to remove; had to add because of other fxns importing
def iter_search_results(context, request):
    return search(context, request, return_generator=True)

def list_visible_columns_for_schemas(request, schemas):
    return []

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
