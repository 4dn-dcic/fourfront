import re
from pyramid.view import view_config
from ..indexing import ELASTIC_SEARCH
from pyramid.security import effective_principals
from urllib import urlencode
from collections import OrderedDict

sanitize_search_string_re = re.compile(r'[\\\+\-\&\|\!\(\)\{\}\[\]\^\~\:\/\\\*\?]')
extra_params = [
    'type',
    'limit',
    'mode',
    'format',
    'frame',
    'datastore',
    'assembly',
    'chromosome',
    'start',
    'stop'
]


def get_filtered_query(term, fields, principals):
    return {
        'query': {
            'query_string': {
                'query': term,
                'default_operator': 'AND',
                'fields': [
                    'encoded_all_ngram',
                    'encoded_all_standard',
                    'encoded_all_untouched'],
                'analyzer': 'encoded_search_analyzer'
            }
        },
        'filter': {
            'and': {
                'filters': [
                    {
                        'terms': {
                            'principals_allowed_view': principals
                        }
                    }
                ]
            }
        },
        'highlight': {
            'fields': {
                '_all': {}
            }
        },
        'aggs': {},
        '_source': list(fields),
    }


def sanitize_search_string(text):
    return sanitize_search_string_re.sub(r'\\\g<0>', text)


def flatten_dict(d):
    def items():
        for key, value in d.items():
            if isinstance(value, dict):
                for subkey, subvalue in flatten_dict(value).items():
                    yield key + "." + subkey, subvalue
            else:
                yield key, value
    return dict(items())


def search_peaks(request, result):
    es = request.registry[ELASTIC_SEARCH]
    chromosome = request.params.get('chr', None)
    s = request.params.get('snip', None)
    if chromosome is None or s is None:
        result['notification'] = 'Chr and snip are both required for peaks'
        return result
    snip = int(s)
    query = {
        'query': {
            'filtered': {
                'query': {
                    'term': {
                        'chromosome': chromosome
                    }
                },
                'filter': {
                    'and': {
                        'filters': [
                            {
                                'range': {
                                    'start': {
                                        'lte': snip,
                                    }
                                }
                            },
                            {
                                'range': {
                                    'stop': {
                                        'gte': snip
                                    }
                                }
                            }
                        ],
                        '_cache': True
                    }
                }
            }
        },
        'fields': ['experiment', 'file']
    }
    results = es.search(body=query, index='encoded', doc_type='peaks' or None, size=99999999)
    file_ids = []
    exp_ids = []
    for hit in results['hits']['hits']:
        exp = hit['fields']['experiment'][0]
        f = hit['fields']['file'][0]
        if exp not in exp_ids:
            exp_ids.append(exp)
            result['@graph'].append({'@id': exp, '@type': 'peaks', 'files': [f]})
        else:
            if f not in file_ids:
                file_ids.append(f)
                for g in result['@graph']:
                    if g['@id'] == exp:
                        g['files'].append(f)
                        break
    result['total'] = len(result['@graph'])
    result['facets'].append({
        'field': 'type',
        'total': len(result['@graph']),
        'term': [
            {
                'count': len(result['@graph']),
                'term': 'peaks'
            }
        ]
    })
    result['notification'] = 'Success'
    return result


