import pytest
from .features.conftest import app_settings, workbook
pytestmark = [pytest.mark.working, pytest.mark.indexing, pytest.mark.flaky]

def test_validation_err_facet(workbook, testapp):
    res = testapp.get('/search/?type=ExperimentSetReplicate').json
    val_err_facets = [facet for facet in res['facets'] if facet['title'] == 'Validation Errors']
    assert len(val_err_facets) == 1
    assert val_err_facets[0]['aggregation_type'] == 'terms'


def test_validation_err_itemview(workbook, testapp):
    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/').json
    assert 'validation-errors' in res.keys()


def test_validation_err_view(workbook, testapp):
    res = testapp.get('/experiment-set-replicates/4DNESAAAAAA1/@@validation-errors').json
    assert res['@id'] == '/experiment-set-replicates/4DNESAAAAAA1/'
    assert 'validation_errors' in res
