import pytest
from ..loadxl import ORDER


targets = [
    {'name': 'one', 'uuid': '775795d3-4410-4114-836b-8eeecf1d0c2f'},
    {'name': 'two', 'uuid': 'd6784f5e-48a1-4b40-9b11-c8aefb6e1377'},
]

sources = [
    {
        'name': 'A',
        'target': '775795d3-4410-4114-836b-8eeecf1d0c2f',
        'uuid': '16157204-8c8f-4672-a1a4-14f4b8021fcd',
        'status': 'current',
    },
    {
        'name': 'B',
        'target': 'd6784f5e-48a1-4b40-9b11-c8aefb6e1377',
        'uuid': '1e152917-c5fd-4aec-b74f-b0533d0cc55c',
        'status': 'deleted',
    },
]


@pytest.fixture
def content(testapp):
    url = '/testing-link-targets/'
    for item in targets:
        testapp.post_json(url, item, status=201)

    url = '/testing-link-sources/'
    for item in sources:
        testapp.post_json(url, item, status=201)


def test_embedded_uuids_object(content, dummy_request, threadlocals):
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@object')
    assert dummy_request._embedded_uuids == {sources[0]['uuid']}


def test_linked_uuids_object(content, dummy_request, threadlocals):
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@object')
    assert dummy_request._linked_uuids == {sources[0]['uuid'], targets[0]['uuid']}


def test_embedded_uuids_expand_target(content, dummy_request, threadlocals):
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@expand?expand=target')
    assert dummy_request._embedded_uuids == {sources[0]['uuid'], targets[0]['uuid']}


def test_updated_source(content, testapp):
    url = '/testing-link-sources/' + sources[0]['uuid']
    res = testapp.patch_json(url, {})
    assert set(res.headers['X-Updated'].split(',')) == {sources[0]['uuid']}


def test_updated_source_changed(content, testapp):
    url = '/testing-link-sources/' + sources[0]['uuid']
    res = testapp.patch_json(url, {'target': targets[1]['uuid']})
    assert set(res.headers['X-Updated'].split(',')) == {sources[0]['uuid'], targets[1]['uuid']}


def test_updated_target(content, testapp):
    url = '/testing-link-targets/' + targets[0]['uuid']
    res = testapp.patch_json(url, {})
    assert set(res.headers['X-Updated'].split(',')) == {targets[0]['uuid']}


def test_embedded_uuids_experiment(experiment, replicate, library, biosample, organism, dummy_request, threadlocals):
    dummy_request.embed(experiment['@id'], '@@embedded')
    embedded_uuids = dummy_request._embedded_uuids
    assert experiment['uuid'] in embedded_uuids
    assert replicate['uuid'] in embedded_uuids
    assert library['uuid'] in embedded_uuids
    assert biosample['uuid'] in embedded_uuids
    assert organism['uuid'] in embedded_uuids


@pytest.mark.parametrize('item_type', ORDER)
def test_add_default_embeds(registry, item_type):
    """
    Ensure default embedding matches the schema for each object
    """
    from snovault.fourfront_utils import add_default_embeds, confirm_embed_with_schemas
    from snovault import TYPES
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = add_default_embeds(item_type, registry[TYPES], type_info.embedded, schema)
    for embed in embeds:
        split_embed = embed.strip().split('.')
        is_valid, error, terminal_linkTo = confirm_embed_with_schemas(item_type, registry[TYPES], split_embed, schema['properties'])
        assert is_valid or error == None


@pytest.mark.parametrize('item_type', ORDER)
def test_manual_embeds(registry, item_type):
    """
    Ensure manual embedding in the types files are valid
    """
    from snovault.fourfront_utils import confirm_embed_with_schemas
    from snovault import TYPES
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = type_info.embedded
    for embed in embeds:
        split_embed = embed.strip().split('.')
        is_valid, error, terminal_linkTo = confirm_embed_with_schemas(item_type, registry[TYPES], split_embed, schema['properties'])
        assert is_valid or error == None
