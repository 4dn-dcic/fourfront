from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPBadRequest
from snovault import CONNECTION, TYPES
from snovault.util import debug_log
from snovault.elasticsearch import ELASTIC_SEARCH
from copy import (
    copy,
    deepcopy
)
import json
from urllib.parse import (
    parse_qs,
    urlencode,
)
from datetime import datetime
import uuid
from elasticsearch_dsl import Search
from elasticsearch_dsl.aggs import Terms, Nested, Cardinality, ValueCount
from .search import (
    make_search_subreq,
    search as perform_search_request,
    BARPLOT_AGGS,
)
from .types.base import Item
from .types.workflow import (
    trace_workflows,
    DEFAULT_TRACING_OPTIONS,
    WorkflowRunTracingException,
    item_model_to_object
)
from .types.base import get_item_if_you_can
from .search_utils import (
    get_es_index,
    get_es_mapping,
    find_nested_path,
    DEFAULT_BROWSE_PARAM_LISTS,
    prepare_search_term_from_raw_params,
    list_source_fields_from_raw_params,
    build_query,
)

def includeme(config):
    config.add_route('trace_workflow_runs',         '/trace_workflow_run_steps/{file_uuid}/', traverse='/{file_uuid}')
    config.add_route('bar_plot_chart',              '/bar_plot_aggregations')
    config.add_route('date_histogram_aggregations', '/date_histogram_aggregations/')
    config.add_route('add_files_to_higlass_viewconf', '/add_files_to_higlass_viewconf/')
    config.scan(__name__)


# TODO: figure out how to make one of those cool /file/ACCESSION/@@download/-like URLs for this.
@view_config(route_name='trace_workflow_runs', request_method='GET', permission='view', context=Item)
@debug_log
def trace_workflow_runs(context, request):
    '''
    Traces workflow runs from context (an Item instance), which may be one of the following @types:
    `ExperimentSet`, `File`, or `Experiment`.

    Gets @@object representation of files from which to trace, then passes them to `trace_workflow_runs`.
    @@object representation is needed currently because trace_workflow_runs grabs `output_of_workflow_runs` from
    the files and requires them in UUID form. THIS SHOULD BE IMPROVED UPON AT EARLIEST CONVENIENCE.

    Requires that all files and workflow runs which are part of trace be indexed in ElasticSearch, else a
    WorkflowRunTracingException will be thrown.

    URI Paramaters:
        all_runs            If true, will not group similar workflow_runs
        track_performance   If true, will record time it takes for execution

    Returns:
        List of steps (JSON objects) with inputs and outputs representing IO nodes / files.
    '''

    # Default opts += overrides
    options = copy(DEFAULT_TRACING_OPTIONS)
    if request.params.get('all_runs'):
        options['group_similar_workflow_runs'] = False
    if request.params.get('track_performance'):
        options['track_performance'] = True

    item_types = context.jsonld_type()
    item_model_obj = item_model_to_object(context.model, request)

    files_objs_to_trace = []

    if 'File' in item_types:
        files_objs_to_trace.append(item_model_obj)

    elif 'Experiment' in item_types:
        for file_uuid in item_model_obj.get('processed_files', []):
            file_model = request.registry[CONNECTION].storage.get_by_uuid(file_uuid)
            file_obj = item_model_to_object(file_model, request)
            files_objs_to_trace.append(file_obj)
        files_objs_to_trace.reverse()

    elif 'ExperimentSet' in item_types:
        file_uuids_to_trace_from_experiment_set = item_model_obj.get('processed_files', [])
        file_uuids_to_trace_from_experiments    = []
        for exp_uuid in item_model_obj.get('experiments_in_set', []):
            experiment_model    = request.registry[CONNECTION].storage.get_by_uuid(exp_uuid)
            experiment_obj      = item_model_to_object(experiment_model, request)
            file_uuids_to_trace_from_experiments.extend(experiment_obj.get('processed_files', []))

        for file_uuid in file_uuids_to_trace_from_experiments + file_uuids_to_trace_from_experiment_set:
            file_model = request.registry[CONNECTION].storage.get_by_uuid(file_uuid)
            file_obj = item_model_to_object(file_model, request)
            files_objs_to_trace.append(file_obj)
        files_objs_to_trace.reverse()

    else:
        raise HTTPBadRequest(detail="This type of Item is not traceable: " + ', '.join(item_types))

    try:
        return trace_workflows(files_objs_to_trace, request, options)
    except WorkflowRunTracingException as e:
        raise HTTPBadRequest(detail=e.args[0])



# This must be same as can be used for search query, e.g. &?experiments_in_set.digestion_enzyme.name=No%20value, so that clicking on bar section to filter by this value works.
TERM_NAME_FOR_NO_VALUE  = "No value"

# Common definition for aggregating all files, exps, and set **counts**.
# This works four our ElasticSearch mapping though has some non-ideal-ities.
# For example, we use "cardinality" instead of "value_count" agg (which would (more correctly) count duplicate files, etc.)
# because without a more complex "type" : "nested" it will uniq file accessions within a hit (ExpSetReplicate).
SUM_FILES_EXPS_AGGREGATION_DEFINITION = {
    # Returns count of _unique_ raw file accessions encountered along the search.
    "total_exp_raw_files" : {
        "cardinality" : {
            "field" : "embedded.experiments_in_set.files.accession.raw",
            "precision_threshold" : 10000
        }
    },

    # Alternate approaches -- saved for record / potential future usage:
    #
    # (a) Needs to have "type" : "nested" mapping, but then faceting & filtering needs to be changed (lots of effort)
    #     Without "type" : "nested", "value_count" agg will not account for nested arrays and _unique_ on file accessions within a hit (exp set).
    #
    # "total_exp_raw_files" : {
    #    "nested" : {
    #        "path" : "embedded.experiments_in_set"
    #    },
    #    "aggs" : {
    #        "total" : {
    #            "value_count" : {
    #                "field" : "embedded.experiments_in_set.files.accession.raw",
    #                #"script" : "doc['embedded.experiments_in_set.accession.raw'].value + '~' + doc['embedded.experiments_in_set.files.accession.raw'].value",
    #            }
    #        }
    #    }
    # },
    #
    # (b) Returns only 1 value per exp-set
    #     When using a script without "type" : "nested". If "type" : "nested" exists, need to loop over the array (2nd example -ish).
    #
    #"total_exp_raw_files_new" : {
    #    "terms" : {
    #        "script" : "doc['embedded.experiments_in_set.accession.raw'].value + '~' + doc['embedded.experiments_in_set.files.accession.raw'].value"
    #        #"script" : "int total = 0; for (int i = 0; i < doc['embedded.experiments_in_set.accession.raw'].length; ++i) { total += doc['links.experiments_in_set'][i]['embedded.files.accession.raw'].length; } return total;",
    #        #"precision_threshold" : 10000
    #   }
    #},
    #
    # (c) Same as (b)
    #
    #"test" : {
    #    "terms" : {
    #        "script" : "return doc['embedded.experiments_in_set.accession.raw'].getValue().concat('~').concat(doc['embedded.experiments_in_set.accession.raw'].getValue()).concat('~').concat(doc['embedded.experiments_in_set.files.accession.raw'].getValue());",
    #        #"precision_threshold" : 10000
    #    }
    #},

    "total_exp_processed_files" : {
        "cardinality" : {
            "field" : "embedded.experiments_in_set.processed_files.accession.raw",
            "precision_threshold" : 10000
        }
    },
    "total_expset_processed_files" : {
        "cardinality" : {
            "field" : "embedded.processed_files.accession.raw",
            "precision_threshold" : 10000
        }
    },
    # XXX: This can be computed by us? I can't get this to work when these are all nested aggregations -Will
    # "total_files" : {
    #     "bucket_script" : {
    #         "buckets_path": {
    #             "expSetProcessedFiles": "total_expset_processed_files",
    #             "expProcessedFiles": "total_exp_processed_files",
    #             "expRawFiles": "total_exp_raw_files"
    #         },
    #         "script" : "params.expSetProcessedFiles + params.expProcessedFiles + params.expRawFiles"
    #     }
    # },
    "total_experiments" : {
        "value_count" : {
            "field" : "embedded.experiments_in_set.accession.raw"
        }
    }
}


