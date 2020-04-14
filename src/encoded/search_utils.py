from elasticsearch import (
    TransportError,
    RequestError,
    ConnectionTimeout
)
from pyramid.httpexceptions import (
    HTTPBadRequest,
)
from snovault.elasticsearch.indexer_utils import get_namespaced_index
from snovault.util import find_collection_subtypes


# from now on, use these constants when referring to elastic search
# query keywords when writing elastic search queries - Will 3-20-2020
QUERY = 'query'
FILTER = 'filter'
MUST = 'must'
MUST_NOT = 'must_not'
BOOL = 'bool'
MATCH = 'match'
SHOULD = 'should'
EXISTS = 'exists'
FIELD = 'field'
NESTED = 'nested'
PATH = 'path'
TERMS = 'terms'
RANGE = 'range'
AGGS = 'aggs'
REVERSE_NESTED = 'reverse_nested'
# just for book-keeping/readability but is 'unused' for now
# ie: it should be obvious when you are 'effectively' writing lucene
ELASTIC_SEARCH_QUERY_KEYWORDS = [
    QUERY, FILTER, MUST, MUST_NOT, BOOL, MATCH, SHOULD, EXISTS, FIELD, NESTED, PATH, TERMS, RANGE, AGGS, REVERSE_NESTED,
]


DEFAULT_BROWSE_PARAM_LISTS = {
    'type'                  : ["ExperimentSetReplicate"],
    'experimentset_type'    : ['replicate'],
    # Uncomment if changing back to showing external data: false by default
    # 'award.project'         : ['4DN']
}


COMMON_EXCLUDED_URI_PARAMS = [
    'frame', 'format', 'limit', 'sort', 'from', 'field',
    'mode', 'redirected_from', 'datastore', 'referrer',
    'currentAction'
]


def find_index_by_doc_types(request, doc_types, ignore):
    """
    Find the correct index(es) to be search given a list of doc_types.
    The types in doc_types are the item class names, formatted like
    'Experiment HiC' and index names are the item types, formatted like
    'experiment_hi_c'.
    Ignore any collection names provided in the ignore param, an array.
    Formats output indexes as a string usable by elasticsearch
    """
    indexes = []
    for doc_type in doc_types:
        if doc_type in ignore:
            continue
        else:
            result = find_collection_subtypes(request.registry, doc_type)
            namespaced_results = map(lambda t: get_namespaced_index(request, t), result)
            indexes.extend(namespaced_results)
    # remove any duplicates
    indexes = list(set(indexes))
    index_string = ','.join(indexes)
    return index_string


def get_es_index(request, doc_types):
    """
    set ES index based on doc_type (one type per index)
    if doc_type is item, search all indexes by setting es_index to None
    If multiple, search all specified

    :param request: current request, to be passed
    :param doc_types: item types we are searching on
    :return: index name
    """
    if 'Item' in doc_types:
        return get_namespaced_index(request, '*')
    else:
        return find_index_by_doc_types(request, doc_types, ['Item'])


def get_es_mapping(es, es_index):
    """
    Get es mapping for given doc type (so we can handle type=nested)

    :param es: elasticsearch client
    :param es_index: index to get mapping from
    :return: the mapping for this item type or {}
    """
    if '*' in es_index or ',' in es_index:  # no type=nested searches can be done on * or multi-index
        return {}
    else:
        item_type = list(es.indices.get(es_index)[es_index]['mappings'].keys())[0]  # no other way to get it
        return es.indices.get(es_index)[es_index]['mappings'][item_type]['properties']


