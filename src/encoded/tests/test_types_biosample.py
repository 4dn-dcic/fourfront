import pytest
from unittest import mock
# from snovault.schema_utils import load_schema


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def biosample_cc_w_diff(testapp, de_term, lab, award):
    item = {
        "culture_start_date": "2018-01-01",
        "differentiation_state": "Differentiated to definitive endoderm demonstrated by decreased Oct4 expression and increased Sox17 expression",
        "tissue": de_term['@id'],
        "in_vitro_differentiated": "Yes",
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


@pytest.fixture
def biosample_w_mod(testapp, biosample_1, mod_w_target):
    return testapp.patch_json(biosample_1['@id'], {'modifications': [mod_w_target['@id']]}).json['@graph'][0]


@pytest.fixture
def biosample_w_treatment(testapp, biosample_1, rnai):
    return testapp.patch_json(biosample_1['@id'], {'treatments': [rnai['@id']]}).json['@graph'][0]


@pytest.fixture
def biosample_relation(derived_from):
    return {"biosample_relation": [{"relationship_type": "derived from",
            "biosample": derived_from['@id']}]}


def test_biosample_has_display_title(testapp, biosample_1):
    # accession fallback used for display title here
    assert biosample_1['display_title'] == biosample_1['accession']


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
    These have string 'None' returned if no value as they are used in Item page view
    """
    res = testapp.get(biosample_1['@id']).json
    assert 'modifications_summary' in res
    assert 'modifications_summary_short' in res
    assert 'treatments_summary' in res


def test_biosample_biosource_summary_one_biosource(testapp, biosample_1, human_biosource):
    assert biosample_1['biosource_summary'] == human_biosource['biosource_name']


def test_biosample_biosource_summary_two_biosource(testapp, biosample_1, human_biosource, lung_biosource):
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [human_biosource['@id'], lung_biosource['@id']]}).json['@graph'][0]
    assert human_biosource['biosource_name'] in res['biosource_summary']
    assert lung_biosource['biosource_name'] in res['biosource_summary']
    assert ' and ' in res['biosource_summary']


def test_biosample_biosource_summary_w_differentiation(testapp, biosample_1, human_biosource, biosample_cc_w_diff, de_term):
    res = testapp.patch_json(biosample_1['@id'], {'cell_culture_details': [biosample_cc_w_diff['@id']]}).json['@graph'][0]
    assert human_biosource['biosource_name'] in res['biosource_summary']
    assert ' differentiated to ' in res['biosource_summary']
    assert de_term['display_title'] in res['biosource_summary']


def test_biosample_sample_type_w_differentiation(testapp, biosample_1, biosample_cc_w_diff):
    res = testapp.patch_json(biosample_1['@id'], {'cell_culture_details': [biosample_cc_w_diff['@id']]}).json['@graph'][0]
    assert res['biosample_type'] == 'in vitro differentiated cells'


def test_biosample_sample_type_immortalized_wo_differentiation(testapp, biosample_1, biosample_cc_wo_diff):
    res = testapp.patch_json(biosample_1['@id'], {'cell_culture_details': [biosample_cc_wo_diff['@id']]}).json['@graph'][0]
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


def test_biosample_modifications_summaries(biosample_w_mod):
    assert biosample_w_mod['modifications_summary'] == 'Crispr for RAD21 gene'
    assert biosample_w_mod['modifications_summary_short'] == 'RAD21 Crispr'


def test_biosample_modifications_summaries_no_mods(biosample_1):
    assert biosample_1.get('modifications_summary') == 'None'
    assert biosample_1.get('modifications_summary_short') == 'None'


def test_biosample_treatments_summary(biosample_w_treatment):
    assert biosample_w_treatment.get('treatments_summary') == 'shRNA treatment'


def test_biosample_treatments_summary_no_treatment(biosample_1):
    assert biosample_1.get('treatments_summary') == 'None'


def test_biosample_category_undifferentiated_stem_cells(testapp, biosample_1, human_biosource):
    scl = testapp.patch_json(human_biosource['@id'], {'biosource_type': 'stem cell derived cell line'}).json['@graph'][0]
    bios = testapp.patch_json(biosample_1['@id'], {'biosource': [scl['@id']]}).json['@graph'][0]
    assert 'Human stem cell' in bios.get('biosample_category')


def test_biosample_category_differentiated_stem_cells(testapp, biosample_1, human_biosource, biosample_cc_w_diff):
    scl = testapp.patch_json(human_biosource['@id'], {'biosource_type': 'stem cell derived cell line'}).json['@graph'][0]
    bios = testapp.patch_json(biosample_1['@id'], {'biosource': [scl['@id']], 'cell_culture_details': [biosample_cc_w_diff['@id']]}).json['@graph'][0]
    cats = bios.get('biosample_category')
    assert 'Human stem cell' not in cats
    assert 'In vitro Differentiation' in cats


def test_biosample_biosource_category_two_biosource(testapp, biosample_1, human_biosource, lung_biosource):
    res = testapp.patch_json(biosample_1['@id'], {'biosource': [human_biosource['@id'], lung_biosource['@id']]}).json['@graph'][0]
    cat = res.get('biosample_category')
    assert len(cat) == 1
    assert cat[0] == 'Mixed samples'


# setting up fixtures for testing tissue and organ calcprop
@pytest.fixture
def brain_term(testapp, uberon_ont, cns_term, ectoderm_term):
    item = {
        "is_slim_for": "organ",
        "term_id": "brain_tid",
        "term_name": "brain",
        "source_ontologies": [uberon_ont['@id']],
        "slim_terms": [cns_term['@id'], ectoderm_term['@id']]
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def cns_term(testapp, uberon_ont, ectoderm_term):
    item = {
        "is_slim_for": "system",
        "term_id": "cns_tid",
        "term_name": "central nervous system",
        "source_ontologies": [uberon_ont['@id']],
        "slim_terms": [ectoderm_term['@id']]
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def ectoderm_term(testapp, uberon_ont):
    item = {
        "is_slim_for": "developmental",
        "term_id": "ectoderm_tid",
        "term_name": "ectoderm",
        "source_ontologies": [uberon_ont['@id']],
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def primary_cell_term(testapp, ontology):
    item = {
        "is_slim_for": "cell",
        "term_id": "pcell_id",
        "term_name": "primary cell",
        "source_ontologies": [ontology['@id']],
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def cortical_neuron_term(testapp, uberon_ont, brain_term, cns_term,
                         ectoderm_term, primary_cell_term):
    item = {
        "term_id": "cort_neuron_id",
        "term_name": "cortical neuron",
        "source_ontologies": [uberon_ont['@id']],
        "slim_terms": [brain_term['@id'], cns_term['@id'], ectoderm_term['@id'], primary_cell_term['@id']]
    }
    return testapp.post_json('/ontology_term', item).json['@graph'][0]


@pytest.fixture
def bcc_diff_to_cortical(testapp, lab, award, cortical_neuron_term):
    item = {
        "culture_start_date": "2018-01-01",
        "differentiation_state": "Stem cell differentiated to cortical neuron",
        "tissue": cortical_neuron_term['@id'],
        "in_vitro_differentiated": "Yes",
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosample_cell_culture', item).json['@graph'][0]


@pytest.fixture
def diff_cortical_neuron_bs(testapp, F123_biosource, bcc_diff_to_cortical, lab, award):
    item = {
        "description": "Differentiated cortical neuron",
        "biosource": [F123_biosource['@id']],
        "cell_culture_details": [bcc_diff_to_cortical['@id']],
        "award": award['@id'],
        "lab": lab['@id']
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


def test_get_tissue_organ_info_none_present(biosample_1):
    assert 'tissue_organ_info' not in biosample_1


def test_get_tissue_organ_info_tissue_in_cell_culture(testapp, diff_cortical_neuron_bs,
                                                      cortical_neuron_term):
    org_sys = sorted(['brain', 'central nervous system', 'ectoderm'])
    assert 'tissue_organ_info' in diff_cortical_neuron_bs
    assert diff_cortical_neuron_bs['tissue_organ_info']['tissue_source'] == cortical_neuron_term.get('display_title')
    assert sorted(diff_cortical_neuron_bs['tissue_organ_info']['organ_system']) == org_sys
