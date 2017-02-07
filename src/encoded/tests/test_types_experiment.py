import pytest
# from encoded.types.experiment import Experiment, ExperimentHiC
pytestmark = pytest.mark.working
'''Has tests for both experiment.py and experiment_set.py'''


def test_experiment_update_experiment_relation(testapp, base_experiment, experiment):
    relation = [{'relationship_type': 'controlled by',
                 'experiment': experiment['@id']}]
    res = testapp.patch_json(base_experiment['@id'], {'experiment_relation': relation})
    assert res.json['@graph'][0]['experiment_relation'] == relation

    # patching an experiement should also update the related experiement
    exp_res = testapp.get(experiment['@id'])

    exp_relation = [{'relationship_type': 'control for',
                     'experiment': base_experiment['@id']}]
    assert exp_res.json['experiment_relation'] == exp_relation


def test_experiment_update_hic_sop_mapping_added_on_submit(testapp, experiment_data, sop_map_data):
    res_sop = testapp.post_json('/sop_map', sop_map_data, status=201)
    res_exp = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res_exp.json['@graph'][0]
    assert res_exp.json['@graph'][0]['sop_mapping']['has_sop'] == "Yes"
    assert res_exp.json['@graph'][0]['sop_mapping']['sop_map'] == res_sop.json['@graph'][0]['@id']


def test_experiment_update_hic_sop_mapping_has_map_is_no(testapp, experiment_data):
    experiment_data['experiment_type'] = 'DNase Hi-C'
    res_exp = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res_exp.json['@graph'][0]
    assert res_exp.json['@graph'][0]['sop_mapping']['has_sop'] == "No"


def test_experiment_update_hic_sop_map_not_added_when_already_present(testapp, experiment_data):
    experiment_data['sop_mapping'] = {}
    experiment_data['sop_mapping']['has_sop'] = 'No'
    res = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res.json['@graph'][0]
    assert res.json['@graph'][0]['sop_mapping']['has_sop'] == "No"
    assert 'sop_map' not in res.json['@graph'][0]['sop_mapping']


def test_calculated_experiment_summary(testapp, experiment, mboI):
    summary = 'micro-C on GM12878 with MboI'
    res = testapp.patch_json(experiment['@id'], {'digestion_enzyme': mboI['@id']}, status=200)
    assert res.json['@graph'][0]['experiment_summary'] == summary


# tests for Experiment class methodss
# def test_generate_mapid(registry, experiment_data):
#    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
#    etype = 'micro-C'
#    my_expt = ExperimentHiC.create(registry, uuid, experiment_data)
#    assert my_expt.generate_mapid(etype, suffnum) == 'ExperimentHiC_1'


# test for experiment_set_replicate _update function
def test_experiment_set_replicate_update_adds_experiments_in_set(testapp, experiment, replicate_experiment_set):
    assert not replicate_experiment_set['experiments_in_set']
    res = testapp.patch_json(
        replicate_experiment_set['@id'],
        {'replicate_exps':
            [{'replicate_exp': experiment['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1}]},
        status=200)
    assert experiment['@id'] in res.json['@graph'][0]['experiments_in_set']


# tests for the experiment_sets calculated property
def test_calculated_experiment_sets_for_custom_experiment_set(testapp, experiment, custom_experiment_set):
    assert not experiment['experiment_sets']
    res = testapp.patch_json(custom_experiment_set['@id'], {'experiments_in_set': [experiment['@id']]}, status=200)
    print(res)
    expt_res = testapp.get(experiment['@id'])
    print(expt_res)
    assert '/experiment_set/' + custom_experiment_set['uuid'] in expt_res.json['experiment_sets']


def test_calculated_experiment_sets_for_replicate_experiment_set(testapp, experiment, replicate_experiment_set):
    assert not experiment['experiment_sets']
    res = testapp.patch_json(
        replicate_experiment_set['@id'],
        {'replicate_exps':
            [{'replicate_exp': experiment['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1}]},
        status=200)
    print(res)
    expt_res = testapp.get(experiment['@id'])
    print(expt_res)
    assert '/experiment_set_replicate/' + replicate_experiment_set['uuid'] in expt_res.json['experiment_sets']