def find_nested_path(field, es_mapping):
    """ Returns path to highest level nested field

        This function relies on information about the structure of the es_mapping to extract
        the *path to the object who's mapping is nested*. This information is needed to construct nested
        queries (it is the PATH). It returns None if the given field is not nested.

        Args:
            field (str): the *full path* to the field we are filtering/aggregating on.
                         For example: "experiments_in_set.biosample.biosource.individual.organism.name"
            es_mapping (dict): dictionary representation of the es_mapping of the type we are searching on
        Returns:
            PATH for nested query or None
     """
    location = es_mapping
    path = []
    for level in field.split('.'):
        if level == 'raw':  # if we get to this point we're definitely at a leaf and should stop
            break
        if level not in location:  # its possible we are at a sub-embedded object boundary. Check if it has properties.
            if 'properties' not in location:  # if it doesn't have properties, there's nowhere to go, so return None.
                return None
            location = location['properties']  # else move location forward, but do not add it to the PATH
        if level not in location:  # if we still don't see our 'level', we are not a nested field
            break
        location = location[level]
        path.append(level)
        if location.get('type', None) == 'nested':
            return '.'.join(path)
    return None


def prepare_search_term_from_raw_params(params):
    """ Does the same thing as search.prepare_search_term except applies it directly to params that are
        in dictionary form.

    :param params: dict of key (str), value (list) pairs where key is a field name and value is a list of
                   possible values for that field
    :return: reformatted params where the key is the correct path to the field on the item
    """
    prepared_terms = {}
    for field, vals in params.items():
        if field.startswith('validation_errors') or field.startswith('aggregated_items'):
            continue
        elif field == 'q': # searched string has field 'q'
            # people shouldn't provide multiple queries, but if they do,
            # combine them with AND logic
            if 'q' in prepared_terms:
                join_list = [prepared_terms['q'], vals]
                prepared_terms['q'] = ' AND '.join(join_list)
            else:
                prepared_terms['q'] = vals
        elif field not in COMMON_EXCLUDED_URI_PARAMS + ['type']:
            if 'embedded.' + field not in prepared_terms.keys():
                prepared_terms['embedded.' + field] = []
            prepared_terms['embedded.' + field].append(vals)
    return prepared_terms


def list_source_fields_from_raw_params(fields_requested, frame='embedded'):
    """ Specialized version of search.list_source_fields that will work with the actual
        params passed directly

        Returns set of fields that are requested by user or default fields.
        These fields are used to further limit the results from the search.
        Note that you must provide the full fieldname with embeds, such as:
        'field=biosample.biosource.individual.organism.name' and not just
        'field=name'

    :param fields_requested: effectively request.params.getall('field')
    :param frame: request frame, default to 'embedded'
    :return: fields in the correct form
    """
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
    NOTE: this is only for basic and simple_query_string! See 'set_filters' for how "real" searches are done.
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
            query_info['fields'] = ['_all']
            break
    if query_info != {}:
        string_query = {'must': {'simple_query_string': query_info}}
        query_dict = {'query': {'bool': string_query}}
    else:
        query_dict = {'query': {'bool':{}}}
    search.update_from_dict(query_dict)
    return search, string_query


def execute_search(search):
    """
    Execute the given Elasticsearch-dsl search. Raise HTTPBadRequest for any
    exceptions that arise.
    Args:
        search: the Elasticsearch-dsl prepared in the search() function
    Returns:
        Dictionary search results
    """
    err_exp = None
    try:
        es_results = search.execute().to_dict()
    except ConnectionTimeout as exc:
        err_exp = 'The search failed due to a timeout. Please try a different query.'
    except RequestError as exc:
        # try to get a specific error message. May fail in some cases
        try:
            err_detail = str(exc.info['error']['root_cause'][0]['reason'])
        except:
            err_detail = str(exc)
        err_exp = 'The search failed due to a request error: ' + err_detail
    except TransportError as exc:
        # most general exception
        exc_status = getattr(exc, 'status_code')
        if exc_status == 'TIMEOUT':
            err_exp = 'The search failed due to a timeout. Please try a different query.'
        else:
            err_exp = 'The search failed due to a transport error: ' + str(exc)
    except Exception as exc:
        err_exp = 'The search failed. The DCIC team has been notified.'
    if err_exp:
        raise HTTPBadRequest(explanation=err_exp)
    return es_results