@view_config(route_name='bar_plot_chart', request_method=['GET', 'POST'])
@debug_log
def bar_plot_chart(context, request):
    MAX_BUCKET_COUNT = 30  # Max amount of bars or bar sections to return, excluding 'other'.

    # Collect params from request
    try:
        json_body = request.json_body
        search_param_lists      = json_body.get('search_query_params',      deepcopy(DEFAULT_BROWSE_PARAM_LISTS))
        fields_to_aggregate_for = json_body.get('fields_to_aggregate_for',  request.params.getall('field'))
    except json.decoder.JSONDecodeError:
        search_param_lists      = deepcopy(DEFAULT_BROWSE_PARAM_LISTS)
        del search_param_lists['award.project']
        fields_to_aggregate_for = request.params.getall('field')

    if len(fields_to_aggregate_for) == 0:
        raise HTTPBadRequest(detail="No fields supplied to aggregate for.")

    # Determine which fields that we are aggregating on are nested
    nested_paths = {}
    for field in fields_to_aggregate_for:
        path = find_nested_path(field)
        if path:
            nested_paths[field] = path

    # Construct the search
    es = request.registry[ELASTIC_SEARCH]
    types = request.registry[TYPES]
    doc_types = search_param_lists['type']
    principals = request.effective_principals
    es_index = get_es_index(request, doc_types)
    item_type_es_mapping = get_es_mapping(es, es_index)
    prepared_terms = prepare_search_term_from_raw_params(search_param_lists)
    source_fields = list_source_fields_from_raw_params(fields_to_aggregate_for)


    # establish elasticsearch_dsl class that will perform the search
    search = Search(using=es, index=es_index)
    search, string_query = build_query(search, prepared_terms, source_fields)

    # Build primary agg
    primary_agg_name = fields_to_aggregate_for[0]
    field_name = "embedded." + primary_agg_name + '.raw'
    if primary_agg_name in nested_paths:
        nested_path = nested_paths[primary_agg_name]
        search.aggs[BARPLOT_AGGS].bucket(field_name, Nested(path=nested_path)) \
                                 .bucket(field_name, Terms(field=field_name,
                                                           size=MAX_BUCKET_COUNT,
                                                           missing=TERM_NAME_FOR_NO_VALUE))
    else:
        search.aggs[BARPLOT_AGGS].bucket(Terms(field=field_name,
                                               size=MAX_BUCKET_COUNT,
                                               missing=TERM_NAME_FOR_NO_VALUE))

    # Populate with the bucket aggregations in the correct form from above
    # XXX: TODO
    return {}


#@view_config(route_name='bar_plot_chart_old', request_method=['GET', 'POST'])
@debug_log
def bar_plot_chart_old(context, request):
    MAX_BUCKET_COUNT = 30 # Max amount of bars or bar sections to return, excluding 'other'.

    try:
        json_body = request.json_body
        search_param_lists      = json_body.get('search_query_params',      deepcopy(DEFAULT_BROWSE_PARAM_LISTS))
        fields_to_aggregate_for = json_body.get('fields_to_aggregate_for',  request.params.getall('field'))
    except json.decoder.JSONDecodeError:
        search_param_lists      = deepcopy(DEFAULT_BROWSE_PARAM_LISTS)
        del search_param_lists['award.project']
        fields_to_aggregate_for = request.params.getall('field')

    if len(fields_to_aggregate_for) == 0:
        raise HTTPBadRequest(detail="No fields supplied to aggregate for.")

    primary_agg = {
        BARPLOT_AGGS : {
            "terms" : {
                "field" : "embedded." + fields_to_aggregate_for[0] + '.raw',
                "missing" : TERM_NAME_FOR_NO_VALUE,
                "size" : MAX_BUCKET_COUNT
            },
            "aggs" : deepcopy(SUM_FILES_EXPS_AGGREGATION_DEFINITION)
        }
    }

    primary_agg.update(deepcopy(SUM_FILES_EXPS_AGGREGATION_DEFINITION))
    #del primary_agg['total_files'] # "bucket_script" not supported on root-level aggs

    # Nest in additional fields, if any
    curr_field_aggs = primary_agg[BARPLOT_AGGS]['aggs']
    for field_index, field in enumerate(fields_to_aggregate_for):
        if field_index == 0:
            continue
        curr_field_aggs['field_' + str(field_index)] = {
            'terms' : {
                "field" : "embedded." + field + '.raw',
                "missing" : TERM_NAME_FOR_NO_VALUE,
                "size" : MAX_BUCKET_COUNT
            },
            "aggs" : deepcopy(SUM_FILES_EXPS_AGGREGATION_DEFINITION)
        }
        curr_field_aggs = curr_field_aggs['field_' + str(field_index)]['aggs']


    search_param_lists['limit'] = search_param_lists['from'] = [0]
    subreq          = make_search_subreq(request, '{}?{}'.format('/browse/', urlencode(search_param_lists, True)) )
    search_result   = perform_search_request(None, subreq, custom_aggregations=primary_agg)

    for field_to_delete in ['@context', '@id', '@type', '@graph', 'title', 'filters', 'facets', 'sort', 'clear_filters', 'actions', 'columns']:
        if search_result.get(field_to_delete) is None:
            continue
        del search_result[field_to_delete]

    ret_result = { # We will fill up the "terms" here from our search_result buckets and then return this dictionary.
        "field" : fields_to_aggregate_for[0],
        "terms" : {},
        "total" : {
            "experiment_sets" : search_result['total'],
            "experiments" : search_result['aggregations']['total_experiments']['total_experiments']['value'],
            "files" : (
                search_result['aggregations']['total_expset_processed_files']['total_expset_processed_files']['value'] +
                search_result['aggregations']['total_exp_raw_files']['total_exp_raw_files']['value'] +
                search_result['aggregations']['total_exp_processed_files']['total_exp_processed_files']['value']
            )
        },
        "other_doc_count": search_result['aggregations']['field_0'].get('sum_other_doc_count', 0),
        "time_generated" : str(datetime.utcnow())
    }


    def format_bucket_result(bucket_result, returned_buckets, curr_field_depth = 0):

        curr_bucket_totals = {
            'experiment_sets'   : int(bucket_result['doc_count']),
            'experiments'       : int(bucket_result['total_experiments']['total_experiments']['value']),
            'files'             : int(
                bucket_result['total_expset_processed_files']['total_expset_processed_files']['value'] +
                bucket_result['total_exp_raw_files']['total_exp_raw_files']['value'] +
                bucket_result['total_exp_processed_files']['total_exp_processed_files']['value']
            )
        }

        next_field_name = None
        if len(fields_to_aggregate_for) > curr_field_depth + 1: # More fields agg results to add
            next_field_name = fields_to_aggregate_for[curr_field_depth + 1]
            returned_buckets[bucket_result['key']] = {
                "term"              : bucket_result['key'],
                "field"             : next_field_name,
                "total"             : curr_bucket_totals,
                "terms"             : {},
                "other_doc_count"   : bucket_result['field_' + str(curr_field_depth + 1)].get('sum_other_doc_count', 0),
            }
            for bucket in bucket_result['field_' + str(curr_field_depth + 1)]['buckets']:
                format_bucket_result(bucket, returned_buckets[bucket_result['key']]['terms'], curr_field_depth + 1)

        else:
            # Terminal field aggregation -- return just totals, nothing else.
            returned_buckets[bucket_result['key']] = curr_bucket_totals

    # XXX: This logic needs to be discussed with Alex, not sure I totally understand it
    for bucket in search_result['aggregations']['field_0']['buckets']:
        try:
            format_bucket_result(bucket, ret_result['terms'], 0)
        except:
            continue

    return ret_result



