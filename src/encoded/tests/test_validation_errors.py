import pytest

from dcicutils.qa_utils import notice_pytest_fixtures
#from .workbook_fixtures import es_app_settings, es_app, es_testapp, workbook
# from ..util import delay_rerun


# notice_pytest_fixtures(es_app_settings, es_app, es_testapp, workbook)

pytestmark = [
    pytest.mark.working,
    # pytest.mark.indexing,
    pytest.mark.workbook,
    # pytest.mark.flaky(rerun_filter=delay_rerun),
]


@pytest.mark.skip(reason="validation_errors facet was removed in search.py")
def test_validation_err_facet(workbook, es_testapp):
    res = es_testapp.get('/search/?type=ExperimentSetReplicate').json
    val_err_facets = [facet for facet in res['facets'] if facet['title'] == 'Validation Errors']
    assert len(val_err_facets) == 1
    assert val_err_facets[0]['aggregation_type'] == 'terms'


def test_validation_err_itemview(workbook, es_testapp):
    res = es_testapp.get('/experiment-set-replicates/4DNESAAAAAA1/').json
    assert 'validation-errors' in res.keys()


def test_validation_err_view(workbook, es_testapp):
    res = es_testapp.get('/experiment-set-replicates/4DNESAAAAAA1/@@validation-errors').json
    assert res['@id'] == '/experiment-set-replicates/4DNESAAAAAA1/'
    assert 'validation_errors' in res
