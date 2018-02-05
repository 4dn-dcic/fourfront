
# Use workbook fixture from BDD tests (including elasticsearch)
from .features.conftest import app_settings, app, workbook
import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]
from time import sleep
from encoded.commands.upgrade_test_inserts import get_inserts
import json



def test_barplot_aggregation_endpoint(workbook, testapp):

    # run a simple query with type=Organism and q=mouse
    search_result = testapp.get('/browse/?type=ExperimentSetReplicate').json

    # We should get back our test insert expsets here.
    exp_set_test_inserts = list(get_inserts('inserts', 'experiment_set_replicate'))
    count_exp_set_test_inserts = len(exp_set_test_inserts)
    assert len(search_result['@graph']) == count_exp_set_test_inserts

    # Now, test the endpoint after ensuring we have the data correctly loaded into ES.

    res = testapp.get('/bar_plot_aggregations/type=ExperimentSetReplicate/?field=experiments_in_set.experiment_type&field=award.project').json # Default

    # Our total count for experiment_sets should match # of exp_set_replicate inserts.abs

    assert res['total']['experiment_sets'] == count_exp_set_test_inserts

    assert res['field'] == 'experiments_in_set.experiment_type' # top level field

    assert isinstance(res['terms'], dict) is True

    assert len(res["terms"].keys()) > 2

    assert isinstance(res['terms']["CHIP-seq"], dict) is True # A common term likely to be found.

    assert res["terms"]["CHIP-seq"]["field"] == "award.project" # Child-field

    # We only have 4DN as single award.project in test inserts so should have values in all buckets, though probably less than total.
    assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] > 0
    assert res["terms"]["CHIP-seq"]["total"]["experiment_sets"] < count_exp_set_test_inserts

    assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] > 0
    assert res["terms"]["CHIP-seq"]["terms"]["4DN"]["experiment_sets"] < count_exp_set_test_inserts