@view_config(route_name='date_histogram_aggregations', request_method=['GET', 'POST'])
@debug_log
def date_histogram_aggregations(context, request):
    '''PREDEFINED aggregations which run against type=ExperimentSet'''

    # Defaults - may be overriden in URI params
    date_histogram_fields    = ['public_release', 'project_release']
    group_by_fields          = ['award.center_title']
    date_histogram_intervals = ['weekly']

    # Mapping of 'date_histogram_interval' options we accept to ElasticSearch interval vocab term.
    interval_to_es_interval = {
        'hourly'    : 'hour',
        'daily'     : 'day',
        'weekly'    : 'week',
        'monthly'   : 'month',
        'yearly'    : 'year'
    }

    try:
        json_body = request.json_body
        search_param_lists = json_body.get('search_query_params', deepcopy(DEFAULT_BROWSE_PARAM_LISTS))
    except:
        search_param_lists = request.GET.dict_of_lists()
        if 'group_by' in search_param_lists:
            group_by_fields = search_param_lists['group_by']
            del search_param_lists['group_by'] # We don't wanna use it as search filter.
            if len(group_by_fields) == 1 and group_by_fields[0] in ['None', 'null']:
                group_by_fields = None
        if 'date_histogram' in search_param_lists:
            date_histogram_fields = search_param_lists['date_histogram']
            del search_param_lists['date_histogram'] # We don't wanna use it as search filter.
        if 'date_histogram_interval' in search_param_lists:
            date_histogram_intervals = search_param_lists['date_histogram_interval']
            for interval in date_histogram_intervals:
                if interval not in interval_to_es_interval.keys():
                    raise IndexError('"{}" is not one of daily, weekly, monthly, or yearly.'.format(interval))
            del search_param_lists['date_histogram_interval'] # We don't wanna use it as search filter.
        if not search_param_lists:
            search_param_lists = deepcopy(DEFAULT_BROWSE_PARAM_LISTS)
            del search_param_lists['award.project']



    if 'ExperimentSet' in search_param_lists['type'] or 'ExperimentSetReplicate' in search_param_lists['type']:
        # Add predefined sub-aggs to collect Exp and File counts from ExpSet items, in addition to getting own doc_count.

        common_sub_agg = deepcopy(SUM_FILES_EXPS_AGGREGATION_DEFINITION)

        # Add on file_size_volume
        for key_name in ['total_exp_raw_files', 'total_exp_processed_files', 'total_expset_processed_files']:
            common_sub_agg[key_name + "_volume"] = {
                "sum" : {
                    "field" : common_sub_agg[key_name]["cardinality"]["field"].replace('.accession.raw', '.file_size')
                }
            }
        common_sub_agg["total_files_volume"] = {
            "bucket_script" : {
                "buckets_path": {
                    "expSetProcessedFilesVol": "total_expset_processed_files_volume",
                    "expProcessedFilesVol": "total_exp_processed_files_volume",
                    "expRawFilesVol": "total_exp_raw_files_volume"
                },
                "script" : "params.expSetProcessedFilesVol + params.expProcessedFilesVol + params.expRawFilesVol"
            }
        }

        if group_by_fields is not None:
            group_by_agg_dict = {
                group_by_field : {
                    "terms" : {
                        "field"     : "embedded." + group_by_field + ".raw",
                        "missing"   : TERM_NAME_FOR_NO_VALUE,
                        "size"      : 30
                    },
                    "aggs" : common_sub_agg
                }
                for group_by_field in group_by_fields if group_by_field is not None
            }
            histogram_sub_aggs = dict(common_sub_agg, **group_by_agg_dict)
        else:
            histogram_sub_aggs = common_sub_agg

    else:
        if group_by_fields is not None:
            # Do simple date_histogram group_by sub agg, unless is set to 'None'
            histogram_sub_aggs = {
                group_by_field : {
                    "terms" : {
                        "field"     : "embedded." + group_by_field + ".raw",
                        "missing"   : TERM_NAME_FOR_NO_VALUE,
                        "size"      : 30
                    }
                }
                for group_by_field in group_by_fields if group_by_field is not None
            }
        else:
            histogram_sub_aggs = None

    # Create an agg item for each interval in `date_histogram_intervals` x each date field in `date_histogram_fields`
    # TODO: Figure out if we want to align these up instead of do each combination.
    outer_date_histogram_agg = {}
    for interval in date_histogram_intervals:
        for dh_field in date_histogram_fields:
            outer_date_histogram_agg[interval + '_interval_' + dh_field] = {
                "date_histogram" : {
                    "field": "embedded." + dh_field,
                    "interval": interval_to_es_interval[interval],
                    "format": "yyyy-MM-dd"
                }
            }
            if histogram_sub_aggs:
                outer_date_histogram_agg[interval + '_interval_' + dh_field]['aggs'] = histogram_sub_aggs

    search_param_lists['limit'] = search_param_lists['from'] = [0]
    subreq          = make_search_subreq(request, '{}?{}'.format('/browse/', urlencode(search_param_lists, True)) )
    search_result   = perform_search_request(None, subreq, custom_aggregations=outer_date_histogram_agg)

    for field_to_delete in ['@context', '@id', '@type', '@graph', 'title', 'filters', 'facets', 'sort', 'clear_filters', 'actions', 'columns']:
        if search_result.get(field_to_delete) is None:
            continue
        del search_result[field_to_delete]

    return search_result

