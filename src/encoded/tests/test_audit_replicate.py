import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def biosample_cell_culture_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'culture_start_date': '2016-01-01',
        'culture_harvest_date': '2016-01-15',
        'culture_duration': 15,
        'culture_duration_units': 'days',
        'passage_number': 1
    }


@pytest.fixture
def biosample_cell_culture1(testapp, biosample_cell_culture_data):
    return testapp.post_json('/biosample_cell_culture', biosample_cell_culture_data).json['@graph'][0]


@pytest.fixture
def biosample_cell_culture2(testapp, biosample_cell_culture_data):
    biosample_cell_culture_data['culture_harvest_date'] = '2016-01-16'
    return testapp.post_json('/biosample_cell_culture', biosample_cell_culture_data).json['@graph'][0]


@pytest.fixture
def biosample_data(human_biosource, lab, award):
    return {
        'description': "GM12878 prepared for Hi-C",
        'biosource': [human_biosource['@id'], ],
        'award': award['@id'],
        'lab': lab['@id'],
    }


@pytest.fixture
def biosample0(testapp, biosample_data):
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def biosample1(testapp, biosample_data, biosample_cell_culture1):
    biosample_data['description'] = 'GM12878 second prep'
    biosample_data['cell_culture_details'] = biosample_cell_culture1['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def biosample2(testapp, biosample_data, biosample_cell_culture2):
    biosample_data['description'] = 'GM12878 third prep'
    biosample_data['cell_culture_details'] = biosample_cell_culture2['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def biosamples4rep_set(biosample0, biosample1, biosample2):
    return [biosample0, biosample1, biosample2, biosample2]


@pytest.fixture
def fastq_files(testapp, lab, award):
    files = []
    for i in range(4):
        item = {
            'file_format': 'fastq',
            'lab': lab['@id'],
            'award': award['@id']
        }
        files.append(testapp.post_json('/file_fastq', item).json['@graph'][0])
    return files


@pytest.fixture
def experiment_data(lab, award, human_biosample, mboI):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'micro-C',
        'digestion_enzyme': mboI['@id']
    }


@pytest.fixture
def experiments(testapp, experiment_data):
    expts = []
    for i in range(4):
        experiment_data['description'] = 'Experiment ' + str(i)
        expts.append(testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0])
    return expts


@pytest.fixture
def bs_f_experiments(testapp, experiment_data, biosamples4rep_set, fastq_files):
    expts = []
    for i in range(4):
        experiment_data['description'] = 'Experiment ' + str(i)
        if i == 3:
            experiment_data['biosample'] = biosamples4rep_set[i - 1]['@id']
        else:
            experiment_data['biosample'] = biosamples4rep_set[i]['@id']
        experiment_data['files'] = [fastq_files[i]['@id']]
        expts.append(testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0])
    return expts


@pytest.fixture
def rep_set_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'Test replicate set',
    }


@pytest.fixture
def empty_replicate_set(testapp, rep_set_data):
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def one_experiment_replicate_set(testapp, rep_set_data, experiments):
    rep_set_data['description'] = 'One Experiment Replicate Set'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiments[0]['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1}
    ]
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def two_experiment_replicate_set(testapp, rep_set_data, experiments):
    rep_set_data['description'] = 'Two one BioRep Experiment Replicate Set'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiments[0]['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1},
        {'replicate_exp': experiments[1]['@id'],
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


@pytest.fixture
def valid_replicate_set(testapp, rep_set_data, bs_f_experiments):
    rep_set_data['description'] = 'Repset with consistent experiments'
    replicates = []
    for i, exp in enumerate(bs_f_experiments):
        if i == 3:
            bio = i - 1
            tec = 2
        else:
            bio = i
            tec = 1
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


def test_audit_replicate_set_no_warning_if_in_sequence(testapp, valid_replicate_set):
    res = testapp.get(valid_replicate_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing replicate' for error in errors)


def test_audit_replicate_set_consistency_check(testapp, valid_replicate_set):
    res = testapp.get(valid_replicate_set['@id'] + '/@@audit-self')
    print(res)
    assert False
