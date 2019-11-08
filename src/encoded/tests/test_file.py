import pytest
from encoded.types.file import FileFastq, post_upload
from pyramid.httpexceptions import HTTPForbidden
import os
import boto3
pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_processed_file_unique_md5(testapp, mcool_file_json):
    # first time pass
    res_init = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    res = testapp.post_json('/file_processed', mcool_file_json, status=422)
    assert 'ValidationFailure' in res.json['@type']
    assert mcool_file_json['md5sum'] in res.json['errors'][0]['description']
    assert res_init['accession'] in res.json['errors'][0]['description']

    # we can of course, patch or put to ourself though
    testapp.patch_json('/file_processed/%s' % res_init['accession'], mcool_file_json)
    testapp.put_json('/file_processed/%s' % res_init['accession'], mcool_file_json)

    # but we can't change somebody else to overwrite us
    existing_md5sum = mcool_file_json['md5sum']
    mcool_file_json['md5sum'] = 'new md5sum'
    res_2 = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    mcool_file_json['md5sum'] = existing_md5sum

    res = testapp.patch_json('/file_processed/%s' % res_2['accession'], mcool_file_json, status=422)
    assert 'ValidationFailure' in res.json['@type']
    assert res.json['errors'][0]['name'] == 'File: non-unique md5sum'
    assert mcool_file_json['md5sum'] in res.json['errors'][0]['description']

    res = testapp.put_json('/file_processed/%s' % res_2['accession'], mcool_file_json, status=422)
    assert res.json['errors'][0]['name'] == 'File: non-unique md5sum'
    assert 'ValidationFailure' in res.json['@type']
    assert mcool_file_json['md5sum'] in res.json['errors'][0]['description']


def test_processed_file_unique_md5_skip_validation(testapp, mcool_file_json):
    # first time pass
    res = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    testapp.post_json('/file_processed?force_md5=true', mcool_file_json)
    testapp.patch_json('/file_processed/%s/?force_md5=true' % res['accession'], mcool_file_json)
    testapp.put_json('/file_processed/%s/?force_md5=true' % res['accession'], mcool_file_json)


def test_reference_file_by_md5(testapp, file):
    res = testapp.get('/md5:{md5sum}'.format(**file)).follow(status=200)
    assert res.json['@id'] == file['@id']


def test_file_content_md5sum_unique(testapp, file, fastq_json):
    testapp.patch_json('/{uuid}'.format(**file), {'content_md5sum': '1234'}, status=200)
    fastq_json['content_md5sum'] = '1234'
    res2 = testapp.post_json('/file_fastq', fastq_json, status=409)
    assert res2.json.get('detail').startswith("Keys conflict")


def test_replaced_file_not_uniqued(testapp, file):
    testapp.patch_json('/{uuid}'.format(**file), {'status': 'replaced'}, status=200)
    testapp.get('/md5:{md5sum}'.format(**file), status=404)


@pytest.fixture
def fastq_json(award, experiment, lab, file_formats):
    return {
        'accession': '4DNFIO67APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': file_formats.get('fastq').get('uuid'),
        'filename': 'test.fastq.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploaded',
    }


@pytest.fixture
def proc_file_json(award, experiment, lab, file_formats):
    return {
        'accession': '4DNFIO67APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': file_formats.get('pairs').get('uuid'),
        'filename': 'test.pairs.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploading',
    }


def test_file_post_fastq(testapp, fastq_json):
    testapp.post_json('/file_fastq', fastq_json, status=201)


@pytest.fixture
def fastq_uploading(fastq_json):
    fastq_json['status'] = 'uploading'
    return fastq_json


def test_restricted_no_download(testapp, fastq_json):
    # check that initial download works
    res = testapp.post_json('/file_fastq', fastq_json, status=201)
    resobj = res.json['@graph'][0]
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'], Body=str.encode(''))
    download_link = resobj['href']
    testapp.get(download_link, status=307)
    # fail download of restricted file (although with a 200 status?)
    testapp.patch_json(resobj['@id'], {'status': 'restricted'}, status=200)
    testapp.get(download_link, status=403)
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])


def test_extra_files_stuff(testapp, proc_file_json, file_formats):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    assert len(resobj['extra_files']) == len(extra_files)
    file_name = ("%s.pairs.gz.px2" % (resobj['accession']))
    expected_key = "%s/%s" % (resobj['uuid'], file_name)
    assert resobj['extra_files'][0]['upload_key'] == expected_key
    assert resobj['extra_files'][0]['href']
    assert resobj['extra_files_creds'][0]['file_format'] == file_formats['pairs_px2']['uuid']
    assert resobj['extra_files_creds'][0]['upload_key'] == expected_key
    assert resobj['extra_files_creds'][0]['upload_credentials']
    assert 'test-wfout-bucket' in resobj['upload_credentials']['upload_url']


