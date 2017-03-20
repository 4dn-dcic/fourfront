import pytest
from encoded.types.file import File, FileFastq, FileFasta, post_upload
from pyramid.httpexceptions import HTTPForbidden
pytestmark = pytest.mark.working


def test_reference_file_by_md5(testapp, file):
    res = testapp.get('/md5:{md5sum}'.format(**file)).follow(status=200)
    assert res.json['@id'] == file['@id']


def test_replaced_file_not_uniqued(testapp, file):
    testapp.patch_json('/{uuid}'.format(**file), {'status': 'replaced'}, status=200)
    testapp.get('/md5:{md5sum}'.format(**file), status=404)


@pytest.fixture
def fastq_json(award, experiment, lab):
    return {
        'accession': '4DNFI067APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': 'fastq',
        'filename': 'test.fastq.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploaded',
    }


@pytest.fixture
def fasta_json(award, experiment, lab):
    return {
        'accession': '4DNFI067APA2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': 'fasta',
        'filename': 'test.fasta.gz',
        'md5sum': '0123456789abcdef0123456789111111',
        'status': 'uploaded',
    }


@pytest.fixture
def all_file_jsons(fastq_json, fasta_json):
    return [fastq_json, fasta_json]


@pytest.fixture
def related_files(all_file_jsons):
    r_files = []
    for f in all_file_jsons:
        item = f.copy()
        item['related_files'] = [{'relationship_type': 'derived from',
                                  'file': f['accession']}]
        item['md5sum'] = '2123456789abcdef0123456789abcdef'
        item['accession'] = ''
        r_files.append(item)
    return(zip(all_file_jsons, r_files))


def test_file_post_all(testapp, all_file_jsons):
    for f in all_file_jsons:
        file_url = '/file_' + f['file_format']
        testapp.post_json(file_url, f, status=201)


@pytest.fixture
def fastq_uploading(fastq_json):
    fastq_json['status'] = 'uploading'
    return fastq_json


def test_files_get_s3_with_no_filename_posted(testapp, fastq_uploading):
    fastq_uploading.pop('filename')
    res = testapp.post_json('/file_fastq', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]

    # 307 is redirect to s3 using auto generated download url
    fastq_res = testapp.get('{href}'
                            .format(**res.json['@graph'][0]),
                            status=307)


def test_files_get_s3_with_no_filename_patched(testapp, fastq_uploading,
                                               fastq_json):
    fastq_uploading.pop('filename')
    res = testapp.post_json('/file_fastq', fastq_json, status=201)
    resobj = res.json['@graph'][0]

    props = {'uuid': resobj['uuid'],
             'aliases': ['dcic:test_1'],
             'status': 'uploading'}

    patched = testapp.patch_json('/file_fastq/{uuid}'
                                 .format(**props), props)

    # 307 is redirect to s3 using auto generated download url
    fastq_res = testapp.get('{href}'
                            .format(**res.json['@graph'][0]),
                            status=307)
    assert props['uuid'] in fastq_res.text


@pytest.fixture
def file(testapp, award, experiment, lab):

    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': 'fastq',
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.fastq.gz',
        'status': 'uploaded',
    }
    res = testapp.post_json('/file_fastq', item)
    return res.json['@graph'][0]


@pytest.fixture
def fastq_related_file(fastq_json):
    item = fastq_json.copy()
    item['related_files'] = [{'relationship_type': 'derived from',
                              'file': fastq_json['accession']}]
    item['md5sum'] = '2123456789abcdef0123456789abcdef'
    item['accession'] = ''
    return item


def test_file_post_fastq_related(testapp, fastq_json, fastq_related_file):
    testapp.post_json('/file_fastq', fastq_json, status=201)
    fastq_related_res = testapp.post_json('/file_fastq', fastq_related_file, status=201)

    # when updating the last one we should have updated this one too
    fastq_res = testapp.get('/md5:{md5sum}'.format(**fastq_json)).follow(status=200)
    fastq_related_files = fastq_res.json['related_files']
    assert fastq_related_files[0]['file']['@id'] == fastq_related_res.json['@graph'][0]['@id']


def test_external_creds(mocker):
    mock_boto = mocker.patch('encoded.types.file.boto', autospec=True)

    from encoded.types.file import external_creds
    ret = external_creds('test-bucket', 'test-key', 'name')
    assert ret['key'] == 'test-key'
    assert ret['bucket'] == 'test-bucket'
    assert ret['service'] == 's3'
    assert 'upload_credentials' in ret.keys()


def test_create_file_request_proper_s3_resource(registry, fastq_json, mocker):
    # note mocker is pytest-mock functionality
    # ensure status uploading so create tries to upload
    fastq_json['status'] = "uploading"
    # don't actually call aws
    external_creds = mocker.patch('encoded.types.file.external_creds')
    # don't actually create this bad boy
    mocker.patch('encoded.types.base.Item.create')
    FileFastq.create(registry, '1234567', fastq_json)
    # check that we would have called aws
    expected_s3_key = "1234567/%s.fastq.gz" % (fastq_json['accession'])
    external_creds.assert_called_once_with('test-bucket', expected_s3_key,
                                           fastq_json['filename'], 'test-profile')


def test_name_for_replaced_file_is_uuid(registry, fastq_json):
    fastq_json['status'] = 'replaced'
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    my_file = FileFastq.create(registry, uuid, fastq_json)
    assert my_file.__name__ == uuid


def test_upload_credentails_not_set_for_replaced_file(registry, fastq_json):
    fastq_json['status'] = 'replaced'
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    my_file = FileFastq.create(registry, uuid, fastq_json)
    # upload credentials only get set when status is 'uploading'
    assert my_file.upload_credentials() is None


def test_name_for_file_is_accession(registry, fastq_json):
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    my_file = FileFastq.create(registry, uuid, fastq_json)
    assert my_file.__name__ == fastq_json['accession']


def test_file_type(registry, fastq_json):
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    my_file = FileFastq.create(registry, uuid, fastq_json)
    assert 'gz' == my_file.file_type('gz')
    assert "fastq gz" == my_file.file_type('fastq', 'gz')



def test_post_upload_only_on_uploading(registry, fastq_json, request):
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    my_file = FileFastq.create(registry, uuid, fastq_json)
    try:
        post_upload(my_file, request)
    except HTTPForbidden:
        assert True
        return
    assert False


def test_post_upload_only_for_uploading_or_upload_failed_status(registry, fastq_json, request):
    fastq_json['status'] = 'uploaded'
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    my_file = FileFastq.create(registry, uuid, fastq_json)
    try:
        post_upload(my_file, request)
    except HTTPForbidden as e:
        assert True
    else:
        assert False
