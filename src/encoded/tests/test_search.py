# Use workbook fixture from BDD tests (including elasticsearch)
from .features.conftest import app_settings, app, workbook
import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.mark.slow
def test_search_view(workbook, testapp):
    res = testapp.get('/search/?type=Item').json
    assert res['@type'] == ['Search']
    assert res['@id'] == '/search/?type=Item'
    assert res['@context'] == '/terms/'
    assert res['notification'] == 'Success'
    assert res['title'] == 'Search'
    assert res['total'] > 0
    assert 'facets' in res
    assert 'filters' in res
    assert '@graph' in res


@pytest.mark.slow
def test_search_with_no_query(workbook, testapp):
    # using /search/ (with no query) should default to /search/?type=Item
    # thus, should satisfy same assertions as test_searcg_view
    res = testapp.get('/search/').follow(status=200)
    assert res.json['@type'] == ['Search']
    assert res.json['@id'] == '/search/?type=Item'
    assert res.json['@context'] == '/terms/'
    assert res.json['notification'] == 'Success'
    assert res.json['title'] == 'Search'
    assert res.json['total'] > 0
    assert 'facets' in res
    assert 'filters' in res
    assert '@graph' in res