def test_patch_extra_files(testapp, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2', 'status': 'to be uploaded by workflow'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]

    # now patch this guy with just the extra files changing the format of extfile first
    extra_files[0]['file_format'] = 'pairsam_px2'
    patch = {'uuid': resobj['uuid'], 'extra_files': extra_files}
    res = testapp.patch_json('/file_processed/' + resobj['uuid'], patch, status=200)
    resobj = res.json['@graph'][0]

    # ensure we get correct stuff back after a patch
    # bug was that we were only getting back the file_format
    assert len(resobj['extra_files']) == len(extra_files)
    file_name = ("%s.sam.pairs.gz.px2" % (resobj['accession']))
    expected_key = "%s/%s" % (resobj['uuid'], file_name)
    assert resobj['extra_files'][0]['upload_key'] == expected_key
    assert resobj['extra_files'][0]['href']
    assert resobj['extra_files_creds'][0]['upload_key'] == expected_key
    assert resobj['extra_files_creds'][0]['upload_credentials']
    assert 'test-wfout-bucket' in resobj['upload_credentials']['upload_url']
    assert resobj['extra_files'][0]['status'] == 'to be uploaded by workflow'


def test_extra_files_download(testapp, registry, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'], Body=str.encode(''))
    download_filename = resobj['upload_key'].split('/')[1]
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['extra_files'][0]['upload_key'], Body=str.encode(''))
    download_extra_filename = resobj['extra_files'][0]['upload_key'].split('/')[1]
    download_link = resobj['extra_files'][0]['href']
    testapp.get(download_link, status=307)
    testapp.get(resobj['href'], status=307)

    # ensure the download tracking items were created
    ti_coll = registry['collections']['TrackingItem']
    tracking_items = [ti_coll.get(id) for id in ti_coll]
    tracked_filenames = [ti.properties.get('download_tracking', {}).get('filename') for ti in tracking_items]
    assert download_filename in tracked_filenames
    assert download_extra_filename in tracked_filenames

    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['extra_files'][0]['upload_key'])


def test_range_download(testapp, registry, proc_file_json):
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'],
                  Body=str.encode('12346789abcd'))
    download_filename = resobj['upload_key'].split('/')[1]
    download_link = resobj['href']
    resp = testapp.get(download_link, status=206, headers={'Range': 'bytes=2-5'})

    # ensure that the download tracking item was created
    ti_coll = registry['collections']['TrackingItem']
    tracking_items = [ti_coll.get(id) for id in ti_coll]
    # ensure some basic fields are on the tracking items
    for ti in tracking_items:
        assert ti.properties['status'] == 'in review by lab'
        assert 'schema_version' in ti.properties
        assert 'date_created' in ti.properties
    tracked_rng_filenames = [ti.properties.get('download_tracking', {}).get('filename') for ti in tracking_items
                             if ti.properties.get('download_tracking', {}).get('range_query') is True]
    assert download_filename in tracked_rng_filenames

    # delete first so cleanup even if test fails
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])
    assert resp.text == '3467'
    assert resp.status_code == 206
    assert resp.headers['Content-Length'] == '4'
    assert resp.headers['Content-Range'] == 'bytes 2-5/12'


def test_file_rev_linked_to_exp_download(testapp, registry, proc_file_json, experiment_data, file_formats, exp_types):
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    experiment_data['processed_files'] = [resobj['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'],
                  Body=str.encode('12346789abcd'))
    download_filename = resobj['upload_key'].split('/')[1]
    download_link = resobj['href']
    resp = testapp.get(download_link)

    # ensure that the download tracking item was created
    ti_coll = registry['collections']['TrackingItem']
    et_coll = registry['collections']['ExperimentType']
    tracking_items = [ti_coll.get(id) for id in ti_coll]
    tracked_exp_file_dls = [ti.properties.get('download_tracking') for ti in tracking_items
                            if ti.properties.get('download_tracking', {}).get('experiment_type') is not 'None']
    assert len(tracked_exp_file_dls) > 0
    for dl_tracking in tracked_exp_file_dls:
        ex_type_atid = experiment_data['experiment_type']
        ex_type_name = ex_type_atid.replace('/experiment-types/', '')
        ex_type_name = ex_type_name.replace('/', '')
        dl_type = et_coll.get(dl_tracking['experiment_type'])
        ex_type = et_coll.get(ex_type_name)
        assert dl_type.properties.get('title') == ex_type.properties.get('title')
        assert 'file_format' in dl_tracking
        # this needs to be updated if the proc_file_json fixture is
        assert dl_tracking['file_format'] == file_formats.get('pairs').get('file_format')
        assert dl_tracking['range_query'] is False
        assert dl_tracking['user_uuid'] == 'anonymous'
        assert isinstance(dl_tracking['request_headers'], type(''))
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])


def test_file_rev_linked_to_exp_set_download(testapp, registry, proc_file_json,
                                             two_experiment_replicate_set, file_formats):
    """
    Use exp_set.other_processed_files field to really test this
    """
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    testapp.patch_json(two_experiment_replicate_set['@id'],
                       {'other_processed_files': [{'title': 'Test', 'files': [resobj['@id']]}]})
    # hard-coded for convenience; should match experiment_data in datafixtures
    expected_exp_type = '/experiment-types/in-situ-hi-c/'
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'],
                  Body=str.encode('12346789abcd'))
    download_filename = resobj['upload_key'].split('/')[1]
    download_link = resobj['href']
    resp = testapp.get(download_link)

    # ensure that the download tracking item was created
    ti_coll = registry['collections']['TrackingItem']
    et_coll = registry['collections']['ExperimentType']
    tracking_items = [ti_coll.get(id) for id in ti_coll]
    tracked_exp_file_dls = [ti.properties.get('download_tracking') for ti in tracking_items
                            if ti.properties.get('download_tracking', {}).get('experiment_type') is not 'None']
    assert len(tracked_exp_file_dls) > 0
    for dl_tracking in tracked_exp_file_dls:
        ex_type_atid = expected_exp_type
        ex_type_name = ex_type_atid.replace('/experiment-types/', '')
        ex_type_name = ex_type_name.replace('/', '')
        dl_type = et_coll.get(dl_tracking['experiment_type'])
        expected_exp_type = et_coll.get(ex_type_name)
        assert dl_type.properties.get('title') == expected_exp_type.properties.get('title')
        assert 'file_format' in dl_tracking
        # this needs to be updated if the proc_file_json fixture is
        assert dl_tracking['file_format'] == file_formats.get('pairs').get('file_format')
        assert dl_tracking['range_query'] is False
        assert dl_tracking['user_uuid'] == 'anonymous'
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])


