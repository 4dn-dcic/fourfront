from copy import (
    copy,
    deepcopy
)
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPBadRequest
from .types.base import Item
from .types.workflow import (
    trace_workflows,
    DEFAULT_TRACING_OPTIONS,
    WorkflowRunTracingException,
    item_model_to_object
)

from .types.base import get_item_if_you_can

def includeme(config):
    config.add_route(
        'trace_workflow_runs',
        '/trace_workflow_run_steps/{file_uuid}/',
        traverse='/{file_uuid}'
    )
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

    elif 'Sample' in item_types:
        for file_uuid in item_model_obj.get('processed_files', []):
            file_model = request.registry[CONNECTION].storage.get_by_uuid(file_uuid)
            file_obj = item_model_to_object(file_model, request)
            files_objs_to_trace.append(file_obj)
        files_objs_to_trace.reverse()

    #elif 'ExperimentSet' in item_types:
    #    file_uuids_to_trace_from_experiment_set = item_model_obj.get('processed_files', [])
    #    file_uuids_to_trace_from_experiments    = []
    #    for exp_uuid in item_model_obj.get('experiments_in_set', []):
    #        experiment_model    = request.registry[CONNECTION].storage.get_by_uuid(exp_uuid)
    #        experiment_obj      = item_model_to_object(experiment_model, request)
    #        file_uuids_to_trace_from_experiments.extend(experiment_obj.get('processed_files', []))
    #
    #    for file_uuid in file_uuids_to_trace_from_experiments + file_uuids_to_trace_from_experiment_set:
    #        file_model = request.registry[CONNECTION].storage.get_by_uuid(file_uuid)
    #        file_obj = item_model_to_object(file_model, request)
    #        files_objs_to_trace.append(file_obj)
    #    files_objs_to_trace.reverse()

    else:
        raise HTTPBadRequest(detail="This type of Item is not traceable: " + ', '.join(item_types))

    try:
        return trace_workflows(files_objs_to_trace, request, options)
    except WorkflowRunTracingException as e:
        raise HTTPBadRequest(detail=e.args[0])