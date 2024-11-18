import pytest


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def drug_treatment(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'treatment_type': 'Chemical',
        'chemical': 'Drug',
    }
    return testapp.post_json('/treatment_agent', item).json['@graph'][0]


@pytest.fixture
def viral_treatment(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'treatment_type': 'Biological',
        'biological_agent': 'Virus',
    }
    return testapp.post_json('/treatment_agent', item).json['@graph'][0]


@pytest.fixture
def construct_based_treatment(testapp, lab, award, construct):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'treatment_type': 'Biological',
        'constructs': [construct],
        'duration': 3.5,
        'duration_units': 'hour'
    }
    return testapp.post_json('/treatment_agent', item).json['@graph'][0]


@pytest.fixture
def heatshock_treatment(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'treatment_type': 'Heat Shock',
    }
    return testapp.post_json('/treatment_agent', item).json['@graph'][0]


def test_calculated_agent_treatment_display_title(testapp, heatshock_treatment):
    assert heatshock_treatment['display_title'] == 'Heat Shock'
    res = testapp.patch_json(
        heatshock_treatment['@id'],
        {'duration': 3.5, 'duration_units': 'hour'})
    assert res.json['@graph'][0]['display_title'] == 'Heat Shock (3.5h)'
    res = testapp.patch_json(heatshock_treatment['@id'], {'temperature': 42})
    assert res.json['@graph'][0]['display_title'] == 'Heat Shock (3.5h at 42°C)'


def test_calculated_chemical_treatment_display_title(testapp, drug_treatment):
    assert drug_treatment['display_title'] == 'Drug treatment'
    res = testapp.patch_json(
        drug_treatment['@id'],
        {'duration': 3.5, 'duration_units': 'hour'})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (3.5h)'
    res = testapp.patch_json(
        drug_treatment['@id'],
        {'concentration': 3.5, 'concentration_units': 'M'})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (3.5 M, 3.5h)'
    res = testapp.patch_json(drug_treatment['@id'], {'temperature': 3.5})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (3.5 M, 3.5h at 3.5°C)'


def test_calculated_chemical_treatment_display_title_temp_only(testapp, drug_treatment):
    assert drug_treatment['display_title'] == 'Drug treatment'
    res = testapp.patch_json(drug_treatment['@id'], {'temperature': 37})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (at 37°C)'


def test_calculated_chemical_treatment_washout_display_title(testapp, drug_treatment):
    assert drug_treatment['display_title'] == 'Drug treatment'
    res = testapp.patch_json(
        drug_treatment['@id'],
        {'duration': 3.5, 'duration_units': 'hour', 'concentration': 0, 'concentration_units': 'M'}
    )
    assert res.json['@graph'][0]['display_title'] == 'Drug washout (3.5h)'


def test_calculated_biological_treatment_display_title(testapp, viral_treatment):
    assert viral_treatment['display_title'] == 'Virus treatment'
    res = testapp.patch_json(viral_treatment['@id'], {
        'duration': 3.5, 'duration_units': 'hour',
        'concentration': 2, 'concentration_units': 'MOI'
    })
    assert res.json['@graph'][0]['display_title'] == 'Virus treatment (2 MOI, 3.5h)'


def test_calculated_rnai_treatment_display_title(testapp, rnai, gene_bio_feature):
    assert rnai['display_title'] == 'shRNA treatment'
    res = testapp.patch_json(rnai['@id'], {'target': [gene_bio_feature['@id']]})
    assert res.json['@graph'][0]['display_title'] == 'shRNA of RAD21 gene'


def test_calculated_treatment_agent_w_override_display_title(testapp, drug_treatment):
    assert drug_treatment['display_title'] == 'Drug treatment'
    res = testapp.patch_json(drug_treatment['@id'], {'override_treatment_title': 'New drug treatment'})
    assert res.json['@graph'][0]['display_title'] == 'New drug treatment'


def test_calculated_rnai_treatment_w_override_display_title(testapp, rnai):
    assert rnai['display_title'] == 'shRNA treatment'
    res = testapp.patch_json(rnai['@id'], {'override_treatment_title': 'New RNAi treatment'})
    assert res.json['@graph'][0]['display_title'] == 'New RNAi treatment'


def test_calculated_biological_treatment_w_construct_display_title(
        construct_based_treatment, construct):
    assert construct.get('display_title') in construct_based_treatment.get('display_title')


def test_calculated_biological_treatment_w_multiple_constructs_display_title(
        testapp, construct_based_treatment, lab, award):
    c_name = 'super_construct_'
    c_type = 'expression construct'
    constructs = []
    for i in range(1, 5):
        cmeta = {
            'name': c_name + str(i),
            'construct_type': c_type,
            'lab': lab['@id'],
            'award': award['@id']
        }
        constructs.append(testapp.post_json('/construct', cmeta).json['@graph'][0])
    # test display_title with 2 constructs
    res = testapp.patch_json(construct_based_treatment['@id'], {'constructs': [c['@id'] for c in constructs[:2]]})
    assert res.json['@graph'][0]['display_title'] == 'super_construct_1, super_construct_2 treatment (3.5h)'
    # test with 4 constructs
    res = testapp.patch_json(construct_based_treatment['@id'], {'constructs': [c['@id'] for c in constructs]})
    assert res.json['@graph'][0]['display_title'] == 'super_construct_1, super_construct_2, super_construct_3 and 1 more treatment (3.5h)'
