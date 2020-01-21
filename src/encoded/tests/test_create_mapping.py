import pytest
import mock
from .datafixtures import ORDER
from snovault import COLLECTIONS
from encoded.types.experiment import *
from encoded.commands.create_mapping_on_deploy import ITEM_INDEX_ORDER
from encoded.commands.create_mapping_on_deploy import get_deployment_config
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.mark.parametrize('item_type', ORDER)
def test_create_mapping(registry, item_type):
    """
    This test does not actually use elasticsearch
    Only tests the mappings generated from schemas
    """
    from snovault.elasticsearch.create_mapping import type_mapping
    from snovault.util import add_default_embeds
    from snovault import TYPES
    mapping = type_mapping(registry[TYPES], item_type)
    assert mapping
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = add_default_embeds(item_type, registry[TYPES], type_info.embedded_list, schema)
    # assert that all embeds exist in mapping for the given type
    for embed in embeds:
        mapping_pointer = mapping
        split_embed = embed.split('.')
        for idx, split_ in enumerate(split_embed):
            # see if this is last level of embedding- may be a field or object
            if idx == len(split_embed) - 1:
                if 'properties' in mapping_pointer and split_ in mapping_pointer['properties']:
                    final_mapping = mapping_pointer['properties']
                else:
                    final_mapping = mapping_pointer
                if split_ != '*':
                    assert split_ in final_mapping
                else:
                    assert 'properties' in final_mapping or final_mapping.get('type') == 'object'
            else:
                assert split_ in mapping_pointer['properties']
                mapping_pointer = mapping_pointer['properties'][split_]


def test_create_mapping_item_order(registry):
    # make sure every item type name is represented in the item ordering
    for i_type in registry[COLLECTIONS].by_item_type:
        # ignore "testing" types
        if i_type.startswith('testing_'):
            continue
        assert registry[COLLECTIONS][i_type].type_info.name in ITEM_INDEX_ORDER


@mock.patch('whodaman', new='fourfront-webprod')
@mock.patch('get_my_env', new='fourfront-webprod2')
def test_get_deployment_config_staging():
    """ Tests get_deployment_config in the staging case """
    cfg = get_deployment_config(None)
    assert cfg[0] == 'fourfront-webprod2'  # sanity
    assert cfg[1] is False  # no wipe 

@mock.patch('whodaman', new='fourfront-webprod2')
@mock.patch('get_my_env', new='fourfront-webprod')
def test_get_deployment_config_isomorphic_staging():
    """ Tests get_deployment_config in the isomorphic staging case """
    cfg = get_deployment_config(None)
    assert cfg[0] == 'fourfront-webprod'  # sanity
    assert cfg[1] is False  # no wipe 

@mock.patch('whodaman', new='fourfront-webprod')
@mock.patch('get_my_env', new='fourfront-mastertest')
def test_get_deployment_config_mastertest():
    """ Tests get_deployment_config in the mastertest case """
    cfg = get_deployment_config(None)
    assert cfg[0] == 'fourfront-mastertest'  # sanity
    assert cfg[1] is True  # wipe 

@mock.patch('whodaman', new='fourfront-webprod2')
@mock.patch('get_my_env', new='fourfront-hotseat')
def test_get_deployment_config_hotseat():
    """ Tests get_deployment_config in the hotseat case """
    cfg = get_deployment_config(None)
    assert cfg[0] == 'fourfront-hotseat'  # sanity
    assert cfg[1] is False  # no wipe 

