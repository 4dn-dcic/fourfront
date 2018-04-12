import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def external_award(testapp):
    item = {
        'name': 'some-award',
        'description': 'test award',
        'project': 'External'
    }
    return testapp.post_json('/award', item).json['@graph'][0]


@pytest.fixture
def biosample_cell_culture_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'culture_start_date': '2016-01-01',
        'culture_harvest_date': '2016-01-15',
        'culture_duration': 15,
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
def one_experiment_replicate_set(testapp, rep_set_data, experiments):
    rep_set_data['description'] = 'One Experiment Replicate Set'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiments[0]['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1}
    ]
    return testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]


@pytest.fixture
def external_exp_set(testapp, rep_set_data, experiments, external_award):
    rep_set_data['description'] = 'External Experiment Set no pub'
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': experiments[0]['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1}
    ]
    rep_set_data['award'] = external_award['@id']
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


@pytest.fixture
def invalid_replicate_sets(testapp, rep_set_data, experiment_data, fastq_files,
                           biosample_data, F123_biosource, biosample_cell_culture_data):
    # set up biosamples and biosample cell culture details for use in experiments
    b_c_c = []
    biosample = []
    experiment = []
    for i in range(4):
        experiment_data['description'] = 'experiment_' + str(i)
        experiment_data['files'] = [fastq_files[i]['@id']]
        experiment_data['tagging_method'] = 'tag_0'
        if i < 2:
            # change the experiment tagging method string leaving everything else same
            experiment_data['tagging_method'] = 'tag_' + str(i)
            biosample_cell_culture_data['differentiation_state'] = 'state' + str(i)
            b_c_c.append(testapp.post_json('/biosample_cell_culture', biosample_cell_culture_data).json['@graph'][0])
            if i == 0:  # we only need to make one biosample in the first 2 iterations
                biosample_data['cell_culture_details'] = b_c_c[0]['@id']
                biosample.append(testapp.post_json('/biosample', biosample_data).json['@graph'][0])
            experiment_data['biosample'] = biosample[0]['@id']
        elif i == 2:  # make a new biosample with different biosource
            biosample_data['biosource'] = [F123_biosource['@id']]
            biosample_data['cell_culture_details'] = b_c_c[0]['@id']
            biosample.append(testapp.post_json('/biosample', biosample_data).json['@graph'][0])
            experiment_data['biosample'] = biosample[1]['@id']
        else:  # make third biosample with different cell_culture_details
            biosample_data['cell_culture_details'] = b_c_c[1]['@id']
            biosample.append(testapp.post_json('/biosample', biosample_data).json['@graph'][0])
            experiment_data['biosample'] = biosample[2]['@id']
        experiment.append(testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0])

    rep_sets = []
    for i in range(1, 4):
        replicates = []
        rep_set_data['description'] = 'rep set ' + str(i)
        replicates.append({'replicate_exp': experiment[0]['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1})
        replicates.append({'replicate_exp': experiment[i]['@id'], 'bio_rep_no': 2, 'tec_rep_no': 1})
        rep_set_data['replicate_exps'] = replicates
        rep_sets.append(testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0])
    return rep_sets


@pytest.fixture
def more_invalid_replicate_sets(testapp, rep_set_data, experiment_data, fastq_files,
                           biosample_data, F123_biosource, biosample_cell_culture_data):
    # set up biosamples and biosample cell culture details for use in experiments
    b_c_c = []
    biosample = []
    experiment = []
    for i in range(4):
        experiment_data['description'] = 'experiment_' + str(i)
        experiment_data['files'] = [fastq_files[i]['@id']]
        experiment_data['tagging_method'] = 'tag_0'
        if i < 2:
            # change the experiment tagging method string leaving everything else same
            experiment_data['tagging_method'] = 'tag_' + str(i)
            experiment_data['average_fragment_size'] = 200
            biosample_cell_culture_data['differentiation_state'] = 'state' + str(i)
            b_c_c.append(testapp.post_json('/biosample_cell_culture', biosample_cell_culture_data).json['@graph'][0])
            if i == 0:  # we only need to make one biosample in the first 2 iterations
                biosample_data['cell_culture_details'] = b_c_c[0]['@id']
                biosample.append(testapp.post_json('/biosample', biosample_data).json['@graph'][0])
            experiment_data['biosample'] = biosample[0]['@id']
        elif i == 2:  # make a new biosample with different biosource
            experiment_data['average_fragment_size'] = 201
        else:  # make third biosample with different cell_culture_details
            experiment_data['average_fragment_size'] = 201
            biosample_data['biosource'] = [F123_biosource['@id']]
            biosample_data['cell_culture_details'] = b_c_c[0]['@id']
            biosample.append(testapp.post_json('/biosample', biosample_data).json['@graph'][0])
            experiment_data['biosample'] = biosample[1]['@id']
        experiment.append(testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0])

    rep_sets = []
    for i in range(1, 4):
        replicates = []
        rep_set_data['description'] = 'rep set ' + str(i)
        replicates.append({'replicate_exp': experiment[0]['@id'], 'bio_rep_no': 1, 'tec_rep_no': 1})
        replicates.append({'replicate_exp': experiment[i]['@id'], 'bio_rep_no': 2, 'tec_rep_no': 1})
        rep_set_data['replicate_exps'] = replicates
        rep_sets.append(testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0])
    return rep_sets


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
    errors = res.json['audit']
    assert not any(errors)


def test_audit_replicate_set_inconsistency_checks(testapp, invalid_replicate_sets):
    #import pdb; pdb.set_trace()
    for i, rep in enumerate(invalid_replicate_sets):
        res = testapp.get(rep['@id'] + '/@@audit-self')
        errors = res.json['audit']
        print(errors)
        assert any(error['category'] == 'inconsistent replicate data' for error in errors)
        if i == 0:
            assert any('Experiment field' in error['detail'] for error in errors)
        elif i == 1:
            assert any('Biosample field' in error['detail'] for error in errors)
        else:
            assert any('Cell Culture Detail field' in error['detail'] for error in errors)

def test_audit_more_replicate_set_inconsistency_checks(testapp, more_invalid_replicate_sets):
    #import pdb; pdb.set_trace()
    for i, rep in enumerate(more_invalid_replicate_sets):
        res = testapp.get(rep['@id'] + '/@@audit-self')
        errors = res.json['audit']
        print(errors)
        assert any(error['category'] == 'inconsistent replicate data' for error in errors)
        if i == 0:
            assert any('Experiment field' in error['detail'] for error in errors)
        elif i == 1:
            assert len(errors) == 1
            assert errors[0]['level_name'] == 'WARNING'
        else:
            assert any('Biosample field' in error['detail'] for error in errors)
            assert any(error['level_name'] == 'ERROR' for error in errors)
            assert 'WARNING' not in [error['level_name'] for error in errors]


def test_audit_external_experiment_set_no_pub_warns(testapp, external_exp_set):
    res = testapp.get(external_exp_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)
    assert any(error['detail'].startswith('External ExperimentSet') for error in errors)


def test_audit_external_experiment_set_w_pub_no_warn(testapp, external_exp_set, publication):
    testapp.patch_json(publication['@id'], {'exp_sets_prod_in_pub': [external_exp_set['@id']]}, status=200)
    res = testapp.get(external_exp_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_project_experiment_set_wo_pub_no_warn(testapp, one_experiment_replicate_set):
    res = testapp.get(one_experiment_replicate_set['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)
