"""The type file for the workflow related items.
"""
from itertools import chain
from collections import OrderedDict
#import gevent
from pyramid.response import Response
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


import cProfile, pstats, io



# This is the schema used for both Workflow.analysis_steps and WorkflowRun.analysis_steps.
workflow_analysis_steps_schema = {
    "title": "Workflow Analysis Steps",
    "type": "array",
    "items": {
        "title": "Analysis Step",
        "type": "object",
        "additionalProperties": True,
        "properties": {
            "uuid": {
                "title": "UUID",
                "description": "Unique Identifier for AnalysisStep",
                "type": "string"
            },
            "inputs" : {
                "title" : "Step Inputs",
                "type" : "array",
                "items" : {
                    "type" : "object",
                    "properties" : {
                        "name" : {
                            "title" : "Input Name",
                            "type" : "string"
                        },
                        "source" : {
                            "title" : "Source Step",
                            "description" : "Where this input file came from.",
                            "type" : "array",
                            "items" : {
                                "type" : "object",
                                "properties" : {
                                    "name" : { "type" : "string" },
                                    "type" : { "type" : "string" },
                                    "step" : { "type" : "string" }
                                }
                            }
                        },
                        "run_data" : {
                            "type" : "object",
                            "properties" : {
                                "file" : {
                                    "type" : "string",
                                    "title" : "File",
                                    # "linkTo" : "File"
                                },
                                "value" : {
                                    "title" : "Value",
                                    "type" : "string"
                                },
                                "type" : {
                                    "type" : "string",
                                    "title" : "I/O Type"
                                }
                            }
                        }
                    }
                }
            },
            "outputs" : {
                "title" : "Step Outputs",
                "type" : "array",
                "items" : {
                    "type" : "object",
                    "properties" : {
                        "name" : {
                            "title" : "Output Name",
                            "type" : "string"
                        },
                        "target" : {
                            "title" : "Target Step",
                            "description" : "Where this output file should go next.",
                            "type" : "array",
                            "items" : {
                                "type" : "object",
                                "properties" : {
                                    "name" : { "type" : "string" },
                                    "type" : { "type" : "string" },
                                    "step" : { "type" : "string" }
                                }
                            }
                        },
                        "run_data" : {
                            "type" : "object",
                            "properties" : {
                                "file" : {
                                    "type" : "string",
                                    "title" : "File",
                                    # "linkTo" : "File"
                                },
                                "value" : {
                                    "title" : "Value",
                                    "type" : "string"
                                },
                                "type" : {
                                    "type" : "string",
                                    "title" : "I/O Type"
                                }
                            }
                        }
                    }
                }
            },
            "software_used": {
                "title": "Software Used",
                "description": "Reference to Software Used",
                "type": "string",
                "linkTo" : "Software"
            },
            "name" : {
                "title" : "Step Name",
                "type" : "string"
            },
            "analysis_step_types" : {
                "title" : "Step Purposes",
                "type" : "array",
                "items" : {
                    "type" : "string"
                }
            }
        }
    }
}

def get_unique_key_from_at_id(at_id):
    if not at_id:
        return None
    at_id_parts = at_id.split('/')
    return at_id_parts[2]

DEFAULT_TRACING_OPTIONS = {
    'max_depth_history' : 6,
    'max_depth_future' : 6,
    "group_similar_workflow_runs" : True,
    "track_performance" : False
}