def test_extra_files_get_upload(testapp, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]

    get_res = testapp.get(resobj['@id'] + '/upload')
    get_resobj = get_res.json['@graph'][0]
    assert get_resobj['upload_credentials']
    assert get_resobj['extra_files_creds'][0]


def test_extra_files_throws_on_duplicate_file_format(testapp, proc_file_json):
    # same file_format as original file
    extra_files = [{'file_format': 'pairs'}]
    proc_file_json['extra_files'] = extra_files
    with pytest.raises(Exception) as exc:
        testapp.post_json('/file_processed', proc_file_json, status=201)
        assert "must have unique file_format" in exc.value


def test_extra_files_throws_on_duplicate_file_format_in_extra(testapp, proc_file_json):
    # same file_format as original file
    extra_files = [{'file_format': 'pairs_px2'},
                   {'file_format': 'pairs_px'}]
    proc_file_json['extra_files'] = extra_files
    with pytest.raises(Exception) as exc:
        testapp.post_json('/file_processed', proc_file_json, status=201)
        assert "must have unique file_format" in exc.value


def test_files_aws_credentials(testapp, fastq_uploading):
    # fastq_uploading.pop('filename')
    res = testapp.post_json('/file_fastq', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]

    res_put = testapp.put_json(resobj['@id'], fastq_uploading)

    assert resobj['upload_credentials']['key'] == res_put.json['@graph'][0]['upload_credentials']['key']
    assert 'test-wfout-bucket' in resobj['upload_credentials']['upload_url']


def test_files_aws_credentials_change_filename(testapp, fastq_uploading, file_formats):
    fastq_uploading['filename'] = 'test.zip'
    fastq_uploading['file_format'] = file_formats.get('zip').get('uuid')
    res = testapp.post_json('/file_calibration', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]

    fastq_uploading['filename'] = 'test.tiff'
    fastq_uploading['file_format'] = file_formats.get('tiff').get('uuid')
    res_put = testapp.put_json(resobj['@id'], fastq_uploading)

    assert resobj['upload_credentials']['key'].endswith('zip')
    assert resobj['href'].endswith('zip')
    assert res_put.json['@graph'][0]['upload_credentials']['key'].endswith('tiff')
    assert res_put.json['@graph'][0]['href'].endswith('tiff')


def test_status_change_doesnt_muck_with_creds(testapp, fastq_uploading, file_formats):
    fastq_uploading['filename'] = 'test.zip'
    fastq_uploading['file_format'] = file_formats.get('zip').get('uuid')
    res = testapp.post_json('/file_calibration', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]

    fastq_uploading['status'] = 'released'
    res_put = testapp.put_json(resobj['@id'], fastq_uploading)
    res_upload = testapp.get(resobj['@id'] + '/upload')
    put_obj = res_upload.json['@graph'][0]

    assert resobj['upload_credentials']['key'] == put_obj['upload_credentials']['key']

    assert resobj['href'] == res_put.json['@graph'][0]['href']


def test_s3_filename_validation(testapp, fastq_uploading, file_formats):
    """
    s3 won't allow certain characters in filenames, hence the regex validator
    created in file.json schema. Required regex is: "^[\\w+=,.@-]*$"
    """
    # first a working one
    fastq_uploading['filename'] = 'test_file.fastq.gz'
    fastq_uploading['file_format'] = file_formats.get('fastq').get('uuid')
    testapp.post_json('/file_fastq', fastq_uploading, status=201)
    # now some bad boys that don't pass
    fastq_uploading['filename'] = 'test file.fastq.gz'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)
    fastq_uploading['filename'] = 'test|file.fastq.gz'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)
    fastq_uploading['filename'] = 'test~file.fastq.gz'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)
    fastq_uploading['filename'] = 'test#file.fastq.gz'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)


def test_files_get_s3_with_no_filename_posted(testapp, fastq_uploading):
    fastq_uploading.pop('filename')
    res = testapp.post_json('/file_fastq', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])

    # 307 is redirect to s3 using auto generated download url
    fastq_res = testapp.get('{href}'
                            .format(**resobj),
                            status=307)
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])


def test_files_get_s3_with_no_filename_patched(testapp, fastq_uploading,
                                               fastq_json):
    fastq_uploading.pop('filename')
    res = testapp.post_json('/file_fastq', fastq_json, status=201)
    resobj = res.json['@graph'][0]
    s3 = boto3.client('s3')
    s3.put_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])

    props = {'uuid': resobj['uuid'],
             'aliases': ['dcic:test_1'],
             'status': 'uploading'}

    patched = testapp.patch_json('/file_fastq/{uuid}'
                                 .format(**props), props)

    # 307 is redirect to s3 using auto generated download url
    fastq_res = testapp.get('{href}'
                            .format(**resobj),
                            status=307)
    assert props['uuid'] in fastq_res.text
    s3.delete_object(Bucket='test-wfout-bucket', Key=resobj['upload_key'])


@pytest.fixture
def mcool_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('mcool').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.cool.mcool',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def bedGraph_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('bg').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.bedGraph.gz',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def bigwig_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('bw').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.bw',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def bigbed_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('bigbed').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.bb',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def bed_beddb_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('bed').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.bed.gz',
        'status': 'uploaded',
        'extra_files' : [
            {
                "file_format" : file_formats.get('beddb').get('uuid'),
                "file_size" :12345678,
                "md5sum": "00000000000000000000000000000002"
            },
        ]
    }
    return item

@pytest.fixture
def beddb_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('beddb').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.beddb',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def chromsizes_file_json(award, experiment, lab, file_formats):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('chromsizes').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.chrom.sizes',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def mcool_file(testapp, mcool_file_json):
    res = testapp.post_json('/file_processed', mcool_file_json)
    return res.json['@graph'][0]


