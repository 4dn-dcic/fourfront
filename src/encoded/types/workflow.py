"""The type file for the workflow related items.
"""
from collections import (
    OrderedDict,
    deque
)
from inspect import signature
import copy
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import (
    HTTPUnprocessableEntity,
)
from snovault import (
    calculated_property,
    collection,
    load_schema,
    CONNECTION,
    TYPES
)
from .base import (
    Item,
    lab_award_attribution_embed_list
)
import cProfile
import pstats
import io
import boto3
import json
from time import sleep


steps_run_data_schema = {
    "type" : "object",
    "properties" : {
        "file" : {
            "type" : "array",
            "title" : "File(s)",
            "description" : "File(s) for this step input/output argument.",
            "items" : {
                "type" : ["string", "object"], # Either string (uuid) or a object/dict containing uuid & other front-end-relevant properties from File Item.
                "linkTo" : "File" # TODO: (Med/High Priority) Make this work. Will likely wait until after embedding edits b.c. want to take break from WF stuff and current solution works.
            }
        },
        "meta" : {
            "type" : "array",
            "title" : "Additional metadata for input/output file(s)",
            "description" : "List of additional info that might be related to file, but not part of File Item itself, such as ordinal.",
            "items" : {
                "type" : "object"
            }
        },
        "value" : { # This is used in place of run_data.file, e.g. for a parameter string value, that does not actually have a file.
            "title" : "Value",
            "type" : "string",
            "description" : "Value used for this output argument."
        },
        "type" : {
            "type" : "string",
            "title" : "I/O Type"
        }
    }
}

workflow_schema = load_schema('encoded:schemas/workflow.json')
workflow_steps_property_schema = workflow_schema.get('properties', {}).get('steps')

# This is the schema used for WorkflowRun.steps. Extends Workflow.steps schema.
workflow_run_steps_property_schema = copy.deepcopy(workflow_steps_property_schema)
workflow_run_steps_property_schema['items']['properties']['inputs']['items']['properties']['run_data'] = steps_run_data_schema
workflow_run_steps_property_schema['items']['properties']['outputs']['items']['properties']['run_data'] = steps_run_data_schema


def get_unique_key_from_at_id(at_id):
    if not at_id:
        return None
    at_id_parts = at_id.split('/')
    return at_id_parts[2]


DEFAULT_TRACING_OPTIONS = {
    'max_depth_history' : 9,
    'max_depth_future' : 9,
    "group_similar_workflow_runs" : True,
    "track_performance" : False,
    "trace_direction" : ["history"]
}


class WorkflowRunTracingException(Exception):
    pass


def item_model_to_object(model, request):
    '''
    Converts a model fetched via either ESStorage or RDBStorage into a class instance and then returns partial/performant JSON representation.
    Used as a 'lite' performant version of request.subrequest(...) which avoids overhead of spinning up extra HTTP requests & (potentially recursive) embeds.
    Item types supported or possible to pass through this function include: File, Workflow, WorkflowRun; and to a lesser extent (display_title will not be 'full'): Experiment, ExperimentSet.

    :param model: Pyramid model instance as returned from e.g. RDBStorage.get_by_uuid(uuid), ESStorage.get_by_uuid(uuid), RDBStorage.get_by_unique_key(key, value), etc.
    :param request: Pyramid request object.
    :returns: JSON/Dictionary representation of the Item.
    '''
    ClassForItem = request.registry[TYPES].by_item_type.get(model.item_type).factory
    item_instance = ClassForItem(request.registry, model)
    dict_repr = item_instance.__json__(request)

    # Add common properties
    dict_repr['uuid'] = str(item_instance.uuid)
    dict_repr['@id'] = str(item_instance.jsonld_id(request))
    dict_repr['@type'] = item_instance.jsonld_type()

    display_title_parameters_requested = signature(item_instance.display_title).parameters
    display_title_parameters_requested_names = list(display_title_parameters_requested.keys())
    display_title_parameters = { arg : dict_repr.get(arg, display_title_parameters_requested[arg].default) for arg in display_title_parameters_requested_names if arg != 'request' }

    dict_repr['display_title'] = item_instance.display_title(request, **display_title_parameters)

    # Add or calculate necessary rev-links; attempt to get pre-calculated value from ES first for performance. Ideally we want this to happen 100% of the time.
    if hasattr(model, 'source') and model.source.get('object'):
        item_es_obj = model.source['object']
        if item_es_obj.get('workflow_run_outputs'):
            dict_repr['workflow_run_outputs'] = [ get_unique_key_from_at_id(wfr_at_id) for wfr_at_id in item_es_obj['workflow_run_outputs'] ]
        if item_es_obj.get('workflow_run_inputs'):
            dict_repr['workflow_run_inputs'] = [ get_unique_key_from_at_id(wfr_at_id) for wfr_at_id in item_es_obj['workflow_run_inputs'] ]

    # If not yet indexed, calculate on back-end. (Fallback).
    # Much of the time, the entirety of rev links aren't returned?? Always get back more from ES than from here o.o'.
    if not dict_repr.get('workflow_run_outputs') and hasattr(item_instance, 'workflow_run_outputs') and hasattr(model, 'revs'):
        dict_repr['workflow_run_outputs'] = [ str(uuid) for uuid in request.registry[CONNECTION].storage.write.get_rev_links(model, item_instance.rev['workflow_run_outputs'][1]) ]
    if not dict_repr.get('workflow_run_inputs') and hasattr(item_instance, 'workflow_run_inputs') and hasattr(model, 'revs'):
        dict_repr['workflow_run_inputs'] = [ str(uuid) for uuid in request.registry[CONNECTION].storage.write.get_rev_links(model, item_instance.rev['workflow_run_inputs'][1]) ]

    # For files -- include download link/href (if available)
    if hasattr(item_instance, 'href'):
        href_parameters_requested = signature(item_instance.href).parameters
        href_parameters_requested_names = list(href_parameters_requested.keys())
        href_parameters = { arg : dict_repr.get(arg, href_parameters_requested[arg].default) for arg in href_parameters_requested_names if arg != 'request' }
        dict_repr['href'] = item_instance.href(request, **href_parameters)

    return dict_repr