def trace_workflows(original_file_item_uuid, request, file_item_input_of_workflow_run_uuids, file_item_output_of_workflow_run_uuids, options=DEFAULT_TRACING_OPTIONS):
    
    if options.get('track_performance'):
        pr = cProfile.Profile()
        pr.enable()

    uuidCacheModels = {}
    uuidCacheTracedHistory = {}
    steps = [] # Our output

    def get_model_by_uuid(uuid, key = None):
        # TODO: Check for hasattr(model, 'source') and raise Exception? (after we have something setup to handle it)
        model = None
        cacheKey = uuid
        if key is not None:
            cacheKey = key + ':' + uuid

        model = uuidCacheModels.get(cacheKey)
        if model is not None:
            return model

        if key is None:
            model = request.registry['connection'].storage.get_by_uuid(uuid)
        else:
            model = request.registry['connection'].storage.get_by_unique_key(key, uuid)
        uuidCacheModels[cacheKey] = model
        return model

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

    def group_workflow_runs_by_workflow():
        pass

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

        def get_date_created_from_tuple(wfr_tuple):
            workflow_run_uuid, in_file_uuid, workflow_run_model_obj, in_file = wfr_tuple
            return workflow_run_model_obj.get('date_created')

        for workflow_atid, wfr_tuples_for_wf in tuples_by_workflow.items():
            # Get most recent workflow
            sorted_wfr_tuples = sorted(wfr_tuples_for_wf, key=get_date_created_from_tuple)
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
                    step_name = workflow_run_model_obj.get('display_title')
                    step_uuid = workflow_run_uuid
                    if step_uuid:
                        step_uuids.add(step_uuid)
                    sources_for_in_file.append({
                        "name" : out_file.get('workflow_argument_name'),
                        "step" : step_name,
                        "type" : "Output file",
                        "for_file" : in_file_uuid,
                        "workflow" : workflow_run_model_obj.get('workflow')
                    })
            return sources_for_in_file

        # Gather all workflow_runs out of which our input files (1 run per file) come from
        all_workflow_runs = []

        for in_file in in_files:
            in_file_uuid = in_file.get('uuid')
            if uuidCacheTracedHistory.get(in_file_uuid):
                sources = sources + uuidCacheTracedHistory[in_file_uuid]
                continue

            input_file_model = get_model_by_uuid(in_file_uuid)

            if not input_file_model or not hasattr(input_file_model, 'source') or input_file_model.source.get('object') is None:
                continue

            input_file_model_obj = input_file_model.source.get('object', {})

            # Update in_file with metadata we want from the file.
            in_file['@type'] = input_file_model_obj.get('@type')
            in_file['file_type'] = input_file_model_obj.get('file_type')
            in_file['filename'] = input_file_model_obj.get('filename')
            # Get @ids from ES source.
            output_of_workflow_runs = input_file_model_obj.get('workflow_run_outputs', [])
            if len(output_of_workflow_runs) == 0:
                continue
            # There should only ever be one 'workflow_run_outputs' at most, or versions of same one (grab most recent).
            last_workflow_run_output_of = output_of_workflow_runs[len(output_of_workflow_runs) - 1]
            workflow_run_uuid = get_unique_key_from_at_id(last_workflow_run_output_of)
            if not workflow_run_uuid or uuidCacheTracedHistory.get(workflow_run_uuid):
                continue
            workflow_run_model = get_model_by_uuid(workflow_run_uuid)
            if not workflow_run_model or not hasattr(workflow_run_model, 'source'):
                continue
            workflow_run_model_obj = workflow_run_model.source.get('object', {})
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
                    "step" : workflow_run_model_obj.get('display_title'),
                    "grouped_by" : "workflow",
                    "workflow" : workflow_run_model_obj.get('workflow')
                }
                uuidCacheTracedHistory[in_file_uuid] = [source_for_in_file]
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
            for s in step_uuids:
                #futures.append(gevent.spawn(trace_history, [s], depth + 1))
                trace_history([s], depth + 1)
            #for f in futures:
                #print('\n\n\nGOT', f.get())
        return sources

    def trace_history(output_of_workflow_run_uuids, depth = 0):

        if depth > options.get('max_depth_history', 3):
            return

        if len(output_of_workflow_run_uuids) == 0:
            return

        # When we trace history, we care only about the last workflow_run out of which file was generated.
        # A file should be output of only one run.
        last_workflow_run_uuid = output_of_workflow_run_uuids[len(output_of_workflow_run_uuids) - 1]
        uuidCacheTracedHistory[last_workflow_run_uuid] = True
        workflow_run_model = get_model_by_uuid(last_workflow_run_uuid)

        if not workflow_run_model or not hasattr(workflow_run_model, 'source'):
            return

        workflow_run_model_obj = workflow_run_model.source.get('object',{})
        input_files = workflow_run_model_obj.get('input_files', [])
        output_files = workflow_run_model_obj.get('output_files', [])

        step = {
            "uuid" : last_workflow_run_uuid, # Gets moved to stepNode.meta.uuid on front-end
            "name" : workflow_run_model_obj.get('display_title'), # Gets duplicated to stepNode.meta.name, and stepNode.name,
            "meta" : {
                "status" : workflow_run_model_obj.get('status'),
                '@type'  : workflow_run_model_obj.get('@type'),
                '@id'    : workflow_run_model_obj.get('@id'),
                'date_created' : workflow_run_model_obj.get('date_created')
            },
            "analysis_step_types" : [], # Gets moved to stepNode.meta.analysis_step_types on front-end (we could put into meta here as well)
            "inputs" : [],
            "outputs" : []
        }

        # Fill 'Analysis Step Types' w/ workflow name; TODO: Add component analysis_steps.
        workflow_uuid = get_unique_key_from_at_id(workflow_run_model_obj.get('workflow')) #workflow_run.properties.get('workflow')
        workflow_model = None
        if workflow_uuid:
            workflow_model = get_model_by_uuid(workflow_uuid)
            if workflow_model and hasattr(workflow_model, 'source'):
                workflow_model_obj = workflow_model.source.get('object',{})
                if workflow_model_obj.get('workflow_type'):
                    step['analysis_step_types'].append(workflow_model_obj['workflow_type'])
                    step['meta']['workflow'] = {
                        '@id'               : workflow_model_obj.get('@id') or workflow_run_model_obj.get('workflow'),
                        '@type'             : workflow_model_obj.get('@type'),
                        'title'             : workflow_model_obj.get('title'),
                        'description'       : workflow_model_obj.get('description'),
                        'display_title'     : workflow_model_obj.get('display_title') or workflow_model_obj.get('title'),
                        'accession'         : workflow_model_obj.get('accession'),
                        'workflow_steps'    : workflow_model_obj.get('workflow_steps'),
                        'uuid'              : workflow_uuid,
                        'date_created'      : workflow_model_obj.get('date_created'),
                        'link_id'           : workflow_model_obj.get('link_id'),
                        'workflow_type'     : workflow_model_obj.get('workflow_type'),
                        'cwl_pointer'       : workflow_model_obj.get('cwl_pointer')
                    }


        # Add Output Files, 1-level deep max (maybe change in future)
        output_files_by_argument_name = group_files_by_workflow_argument_name(output_files)
        for argument_name, output_files_for_arg in output_files_by_argument_name.items():
            targets = []

            if len(targets) == 0:
                targets = [{ "name" : argument_name, "type" : "Workflow Output File" }]

            files = [ f.get('value') for f in output_files_for_arg ]
            file_items = []
            original_file_in_output = False
            for file_at_id in files:
                got_item = get_model_by_uuid(get_unique_key_from_at_id(file_at_id), 'accession')
                if str(got_item.uuid) == original_file_item_uuid:
                    original_file_in_output = True
                file_items.append({
                    'accession' : got_item.properties.get('accession'),
                    'uuid' : str(got_item.uuid),
                    'file_format' : got_item.properties.get('file_format'),
                    'description' : got_item.properties.get('description'),
                    '@id' : file_at_id
                })
            step['outputs'].append({
                "name" : argument_name, # TODO: Try to fallback to ... in_file.file_type_detailed?
                "target" : targets, # TODO: Trace these maybe (probably not, already too much context shown in graph)
                "meta" : {
                    "argument_type" : "Input File",
                    "in_path" : original_file_in_output
                },
                "run_data" : {
                    "file" : file_items,
                    "type" : "input",
                    "meta" : [ { k:v for k,v in f.items() if k not in ['value', 'workflow_argument_name'] } for f in output_files_for_arg ]
                }
            })


        # Trace Input Files
        input_files_by_argument_name = group_files_by_workflow_argument_name(input_files)
        for argument_name, input_files_for_arg in input_files_by_argument_name.items():

            files = [ f.get('value') for f in input_files_for_arg ]
            file_items = []
            for file_at_id in files:
                got_item = get_model_by_uuid(get_unique_key_from_at_id(file_at_id), 'accession')
                file_items.append({
                    'accession' : got_item.properties.get('accession'),
                    'uuid' : str(got_item.uuid),
                    'file_format' : got_item.properties.get('file_format'),
                    'description' : got_item.properties.get('description'),
                    '@id' : file_at_id
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

        # After plotting inputs, link up inputs w/ any outputs of prior step(s).
        for input in step['inputs']:
            for source in input.get('source', []):
                for existing_step in steps:
                    if existing_step['name'] == source.get('step'):
                        for output in existing_step.get('outputs', []):
                            if output.get('name', 'blank1') == source.get('name', 'blank2'):
                                output['target'].append({
                                    "name" : input.get("name"),
                                    "step" : step["name"],
                                    "type" : "Input file"
                                })
                                output["meta"]["in_path"] = True

        steps.append(step)

    # TODO:
    def trace_future(input_of_workflow_run_uuids):
        for uuid in input_of_workflow_run_uuids:
            #workflow_run = file_item.collection.get(uuid)
            output_file_uuids = [ f.get('value') for f in workflow_run.properties.get('output_files', []) ]

            #output_files = workflow_run.properties.get('input_files')
            print('\n\n\n', input_file_uuids)
            print('\n\n\n', workflow_run.properties.get('output_files'))


    trace_history(file_item_output_of_workflow_run_uuids)

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
    schema = load_schema('encoded:schemas/workflow.json')
    embedded = ['arguments.argument_type',
                'arguments.argument_format',
                'arguments.workflow_argument_name',
                'arguments.argument_mapping.workflow_step',
                'arguments.argument_mapping.step_argument_name',
                'arguments.argument_mapping.step_argument_type']

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

    @calculated_property(schema=workflow_analysis_steps_schema,
                         category='page')
    def analysis_steps(self, request):
        '''
        Uses this Workflow's linked Item list of AnalysisSteps in property 'workflow_steps', along with 'argument_mapping's of this Workflow's 'argument' property objects,
        to 'extend' the 'workflow_steps' AnalysisSteps (in context of this Workflow) with lists of 'inputs' and 'outputs', which denote input and output argument nodes, and
        themselves contain either a 'source' or a 'target' list of other AnalysisSteps out of which they were produced or are going into (as inputs).
        This structure is enough to trace step->inputs->step->inputs or step->outputs->step->outputs and make proper node connections in the visualized workflow graph.

        :returns: A list of AnalysisStep items, in plain dictionary form (as objects, not linked Items), and extended with 'inputs' and 'outputs'.
        '''

        if self.properties.get('arguments') is None:
            return []

        if self.properties.get('workflow_steps') is None:
            return []


        def getStepDict(stepContainer):
            '''
            This function is needed to convert an AnalysisStep UUID to a basic dictionary representation of the AnalysisStep, by grabbing it from the database.
            Alternatively, request.embed(uuid, '@embedded') could work in lieu of self.collection.get(<uuid>), if can access it while embedding.

            :param stepContainer: A dictionary containing 'step' - a UUID of an AnalysisStep, and 'step_name', a name for the step used within workflow (overrides AnalysisStep.properties.name).
            '''
            uuid = stepContainer['step']
            resultStepProperties = ['software_used', '@id', 'link_id', 'display_title', 'description', 'status', '@type'] # props to leave in
            step = self.collection.get(str(uuid))
            stepDict = {
                'uuid' : str(uuid),
                'inputs' : step.properties.get('inputs', []), # Probably doesn't exist. We'll fill later.
                'outputs' : step.properties.get('outputs', []),
                'name' : step.properties.get('name') or step.properties.get('display_title'),
                'analysis_step_types' : step.properties.get('analysis_step_types', []),
                'meta' : {}
            }
            stepDict['meta'].update(step.properties)
            stepKeys = list(stepDict['meta'].keys())
            for key in stepKeys:
                if key not in resultStepProperties:
                    del stepDict['meta'][key]

            # Use 'step_name' as provided in Workflow's 'workflow_steps', to override AnalysisStep 'name', in case step is renamed in Workflow.
            # Is unlikely, but possible, to differ from AnalysisStep own name.
            stepDict['name'] = stepContainer.get('step_name', stepDict.get('name'))
            if stepDict['meta'].get('software_used') is not None:
                stepDict['meta']['software_used'] = '/software/' + stepDict['meta']['software_used'] + '/' # Convert to '@id' form so is picked up for embedding.
            stepDict['meta']['@id'] = step.jsonld_id(request)
            return stepDict

        def mergeIOForStep(outputArgs, argType = "output"):
            '''
            IMPORTANT:
            Each 'argument' item has up to two argument_mappings in current Workflows data structure, though there could be many more mappings than that, so in practice there are
            multiple 'argument' items for the same argument node. To handle this, we distribute arguments->argument_mappings among steps first, as inputs with sources or outputs with targets,
            then in this function, combine them when step & step_argument_name are equal.

            :param outputArgs: 'input' or 'output' items of a 'constructed' analysis_step item.
            :param argType: Whether we are merging/combining inputs or outputs.
            '''
            argTargetsPropertyName = 'target' if argType == 'output' else 'source' # Inputs have a 'source', outputs have a 'target'.
            seen_argument_names = {}
            resultArgs = []
            for arg in outputArgs:
                argName = arg.get('name')
                if argName:
                    priorArgument = seen_argument_names.get(argName)
                    if priorArgument and len(arg[argTargetsPropertyName]) > 0:
                        for currentTarget in arg[argTargetsPropertyName]:
                            foundExisting = False
                            for existingTarget in priorArgument[argTargetsPropertyName]:
                                if (
                                    existingTarget['name'] == currentTarget['name']
                                    and existingTarget.get('step','a') == currentTarget.get('step','b')
                                ):
                                    existingTarget.update(currentTarget)
                                    foundExisting = True
                            if not foundExisting:
                                priorArgument[argTargetsPropertyName].append(currentTarget)
                    else:
                        resultArgs.append(arg)
                        seen_argument_names[argName] = arg
            return resultArgs


        def buildIOFromMapping(currentArgument, currentArgumentMap, currentMapIndex, argumentType):
            '''
            Given an argument_mapping item & its index (currentArgumentMap, currentMapIndex),
            its parent argument (currentArgument), and type of node to create ("input" or "output"; argumentType),
            generates an input or output object for a step with "source" or "target" properties which reference the previous or next step, including if is a 'global' "Workflow Input/Output File".

            :param currentArgument: Dictionary item from 'arguments' property list. Should have an 'argument_mapping' list with a maximum of 2 entries and/or 'workflow_argument_name' (if global input/output).
            :param currentArgumentMap: Dictionary item from 'arguments' item's 'argument_mapping' list.
            :param currentMapIndex: Index of currentArgumentMap within its parent 'arguments'->'argument_mapping' list.
            :param argumentType: "input" or "output", to know what form of node is being created.
            :returns: Dictionary representing an I/O node of a step, containing a list for "source" or "target" which directs to where I/O node came from or is going to next.
            '''

            # Input nodes have a 'source', output nodes have a 'target'
            argTargetsPropertyName = 'target' if argumentType == 'output' else 'source'

            io = {
                "name" : currentArgument.get("workflow_argument_name",
                    currentArgumentMap.get('step_argument_name')
                ),
                argTargetsPropertyName : []     # To become list of "source" or "target" steps.
            }

            mapping = currentArgument['argument_mapping'] # siblings, inclusive, of 'currentArgumentMap'

            doesOppositeIOMappingExist = len([
                mp for mp in mapping if (
                    mp.get('step_argument_type').lower() == ('input' if argumentType == 'output' else 'output') + ' file' or
                    mp.get('step_argument_type').lower() == ('input' if argumentType == 'output' else 'output') + ' file or parameter'
                )
            ]) > 0

            # Confirmed Assumption : If a "workflow_argument_name" is present on argument, then it is a "global" "workflow output" or "workflow input" argument.
            # So, we create/add an explicit source or target item to node to indicate this.
            # 'doesOppositeIOMappingExist' check may not be necessary, operates on optimization assumption (comment in next if statement)
            #  -- if doesOppositeIOMappingExist is **true** and workflow_argument_name is not None, we could throw an Exception.
            if currentArgument.get("workflow_argument_name") is not None and not doesOppositeIOMappingExist:
                argTargetsProperty = { "name" : currentArgument["workflow_argument_name"] }
                if currentArgumentMap['step_argument_type'] == 'parameter':
                    argTargetsProperty["type"] = "Workflow Parameter"
                else:
                    argTargetsProperty["type"] = "Workflow " + argumentType.capitalize() + " File"
                io[argTargetsPropertyName].append(argTargetsProperty)
            if len(mapping) > 1:
                # Optimization. There is at most two mappings in argument_mapping. Use other 1 (not mapping of current step) to build "source" or "target" of where argument came from or is going to.
                otherIndex = 0
                if currentMapIndex == 0:
                    otherIndex = 1
                other_arg_type = mapping[otherIndex].get("step_argument_type")
                io[argTargetsPropertyName].append({
                    "name" : mapping[otherIndex]["step_argument_name"],
                    "step" : mapping[otherIndex]["workflow_step"],
                    "type" : other_arg_type
                })

            # Dump anything else defined on current arguments[] property item into 'meta' property of our input or output node.
            # Info such as "cardinality", "argument_format" may be available from here.
            io["meta"] = { k:v for (k,v) in currentArgument.items() if k not in ["argument_mapping", "workflow_argument_name"] }
            return io


        steps = map(getStepDict, self.properties['workflow_steps'])

        resultSteps = []

        # Distribute arguments into steps' "inputs" and "outputs" arrays.
        # Transform 'argument_mapping' to be 'source' or 'target' of the 'input' or 'output' argument, re: context of step it is attached to (the other mapping). @see def buildIONodeFromMapping.
        # Then combine them for each step where step_argument_name & step are equal. @see def mergeIOForStep.
        for step in steps:
            step['inputs'] = []
            step['outputs'] = []

            for arg in self.properties['arguments']:
                mapping = arg.get('argument_mapping')
                if mapping is None:
                    continue
                for mappingIndex, mappedArg in enumerate(mapping):
                    if mappedArg.get('workflow_step') == step['name']:
                        step_argument_type = mappedArg.get('step_argument_type','').lower()
                        if   ( step_argument_type == 'input file'  or step_argument_type == 'input file or parameter' or step_argument_type == 'parameter' ):
                            step["inputs"].append(buildIOFromMapping(arg, mappedArg, mappingIndex, 'input'))
                        elif ( step_argument_type == 'output file' or step_argument_type == 'output file or parameter' ):
                            step["outputs"].append(buildIOFromMapping(arg, mappedArg, mappingIndex, 'output'))
            step['outputs'] = mergeIOForStep(step['outputs'], 'output')
            step['inputs']  = mergeIOForStep( step['inputs'], 'input' )
            resultSteps.append(step)

        return resultSteps


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
    embedded = ['workflow.*',
                #'analysis_steps.*',
                #'analysis_steps.software_used.*',
                #'analysis_steps.outputs.*',
                #'analysis_steps.inputs.*',
                #'analysis_steps.outputs.run_data.*',
                #'analysis_steps.inputs.run_data.*',
                #'analysis_steps.outputs.run_data.file.*',
                #'analysis_steps.inputs.run_data.file.*',
                'input_files.workflow_argument_name',
                'input_files.value.filename',
                'input_files.value.display_title',
                'input_files.value.file_format',
                'input_files.value.uuid',
                'input_files.value.accession',
                'output_files.workflow_argument_name',
                'output_files.*',
                'output_files.value.file_format',
                'output_files.value.uuid',
                'output_files.value.accession',
                'output_quality_metrics.name',
                'output_quality_metrics.value.uuid',
                #'output_quality_metrics.value'
                ]

    @calculated_property(schema=workflow_analysis_steps_schema,
                        category='page')
    def analysis_steps(self, request):
        '''
        Extends the 'inputs' & 'outputs' (lists of dicts) properties of calculated property 'analysis_steps' (list of dicts) from
        WorkflowRun's related Workflow with additional property 'run_data', which contains references to Files, Parameters, and Reports
        generated by this specific Workflow Run.

        :returns: List of analysis_steps items, extended with 'inputs' and 'outputs'.
        '''
        workflow = self.properties.get('workflow')
        if workflow is None:
            return []

        workflow = self.collection.get(workflow)
        analysis_steps = workflow.analysis_steps(request)

        if not analysis_steps or len(analysis_steps) == 0:
            return []

        # fileCache = {} # Unnecessary unless we'll convert file @id into plain embedded dictionary, in which case we use this to avoid re-requests for same file UUID.

        def handleSourceTargetFile(stepOutput, stepOutputTarget, runParams):
            '''
            Add file metadata in form of 'run_data' : { 'file' : { '@id', 'display_title', etc. } } to AnalysisStep dict's 'input' or 'output' list item dict
            if one of own input or output files' workflow_argument_name matches the AnalysisStep dict's input or output's sourceOrTarget.workflow_argument_name.

            :param stepOutput: Reference to an 'input' or 'output' dict passed in from a Workflow-derived analysis_step.
            :param stepTarget: Reference to an 'source' or 'target' array item belonging to the 'input' or 'output' above.
            :param runParams: List Step inputs or outputs, such as 'input_files', 'output_files', 'quality_metric', or 'parameters'.
            :returns: True if found and added run_data property to analysis_step.input or analysis_step.output (param inputOrOutput).
            '''
            if 'Workflow' in stepOutputTarget.get('type', 'Workflow'):

                # Gather params (e.g. files) with same workflow_argument_name.
                # Assume these have been combined correctly unless have differing ordinal number.
                paramsForTarget = []
                
                for param in runParams:
                    if (stepOutputTarget['name'] == param.get('workflow_argument_name')) and param.get('value') is not None:
                        paramsForTarget.append(param)

                if len(paramsForTarget) > 0:

                    # Ensure sort by ordinal.
                    paramsForTarget = sorted( paramsForTarget, key=lambda p: p.get('ordinal', 1) )

                    stepOutput['run_data'] = {
                        "file" : [ p['value'] for p in paramsForTarget ], #[ '/files/' + p['value'] + '/' for p in paramsForTarget ], # List of file @ids.
                        "type" : paramsForTarget[0].get('type'),
                        "meta" : [ # Aligned-to-file-list list of file metadata
                            {   # All remaining properties from dict in (e.g.) 'input_files','output_files',etc. list.
                                k:v for (k,v) in param.items()
                                if k not in [ 'value', 'type', 'workflow_argument_name' ]
                            } for p in paramsForTarget
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


        # Metrics will overwrite output_files in case of duplicate keys.
        combined_outputs = mergeArgumentsWithSameArgumentName(
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
                found = False
                for outputTarget in output.get('target',[]):
                    found = handleSourceTargetFile(output, outputTarget, combined_outputs)
                    if found:
                        break
                if not found:
                    found = handleSourceTargetFile(output, output, combined_outputs)

            for input in step['inputs']:
                found = False
                for inputSource in input.get('source',[]):
                    found = handleSourceTargetFile(input, inputSource, input_files)

                    # If we don't have an input file yet for this workflow input, see if have a 'parameter' for it.
                    if not found and 'Workflow' in inputSource.get('type',''):
                        for param in input_params:
                            if inputSource['name'] == param.get('workflow_argument_name'):
                                input['run_data'] = {
                                    "value" : param.get('value'),
                                    "type"  : "parameter"
                                }
                                found = True
                                break
                    if found:
                        break

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
    embedded = WorkflowRun.embedded


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
    embedded = WorkflowRun.embedded


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
    embedded = []