@pytest.fixture
def file(testapp, award, experiment, lab, file_formats):

    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('fastq').get('uuid'),
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
    mocker.patch('encoded.types.file.boto3', autospec=True)

    from encoded.types.file import external_creds
    ret = external_creds('test-wfout-bucket', 'test-key', 'name')
    assert ret['key'] == 'test-key'
    assert ret['bucket'] == 'test-wfout-bucket'
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
    external_creds.assert_called_once_with('test-wfout-bucket', expected_s3_key,
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


def test_calculated_display_title_for_fastq(file):
    assert file['display_title'] == file['accession'] + '.fastq.gz'


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


def test_workflowrun_output_rev_link(testapp, fastq_json, workflow_run_json):
    res = testapp.post_json('/file_fastq', fastq_json, status=201).json['@graph'][0]
    workflow_run_json['output_files'] = [{'workflow_argument_name': 'test', 'value': res['@id']}]
    res2 = testapp.post_json('/workflow_run_sbg', workflow_run_json).json['@graph'][0]

    new_file = testapp.get(res['@id']).json
    assert new_file['workflow_run_outputs'][0]['@id'] == res2['@id']


def test_workflowrun_input_rev_link(testapp, fastq_json, workflow_run_json):
    res = testapp.post_json('/file_fastq', fastq_json, status=201).json['@graph'][0]
    workflow_run_json['input_files'] = [{'workflow_argument_name': 'test', 'value': res['@id']}]
    res2 = testapp.post_json('/workflow_run_sbg', workflow_run_json).json['@graph'][0]

    new_file = testapp.get(res['@id']).json
    assert new_file['workflow_run_inputs'][0]['@id'] == res2['@id']


def test_workflowrun_input_rev_link_pf(testapp, proc_file_json, workflow_run_awsem_json):
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    workflow_run_awsem_json['input_files'] = [{'workflow_argument_name': 'test_inp', 'value': res['@id']}]
    workflow_run_awsem_json['output_files'] = [{'workflow_argument_name': 'test_out', 'value': res['@id']}]
    res2 = testapp.post_json('/workflow_run_awsem', workflow_run_awsem_json).json['@graph'][0]
    new_file = testapp.get(res['@id']).json
    assert new_file['workflow_run_inputs'][0]['@id'] == res2['@id']
    assert new_file['workflow_run_outputs'][0]['@id'] == res2['@id']


def test_workflowrun_input_rev_link_pf_disabled_at_post(testapp, proc_file_json, workflow_run_awsem_json):
    proc_file_json['disable_wfr_inputs'] = True
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    workflow_run_awsem_json['input_files'] = [{'workflow_argument_name': 'test_inp', 'value': res['@id']}]
    workflow_run_awsem_json['output_files'] = [{'workflow_argument_name': 'test_out', 'value': res['@id']}]
    res2 = testapp.post_json('/workflow_run_awsem', workflow_run_awsem_json).json['@graph'][0]
    new_file = testapp.get(res['@id']).json
    assert new_file['workflow_run_outputs'][0]['@id'] == res2['@id']
    assert new_file.get('workflow_run_inputs') == []


def test_workflowrun_input_rev_link_pf_disabled_at_patch(testapp, proc_file_json, workflow_run_awsem_json):
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    workflow_run_awsem_json['input_files'] = [{'workflow_argument_name': 'test_inp', 'value': res['@id']}]
    workflow_run_awsem_json['output_files'] = [{'workflow_argument_name': 'test_out', 'value': res['@id']}]
    res2 = testapp.post_json('/workflow_run_awsem', workflow_run_awsem_json).json['@graph'][0]
    new_file = testapp.patch_json(res['@id'], {'disable_wfr_inputs': True}, status=200).json['@graph'][0]
    assert new_file['workflow_run_outputs'][0] == res2['@id']
    assert new_file.get('workflow_run_inputs') == []


def test_experiment_rev_link_on_files(testapp, fastq_json, experiment_data):
    res = testapp.post_json('/file_fastq', fastq_json, status=201).json['@graph'][0]
    experiment_data['files'] = [res['@id']]
    res2 = testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]
    new_file = testapp.get(res['@id']).json
    assert new_file['experiments'][0]['@id'] == res2['@id']


def test_experiment_rev_link_on_processedfiles(testapp, proc_file_json, experiment_data):
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [res['@id']]
    res2 = testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]

    new_file = testapp.get(res['@id']).json
    assert new_file['experiments'][0]['@id'] == res2['@id']


def test_no_experiment_rev_link_on_file_processed_in_files_field(
        testapp, proc_file_json, experiment_data):
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['files'] = [res['@id']]
    res2 = testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]

    new_file = testapp.get(res['@id']).json
    assert not new_file['experiments']


def test_experiment_set_rev_link_on_processedfiles(testapp, proc_file_json, rep_set_data):
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    rep_set_data['processed_files'] = [res['@id']]
    res2 = testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]

    new_file = testapp.get(res['@id']).json
    assert new_file['experiment_sets'][0]['@id'] == res2['@id']


def test_no_experiment_set_rev_link_on_raw_file(testapp, fastq_json, experiment_data, rep_set_data):
    res = testapp.post_json('/file_fastq', fastq_json, status=201).json['@graph'][0]
    experiment_data['files'] = [res['@id']]
    res2 = testapp.post_json('/experiment_hi_c', experiment_data).json['@graph'][0]
    rep_set_data['replicate_exps'] = [
        {'replicate_exp': res2['@id'],
         'bio_rep_no': 1,
         'tec_rep_no': 1
         }]
    res3 = testapp.post_json('/experiment_set_replicate', rep_set_data).json['@graph'][0]

    new_file = testapp.get(res['@id']).json
    assert new_file['experiments'][0]['@id'] == res2['@id']
    assert 'experiment_sets' not in new_file