def get_step_io_for_argument_name(argument_name, workflow_model_obj):
    for step in workflow_model_obj.get('steps', []):
        for input_io in step.get('inputs', []):
            for source in input_io.get('source', []):
                if not source.get('step') and source.get('name') == argument_name:
                    return input_io
        for output_io in step.get('outputs', []):
            for target in output_io.get('target', []):
                if not target.get('step') and target.get('name') == argument_name:
                    return output_io
    return None


def common_props_from_file(file_obj):
    '''
    Purpose of this function is to limit the amount of properties
    that are returned for file items to keep size of response down
    re: nested embedded items.
    '''

    ret_obj = {
        '@id'             : file_obj['@id'],
        'uuid'            : file_obj['uuid'],
        'display_title'   : file_obj['display_title'],
        'accession'       : file_obj.get('accession'),
        '@type'           : file_obj.get('@type')
    }

    for k in ['quality_metric', 'url', 'href', 'description', 'filename', 'file_format', 'file_type', 'file_size', 'status']:
        if k in file_obj:
            ret_obj[k] = file_obj[k]

    # For experiments and experiment sets, carry only the terminal expset @ids in as they are AJAXed in clientside.
    # We don't need full representation
    if 'experiment_sets' in file_obj:
        ret_obj['experiment_sets'] = [ { '@id' : es['@id'], 'uuid' : es['uuid'] } for es in file_obj['experiment_sets'] ]

    if 'experiments' in file_obj:
        ret_obj['experiments'] = []
        for exp in file_obj['experiments']:
            ret_obj['experiments'].append({
                '@id' : exp['@id'],
                'uuid' : exp['uuid'],
                'experiment_sets' : [ { '@id' : es['@id'], 'uuid' : es['uuid'] } for es in exp['experiment_sets'] ]
            })

    return ret_obj



