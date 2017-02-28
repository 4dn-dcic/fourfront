import pytest
# from encoded.types.experiment import Experiment, ExperimentHiC
from encoded.types.experiment_set import is_newer_than
# from snovault.storage import UUID
pytestmark = pytest.mark.working
'''Has tests for both experiment.py and experiment_set.py'''


@pytest.fixture
def custom_experiment_set_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'test experiment set',
        'experimentset_type': 'custom',
        'status': 'in review by lab'
    }


@pytest.fixture
def custom_experiment_set(testapp, custom_experiment_set_data):
    return testapp.post_json('/experiment_set', custom_experiment_set_data).json['@graph'][0]


@pytest.fixture
def replicate_experiment_set_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'test replicate set',
        'experimentset_type': 'replicate',
        'status': 'in review by lab'
    }


@pytest.fixture
def replicate_experiment_set(testapp, replicate_experiment_set_data):
    return testapp.post_json('/experiment_set_replicate', replicate_experiment_set_data).json['@graph'][0]


@pytest.fixture
def sop_map_data(protocol, lab, award):
    return {
        "sop_name": "in situ Hi-C SOP map",
        "sop_version": 1,
        'lab': lab['@id'],
        'award': award['@id'],
        "associated_item_type": "ExperimentHiC",
        "id_values": ["micro-C"],
        "notes": "This is just a dummy insert not linked to true SOP protocol",
        "description": "Fields with specified defaults in the SOP for in situ Hi-C experiments as per ??",
        "sop_protocol": protocol['@id'],
        "fields_with_default": [
            {"field_name": "digestion_enzyme", "field_value": "MboI"},
        ]
    }


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
#    uuid = UUID("0afb6080-1c08-11e4-8c21-0800200c9a44")
#    print(uuid)
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
    expt_res = testapp.get(experiment['@id'])
    assert custom_experiment_set['uuid'] == expt_res.json['experiment_sets'][0]['uuid']


