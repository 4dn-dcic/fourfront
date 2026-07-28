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
