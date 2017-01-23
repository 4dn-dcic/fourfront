import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def vendor_data(lab, award):
    return {"title": "WorTHington Biochemical", 'lab': lab['@id'], 'award': award['@id']}


def test_vendor_update_name_no_caps(testapp, vendor_data):
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "worthington-biochemical"


def test_vendor_update_name_no_punctuation_or_space(testapp, vendor_data):
    vendor_data['title'] = "Eeny, = Meeny!  # -miny?"
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "eeny-meeny-miny"


def test_vendor_name_updates_on_patch(testapp, vendor_data):
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "worthington-biochemical"
    res = testapp.patch_json(res.json['@graph'][0]['@id'], {'title': 'WaHoo'}, status=200)
    assert res.json['@graph'][0]['name'] == "wahoo"
