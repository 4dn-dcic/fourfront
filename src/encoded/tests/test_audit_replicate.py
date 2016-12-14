import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def rep_set_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'Test replicate set',
    }


@pytest.fixture
def experiment_data(lab, award, human_biosample):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
    }


@pytest.fixture
def empty_replicate_set(testapp, rep_set_data):
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def experiment_1(testapp, experiment_data):
    return testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]


@pytest.fixture
def experiment_2(testapp, experiment_data):
    return testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]


@pytest.fixture
def experiments(testapp, experiment_data):
    expts = []
    for i in range(4):
        experiment_data['description'] = 'Experiment ' + str(i)
        expts.append(testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0])
    return expts


@pytest.fixture
def one_experiment_replicate_set(testapp, rep_set_data, experiment_1):
    rep_set_data['description'] = 'One Experiment Replicate Set'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiment_1['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1}
    ]
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def two_experiment_replicate_set(testapp, rep_set_data, experiment_1, experiment_2):
    rep_set_data['description'] = 'Two one BioRep Experiment Replicate Set'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiment_1['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1},
        {'replicate_exp': experiment_2['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 2}
    ]
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def out_of_sequence_experiment_replicate_set(testapp, rep_set_data, experiments):
    rep_set_data['description'] = 'Out of Sequence Replicate Set'
    replicates = []
    for i, exp in enumerate(experiments):
        if i % 2 == 0:
            bio = i + 1
            tec = 1
        else:
            tec = 3
        replicates.append({'replicate_exp': exp['@id'], 'bio_rep_no': bio, 'tec_rep_no': tec})
    rep_set_data['replicate_exps'] = replicates
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


def test_audit_replicate_set_no_audit_if_no_replicates(testapp, empty_replicate_set):
    res = testapp.get(empty_replicate_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(errors)


def test_audit_replicate_set_warning_if_one_experiment(testapp, one_experiment_replicate_set):
    res = testapp.get(one_experiment_replicate_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing replicate' for error in errors)


def test_audit_replicate_set_warning_if_one_biorep(testapp, two_experiment_replicate_set):
    res = testapp.get(two_experiment_replicate_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing replicate' for error in errors)


def test_audit_replicate_set_warning_if_out_of_sequence(testapp, out_of_sequence_experiment_replicate_set):
    res = testapp.get(out_of_sequence_experiment_replicate_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing replicate' for error in errors)
    assert any('biological replicate numbers are not in sequence' in error['detail'] for error in errors)
    assert any('technical replicate numbers for bioreplicate number' in error['detail'] for error in errors)
