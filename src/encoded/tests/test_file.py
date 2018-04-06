import pytest
from encoded.types.file import File, FileFastq, FileFasta, post_upload, force_beanstalk_env
from pyramid.httpexceptions import HTTPForbidden
import os
pytestmark = pytest.mark.working



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
    assert mcool_file_json['md5sum'] in res.json['errors'][0]['description']

    res = testapp.put_json('/file_processed/%s' % res_2['accession'], mcool_file_json, status=422)
    assert 'ValidationFailure' in res.json['@type']
    assert mcool_file_json['md5sum'] in res.json['errors'][0]['description']




def test_processed_file_unique_md5_skip_validation(testapp, mcool_file_json):
    # first time pass
    res = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    testapp.post_json('/file_processed?force_md5=true', mcool_file_json)
    testapp.patch_json('/file_processed/%s/?force_md5=true' % res['accession'] , mcool_file_json)
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
def fastq_json(award, experiment, lab):
    return {
        'accession': '4DNFIO67APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': 'fastq',
        'filename': 'test.fastq.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploaded',
    }


@pytest.fixture
def proc_file_json(award, experiment, lab):
    return {
        'accession': '4DNFIO67APU2',
        'award': award['uuid'],
        'lab': lab['uuid'],
        'file_format': 'pairs',
        'filename': 'test.pairs.gz',
        'md5sum': '0123456789abcdef0123456789abcdef',
        'status': 'uploading',
    }


