import pytest
from .features.conftest import app_settings, workbook
pytestmark = pytest.mark.working

def test_aggregation_facet(workbook, testapp):
    res = testapp.get('/search/?type=ExperimentSetReplicate').json
    badge_facets = [facet for facet in res['facets'] if facet['title'] in
                   ['Positive Badges', 'Warning Badges']]
    assert badge_facets
    titles = [facet['title'] for facet in badge_facets]
    assert 'Positive Badges' in titles and 'Warning Badges' in titles
    terms = [term['key'] for i in range(2) for term in badge_facets[i]['terms']]
    assert len([t for t in terms if t != 'No value']) == 3


def test_aggregation_itemview(workbook, testapp):
    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/').json
    assert 'aggregated-items' in res.keys()
    parents = ''.join([badge['parent'] for badge in res['aggregated-items']['badges']])
    assert 'biosample' in parents and 'experiment-set-replicate' in parents
    items = [badge['parent'] + ', ' + badge['item']['badge']['uuid'] for
             badge in res['aggregated-items']['badges']]
    assert len(items) == len(list(set(items)))


def test_aggregation_view(workbook, testapp):
    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/@@aggregated-items').json
    agg = res['aggregated_items']
    assert 'badges' in agg.keys()
    assert len(agg['badges']) >= 3
    keys = [badge.keys() for badge in agg['badges']]
    assert all('parent' in item for item in keys)
    badge_keys = [badge['item'].keys() for badge in agg['badges']]
    assert all('message' in badge_key for badge_key in badge_keys)
    assert all('badge' in badge_key for badge_key in badge_keys)
