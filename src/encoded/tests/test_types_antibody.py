import pytest


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def antibody_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'Test Antibody',
        'antibody_name': 'test-Ab',
        'antibody_product_no': '123'
    }


@pytest.fixture
def post_antibody_vendor(testapp, lab, award):
    item = {'lab': lab['@id'],
            'award': award['@id'],
            'title': 'Vendor Biolabs'}
    return testapp.post_json('/vendor', item).json['@graph'][0]


@pytest.fixture
def ab_w_name(testapp, antibody_data):
    return testapp.post_json('/antibody', antibody_data).json['@graph'][0]


def test_antibody_update_antibody_id(ab_w_name):
    assert ab_w_name['antibody_id'] == 'test-Ab-123'


def test_antibody_display_title(testapp, ab_w_name, post_antibody_vendor):
    assert ab_w_name['display_title'] == 'test-Ab (123)'
    res = testapp.patch_json(
        ab_w_name['@id'],
        {'antibody_vendor': post_antibody_vendor['@id']}
    ).json['@graph'][0]
    assert res['display_title'] == 'test-Ab (Vendor Biolabs, 123)'
