import pytest
# from encoded.types.experiment import Experiment, ExperimentHiC
from encoded.types.experiment_set import is_newer_than
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


# tests for the experiment_sets calculated properties
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


@pytest.fixture
def pub1_data(lab, award):
    # encode paper published 2012-09-06
    return {
        'award': award['@id'],
        'lab': lab['@id'],
        'ID': "PMID:22955616"
    }


@pytest.fixture
def pub2_data(lab, award):
    # Sanborn et al paper published 2015-11-24
    return {
        'award': award['@id'],
        'lab': lab['@id'],
        'ID': "PMID:26499245"
    }


def test_calculated_produced_in_pub_for_rep_experiment_set(testapp, replicate_experiment_set, pub1_data):
    # post single rep_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expsetres = testapp.get(replicate_experiment_set['@id'])
    assert 'produced_in_pub' in expsetres
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] == expsetres['produced_in_pub']


def test_calculated_produced_in_pub_for_cust_experiment_set(testapp, custom_experiment_set, pub1_data):
    # post single cust_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expsetres = testapp.get(custom_experiment_set['@id'])
    assert 'produced_in_pub' in expsetres
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] == expsetres['produced_in_pub']


def test_calculated_produced_in_pub_for_two_experiment_set(testapp, replicate_experiment_set, custom_experiment_set, pub1_data):
    # post two exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id'], custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    responses = [testapp.get(replicate_experiment_set['@id']),
                 testapp.get(custom_experiment_set['@id'])]
    for response in responses:
        assert 'produced_in_pub' in response
        assert '/publication/' + pub1res.json['@graph'][0]['uuid'] == response['produced_in_pub']


def test_calculated_produced_in_pub_for_two_experiment_set(testapp, replicate_experiment_set, custom_experiment_set, pub1_data, pub2_data):
    # post one exp_set to each pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    responses = [testapp.get(replicate_experiment_set['@id']),
                 testapp.get(custom_experiment_set['@id'])]
    for response in responses:
        assert 'produced_in_pub' in response
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] == responses[0]['produced_in_pub']
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] == responses[1]['produced_in_pub']


def test_calculated_produced_in_pub_for_two_experiment_set(testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post one exp_set to two pubs - this one should pick up only the most recent pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'produced_in_pub' in response
    assert not '/publication/' + pub1res.json['@graph'][0]['uuid'] == response['produced_in_pub']
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] == response['produced_in_pub']


def test_calculated_publications_in_experiment_set_no_data(testapp, replicate_experiment_set, custom_experiment_set, pub1_data):
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    assert 'publications' not in replicate_experiment_set
    assert 'publications' not in custom_experiment_set


def test_calculated_publications_in_rep_experiment_set_2_fields(testapp, replicate_experiment_set, pub1_data):
    # post single rep_exp_set to single pub both fields
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications' in response
    assert len(response['publications']) == 1
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response['publications']


def test_calculated_publications_in_cust_experiment_set_used_in_field(testapp, custom_experiment_set, pub1_data):
    # post only used in publication one pub one exp set
    pub1_data['exp_sets_used_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(custom_experiment_set['@id'])
    assert 'publications' in response
    assert len(response['publications']) == 1
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response['publications']


def test_calculated_publications_in_experiment_set_no_data(testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post same experiment set to two pubs in either field
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications' in response
    assert len(response['publications']) == 2
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response['publications']
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] in response['publications']


def test_calculated_publications_in_experiment_set_no_data(testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post same experiment set to two pubs in used in pub field
    pub1_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications' in response
    assert len(response['publications']) == 2
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response['publications']
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] in response['publications']


def test_is_newer_than():
    ok_date_pairs = [
        ('2001-01-01', '2000-01-01'),
        ('2010-02-01', '2010-01-01'),
        ('2010-01-02', '2010-01-01'),
    ]

    bad_date_pairs = [
        ('2000-01-01', '2000-01-01'),
        ('', '2010-01-01'),
        (None, '2000-01-01'),
        ('2000', '01-01'),
        ('bob', 1),
    ]

    for dp in ok_date_pairs:
        assert is_newer_than(dp[0], dp[1])
        assert not is_newer_than(dp[1], dp[0])

    for dp2 in bad_date_pairs:
        assert not is_newer_than(dp2[0], dp2[1])
        assert not is_newer_than(dp2[1], dp2[0])
