import pytest
from snovault.schema_utils import load_schema
pytestmark = pytest.mark.working

def biosample_relation(derived_from):
    return {"biosample_relation":
            [{"relationship_type":"derived from",
              "biosample":derived_from['@id']
             }]
           }


# data from test/datafixtures
def test_update_biosample_relation(testapp, human_biosample, biosample_1):
    patch_res = testapp.patch_json(human_biosample['@id'], biosample_relation(biosample_1))
    res = testapp.get(biosample_1['@id'])
    expected_relation = [{'biosample': human_biosample['@id'], 'relationship_type': 'parent of'}]
    assert res.json['biosample_relation'] == expected_relation

def test_update_biosample_relation_in_reverse(testapp, human_biosample, biosample_1):
    pass
    #import pdb; pdb.set_trace()