def test_force_beanstalk_env(mocker):
    """
    This test is a bit outdated, since env variable loading has moved to
    application __init__ from file.py. But let's keep the test...
    """
    import tempfile
    from encoded import source_beanstalk_env_vars
    secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
    key = os.environ.get("AWS_ACCESS_KEY_ID")
    os.environ.pop("AWS_SECRET_ACCESS_KEY")
    os.environ.pop("AWS_ACCESS_KEY_ID")

    test_cfg = tempfile.NamedTemporaryFile(mode='w', delete=False)
    test_cfg.write('export AWS_SECRET_ACCESS_KEY="its a secret"\n')
    test_cfg.write('export AWS_ACCESS_KEY_ID="its a secret id"\n')
    test_cfg_name = test_cfg.name
    test_cfg.close()

    # mock_boto
    mock_boto = mocker.patch('encoded.tests.test_file.boto3', autospec=True)

    source_beanstalk_env_vars(test_cfg_name)
    boto3.client('sts', aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
                 aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"))
    # reset
    os.environ["AWS_SECRET_ACCESS_KEY"] = secret
    os.environ["AWS_ACCESS_KEY_ID"] = key
    # os.remove(test_cfg.delete)

    # ensure boto called with correct arguments
    mock_boto.client.assert_called_once_with('sts', aws_access_key_id='its a secret id',
                                             aws_secret_access_key='its a secret')


@pytest.fixture
def processed_file_data(award, lab, file_formats):
    return {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('pairs').get('uuid'),
    }


def test_validate_produced_from_files_no_produced_by_and_filename_no_filename(
        testapp, processed_file_data):
    res = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res.json.get('errors')


def test_validate_filename_invalid_file_format_post(testapp, processed_file_data):
    processed_file_data['file_format'] = 'stringy file format'
    processed_file_data['filename'] = 'test_file.pairs.gz'
    res = testapp.post_json('/files-processed', processed_file_data, status=422)
    errors = res.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert 'Problem getting file_format for test_file.pairs.gz' in descriptions


def test_validate_filename_valid_file_format_and_name_post(testapp, processed_file_data):
    processed_file_data['filename'] = 'test_file.pairs.gz'
    res = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res.json.get('errors')


def test_validate_filename_invalid_filename_post(testapp, processed_file_data):
    processed_file_data['filename'] = 'test_file_pairs.gz'
    res = testapp.post_json('/files-processed', processed_file_data, status=422)
    errors = res.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "Filename test_file_pairs.gz extension does not agree with specified file format. Valid extension(s): '.pairs.gz'" in descriptions


def test_validate_filename_valid_filename_patch(testapp, processed_file_data):
    processed_file_data['filename'] = 'test_file1.pairs.gz'
    res1 = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res1.json.get('errors')
    res1_props = res1.json['@graph'][0]
    assert res1_props['filename'] == 'test_file1.pairs.gz'
    filename2patch = 'test_file2.pairs.gz'
    res2 = testapp.patch_json(res1_props['@id'], {'filename': filename2patch}, status=200)
    assert not res2.json.get('errors')
    assert res2.json['@graph'][0]['filename'] == 'test_file2.pairs.gz'


def test_validate_filename_invalid_filename_patch(testapp, processed_file_data):
    processed_file_data['filename'] = 'test_file1.pairs.gz'
    res1 = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res1.json.get('errors')
    res1_props = res1.json['@graph'][0]
    assert res1_props['filename'] == 'test_file1.pairs.gz'
    filename2patch = 'test_file2.bam'
    res2 = testapp.patch_json(res1_props['@id'], {'filename': filename2patch}, status=422)
    errors = res2.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "Filename test_file2.bam extension does not agree with specified file format. Valid extension(s): '.pairs.gz'" in descriptions


def test_validate_produced_from_files_invalid_post(testapp, processed_file_data):
    fids = ['not_a_file_id', 'definitely_not']
    processed_file_data['produced_from'] = fids
    res = testapp.post_json('/files-processed', processed_file_data, status=422)
    errors = res.json['errors']
    descriptions = [e['description'] for e in errors]
    for fid in fids:
        desc = "'%s' not found" % fid
        assert desc in descriptions


def test_validate_produced_from_files_valid_post(testapp, processed_file_data, file, mcool_file):
    processed_file_data['produced_from'] = [file['@id'], mcool_file['@id']]
    res = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res.json.get('errors')


def test_validate_produced_from_files_valid_patch(testapp, processed_file_data, file, mcool_file):
    res = testapp.post_json('/files-processed', processed_file_data, status=201).json['@graph'][0]
    pres = testapp.patch_json(res['@id'], {'produced_from': [file['@id'], mcool_file['@id']]}, status=200)
    assert not pres.json.get('errors')


def test_validate_extra_files_no_extra_files(testapp, processed_file_data):
    res = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res.json.get('errors')


def test_validate_extra_files_extra_files_good_post(testapp, processed_file_data):
    extf = {'file_format': 'pairs_px2'}
    processed_file_data['extra_files'] = [extf]
    res = testapp.post_json('/files-processed', processed_file_data, status=201)
    assert not res.json.get('errors')


def test_validate_extra_files_extra_files_bad_post_extra_same_as_primary(testapp, processed_file_data):
    extf = {'file_format': 'pairs'}
    processed_file_data['extra_files'] = [extf]
    res = testapp.post_json('/files-processed', processed_file_data, status=422)
    assert res.json['errors'][0]['name'] == 'File: invalid extra_file formats'
    assert "'pairs' format cannot be the same for file and extra_file" == res.json['errors'][0]['description']


def test_validate_extra_files_extra_files_bad_patch_extra_same_as_primary(testapp, processed_file_data):
    extf = {'file_format': 'pairs'}
    res1 = testapp.post_json('/files-processed', processed_file_data, status=201)
    pfid = res1.json['@graph'][0]['@id']
    res2 = testapp.patch_json(pfid, {'extra_files': [extf]}, status=422)
    assert res2.json['errors'][0]['name'] == 'File: invalid extra_file formats'
    assert "'pairs' format cannot be the same for file and extra_file" == res2.json['errors'][0]['description']


def test_validate_extra_files_extra_files_bad_post_existing_extra_format(testapp, processed_file_data):
    extfs = [{'file_format': 'pairs_px2'}, {'file_format': 'pairs_px2'}]
    processed_file_data['extra_files'] = extfs
    res = testapp.post_json('/files-processed', processed_file_data, status=422)
    assert res.json['errors'][0]['name'] == 'File: invalid extra_file formats'
    assert "Multple extra files with 'pairs_px2' format cannot be submitted at the same time" == res.json['errors'][0]['description']


def test_validate_extra_files_extra_files_ok_patch_existing_extra_format(testapp, processed_file_data):
    extf = {'file_format': 'pairs_px2'}
    processed_file_data['extra_files'] = [extf]
    res1 = testapp.post_json('/files-processed', processed_file_data, status=201)
    pfid = res1.json['@graph'][0]['@id']
    res2 = testapp.patch_json(pfid, {'extra_files': [extf]}, status=200)
    assert not res2.json.get('errors')


def test_validate_extra_files_parent_should_not_have_extras(
        testapp, processed_file_data, file_formats):
    extf = {'file_format': 'pairs_px2'}
    processed_file_data['file_format'] = file_formats.get('mcool').get('uuid')
    processed_file_data['extra_files'] = [extf]
    res1 = testapp.post_json('/files-processed', processed_file_data, status=422)
    errors = res1.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "File with format mcool should not have extra_files" in descriptions


def test_validate_extra_files_bad_extras_format(
        testapp, processed_file_data, file_formats):
    extf = {'file_format': 'whosit'}
    processed_file_data['extra_files'] = [extf]
    res1 = testapp.post_json('/files-processed', processed_file_data, status=422)
    errors = res1.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "'whosit' not a valid or known file format" in descriptions


def test_validate_file_format_validity_for_file_type_allows(testapp, file_formats, award, lab):
    my_fastq_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('fastq').get('uuid'),
    }
    my_proc_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('pairs').get('uuid'),
    }
    res1 = testapp.post_json('/files-fastq', my_fastq_file, status=201)
    res2 = testapp.post_json('/files-processed', my_proc_file, status=201)
    assert not res1.json.get('errors')
    assert not res2.json.get('errors')