def trace_workflows(original_file_set_to_trace, request, options=None):
    '''
    Trace a set of files according to supplied options.

    -- TODO: After grouping design: CLEANUP! Rename get_model to get_item, etc. Remove grouping. --

    Argumements:

        original_file_set_to_trace      Must be a list of DICTIONARIES. If have Item instances, grab their model.source['object'] or similar.
                                        Each dict should have the following fields:
                                            `uuid` (string), `workflow_run_inputs` (list of UUIDs, NOT embeds), & `workflow_run_outputs` (list of UUIDs, NOT embeds)
        request                         The request instance.
        options                         Dict of options to use for tracing. These may change; it is suggested to use the defaults.

    Returns:
        A chronological list of steps (as dictionaries)

    '''

    if options is None:
        options = DEFAULT_TRACING_OPTIONS

    if options.get('track_performance'):
        pr = cProfile.Profile()
        pr.enable()

    uuidCacheModels = {}
    uuidCacheTracedHistory = {}
    uuidCacheGroupSourcesByRun = {}

    steps_to_process_stack = deque()    # A stack holding next tuples of WFR+File+depth to trace.
    steps = []                          # What we return
    current_step_route = []             # Intermediate structure to hold chronologically-ordered steps while tracing a connected route

    def get_model(uuid, key=None):
        model = None
        cacheKey = uuid
        if key is not None:
            cacheKey = key + ':' + uuid

        model = uuidCacheModels.get(cacheKey)
        if model is not None:
            return model

        if key is None:
            model = request.registry[CONNECTION].storage.get_by_uuid(uuid)
        else:
            model = request.registry[CONNECTION].storage.get_by_unique_key(key, uuid)

        if key is not None:
            uuidCacheModels[str(model.uuid)] = model
        uuidCacheModels[cacheKey] = model

        return model

    def get_model_obj(uuid, key=None):
        return item_model_to_object(get_model(uuid, key), request)

    def get_model_embed(uuid, key=None):
        '''Returns @@embedded representation of UUID. Uses cached model. Returns None if not yet indexed.'''
        model = get_model(uuid, key)
        if not hasattr(model, 'source'):
            return None
        return model.source.get('embedded')


    def group_files_by_workflow_argument_name(set_of_files):
        '''Takes an iterable of files and segments them into a dictionary containing lists keyed by common 'workflow_argument_name'.'''
        files_by_argument_name = OrderedDict()
        for f in set_of_files:
            arg_name = f.get('workflow_argument_name')
            if arg_name and (f.get('value') or f.get('value_qc')):
                if files_by_argument_name.get(arg_name) is None:
                    files_by_argument_name[arg_name] = [f]
                else:
                    files_by_argument_name[arg_name].append(f)
        return files_by_argument_name


    def filter_workflow_runs(workflow_run_tuples):
        """
        Sifts workflow_run_tuples (which consist of reference to a file and the latest WFR that that file
        is output of) which signify the collection of input files (and the WFR they came from) for a
        subsequent workflow_run step input argument.

        Those tuples which have a workflow_run which shares a workflow w/ other tuple>workflow_run get sifted out
        and treated as if they are part of a group of files, and not traced further.

        Arguments:
            workflow_run_tuples: A list of tuples of this form - (workflow_run_model, in_file_model)

        Returns:
            A tuple containing (0) a list of filtered-in tuples (to continue tracing) and (1) list of filtered-out tuples, to be treated
            as a group.
        """
        if not options.get('group_similar_workflow_runs') or len(workflow_run_tuples) < 3:
            return (workflow_run_tuples, [])

        filtered_in_tuples  = []
        filtered_out_tuples = []
        tuples_by_workflow  = {}

        for wfr_tuple in workflow_run_tuples: # Group up into dict of { workflow-id : list-of-tuples }
            workflow_atid = wfr_tuple[0]['workflow']['@id']
            if not tuples_by_workflow.get(workflow_atid):
                tuples_by_workflow[workflow_atid] = []
            tuples_by_workflow[workflow_atid].append(wfr_tuple)

        for workflow_atid, wfr_tuples_for_wf in tuples_by_workflow.items():
            # Get most recent workflow_run (of all workflow_runs that share a workflow for upstream step input arg), 'filter out' the rest
            sorted_wfr_tuples = sorted(wfr_tuples_for_wf, key=lambda wfr_tuple: wfr_tuple[0].get('date_created'))
            filtered_in_tuples.append(sorted_wfr_tuples[0])
            for remaining_wfr_tuple in sorted_wfr_tuples[1:]:
                # Ensure our File only goes into 1 WFR
                # Implicitly, this would be the workflow_run_model_obj being traced at moment in trace_history function.
                if len(remaining_wfr_tuple[1].get('workflow_run_inputs', [])) == 1:
                    filtered_out_tuples.append(remaining_wfr_tuple)
                else:
                    filtered_in_tuples.append(remaining_wfr_tuple)

        if len(filtered_out_tuples) < 3: # No point returning group if only 1 or 2 files to be in it.
            return (workflow_run_tuples, [])

        return (filtered_in_tuples, filtered_out_tuples)

    def generate_sources_for_input(in_file_embeds, workflow_argument_name, depth=0):

        sources = [] # Our output
        step_uuids = set()

        def try_match_input_with_workflow_run_output_to_generate_source(workflow_run, in_file):
            sources_for_in_file = [] # We only are looking for 1 source, but might re-use for trace_future later
            for out_file_wrapper in workflow_run.get('output_files', []):
                out_file = out_file_wrapper.get('value') or out_file_wrapper.get('value_qc') or None
                if out_file is None:
                    # This can occur if there is WorkflowRun with an output but no output `value` linkedTo from it
                    continue
                if out_file['uuid'] == in_file.get('uuid', 'b'):
                    step_uuid = workflow_run['uuid']
                    if step_uuid:
                        step_uuids.add( (step_uuid, in_file['uuid']) )
                    sources_for_in_file.append({
                        "name"      : out_file_wrapper.get('workflow_argument_name'),
                        "step"      : workflow_run['@id'],
                        "for_file"  : in_file['@id'],
                        "workflow"  : workflow_run['workflow']['@id']
                    })
            return sources_for_in_file

        # Gather all workflow_runs out of which our input files (1 run per file) come from
        all_workflow_runs = []

        for in_file_embed in in_file_embeds:
            in_file_uuid = in_file_embed['uuid']

            if uuidCacheTracedHistory.get(in_file_uuid):
                sources = sources + uuidCacheTracedHistory[in_file_uuid]
                continue

            # Get @ids from ES source.
            output_of_workflow_runs = in_file_embed.get('workflow_run_outputs', [])
            if len(output_of_workflow_runs) == 0:
                continue

            last_workflow_run_output_of = output_of_workflow_runs[-1]
            if isinstance(last_workflow_run_output_of, dict): # Case if in_file_embed are @@embedded representation
                workflow_run_uuid = last_workflow_run_output_of['uuid']
            else: # Case if in_file_embed are @@object representation
                workflow_run_uuid = last_workflow_run_output_of
            if not workflow_run_uuid:
                continue

            workflow_run_embed = get_model_embed(workflow_run_uuid)
            #workflow_run_model = get_model_obj(workflow_run_uuid)
            if not workflow_run_embed:
                continue
            all_workflow_runs.append( (workflow_run_embed, in_file_embed) )



        filtered_in_workflow_runs, filtered_out_workflow_runs = filter_workflow_runs(all_workflow_runs)

        for workflow_run_embed, in_file_embed in filtered_in_workflow_runs:
            sources_for_in_file = try_match_input_with_workflow_run_output_to_generate_source(workflow_run_embed, in_file_embed)
            uuidCacheTracedHistory[in_file_embed['uuid']] = sources_for_in_file
            sources = sources + sources_for_in_file

        ## This block of code, along with dependent functions such as `filter_workflow_runs`, will likely
        ## be removed later once we can cache this output and apply better grouping.
        untraced_in_files = []
        for workflow_run_embed, in_file_embed in filtered_out_workflow_runs:
            untraced_in_files.append(in_file_embed['uuid'])
            source_for_in_file = {
                "for_file"   : in_file_embed['@id'],
                "step"       : workflow_run_embed['@id'],
                "grouped_by" : "workflow",
                "workflow"   : workflow_run_embed['workflow']['@id']
            }
            uuidCacheTracedHistory[in_file_embed['uuid']] = [source_for_in_file]
            uuidCacheGroupSourcesByRun[workflow_run_embed['uuid']] = uuidCacheGroupSourcesByRun.get(workflow_run_embed['uuid'], []) + [in_file_embed['uuid']] #[source_for_in_file]
            sources.append(source_for_in_file)


        if len(sources) == 0:
            for_files = [ f['@id'] for f in in_file_embeds ]
            if len(for_files) == 1:
                for_files = for_files[0]
            sources = [{ "name" : workflow_argument_name, "for_file" : for_files }]
        else:
            for step_uuid, in_file_uuid in step_uuids:
                next_params = ( step_uuid, get_model_obj(in_file_uuid), depth + 1 )
                # Potentially temporary check to skip further tracing of files which we don't
                # have WFR inputs for.
                next_file_model_obj = get_model_obj(in_file_uuid)
                if next_file_model_obj.get('disable_wfr_inputs'):
                    continue
                steps_to_process_stack.append(( step_uuid, next_file_model_obj, depth + 1 ))

        return sources

    def add_next_targets_to_step_from_file(step, current_file_model_object):
        '''
        Compare our current_file_model_object with each output run data file of step and if is a match, add target to step output argument which points to the next step(s) the file goes to, if any.

        Arguments:
            step                        - Current step representation (dictionary)
            current_file_model_object   - The @@object representation of a File Item. Must be @@object and have all linkTos present as UUIDs.
        '''
        for output in step['outputs']:
            if type(output.get('run_data', {}).get('file')) is list:
                files_for_this_output = output['run_data']['file']
                for outfile in files_for_this_output:
                    if outfile['uuid'] == current_file_model_object['uuid']:
                        output['meta']['in_path'] = True
                        runs_current_file_goes_to = current_file_model_object.get('workflow_run_inputs', [])
                        for target_workflow_run_uuid in runs_current_file_goes_to:
                            if isinstance(target_workflow_run_uuid, dict): # Case if current_file_model_object is embedded representation
                                target_workflow_run_uuid = target_workflow_run_uuid['uuid']
                            # Slight Optimization - skip creating target conntections to steps/wfrs which we have not (yet) encountered
                            if uuidCacheTracedHistory.get(target_workflow_run_uuid) is None:
                                continue
                            target_workflow_run_model_obj = get_model_obj(target_workflow_run_uuid)
                            input_files_by_argument_name = group_files_by_workflow_argument_name(target_workflow_run_model_obj.get('input_files', []))
                            for argument_name, input_files_for_arg in input_files_by_argument_name.items():
                                input_files_for_arg_uuids = [ (f.get('value') or f.get('value_qc') or None) for f in input_files_for_arg ]
                                if current_file_model_object['uuid'] in input_files_for_arg_uuids:
                                    # Check that we don't have this already
                                    exists = False
                                    for target in output['target']:
                                        if target['name'] == argument_name and target.get('step', 'x') == target_workflow_run_model_obj.get('@id', 'y') and target.get('for_file') == current_file_model_object['uuid']:
                                            exists = True
                                            break
                                    if not exists:
                                        output['target'].append({
                                            "name"      : argument_name,
                                            "step"      : target_workflow_run_model_obj.get('@id'),
                                            "for_file"  : current_file_model_object['@id']
                                        })

    def trace_history(workflow_run_uuid, current_file_model_object, depth=0):

        # If we've already traced inputs of this workflowrun, lets skip tracing it.
        # But, lets loop over its outputs and extend them with proper target reference to next step if our current file matches one of this already-traced runs output files.
        if uuidCacheTracedHistory.get(workflow_run_uuid):
            if uuidCacheTracedHistory[workflow_run_uuid] is True:
                raise WorkflowRunTracingException("Error -- WorkflowRun with UUID '" + workflow_run_uuid + "' has been RE-ENCOUNTERED while tracing file with UUID '" + current_file_model_object['uuid'] + "'. Likely this file appears on both input and output -side of a WorkflowRun (or chain of WorkflowRuns).")
            add_next_targets_to_step_from_file(uuidCacheTracedHistory[workflow_run_uuid], current_file_model_object)
            return

        if uuidCacheGroupSourcesByRun.get(workflow_run_uuid) is not None:
            return

        uuidCacheTracedHistory[workflow_run_uuid] = True # Placeholder, becomes reference to real step (dictionary defined below as variable 'step') upon completing tracing of files being input into this step/workflow_run.

        workflow_run_model_obj = get_model_obj(workflow_run_uuid)
        if not workflow_run_model_obj:
            return

        # We create the structure of our steps to emulate the structure of `Workflow.steps`,
        # as defined in the Workflow schema. This means we might wedge another field into the
        # `step.meta.analysis_step_types` property here.
        #
        # This allows us to use the same frontend graphing mechanics/code on one common "step"
        # data structure for both Worfklow Steps, WorkflowRun Steps, and Provenance Graph Steps (Workflow(Runs)).
        step = {
            "name"      : workflow_run_model_obj.get('@id'), # We use our front-end Node component to show display_title or something else from meta instead.
            "meta"      : {
                'display_title' : workflow_run_model_obj.get('display_title'),
                "status"        : workflow_run_model_obj.get('status'),
                "run_status"    : workflow_run_model_obj.get('run_status'),
                '@type'         : workflow_run_model_obj.get('@type'),
                '@id'           : workflow_run_model_obj.get('@id'),
                'date_created'  : workflow_run_model_obj.get('date_created'),
                "analysis_step_types" : []
            },
            "inputs"    : [],
            "outputs"   : []
        }

        # Fill 'Analysis Step Types' w/ workflow name; TODO: Add component analysis_steps.
        workflow_uuid = workflow_run_model_obj.get('workflow') #get_unique_key_from_at_id(workflow_run_model_obj.get('workflow')) #workflow_run.properties.get('workflow')
        if workflow_uuid:
            workflow_model_obj = get_model_obj(workflow_uuid)
            if workflow_model_obj:
                # `step.meta.analysis_step_types` is defined in Workflow schema. It holds e.g. 'purposes' list for each step.
                # Since each workflow(run) acts as a step within a provenance graph, we fill this property with something that
                # might have an analogous-enough meaning, e.g. `category`.
                step['meta']['analysis_step_types'].extend(workflow_model_obj.get('category', []))
                step['meta']['workflow'] = {
                    '@id'               : workflow_model_obj.get('@id') or workflow_run_model_obj.get('workflow'),
                    '@type'             : workflow_model_obj.get('@type'),
                    'display_title'     : workflow_model_obj.get('display_title') or workflow_model_obj.get('title'),
                    'accession'         : workflow_model_obj.get('accession'),
                    'steps'             : workflow_model_obj.get('steps'),
                    'uuid'              : workflow_uuid,
                    'category'          : workflow_model_obj.get('category'),
                    'experiment_types'  : workflow_model_obj.get('experiment_types', [])
                }


        # Add Output Files and Metrics, 1-level deep max (maybe change in future)
        output_files_by_argument_name = group_files_by_workflow_argument_name(workflow_run_model_obj.get('output_files', []))
        for argument_name, output_files_for_arg in output_files_by_argument_name.items():
            workflow_step_io = get_step_io_for_argument_name(argument_name, workflow_model_obj or workflow_run_model_obj)
            file_uuids       = [ (f.get('value') or f.get('value_qc') or None) for f in output_files_for_arg ]
            file_items       = []
            file_format      = None
            io_type          = (workflow_step_io and workflow_step_io.get('meta', {}).get('type')) or 'data file'
            original_file_in_output = False
            for file_uuid in file_uuids:
                file_item = get_model_embed(file_uuid)
                if file_item is not None:
                    if file_item['uuid'] == current_file_model_object['uuid']:
                        original_file_in_output = True
                    file_items.append(common_props_from_file(file_item))
                    if not file_format:
                        file_format = file_item.get('file_format')

            step['outputs'].append({
                "name"      : argument_name,
                "target"    : [{ "name" : argument_name }],
                "meta"      : {
                    "type"          : io_type,                  # 'data file', 'reference file', 'parameter', etc. (enum, see schemas)
                    "global"        : True,                     # All traced Files are global inputs or outputs of their respective WorkflowRuns
                    "file_format"   : file_format,              # 'pairs', 'fastq', etc. (not enum)
                    "in_path"       : original_file_in_output   # Whether this file is directly in tracing path (True) or just an extra output file (False). Used for 'show more context' UI control.
                },
                "run_data"  : {
                    "file"          : file_items,               # Partially-pseudo-embedded file Items
                    "type"          : "input",                  # Unused?
                    "meta"          : [ { k:v for k,v in f.items() if k not in ['value', 'value_qc', 'workflow_argument_name'] } for f in output_files_for_arg ] # A
                }
            })
            add_next_targets_to_step_from_file(step, current_file_model_object)


        # Trace Input Files
        input_files_by_argument_name = group_files_by_workflow_argument_name(workflow_run_model_obj.get('input_files', []))
        for argument_name, input_files_for_arg in input_files_by_argument_name.items():
            workflow_step_io = get_step_io_for_argument_name(argument_name, workflow_model_obj or workflow_run_model_obj)
            file_uuids       = [ (f.get('value') or f.get('value_qc') or None) for f in input_files_for_arg ]
            file_items       = []
            file_format      = None
            io_type          = (workflow_step_io and workflow_step_io.get('meta', {}).get('type')) or 'data file'
            for file_uuid in file_uuids:
                file_item = get_model_embed(file_uuid)
                if file_item is not None:
                    file_items.append(file_item)
                    if not file_format:
                        file_format = file_item.get('file_format')

            step['inputs'].append({
                "name" : argument_name, # TODO: Try to fallback to ... in_file.file_type_detailed?
                "source" : generate_sources_for_input(file_items, argument_name, depth),
                "meta" : {
                    "in_path" : True,
                    "file_format" : file_format,
                    "global" : True,
                    "type" : io_type
                },
                "run_data" : {
                    "file" : [ common_props_from_file(file_item) for file_item in file_items ],
                    "type" : "input",
                    "meta" : [ { k:v for k,v in f.items() if k not in ['value', 'value_qc' 'workflow_argument_name'] } for f in input_files_for_arg ]
                }
            })

        uuidCacheTracedHistory[workflow_run_uuid] = step
        return step



    ###########################################
    ### Where function starts doing things. ###
    ###########################################

    # Initialize our stack (deque) of steps to process with WFR(s) that file(s) we received are output from.
    for original_file in original_file_set_to_trace:
        file_item_output_of_workflow_run_uuids = original_file.get('workflow_run_outputs', [])

        if len(file_item_output_of_workflow_run_uuids) == 0:
            continue

        # When we trace history, we care only about the last workflow_run out of which file was generated.
        # A file should be output of only _one_ run.
        last_workflow_run_uuid = file_item_output_of_workflow_run_uuids[-1]

        if 'history' in options.get('trace_direction', ['history']):
            steps_to_process_stack.appendleft((last_workflow_run_uuid, original_file, 0))


    # Keep tracing whatever is at the tip of our stack until nothing left to trace.
    # This is depth-first tracing.
    while True:
        try:
            next_wfr_uuid, next_file, depth_of_step = steps_to_process_stack.pop()
        except IndexError: # No more items in our queue.
            break

        # (Temporary?) exit condition to prevent requests from taking > 20 seconds
        # Will be removed once/if we can cache output of traces.
        if depth_of_step > options.get('max_depth_history', 6):
            continue

        if depth_of_step == 0:
            # This means we're starting a new route vs continuing tracing inputs of existing route
            # Append existing inverted history to our steps by popping off steps so that
            # the final 'steps' list is returned in a chronological order.
            while True:
                try:
                    curr_step = current_step_route.pop()
                except IndexError:
                    break
                steps.append(curr_step)

        step = trace_history(next_wfr_uuid, next_file, depth_of_step)
        if step:
            current_step_route.append(step)


    # Add leftover steps from last traced route to final output list.
    while True:
        try:
            curr_step = current_step_route.pop()
        except IndexError:
            break
        steps.append(curr_step)

    if options.get('track_performance'):
        pr.disable()
        s = io.StringIO()
        sortby = 'cumulative'
        ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
        ps.print_stats()
        output = s.getvalue()
        print(output)
        return Response(
            content_type='text/plain',
            body=output
        )

    return steps




