import pytest
pytestmark = pytest.mark.working


def test_experiment_update_experiment_relation(testapp, base_experiment, experiment):
    relation = [{'relationship_type': 'controlled by',
                 'experiment': experiment['@id']}]
    res = testapp.patch_json(base_experiment['@id'], {'experiment_relation': relation})
    assert res.json['@graph'][0]['experiment_relation'] == relation

    #patching an experiement should also update the related experiement
    exp_res = testapp.get(experiment['@id'])

    exp_relation = [{'relationship_type': 'control for',
                     'experiment': base_experiment['@id']}]
    assert exp_res.json['experiment_relation'] == exp_relation


def test_experiment_update_experiments_in_set(testapp, experiment_set, experiment):
    experiment_sets = {'experiment_sets': [experiment_set['@id']]}
    res = testapp.patch_json(experiment['@id'], experiment_sets)
    assert res.json['@graph'][0]['experiment_sets'] == experiment_sets['experiment_sets']

    #patching an experiement should also update the experiment_set with the experiment
    exp_set = testapp.get(experiment_set['@id'])

    assert exp_set.json['experiments_in_set'][0]['@id'] == experiment['@id']


def test_experiment_set_update_experiment_sets(testapp, experiment_set, experiment):
    experiments = {'experiments_in_set': [experiment['@id']]}
    res = testapp.patch_json(experiment_set['@id'], experiments)
    assert res.json['@graph'][0]['experiments_in_set'] == experiments['experiments_in_set']

    #patching an experiement should also update the experiment_set with the experiment
    expt = testapp.get(experiment['@id'])
    assert expt.json['experiment_sets'][0] == experiment_set['@id']


def test_calculated_experiment_summary(testapp, experiment, mboI):
    summary = 'micro-C on GM12878 with MboI'
    res = testapp.patch_json(experiment['@id'], {'digestion_enzyme': mboI['@id']}, status=200)
    assert res.json['@graph'][0]['experiment_summary'] == summary
