import pytest
from encoded.types import TrackingItem
pytestmark = [pytest.mark.working, pytest.mark.schema]



@pytest.fixture
def tracking_item():
    return {"tracking_type": "other", "other_tracking": {"extra_field": "extra_value"}}


def test_insert_and_get_tracking_item(testapp, tracking_item):
    res = testapp.post_json('/tracking-items', tracking_item, status=201)
    assert res.json['@graph'][0]['tracking_type'] == tracking_item['tracking_type']
    res_uuid = res.json['@graph'][0]['uuid']
    get_res = testapp.get('/tracking-items/' + res_uuid).follow()
    assert get_res.json['other_tracking']['extra_field'] == tracking_item['other_tracking']['extra_field']
    assert get_res.json.get('date_created')


def test_tracking_item_create_and_commit(testapp, dummy_request):
    test_body = {
        "tracking_type": "other",
        "other_tracking": {"key1": "val1"}
    }
    res = TrackingItem.create_and_commit(dummy_request, test_body)
    assert res['status'] == 'success'
    res_path = res['@graph'][0]
    app_res = testapp.get(res_path)
    assert app_res.json['tracking_type'] == test_body['tracking_type']
    assert app_res.json['other_tracking']['key1'] == test_body['other_tracking']['key1']
    # should not have date created in this case (no validators run)
    assert 'date_created' not in app_res.json
    # however status is added automatically when using create_and_commit fxn
    assert app_res.json['status'] == 'in review by lab'