@view_config(route_name='add_files_to_higlass_viewconf', request_method='POST')
@debug_log
def add_files_to_higlass_viewconf(context, request):
    """ Add multiple files to the given Higlass view config.

    Args:
        request(obj): Http request object. Assumes request's request is JSON and contains these keys:
            higlass_viewconfig(obj)                     : JSON of the current Higlass views. If None, uses a default view.
            files(array)                                : A list of file uuids to add.
            firstViewLocationAndZoom(array, optional)   : A list of three numbers indicating the location and zoom levels of the first existing view.
            remove_unneeded_tracks(boolean, optional, default=False): If True, we'll remove tracks that are not needed for the view.
            height(integer, optional, default=300)     : Maximum Height the viewconfig can occupy.

    Returns:
        A dictionary.
            success(bool)           : Boolean indicating success.
            errors(str)             : A string containing errors. Will be None if this is successful.
            new_viewconfig(dict)    : New dict representing the new viewconfig.
            new_genome_assembly(str): A string showing the new genome assembly.
    """

    # Get the view config and its genome assembly. (Use a fall back if none was provided.)
    higlass_viewconfig = request.json_body.get('higlass_viewconfig', None)    
    if not higlass_viewconfig:
        
        # @todo: this block will be removed when a workaround to run tests correctly.
        default_higlass_viewconf = get_item_if_you_can(request, "00000000-1111-0000-1111-000000000000")
        higlass_viewconfig = default_higlass_viewconf["viewconfig"]
        # Add a view section if the default higlass_viewconfig lacks one
        if "views" not in higlass_viewconfig:
            higlass_viewconfig["views"] = []

    # If no view config could be found, fail
    if not higlass_viewconfig:
        return {
            "success" : False,
            "errors": "No view config found.",
            "new_viewconfig": None,
            "new_genome_assembly" : None
        }    

    # Get the list of files.
    file_uuids = request.json_body.get('files')
    if not isinstance(file_uuids, list):
        raise Exception("Expecting list of files.")

    # Collect other parameters from the request.
    first_view_location_and_zoom = request.json_body.get('firstViewLocationAndZoom', [None, None, None])
    remove_unneeded_tracks = request.json_body.get('remove_unneeded_tracks', None)
    genome_assembly = request.json_body.get('genome_assembly', None)
    maximum_height = request.json_body.get('height', 600)

    # Check the height of the display.
    if maximum_height < 100:
        return {
            "success" : False,
            "errors" : "Height cannot be below 100.",
            "new_viewconfig": None,
            "new_genome_assembly" : None
        }

    # Collect more info on each file.
    files_info, errors = get_file_higlass_information(request, file_uuids)
    if errors:
        return {
            "success" : False,
            "errors" : errors,
            "new_viewconfig": None,
            "new_genome_assembly" : None
        }

    # Validate the files to make sure they exist and have the correct genome assemblies.
    validation_check = validate_higlass_file_sources(files_info, genome_assembly)

    if not validation_check["success"]:
        return_keys = ("success", "errors")
        error_response = { key:validation_check[key] for key in return_keys if key in validation_check }
        error_response["new_viewconfig"] = None
        error_response["new_genome_assembly"] = None
        return error_response

    # Extract the current_genome_assembly from the validation check.
    genome_assembly = genome_assembly or validation_check["genome_assembly"]

    views = higlass_viewconfig["views"]
    # For each file
    for current_file in files_info:
        # Try to add this file to the current views.
        views, errors = add_single_file_to_higlass_viewconf(views, current_file, genome_assembly, higlass_viewconfig, first_view_location_and_zoom, maximum_height)

        if errors:
            return {
                "success" : False,
                "errors" : "errors found while adding {file_uuid} : {errors}".format(file_uuid=current_file["uuid"], errors=errors),
                "new_viewconfig": None,
                "new_genome_assembly" : None
            }

    # Remove tracks that we don't need to represent this view conf.
    if remove_unneeded_tracks:
        remove_left_side_if_all_1D(views)

    higlass_viewconfig["zoomFixed"] = False
    higlass_viewconfig["views"] = views
    return {
        "success" : True,
        "errors": "",
        "new_viewconfig" : higlass_viewconfig,
        "new_genome_assembly" : genome_assembly
    }

def get_file_higlass_information(request, file_uuids):
    """Retrieve the given file data and their formats.
    Args:
        request         : Network request
        file_uuids(list): A list of strings, where each string is a unique identifier to find a file.

    Returns:
        A list of dictionaries, one for each file. They contain one of these keys:
            uuid(string)        : The text identifier
            data(dict)          : Information on the file.
            file_format(string) : The type of file present.
        A string containing an error.
    """
    # Collect more info on each file.
    files_info = []
    for file_uuid in file_uuids:
        data = {
            "uuid" : file_uuid,
            "data" : get_item_if_you_can(request, file_uuid),
        }

        if data["data"] == None:
            return [], "{uuid} does not exist, aborting".format(uuid=file_uuid)

        data["file_format"] = data["data"]["file_format"]

        files_info.append(data)

    return files_info, ""

def validate_higlass_file_sources(files_info, expected_genome_assembly):
    """
    Args:
        files_info(list)            : A list of dicts. Each dict contains the
            file's uuid and data.
        expected_genome_assembly(str, optional, default=None): If provided,
            each file should have this genome assembly. If it's not provided,
            all of the files will be checked to ensure they have a matching
            genome assembly.

    Returns:
        A dictionary with the following keys:
            success(bool)               : True if there were no errors.
            current_genome_assembly(str): A string indicating the genome assembly of the files.
            errors(str)                 : A string (or None if there are no errors)
    """

    files_by_genome_assembly = {}
    for file in files_info:
        # Get the uuid.
        uuid = file["uuid"]

        # Get the file data.
        data = file["data"]

        if not data:
            return {
                "success" : False,
                "errors" : "File {uuid} does not exist".format(uuid=uuid),
            }

        # Get the higlass_uid.
        if "higlass_uid" not in data:
            return {
                "success" : False,
                "errors" : "File {uuid} does not have higlass_uid".format(uuid=uuid)
            }

        # Get the genome_assembly.
        if "genome_assembly" not in data:
            return {
                "success" : False,
                "errors" : "File {uuid} does not have genome assembly".format(uuid=uuid)
            }

        if data["genome_assembly"] not in files_by_genome_assembly:
            files_by_genome_assembly[data["genome_assembly"]] = []
        files_by_genome_assembly[data["genome_assembly"]].append(uuid)

    # Make sure all of the files have the same genome assembly.
    human_readable_ga_listings = []
    for ga in [g for g in files_by_genome_assembly if g != expected_genome_assembly]:
        human_readable_ga_listings.append(
            "{ga}: {uuids}".format(
                ga=ga,
                uuids=", ".join(files_by_genome_assembly[ga])
            )
        )

    if len(files_info) > 0:
        if expected_genome_assembly:
            if expected_genome_assembly not in files_by_genome_assembly or \
                len(files_by_genome_assembly.keys()) > 1:
                return {
                    "success" : False,
                    "errors" : "All files are not {expected} genome assembly: {files_by_ga}".format(
                        expected = expected_genome_assembly,
                        files_by_ga = "; ".join(human_readable_ga_listings),
                    )
                }
        else:
            if len(files_by_genome_assembly.keys()) > 1:
                return {
                    "success" : False,
                    "errors" : "Files have multiple genome assemblies: {files_by_ga}".format(
                        expected = expected_genome_assembly,
                        files_by_ga = "; ".join(human_readable_ga_listings),
                    )
                }

    # Make sure we found a genome assembly.
    if not (expected_genome_assembly or files_by_genome_assembly):
        return {
            "success" : False,
            "errors": "No Genome Assembly provided or found in files."
        }

    # Everything is verified.
    return {
        "success" : True,
        "errors": "",
        "genome_assembly": expected_genome_assembly or list(files_by_genome_assembly.keys())[0]
    }