@collection(
    name='workflows',
    properties={
        'title': 'Workflows',
        'description': 'Listing of 4DN analysis workflows',
    })
class Workflow(Item):
    """The Workflow class that describes a workflow and steps in it."""

    item_type = 'workflow'
    schema = workflow_schema
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        'steps.name',
        'steps.inputs',
        'steps.outputs',
        'steps.meta.software_used.name',
        'steps.meta.software_used.title',
        'steps.meta.software_used.version',
        'steps.meta.software_used.source_url',
        'arguments.argument_type',
        'arguments.argument_format',
        'arguments.workflow_argument_name'
    ]
    rev = {
        'newer_versions': ('Workflow', 'previous_version')
    }

    @calculated_property(schema={
        "title": "Newer Versions",
        "description": "Newer versions of this workflow",
        "type": "array",
        "exclude_from": ["submit4dn", "FFedit-create"],
        "items": {
            "title": "Newer versions",
            "type": ["string", "object"],
            "linkTo": "Workflow"
        }
    })
    def newer_versions(self, request):
        return self.rev_link_atids(request, "newer_versions")


@collection(
    name='workflow-runs',
    properties={
        'title': 'Workflow Runs',
        'description': 'Listing of executions of 4DN analysis workflows',
    })
class WorkflowRun(Item):
    """The WorkflowRun class that describes execution of a workflow."""

    item_type = 'workflow_run'
    schema = load_schema('encoded:schemas/workflow_run.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list + [
        'workflow.category',
        'workflow.experiment_types',
        'workflow.app_name',
        'workflow.title',
        'workflow.steps.name',
        'workflow.steps.meta.software_used.name',
        'workflow.steps.meta.software_used.title',
        'workflow.steps.meta.software_used.version',
        'workflow.steps.meta.software_used.source_url',
        'input_files.workflow_argument_name',
        'input_files.value.filename',
        'input_files.value.display_title',
        'input_files.value.file_format',
        'input_files.value.accession',
        'input_files.value.@type',
        'input_files.value.@id',
        'input_files.value.file_size',
        'input_files.value.quality_metric.url',
        'input_files.value.quality_metric.overall_quality_status',
        'input_files.value.status',
        'output_files.workflow_argument_name',
        'output_files.value.filename',
        'output_files.value.display_title',
        'output_files.value.file_format',
        'output_files.value.accession',
        'output_files.value.@type',
        'output_files.value.@id',
        'output_files.value.file_size',
        'output_files.value.quality_metric.url',
        'output_files.value.quality_metric.overall_quality_status',
        'output_files.value.status',
        'output_files.value_qc.url',
        'output_files.value_qc.overall_quality_status'
    ]

    @calculated_property(schema=workflow_run_steps_property_schema, category='page')
    def steps(self, request):
        '''
        Extends the 'inputs' & 'outputs' (lists of dicts) properties of calculated property 'analysis_steps' (list of dicts) from
        WorkflowRun's related Workflow with additional property 'run_data', which contains references to Files, Parameters, and Reports
        generated by this specific Workflow Run.

        :returns: List of analysis_steps items, extended with 'inputs' and 'outputs'.
        '''
        workflow = self.properties.get('workflow')
        if workflow is None:
            return []

        workflow = request.embed('/' + workflow)
        analysis_steps = workflow.get('steps')

        if not isinstance(analysis_steps, list) or len(analysis_steps) == 0:
            return []

        # fileCache = {} # Unnecessary unless we'll convert file @id into plain embedded dictionary, in which case we use this to avoid re-requests for same file UUID.

        def get_global_source_or_target(all_io_source_targets):
            global_pointing_source_target = [ source_target for source_target in all_io_source_targets if source_target.get('step') == None ] # Find source or target w/o a 'step'.
            if len(global_pointing_source_target) > 1:
                raise Exception('Found more than one source or target without a step.')
            if len(global_pointing_source_target) == 0:
                return None
            return global_pointing_source_target[0]


        def map_run_data_to_io_arg(step_io_arg, wfr_runtime_inputs, io_type):
            '''
            Add file metadata in form of 'run_data' : { 'file' : { '@id', 'display_title', etc. } } to AnalysisStep dict's 'input' or 'output' list item dict
            if one of own input or output files' workflow_argument_name matches the AnalysisStep dict's input or output's sourceOrTarget.workflow_argument_name.

            :param step_io_arg: Reference to an 'input' or 'output' dict passed in from a Workflow-derived analysis_step.
            :param wfr_runtime_inputs: List of Step inputs or outputs, such as 'input_files', 'output_files', 'quality_metric', or 'parameters'.
            :returns: True if found and added run_data property to analysis_step.input or analysis_step.output (param inputOrOutput).
            '''
            #is_global_arg = step_io_arg.get('meta', {}).get('global', False) == True
            #if not is_global_arg:
            #    return False # Skip. We only care about global arguments.

            value_field_name = 'value' if io_type == 'parameter' else 'file'

            global_pointing_source_target = get_global_source_or_target(step_io_arg.get('source', step_io_arg.get('target', [])))
            if not global_pointing_source_target:
                return False

            matched_runtime_io_data = [
                io_object for io_object in wfr_runtime_inputs
                if (
                    global_pointing_source_target['name'] == io_object.get('workflow_argument_name') and
                    # Quality Metrics might be saved with `value_qc` in place of `value`
                    (io_object.get('value') is not None or io_object.get('value_qc') is not None)
                )
            ]

            if len(matched_runtime_io_data) > 0:
                matched_runtime_io_data = sorted(matched_runtime_io_data, key=lambda io_object: io_object.get('ordinal', 1))
                step_io_arg['run_data'] = {
                    value_field_name : [
                        # List of file UUIDs
                        # Also, Quality Metrics might be saved with `value_qc` instead of `value`
                        (io_object.get('value') or io_object.get('value_qc')) for io_object in matched_runtime_io_data
                    ],
                    "type" : io_type,
                    "meta" : [ # Aligned-to-file-list list of file metadata
                        {   # All remaining properties from dict in (e.g.) 'input_files','output_files',etc. list.
                            k:v for (k,v) in p.items()
                            if k not in [ 'value', 'value_qc', 'type', 'workflow_argument_name' ]
                        } for p in matched_runtime_io_data
                    ]
                }
                return True
            return False


        def mergeArgumentsWithSameArgumentName(args):
            '''Merge arguments with the same workflow_argument_name, unless differing ordinals'''
            seen_argument_names = {}
            resultArgs = []
            for arg in args:
                argName = arg.get('workflow_argument_name')
                if argName:
                    priorArgument = seen_argument_names.get(argName)
                    if priorArgument and priorArgument.get('ordinal', 1) == arg.get('ordinal', 1):
                        priorArgument.update(arg)
                    else:
                        resultArgs.append(arg)
                        seen_argument_names[argName] = arg
            return resultArgs


        output_files    = mergeArgumentsWithSameArgumentName(self.properties.get('output_files',[]))
        input_files     = mergeArgumentsWithSameArgumentName(self.properties.get('input_files',[]))
        input_params    = mergeArgumentsWithSameArgumentName(self.properties.get('parameters',[]))

        for step in analysis_steps:
            # Add output file metadata to step outputs & inputs, based on workflow_argument_name v step output target name.

            for output in step['outputs']:
                map_run_data_to_io_arg(output, output_files, 'output')

            for input in step['inputs']:
                if input.get('meta', {}).get('type') != 'parameter':
                    map_run_data_to_io_arg(input, input_files, 'input')
                else:
                    map_run_data_to_io_arg(input, input_params, 'parameter')

        return analysis_steps