def test_validate_file_format_validity_for_file_type_fires(testapp, file_formats, award, lab):
    my_fastq_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('pairs').get('uuid'),
    }
    my_proc_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('fastq').get('uuid'),
    }
    res1 = testapp.post_json('/files-fastq', my_fastq_file, status=422)
    errors = res1.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "File format pairs is not allowed for FileFastq" in descriptions
    res2 = testapp.post_json('/files-processed', my_proc_file, status=422)
    errors = res2.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "File format fastq is not allowed for FileProcessed" in descriptions


def test_file_format_does_not_exist(testapp, file_formats, award, lab):
    my_fastq_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': 'waldo',
    }
    res1 = testapp.post_json('/files-fastq', my_fastq_file, status=422)
    errors = res1.json['errors']
    descriptions = ''.join([e['description'] for e in errors])
    assert "'waldo' not found" in descriptions


def test_filename_patch_fails_wrong_format(testapp, file_formats, award, lab):
    my_fastq_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('fastq').get('uuid'),
        'filename': 'test.fastq.gz'
    }
    res1 = testapp.post_json('/files-fastq', my_fastq_file, status=201)
    resobj = res1.json['@graph'][0]
    patch_data = {"file_format": file_formats.get('pairs').get('uuid')}
    res2 = testapp.patch_json('/files-fastq/' + resobj['uuid'], patch_data, status=422)
    errors = res2.json['errors']
    error1 = "Filename test.fastq.gz extension does not agree with specified file format. Valid extension(s): '.pairs.gz'"
    error2 = "File format pairs is not allowed for FileFastq"
    descriptions = ''.join([e['description'] for e in errors])
    assert error1 in descriptions
    assert error2 in descriptions


def test_filename_patch_works_with_different_format(testapp, file_formats, award, lab):
    my_proc_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('pairs').get('uuid'),
        'filename': 'test.pairs.gz'
    }
    res1 = testapp.post_json('/files-processed', my_proc_file, status=201)
    resobj = res1.json['@graph'][0]
    patch_data = {"file_format": file_formats.get('bam').get('uuid'), 'filename': 'test.bam'}
    res2 = testapp.patch_json('/files-processed/' + resobj['uuid'], patch_data, status=200)
    assert not res2.json.get('errors')


def test_file_format_patch_works_if_no_filename(testapp, file_formats, award, lab):
    my_proc_file = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('pairs').get('uuid')
    }
    res1 = testapp.post_json('/files-processed', my_proc_file, status=201)
    resobj = res1.json['@graph'][0]
    patch_data = {"file_format": file_formats.get('bam').get('uuid')}
    res2 = testapp.patch_json('/files-processed/' + resobj['uuid'], patch_data, status=200)
    assert not res2.json.get('errors')


def test_file_generate_track_title_fp_all_present(testapp, file_formats, award, lab):
    pf_file_meta = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('mcool').get('uuid'),
        'override_experiment_type': 'DNase Hi-C',
        'override_lab_name': 'Test Lab',
        'file_type': 'normalized counts',
        'override_assay_info': 'PARK1',
        'override_biosource_name': 'GM12878',
        'override_replicate_info': 'Biorep 1, Techrep 1',
        'override_experiment_bucket': 'processed file',
        'higlass_uid': 'test_hg_uid'
    }
    res1 = testapp.post_json('/files-processed', pf_file_meta, status=201)
    pf = res1.json.get('@graph')[0]
    assert pf.get('track_and_facet_info', {}).get('track_title') == 'normalized counts for GM12878 DNase Hi-C PARK1'


