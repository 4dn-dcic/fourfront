import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def antibody_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'Test Antibody',
        'antibody_name': 'testAb'
    }


@pytest.fixture
def ab_w_name(testapp, antibody_data):
    return testapp.post_json('/antibody', antibody_data).json['@graph'][0]


def test_antibody_update_name_only(ab_w_name):
    assert ab_w_name['antibody_id'] == 'testAb'


def test_antibody_update_name_and_accession(testapp, ab_w_name):
    acc = 'ENCAB111AAA'
    res = testapp.patch_json(ab_w_name['@id'], {'antibody_product_no': acc}).json['@graph'][0]
    assert res['antibody_id'] == 'testAb (' + acc + ')'


def test_antibody_display_title_name_only(ab_w_name):
    assert ab_w_name['display_title'] == 'testAb'


def test_antibody_display_title_name_and_accession(testapp, ab_w_name):
    acc = 'ENCAB111AAA'
    res = testapp.patch_json(ab_w_name['@id'], {'antibody_product_no': acc}).json['@graph'][0]
    assert res['display_title'] == 'testAb (' + acc + ')'
