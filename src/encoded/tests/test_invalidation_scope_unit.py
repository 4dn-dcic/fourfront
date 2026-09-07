"""Credential-free contract coverage for Fourfront invalidation scopes."""

from types import SimpleNamespace

import pytest
from pyramid.config import Configurator
from snovault.elasticsearch.indexer_utils import compute_invalidation_scope

from . import test_indexing as indexing_tests


@pytest.fixture
def autouse_external_tx():
    """Override the parent conftest's database transaction for this unit module."""


@pytest.fixture(scope='module')
def schema_registry():
    """Build only the type metadata needed by invalidation-scope calculation."""
    config = Configurator(settings={'testing': True})
    config.include('snovault.calculated')
    config.include('snovault.typeinfo')
    config.include('snovault.config')
    config.include('snovault.predicates')
    config.include('snovault.validation')
    config.include('snovault.resources')
    config.include('snovault.types')
    config.commit()
    config.scan('encoded.types')
    config.commit()
    return config.registry


def _all_invalidation_scope_cases():
    parametrization = next(
        marker
        for marker in (
            indexing_tests.TestInvalidationScopeViewFourfront
            .test_invalidation_scope_view_parametrized
            .pytestmark
        )
        if marker.name == 'parametrize'
    )
    return parametrization.args[1]


def _compute_scope(registry, source_type, target_type):
    request = SimpleNamespace(
        registry=registry,
        json={
            'source_type': source_type,
            'target_type': target_type,
        },
    )
    return compute_invalidation_scope(None, request)


def test_workflow_nested_software_is_in_workflow_run_invalidation_scope(schema_registry):
    scope = _compute_scope(
        schema_registry,
        source_type='Workflow',
        target_type='WorkflowRunAwsem',
    )

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


def test_workflow_run_nested_files_are_in_file_invalidation_scope(schema_registry):
    scope = _compute_scope(
        schema_registry,
        source_type='WorkflowRunAwsem',
        target_type='FileProcessed',
    )

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


def test_all_invalidation_scope_contracts_without_elasticsearch(schema_registry):
    mismatches = {}
    for source_type, target_type, expected in _all_invalidation_scope_cases():
        actual = _compute_scope(
            schema_registry,
            source_type,
            target_type,
        )['Invalidated']
        if sorted(actual) != sorted(expected):
            mismatches[(source_type, target_type)] = {
                'missing_from_contract': sorted(set(actual) - set(expected)),
                'unexpected_in_contract': sorted(set(expected) - set(actual)),
            }

    assert not mismatches