@view_config(route_name='search', context=Root, request_method='GET', permission='search')
def search(context, request, search_type=None):
    ''' Search view connects to ElasticSearch and returns the results'''

    root = request.root
    result = {
        '@id': '/search/' + ('?' + request.query_string if request.query_string else ''),
        '@type': ['search'],
        'title': 'Search',
        'facets': [],
        '@graph': [],
        'columns': OrderedDict(),
        'filters': [],
        'notification': '',
        'batch_hub': ''
    }

    principals = effective_principals(request)
    es = request.registry[ELASTIC_SEARCH]

    # handling limit
    size = request.params.get('limit', 25)
    if size in ('all', ''):
        size = 99999
    else:
        try:
            size = int(size)
        except ValueError:
            size = 25

    search_term = request.params.get('searchTerm', '*')
    if search_term != '*':
        search_term = sanitize_search_string(search_term.strip())

    # Handling whitespaces in the search term
    if not search_term:
        result['notification'] = 'Please enter search term'
        return result

    if search_type is None:
        search_type = request.params.get('type')
        if search_type == 'peaks':
            return search_peaks(request, result)
        else:
            # handling invalid item types
            if search_type not in (None, '*'):
                if search_type not in root.by_item_type:
                    result['notification'] = "'" + search_type + \
                        "' is not a valid 'item type'"
                    return result

    # Building query for filters
    if search_type in (None, '*'):
        if request.params.get('mode') == 'picker':
            doc_types = []
        else:
            doc_types = ['antibody_lot', 'biosample',
                         'experiment', 'target', 'dataset', 'page']
    else:
        doc_types = [search_type]
        qs = urlencode([
            (k.encode('utf-8'), v.encode('utf-8'))
            for k, v in request.params.iteritems() if k != 'type'
        ])
        result['filters'].append({
            'field': 'type',
            'term': search_type,
            'remove': '{}?{}'.format(request.path, qs)
            })

    frame = request.params.get('frame')
    if frame in ['embedded', 'object']:
        fields = [frame + '.*']
    elif len(doc_types) == 1 and 'columns' not in (root[doc_types[0]].schema or ()):
        frame = 'object'
        fields = ['object.*']
    else:
        frame = 'columns'
        fields = {'object.*', 'embedded.@id', 'embedded.@type'}
        for doc_type in (doc_types or root.by_item_type.keys()):
            collection = root[doc_type]
            if collection.schema is None:
                continue
            columns = collection.schema.get('columns', ())
            fields.update('embedded.' + column for column in columns)
            result['columns'].update(columns)

    # Builds filtered query which supports multiple facet selection
    query = get_filtered_query(search_term, sorted(fields), principals)

    if not result['columns']:
        del result['columns']

    # Sorting the files when search term is not specified
    if search_term == '*':
        query['sort'] = {
            'embedded.date_created': {
                'order': 'desc',
                'ignore_unmapped': True,
            },
            'embedded.label': {
                'order': 'asc',
                'missing': '_last',
                'ignore_unmapped': True,
            },
        }
        # Adding match_all for wildcard search for performance
        query['query']['match_all'] = {}
        del(query['query']['query_string'])

    # Setting filters
    query_filters = query['filter']['and']['filters']
    used_filters = []
    for field, term in request.params.iteritems():
        if field not in extra_params:
            # Add filter to result
            qs = urlencode([
                (k.encode('utf-8'), v.encode('utf-8'))
                for k, v in request.params.iteritems() if v != term
            ])
            result['filters'].append({
                'field': field,
                'term': term,
                'remove': '{}?{}'.format(request.path, qs)
            })

            # Add filter to query
            if field == 'searchTerm':
                continue  # searchTerm is already in the query
            if field.startswith('audit'):
                field_query = field
            else:
                field_query = 'embedded.' + field
            if term == 'other':
                query_filters.append({'missing': {'field': 'embedded.' + field}})
            else:
                if field in used_filters:
                    for f in query_filters:
                        if field_query in f['terms'].keys():
                            f['terms'][field_query].append(term)
                else:
                    query_filters.append({
                        'terms': {
                            field_query: [term]
                        }
                    })
                    used_filters.append(field)

    # Adding facets to the query
    # TODO: Have to simplify this piece of code
    facets = OrderedDict()
    facets['Data Type'] = 'type'
    if len(doc_types) == 1 and 'facets' in root[doc_types[0]].schema:
        for facet in root[doc_types[0]].schema['facets']:
            facets[root[doc_types[0]].schema['facets'][facet]['title']] = facet
    if request.has_permission('search_audit'):
        facets = facets.copy()
        facets['Audit category'] = 'audit.category'

    for facet_title in facets:
        field = facets[facet_title]
        if field == 'type':
            query_field = '_type'
        elif field == 'audit.category':
            query_field = 'audit.category'
        else:
            query_field = 'embedded.' + field
        agg_name = field.replace('.', '-')
        query['aggs'][agg_name] = {
            'aggs': {
                agg_name: {
                    'terms': {
                        'field': query_field,
                        'min_doc_count': 0,
                        'size': 100
                    }
                }
            },
            'filter': {
                'terms': {
                    'principals_allowed_view': principals
                }
            }
        }
        for count, used_facet in enumerate(result['filters']):
            if used_facet['field'] == 'searchTerm':
                continue
            if field != used_facet['field'] and used_facet['field'] != 'type':
                if used_facet['field'] != 'audit.category':
                    q_field = 'embedded.' + used_facet['field']
                else:
                    q_field = used_facet['field']
                if 'terms' in query['aggs'][agg_name]['filter']:
                    old_terms = query['aggs'][agg_name]['filter']
                    new_terms = {'terms': {
                        q_field: [used_facet['term']]
                    }}
                    query['aggs'][agg_name]['filter'] = {
                        'bool': {
                            'must': [old_terms, new_terms]
                        }
                    }
                else:
                    terms = query['aggs'][agg_name]['filter']['bool']['must']
                    flag = 0
                    for count, term in enumerate(terms):
                        if q_field in term['terms'].keys():
                            terms[count]['terms'][q_field].append(used_facet['term'])
                            flag = 1
                    if not flag:
                        terms.append({
                            'terms': {
                                q_field: [used_facet['term']]
                            }
                        })

    # Execute the query
    results = es.search(body=query, index='encoded', doc_type=doc_types or None, size=size)

    # Loading facets in to the results
    if 'aggregations' in results:
        facet_results = results['aggregations']
        for facet_title in facets:
            field = facets[facet_title]
            temp_field = field.replace('.', '-')
            if temp_field not in facet_results:
                continue
            terms = facet_results[temp_field][temp_field]['buckets']
            if len(terms) < 2:
                continue
            result['facets'].append({
                'field': field,
                'title': facet_title,
                'terms': terms,
                'total': facet_results[temp_field]['doc_count']
            })

    if search_type == 'experiment':
        for facet in results['aggregations']['assembly']['assembly']['buckets']:
            if facet['doc_count'] > 0:
                hub = request.url.replace('search/?', 'batch_hub/') + '/hub.txt'
                hub = hub.replace('&', ',,')
                hgConnect = 'http://genome.ucsc.edu/cgi-bin/hgHubConnect?hgHub_do_redirect=on&hgHubConnect.remakeTrackHub=on&hgHub_do_firstDb=1&'
                result['batch_hub'] = hgConnect + '&'.join([
                    'hubUrl=' + hub
                ])
                break

    # Loading result rows
    hits = results['hits']['hits']
    if frame in ['embedded', 'object']:
        result['@graph'] = [hit['_source'][frame] for hit in hits]
    else:  # columns
        for hit in hits:
            item_type = hit['_source']['embedded']['@type'][0]
            if 'columns' in root[item_type].schema:
                result['@graph'].append(flatten_dict(hit['_source']['embedded']))
            else:
                result['@graph'].append(hit['_source']['object'])

    # Adding total
    result['total'] = results['hits']['total']
    if len(result['@graph']):
        result['notification'] = 'Success'
    else:
        result['notification'] = 'No results found'
    return result
