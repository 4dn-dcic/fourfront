import pytest
from ..loadxl import ORDER

pytestmark = pytest.mark.working

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
    # needed to track _embedded_uuids
    dummy_request._indexing_view = True
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@object')
    assert dummy_request._embedded_uuids == {'16157204-8c8f-4672-a1a4-14f4b8021fcd'}


def test_embedded_uuids_embedded(content, dummy_request, threadlocals):
    # needed to track _embedded_uuids
    dummy_request._indexing_view = True
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@embedded')
    assert dummy_request._embedded_uuids == {'16157204-8c8f-4672-a1a4-14f4b8021fcd', '775795d3-4410-4114-836b-8eeecf1d0c2f'}


def test_embedded_uuids_experiment(experiment, lab, award, human_biosample, human_biosource, mboI, dummy_request, threadlocals):
    to_embed = ['lab.uuid', 'award.uuid', 'biosample.biosource.uuid', 'digestion_enzyme.uuid']
    dummy_request._indexing_view = True
    dummy_request.embed(experiment['@id'], '@@embedded', fields_to_embed=to_embed)
    embedded_uuids = dummy_request._embedded_uuids
    # starting item is not in embedded_uuids
    assert experiment['uuid'] in embedded_uuids
    assert lab['uuid'] in embedded_uuids
    assert award['uuid'] in embedded_uuids
    # biosample is added because of biosample.biosource
    assert human_biosample['uuid'] in embedded_uuids
    assert human_biosource['uuid'] in embedded_uuids
    assert mboI['uuid'] in embedded_uuids


@pytest.mark.parametrize('item_type', ORDER)
def test_add_default_embeds(registry, item_type):
    """
    Ensure default embedding matches the schema for each object
    """
    from snovault.fourfront_utils import add_default_embeds, crawl_schemas_by_embeds
    from snovault import TYPES
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = add_default_embeds(item_type, registry[TYPES], type_info.embedded_list, schema)
    principals_allowed_included_in_default_embeds = False
    for embed in embeds:
        split_embed = embed.strip().split('.')
        if 'principals_allowed' in split_embed:
            principals_allowed_included_in_default_embeds = True
        error, added_embeds = crawl_schemas_by_embeds(item_type, registry[TYPES], split_embed, schema['properties'])
        assert error is None

    assert principals_allowed_included_in_default_embeds


@pytest.mark.parametrize('item_type', ORDER)
def test_manual_embeds(registry, item_type):
    """
    Ensure manual embedding in the types files are valid
    """
    from snovault.fourfront_utils import crawl_schemas_by_embeds
    from snovault import TYPES
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = type_info.embedded_list
    for embed in embeds:
        split_embed = embed.strip().split('.')
        error, added_embeds = crawl_schemas_by_embeds(item_type, registry[TYPES], split_embed, schema['properties'])
        assert error is None


def test_fictitous_embed(registry):
    """
    Made up embedding for biosample, which is useful to check that default
    embedding will occur for every item in a embed path
    For example, if embedded_list contains biosource.individual.organism.name,
    the organism subpath should be in the added_embeds even though it is
    not a terminal object
    """
    from snovault.fourfront_utils import crawl_schemas_by_embeds
    from snovault import TYPES
    type_info = registry[TYPES].by_item_type['biosample']
    schema = type_info.schema
    embed = 'biosource.individual.organism.name'
    split_embed = embed.strip().split('.')
    error, added_embeds = crawl_schemas_by_embeds('biosample', registry[TYPES], split_embed, schema['properties'])
    assert 'biosource' in added_embeds
    assert 'biosource.individual' in added_embeds
    assert 'biosource.individual.organism' in added_embeds
    assert error is None
