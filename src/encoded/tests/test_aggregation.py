from .features.conftest import app_settings, app, workbook
import pytest
# import random
# from encoded.commands.upgrade_test_inserts import get_inserts
import json
# import time
# pytestmark = [pytest.mark.working, pytest.mark.schema]


def test_aggregation_facet(workbook, testapp):
    res = testapp.get('/search/?type=ExperimentSetReplicate').json
    badge_facet = [facet for facet in res['facets'] if facet['title'] == 'Badge Classification']
    assert badge_facet
    terms = [term['key'] for term in badge_facet[0]['terms']]
    assert 'WARNING' in terms and 'KUDOS' in terms


def test_aggregation_itemview(workbook, testapp):
    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/').json
    assert 'aggregated-items' in res.keys()
    #agg = res['aggregated-items']['badges']
    parents = ''.join([badge['parent'] for badge in res['aggregated-items']['badges']])
    assert 'biosample' in parents and 'experiment-set-replicate' in parents


# test for @@aggregated-items view
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