def add_single_file_to_higlass_viewconf(views, file, genome_assembly, higlass_viewconfig, first_view_location_and_zoom, maximum_height):
    """ Add a single file to the list of views.
    Args:
        views(list)             : All of the views from the view config.
        file(dict)              : The file to add.
        genome_assembly(str)    : A string showing the new genome assembly.
        higlass_viewconfig(dict): View config description.
        first_view_location_and_zoom(list): 3 numbers (or 3 None) used to describe the camera position of the first view.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """

    # Investigate the base view to see if it has a center track with contents (excluding 2d-chromosome-grid)
    base_view_info = get_view_content_info(views[0])
    base_view_has_center_content = base_view_info["has_center_content"]

    # If there is only one view with no files inside, set the initial domains based on the genome assembly
    if len(views) == 1 and not (base_view_has_center_content or base_view_info["has_left_tracks"] or base_view_info["has_top_tracks"]):
        domain_sizes = get_initial_domains_by_genome_assembly(genome_assembly)
        views[0].update(domain_sizes)

    # Determine the kind of file we're working on:
    # - Is it 1D or 2D? (chromsize is considered 1D)
    # - Is it a reference file? (Positioning rules are different)
    file_format_settings = {
        "/file-formats/bg/" : {
            "dimensions": 1,
            "reference": None,
            "function": add_bg_bw_multivec_bed_file,
        },
        "/file-formats/bw/" : {
            "dimensions": 1,
            "reference": None,
            "function": add_bg_bw_multivec_bed_file,
        },
        "/file-formats/bed/" : {
            "dimensions": 1,
            "reference": None,
            "function": add_bg_bw_multivec_bed_file,
        },
        "/file-formats/bigbed/": {
            "dimensions": 1,
            "reference": None,
            "function": add_bigbed_file,
        },
        "/file-formats/beddb/": {
            "dimensions": 1,
            "reference": "gene-annotations",
            "function": add_beddb_file,
        },
        "/file-formats/chromsizes/" : {
            "dimensions": 1,
            "reference": "chromsizes",
            "function": add_chromsizes_file,
        },
        "/file-formats/mcool/" : {
            "dimensions": 2,
            "reference": None,
            "function": add_mcool_hic_file,
        },
        "/file-formats/hic/" : {
            "dimensions": 2,
            "reference": None,
            "function": add_mcool_hic_file,
        },
    }

    file_format = file["file_format"]
    if file_format not in file_format_settings:
        return None, "Unknown file format {file_format}".format(file_format=file_format)

    file_settings = file_format_settings[file_format]

    # Add a new view if all of these are true:
    # - This file is 2D.
    # - The base view has a central track with a 2D file.
    add_new_view = file_settings["dimensions"] == 2 and base_view_has_center_content

    if add_new_view:
        # If there are already 6 views and we need to add a new one, stop and return an error.
        if len(views) >= 6:
            return None, "You cannot have more than 6 views in a single display."

    # Based on the file type, call a subfunction to add the given file.
    return file_settings["function"](
        views,
        file["data"],
        genome_assembly,
        {
            "higlass_viewconfig": higlass_viewconfig,
            "first_view_location_and_zoom": first_view_location_and_zoom,
        },
        maximum_height,
    )

def get_initial_domains_by_genome_assembly(genome_assembly):
    """Get a list of defaults HiGlass data ranges for a file.
    Args:
        genome_assembly(string): Description of the genome assembly.
    Returns:
        A dict with these keys:
        initialXDomain(list): Contains 2 numbers. The HiGlass display will horizontally span all of these data points along the X axis. 0 would be the start of chr1, for example.
        initialYDomain(list): Contains 2 numbers. The HiGlass display will focus on the center of this data (for 2D views) or ignore initialYDomain entirely (for 1D views.)
    """

    # Create default view options.
    domain_size_by_genome_assembly = {
        "GRCm38": 2725521370,
        "GRCh38": 3088269832,
        "dm6": 137547960,
        "galGal5": 1022704034
    }

    domain_size = domain_size_by_genome_assembly.get(genome_assembly, 2000000000)

    domain_ranges = {
        "initialXDomain": [
            domain_size * -1 / 4,
            domain_size * 5 / 4
        ],
        "initialYDomain": [
            domain_size * -1 / 4,
            domain_size * 5 / 4
        ]
    }
    return domain_ranges

def get_view_content_info(view):
    """ Determines if the view has an empty center, and looks for 2d chromosome grids.

    Args:
        view(dict): The view to analyze.

    Returns:
        A dictionary with these keys:
        has_top_tracks(bool)       : True if the view has top side tracks
        has_left_tracks(bool)       : True if the view has left side tracks
        has_center_content(bool)    : True if there is any content in the center tracks.
        center_chromsize_index(int) : If there is a 2d chromosome grid in the center, get the index in the list to find it.
    """
    view_has_left_tracks = len(view["tracks"].get("left", [])) > 0
    view_has_top_tracks = len(view["tracks"].get("top", [])) > 0

    # See if there is any center content (including chromsize grids)
    view_has_any_center_content = len(view["tracks"].get("center", [])) > 0 \
    and len(view["tracks"]["center"][0].get("contents", [])) > 0

    # See if there is any non-chromosome grid content.
    view_has_center_content = view_has_any_center_content and \
    any([t for t in view["tracks"]["center"][0]["contents"] if "type" != "2d-chromosome-grid"])

    # Determine the index of the chromosome grid (we assume there is only 1)
    view_center_chromsize_indecies = []
    if view_has_any_center_content:
        view_center_chromsize_indecies = [i for i, t in enumerate(view["tracks"]["center"][0]["contents"]) if "type" == "2d-chromosome-grid"]
    view_center_chromsize_index = None
    if len(view_center_chromsize_indecies) > 0:
        view_center_chromsize_index = view_center_chromsize_indecies[0]

    return {
        "has_top_tracks" : view_has_top_tracks,
        "has_left_tracks" : view_has_left_tracks,
        "has_center_content" : view_has_center_content,
        "center_chromsize_index" : view_center_chromsize_index,
    }

def add_bg_bw_multivec_bed_file(views, file, genome_assembly, viewconfig_info, maximum_height):
    """ Add the bedGraph, bed, or bigwig file to add to the given views.
    Args:
        views(list)         : All of the views from the view config.
        file(dict)          : The file to add.
        genome_assembly(str): A string showing the new genome assembly.
        viewconfig_info(dict): Information for the viewconfig, including the view parameters and view locks.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """

    # Create a new track.
    new_track_base = {
        "server": "https://higlass.4dnucleome.org/api/v1",
        "tilesetUid": file["higlass_uid"],
        "name": file["display_title"],
        "options": {
            "name": get_title(file),
            "labelPosition": "topLeft",
        },
        "type": "horizontal-divergent-bar",
        "orientation": "1d-horizontal",
        "uid": uuid.uuid4(),
    }

    # bed files use the bedlike type instead.
    if file["file_format"] == "/file-formats/bed/":
        new_track_base["type"] = "bedlike"

    if file.get("extra_files"):
        for extra_file in file["extra_files"]:
            # handle multivec files
            if extra_file["file_format"].endswith("bed.multires.mv5/"):
                new_track_base["type"] = "horizontal-stacked-bar"
                new_track_base["options"]["barBorder"] = False
                break

    if file.get("higlass_defaults"):
        new_track_base["options"].update(file["higlass_defaults"])

    return add_1d_file(views, new_track_base, genome_assembly, maximum_height)


def get_title(file):
    """ Returns a string containing the title for the given file.

    Args:
        file(dict): Describes the file.

    Returns:
        String representing the title.
    """
    # Use the track title. As a fallback, use the display title.
    title = file.get("track_and_facet_info", {}).get("track_title", file["display_title"])
    return title

