import pytest


pytestmark = [pytest.mark.setone, pytest.mark.working]


DRS_PREFIX = f'/ga4gh/drs/v1/objects'


@pytest.fixture
def mcool_file_json(award, experiment, lab, file_formats):
    """ Duplicating fixture since these live in another file that is not shared """
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('mcool').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'content_md5sum': '00000000000000000000000000000000',
        'filename': 'my.cool.mcool',
        'status': 'uploaded',
    }
    return item


@pytest.fixture
def file(testapp, award, experiment, lab, file_formats):
    """ Duplicating fixture since these live in another file that is not shared """
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'file_format': file_formats.get('fastq').get('uuid'),
        'md5sum': '00000000000000000000000000000000',
        'content_md5sum': '00000000000000000000000000000000',
        'filename': 'my.fastq.gz',
        'status': 'uploaded',
    }
    res = testapp.post_json('/file_fastq', item)
    return res.json['@graph'][0]


def validate_drs_conversion(drs_obj, meta, uri=None):
    """ Validates drs object structure against the metadata in the db """
    assert drs_obj['id'] == meta['@id']
    assert drs_obj['created_time'] == meta['date_created']
    assert drs_obj['drs_id'] == meta['uuid']
    assert drs_obj['self_uri'] == f'drs://localhost:80{meta["@id"]}@@drs' if not uri else uri
    assert drs_obj['version'] == meta['md5sum']
    assert drs_obj['name'] == meta['filename']


def test_processed_file_drs_view(testapp, mcool_file_json):
    """ Tests that processed mcool gives a valid DRS response """
    meta = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    drs_meta = testapp.get(meta['@id'] + '@@drs').json
    validate_drs_conversion(drs_meta, meta)
    drs_meta = testapp.get(f'{DRS_PREFIX}/{meta["uuid"]}').json
    validate_drs_conversion(drs_meta, meta, uri=f'{DRS_PREFIX}/{meta["uuid"]}')


def test_fastq_file_drs_view(testapp, file):
    """ Tests that a fastq file has valid DRS response """
    drs_meta = testapp.get(file['@id'] + '@@drs').json
    validate_drs_conversion(drs_meta, file)
    drs_meta = testapp.get(f'{DRS_PREFIX}/{file["uuid"]}').json
    validate_drs_conversion(drs_meta, file, uri=f'{DRS_PREFIX}/{file["uuid"]}')


def test_fastq_file_drs_access(testapp, file):
    """ Tests that access URLs are retrieved successfully """
    drs_meta = testapp.get(file['@id'] + '@@drs').json
    drs_object_uri = drs_meta['drs_id']
    drs_object_download = testapp.get(f'/ga4gh/drs/v1/objects/{drs_object_uri}/access/').json
    assert drs_object_download == {
        'url': f'https://localhost:80/{drs_object_uri}/@@download'
    }
