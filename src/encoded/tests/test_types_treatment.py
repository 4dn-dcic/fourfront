import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def drug_treatment(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'chemical': 'Drug',
    }
    return testapp.post_json('/treatment_chemical', item).json['@graph'][0]


def test_calculated_chemical_treatment_display_title(testapp, drug_treatment):
    # import pdb; pdb.set_trace()
    assert drug_treatment['display_title'] == 'Drug treatment'
    res = testapp.patch_json(
        drug_treatment['@id'],
        {'concentration': 3.5, 'concentration_units': 'M'})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (3.5 M)'
    res = testapp.patch_json(
        drug_treatment['@id'],
        {'duration': 3.5, 'duration_units': 'hour'})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (3.5 M 3.5 hour)'
    res = testapp.patch_json(drug_treatment['@id'], {'temperature': 3.5})
    assert res.json['@graph'][0]['display_title'] == 'Drug treatment (3.5 M 3.5 hour at 3.5 °C)'


def test_calculated_rnai_treatment_display_title(testapp, rnai, target_w_genes):
    # import pdb; pdb.set_trace()
    assert rnai['display_title'] == 'shRNA treatment'
    res = testapp.patch_json(rnai['@id'], {'target': target_w_genes['@id']})
    assert res.json['@graph'][0]['display_title'] == 'shRNA treatment for Gene:eeny,meeny'
