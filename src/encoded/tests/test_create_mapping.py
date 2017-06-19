import pytest
from ..loadxl import ORDER
from encoded.types.experiment import *
pytestmark = pytest.mark.working


@pytest.mark.parametrize('item_type', ORDER)
def test_create_mapping(registry, item_type):
    from snovault.elasticsearch.create_mapping import type_mapping
    from snovault.fourfront_utils import add_default_embeds
    from snovault import TYPES
    mapping = type_mapping(registry[TYPES], item_type)
    assert mapping
    type_info = registry[TYPES].by_item_type[item_type]
    schema = type_info.schema
    embeds = add_default_embeds(type_info.embedded, schema)
    # assert that all embeds exist in mapping for the given type
    for embed in embeds:
        mapping_pointer = mapping
        split_embed = embed.split('.')
        for idx in range(len(split_embed)):
            split_ = split_embed[idx]
            # see if this is last level of embedding- may be a field or object
            if idx == len(split_embed) - 1:
                if 'properties' in mapping_pointer and split_ in mapping_pointer['properties']:
                    final_mapping = mapping_pointer['properties']
                else:
                    final_mapping = mapping_pointer
                assert split_ in final_mapping
                assert 'type' in final_mapping[split_]
            else:
                assert split_ in mapping_pointer['properties']
                mapping_pointer = mapping_pointer['properties'][split_]
