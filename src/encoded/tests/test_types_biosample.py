import pytest
from snovault.schema_utils import load_schema
pytestmark = [pytest.mark.working, pytest.mark.schema]


def biosample_relation(derived_from):
    return {"biosample_relation": [{"relationship_type": "derived from",
            "biosample": derived_from['@id']}]}


# data from test/datafixtures
def test_update_biosample_relation(testapp, human_biosample, biosample_1):
    patch_res = testapp.patch_json(human_biosample['@id'], biosample_relation(biosample_1))
    res = testapp.get(biosample_1['@id'])
    expected_relation = [{'biosample': human_biosample['@id'], 'relationship_type': 'parent of'}]
    assert res.json['biosample_relation'] == expected_relation


def test_biosample_calculated_properties(testapp, biosample_1):
    """
    Test to ensure the calculated properties are in result returned from testapp
    """
    res = testapp.get(biosample_1['@id']).json
    assert 'modifications_summary' in res
    assert 'modifications_summary_short' in res
    assert 'treatments_summary' in res
    assert 'biosource_summary' in res


def test_update_biosample_relation_in_reverse(testapp, human_biosample, biosample_1):
    pass
    #import pdb; pdb.set_trace()