def add_bigbed_file(views, file, genome_assembly, viewconfig_info, maximum_height):
    """ Use the bigbed file to add to the given views.
    Args:
        views(list)         : All of the views from the view config.
        file(dict)          : The file to add.
        genome_assembly(str): A string showing the new genome assembly.
        viewconfig_info(dict): Information for the viewconfig, including the view parameters and view locks.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """
    # Create a new track.
    new_track_base = {
        "server": "https://higlass.4dnucleome.org/api/v1",
        "tilesetUid": file["higlass_uid"],
        "name": file["display_title"],
        "options": {
            "name": get_title(file),
            "colorRange": [],
            "labelPosition": "topLeft",
            "heatmapValueScaling": "log",
        },
        "height": 18,
        "type": "horizontal-vector-heatmap",
        "orientation": "1d-horizontal",
        "uid": uuid.uuid4(),
    }


    def get_color_by_index(color_index, known_colors):
        """Use linear interpolation to get a color for the given index.
        Assumes indecies and values are between 0 and 255.

        Args:
            color_index(integer): The index we want to get the color for.
            known_colors(dict): A dictionary containing index to value mappings.
                If indecies are missing, we'll use linear interpolation to guess
                the value.

        Returns:
            An integer noting the value.
        """

        # If the color_index is in known_colors, return that value
        if color_index in known_colors:
            return known_colors[color_index]

        # We need to linearly interpolate using 2 known values the value is between.
        # Sort all of the indecies, adding 0 and 255 if they don't exist.
        known_color_indecies = [k for k in known_colors.keys()]
        if 0 not in known_color_indecies:
            known_color_indecies.append(0)
        if 255 not in known_color_indecies:
            known_color_indecies.append(255)
        known_color_indecies = sorted(known_color_indecies)

        # Get the two nearest indecies the color_index is inbetween.
        lower_bound_index = known_color_indecies[0]
        upper_bound_index = known_color_indecies[-1]

        for index in known_color_indecies:
            if index >= color_index:
                upper_bound_index = index
                break
            else:
                lower_bound_index = index

        # Get the values for the two bounding indecies. Assume 0:0 and 255:255 if they are not provided.
        lower_value = known_colors.get(lower_bound_index, 0)
        upper_value = known_colors.get(upper_bound_index, 255)

        # Begin linear interpolation. First, calculate the slope.
        slope = (upper_value - lower_value) / (upper_bound_index - lower_bound_index)

        # Use the lower bound to discover the offset.
        offset = lower_value - (lower_bound_index * slope)

        # With the slope and the offset, we can calculate the expected value.
        interpolated_color = (slope * color_index) + offset
        return int(interpolated_color)

    # Add the color values for an RGB display. Add known values here and we will linearly interpolate everything else.
    color_range_by_color = {
        "red": {
            0:99,
            128:60,
            255:25,
        },
        "green": {
            0:20,
            128:12,
            255:13,
        },
        "blue": {
            0:99,
            128:60,
            255:25,
        },
    }

    # HiGlass expects a list of 256 strings, each containing an integer.
    for index in range(256):
        # Get derived colors.
        colors = { color : get_color_by_index(index, color_range_by_color[color]) for color in color_range_by_color.keys()}
        new_track_base["options"]["colorRange"].append(
            "rgba({r},{g},{b},1)".format(
                r=colors["red"],
                g=colors["green"],
                b=colors["blue"],
            )
        )

    if file.get("higlass_defaults"):
        new_track_base["options"].update(file["higlass_defaults"])

    return add_1d_file(views, new_track_base, genome_assembly, maximum_height)

def add_1d_file(views, new_track, genome_assembly, maximum_height):
    """ Use file to add to all of view's tracks.
    Args:
        views(list)         : All of the views from the view config.
        new_track(dict)     : The track to add.
        genome_assembly(str): A string showing the new genome assembly.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """

    # For each view:
    for view in views:
        # Add to the "top" tracks, after the gene annotation track but before the chromsize tracks.
        non_gene_annotation_indecies = [i for i, track in enumerate(view["tracks"]["top"]) if "gene-annotations" not in track["type"]]

        new_track_to_add = deepcopy(new_track)

        if len(non_gene_annotation_indecies) > 0:
            view["tracks"]["top"].insert(non_gene_annotation_indecies[-1], new_track_to_add)
        else:
            view["tracks"]["top"].insert(0, new_track_to_add)

    views, error = resize_1d_tracks(views, maximum_height)
    return views, error

def resize_1d_tracks(views, maximum_height):
    """ For each view, resize the top 1D tracks (excluding gene-annotation and chromosome)
    Args:
        views(list)         : All of the views from the view config.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
        maximum_height(integer): Maximum height for the viewconf to hold all tracks.
    """

    for view in views:
        view_info = get_view_content_info(view)

        # Skip to the next view if there are no top tracks.
        if not view_info["has_top_tracks"]:
            continue

        top_tracks = [ t for t in view["tracks"]["top"] if t["type"] not in ("horizontal-gene-annotations", "horizontal-chromosome-labels", "horizontal-vector-heatmap") ]

        # Skip to the next view if there are no data tracks.
        if len(top_tracks) < 1:
            continue

        gene_chromosome_tracks = [ t for t in view["tracks"]["top"] if t["type"] in ("horizontal-gene-annotations", "horizontal-chromosome-labels") ]

        horizontal_vector_heatmap_tracks = [ t for t in view["tracks"]["top"] if t["type"] in ("horizontal-vector-heatmap") ]

        # Get the height allocated for all of the top tracks.
        remaining_height = maximum_height - 50
        # If there is a central view, the top rows will have less height to work with.
        if view_info["has_center_content"]:
            remaining_height = 100

        # Remove the height from the chromosome and gene-annotation tracks
        for track in gene_chromosome_tracks:
            remaining_height -= track.get("height", 50)

        # Remove the height from the horizontal-vector-heatmap tracks
        for track in horizontal_vector_heatmap_tracks:
            remaining_height -= track.get("height", 18)

        # Evenly divide the remaining height.
        height_per_track = remaining_height / len(top_tracks)

        # Set the maximum track height.
        if view_info["has_center_content"]:
            # We want to maximize the center track space, so cap the top track height to 35.
            if height_per_track > 35:
                height_per_track = 35
        else:
            # The height should be no more than half the height
            if height_per_track > remaining_height / 2:
                height_per_track = remaining_height / 2
            # Cap the height to about 125
            if height_per_track > 125:
                height_per_track = 125

        # Minimum height is 20.
        if height_per_track < 20:
            height_per_track = 20

        for track in top_tracks:
            # If it's too tall or too short, set it to the fixed height.
            if "height" not in track or track["height"] > height_per_track or track["height"] < height_per_track * 0.8:
                track["height"] = int(height_per_track)
    return views, ""

def add_beddb_file(views, file, genome_assembly, viewconfig_info, maximum_height):
    """ Use the beddb file to add to the given view.
    Args:
        views(list)         : All of the views from the view config.
        file(dict)          : The file to add.
        genome_assembly(str): A string showing the new genome assembly.
        viewconfig_info(dict): Information for the viewconfig, including the view parameters and view locks.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """
    # Create a new track.
    new_track_base = {
        "server": "https://higlass.4dnucleome.org/api/v1",
        "tilesetUid": file["higlass_uid"],
        "name": file["display_title"],
        "options": {
            "name": get_title(file),
        }
    }

    if file.get("higlass_defaults"):
        new_track_base["options"].update(file["higlass_defaults"])

    new_tracks_by_side = {
        "top": deepcopy(new_track_base),
        "left": deepcopy(new_track_base),
    }

    new_tracks_by_side["top"]["type"] = "horizontal-gene-annotations"
    new_tracks_by_side["top"]["orientation"] = "1d-horizontal"
    new_tracks_by_side["top"]["uid"] = uuid.uuid4()

    new_tracks_by_side["left"]["type"] = "vertical-gene-annotations"
    new_tracks_by_side["left"]["orientation"] = "1d-vertical"
    new_tracks_by_side["left"]["uid"] = uuid.uuid4()

    # For each view:
    for view in views:
        # Find out about the left and center tracks.
        view_content_info = get_view_content_info(view)

        # Update the genome position search bar
        update_genome_position_search_box(view, file)

        # Add the track to the 0th position
        for side in ("top", "left"):
            new_track = new_tracks_by_side[side]

            # Add the track to the left side if there is left content or there is central content.
            if side == "left" and not (view_content_info["has_left_tracks"] or view_content_info["has_center_content"]):
                continue

            # Add in the 0th position if it doesn't exist already.
            view["tracks"][side].insert(0, new_track)
    return views, ""


