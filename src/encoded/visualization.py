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
    Assumes request's request is JSON and contains these keys:
        higlass_viewconfig       : JSON of the current Higlass views. If None, uses a default view.
        files                    : A list of file uuids to add.
        firstViewLocationAndZoom : (Optional) A list of three numbers indicating the location and zoom levels of the first existing view.

    Returns a dict:
        success             : Boolean indicating success.
        errors              : A string containing errors. Will be None if this is successful.
        new_viewconfig      : New dict representing the new viewconfig.
        new_genome_assembly : A string showing the new genome assembly.
    """

    # Get the viewconfig and its genome assembly. If none is provided, use the default empty higlass viewconf.
    higlass_viewconfig = request.json_body.get('higlass_viewconfig', None)
    current_genome_assembly = request.json_body.get('genome_assembly', None)
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

    for file_uuid in new_file_uuids:
        # Get the new file.
        new_file_dict = get_item_if_you_can(request, file_uuid)

        if not new_file_dict:
            return {
                "success" : False,
                "errors" : "File {uuid} does not exist".format(uuid=file_uuid),
                "new_viewconfig": None,
                "new_genome_assembly" : None
            }
        if not "higlass_uid" in new_file_dict:
            return {
                "success" : False,
                "errors" : "File {uuid} does not have higlass_uid".format(uuid=file_uuid),
                "new_viewconfig": None,
                "new_genome_assembly" : None
            }
        if not "genome_assembly" in new_file_dict:
            return {
                "success" : False,
                "errors" : "File {uuid} does not have genome assembly".format(uuid=file_uuid),
                "new_viewconfig": None,
                "new_genome_assembly" : None
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
                ),
                "new_viewconfig": None,
                "new_genome_assembly" : None
            }

        # Try to add the new file to the given viewconf.
        new_views, errors = add_single_file_to_higlass_viewconf(higlass_viewconfig["views"], new_file_dict)

        if errors:
            return {
                "success" : False,
                "errors" : "errors found while adding {file_uuid} : {errors}".format(file_uuid=file_uuid, errors=errors),
                "new_viewconfig": None,
                "new_genome_assembly" : None
            }

    # Resize and reposition the Higlass views.
    repack_higlass_views(new_views)

    # Set up the additional views so they all move and zoom with the first.
    setZoomLocationLocks(new_views, higlass_viewconfig, first_view_location_and_zoom)
    higlass_viewconfig["zoomFixed"] = False
    higlass_viewconfig["views"] = new_views
    return {
        "success" : True,
        "errors": "",
        "new_viewconfig" : higlass_viewconfig,
        "new_genome_assembly" : current_genome_assembly
    }

def add_single_file_to_higlass_viewconf2(views, new_file_dict):
    """ Add a single file to the view config.
    """

    # If there are already 6 views, stop and return an error.
    views_count = len(views)
    if views_count >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # Based on the filetype's dimensions, try to add the file to the viewconf
    file_format = new_file_dict["file_format"]
    known_1d_formats = (
        "/file-formats/bg/",
        "/file-formats/bw/",
        "/file-formats/bed/",
        "/file-formats/bigbed/"
    )
    known_2d_formats = (
        "/file-formats/mcool/",
        "/file-formats/hic/"
    )
    if [x for x in known_2d_formats if x in file_format]:
        status, errors = add_2d_file_to_higlass_viewconf(views, new_file_dict)
        if errors and not status:
            return None, errors
    elif [x for x in known_1d_formats if x in file_format]:
        status, errors = add_1d_file_to_higlass_viewconf(views, new_file_dict)
        if errors and not status:
            return None, errors
    else:
        return None, "Unknown file format {file_format}".format(file_format = new_file_dict['file_format'])

    # Success! Return the modified view conf.
    return views, None

def add_single_file_to_higlass_viewconf(views, new_file):
    """ Add a single file to the list of views.

    Returns:
        views : A list of the modified views. None if there is an error.
        error : A string explaining the error. This is None if there is no error.
    """

    # If there are already 6 views, stop and return an error.
    if len(views) >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # TODO Get the file format and format of the extra files, if any.
    file_format = new_file["file_format"]

    # TODO get extra file formats

    # TODO If no views exist, create one now
    if len(views) == 0:
        base_view = {
            "initialYDomain": [
                -10000,
                10000
            ],
            "initialXDomain": [
                -10000,
                10000
            ],
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
        add_track_to_views(new_track, views, ["top"])
    elif file_format in (
        "/file-formats/mcool/",
        "/file-formats/hic/"
    ):
        # Some formats need a new 2D view added.
        new_view, error = create_2d_view(new_file)
        if error:
            return None, errors
        add_view_to_views(new_view, views)
    elif file_format == "/file-formats/beddb/":
        # Add the 1D track to top, left
        new_track, error = create_1d_track(new_file, "top")
        if error:
            return None, errors
        add_track_to_views(new_track, views, ["top"])

        new_track, error = create_1d_track(new_file, "left")
        if error:
            return None, errors
        add_track_to_views(new_track, views, ["left"])
        # Add to the search bar, too.
        for view in views:
            update_genome_position_search_box(view, new_file)
    else:
        return None, "Unknown file format {file_format}".format(file_format = file_format)

    # Success! Return the modified view conf.
    return views, None

def create_1d_track(new_file, side="top"):
    """ Creates a dictionary representing a 1d track of the given file.

        Returns:
        - a dict containing information for a new track (or None if there is an error)
        - a string containing an error message, if any (may be None)
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
        new_track["height"] = "100"
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
    else:
        new_track["type"] = "horizontal-divergent-bar"

    # Add specific information for this file.
    new_track["tilesetUid"] = new_file["higlass_uid"]
    new_track["name"] = new_file["display_title"]
    new_track["options"]["name"] = get_title(new_file)
    new_track["options"]["coordSystem"] = new_file["genome_assembly"]

    return new_track, None

