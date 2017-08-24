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


def test_audit_file_unpaired_ok(testapp, file_data):
    ff = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    res = testapp.get(ff['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(errors)


def test_audit_file_paired_ok(testapp, file_data):
    file_data['paired_end'] = "1"
    f1 = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    file_data['paired_end'] = "2"
    file_data['related_files'] = [{'relationship_type': 'paired with', 'file': f1['accession']}]
    f2 = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    res1 = testapp.get(f1['@id'] + '/@@audit-self')
    err1 = res1.json['audit']
    assert not any(err1)
    res2 = testapp.get(f2['@id'] + '/@@audit-self')
    err2 = res2.json['audit']
    assert not any(err2)


def test_audit_file_paired_missing_paired_end(testapp, file_data):
    f1 = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    file_data['paired_end'] = "2"
    file_data['related_files'] = [{'relationship_type': 'paired with', 'file': f1['accession']}]
    f2 = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    res1 = testapp.get(f1['@id'] + '/@@audit-self')
    err1 = res1.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in err1)
    assert any('relationship type paired with but no paired end info' in error['detail'] for error in err1)
    res2 = testapp.get(f2['@id'] + '/@@audit-self')
    err2 = res2.json['audit']
    assert not any(err2)


def test_audit_file_paired_missing_related_file(testapp, file_data):
    file_data['paired_end'] = "1"
    f1 = testapp.post_json('/file_fastq', file_data).json['@graph'][0]
    res1 = testapp.get(f1['@id'] + '/@@audit-self')
    err1 = res1.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in err1)
    assert any('paired end info but related file with relationship type paired with' in error['detail'] for error in err1)