def update_genome_position_search_box(view, new_file):
    """ Update the genome position search box for this view so it uses the given file.

    Args:
        view(dict)      : Modifies the view containing the search box.
        new_file(dict)  : Description of the source file.

    Returns:
        None
    """
    view["autocompleteSource"] = "/api/v1/suggest/?d={uuid}&".format(uuid=new_file["higlass_uid"])

    if not "genomePositionSearchBox" in view:
        view["genomePositionSearchBox"] = {
            "autocompleteServer" : "https://higlass.4dnucleome.org/api/v1",
            "chromInfoServer" : "https://higlass.4dnucleome.org/api/v1"
        }

    view["genomePositionSearchBox"]["autocompleteId"] = new_file["higlass_uid"]

    try:
        view["genomePositionSearchBox"]["chromInfoId"] = new_file["genome_assembly"]
    except KeyError:
        pass

    view["genomePositionSearchBox"]["visible"] = True

def add_chromsizes_file(views, file, genome_assembly, viewconfig_info, maximum_height):
    """ Use the chromsizes file to add to the given view.
    Args:
        views(list)         : All of the views from the view config.
        file(dict)          : The file to add.
        genome_assembly(str): A string showing the new genome assembly.
        viewconfig_info(dict): Information for the viewconfig, including the view parameters and view locks.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """
    # Create a new track.
    new_track_base_1d = {
        "server": "https://higlass.4dnucleome.org/api/v1",
        "tilesetUid": file["higlass_uid"],
        "name": file["display_title"],
        "options": {
            "name": get_title(file),
        }
    }

    if file.get("higlass_defaults"):
        new_track_base_1d["options"].update(file["higlass_defaults"])

    new_tracks_by_side = {
        "top": deepcopy(new_track_base_1d),
        "left": deepcopy(new_track_base_1d),
        "center": create_2d_content(file, "2d-chromosome-grid"),
    }

    new_tracks_by_side["top"]["type"] = "horizontal-chromosome-labels"
    new_tracks_by_side["top"]["orientation"] = "1d-horizontal"
    new_tracks_by_side["top"]["uid"] = uuid.uuid4()

    new_tracks_by_side["left"]["type"] = "vertical-chromosome-labels"
    new_tracks_by_side["left"]["orientation"] = "1d-vertical"
    new_tracks_by_side["left"]["uid"] = uuid.uuid4()

    new_tracks_by_side["center"]["name"] = "Chromosome Grid"
    del new_tracks_by_side["center"]["options"]["name"]
   

    # For each view:
    for view in views:
        # Find out about the left and center tracks.
        view_content_info = get_view_content_info(view)

        # Add the track to the 0th position
        for side in ("top", "left"):
            new_track = new_tracks_by_side[side]

            # Add the track to the left side if there is left content or there is central content.
            if side == "left" and not (view_content_info["has_left_tracks"] or view_content_info["has_center_content"]):
                continue

            # Add in the last position if it doesn't exist already.
            view["tracks"][side].append(new_track)

        # add a 2D chromsize grid overlay on the center (replace the existing track if it exists)
        if view_content_info["has_center_content"]:
            if view_content_info["center_chromsize_index"] != None:
                view["tracks"]["center"][0]["contents"][view_content_info["center_chromsize_index"]] =  new_tracks_by_side["center"]
            else:
                view["tracks"]["center"][0]["contents"].append(new_tracks_by_side["center"])
    return views, ""

def add_mcool_hic_file(views, file, genome_assembly, viewconfig_info, maximum_height):
    """ Use the mcool or hic file to add to the given view.

    Args:
        views(list)         : All of the views from the view config.
        file(dict)          : The file to add.
        genome_assembly(str): A string showing the new genome assembly.
        viewconfig_info(dict): Information for the viewconfig, including the view parameters and view locks.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """

    # Make 2D content.
    new_content = create_2d_content(file, "heatmap")
    return add_2d_file(views, new_content, viewconfig_info, maximum_height)

def add_2d_file(views, new_content, viewconfig_info, maximum_height):
    """ Add the new 2D content generated by the file to add to the first available view (create a new view if needed.)
    Args:
        views(list)         : All of the views from the view config.
        new_content(dict)   : Description of the new center track.
        viewconfig_info(dict): Information for the viewconfig, including the view parameters and view locks.
        maximum_height(integer) : All of the tracks should fit within this much height or less.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """
    # Look at the first view.
    base_view_info = get_view_content_info(views[0])

    # If there is no center non-chromsize content, then this means the base view has an empty central contents.
    if not base_view_info["has_center_content"]:
        # Create a base central track if one doesn't exist.
        if len(views[0]["tracks"]["center"]) == 0:
            views[0]["tracks"]["center"] = [
                {
                    "contents":[],
                    "type": "combined",
                }
            ]

        # Add the file to the center
        views[0]["tracks"]["center"][0]["contents"].append(new_content)
        # Copy the top reference tracks to the left
        copy_top_reference_tracks_into_left(views[0], views)

        # Add the chromsize track as a 2D grid, if it doesn't exist.
        if base_view_info["center_chromsize_index"] == None:
            # Get the chromsize from the top tracks.
            chromsize_tracks = [ t for t in views[0]["tracks"]["top"] if "-chromosome-labels" in t["type"] ]

            contents = {
                "name": "Chromosome Grid"
            }
            if len(chromsize_tracks) > 0:
                chrom_source = chromsize_tracks[-1]

                for key in ("tilesetUid", "server"):
                    contents[key] = chrom_source.get(key, "")

                contents["options"] = {}
                contents["type"] = "2d-chromosome-grid"
                # The grid should be the last item to draw so it is always visible.
                views[0]["tracks"]["center"][0]["contents"].append(contents)
        # Resize 1d tracks.
        views, error = resize_1d_tracks(views, maximum_height)
        return views, error

    # If there is central content, then we need to make a new view.
    # Stop if there are already 6 views.
    if len(views) >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # Clone the base view, including tracks. Make sure the view and layout uids are unique.
    new_view = deepcopy(views[0])
    new_view["uid"] = uuid.uuid4()
    new_view["tracks"]["center"][0]["uid"] = uuid.uuid4()

    # Replace the central track with the new file
    for i, track in enumerate(new_view["tracks"]["center"][0]["contents"]):
        if track["type"] != "2d-chromosome-grid":
            new_view["tracks"]["center"][0]["contents"][i] = new_content
            break

    # Change the uid of the chromosome grid on the central track.
    for i, track in enumerate(new_view["tracks"]["center"][0]["contents"]):
        if track["type"] == "2d-chromosome-grid":
            new_view["tracks"]["center"][0]["contents"][i]["uid"] = uuid.uuid4()

    views.append(new_view)

    # Resize/Repack views
    repack_higlass_views(views)

    # Create locks based on the base view.
    if len(views) > 1:
        for view in views:
            add_zoom_lock_if_needed(viewconfig_info["higlass_viewconfig"], view, viewconfig_info["first_view_location_and_zoom"])

    # Resize 1d tracks.
    views, error = resize_1d_tracks(views, maximum_height)
    return views, error

def create_2d_content(file, viewtype):
    """ Generates a 2D track.
    Args:
        file(dict): Information about the given file.
        viewtype(string): The desired content type.

    Returns:
        A dictionary that describes the content.
    """
    contents = {}

    contents["tilesetUid"] = file["higlass_uid"]
    contents["name"] = file["display_title"]
    contents["type"] = viewtype
    contents["server"] = "https://higlass.4dnucleome.org/api/v1"

    # Add specific information for this file.
    contents["options"] = {}
    contents["options"]["name"] = get_title(file)

    if file.get("higlass_defaults"):
        contents["options"].update(file["higlass_defaults"])

    return contents

