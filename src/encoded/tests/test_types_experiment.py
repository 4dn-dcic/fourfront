import pytest
import datetime
from encoded.types.experiment import ExperimentHiC
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


@pytest.fixture
def sop_map_data_2(lab, award):
        return {
            "sop_name": "Second in situ hic map",
            "sop_version": 2,
            'lab': lab['@id'],
            'award': award['@id'],
            "associated_item_type": "ExperimentHiC",
            "id_values": ["micro-C"],
            "notes": "This is a dummy second version of map",
            "description": "Second",
        }


def test_experiment_update_experiment_relation(testapp, base_experiment, experiment):
    relation = [{'relationship_type': 'controlled by',
                 'experiment': experiment['@id']}]
    res = testapp.patch_json(base_experiment['@id'], {'experiment_relation': relation})
    assert res.json['@graph'][0]['experiment_relation'] == relation

    # patching an experiement should also update the related experiement
    exp_res = testapp.get(experiment['@id'])
    exp_res_id = exp_res.json['experiment_relation'][0]['experiment']['@id']
    assert exp_res_id == base_experiment['@id']


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


def test_experiment_update_hic_sop_mapping_has_sop2no_when_only_sopmap_deleted(
        testapp, experiment_data, sop_map_data):
    sop_map_data['status'] = 'deleted'
    testapp.post_json('/sop_map', sop_map_data, status=201)
    res_exp = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res_exp.json['@graph'][0]
    assert res_exp.json['@graph'][0]['sop_mapping']['has_sop'] == "No"


def test_experiment_update_hic_sop_mapping_to_v2_when_2_versions(
        testapp, experiment_data, sop_map_data, sop_map_data_2):
    testapp.post_json('/sop_map', sop_map_data, status=201)
    res2chk = testapp.post_json('/sop_map', sop_map_data_2, status=201)
    res_exp = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res_exp.json['@graph'][0]
    assert res_exp.json['@graph'][0]['sop_mapping']['has_sop'] == "Yes"
    assert res_exp.json['@graph'][0]['sop_mapping']['sop_map'] == res2chk.json['@graph'][0]['@id']


def test_experiment_update_hic_sop_mapping_to_v1_when_v2_deleted(
        testapp, experiment_data, sop_map_data, sop_map_data_2):
    res2chk = testapp.post_json('/sop_map', sop_map_data, status=201)
    sop_map_data_2['status'] = 'deleted'
    testapp.post_json('/sop_map', sop_map_data_2, status=201)
    res_exp = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res_exp.json['@graph'][0]
    assert res_exp.json['@graph'][0]['sop_mapping']['has_sop'] == "Yes"
    assert res_exp.json['@graph'][0]['sop_mapping']['sop_map'] == res2chk.json['@graph'][0]['@id']


def test_experiment_update_hic_sop_map_not_added_when_already_present(testapp, experiment_data):
    experiment_data['sop_mapping'] = {}
    experiment_data['sop_mapping']['has_sop'] = 'No'
    res = testapp.post_json('/experiment_hi_c', experiment_data)
    assert 'sop_mapping' in res.json['@graph'][0]
    assert res.json['@graph'][0]['sop_mapping']['has_sop'] == "No"
    assert 'sop_map' not in res.json['@graph'][0]['sop_mapping']


def test_calculated_experiment_summary(testapp, experiment, mboI):
    summary = 'In situ Hi-C on GM12878 with MboI'
    res = testapp.patch_json(experiment['@id'], {'digestion_enzyme': mboI['@id']}, status=200)
    assert res.json['@graph'][0]['experiment_summary'] == summary


