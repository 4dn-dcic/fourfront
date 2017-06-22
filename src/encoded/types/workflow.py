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
                                    "linkTo" : "File"
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
                                    "linkTo" : "File"
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
    embedded = ['analysis_steps',
                'analysis_steps.*',
                'analysis_steps.software_used.*',
                'arguments.*',
                'arguments.argument_mapping']
    rev = {
        'workflow_runs': ('WorkflowRun', 'workflow'),
    }

    @calculated_property(schema={
        "title": "Workflow Runs",
        "description": "All runs of this workflow definition.",
        "type": "array",
        "items": {
            "title": "Workflow Run",
            "type": ["string", "object"],
            "linkTo": "WorkflowRun"
        }
    })
    def workflow_runs(self, request):
        return self.rev_link_atids(request, "workflow_runs")


    @calculated_property(schema=workflow_analysis_steps_schema)
    def analysis_steps(self, request):
        """smth."""

        if self.properties.get('arguments') is None:
            return []

        if self.properties.get('workflow_steps') is None:
            return []


        def buildStepDict(uuid):
            resultStepProperties = ['uuid', 'inputs', 'outputs', 'name', 'software_used', '@id', 'title', 'display_title', 'description', 'analysis_step_types', 'status'] # props to leave in
            step = self.collection.get(str(uuid))
            stepDict = {}
            stepDict.update(step.properties)
            stepKeys = list(stepDict.keys())
            for key in stepKeys:
                if key not in resultStepProperties:
                    del stepDict[key]
            stepDict['uuid'] = str(step.uuid)
            if stepDict.get('software_used') is not None:
                stepDict['software_used'] = '/software/' + stepDict['software_used'] + '/'
            return stepDict

        def mergeOutputsForStep(args):
            seen_argument_names = {}
            resultArgs = []
            for arg in args:

                argName = arg.get('name')
                if argName:
                    priorArgument = seen_argument_names.get(argName)
                    if priorArgument and len(arg['target']) > 0:
                        for currentTarget in arg['target']:
                            foundExisting = False
                            for existingTarget in priorArgument['target']:
                                if (
                                    existingTarget['name'] == currentTarget['name']
                                    and existingTarget.get('step','a') == currentTarget.get('step','b')
                                ):
                                    existingTarget.update(currentTarget)
                                    foundExisting = True
                            if not foundExisting:
                                priorArgument['target'].append(currentTarget)
                    else:
                        resultArgs.append(arg)
                        seen_argument_names[argName] = arg
            return resultArgs


        steps = [ step['step'] for step in self.properties['workflow_steps'] ]
        
        if steps is None or len(steps) == 0:
           titleToUse = self.properties.get('name', self.properties.get('title', "Process"))
           return [
               {
                   "uuid" : self.uuid,
                   "@id" : self.jsonld_id(request),
                   "name" : titleToUse,
                   "title" : titleToUse,
                   "analysis_step_types" : ["Workflow Process"],
                   "inputs" : [
                       {
                           "name" : arg.get('workflow_argument_name'),
                           "source" : [
                               {
                                   "name" : arg.get('workflow_argument_name'),
                                   "type" : "Workflow Input File"
                               }
                           ]
                       } for arg in self.properties['arguments'] if 'input' in str(arg.get('argument_type')).lower()
                   ],
                   "outputs" : [
                       {
                           "name" : arg.get('workflow_argument_name'),
                           "target" : [
                               {
                                  "name" : arg.get('workflow_argument_name'),
                                   "type" : "Workflow Output File"
                              }
                           ]
                       } for arg in self.properties['arguments'] if 'output' in str(arg.get('argument_type')).lower()
                  ]
              }
           ]

        steps = map(buildStepDict, steps)

        #steps = map( lambda uuid: request.embed('/' + str(uuid), '@@embedded'), steps)

        resultSteps = []

        # Distribute arguments into steps' "inputs" and "outputs" arrays.
        for step in steps:
            step['inputs'] = []
            step['outputs'] = []

            for arg in self.properties['arguments']:
                mapping = arg.get('argument_mapping')
                if mapping is None:
                    continue
                for mappingIndex, mappedArg in enumerate(mapping):
                    if mappedArg.get('workflow_step') == step['name']:
                        step_argument_name = mappedArg.get('step_argument_type','').lower()
                        if (step_argument_name == 'input file' or
                            step_argument_name == 'input file or parameter' or
                            step_argument_name == 'parameter' ):

                            inputNode = {
                                "name" : mappedArg.get('step_argument_name'),
                                "source" : []
                            }

                            doesOutputMappingExist = len([
                                mp for mp in mapping if (
                                    mp.get('step_argument_type').lower() == 'output file' or
                                    mp.get('step_argument_type').lower() == 'output file or parameter'
                                )
                            ]) > 0

                            if arg.get("workflow_argument_name") is not None and not doesOutputMappingExist:
                                source = { "name" : arg["workflow_argument_name"] }
                                if mappedArg['step_argument_type'] == 'parameter':
                                    source["type"] = "Workflow Parameter"
                                else:
                                    source["type"] = "Workflow Input File"
                                inputNode["source"].append(source)
                            if len(mapping) > 1:
                                otherIndex = 0
                                if mappingIndex == 0:
                                    otherIndex = 1
                                inputNode["source"].append({
                                    "name" : mapping[otherIndex]["step_argument_name"],
                                    "step" : mapping[otherIndex]["workflow_step"],
                                    "type" : mapping[otherIndex].get("step_argument_type")
                                })

                            step["inputs"].append(inputNode)

                        elif (step_argument_name == 'output file' or
                            step_argument_name == 'output file or parameter' ):

                            outputNode = {
                                "name" : mappedArg.get("step_argument_name"),
                                "target" : []
                            }

                            if arg.get("workflow_argument_name") is not None:
                                target = {}
                                target["name"] = arg["workflow_argument_name"]
                                if mappedArg['step_argument_type'] == 'parameter': # shouldn't happen, but just in case
                                    target["type"] = "Workflow Output Parameter"
                                else:
                                    target["type"] = "Workflow Output File"
                                outputNode["target"].append(target)
                            if len(mapping) > 1:
                                otherIndex = 0
                                if mappingIndex == 0:
                                    otherIndex = 1
                                outputNode["target"].append({
                                    "name" : mapping[otherIndex]["step_argument_name"],
                                    "step" : mapping[otherIndex]["workflow_step"],
                                    "type" : mapping[otherIndex].get("step_argument_type")
                                })

                            step["outputs"].append(outputNode)


            step['outputs'] = mergeOutputsForStep(step['outputs'])
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
                'analysis_steps.*',
                'analysis_steps.software_used.*',
                'analysis_steps.outputs.*',
                'analysis_steps.inputs.*',
                'analysis_steps.outputs.run_data.file.*',
                'analysis_steps.inputs.run_data.file.*',
                'input_files.workflow_argument_name',
                'input_files.value.filename',
                'input_files.value.display_title',
                'input_files.value.*',
                'input_files.value.file_format',
                'output_files.workflow_argument_name',
                'output_files.value.*',
                'output_files.value.file_format',
                'output_quality_metrics.name',
                #'output_quality_metrics.value'
                ]

    @calculated_property(schema=workflow_analysis_steps_schema)
    def analysis_steps(self, request):

        workflow = self.properties.get('workflow')
        if workflow is None:
            return []

        workflow = self.collection.get(workflow)
        analysis_steps = workflow.analysis_steps(request)

        if not analysis_steps or len(analysis_steps) == 0:
            return []

        fileCache = {}

        def handleSourceTargetFile(inputOrOutput, sourceOrTarget, runParams):
            '''
            Add file metadata in form of 'run_data' : { 'file' : { '@id', 'display_title', etc. } } to AnalysisStep dict's 'input' or 'output' list item dict
            if one of own input or output files' workflow_argument_name matches the AnalysisStep dict's input or output's sourceOrTarget.workflow_argument_name.
            '''
            if 'Workflow' in sourceOrTarget.get('type', ''):
                for param in runParams:
                    if sourceOrTarget['name'] == param.get('workflow_argument_name'):
                        fileUUID = param.get('value')
                        if fileUUID:
                            inputOrOutput['run_data'] = {
                                "file" : '/files/' + fileUUID + '/',
                                "type" : param.get('type')
                            }
                            return True
            return False


        def mergeArgumentsWithSameArgumentName(args):
            seen_argument_names = {}
            resultArgs = []
            for arg in args:
                argName = arg.get('workflow_argument_name')
                if argName:
                    priorArgument = seen_argument_names.get(argName)
                    if priorArgument:
                        priorArgument.update(arg)
                    else:
                        resultArgs.append(arg)
                        seen_argument_names[argName] = arg
            return resultArgs


        # Metrics will overwrite output_files in case of duplicate keys.
        combined_outputs = mergeArgumentsWithSameArgumentName(
            chain(
                map(
                    lambda x: dict(x, **{ "type" : "output" }),
                    self.properties.get('output_files',[])
                ),
                map(
                    lambda x: dict(x, **{ "type" : "quality_metric" }),
                    self.properties.get('output_quality_metrics',[])
                )
            )
        )

        input_files = mergeArgumentsWithSameArgumentName(
            map(
                lambda x: dict(x, **{ "type" : "input" }),
                self.properties.get('input_files',[])
            )
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
                    # If we don't have an input file yet for this workflow input, see if have a param
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
