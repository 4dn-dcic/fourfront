"""The type file for the workflow related items.
"""
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


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
    embedded = ['workflow_steps.step',
                'workflow_steps.step_name',
                'arguments',
                'arguments.argument_mapping']


    @calculated_property(schema={
        "title": "CWL Data",
        "type": "object",
        "description" : "Data of cwl_pointer"
    }, category='page')
    def cwl_data(self, request):
        """smth."""
        if not request.has_permission('view_details'):
            return

        if self.properties.get('cwl_pointer') is None:
            return

        import requests

        r = requests.get(self.properties['cwl_pointer'])

        try:
            return r.json()
        except Exception as e:
            print('\n\n\n\n\n')
            print('Error parsing CWL data')
            return

    @calculated_property(schema={
        "title": "Workflow Analysis Steps",
        "type": "array",
        "items": {
            "title": "Analysis Step",
            "type": "string",
            "linkTo": "AnalysisStep"
        }
    }, category='page')
    def analysis_steps(self, request):
        """smth."""
        if not request.has_permission('view_details'):
            return

        if self.properties.get('arguments') is None:
            return

        steps = []

        # Find all unique steps in arguments, order of occurrence.
        for arg in self.properties['arguments']:
            mapping = arg.get('argument_mapping')
            if mapping is None:
                continue
            for mappedArg in mapping:
                step = mappedArg.get('workflow_step')
                if step is not None:
                    steps.append(step)

        steps = list(map(
            lambda uuid: request.embed('/analysis_step/' + uuid), # 2) Embed
            list(set(steps)) # 1) Unique-ify list of steps found
        ))

        # Distribute arguments into steps' "inputs" and "outputs" arrays.
        for step in steps:
            step['inputs'] = []
            step['outputs'] = []
            for arg in self.properties['arguments']:
                mapping = arg.get('argument_mapping')
                if mapping is None:
                    continue
                for mappingIndex, mappedArg in enumerate(mapping):

                    if mappedArg.get('workflow_step') == step['uuid']:

                        if mappedArg.get('step_argument_type') == 'Input file' or mappedArg.get('step_argument_type') == 'parameter':
                            inputNode = {
                                "name" : mappedArg.get('step_argument_name'),
                                "source" : []
                            }
                            if arg.get("workflow_argument_name") is not None:
                                source = {}
                                source["name"] = arg["workflow_argument_name"]
                                if mappedArg['step_argument_type'] == 'parameter':
                                    source["type"] = "Workflow Parameter"
                                else:
                                    source["type"] = "Workflow Input File"
                                inputNode["source"].append(source)
                            if len(mapping) > 1:
                                otherIndex = 0
                                if mappingIndex == 0:
                                    otherIndex = 1
                                source = {}
                                source["name"] = mapping[otherIndex]["step_argument_name"]
                                source["step"] = mapping[otherIndex]["workflow_step"]
                                source["type"] = mapping[otherIndex].get("step_argument_type")
                                inputNode["source"].append(source)

                            step["inputs"].append(inputNode)

                        elif mappedArg.get('step_argument_type') == 'Output file':

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
                                
                                target = {}
                                target["name"] = mapping[otherIndex]["step_argument_name"]
                                target["step"] = mapping[otherIndex]["workflow_step"]
                                target["type"] = mapping[otherIndex].get("step_argument_type")
                                outputNode["target"].append(target)

                            step["outputs"].append(outputNode)


        return steps


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
    embedded = ['workflow',
                'input_files.workflow_argument_name',
                'input_files.value',
                'input_files.value.file_format',
                'output_files.workflow_argument_name',
                'output_files.value',
                'output_files.value.file_format',
                'output_quality_metrics.name',
                'output_quality_metrics.value']


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
