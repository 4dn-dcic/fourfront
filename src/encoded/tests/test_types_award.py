import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def maward():
    return {'name': 'U1234567'}


def test_award_center_title_name_only(testapp, maward):
    res = testapp.post_json('/award', maward).json['@graph'][0]
    assert res['center_title'] == maward['name']


def test_award_center_title_w_pi(testapp, maward, submitter):
    maward['pi'] = submitter['@id']
    res = testapp.post_json('/award', maward).json['@graph'][0]
    assert res['center_title'] == submitter['last_name']


def test_award_center_title_w_desc(testapp, maward):
    maward['description'] = 'DCIC: this is a cool award'
    res = testapp.post_json('/award', maward).json['@graph'][0]
    assert res['center_title'] == 'DCIC'


def test_award_center_title_w_pi_and_desc(testapp, maward, submitter):
    maward['description'] = 'DCIC: this is a cool award'
    maward['pi'] = submitter['@id']
    res = testapp.post_json('/award', maward).json['@graph'][0]
    assert res['center_title'] == 'DCIC - Submitter'


def test_award_center_title_w_center(testapp, maward, submitter):
    ctr = 'Snazzy Center'
    maward['description'] = 'DCIC: this is a cool award'
    maward['pi'] = submitter['@id']
    maward['center'] = ctr
    res = testapp.post_json('/award', maward).json['@graph'][0]
    assert res['center_title'] == ctr
