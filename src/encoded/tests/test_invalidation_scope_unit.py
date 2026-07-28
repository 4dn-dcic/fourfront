"""Credential-free contract coverage for Fourfront invalidation scopes."""

from snovault.elasticsearch.indexer_utils import compute_invalidation_scope


def test_workflow_nested_software_is_in_workflow_run_invalidation_scope(testapp):
    request = type('Request', (), {
        'registry': testapp.app.registry,
        'json': {
            'source_type': 'Workflow',
            'target_type': 'WorkflowRunAwsem',
        },
    })()

    scope = compute_invalidation_scope(None, request)

    assert sorted(scope['Invalidated']) == sorted([
        'status',
        'uuid',
        'title',
        'name',
        'experiment_types',
        'category',
        'app_name',
        'steps.name',
        'steps.meta.software_used',
    ])


def test_workflow_run_nested_files_are_in_file_invalidation_scope(testapp):
    request = type('Request', (), {
        'registry': testapp.app.registry,
        'json': {
            'source_type': 'WorkflowRunAwsem',
            'target_type': 'FileProcessed',
        },
    })()

    scope = compute_invalidation_scope(None, request)

    assert sorted(scope['Invalidated']) == sorted([
        'status',
        'uuid',
        'input_files.value',
        'input_files.workflow_argument_name',
        'output_files.value',
        'output_files.value_qc',
        'output_files.workflow_argument_name',
        'title',
        'workflow',
    ])