def test_calculated_experiment_sets_for_replicate_experiment_set(testapp, experiment, replicate_experiment_set):
    assert not experiment['experiment_sets']
    res = testapp.patch_json(
        replicate_experiment_set['@id'],
        {'replicate_exps':
            [{'replicate_exp': experiment['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1}]},
        status=200)
    expt_res = testapp.get(experiment['@id'])
    assert replicate_experiment_set['uuid'] == expt_res.json['experiment_sets'][0]['uuid']


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
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == expsetres.json['produced_in_pub']['@id']


def test_calculated_produced_in_pub_for_cust_experiment_set(testapp, custom_experiment_set, pub1_data):
    # post single cust_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expsetres = testapp.get(custom_experiment_set['@id'])
    assert 'produced_in_pub' in expsetres
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == expsetres.json['produced_in_pub']['@id']


def test_calculated_produced_in_pub_for_two_experiment_set_to_one_pub(
        testapp, replicate_experiment_set, custom_experiment_set, pub1_data):
    # post two exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id'], custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    responses = [testapp.get(replicate_experiment_set['@id']),
                 testapp.get(custom_experiment_set['@id'])]
    for response in responses:
        assert 'produced_in_pub' in response
        assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']


def test_calculated_produced_in_pub_for_two_experiment_set_two_pubs(
        testapp, replicate_experiment_set, custom_experiment_set, pub1_data, pub2_data):
    # post different exp_set to each pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    responses = [testapp.get(replicate_experiment_set['@id']),
                 testapp.get(custom_experiment_set['@id'])]
    for response in responses:
        assert 'produced_in_pub' in response
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == responses[0].json['produced_in_pub']['@id']
    assert '/publications/' + pub2res.json['@graph'][0]['uuid'] + '/' == responses[1].json['produced_in_pub']['@id']


def test_calculated_produced_in_pub_for_one_experiment_set_two_pubs(
        testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post one exp_set to two pubs - this one should pick up only the most recent pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'produced_in_pub' in response
    assert not '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']
    assert '/publications/' + pub2res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']


def test_calculated_publications_in_experiment_set_no_data(
        testapp, replicate_experiment_set, custom_experiment_set, pub1_data):
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    print(replicate_experiment_set)
    print(custom_experiment_set)
    assert not replicate_experiment_set['publications_of_set']
    assert not custom_experiment_set['publications_of_set']


def test_calculated_publications_in_rep_experiment_set_2_fields(
        testapp, replicate_experiment_set, pub1_data):
    # post single rep_exp_set to single pub both fields
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    print(response)
    print('JSON:', response.json)
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 1
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response.json['publications_of_set']


def test_calculated_publications_in_cust_experiment_set_used_in_field(
        testapp, custom_experiment_set, pub1_data):
    # post only used in publication one pub one exp set
    pub1_data['exp_sets_used_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(custom_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 1
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response.json['publications_of_set']


def test_calculated_publications_in_rep_experiment_set_two_pubs_both_fields(
        testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post same experiment set to two pubs in either field
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 2
    publications = response.json['publications_of_set']
    publications = response.json['publications_of_set']
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in publications
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] in publications


def test_calculated_publications_in_rep_experiment_set_two_pubs_in_used(
        testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post same experiment set to two pubs in used in pub field
    pub1_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 2
    publications = response.json['publications_of_set']
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in publications
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] in publications


'''experiment pub calculated properties tests'''


@pytest.fixture
def repset_w_exp1(testapp, replicate_experiment_set_data, experiment):
    repset = replicate_experiment_set_data
    repset['replicate_exps'] = [{'replicate_exp': experiment['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1}]
    return testapp.post_json('/experiment_set_replicate', repset).json['@graph'][0]


@pytest.fixture
def experiment2(testapp, experiment_data):
    experiment_data['experiment_type'] = 'capture Hi-C'
    print(experiment_data)
    return testapp.post_json('/experiment_capture_c', experiment_data).json['@graph'][0]


@pytest.fixture
def custset_w_exp1(testapp, custom_experiment_set_data, experiment):
    custset = custom_experiment_set_data
    custset['experiments_in_set'] = [experiment['@id']]
    return testapp.post_json('/experiment_set', custset).json['@graph'][0]


@pytest.fixture
def custset_w_exp2(testapp, custom_experiment_set_data, experiment2):
    custset = custom_experiment_set_data
    custset['experiments_in_set'] = [experiment2['@id']]
    return testapp.post_json('/experiment_set', custset).json['@graph'][0]


def test_calculated_expt_produced_in_pub_for_rep_experiment_set(
        testapp, repset_w_exp1, pub1_data):
    # post single rep_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expres = testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp'])
    assert 'produced_in_pub' in expres
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == expres.json['produced_in_pub']['@id']


def test_calculated_expt_produced_in_pub_for_cust_experiment_set(
        testapp, custset_w_exp1, pub1_data):
    # post single cust_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [custset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expres = testapp.get(custset_w_exp1['experiments_in_set'][0])
    assert 'produced_in_pub' in expres
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == expres.json['produced_in_pub']['@id']


def test_calculated_expt_produced_in_pub_for_two_experiment_set_to_one_pub(
        testapp, repset_w_exp1, custset_w_exp1, pub1_data):
    # post two exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id'], custset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    responses = [testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp']),
                 testapp.get(custset_w_exp1['experiments_in_set'][0])]
    for response in responses:
        assert 'produced_in_pub' in response
        assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']


def test_calculated_expt_produced_in_pub_for_two_experiment_set_two_pubs(
        testapp, repset_w_exp1, custset_w_exp2, pub1_data, pub2_data):
    # post different exp_set to each pub
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [custset_w_exp2['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    responses = [testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp']),
                 testapp.get(custset_w_exp2['experiments_in_set'][0])]
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == responses[0].json['produced_in_pub']['@id']
    assert 'produced_in_pub' not in responses[1].json


# GOT TO HERE SO FAR
def test_calculated_produced_in_pub_for_one_experiment_set_two_pubs(
        testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post one exp_set to two pubs - this one should pick up only the most recent pub
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'produced_in_pub' in response
    assert not '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']
    assert '/publications/' + pub2res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']


def test_calculated_publications_in_experiment_set_no_data(
        testapp, replicate_experiment_set, custom_experiment_set, pub1_data):
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    print(replicate_experiment_set)
    print(custom_experiment_set)
    assert not replicate_experiment_set['publications_of_set']
    assert not custom_experiment_set['publications_of_set']


def test_calculated_publications_in_rep_experiment_set_2_fields(
        testapp, replicate_experiment_set, pub1_data):
    # post single rep_exp_set to single pub both fields
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub1_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    print(response)
    print('JSON:', response.json)
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 1
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response.json['publications_of_set']


def test_calculated_publications_in_cust_experiment_set_used_in_field(
        testapp, custom_experiment_set, pub1_data):
    # post only used in publication one pub one exp set
    pub1_data['exp_sets_used_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(custom_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 1
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in response.json['publications_of_set']


def test_calculated_publications_in_rep_experiment_set_two_pubs_both_fields(
        testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post same experiment set to two pubs in either field
    pub1_data['exp_sets_prod_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 2
    publications = response.json['publications_of_set']
    publications = response.json['publications_of_set']
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in publications
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] in publications


def test_calculated_publications_in_rep_experiment_set_two_pubs_in_used(
        testapp, replicate_experiment_set, pub1_data, pub2_data):
    # post same experiment set to two pubs in used in pub field
    pub1_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub2_data['exp_sets_used_in_pub'] = [replicate_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(replicate_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 2
    publications = response.json['publications_of_set']
    assert '/publication/' + pub1res.json['@graph'][0]['uuid'] in publications
    assert '/publication/' + pub2res.json['@graph'][0]['uuid'] in publications


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
