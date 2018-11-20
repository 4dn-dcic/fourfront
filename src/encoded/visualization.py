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

""" Begin Chad's section
"""
@view_config(route_name='add_files_to_higlass_viewconf', request_method='POST')
def add_files_to_higlass_viewconf(request):
    """ Add multiple files to the given Higlass view config.
    Assumes request's request is JSON and contains these keys:
        "higlass_viewconfig"  : JSON of the current Higlass views. If None, uses a default view.
        "files"          : A comma-separated list of file uuids to add.

    Returns a dict:
        "success"  : Boolean indicating success.
        "errors"   : A string (may be None) containing errors.
        "new_views" : New list representing the new views.
    """

    # Get the view conf. If none is provided, use the empty higlass viewconf.
    higlass_viewconfig = request.json_body.get('higlass_viewconfig', None)
    if not higlass_viewconfig:
        default_higlass_viewconf = get_item_if_you_can(request, "00000000-1111-0000-1111-000000000003")
        higlass_viewconfig = default_higlass_viewconf["viewconfig"]

    if not higlass_viewconfig:
        return {
            "success" : False,
            "errors": "No view config found.",
            "new_viewconfig": None
        }

    # Get the file list.
    filestring = request.json_body.get('files')
    new_file_uuids = []
    if filestring:
        new_file_uuids = filestring.split(',')
    new_views = higlass_viewconfig["views"]

    for file_uuid in new_file_uuids:
        # Get the new file.
        new_file_dict = get_item_if_you_can(request, file_uuid)

        # Try to add the new file to the given viewconf.
        new_views, errors = add_single_file_to_higlass_viewconf(higlass_viewconfig["views"], new_file_dict)

        # If any of the new files failed, abandon progress and return failure.
        if errors:
            return {
                "success" : False,
                "errors" : "errors found while adding {file_uuid} : {errors}".format(file_uuid=file_uuid, errors=errors),
                "new_viewconfig": None
            }

    # Return success.
    higlass_viewconfig["views"] = new_views
    return {
        "success" : True,
        "errors": "",
        "new_viewconfig" : higlass_viewconfig
    }

def add_single_file_to_higlass_viewconf(views, new_file_dict):
    """ Add a single file to the view config.
    """

    # Make sure the file has a higlass uid and a genome_assembly
    if not new_file_dict:
        return None, "File does not exist"
    if not "higlass_uid" in new_file_dict:
        return None, "File does not have higlass_uid"
    if not "genome_assembly" in new_file_dict:
        return None, "File does not have genome_assembly"

    # If there are already 6 views, stop and return an error.
    views_count = len(views)
    if views_count >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # Based on the filetype's dimensions, try to add the file to the viewconf
    file_format = new_file_dict["file_format"]
    known_1d_formats = ("bg", "bw")
    known_2d_formats = ("mcool", "hic")
    if [x for x in known_2d_formats if x in file_format]:
        status, errors = add_2d_file_to_higlass_viewconf(views, new_file_dict)
        if errors:
            return None, errors
    elif [x for x in known_1d_formats if x in file_format]:
        status, errors = add_1d_file_to_higlass_viewconf(views, new_file_dict)
        if errors:
            return None, errors
    else:
        return None, "Unknown new file format {file_format}".format(file_format = new_file_dict['file_format'])

    # Resize the sections so they fit into a 12 x 12 grid.
    repack_higlass_views(views)

    # Success! Return the modified view conf.
    return views, None