@collection(
    name='workflow-runs-sbg',
    properties={
        'title': 'Workflow Runs SBG',
        'description': 'Listing of executions of 4DN analysis workflows on SBG platform',
    })
class WorkflowRunSbg(WorkflowRun):
    """The WorkflowRun class that describes execution of a workflow on SBG platform."""
    base_types = ['WorkflowRun'] + Item.base_types
    item_type = 'workflow_run_sbg'
    schema = load_schema('encoded:schemas/workflow_run_sbg.json')
    embedded_list = WorkflowRun.embedded_list


@collection(
    name='workflow-runs-awsem',
    properties={
        'title': 'Workflow Runs AWSEM',
        'description': 'Listing of executions of 4DN analysis workflows on AWSEM platform',
    })
class WorkflowRunAwsem(WorkflowRun):
    """The WorkflowRun class that describes execution of a workflow on AWSEM platform."""
    base_types = ['WorkflowRun'] + Item.base_types
    item_type = 'workflow_run_awsem'
    schema = load_schema('encoded:schemas/workflow_run_awsem.json')
    embedded_list = WorkflowRun.embedded_list


@collection(
    name='workflow-mappings',
    properties={
        'title': 'Workflow Mappings',
        'description': 'Listing of all workflow mappings',
    })
class WorkflowMapping(Item):
    """The WorkflowRun class that describes execution of a workflow and tasks in it."""

    item_type = 'workflow_mapping'
    schema = load_schema('encoded:schemas/workflow_mapping.json')
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list