# test for experiment_set_replicate _update function
def test_experiment_set_replicate_update_adds_experiments_in_set(testapp, experiment, replicate_experiment_set):
    assert not replicate_experiment_set['experiments_in_set']
    res = testapp.patch_json(
        replicate_experiment_set['@id'],
        {'replicate_exps':
            [{'replicate_exp': experiment['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1}]},
        status=200)
    assert experiment['@id'] in res.json['@graph'][0]['experiments_in_set']


# test for default_embedding practice with embedded list
# this test should change should any of the reference embeds below be altered
def test_experiment_set_default_embedded_list(registry):
    from snovault import TYPES
    exp_data = {
        'experiment_type': 'micro-C',
        'status': 'in review by lab'
    }
    # create experimentHiC obj; _update (and by extension, add_default_embeds)
    # are called automatically
    test_exp = ExperimentHiC.create(registry, None, exp_data)
    #call reify embedded property (defined in snovault/resources.py)
    embedded = test_exp.embedded
    embedded_list = test_exp.embedded_list
    type_info_embedded = registry[TYPES]['experiment_hi_c'].embedded_list
    assert type_info_embedded == embedded_list
    if 'produced_in_pub.*' in embedded_list:
        assert 'produced_in_pub.*' in embedded
        assert 'produced_in_pub.award.link_id' in embedded
        assert 'produced_in_pub.award.display_title' in embedded
        assert 'produced_in_pub.award.uuid' in embedded
    assert 'experiment_sets.accession' in embedded_list
    assert 'experiment_sets.link_id' in embedded
    assert 'experiment_sets.display_title' in embedded
    assert 'experiment_sets.uuid' in embedded


# tests for the experiment_sets calculated properties
def test_calculated_experiment_sets_for_custom_experiment_set(testapp, experiment, custom_experiment_set):
    assert len(experiment['experiment_sets']) == 0
    res = testapp.patch_json(custom_experiment_set['@id'], {'experiments_in_set': [experiment['@id']]}, status=200)
    expt_res = testapp.get(experiment['@id'])
    assert custom_experiment_set['uuid'] == expt_res.json['experiment_sets'][0]['uuid']


def test_calculated_experiment_sets_for_replicate_experiment_set(testapp, experiment, replicate_experiment_set):
    assert len(experiment['experiment_sets']) == 0
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
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' in expsetres.json['produced_in_pub'].values()


def test_calculated_produced_in_pub_for_cust_experiment_set(testapp, custom_experiment_set, pub1_data):
    # post single cust_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expsetres = testapp.get(custom_experiment_set['@id'])
    assert 'produced_in_pub' in expsetres
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' in expsetres.json['produced_in_pub'].values()


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
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' in response.json['publications_of_set'][0].values()


def test_calculated_publications_in_cust_experiment_set_used_in_field(
        testapp, custom_experiment_set, pub1_data):
    # post only used in publication one pub one exp set
    pub1_data['exp_sets_used_in_pub'] = [custom_experiment_set['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(custom_experiment_set['@id'])
    assert 'publications_of_set' in response
    assert len(response.json['publications_of_set']) == 1
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' in response.json['publications_of_set'][0].values()


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
    combined_pub_vals = [p['@id'] for p in publications]
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' in combined_pub_vals
    assert '/publications/' + pub2res.json['@graph'][0]['uuid'] + '/' in combined_pub_vals


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
    combined_pub_vals = list(publications[0].values()) + list(publications[1].values())
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' in combined_pub_vals
    assert '/publications/' + pub2res.json['@graph'][0]['uuid'] + '/' in combined_pub_vals


# experiment pub calculated properties tests


@pytest.fixture
def repset_w_exp1(testapp, replicate_experiment_set_data, experiment):
    repset = replicate_experiment_set_data
    repset['replicate_exps'] = [{'replicate_exp': experiment['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1}]
    return testapp.post_json('/experiment_set_replicate', repset).json['@graph'][0]


@pytest.fixture
def experiment2(testapp, experiment_data):
    experiment_data['experiment_type'] = 'capture Hi-C'
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
    # import pdb; pdb.set_trace()
    assert 'produced_in_pub' in expres
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == expres.json['produced_in_pub']['@id']


def test_calculated_expt_produced_in_pub_for_expt_w_ref(
        testapp, experiment_data, replicate_experiment_set_data, pub2_data, publication):
    experiment_data['references'] = [publication['@id']]
    # just check experiment by itself first
    expt = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    assert 'produced_in_pub' in expt
    assert publication['@id'] == '/publications/' + expt['produced_in_pub'] + '/'
    # post repset with this experiment
    replicate_experiment_set_data['replicate_exps'] = [{'bio_rep_no': 1, 'tec_rep_no': 1, 'replicate_exp': expt['@id']}]
    repset = testapp.post_json('/experiment_set_replicate', replicate_experiment_set_data, status=201).json['@graph'][0]
    # post single rep_exp_set to single pub
    pub2_data['exp_sets_prod_in_pub'] = [repset['@id']]
    testapp.post_json('/publication', pub2_data, status=201)
    expinset = testapp.get(repset['replicate_exps'][0]['replicate_exp']).json
    assert 'produced_in_pub' in expinset
    assert publication['@id'] == expinset['produced_in_pub']['@id']


def test_calculated_expt_produced_in_pub_for_cust_experiment_set(
        testapp, custset_w_exp1, pub1_data):
    # post single cust_exp_set to single pub
    pub1_data['exp_sets_prod_in_pub'] = [custset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    expres = testapp.get(custset_w_exp1['experiments_in_set'][0])
    assert 'produced_in_pub' not in expres.json.keys()


def test_calculated_expt_produced_in_pub_for_one_expt_in_two_expset_one_pub(
        testapp, repset_w_exp1, custset_w_exp1, pub1_data):
    # post two exp_set with same experiment (repset and custset) to single pub
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id'], custset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    # both responses will get the same experiment
    responses = [testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp']),
                 testapp.get(custset_w_exp1['experiments_in_set'][0])]
    for response in responses:
        assert 'produced_in_pub' in response
        assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']


def test_calculated_expt_produced_in_pub_for_two_exp_two_expset_two_pubs(
        testapp, repset_w_exp1, custset_w_exp2, pub1_data, pub2_data):
    # post 2 exp_set (one repset, one custom) each with diff expt to each pub
    # only expt in repset should get the pub of repset
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [custset_w_exp2['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    testapp.post_json('/publication', pub2_data, status=201)
    responses = [testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp']),
                 testapp.get(custset_w_exp2['experiments_in_set'][0])]
    assert '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == responses[0].json['produced_in_pub']['@id']
    assert 'produced_in_pub' not in responses[1].json


def test_calculated_expt_produced_in_pub_for_one_expt_one_expset_two_pubs(
        testapp, repset_w_exp1, pub1_data, pub2_data):
    # post one exp_set to two pubs - this one should pick up only the most recent pub
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub2_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    response = testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp'])
    assert 'produced_in_pub' in response
    assert not '/publications/' + pub1res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']
    assert '/publications/' + pub2res.json['@graph'][0]['uuid'] + '/' == response.json['produced_in_pub']['@id']


def test_calculated_publications_in_experiment_no_data(
        testapp, repset_w_exp1, custset_w_exp2, pub1_data):
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    responses = [testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp']),
                 testapp.get(custset_w_exp2['experiments_in_set'][0])]
    for response in responses:
        assert response.json['publications_of_exp'] == []


def test_calculated_publications_in_expt_w_repset_in_both_fields(
        testapp, repset_w_exp1, pub1_data):
    # post single rep_exp_set to single pub both fields
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub1_data['exp_sets_used_in_pub'] = [repset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp'])
    assert 'publications_of_exp' in response
    assert len(response.json['publications_of_exp']) == 1
    assert pub1res.json['@graph'][0]['uuid'] == response.json['publications_of_exp'][0]['uuid']


def test_calculated_publications_in_expt_w_custset_used_in_field(
        testapp, custset_w_exp2, pub1_data):
    # post only used in publication one pub one exp set
    pub1_data['exp_sets_used_in_pub'] = [custset_w_exp2['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    response = testapp.get(custset_w_exp2['experiments_in_set'][0])
    assert 'publications_of_exp' in response
    assert len(response.json['publications_of_exp']) == 1
    assert pub1res.json['@graph'][0]['uuid'] == response.json['publications_of_exp'][0]['uuid']


def test_calculated_publications_in_expt_w_repset_two_pubs_both_fields(
        testapp, repset_w_exp1, pub1_data, pub2_data):
    # post same experiment set to two pubs in either field
    pub1_data['exp_sets_prod_in_pub'] = [repset_w_exp1['@id']]
    pub2_data['exp_sets_used_in_pub'] = [repset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    pubuuids = [pub1res.json['@graph'][0]['uuid']]
    pubuuids.append(pub2res.json['@graph'][0]['uuid'])
    response = testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp'])
    assert 'publications_of_exp' in response
    assert len(response.json['publications_of_exp']) == 2
    publications = response.json['publications_of_exp']
    for pub in publications:
        assert pub['uuid'] in pubuuids


def test_calculated_publications_in_expt_w_repset_two_pubs_in_used(
        testapp, repset_w_exp1, pub1_data, pub2_data):
    # post same experiment set to two pubs in used in pub field
    pub1_data['exp_sets_used_in_pub'] = [repset_w_exp1['@id']]
    pub2_data['exp_sets_used_in_pub'] = [repset_w_exp1['@id']]
    pub1res = testapp.post_json('/publication', pub1_data, status=201)
    pub2res = testapp.post_json('/publication', pub2_data, status=201)
    pubuuids = [pub1res.json['@graph'][0]['uuid']]
    pubuuids.append(pub2res.json['@graph'][0]['uuid'])
    response = testapp.get(repset_w_exp1['replicate_exps'][0]['replicate_exp'])
    assert 'publications_of_exp' in response
    assert len(response.json['publications_of_exp']) == 2
    publications = response.json['publications_of_exp']
    for pub in publications:
        assert pub['uuid'] in pubuuids


def test_calculated_no_of_expts_in_set_w_no_exps(empty_replicate_set):
    assert 'number_of_experiments' not in empty_replicate_set


def test_calculated_no_of_expts_in_set_w_2_exps(two_experiment_replicate_set):
    assert two_experiment_replicate_set['number_of_experiments'] == 2


# tests for category calculated_property
@pytest.fixture
def target_w_prot(testapp, lab, award):
    item = {
        'description': "Protein target",
        'targeted_proteins': ['CTCF (ABCD)'],
        'award': award['@id'],
        'lab': lab['@id'],
    }
    return testapp.post_json('/target', item).json['@graph'][0]


@pytest.fixture
def exp_w_target_info(lab, award, human_biosample,
                      mboI, target_w_region):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'capture Hi-C',
        'targeted_regions': [{'target': target_w_region['@id']}]
    }


@pytest.fixture
def expt_w_targ_region(testapp, exp_w_target_info):
    return testapp.post_json('/experiment_capture_c', exp_w_target_info).json['@graph'][0]


@pytest.fixture
def expt_w_2_targ_regions(testapp, exp_w_target_info, another_target_w_region):
    region = {'target': another_target_w_region['@id']}
    exp_w_target_info['targeted_regions'].append(region)
    return testapp.post_json('/experiment_capture_c', exp_w_target_info).json['@graph'][0]


@pytest.fixture
def expt_w_target(testapp, lab, award, human_biosample,
                  mboI, target_w_prot):
    item = {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'ChIA-PET',
        'targeted_factor': target_w_prot['@id']
    }
    return testapp.post_json('/experiment_chiapet', item).json['@graph'][0]


@pytest.fixture
def repliseq_info(lab, award, human_biosample):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'Repli-seq',
    }


@pytest.fixture
def repliseq_1(testapp, repliseq_info):
    return testapp.post_json('/experiment_repliseq', repliseq_info).json['@graph'][0]


@pytest.fixture
def repliseq_2(testapp, repliseq_info):
    repliseq_info['stage_fraction'] = 'early'
    return testapp.post_json('/experiment_repliseq', repliseq_info).json['@graph'][0]


@pytest.fixture
def repliseq_3(testapp, repliseq_info):
    repliseq_info['stage_fraction'] = 'early'
    repliseq_info['total_fractions_in_exp'] = 16
    return testapp.post_json('/experiment_repliseq', repliseq_info).json['@graph'][0]


@pytest.fixture
def damid_no_fusion(testapp, repliseq_info):
    repliseq_info['experiment_type'] = 'DAM-ID seq'
    return testapp.post_json('/experiment_damid', repliseq_info).json['@graph'][0]


@pytest.fixture
def damid_w_fusion(testapp, repliseq_info, target_w_prot):
    repliseq_info['experiment_type'] = 'DAM-ID seq'
    repliseq_info['targeted_factor'] = target_w_prot['@id']
    return testapp.post_json('/experiment_damid', repliseq_info).json['@graph'][0]


@pytest.fixture
def basic_info(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
    }


@pytest.fixture
def imaging_path_1(testapp, basic_info, target_w_region):
    basic_info['target'] = [target_w_region['@id']]
    basic_info['labeled_probe'] = 'FITC goat anti rabbit'
    return testapp.post_json('/imaging_path', basic_info).json['@graph'][0]


@pytest.fixture
def imaging_path_2(testapp, basic_info, target_w_region):
    basic_info['target'] = [target_w_region['@id']]
    basic_info['labeled_probe'] = 'TRITC horse anti rabbit'
    return testapp.post_json('/imaging_path', basic_info).json['@graph'][0]


@pytest.fixture
def imaging_path_3(testapp, basic_info, target_w_desc):
    basic_info['target'] = [target_w_desc['@id']]
    basic_info['labeled_probe'] = 'DAPI'
    return testapp.post_json('/imaging_path', basic_info).json['@graph'][0]


@pytest.fixture
def microscopy_no_path(testapp, repliseq_info):
    repliseq_info['experiment_type'] = "Immunofluorescence"
    return testapp.post_json('/experiment_mic', repliseq_info).json['@graph'][0]


@pytest.fixture
def microscopy_w_path(testapp, repliseq_info, imaging_path_1):
    repliseq_info['experiment_type'] = "Immunofluorescence"
    img_path = {'path': imaging_path_1['@id'], 'channel': 'ch01'}
    repliseq_info['imaging_paths'] = [img_path]
    return testapp.post_json('/experiment_mic', repliseq_info).json['@graph'][0]


@pytest.fixture
def microscopy_w_multipath(testapp, repliseq_info, imaging_path_1, imaging_path_2,
                           imaging_path_3):
    repliseq_info['experiment_type'] = "Immunofluorescence"
    img_path1 = {'path': imaging_path_1['@id'], 'channel': 'ch01'}
    img_path2 = {'path': imaging_path_2['@id'], 'channel': 'ch02'}
    img_path3 = {'path': imaging_path_3['@id'], 'channel': 'ch03'}
    repliseq_info['imaging_paths'] = [img_path1, img_path2, img_path3]
    return testapp.post_json('/experiment_mic', repliseq_info).json['@graph'][0]


def test_experiment_categorizer_4_mic_no_path(testapp, microscopy_no_path):
    assert microscopy_no_path['experiment_categorizer']['field'] == 'Default'
    assert microscopy_no_path['experiment_categorizer'].get('value') is None


def test_experiment_categorizer_4_mic_w_path(testapp, microscopy_w_path, target_w_region):
    assert microscopy_w_path['experiment_categorizer']['field'] == 'Target'
    assert microscopy_w_path['experiment_categorizer']['value'] == target_w_region['target_summary']


def test_experiment_categorizer_4_mic_w_multi_path(testapp, microscopy_w_multipath, target_w_region, target_w_desc):
    vals2chk = [target_w_region['target_summary'], target_w_desc['target_summary']]
    len2chk = len(vals2chk[0]) + len(vals2chk[1]) + 2
    assert microscopy_w_multipath['experiment_categorizer']['field'] == 'Target'
    value = microscopy_w_multipath['experiment_categorizer']['value']
    assert len(value) == len2chk
    for v in vals2chk:
        assert v in value


def test_experiment_categorizer_4_chiapet_no_fusion(testapp, repliseq_info):
    repliseq_info['experiment_type'] = 'ChIA-PET'
    res = testapp.post_json('/experiment_chiapet', repliseq_info).json['@graph'][0]
    assert res['experiment_categorizer']['field'] == 'Default'
    assert res['experiment_categorizer']['value'] is None


def test_experiment_categorizer_4_damid_no_fusion(testapp, damid_no_fusion):
    assert damid_no_fusion['experiment_categorizer']['field'] == 'Target'
    assert damid_no_fusion['experiment_categorizer'].get('value') == 'None (Control)'


def test_experiment_categorizer_4_damid_w_fusion(testapp, damid_w_fusion, target_w_prot):
    assert damid_w_fusion['experiment_categorizer']['field'] == 'Target'
    assert damid_w_fusion['experiment_categorizer']['value'] == target_w_prot['display_title']


def test_experiment_categorizer_4_repliseq_no_fraction_info(testapp, repliseq_1):
    # import pdb; pdb.set_trace()
    assert repliseq_1['experiment_categorizer']['field'] == 'Default'
    assert repliseq_1['experiment_categorizer'].get('value') is None


def test_experiment_categorizer_4_repliseq_only_fraction(testapp, repliseq_2):
    wanted = 'early of an unspecified number of fractions'
    assert repliseq_2['experiment_categorizer']['field'] == 'Fraction'
    assert repliseq_2['experiment_categorizer']['value'] == wanted


def test_experiment_categorizer_4_repliseq_fraction_and_total(testapp, repliseq_3):
    wanted = 'early of 16 fractions'
    assert repliseq_3['experiment_categorizer']['field'] == 'Fraction'
    assert repliseq_3['experiment_categorizer']['value'] == wanted


def test_experiment_categorizer_w_target(testapp, expt_w_target, target_w_prot):
    assert expt_w_target['experiment_categorizer']['field'] == 'Target'
    assert expt_w_target['experiment_categorizer']['value'] == target_w_prot['display_title']


def test_experiment_categorizer_w_enzyme(testapp, experiment, mboI):
    assert experiment['experiment_categorizer']['field'] == 'Enzyme'
    assert experiment['experiment_categorizer']['value'] == mboI['display_title']


def test_experiment_categorizer_w_target_and_enzyme(testapp, expt_w_target, target_w_prot, mboI):
    # import pdb; pdb.set_trace()
    res = testapp.patch_json(expt_w_target['@id'], {'digestion_enzyme': mboI['@id']}).json['@graph'][0]
    assert res['digestion_enzyme'] == mboI['@id']
    assert res['experiment_categorizer']['field'] == 'Target'
    assert res['experiment_categorizer']['value'] == target_w_prot['display_title']


def test_experiment_categorizer_w_no_cat1(testapp, experiment_data):
    del experiment_data['digestion_enzyme']
    experiment_data['experiment_type'] = 'RNA-seq'
    expt = testapp.post_json('/experiment_seq', experiment_data).json['@graph'][0]
    assert expt['experiment_categorizer']['field'] == 'Default'
    assert expt['experiment_categorizer'].get('value') is None


def test_experiment_categorizer_cap_c_no_regions(testapp, experiment_data, mboI):
    experiment_data['experiment_type'] = 'capture Hi-C'
    expt = testapp.post_json('/experiment_capture_c', experiment_data).json['@graph'][0]
    assert expt['experiment_categorizer']['field'] == 'Enzyme'
    assert expt['experiment_categorizer']['value'] == mboI['display_title']


def test_experiment_categorizer_cap_c_w_region(expt_w_targ_region, target_w_region):
    assert expt_w_targ_region['experiment_categorizer']['field'] == 'Target'
    assert expt_w_targ_region['experiment_categorizer']['value'] == target_w_region['target_summary']


def test_experiment_categorizer_cap_c_w_2regions(
        expt_w_2_targ_regions, target_w_region, another_target_w_region):
    wanted = ', '.join(sorted([target_w_region['target_summary'], another_target_w_region['target_summary']]))
    assert expt_w_2_targ_regions['experiment_categorizer']['field'] == 'Target'
    assert expt_w_2_targ_regions['experiment_categorizer']['value'] == wanted
