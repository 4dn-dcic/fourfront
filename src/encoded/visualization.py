from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPBadRequest
from snovault import CONNECTION
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
from .search import (
    DEFAULT_BROWSE_PARAM_LISTS,
    make_search_subreq,
    search as perform_search_request
)
from .types.base import Item
from .types.workflow import (
    trace_workflows,
    DEFAULT_TRACING_OPTIONS,
    WorkflowRunTracingException,
    item_model_to_object
)
from .types.base import get_item_if_you_can

def includeme(config):
    config.add_route('trace_workflow_runs',         '/trace_workflow_run_steps/{file_uuid}/', traverse='/{file_uuid}')
    config.add_route('bar_plot_chart',              '/bar_plot_aggregations')
    config.add_route('date_histogram_aggregations', '/date_histogram_aggregations/')
    config.add_route('add_files_to_higlass_viewconf', '/add_files_to_higlass_viewconf/')
    config.scan(__name__)

# TODO: figure out how to make one of those cool /file/ACCESSION/@@download/-like URLs for this.
@view_config(route_name='trace_workflow_runs', request_method='GET', permission='view', context=Item)
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
    #"total_exp_raw_files_new2" : {
    #    "nested" : {
    #        "path" : "embedded.experiments_in_set"
    #    },
    #    "aggs" : {
    #        "total" : {
    #            "value_count" : {
    #                "field" : "embedded.experiments_in_set.files.accession.raw",
    #                #"script" : "doc['embedded.experiments_in_set.accession.raw'].value + '~' + doc['embedded.experiments_in_set.files.accession.raw'].value",
    #                #"precision_threshold" : 10000
    #            }
    #        }
    #    }
    #},
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
    "total_files" : {
        "bucket_script" : {
            "buckets_path": {
                "expSetProcessedFiles": "total_expset_processed_files",
                "expProcessedFiles": "total_exp_processed_files",
                "expRawFiles": "total_exp_raw_files"
            },
            "script" : "params.expSetProcessedFiles + params.expProcessedFiles + params.expRawFiles"
        }
    },
    "total_experiments" : {
        "value_count" : {
            "field" : "embedded.experiments_in_set.accession.raw"
        }
    }
}




