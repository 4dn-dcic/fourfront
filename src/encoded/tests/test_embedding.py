import pytest

from snovault import TYPES
from snovault.util import add_default_embeds, crawl_schemas_by_embeds
from ..types.base import get_item_or_none
from .datafixtures import ORDER


pytestmark = [pytest.mark.setone, pytest.mark.working]


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


def test_linked_uuids_object(content, dummy_request, threadlocals):
    # needed to track _linked_uuids
    dummy_request._indexing_view = True
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@object')
    # only object visited here is the source itself, hence one _linked_uuid
    assert dummy_request._linked_uuids == {('16157204-8c8f-4672-a1a4-14f4b8021fcd', 'TestingLinkSource')}


def test_linked_uuids_embedded(content, dummy_request, threadlocals):
    # needed to track _linked_uuids
    dummy_request._indexing_view = True
    dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@embedded')
    assert dummy_request._linked_uuids == {
        ('16157204-8c8f-4672-a1a4-14f4b8021fcd', 'TestingLinkSource'),
        ('775795d3-4410-4114-836b-8eeecf1d0c2f', 'TestingLinkTarget')
    }


def test_target_rev_linked_uuids_indexing_view(content, dummy_request, threadlocals):
    res_target = dummy_request.embed('/testing-link-targets/', targets[0]['uuid'], '@@index-data', as_user='INDEXER')
    # should have the itself and the rev link to source in the _linked_uuids
    assert dummy_request._linked_uuids == {
        ('16157204-8c8f-4672-a1a4-14f4b8021fcd', 'TestingLinkSource'),
        ('775795d3-4410-4114-836b-8eeecf1d0c2f', 'TestingLinkTarget')
    }
    assert res_target['rev_link_names'] == {'reverse': [sources[0]['uuid']]}
    assert res_target['rev_linked_to_me'] == []


def test_source_rev_linked_uuids_indexing_view(content, dummy_request, threadlocals):
    res_target = dummy_request.embed('/testing-link-sources/', sources[0]['uuid'], '@@index-data', as_user='INDEXER')
    # should have the itself and the rev link to source in the _linked_uuids
    assert dummy_request._linked_uuids == {
        ('16157204-8c8f-4672-a1a4-14f4b8021fcd', 'TestingLinkSource'),
        ('775795d3-4410-4114-836b-8eeecf1d0c2f', 'TestingLinkTarget')
    }
    assert res_target['rev_link_names'] == {}
    assert res_target['rev_linked_to_me'] == ['775795d3-4410-4114-836b-8eeecf1d0c2f']


def test_linked_uuids_experiment(experiment, lab, award, human_biosample, human_biosource, mboI, dummy_request, threadlocals):
    to_embed = ['lab.uuid', 'award.uuid', 'biosample.biosource.uuid', 'digestion_enzyme.uuid']
    dummy_request._indexing_view = True
    dummy_request.embed(experiment['@id'], '@@embedded', fields_to_embed=to_embed)
    linked_uuids = dummy_request._linked_uuids
    # starting item is not in linked_uuids
    assert (experiment['uuid'], experiment['@type'][0]) in linked_uuids
    assert (lab['uuid'], lab['@type'][0]) in linked_uuids
    assert (award['uuid'], award['@type'][0]) in linked_uuids
    # biosample is added because of biosample.biosource
    assert (human_biosample['uuid'], human_biosample['@type'][0]) in linked_uuids
    assert (human_biosource['uuid'], human_biosource['@type'][0]) in linked_uuids
    assert (mboI['uuid'], mboI['@type'][0]) in linked_uuids


@pytest.mark.parametrize('item_type', ORDER)
def test_add_default_embeds(registry, item_type):
    """
    Ensure default embedding matches the schema for each object
    """
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
    type_info = registry[TYPES].by_item_type['biosample']
    schema = type_info.schema
    embed = 'biosource.individual.organism.name'
    split_embed = embed.strip().split('.')
    error, added_embeds = crawl_schemas_by_embeds('biosample', registry[TYPES], split_embed, schema['properties'])
    assert 'biosource' in added_embeds
    assert 'biosource.individual' in added_embeds
    assert 'biosource.individual.organism' in added_embeds
    assert error is None


def test_get_item_or_none(content, dummy_request, threadlocals):
    """
    Not necessarily the best place for this test, but test that the
    `get_item_or_none` function works with multiple inputs
    """
    used_item = sources[0]
    # all of these should get the full item
    res1 = get_item_or_none(dummy_request, used_item)
    res2 = get_item_or_none(dummy_request, {'uuid': used_item['uuid']})
    res3 = get_item_or_none(dummy_request, used_item['uuid'])
    res4 = get_item_or_none(dummy_request, used_item['uuid'], '/testing-link-sources/')
    for res in [res1, res2, res3, res4]:
        assert res['uuid'] == used_item['uuid']
        assert res['name'] == used_item['name']
        assert '@id' in res
        assert '@type' in res
