import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def file_data(lab, award, file_formats):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'file_format': file_formats.get('fastq').get('uuid'),
        'status': 'uploaded',
        'file_classification': 'raw file'
    }


@pytest.fixture
def expt_data(lab, award, human_biosample):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'in situ Hi-C'
    }


@pytest.fixture
def mic_data(lab, award, human_biosample):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'biosample': human_biosample['@id'],
        'experiment_type': 'DNA FISH'
    }


@pytest.fixture
def fastq(testapp, file_data):
    return testapp.post_json('/file_fastq', file_data).json['@graph'][0]


@pytest.fixture
def processed(testapp, file_data):
    file_data['file_classification'] = 'processed file'
    file_data['file_format'] = file_formats.get('bam').get('@id'),
    return testapp.post_json('/file_processed', file_data).json['@graph'][0]


def test_audit_experiments_have_raw_files_w_file(testapp, fastq, expt_data):
    expt_data['files'] = [fastq['@id']]
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(errors)


def test_audit_mic_exp_no_file(testapp, mic_data):
    expt = testapp.post_json('/experiment_mic', mic_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(errors)


def test_audit_experiments_have_raw_files_w_2rawfiles(testapp, fastq, file_data, expt_data):
    fastq2 = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    expt_data['files'] = [fastq['@id'], fastq2['@id']]
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(errors)


def test_audit_experiments_have_raw_files_no_files(testapp, expt_data):
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing data' for error in errors)
    assert any('Raw files are absent' in error['detail'] for error in errors)


def test_audit_experiments_have_raw_files_no_files_cap_c(testapp, expt_data):
    expt_data['experiment_type'] = 'capture Hi-C'
    expt = testapp.post_json('/experiment_capture_c', expt_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing data' for error in errors)
    assert any('Raw files are absent' in error['detail'] for error in errors)


def test_audit_experiments_have_raw_files_w_cooked_file(testapp, processed, expt_data):
    expt_data['files'] = [processed['@id']]
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing data' for error in errors)
    assert any('Raw files are absent' in error['detail'] for error in errors)


def test_audit_experiments_have_raw_files_w_raw_and_cooked_files(
        testapp, fastq, processed, expt_data):
    expt_data['files'] = [fastq['@id'], processed['@id']]
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
    res = testapp.get(expt['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(errors)


def test_audit_experiments_have_raw_files_w_file_based_on_file_status(
        testapp, expt_data, file_data):
    file_stati = ["uploading", "uploaded", "upload failed", "deleted", "replaced",
                  "revoked", "released", "released to project", "to be uploaded by workflow"]
    ok_stati = ['uploaded', 'released', 'submission in progress', 'released to project']
    for s in file_stati:
        file_data['status'] = s
        fq = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
        expt_data['files'] = [fq['@id']]
        expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
        res = testapp.get(expt['@id'] + '/@@audit-self')
        errors = res.json['audit']
        if s in ok_stati:
            assert not any(errors)
        else:
                assert any(error['category'] == 'missing data' for error in errors)
                assert any('Raw files are absent' in error['detail'] for error in errors)