def copy_top_reference_tracks_into_left(target_view, views):
    """ Copy the reference tracks from the top track into the left (if the left doesn't have them already.)

    Args:
        target_view(dict)   : View which will be modified to get the new tracks.
        views(list)         : The first view contains the top tracks to copy from.

    Returns:
        Boolean value indicating success.
    """

    if len(views) < 1:
        return target_view

    reference_file_type_mappings = {
        "horizontal-chromosome-labels": "vertical-chromosome-labels",
        "horizontal-gene-annotations": "vertical-gene-annotations",
    }

    orientation_mappings = {
        "1d-horizontal": "1d-vertical",
        "1d-vertical" : "1d-horizontal",
    }

    # Look through all of the top views for the chromsize and the gene annotation tracks.
    # Make a shallow copy of the found reference tracks.
    new_tracks = []
    for track in (t for t in views[0]["tracks"]["top"] if t["type"] in reference_file_type_mappings.keys()):
        new_tracks.append(deepcopy(track))

    # Change the horizontal track type to vertical track types.
    for track in new_tracks:
        # Rename the uid so it doesn't conflict with the top track.
        if "uid" in track:
            track_string = str(track["uid"])
            if track_string.startswith("top"):
                track["uid"] = track_string.replace("top", "left", 1)
            else:
                track["uid"] = uuid.uuid4()
        else:
            track["uid"] = uuid.uuid4()

        if track["type"] in reference_file_type_mappings:
            track["type"] = reference_file_type_mappings[ track["type"] ]

        # Swap the height and widths, if they are here.
        temp_height = track.get("width", None)
        temp_width = track.get("height", None)

        if temp_height and temp_width:
            track["height"] = temp_height
            track["width"] = temp_width
        elif temp_height:
            track["height"] = temp_height
            del track["width"]
        elif temp_width:
            track["width"] = temp_width
            del track["height"]
        
        # And the orientation
        track_orientation = track.get("orientation", None)
        if track_orientation in orientation_mappings:
            track["orientation"] = orientation_mappings[track_orientation]

    # Add the copied tracks to the left side of this view if it doesn't have the track already.
    for track in reversed(new_tracks):
        if any([t for t in target_view["tracks"]["left"] if t["type"] == track["type"]] ) == False:
            target_view["tracks"]["left"].insert(0, track)
    return target_view

def repack_higlass_views(views):
    """Set up the higlass views so they fit in a 3 x 2 grid. The packing order is:
    1 2 5
    3 4 6

    Args:
        views(list): Modifies the views and changes their position and size.

    Returns:
        None
    """

    # Get the number of views. Do nothing if there are more than 6.
    views_count = len(views)
    if views_count < 1:
        return
    if views_count > 6:
        return

    # Determine the width and height of each view, evenly dividing a 12 x 12 area.
    width = 12
    if views_count >= 5:
        width = 4
    elif views_count > 1:
        width = 6

    height = 12
    if views_count > 2:
        height = 6

    # Keep track of the x and y coordinates for each view.
    x = 0
    y = 0

    # For each view
    for higlass_view in views:
        # Set the x and y coordinate for this view
        higlass_view["layout"]["x"] = x
        higlass_view["layout"]["y"] = y
        higlass_view["layout"]["w"] = width
        higlass_view["layout"]["h"] = height

        # Increment the x counter
        x += width

        # Increment the x & y counter if the x counter needs to wrap around
        if x >= 12:
            y += height
            x = 0

def add_zoom_lock_if_needed(view_config, view, scales_and_center_k):
    """ If there are multiple views, create a lock to keep them at the same position and scale.
    Args:
        view_config (dict)          : The HiGlass view config. Will be modified.
        view (dict)                 : The view to add the lock to. Will be modified.
        scales_and_center_k(list)   : 3 numbers used to note the position and zoom level.

    Returns:
        Boolean indicating success.
    """

    # If there is only 1 view, then there is no need to add a lock.
    if len(view_config["views"]) <= 1:
        view_config["locationLocks"] = {}
        view_config["zoomLocks"] = {}
        return

    # Get the uid for this view
    view_uid = str(view["uid"])

    # If the view already exists in the viewconf, no work is needed.
    if view_uid in view_config["locationLocks"]["locksByViewUid"]:
        return

    # Find the lock the first view is in.
    base_uid = str(view_config["views"][0]["uid"])
    base_view_x = scales_and_center_k[0]
    base_view_y = scales_and_center_k[1]
    base_view_zoom = scales_and_center_k[2]

    base_initial_x_domain = view_config["views"][0]["initialXDomain"]
    base_initial_y_domain = view_config["views"][0]["initialYDomain"]

    # If there is no base view zoom, calculate it based on the X domain.
    if base_view_x == None and base_view_y == None and base_view_zoom == None:
        # Use the Domain's midway point for the lock's x and y coordinates.
        base_view_x = (base_initial_x_domain[0] + base_initial_x_domain[1]) / 2.0
        base_view_y = (base_initial_y_domain[0] + base_initial_y_domain[1]) / 2.0

        # The zoom level just needs to be the same.
        base_view_zoom = 1

    # Set the location and zoom locks.
    for lock_name in ("locationLocks", "zoomLocks"):
        # Refer to the same lock the base view uses.
        lockUuid = view_config[lock_name]["locksByViewUid"].get(base_uid, None)
        if not lockUuid:
            # The base view doesn't have a lock, so create a new one and add the base view to it.
            lockUuid = str(uuid.uuid4())
            view_config[lock_name]["locksByViewUid"][base_uid] = lockUuid
            view_config[lock_name]["locksDict"][lockUuid] = {}
            view_config[lock_name]["locksDict"][lockUuid][base_uid] = [
                base_view_x,
                base_view_y,
                base_view_zoom
            ]
        else:
            base_view_x = view_config[lock_name]["locksDict"][lockUuid][base_uid][0]
            base_view_y = view_config[lock_name]["locksDict"][lockUuid][base_uid][1]
            base_view_zoom = view_config[lock_name]["locksDict"][lockUuid][base_uid][2]

        # Lock the new view with the base view.
        view_config[lock_name]["locksByViewUid"][view_uid] = lockUuid
        view_config[lock_name]["locksDict"][lockUuid][view_uid] = [
            base_view_x,
            base_view_y,
            base_view_zoom
        ]

        # Copy the initialXDomain and initialYDomain
        view["initialXDomain"] = view_config["views"][0]["initialXDomain"] or view["initialXDomain"]
        view["initialYDomain"] = view_config["views"][0]["initialYDomain"] or view["initialYDomain"]
    return True

def remove_left_side_if_all_1D(new_views):
    """ If the view config has no 2D files, then remove the left side from the view config.

    Args:
        new_views(list): The views that will make the new HiGlass view config. May be modified.

    Returns:
        True if the left side tracks were removed, False otherwise.
    """

    # Search all views' central contents for any 2D files.
    for view in new_views:
        for center_track in view["tracks"]["center"]:
            if "contents" not in center_track:
                continue

            # If 2D files are found, we shouldn't remove any tracks.
            if any([ t for t in center_track["contents"] if t["type"] in ("heatmap", "2d-chromosome-grid")]):
                return False

    # Remove the left side from each file in the view config.
    for view in new_views:
        view["tracks"]["left"] = []
    return True