def test_file_generate_track_title_fp_all_missing(testapp, file_formats, award, lab):
    pf_file_meta = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('mcool').get('uuid'),
        'lab': lab['@id'],
        'higlass_uid': 'test_hg_uid'
    }
    res1 = testapp.post_json('/files-processed', pf_file_meta, status=201)
    pf = res1.json.get('@graph')[0]
    assert pf.get('track_and_facet_info', {}).get('track_title') is None


def test_file_generate_track_title_fp_most_missing(testapp, file_formats, award, lab):
    pf_file_meta = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('mcool').get('uuid'),
        'lab': lab['@id'],
        'override_experiment_type': 'DNase Hi-C',
        'higlass_uid': 'test_hg_uid'
    }
    res1 = testapp.post_json('/files-processed', pf_file_meta, status=201)
    pf = res1.json.get('@graph')[0]
    assert pf.get('track_and_facet_info', {}).get('track_title') == 'unspecified type for unknown sample DNase Hi-C'


def test_file_generate_track_title_fvis(testapp, file_formats, award, lab, GM12878_biosource):
    vistrack_meta = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('mcool').get('uuid'),
        'override_experiment_type': 'DNase Hi-C',
        'lab': lab['@id'],
        'file_type': 'fold change over control',
        'override_lab_name': 'Some Dude, Somewhere',
        'override_assay_info': 'PARK1',
        'biosource': GM12878_biosource['@id'],
        'override_replicate_info': 'bio1 tec1',
        'higlass_uid': 'test_hg_uid'
    }
    res1 = testapp.post_json('/files-vistrack', vistrack_meta)
    vt = res1.json.get('@graph')[0]
    assert vt.get('track_and_facet_info', {}).get('track_title') == 'fold change over control for GM12878 DNase Hi-C PARK1'


@pytest.fixture
def custom_experiment_set_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'description': 'test experiment set',
        'experimentset_type': 'custom',
        'status': 'in review by lab'
    }


def test_track_and_file_facet_info_no_link_to_exp_or_eset(testapp, proc_file_json):
    # should only have lab_name
    res = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    tf_info = res.get('track_and_facet_info')
    assert 'lab_name' in tf_info
    assert len(tf_info) == 1