@pytest.fixture
def fasta_json(award, experiment, lab):
    return {
        'accession': '4DNFIO67APA2',
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


def test_extra_files(testapp, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    assert len(resobj['extra_files']) == len(extra_files)
    file_name = ("%s.pairs.gz.px2" % (resobj['accession']))
    expected_key = "%s/%s" % (resobj['uuid'], file_name)
    assert resobj['extra_files'][0]['upload_key'] == expected_key
    assert resobj['extra_files'][0]['href']
    assert resobj['extra_files_creds'][0]['upload_key'] == expected_key
    assert resobj['extra_files_creds'][0]['upload_credentials']
    assert 'test-wfout-bucket' in resobj['upload_credentials']['upload_url']
    assert resobj['extra_files'][0]['status'] == proc_file_json['status']


def test_patch_extra_files(testapp, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]

    # now patch this guy with just the extra files
    patch = {'uuid': resobj['uuid'], 'extra_files': extra_files}
    res = testapp.patch_json('/file_processed/' + resobj['uuid'], patch, status=200)
    resobj = res.json['@graph'][0]

    # ensure we get correct stuff back after a patch
    # bug was that we were only getting back the file_format
    assert len(resobj['extra_files']) == len(extra_files)
    file_name = ("%s.pairs.gz.px2" % (resobj['accession']))
    expected_key = "%s/%s" % (resobj['uuid'], file_name)
    assert resobj['extra_files'][0]['upload_key'] == expected_key
    assert resobj['extra_files'][0]['href']
    assert resobj['extra_files_creds'][0]['upload_key'] == expected_key
    assert resobj['extra_files_creds'][0]['upload_credentials']
    assert 'test-wfout-bucket' in resobj['upload_credentials']['upload_url']
    assert resobj['extra_files'][0]['status'] == proc_file_json['status']


def test_extra_files_download(testapp, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]
    download_link = resobj['extra_files'][0]['href']
    testapp.get(download_link, status=307)
    testapp.get(resobj['href'], status=307)


def test_extra_files_get_upload(testapp, proc_file_json):
    extra_files = [{'file_format': 'pairs_px2'}]
    proc_file_json['extra_files'] = extra_files
    res = testapp.post_json('/file_processed', proc_file_json, status=201)
    resobj = res.json['@graph'][0]

    get_res = testapp.get(resobj['@id']+'/upload')
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
    assert 'test-bucket' in resobj['upload_credentials']['upload_url']


def test_files_aws_credentials_change_filename(testapp, fastq_uploading):
    fastq_uploading['filename'] = 'test.zip'
    fastq_uploading['file_format'] = 'zip'
    res = testapp.post_json('/file_calibration', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]

    fastq_uploading['filename'] = 'test.tiff'
    fastq_uploading['file_format'] = 'tiff'
    res_put = testapp.put_json(resobj['@id'], fastq_uploading)

    assert resobj['upload_credentials']['key'].endswith('zip')
    assert resobj['href'].endswith('zip')
    assert res_put.json['@graph'][0]['upload_credentials']['key'].endswith('tiff')
    assert res_put.json['@graph'][0]['href'].endswith('tiff')


def test_status_change_doesnt_muck_with_creds(testapp, fastq_uploading):
    fastq_uploading['filename'] = 'test.zip'
    fastq_uploading['file_format'] = 'zip'
    res = testapp.post_json('/file_calibration', fastq_uploading, status=201)
    resobj = res.json['@graph'][0]

    fastq_uploading['status'] = 'released'
    res_put = testapp.put_json(resobj['@id'], fastq_uploading)
    res_upload = testapp.get(resobj['@id'] + '/upload')
    put_obj = res_upload.json['@graph'][0]

    assert resobj['upload_credentials']['key'] == put_obj['upload_credentials']['key']

    assert resobj['href'] == res_put.json['@graph'][0]['href']


def test_s3_filename_validation(testapp, fastq_uploading):
    """
    s3 won't allow certain characters in filenames, hence the regex validator
    created in file.json schema. Required regex is: "^[\\w+=,.@-]*$"
    """
    # first a working one
    fastq_uploading['filename'] = 'test_file.fastq.gz'
    fastq_uploading['file_format'] = 'fastq'
    testapp.post_json('/file_fastq', fastq_uploading, status=201)
    # now some bad boys that don't pass
    fastq_uploading['filename'] = 'test file.fastq.gz'
    fastq_uploading['file_format'] = 'fastq'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)
    fastq_uploading['filename'] = 'test|file.fastq.gz'
    fastq_uploading['file_format'] = 'fastq'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)
    fastq_uploading['filename'] = 'test~file.fastq.gz'
    fastq_uploading['file_format'] = 'fastq'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)
    fastq_uploading['filename'] = 'test#file.fastq.gz'
    fastq_uploading['file_format'] = 'fastq'
    testapp.post_json('/file_fastq', fastq_uploading, status=422)



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
def mcool_file_json(award, experiment, lab):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': 'mcool',
        'md5sum': '00000000000000000000000000000000',
        'filename': 'my.cool.mcool',
        'status': 'uploaded',
    }
    return item

@pytest.fixture
def mcool_file(testapp, mcool_file_json):
    res = testapp.post_json('/file_processed', mcool_file_json)
    return res.json['@graph'][0]

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
    secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
    key = os.environ.get("AWS_ACCESS_KEY_ID")
    os.environ.pop("AWS_SECRET_ACCESS_KEY")
    os.environ.pop("AWS_ACCESS_KEY_ID")

    import tempfile
    test_cfg = tempfile.NamedTemporaryFile(mode='w', delete=False)
    test_cfg.write('export AWS_SECRET_ACCESS_KEY="its a secret"\n')
    test_cfg.write('export AWS_ACCESS_KEY_ID="its a secret id"\n')
    test_cfg_name = test_cfg.name
    test_cfg.close()

    # mock_boto
    mock_boto = mocker.patch('encoded.types.file.boto', autospec=True)

    force_beanstalk_env(profile_name=None, config_file=test_cfg_name)
    # reset
    os.environ["AWS_SECRET_ACCESS_KEY"] = secret
    os.environ["AWS_ACCESS_KEY_ID"] = key
    # os.remove(test_cfg.delete)

    # ensure boto called with correct arguments
    mock_boto.connect_sts.assert_called_once_with(aws_access_key_id='its a secret id',
                                                  aws_secret_access_key='its a secret')
