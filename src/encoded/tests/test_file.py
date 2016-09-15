import pytest


def test_reference_file_by_md5(testapp, file):
    res = testapp.get('/md5:{md5sum}'.format(**file)).follow(status=200)
    assert res.json['@id'] == file['@id']


def test_replaced_file_not_uniqued(testapp, file):
    testapp.patch_json('/{uuid}'.format(**file), {'status': 'replaced'}, status=200)
    testapp.get('/md5:{md5sum}'.format(**file), status=404)


@pytest.fixture
def fastq(award, experiment, lab):
    return {
        'accession': '4DNFI067APU2',
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': 'fastq',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'in progress',
    }


def test_file_post_fastq(testapp, fastq):
    testapp.post_json('/file', fastq, status=201)



@pytest.fixture
def file(testapp, award, experiment, lab):

    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': 'tsv',
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.tsv',
        'status': 'in progress',
    }
    res = testapp.post_json('/file', item)
    return res.json['@graph'][0]


@pytest.fixture
def fastq_related_file(fastq):
    item = fastq.copy()
    item['related_files'] = [{'relationship_type': 'derived from',
                              'file' :fastq['accession']}]
    item['md5sum'] = '2123456789abcdef0123456789abcdef'
    item['accession'] = ''
    return item



def test_file_post_fastq_related(testapp, fastq, fastq_related_file):
    testapp.post_json('/file', fastq, status=201)
    fastq_related_res = testapp.post_json('/file', fastq_related_file, status=201)

    # when updating the last one we should have updated this one too
    fastq_res = testapp.get('/md5:{md5sum}'.format(**fastq)).follow(status=200)
    fastq_related_files = fastq_res.json['related_files']
    assert fastq_related_files == [{'file': fastq_related_res.json['@graph'][0]['@id'],
                                   'relationship_type': 'parent of'}]