def test_track_and_file_facet_info_file_link_to_multi_expts(
        testapp, proc_file_json, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    expt1 = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    expt2 = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    assert pfile['@id'] in expt1['processed_files']
    assert pfile['@id'] in expt2['processed_files']
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert 'lab_name' in tf_info
    assert len(tf_info) == 1


def test_track_and_file_facet_info_file_link_to_expt_w_cat_rep_type_pfbucket(
        testapp, proc_file_json, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['experiment_bucket'] == 'processed file'
    assert tf_info['assay_info'] == 'MboI'


def test_track_and_file_facet_info_file_link_to_expt_opfbucket(
        testapp, proc_file_json, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['other_processed_files'] = [{'title': 'some other files', 'type': 'supplementary', 'files': [pfile['@id']]}]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['experiment_bucket'] == 'some other files'


def test_track_and_file_facet_info_file_link_to_expt_pf_and_opf_buckets(
        testapp, proc_file_json, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    experiment_data['other_processed_files'] = [{'title': 'some other files', 'type': 'supplementary', 'files': [pfile['@id']]}]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['experiment_bucket'] == 'processed file'


def test_track_and_file_facet_info_file_link_to_expt_w_rep(
        testapp, proc_file_json, experiment_data, rep_set_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    expt = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    rep_set_data['replicate_exps'] = [{'bio_rep_no': 1, 'tec_rep_no': 1, 'replicate_exp': expt['@id']}]
    testapp.post_json('/experiment_set_replicate', rep_set_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['replicate_info'] == 'Biorep 1, Techrep 1'


def test_track_and_file_facet_info_file_link_to_expt_w_rep_and_custom_eset(
        testapp, proc_file_json, experiment_data, rep_set_data, custom_experiment_set_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    expt = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    rep_set_data['replicate_exps'] = [{'bio_rep_no': 1, 'tec_rep_no': 1, 'replicate_exp': expt['@id']}]
    testapp.post_json('/experiment_set_replicate', rep_set_data, status=201)
    custom_experiment_set_data['experiments_in_set'] = [expt['@id']]
    testapp.post_json('/experiment_set', custom_experiment_set_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['replicate_info'] == 'Biorep 1, Techrep 1'


def test_track_and_file_facet_info_file_link_to_expt_no_cat_or_rep(
        testapp, proc_file_json, experiment_data, exp_types):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['experiment_type'] = exp_types['rnaseq']['@id']
    experiment_data['processed_files'] = [pfile['@id']]
    del experiment_data['digestion_enzyme']
    testapp.post_json('/experiment_seq', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'RNA-seq'
    assert 'assay_info' not in tf_info
    assert 'replicate_info' not in tf_info


def test_track_and_file_facet_info_file_link_to_expt_biosample_cell(
        testapp, proc_file_json, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['biosource_name'] == 'GM12878'


def test_track_and_file_facet_info_file_link_to_expt_biosample_tissue(
        testapp, proc_file_json, experiment_data, tissue_biosample, lung_oterm):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['biosample'] = tissue_biosample['@id']
    experiment_data['processed_files'] = [pfile['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['biosource_name'] == lung_oterm.get('preferred_name')


def test_track_and_file_facet_info_file_fastq_link_to_expt(
        testapp, file_fastq, experiment_data):
    experiment_data['files'] = [file_fastq['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(file_fastq['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_bucket'] == 'raw file'


def test_track_and_file_facet_info_file_link_to_multi_repsets(
        testapp, proc_file_json, rep_set_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    rep_set_data['processed_files'] = [pfile['@id']]
    repset1 = testapp.post_json('/experiment_set_replicate', rep_set_data, status=201).json['@graph'][0]
    repset2 = testapp.post_json('/experiment_set_replicate', rep_set_data, status=201).json['@graph'][0]
    assert pfile['@id'] in repset1['processed_files']
    assert pfile['@id'] in repset2['processed_files']
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert 'lab_name' in tf_info
    assert len(tf_info) == 1


def test_track_and_file_facet_info_file_link_to_repset_w_one_expt(
        testapp, proc_file_json, rep_set_data, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    expt = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    rep_set_data['processed_files'] = [pfile['@id']]
    rep_set_data['replicate_exps'] = [{'bio_rep_no': 1, 'tec_rep_no': 1, 'replicate_exp': expt['@id']}]
    testapp.post_json('/experiment_set_replicate', rep_set_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    assert tf_info['experiment_bucket'] == 'processed file'
    assert tf_info['assay_info'] == 'MboI'
    assert tf_info['biosource_name'] == 'GM12878'
    assert tf_info['replicate_info'] == 'unreplicated'


def test_track_and_file_facet_info_file_link_to_repset_w_multi_expt_and_opf(
        testapp, proc_file_json, rep_set_data, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    del proc_file_json['accession']
    del proc_file_json['md5sum']
    opf = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    expt1 = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    expt2 = testapp.post_json('/experiment_hi_c', experiment_data, status=201).json['@graph'][0]
    rep_set_data['other_processed_files'] = [{'title': 'some other files', 'type': 'supplementary', 'files': [opf['@id'], pfile['@id']]}]
    rep_set_data['replicate_exps'] = [{'bio_rep_no': 1, 'tec_rep_no': 1, 'replicate_exp': expt1['@id']},
                                      {'bio_rep_no': 1, 'tec_rep_no': 2, 'replicate_exp': expt2['@id']}]
    testapp.post_json('/experiment_set_replicate', rep_set_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_bucket'] == 'some other files'
    assert tf_info['replicate_info'] == 'merged replicates'


def test_track_and_file_facet_info_file_w_all_override_fields(
        testapp, proc_file_json, experiment_data):
    overrides = {
        'override_lab_name': 'awesome lab',
        'override_experiment_type': 'TRIP',
        'override_biosource_name': 'some cell',
        'override_assay_info': 'cold',
        'override_replicate_info': 'replicated lots',
        'override_experiment_bucket': 'important files'
    }
    proc_file_json.update(overrides)
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    tf_info = pfile.get('track_and_facet_info')
    for k, v in overrides.items():
        tf = k.replace('override_', '', 1)
        assert tf_info[tf] == v
    # make sure it doesn't change
    experiment_data['processed_files'] = [pfile['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info2 = res.get('track_and_facet_info')
    for k, v in overrides.items():
        tf = k.replace('override_', '', 1)
        assert tf_info2[tf] == v


def test_track_and_file_facet_info_file_vistrack_w_all_override_fields(
        testapp, proc_file_json, experiment_data, file_formats):
    overrides = {
        'override_lab_name': 'awesome lab',
        'override_experiment_type': 'TRIP',
        'override_assay_info': 'cold',
        'override_replicate_info': 'replicated lots',
        'override_experiment_bucket': 'important files'
    }
    proc_file_json.update(overrides)
    proc_file_json['file_format'] = file_formats.get('bw').get('uuid')
    proc_file_json['filename'] = 'test.bw'
    pfile = testapp.post_json('/file_vistrack', proc_file_json, status=201).json['@graph'][0]
    tf_info = pfile.get('track_and_facet_info')
    for k, v in overrides.items():
        tf = k.replace('override_', '', 1)
        assert tf_info[tf] == v


def test_track_and_file_facet_info_file_w_some_override_fields(
        testapp, proc_file_json, experiment_data):
    overrides = {
        'override_experiment_type': 'TRIP',
        'override_biosource_name': 'some cell',
        'override_assay_info': 'cold',
        'override_replicate_info': 'replicated lots',
    }
    proc_file_json.update(overrides)
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    tf_info = pfile.get('track_and_facet_info')
    assert len(tf_info) == 5  # lab will get calculated since expt_type exists
    for k, v in overrides.items():
        tf = k.replace('override_', '', 1)
        assert tf_info[tf] == v
    # make sure it doesn't change
    experiment_data['processed_files'] = [pfile['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info2 = res.get('track_and_facet_info')
    for k, v in overrides.items():
        tf = k.replace('override_', '', 1)
        assert tf_info2[tf] == v
    assert tf_info2['experiment_type'] == 'TRIP'
    assert tf_info2['lab_name'] == 'ENCODE lab'
    assert tf_info2['experiment_bucket'] == 'processed file'


def test_track_and_file_facet_info_file_patch_override_fields(
        testapp, proc_file_json, experiment_data):
    pfile = testapp.post_json('/file_processed', proc_file_json, status=201).json['@graph'][0]
    experiment_data['processed_files'] = [pfile['@id']]
    testapp.post_json('/experiment_hi_c', experiment_data, status=201)
    res = testapp.get(pfile['@id']).json
    tf_info = res.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'in situ Hi-C'
    # make sure it does change
    testapp.patch_json(pfile['@id'], {'override_experiment_type': 'new type'}, status=200)
    res2 = testapp.get(pfile['@id']).json
    tf_info = res2.get('track_and_facet_info')
    assert tf_info['experiment_type'] == 'new type'
