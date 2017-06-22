import pytest
from snovault.schema_utils import load_schema
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def biosample_1(testapp, human_biosource, lab, award):
    item = {
        'description': "GM12878 prepared for Hi-C",
        'biosource': [human_biosource['@id'], ],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


def biosample_relation(derived_from):
    return {"biosample_relation": [{"relationship_type": "derived from",
            "biosample": derived_from['@id']}]}


def test_biosample_has_display_title(testapp, biosample_1):
    # accession fallback used for display title here
    assert biosample_1['display_title'] == biosample_1['accession']


# link_id is equal to @id but uses ~ instead of / for embedding purposes
def test_biosample_has_link_id(testapp, biosample_1):
    assert biosample_1['link_id'] == biosample_1['@id'].replace('/', '~')


# data from test/datafixtures
def test_update_biosample_relation(testapp, human_biosample, biosample_1):
    patch_res = testapp.patch_json(human_biosample['@id'], biosample_relation(biosample_1))
    res = testapp.get(biosample_1['@id'])
    # expected relation: 'biosample': human_biosample['@id'],
    #                    'relationship_type': 'parent of'
    assert res.json['biosample_relation'][0]['biosample']['@id'] == human_biosample['@id']
    assert res.json['biosample_relation'][0]['relationship_type'] == 'parent of'


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
