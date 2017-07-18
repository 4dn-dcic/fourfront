"""The type file for the workflow related items.
"""
from itertools import chain
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)



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
                            "title" : "Input Name",
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
            resultStepProperties = ['uuid', 'inputs', 'outputs', 'name', 'software_used', '@id', 'title', 'display_title', 'description', 'analysis_step_types', 'status'] # props to leave in
            step = self.collection.get(str(uuid))
            stepDict = {}
            stepDict.update(step.properties)
            stepKeys = list(stepDict.keys())
            for key in stepKeys:
                if key not in resultStepProperties:
                    del stepDict[key]
            stepDict['uuid'] = str(step.uuid)

            # Use 'step_name' as provided in Workflow's 'workflow_steps', to override AnalysisStep 'name', in case step is renamed in Workflow.
            # Is unlikely, but possible, to differ from AnalysisStep own name.
            stepDict['name'] = stepContainer.get('step_name', stepDict.get('name'))
            if stepDict.get('software_used') is not None:
                stepDict['software_used'] = '/software/' + stepDict['software_used'] + '/' # Convert to '@id' form so is picked up for embedding.
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
            if 'Workflow' in stepOutputTarget.get('type', ''):

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