def validate_input_json(context, request):
    input_json = request.json
    wkfl_uuid = input_json.get('workflow_uuid', 'None')
    # if not context.get(wkfl_uuid):
    #    request.errors.add('body', None, 'workflow_uuid %s not found in the system' % wkfl_uuid)
    if not input_json.get('metadata_only'):
        request.errors.add('body', None, 'metadata_only must be set to true in input_json')


@view_config(name='pseudo-run', context=WorkflowRun.Collection, request_method='POST',
             permission='add', validators=[validate_input_json])
def pseudo_run(context, request):
    input_json = request.json

    # set env_name for awsem runner in tibanna
    env = request.registry.settings.get('env.name')
    # for testing
    if not env:
        env = 'fourfront-webdev'
    if env == 'fourfront-webprod2':
        input_json['output_bucket'] = 'elasticbeanstalk-fourfront-webprod-wfoutput'
    else:
        input_json['output_bucket'] = 'elasticbeanstalk-%s-wfoutput' % env

    input_json['env_name'] = env
    if input_json.get('app_name', None) is None:
        input_json['app_name'] = 'pseudo-workflow-run'

    # ideally select bucket from file metadata itself
    for i, nput in enumerate(input_json['input_files']):
        if not nput.get('bucket_name'):
            input_json['input_files'][i]['bucket_name'] = 'elasticbeanstalk-%s-files' % env

    # hand-off to tibanna for further processing
    aws_lambda = boto3.client('lambda', region_name='us-east-1')
    res = aws_lambda.invoke(FunctionName='run_workflow',
                            Payload=json.dumps(input_json))
    res_decode = res['Payload'].read().decode()
    res_dict = json.loads(res_decode)
    arn = res_dict['_tibanna']['response']['executionArn']
    # just loop until we get proper status
    for i in range(100):
        res = aws_lambda.invoke(FunctionName='status_wfr',
                                Payload=json.dumps({'executionArn': arn}))
        res_decode = res['Payload'].read().decode()
        res_dict = json.loads(res_decode)
        if res_dict['status'] != 'RUNNING':
            break
        sleep(2)
    else:
        res_dict['status'] = 'FOURFRONT-TIMEOUT'

    if res_dict['status'] == 'FAILED':
        # get error from execution and sent a 422 response
        sfn = boto3.client('stepfunctions', region_name='us-east-1')
        hist = sfn.get_execution_history(executionArn=res_dict['executionArn'], reverseOrder=True)
        for event in hist['events']:
            if event.get('type') == 'ExecutionFailed':
                raise HTTPUnprocessableEntity(str(event['executionFailedEventDetails']))

    return res_dict


