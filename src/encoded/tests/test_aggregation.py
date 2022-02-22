import pytest

from dcicutils.qa_utils import notice_pytest_fixtures
from ..util import delay_rerun
from .workbook_fixtures import app_settings, app, workbook


# NOTE WELL: Even though app_settings and app are not autouse fixtures, they must be imported.
#  Removing these will not cause fixtures by those names not to be found, but my guess is that
#  it will find different versions of those fixtures, which is what will cause the tests to fail
#  with: 404  "The resource could not be found."
#  -kmp 28-Jun-2020
notice_pytest_fixtures(app_settings, app, workbook)


pytestmark = [pytest.mark.working,
              # pytest.mark.indexing,
              pytest.mark.workbook,
              pytest.mark.flaky(rerun_filter=delay_rerun)]


def test_aggregation_facet(workbook, testapp):
    notice_pytest_fixtures(workbook, testapp)

    res = testapp.get('/search/?type=ExperimentSetReplicate').json
    badge_facets = [facet for facet in res['facets'] if facet['title'] in
                   ['Commendations', 'Warnings']]
    assert badge_facets
    titles = [facet['title'] for facet in badge_facets]
    assert 'Commendations' in titles and 'Warnings' in titles
    terms = [term['key'] for i in range(2) for term in badge_facets[i]['terms']]
    assert len([t for t in terms if t != 'No value']) == 3


def test_aggregation_itemview(workbook, testapp):
    notice_pytest_fixtures(workbook, testapp)

    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/').json
    assert 'aggregated-items' in res.keys()
    parents = ''.join([badge['parent'] for badge in res['aggregated-items']['badges']])
    assert 'biosample' in parents and 'experiment-set-replicate' in parents
    items = [badge['parent'] + ', ' + badge['item']['badge']['uuid'] for
             badge in res['aggregated-items']['badges']]
    assert len(items) == len(list(set(items)))


def test_aggregation_view(workbook, testapp):
    notice_pytest_fixtures(workbook, testapp)

    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/@@aggregated-items').json
    agg = res['aggregated_items']
    assert 'badges' in agg.keys()
    assert len(agg['badges']) >= 3
    for agg_badge in agg['badges']:
        assert 'parent' in agg_badge
        assert 'embedded_path' in agg_badge
        # check the embedded_path based off of parent
        expected_path = None
        if '/experiment-set' in agg_badge['parent']:
            expected_path = 'badges'
        elif '/experiments' in agg_badge['parent']:
            expected_path = 'experiments_in_set.badges'
        elif '/biosample' in agg_badge['parent']:
            expected_path = 'experiments_in_set.biosample.badges'
        elif '/files' in agg_badge['parent']:
            expected_path = 'experiments_in_set.files.badges'
        # let's not make this test too brittle; handle unexpected test data
        if expected_path:
            assert agg_badge['embedded_path'] == expected_path
        # check fields on badge. hardcoded fields may need to be updated
        assert 'messages' in agg_badge['item']
        assert 'badge' in agg_badge['item']
        assert 'commendation' in agg_badge['item']['badge']
        assert 'warning' in agg_badge['item']['badge']
