import pytest
from snovault.schema_utils import load_schema
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def de_term(testapp, lab, award):
    item = {
        "term_id": "UBERON:0005439",
        "term_name": "definitive endoderm",
        "term_url": "http://purl.obolibrary.org/obo/UBERON_0005439"
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def biosample_cc_wo_diff(testapp, de_term, lab, award):
    item = {
        "culture_start_date": "2018-01-01",
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosample_cell_culture', item).json['@graph'][0]


@pytest.fixture
def biosample_cc_w_diff(testapp, de_term, lab, award):
    item = {
        "culture_start_date": "2018-01-01",
        "differentiation_state": "Differentiated to definitive endoderm demonstrated by decreased Oct4 expression and increased Sox17 expression",
        "differentiation_tissue": de_term['@id'],
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosample_cell_culture', item).json['@graph'][0]


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


def test_biosample_calculated_properties(testapp, biosample_1, ):
    """
    Test to ensure the calculated properties are in result returned from testapp
    """
    res = testapp.get(biosample_1['@id']).json
    assert 'modifications_summary' in res
    assert 'modifications_summary_short' in res
    assert 'treatments_summary' in res
    assert 'biosource_summary' in res


def test_biosample_biosource_summary_one_biosource(testapp, biosample_1, human_biosource):
    assert biosample_1['biosource_summary'] == human_biosource['biosource_name']


def test_biosample_biosource_summary_two_biosource(testapp, biosample_1, human_biosource, lung_biosource):
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [human_biosource['@id'], lung_biosource['@id']]}).json['@graph'][0]
    assert human_biosource['biosource_name'] in res['biosource_summary']
    assert lung_biosource['biosource_name'] in res['biosource_summary']
    assert ' and ' in res['biosource_summary']


def test_biosample_biosource_summary_w_differentiation(testapp, biosample_1, human_biosource, biosample_cc_w_diff, de_term):
    res = testapp.patch_json(biosample_1['@id'], {'cell_culture_details': biosample_cc_w_diff['@id']}).json['@graph'][0]
    assert human_biosource['biosource_name'] in res['biosource_summary']
    assert ' differentiated to ' in res['biosource_summary']
    assert de_term['display_title'] in res['biosource_summary']


def test_biosample_sample_type_w_differentiation(testapp, biosample_1, biosample_cc_w_diff):
    res = testapp.patch_json(biosample_1['@id'], {'cell_culture_details': biosample_cc_w_diff['@id']}).json['@graph'][0]
    assert res['biosample_type'] == 'in vitro differentiated cells'


def test_biosample_sample_type_immortalized_wo_differentiation(testapp, biosample_1, biosample_cc_wo_diff):
    res = testapp.patch_json(biosample_1['@id'], {'cell_culture_details': biosample_cc_wo_diff['@id']}).json['@graph'][0]
    assert res['biosample_type'] == 'immortalized cells'


def test_biosample_sample_type_bs_stem_cell_line(testapp, biosample_1, human_biosource):
    bsres = testapp.patch_json(human_biosource['@id'], {'biosource_type': 'stem cell derived cell line'}).json['@graph'][0]
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [bsres['@id']]}).json['@graph'][0]
    assert res['biosample_type'] == 'stem cells'


def test_biosample_sample_type_bs_multicellular(testapp, biosample_1, human_biosource):
    bsres = testapp.patch_json(human_biosource['@id'], {'biosource_type': 'multicellular organism'}).json['@graph'][0]
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [bsres['@id']]}).json['@graph'][0]
    assert res['biosample_type'] == 'whole organisms'


def test_biosample_sample_type_bs_tissue(testapp, biosample_1, human_biosource):
    bty = 'tissue'
    bsres = testapp.patch_json(human_biosource['@id'], {'biosource_type': bty}).json['@graph'][0]
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [bsres['@id']]}).json['@graph'][0]
    assert res['biosample_type'] == bty


def test_biosample_sample_type_bs_lines_and_to_pluralize(testapp, biosample_1, human_biosource):
    types = {
        "primary cell": "primary cells",
        "primary cell line": "primary cells",
        "immortalized cell line": "immortalized cells",
        "stem cell": "stem cells",
        "induced pluripotent stem cell": "induced pluripotent stem cells"
    }
    for bty, bsty in types.items():
        bsres = testapp.patch_json(human_biosource['@id'], {'biosource_type': bty}).json['@graph'][0]
        res = testapp.patch_json(biosample_1['@id'], {'biosource': [bsres['@id']]}).json['@graph'][0]
        assert res['biosample_type'] == bsty


def test_biosample_sample_type_bs_multiple_same_type(testapp, biosample_1, human_biosource, GM12878_biosource):
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [human_biosource['@id'], GM12878_biosource['@id']]}).json['@graph'][0]
    assert res['biosample_type'] == 'immortalized cells'


def test_biosample_sample_type_bs_multiple_diff_types(testapp, biosample_1, human_biosource, lung_biosource):
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [human_biosource['@id'], lung_biosource['@id']]}).json['@graph'][0]
    assert res['biosample_type'] == 'mixed sample'