@view_config(name='run', context=WorkflowRun.Collection, request_method='POST',
             permission='add')
def run_workflow(context, request):
    input_json = request.json

    # set env_name for awsem runner in tibanna
    env = request.registry.settings.get('env.name')
    # for testing
    if not env:
        env = 'fourfront-webdev'
    if env == 'fourfront-webprod2':
        input_json['output_bucket'] = 'elasticbeanstalk-fourfront-webprod-wfoutput'
    else:
        input_json['output_bucket'] = 'elasticbeanstalk-%s-wfoutput' % env

    input_json['env_name'] = env

    # hand-off to tibanna for further processing
    aws_lambda = boto3.client('lambda', region_name='us-east-1')
    res = aws_lambda.invoke(FunctionName='run_workflow',
                            Payload=json.dumps(input_json))
    res_decode = res['Payload'].read().decode()
    res_dict = json.loads(res_decode)
    arn = res_dict['_tibanna']['response']['executionArn']
    # just loop until we get proper status
    for _ in range(2):
        res = aws_lambda.invoke(FunctionName='status_wfr',
                                Payload=json.dumps({'executionArn': arn}))
        res_decode = res['Payload'].read().decode()
        res_dict = json.loads(res_decode)
        if res_dict['status'] == 'RUNNING':
            break
        sleep(2)

    if res_dict['status'] == 'FAILED':
        # get error from execution and sent a 422 response
        sfn = boto3.client('stepfunctions', region_name='us-east-1')
        hist = sfn.get_execution_history(executionArn=res_dict['executionArn'], reverseOrder=True)
        for event in hist['events']:
            if event.get('type') == 'ExecutionFailed':
                raise HTTPUnprocessableEntity(str(event['executionFailedEventDetails']))

    return res_dict