@view_config(route_name='bar_plot_chart', request_method=['GET', 'POST'])
def bar_plot_chart(request):

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
        "field_0" : {
            "terms" : {
                "field" : "embedded." + fields_to_aggregate_for[0] + '.raw',
                "missing" : TERM_NAME_FOR_NO_VALUE,
                "size" : MAX_BUCKET_COUNT
            },
            "aggs" : deepcopy(SUM_FILES_EXPS_AGGREGATION_DEFINITION)
        }
    }

    primary_agg.update(deepcopy(SUM_FILES_EXPS_AGGREGATION_DEFINITION))
    del primary_agg['total_files'] # "bucket_script" not supported on root-level aggs

    # Nest in additional fields, if any
    curr_field_aggs = primary_agg['field_0']['aggs']
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
            "experiments" : search_result['aggregations']['total_experiments']['value'],
            "files" : (
                search_result['aggregations']['total_expset_processed_files']['value'] +
                search_result['aggregations']['total_exp_raw_files']['value'] +
                search_result['aggregations']['total_exp_processed_files']['value']
            )
        },
        "other_doc_count": search_result['aggregations']['field_0'].get('sum_other_doc_count', 0),
        "time_generated" : str(datetime.utcnow())
    }


    def format_bucket_result(bucket_result, returned_buckets, curr_field_depth = 0):

        curr_bucket_totals = {
            'experiment_sets'   : int(bucket_result['doc_count']),
            'experiments'       : int(bucket_result['total_experiments']['value']),
            'files'             : int(bucket_result['total_files']['value'])
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


    for bucket in search_result['aggregations']['field_0']['buckets']:
        format_bucket_result(bucket, ret_result['terms'], 0)

    return ret_result



@view_config(route_name='date_histogram_aggregations', request_method=['GET', 'POST'])
def date_histogram_aggregations(request):
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
def add_files_to_higlass_viewconf(request):
    """ Add multiple files to the given Higlass view config.

    Args:
        request(obj): Http request object. Assumes request's request is JSON and contains these keys:
            higlass_viewconfig(obj)                     : JSON of the current Higlass views. If None, uses a default view.
            files(array)                                : A list of file uuids to add.
            firstViewLocationAndZoom(array, optional)   : A list of three numbers indicating the location and zoom levels of the first existing view.
            remove_unneeded_tracks(boolean, optional, default=False): If True, we'll remove tracks that are not needed for the view.

    Returns:
        {
            success(bool)           : Boolean indicating success.
            errors(str)             : A string containing errors. Will be None if this is successful.
            new_viewconfig(dict)    : New dict representing the new viewconfig.
            new_genome_assembly(str): A string showing the new genome assembly.
        }
    """

    # Get the viewconfig and its genome assembly. If none is provided, use the default empty higlass viewconf.
    higlass_viewconfig = request.json_body.get('higlass_viewconfig', None)
    current_genome_assembly = request.json_body.get('genome_assembly', None)
    remove_unneeded_tracks = request.json_body.get('remove_unneeded_tracks', None)
    if not higlass_viewconfig:
        default_higlass_viewconf = get_item_if_you_can(request, "00000000-1111-0000-1111-000000000000")
        higlass_viewconfig = default_higlass_viewconf["viewconfig"]
        current_genome_assembly = None

    if not higlass_viewconfig:
        return {
            "success" : False,
            "errors": "No view config found.",
            "new_viewconfig": None,
            "new_genome_assembly" : None
        }

    first_view_location_and_zoom = request.json_body.get('firstViewLocationAndZoom', [None, None, None])

    # Get the file list.
    files = request.json_body.get('files')
    if not isinstance(files, list):
        raise Exception("Expecting list of files.")

    new_file_uuids = files
    new_views = higlass_viewconfig["views"]

    # Get all of the file information.
    files_info = []
    for file_uuid in new_file_uuids:
        files_info.append({
            "uuid" : file_uuid,
            "item" : get_item_if_you_can(request, file_uuid),
        })

    # Scan the files to make sure they exist and have the expected fields.
    validation_check = check_files_for_higlass(files_info, current_genome_assembly)
    if not validation_check["success"]:
        return_keys = ("success", "errors")
        error_response = { key:validation_check[key] for key in return_keys if key in validation_check }
        error_response["new_viewconfig"] = None
        error_response["new_genome_assembly"] = None
        return error_response

    # Extract the current_genome_assembly from the validation check.
    current_genome_assembly = validation_check["current_genome_assembly"]

    for datum in files_info:
        file_uuid = datum["uuid"]
        new_file_dict = datum["item"]

        # Try to add the new file to the given viewconf.
        new_views, errors = add_single_file_to_higlass_viewconf(higlass_viewconfig["views"], new_file_dict, current_genome_assembly)

        if errors:
            return {
                "success" : False,
                "errors" : "errors found while adding {file_uuid} : {errors}".format(file_uuid=file_uuid, errors=errors),
                "new_viewconfig": None,
                "new_genome_assembly" : None
            }

    # See if 2D chromsize files need to be added.
    views, errors = add_2d_chromsize(new_views, files_info)
    if errors:
        return {
            "success" : False,
            "errors" : "errors found while adding chromsizes file : {errors}".format(errors=errors),
            "new_viewconfig": None,
            "new_genome_assembly" : None
        }

    new_views = views
    # Resize and reposition the Higlass views.
    repack_higlass_views(new_views)

    # Set up the additional views so they all move and zoom with the first.
    # A single view does not need a lock.
    if len(new_views) > 1:
        for view in new_views:
            add_zoom_lock_if_needed(higlass_viewconfig, view, first_view_location_and_zoom)

    # Remove tracks that we don't need to represent this view conf.
    if remove_unneeded_tracks:
        remove_left_side_if_all_1D(new_views)

    higlass_viewconfig["zoomFixed"] = False
    higlass_viewconfig["views"] = new_views
    return {
        "success" : True,
        "errors": "",
        "new_viewconfig" : higlass_viewconfig,
        "new_genome_assembly" : current_genome_assembly
    }

def check_files_for_higlass(files_info, current_genome_assembly):
    """ Scan the files to make sure they exist and have the expected fields.
    Args:
        files_info(list): A list of dictionaries describing each file with a Higlass view. Each dict contains:
            uuid(str): Unique identifier
            item(dict): File metadata
        current_genome_assembly(str): If not None, all of the files with genome assemblies must match this.

    Returns:
        {
            success(bool)               : True if there were no errors.
            current_genome_assembly(str): A string indicating the genome assembly of the files.
            errors(str)                 : A string (or None if there are no errors)
        }
    """
    for datum in files_info:
        file_uuid = datum["uuid"]
        new_file_dict = datum["item"]

        if not new_file_dict:
            return {
                "success" : False,
                "errors" : "File {uuid} does not exist".format(uuid=file_uuid),
            }
        if not "higlass_uid" in new_file_dict:
            return {
                "success" : False,
                "errors" : "File {uuid} does not have higlass_uid".format(uuid=file_uuid)
            }
        if not "genome_assembly" in new_file_dict:
            return {
                "success" : False,
                "errors" : "File {uuid} does not have genome assembly".format(uuid=file_uuid)
            }

        # If the display doesn't have a genome_assembly, set it to this one.
        genome_assembly_mapping = {
            'GRCm38' : ('GRCm38', 'mm10'),
            'GRCh38' : ('GRCh38', 'hg38'),
            'dm6' : ('dm6'),
            'galGal5' : ('galGal5'),
        }
        if not current_genome_assembly in genome_assembly_mapping.keys():
            for new_assembly in genome_assembly_mapping:
                aliases = genome_assembly_mapping[new_assembly]
                if new_file_dict["genome_assembly"] in aliases:
                    current_genome_assembly = new_assembly
                    break

        # Make sure the file's genome_assembly matches the viewConfig.
        expected_genome_assemblies = genome_assembly_mapping[current_genome_assembly]
        if not new_file_dict["genome_assembly"] in expected_genome_assemblies:
            return {
                "success" : False,
                "errors" : "File {uuid} has the wrong Genome Assembly. Expected {expected}, found {actual} instead".format(
                    uuid=file_uuid,
                    expected = current_genome_assembly,
                    actual = new_file_dict["genome_assembly"]
                )
            }
    return {
        "success" : True,
        "current_genome_assembly" : current_genome_assembly,
    }

def add_single_file_to_higlass_viewconf(views, new_file, genome_assembly):
    """ Add a single file to the list of views.
    Args:
        views(list)         : All of the views from the view config.
        new_file(dict)      : The file to add.
        genome_assembly(str): A string showing the new genome assembly.

    Returns:
        views(list) : A list of the modified views. None if there is an error.
        error(str) : A string explaining the error. This is None if there is no error.
    """

    # If there are already 6 views, stop and return an error.
    if len(views) >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # Get the file format and format of the extra files, if any.
    file_format = new_file["file_format"]

    # If no views exist, create one now
    if len(views) == 0:
        base_view = {
            "tracks": {
                "right": [ ],
                "gallery": [ ],
                "left": [ ],
                "whole": [ ],
                "bottom": [ ],
                "top": [],
                "center": [
                    {
                        "contents" : []
                    }
                ],
            },
            "uid": "Not set yet",
            "layout": {
                "w": 12,
                "static": False,
                "h": 12,
                "y": 0,
                "i": "Not set yet",
                "moved": False,
                "x": 0
            }
        }

        # Based on the genome assembly type, we can give defaults for the initialXDomain and initialYDomain.
        domain_sizes = get_initial_domains_by_genome_assembly(genome_assembly)
        base_view.update(domain_sizes)
        views.append(base_view)

    # Based on the filetype's dimensions, try to add the file to the views
    if file_format in (
        "/file-formats/bg/",
        "/file-formats/bw/",
        "/file-formats/bed/",
        "/file-formats/bigbed/"
    ):
        # Many file formats we just need a new 1D track added to the top of each view.
        new_track, error = create_1d_track(new_file, "top")
        if error:
            return None, errors
        add_track_to_views(new_track, views, "top")
    elif file_format in (
        "/file-formats/mcool/",
        "/file-formats/hic/"
    ):
        # Some formats need a new 2D view added.
        new_view, error = create_2d_view(new_file)
        if error:
            return None, errors
        new_view = copy_top_reference_tracks_into_left(new_view, views)
        copy_1d_tracks_into_all_views(views, new_view)
        add_view_to_views(new_view, views)
    elif file_format == "/file-formats/beddb/":
        # Add the 1D track to top, left
        new_track, error = create_1d_track(new_file, "top")
        if error:
            return None, errors
        add_track_to_views(new_track, views, "top")

        new_track, error = create_1d_track(new_file, "left")
        if error:
            return None, errors
        add_track_to_views(new_track, views, "left")
        # Add to the search bar, too.
        for view in views:
            update_genome_position_search_box(view, new_file)
    elif file_format == "/file-formats/chromsizes/":
        # Add the 1D track to top, left
        new_track, error = create_1d_track(new_file, "top")
        if error:
            return None, errors
        add_track_to_views(new_track, views, "top")

        new_track, error = create_1d_track(new_file, "left")
        if error:
            return None, errors
        add_track_to_views(new_track, views, "left")

        # We may have to add a 2D chromosome grid. This is done after the individual files have been added.
    else:
        return None, "Unknown file format {file_format}".format(file_format = file_format)

    # Success! Return the modified view conf.
    return views, None

def create_1d_track(new_file, side="top"):
    """ Creates a dictionary representing a 1d track of the given file.

    Args:
        new_file(dict)          : Describes the source file.
        side(str, optional): Specifies the side of the view to add to. Determines the track type.
            Defaults to "top".

    Returns:
        a dict containing information for a new track (or None if there is an error)
        a string containing an error message, if any (may be None)
    """
    # Create default track options.
    new_track = {
        "server": "https://higlass.4dnucleome.org/api/v1",
        "options": {}
    }

    # Based on the file type and the side, override options.
    if new_file["file_format"] == "/file-formats/bed/":
        new_track["type"] = "bedlike"
    elif new_file["file_format"] == "/file-formats/bigbed/":
        new_track["height"] = 35
        new_track["type"] = "horizontal-vector-heatmap"
        new_track["options"]["valueScaling"] = "linear"
        # Add the color range options. A list of 256 strings, each containing an integer.
        new_track["options"]["colorRange"] = []
        for index in range(256):
            red = int(index * 252 / 255)
            green = int(index * 253 / 255)
            blue = int((index * 188 / 255) + 3)
            new_track["options"]["colorRange"].append(
                "rgba({r},{g},{b},1)".format(
                    r=red,
                    g=green,
                    b=blue,
                )
            )
    elif new_file["file_format"] == "/file-formats/beddb/":
        if side == "top":
            new_track["type"] = "horizontal-gene-annotations"
        elif side == "left":
            new_track["type"] = "vertical-gene-annotations"
    elif new_file["file_format"] == "/file-formats/chromsizes/":
        if side == "top":
            new_track["type"] = "horizontal-chromosome-labels"
        elif side == "left":
            new_track["type"] = "vertical-chromosome-labels"
    else:
        new_track["type"] = "horizontal-divergent-bar"

    # Add specific information for this file.
    new_track["tilesetUid"] = new_file["higlass_uid"]
    new_track["name"] = new_file["display_title"]
    new_track["options"]["name"] = get_title(new_file)
    new_track["options"]["coordSystem"] = new_file["genome_assembly"]

    return new_track, None

def add_track_to_views(new_track, views, side="top"):
    """ Add the given new track to all of the sides of all of the views.

    Args:
        new_track(dict): The new track to add.
        views(list): Modifies views by adding the new_track to the views.
        side(str, optional): Specifies the side of the view to add to. Determines the track type.
            Defaults to "top".

    Returns:
        a boolean indicating success.
        a string containing an error message, if any (may be None)
    """

    # For each view
    for view in views:
        # Make sure the side exists
        if not side in view["tracks"]:
            return False, "View does not contain the side{side}".format(side=side)
        # Add the new track to the view
        view["tracks"][side].append(new_track)

def create_2d_view(new_file):
    """ Creates a dictionary representing a 2d view of the given file.
    Args:
        new_file(dict)          : Describes the source file.

    Returns:
        a dict containing information for a new view (or None if there is an error)
        a string containing an error message, if any (may be None)
    """
    # Create default view options.
    new_view = {
        "tracks": {
            "right": [ ],
            "gallery": [ ],
            "left": [ ],
            "whole": [ ],
            "bottom": [ ],
            "top": [],
            "center": [
                {
                    "type" : "combined",
                    "position" : "center",
                    "contents" : [
                        {
                            "options" : {},
                            "server" : "https://higlass.4dnucleome.org/api/v1",
                        }
                    ]
                }
            ],
        },
        "uid": "Not set yet",
        "layout": {
            "w": 12,
            "static": False,
            "h": 12,
            "y": 0,
            "i": "Not set yet",
            "moved": False,
            "x": 0
        }
    }
    domain_sizes = get_initial_domains_by_genome_assembly(new_file["genome_assembly"])
    new_view.update(domain_sizes)

    contents = new_view["tracks"]["center"][0]["contents"][0]

    contents["tilesetUid"] = new_file["higlass_uid"]
    contents["name"] = new_file["display_title"]

    # Based on the file type, override the options.
    if new_file["file_format"] == "/file-formats/chromsizes/":
        contents["type"] = "2d-chromosome-grid"
    else:
        contents["type"] = "heatmap"

    # Add a uuid for this view.
    new_view["uid"] = uuid.uuid4()
    new_view["tracks"]["center"][0]["uid"] = uuid.uuid4()
    new_view["layout"]["i"] = new_view["uid"]

    # Add specific information for this file.
    contents["options"]["coordSystem"] = new_file["genome_assembly"]
    contents["options"]["name"] = get_title(new_file)
    return new_view, None

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

def update_genome_position_search_box(view, new_file):
    """ Update the genome position search box for this view so it uses the given file.

    Args:
        view(dict): Modifies the view containing the search box.
        new_file(dict): Description of the source file.

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

def add_view_to_views(new_view, views):
    """ Add the given new view to the collection of views.

    Args:
        new_view(dict)  : Describes the new view.
        views(list)     : Modifies views by adding new_view to this list.

    Returns:
        a boolean indicating success.
        a string containing an error message, if any (may be None)
    """
    # If the first view's center is blank, override it with the new view.
    if not (
        len(views) > 0 \
        and "center" in views[0]["tracks"] \
        and len(views[0]["tracks"]["center"]) > 0 \
        and "contents" in views[0]["tracks"]["center"][0] \
        and len(views[0]["tracks"]["center"][0]["contents"]) > 0
        and len(new_view["tracks"]["center"]) > 0
    ) :
        views[0]["tracks"]["center"] = new_view["tracks"]["center"]

        # Copy any left side reference tracks from this view, if the left track doesn't exist.
        for track in reversed(new_view["tracks"]["left"]):
            if any([t for t in views[0]["tracks"]["left"] if t["type"] == track["type"]] ) == False:
                views[0]["tracks"]["left"].insert(0, track)

        # Override the initial domains.
        views[0]["initialXDomain"] = new_view["initialXDomain"]
        views[0]["initialYDomain"] = new_view["initialYDomain"]

        return True, None

    # If there are 6 views already, stop
    if len(views) >= 6:
        return False, "You cannot have more than 6 views in a single display."

    # Append the view to the views.
    views.append(new_view)
    return True, None

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

def get_chromsize_grid_from_view(view):
    """ Look through the given view to find a 2d chromsize grid.
    Args:
        view(dict): Describes the given view.

    Returns:
        The grid information, or return None if it doesn't exist.
    """

    # Skip if the view lacks a central track.
    if "center" not in view["tracks"]:
        return None

    for track in view["tracks"]["center"]:
        # Skip if the track's center has no contents.
        if 'contents' not in track:
            return None
        if len(track['contents']) == 0:
            return None
        # See if any of the contents have the 2d chromosome grid type.
        chromsize_contents = [ cont for cont in track['contents'] if  cont["type"] == "2d-chromosome-grid"]
        if len(chromsize_contents) > 0:
            return chromsize_contents[0]
    return None

def get_chromsize_grid_from_viewconf(views, files_info):
    """ Look through the files_info and the views to find the 2d chromsize grid.
    Args:
        views(list)     : A list of dictionaries containing all of the views.
        files_info(list): A list of dictionaries containing the files used to make this view config.

    Returns:
        The grid information, or return None if it doesn't exist.
    """
    # Check all of the views' central tracks and see if any of them are 2d grids.

    for view in views:
        chromsize_grid = get_chromsize_grid_from_view(view)
        if chromsize_grid:
            return chromsize_grid

    # Look through files_info and see if there is a chromsize file.
    chromsize_files = [ info["item"] for info in files_info if info["item"]["file_format"] == "/file-formats/chromsizes/" ]

    if len(chromsize_files) > 0:
        # Get the contents for the chromosome grid. We assume there is only 1 chromsize file.
        chromsize_view, error = create_2d_view(chromsize_files[0])
        if error:
            return None

        chromsize_contents = chromsize_view["tracks"]["center"][0]["contents"][0]
        return chromsize_contents

    return None

def add_2d_chromsize(new_views, files_info):
    """ If files_info has a chromsize file and new_views contains a 2D view,
    all of the views will get a 2D chromsize file.

    Args:
        new_views(list)     : This list of dictionaries containing all of the views will be modified.
        files_info(list)    : A list of dictionaries containing the files used to make this view config.

    Returns:
        new_views (This function modifies new_views in place)
        A string explaining the error (or None if there is no error)
    """

    chromsize_contents = get_chromsize_grid_from_viewconf(new_views, files_info)

    # If there are no chromsize contents, return
    if not chromsize_contents:
        return new_views, None

    # Look through the new_views for any with a central view with contents.
    views_2d = [ view for view in new_views if  view["tracks"]["center"] and len(view["tracks"]["center"][0]["contents"]) > 0 ]

    # No 2D views, return
    if len(views_2d) == 0:
        return new_views, None

    # For each view:
    for view in views_2d:
        # If it already has a chromsize grid, skip to the next one.
        if get_chromsize_grid_from_view(view):
            continue

        # Append the chromsize grid on top
        view["tracks"]["center"][0]["contents"].insert(0, chromsize_contents)

    return new_views, None

def copy_1d_tracks_into_all_views(views, new_view):
    """ Copy all of the top and left side tracks into all of the views.
    Args:
        views: A list of views for this view config.
        new_view: A view that needs to copy tracks from. Will be modified.

    Returns:
        Boolean indicating success.
    """

    # Get the first view, this should have all of the changes.
    if len(views) < 1:
        return False
    base_view = views[0]

    # Copy the genome assembly search box as well.
    for field in ("genomePositionSearchBox", "autocompleteSource"):
        if field in base_view:
            new_view[field] = base_view[field]

    # For each side (except center)
    for side in ("top", "left"):
        # If there are any tracks here
        for track in base_view["tracks"][side]:
            # Copy them into the new_view's side
            new_view["tracks"][side].append(track)

    return True

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
        if "uid" in track and track["uid"].startswith("top"):
            track["uid"] = track["uid"].replace("top", "left", 1)
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

        # Also the minimum width/height
        temp_height = track.get("minWidth", None)
        temp_width = track.get("minHeight", None)

        if temp_height and temp_width:
            track["minHeight"] = temp_height
            track["minWidth"] = temp_width
        elif temp_height:
            track["minHeight"] = temp_height
            del track["minWidth"]
        elif temp_width:
            track["minWidth"] = temp_width
            del track["minHeight"]

        # And the orientation
        track_orientation = track.get("orientation", None)
        if track_orientation in orientation_mappings:
            track["orientation"] = orientation_mappings[track_orientation]

    # Add the copied tracks to the left side of this view if it doesn't have the track already.
    for track in reversed(new_tracks):
        if any([t for t in target_view["tracks"]["left"] if t["type"] == track["type"]] ) == False:
            target_view["tracks"]["left"].insert(0, track)
    return target_view
