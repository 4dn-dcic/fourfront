"""The type file for the workflow related items.
"""
from itertools import chain
from collections import OrderedDict
import copy
from encoded.schema_formats import is_uuid
#import gevent
from pyramid.response import Response
from snovault import (
    calculated_property,
    collection,
    load_schema,
    CONNECTION
)
from .base import (
    Item
)

import cProfile, pstats, io

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

def trace_workflows(original_file_set_to_trace, request, options=None):
    '''
    Trace a set of files according to supplied options.

    -- TODO: After grouping design: CLEANUP! Rename get_model to get_item, etc. Remove grouping. --

    :param original_file_set_to_trace: Must be a list of DICTIONARIES. If have Item instances, grab their model.source['object'] or similar. Each dict should have at minimum:
        - uuid, workflow_run_inputs, workflow_run_outputs
    :param request: Request instance.
    '''

    if options is None:
        options = DEFAULT_TRACING_OPTIONS

    if options.get('track_performance'):
        pr = cProfile.Profile()
        pr.enable()

    uuidCacheModels = {}
    uuidCacheTracedHistory = {}
    uuidCacheGroupSourcesByRun = {}
    steps = [] # Our output

    def get_model(uuid, key = None):
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

        if (not hasattr(model, 'source') or not model.source.get('object')):
            raise WorkflowRunTracingException("In-tracing-path Item with ID " + uuid + " is not yet indexed.")

        if key is not None:
            uuidCacheModels[str(model.uuid)] = model
        uuidCacheModels[cacheKey] = model

        return model

    def get_model_obj(uuid, key = None):
        return get_model(uuid, key).source.get('object', {})


    def group_files_by_workflow_argument_name(set_of_files):
        files_by_argument_name = OrderedDict()
        for f in set_of_files:
            arg_name = f.get('workflow_argument_name')
            if arg_name:
                if files_by_argument_name.get(arg_name) is None:
                    files_by_argument_name[arg_name] = [f]
                else:
                    files_by_argument_name[arg_name].append(f)
        return files_by_argument_name


    def filter_workflow_runs(workflow_run_tuples):
        if len(workflow_run_tuples) < 3:
            return (workflow_run_tuples, [])
        filtered_tuples = []
        filtered_out_tuples = []
        tuples_by_workflow = {}

        for workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file in workflow_run_tuples:
            workflow_atid = workflow_run_model_obj.get('workflow')
            if not tuples_by_workflow.get(workflow_atid):
                tuples_by_workflow[workflow_atid] = []
            tuples_by_workflow[workflow_atid].append((workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file))

        for workflow_atid, wfr_tuples_for_wf in tuples_by_workflow.items():
            # Get most recent workflow
            sorted_wfr_tuples = sorted(wfr_tuples_for_wf, key=lambda wfr_tuple: wfr_tuple[2].get('date_created'))
            filtered_tuples.append(sorted_wfr_tuples[0])
            filtered_out_tuples = filtered_out_tuples + sorted_wfr_tuples[1:]

        return (filtered_tuples, filtered_out_tuples)


    def generate_sources_for_input(in_files, workflow_argument_name, depth = 0):

        sources = [] # Our output
        step_uuids = set()

        def try_match_input_with_workflow_run_output_to_generate_source(workflow_run_model_obj, workflow_run_uuid, in_file, in_file_uuid):
            sources_for_in_file = [] # We only are looking for 1 source, but might re-use for trace_future later
            for out_file in workflow_run_model_obj.get('output_files', []):
                out_file_atid = out_file.get('value', {})
                if out_file_atid == in_file.get('@id', 'b'):
                    step_uuid = workflow_run_uuid
                    if step_uuid:
                        step_uuids.add( (step_uuid, in_file_uuid) )
                    sources_for_in_file.append({
                        "name" : out_file.get('workflow_argument_name'),
                        "step" : workflow_run_model_obj.get('@id'),
                        "type" : "Output file",
                        "for_file" : in_file_uuid,
                        "workflow" : workflow_run_model_obj.get('workflow')
                    })
            return sources_for_in_file

        # Gather all workflow_runs out of which our input files (1 run per file) come from
        all_workflow_runs = []

        for in_file in in_files:
            in_file_uuid = in_file.get('uuid')

            input_file_model = in_file.get('TEMP_MODEL')
            del in_file['TEMP_MODEL']

            if uuidCacheTracedHistory.get(in_file_uuid):
                sources = sources + uuidCacheTracedHistory[in_file_uuid]
                continue

            if not input_file_model:
                continue

            input_file_model_obj = input_file_model.source.get('object', {})

            # Update in_file with metadata we want from the file.
            in_file['@type'] = input_file_model_obj.get('@type')
            in_file['file_type'] = input_file_model_obj.get('file_type')
            in_file['filename'] = input_file_model_obj.get('filename')
            in_file['file_size'] = input_file_model_obj.get('file_size')
            in_file['status'] = input_file_model_obj.get('status')
            in_file['display_title'] = input_file_model_obj.get('display_title')

            # Get @ids from ES source.
            output_of_workflow_runs = input_file_model_obj.get('workflow_run_outputs', [])
            if len(output_of_workflow_runs) == 0:
                continue
            # There should only ever be one 'workflow_run_outputs' at most, or versions of same one (grab most recent).
            last_workflow_run_output_of = output_of_workflow_runs[len(output_of_workflow_runs) - 1]
            workflow_run_uuid = get_unique_key_from_at_id(last_workflow_run_output_of)
            if not workflow_run_uuid or uuidCacheTracedHistory.get(workflow_run_uuid):
                continue
            workflow_run_model_obj = get_model_obj(workflow_run_uuid)
            if not workflow_run_model_obj:
                continue
            all_workflow_runs.append( (workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file) )

        # Filter WFRs by WF down to most recent WFR - working, but not enabled as no UI for it yet.
        # TODO: DRYing (can check group_similar_workflow_runs option in filter_workflow_runs func, then remove this IF/ELSE statement)
        if options.get('group_similar_workflow_runs'):

            filtered_in_workflow_runs, filtered_out_workflow_runs = filter_workflow_runs(all_workflow_runs)

            for workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file in filtered_in_workflow_runs:
                sources_for_in_file = try_match_input_with_workflow_run_output_to_generate_source(workflow_run_model_obj, workflow_run_uuid, in_file, in_file_uuid)
                uuidCacheTracedHistory[in_file_uuid] = sources_for_in_file
                sources = sources + sources_for_in_file

            untraced_in_files = []
            for workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file in filtered_out_workflow_runs:
                untraced_in_files.append(in_file_uuid)
                source_for_in_file = {
                    "type" : "Input File Group",
                    "for_file" : in_file_uuid,
                    "step" : workflow_run_model_obj.get('@id'),
                    "grouped_by" : "workflow",
                    "workflow" : workflow_run_model_obj.get('workflow')
                }
                uuidCacheTracedHistory[in_file_uuid] = [source_for_in_file]
                uuidCacheGroupSourcesByRun[workflow_run_uuid] = uuidCacheGroupSourcesByRun.get(workflow_run_uuid, []) + [in_file_uuid] #[source_for_in_file]
                sources.append(source_for_in_file)

        else:

            for workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file in all_workflow_runs:
                sources_for_in_file = try_match_input_with_workflow_run_output_to_generate_source(workflow_run_model_obj, workflow_run_uuid, in_file, in_file_uuid)
                uuidCacheTracedHistory[in_file_uuid] = sources_for_in_file
                sources = sources + sources_for_in_file


        if len(sources) == 0:
            for_files = [ f['uuid'] for f in in_files ]
            if len(for_files) == 1:
                for_files = for_files[0]
            sources = [{
                 "name" : workflow_argument_name, "type" : "Workflow Input File", "for_file" : for_files
            }]
        else:
            #futures = []
            for step_uuid, in_file_uuid in step_uuids:
                #futures.append(gevent.spawn(trace_history, [s], depth + 1))
                trace_history([step_uuid], get_model_obj(in_file_uuid), depth + 1)
            #for f in futures:
                #print('\n\n\nGOT', f.get())
        return sources

    def add_next_targets_to_step_from_file(step, current_file_model_object):
        '''Compare our current_file_model_object with each output run data file of step and if is a match, add targets step from output argument to the next step(s) the file goes to, if any.'''
        for output in step['outputs']:
            if type(output.get('run_data', {}).get('file')) is list:
                files_for_this_output = output['run_data']['file']
                for outfile in files_for_this_output:
                    if outfile['uuid'] == current_file_model_object['uuid']:
                        output['meta']['in_path'] = True
                        runs_current_file_goes_to = current_file_model_object.get('workflow_run_inputs', [])
                        for run_at_id in runs_current_file_goes_to:
                            target_workflow_run_uuid = get_unique_key_from_at_id(run_at_id)
                            target_workflow_run_model = get_model(target_workflow_run_uuid).source.get('object')
                            input_files_by_argument_name = group_files_by_workflow_argument_name(target_workflow_run_model.get('input_files', []))
                            for argument_name, input_files_for_arg in input_files_by_argument_name.items():
                                input_files_for_arg_atids = [ f.get('value') for f in input_files_for_arg ]
                                if current_file_model_object.get('@id') in input_files_for_arg_atids:
                                    # Check that we don't have this already
                                    exists = False
                                    for target in output['target']:
                                        if target.get('name') == argument_name and target.get('step') == target_workflow_run_model.get('display_title') and target.get('for_file') == current_file_model_object['uuid']:
                                            exists = True
                                            break
                                    if not exists:
                                        output['target'].append({
                                            "name" : argument_name,
                                            "step" : target_workflow_run_model.get('@id'),
                                            "type" : "Input file",
                                            "for_file" : current_file_model_object['uuid']
                                        })

    def trace_history(output_of_workflow_run_uuids, current_file_model_object, depth = 0):

        if depth > options.get('max_depth_history', 3):
            return

        if len(output_of_workflow_run_uuids) == 0:
            return

        # When we trace history, we care only about the last workflow_run out of which file was generated.
        # A file should be output of only one run.
        last_workflow_run_uuid = output_of_workflow_run_uuids[len(output_of_workflow_run_uuids) - 1]

        # If we've already traced inputs of this workflowrun, lets skip tracing it.
        # But, lets loop over its outputs and extend them with proper target to next step if our current file matches one of this already-traced runs output files.
        if uuidCacheTracedHistory.get(last_workflow_run_uuid):
            add_next_targets_to_step_from_file(uuidCacheTracedHistory[last_workflow_run_uuid], current_file_model_object)
            return

        if uuidCacheGroupSourcesByRun.get(last_workflow_run_uuid) is not None:
            return

        uuidCacheTracedHistory[last_workflow_run_uuid] = True

        workflow_run_model_obj = get_model_obj(last_workflow_run_uuid)
        if not workflow_run_model_obj:
            return

        step = {
            "name" : workflow_run_model_obj.get('@id'), # We use our front-end Node component to show display_title or something else from meta instead.
            "meta" : {
                'display_title' : workflow_run_model_obj.get('display_title'),
                "status" : workflow_run_model_obj.get('status'),
                "run_status" : workflow_run_model_obj.get('run_status'),
                '@type'  : workflow_run_model_obj.get('@type'),
                '@id'    : workflow_run_model_obj.get('@id'),
                'date_created' : workflow_run_model_obj.get('date_created'),
                "analysis_step_types" : [],
            },
            "inputs" : [],
            "outputs" : []
        }

        # Fill 'Analysis Step Types' w/ workflow name; TODO: Add component analysis_steps.
        workflow_uuid = get_unique_key_from_at_id(workflow_run_model_obj.get('workflow')) #workflow_run.properties.get('workflow')
        workflow_model = None
        if workflow_uuid:
            workflow_model_obj = get_model_obj(workflow_uuid)
            if workflow_model_obj and workflow_model_obj.get('workflow_type'):
                step['meta']['analysis_step_types'].append(workflow_model_obj['workflow_type'])
                step['meta']['workflow'] = {
                    '@id'               : workflow_model_obj.get('@id') or workflow_run_model_obj.get('workflow'),
                    '@type'             : workflow_model_obj.get('@type'),
                    'display_title'     : workflow_model_obj.get('display_title') or workflow_model_obj.get('title'),
                    'accession'         : workflow_model_obj.get('accession'),
                    'steps'             : workflow_model_obj.get('steps'),
                    'uuid'              : workflow_uuid,
                    'workflow_type'     : workflow_model_obj.get('workflow_type')
                }


        # Add Output Files, 1-level deep max (maybe change in future)
        output_files_by_argument_name = group_files_by_workflow_argument_name(workflow_run_model_obj.get('output_files', []))
        for argument_name, output_files_for_arg in output_files_by_argument_name.items():
            files = [ f.get('value') for f in output_files_for_arg ]
            file_items = []
            original_file_in_output = False
            for file_at_id in files:
                got_item = get_model(get_unique_key_from_at_id(file_at_id), 'accession')
                if got_item is not None:
                    if str(got_item.uuid) == current_file_model_object.get('uuid'):
                        original_file_in_output = True
                    file_items.append({
                        'accession' : got_item.properties.get('accession'),
                        'uuid' : str(got_item.uuid),
                        'file_format' : got_item.properties.get('file_format'),
                        'file_type' : got_item.properties.get('file_type'),
                        'description' : got_item.properties.get('description'),
                        '@id' : file_at_id
                    })
            step['outputs'].append({
                "name" : argument_name, # TODO: Try to fallback to ... in_file.file_type_detailed?
                "target" : [{ "name" : argument_name, "type" : "Workflow Output File" }],
                "meta" : {
                    "argument_type" : "Output File",
                    "in_path" : original_file_in_output
                },
                "run_data" : {
                    "file" : file_items,
                    "type" : "input",
                    "meta" : [ { k:v for k,v in f.items() if k not in ['value', 'workflow_argument_name'] } for f in output_files_for_arg ]
                }
            })
            add_next_targets_to_step_from_file(step, current_file_model_object)


        # Trace Input Files
        input_files_by_argument_name = group_files_by_workflow_argument_name(workflow_run_model_obj.get('input_files', []))
        for argument_name, input_files_for_arg in input_files_by_argument_name.items():

            files = [ f.get('value') for f in input_files_for_arg ]
            file_items = []
            for file_at_id in files:
                got_item = get_model(get_unique_key_from_at_id(file_at_id), 'accession')
                if got_item is not None:
                    file_items.append({
                        'accession' : got_item.properties.get('accession'),
                        'uuid' : str(got_item.uuid),
                        'file_format' : got_item.properties.get('file_format'),
                        'description' : got_item.properties.get('description'),
                        '@id' : file_at_id,
                        'TEMP_MODEL' : got_item
                    })

            step['inputs'].append({
                "name" : argument_name, # TODO: Try to fallback to ... in_file.file_type_detailed?
                "source" : generate_sources_for_input(file_items, argument_name, depth),
                "meta" : {
                    "argument_type" : "Input File",
                    "in_path" : True
                },
                "run_data" : {
                    "file" : file_items,
                    "type" : "input",
                    "meta" : [ { k:v for k,v in f.items() if k not in ['value', 'workflow_argument_name'] } for f in input_files_for_arg ]
                }
            })

        steps.append(step)
        uuidCacheTracedHistory[last_workflow_run_uuid] = step
        return step


    # TODO:
    def trace_future(input_of_workflow_run_uuids):
        for uuid in input_of_workflow_run_uuids:
            #workflow_run = file_item.collection.get(uuid)
            output_file_uuids = [ f.get('value') for f in workflow_run.properties.get('output_files', []) ]

            #output_files = workflow_run.properties.get('input_files')
            print('\n\n\n', input_file_uuids)
            print('\n\n\n', workflow_run.properties.get('output_files'))




    ###########################################
    ### Where function starts doing things. ###
    ###########################################

    for original_file in original_file_set_to_trace:
        file_item_output_of_workflow_run_uuids = [ get_unique_key_from_at_id(wfr) for wfr in original_file.get('workflow_run_outputs', []) ]
        #file_item_input_of_workflow_run_uuids = [ get_unique_key_from_at_id(wfr) for wfr in original_file.get('workflow_run_inputs', []) ]
        if 'history' in options.get('trace_direction', ['history']):
            if uuidCacheTracedHistory.get(original_file['uuid']) is None:
                trace_history(file_item_output_of_workflow_run_uuids, original_file)


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
    embedded_list = [
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

    #rev = {
    #    'workflow_runs': ('WorkflowRun', 'workflow'),
    #}
    #
    #@calculated_property(schema={
    #    "title": "Workflow Runs",
    #    "description": "All runs of this workflow definition.",
    #    "type": "array",
    #    "items": {
    #        "title": "Workflow Run",
    #        "type": ["string", "object"],
    #        "linkTo": "WorkflowRun"
    #    }
    #})
    #def workflow_runs(self, request):
    #    return self.rev_link_atids(request, "workflow_runs")


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
    embedded_list = [
                #'workflow.*',
                'workflow.title',
                'workflow.steps.name',
                'workflow.steps.meta.software_used.name',
                'workflow.steps.meta.software_used.title',
                'workflow.steps.meta.software_used.version',
                'workflow.steps.meta.software_used.source_url',
                'workflow.workflow_type',
                'input_files.workflow_argument_name',
                'input_files.value.filename',
                'input_files.value.display_title',
                'input_files.value.file_format',
                'input_files.value.uuid',
                'input_files.value.accession',
                'input_files.value.@type',
                'input_files.value.file_size',
                'output_files.workflow_argument_name',
                'output_files.*',
                'output_files.value.file_format',
                'output_files.value.uuid',
                'output_files.value.accession',
                'output_files.value.@type',
                'output_files.value.file_size',
                'output_quality_metrics.name',
                'output_quality_metrics.value.uuid',
                'output_quality_metrics.value.@type'
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

            global_pointing_source_target = get_global_source_or_target(step_io_arg.get('source', step_io_arg.get('target', [])))
            if not global_pointing_source_target:
                return False

            matched_runtime_io_data = [ io_object for io_object in wfr_runtime_inputs if global_pointing_source_target['name'] == io_object.get('workflow_argument_name') ]

            value_variable_name = 'value' if io_type == 'parameter' else 'file' 

            if len(matched_runtime_io_data) > 0:
                matched_runtime_io_data = sorted(matched_runtime_io_data, key=lambda io_object: io_object.get('ordinal', 1))
                step_io_arg['run_data'] = {
                    value_variable_name : [ p['value'] for p in matched_runtime_io_data ], #[ '/files/' + p['value'] + '/' for p in paramsForTarget ], # List of file UUIDs.
                    "type" : io_type,
                    "meta" : [ # Aligned-to-file-list list of file metadata
                        {   # All remaining properties from dict in (e.g.) 'input_files','output_files',etc. list.
                            k:v for (k,v) in p.items()
                            if k not in [ 'value', 'type', 'workflow_argument_name' ]
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
            print('\n\n\nARGS', resultArgs)
            return resultArgs


        # Metrics will overwrite output_files in case of duplicate keys.
        combined_output_files = mergeArgumentsWithSameArgumentName(
            [ dict(f, type = "output" ) for f in self.properties.get('output_files',[]) ] +
            [ dict(f, type = "quality_metric" ) for f in self.properties.get('output_quality_metrics',[]) ]
        )

        input_files = mergeArgumentsWithSameArgumentName(
            [ dict(f, type = "input" ) for f in self.properties.get('input_files',[]) ]
        )

        input_params = mergeArgumentsWithSameArgumentName(self.properties.get('parameters',[]))


        for step in analysis_steps:
            # Add output file metadata to step outputs & inputs, based on workflow_argument_name v step output target name.

            for output in step['outputs']:
                map_run_data_to_io_arg(output, combined_output_files, 'output')

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
    embedded_list = []