def add_track_to_views(new_track, views, sides=["top"]):
    """ Add the given new track to all of the sides of all of the views.
        Modifies views.

        Returns:
        - a boolean indicating success.
        - a string containing an error message, if any (may be None)
    """

    # For each view
    for view in views:
        # For each side
        for side in sides:
            # Make sure the side exists
            if not side in view["tracks"]:
                return False, "View does not contain the side{side}".format(side=side)
            # Add the new track to the view
            view["tracks"][side].append(new_track)

def create_2d_view(new_file):
    """ Creates a dictionary representing a 2d view of the given file.

        Returns:
        - a dict containing information for a new view (or None if there is an error)
        - a string containing an error message, if any (may be None)
    """
    # Create default view options.
    new_view = {
        "initialYDomain": [
            -10000,
            10000
        ],
        "initialXDomain": [
            -10000,
            10000
        ],
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

    contents = new_view["tracks"]["center"][0]["contents"][0]

    contents["tilesetUid"] = new_file["higlass_uid"]
    contents["name"] = new_file["display_title"]

    # Based on the file type, override the options.
    contents["type"] = "heatmap"

    # Add a uuid for this view.
    new_view["uid"] = uuid.uuid4()
    new_view["tracks"]["center"][0]["uid"] = uuid.uuid4()
    new_view["layout"]["i"] = new_view["uid"]

    # Add specific information for this file.
    contents["options"]["coordSystem"] = new_file["genome_assembly"]
    contents["options"]["name"] = get_title(new_file)
    return new_view, None

def update_genome_position_search_box(view, new_file):
    """ Update the genome position search box for this view so it uses the given file
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
        Modifies views.

        Returns:
        - a boolean indicating success.
        - a string containing an error message, if any (may be None)
    """
    # If the first view is blank, override it with the new view.
    if not (
        len(views) > 0 \
        and "center" in views[0]["tracks"] \
        and len(views[0]["tracks"]["center"]) > 0 \
        and "contents" in views[0]["tracks"]["center"][0] \
        and len(views[0]["tracks"]["center"][0]["contents"]) > 0
    ) :
        views[0]["tracks"]["center"] = new_view["tracks"]["center"]
        return True, None

    # If there are 6 views already, stop
    if len(views) >= 6:
        return False, "You cannot have more than 6 views in a single display."

    # Append the view to the views.
    views.append(new_view)
    return True, None

def get_title(file):
    """ Returns a string containing the title for the view.
    """
    # Use the track title. As a fallback, use the display title.
    title = file.get("track_and_facet_info", {}).get("track_title", file["display_title"])
    return title

def repack_higlass_views(views):
    """Set up the higlass views so they fit in a 3 x 2 grid. The packing order is:
    1 2 5
    3 4 6
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

def setZoomLocationLocks(views, view_config, scales_and_center_k):
    """ Set the zoom and location of the views so they match the first one.
    Then lock them so changing one changes all of them.
    Modify the view_config.
    """

    if len(views) == 0:
        return

    # Get the x, y, zoom of the first view
    view1_x = scales_and_center_k[0]
    view1_y = scales_and_center_k[1]
    view1_zoom = scales_and_center_k[2]

    # Create new uuids to handle the zoom and location locks.
    locationLockUuid = uuid.uuid4()
    zoomLockUuid = uuid.uuid4()
    lockUuids = {
        "location" : str(locationLockUuid),
        "zoom" : str(zoomLockUuid),
    }

    locks = {
        "location" : {
            "locksByViewUid": {},
            "locksDict": {
                lockUuids["location"] : {}
            },
        },
        "zoom" : {
            "locksByViewUid": {},
            "locksDict": {
                lockUuids["zoom"] : {}
            },
        },
    }

    # For each view,
    for view in views:
        uid = str(view["uid"])

        # Add the new lock information.
        for lockType in lockUuids:
            lockUuid = lockUuids[lockType]
            locks[lockType]["locksByViewUid"][uid] = lockUuid
            locks[lockType]["locksDict"][lockUuid][uid] = [
                view1_x,
                view1_y,
                view1_zoom
            ]

    # Set the view config.
    view_config["locationLocks"] = locks["location"]
    view_config["zoomLocks"] = locks["zoom"]
