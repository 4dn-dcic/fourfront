import pytest

from snovault import COLLECTIONS
from unittest.mock import patch, MagicMock
from ..commands.create_mapping_on_deploy import ITEM_INDEX_ORDER, get_deployment_config
# Experimentally commenting out this strange import. -kmp 27-Mar-2020
# # TODO: We should not be importing *. Even stranger, PyCharm says we don't use anything from there. -kmp 14-Feb-2020
# from ..types.experiment import *
from .datafixtures import ORDER


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


@patch('dcicutils.beanstalk_utils.whodaman', MagicMock(return_value='fourfront-webprod2'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-webprod'))
def test_get_deployment_config_staging():
    """ Tests get_deployment_config in the staging case """
    cfg = get_deployment_config(None)
    assert cfg['ENV_NAME'] == 'fourfront-webprod'  # sanity
    assert cfg['WIPE_ES'] is False  # no wipe


@patch('dcicutils.beanstalk_utils.whodaman', MagicMock(return_value='fourfront-webprod'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-mastertest'))
def test_get_deployment_config_mastertest():
    """ Tests get_deployment_config in the mastertest case """
    cfg = get_deployment_config(None)
    assert cfg['ENV_NAME'] == 'fourfront-mastertest'  # sanity
    assert cfg['WIPE_ES'] is True  # wipe


@patch('dcicutils.beanstalk_utils.whodaman', MagicMock(return_value='fourfront-webprod2'))
@patch('encoded.commands.create_mapping_on_deploy.get_my_env', MagicMock(return_value='fourfront-hotseat'))
def test_get_deployment_config_hotseat():
    """ Tests get_deployment_config in the hotseat case """
    cfg = get_deployment_config(None)
    assert cfg['ENV_NAME'] == 'fourfront-hotseat'  # sanity
    assert cfg['WIPE_ES'] is False  # no wipe