def add_1d_file_to_higlass_viewconf(views, new_file):
    """Add the given 1-D file to the higlass views.

    Returns:
    - a boolean indicating succes
    - a string containing an error message, if any (may be None)
    """

    # Use the new file's information to create a new top track.
    new_track = {
        "tilesetUid": new_file["higlass_uid"],
        "name": new_file["display_title"],
        "type": "horizontal-divergent-bar",
        "server": "https://higlass.4dnucleome.org/api/v1",
        "options": {
            "name": new_file["display_title"],
            "coordSystem" : new_file["genome_assembly"],
        }
    }

    # If there are no views, create a default.
    if not views:
        new_view = {
            initialYDomain: [
                -10000,
                10000
            ],
            initialXDomain: [
                -10000,
                10000
            ],
            tracks: {
                right: [ ],
                gallery: [ ],
                left: [ ],
                whole: [ ],
                bottom: [ ],
                top: [],
                center: [],
            },
            uid: "Not set yet",
            layout: {
                w: 12,
                static: true,
                h: 12,
                y: 0,
                i: "Not set yet",
                moved: false,
                x: 0
            }
        }
        new_view["uid"] = uuid.uuid4()
        new_view["layout"]["i"] = new_view["uid"]
        views = [new_view, ]

    for higlass_view in views:
        # Add the new top track to the current top facing tracks.
        higlass_view["tracks"]["top"].append(new_track)

    # Success!
    return True, None

def add_2d_file_to_higlass_viewconf(views, new_file):
    """Decide on the best location to add a 2-D file to the Higlass View Config's center track.

    Returns:
    - a boolean indicating succes
    - a string containing an error message, if any (may be None)
    """

    # Make sure all of the views have the same Genome Assembly as the given file.
    for new_view in views:

        # Extract the lists of contents from each view.
        center_contents = [ c["contents"] for c in new_view["tracks"]["center"] ]

        # Flatten the list of lists.
        center_tracks = [item for sublist in center_contents for item in sublist]

        for track in center_tracks:
            # If it doesn't have a coordSystem, skip.
            if not "options" in track:
                continue
            if not "coordSystem" in track["options"]:
                continue

            # coordSystem is set to file.genome_assembly when registering higlass files, so we can compare the two and make sure they match.
            if track["options"]["coordSystem"] != new_file["genome_assembly"]:
                return False, "Genome Assemblies do not match, cannot add. Expected {expected}, found {actual} instead".format(
                    expected = new_file['genome_assembly'],
                    actual = track['options']['coordSystem']
                )

    # Choose the first available view. If there are no views, make up some defaults.
    base_view = None

    if views:
        base_view = views[0]
    else:
        base_view = {
            initialYDomain: [
                -10000,
                10000
            ],
            initialXDomain: [
                -10000,
                10000
            ],
            tracks: {
                right: [ ],
                gallery: [ ],
                left: [ ],
                whole: [ ],
                bottom: [ ],
                top: [ ],
                center: [
                    {
                        "contents" : []
                    }
                ],
            },
            uid: "Not set yet",
            layout: {
                w: 12,
                static: true,
                h: 12,
                y: 0,
                i: "Not set yet",
                moved: false,
                x: 0
            }
        }

    new_view = deepcopy(base_view)
    new_view["uid"] = uuid.uuid4()
    new_view["layout"]["i"] = new_view["uid"]

    new_content = {}
    new_content["tilesetUid"] = new_file["higlass_uid"]
    new_content["name"] = new_file["display_title"]
    new_content["type"] = "heatmap"
    new_content["server"] = "https://higlass.4dnucleome.org/api/v1"
    new_content["options"] = {}

    new_content["options"]["coordSystem"] = new_file["genome_assembly"]
    new_content["options"]["name"] = new_file["display_title"]
    if len(new_view["tracks"]["center"]) < 1:
        new_view["tracks"]["center"] = [
            {
                "contents":[]
            }
        ]

    new_view["tracks"]["center"][0]["type"] = "combined"
    new_view["tracks"]["center"][0]["uid"] = uuid.uuid4()
    new_view["tracks"]["center"][0]["position"] = "center"

    new_view["tracks"]["center"][0]["contents"].append(new_content)

    views.append(new_view)

    return True, None

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

    # Keep track of the x and y coordinates, starting with (0, 0).
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

""" End Chad's section
"""
