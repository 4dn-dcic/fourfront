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
                'workflow_steps.step_name']


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
