import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def badge_data(lab, award):
    return {
        "title": "Test BaDGe Title",
        "badge_classification": "Internal",
        'lab': lab['@id'],
        'award': award['@id']
        }


@pytest.fixture
def positive_badge_data(badge_data):
    badge_data['badge_classification'] = 'Commendation'
    return badge_data


@pytest.fixture
def warning_badge_data(badge_data):
    badge_data['badge_classification'] = 'Warning'
    return badge_data


def test_badge_update_name_no_caps(testapp, badge_data):
    res = testapp.post_json('/badge', badge_data, status=201)
    assert res.json['@graph'][0]['badge_name'] == "test-badge-title"


def test_badge_update_name_no_punctuation_or_space(testapp, badge_data):
    badge_data['title'] = "Test, = Badge!  # -title?"
    res = testapp.post_json('/badge', badge_data, status=201)
    assert res.json['@graph'][0]['badge_name'] == "test-badge-title"


def test_badge_name_updates_on_patch(testapp, badge_data):
    res1 = testapp.post_json('/badge', badge_data, status=201)
    res2 = testapp.patch_json(res1.json['@graph'][0]['@id'], {'title': 'WaHoo'}, status=200)
    assert res2.json['@graph'][0]['badge_name'] == "wahoo"


def test_positive_badge_calc_props(testapp, positive_badge_data):
    res = testapp.post_json('/badge', positive_badge_data, status=201)
    print(res.json['@graph'][0])
    assert res.json['@graph'][0]['commendation'] == 'Test BaDGe Title'
    assert not res.json['@graph'][0].get('warning')


def test_warning_badge_calc_props(testapp, warning_badge_data):
    res = testapp.post_json('/badge', warning_badge_data, status=201)
    assert res.json['@graph'][0]['warning'] == 'Test BaDGe Title'
    assert not res.json['@graph'][0].get('commendation')


def test_other_badge_calc_props(testapp, badge_data):
    res = testapp.post_json('/badge', badge_data, status=201)
    res_graph = res.json['@graph'][0]
    assert not res_graph.get('warning') and not res_graph.get('commendation')
