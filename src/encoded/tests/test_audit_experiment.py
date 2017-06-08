import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def file_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'file_format': 'fastq',
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
def fastq(testapp, file_data):
    return testapp.post_json('/file_fastq', file_data).json['@graph'][0]


@pytest.fixture
def processed(testapp, file_data):
    file_data['file_classification'] = 'processed file'
    file_data['file_format'] = 'bam'
    return testapp.post_json('/file_processed', file_data).json['@graph'][0]


def test_audit_experiments_have_raw_files_w_file(testapp, fastq, expt_data):
    expt_data['files'] = [fastq['@id']]
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
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
    etypes = ['experiment_hi_c', 'experiment_capture_c', 'experiment_repliseq', 'experiment_mic']
    frame = ['files', 'files.files']
    from snovault.auditor import Auditor
    auditor = Auditor()
    from encoded.audit.experiment import audit_experiments_have_raw_files
    for ty in etypes:
        auditor.add_audit_checker(audit_experiments_have_raw_files, ty, frame)

    import pdb; pdb.set_trace()
    expt = testapp.post_json('/experiment_hi_c', expt_data).json['@graph'][0]
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
