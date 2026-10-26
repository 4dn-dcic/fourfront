"""Keep Snovault's validation-only boundary intact on Fourfront's Document routes."""

from uuid import uuid4

import pytest
from snovault.loadxl import load_all_gen


pytestmark = [pytest.mark.working, pytest.mark.setone]


@pytest.fixture
def validation_document(testapp, award, lab):
    location = testapp.post_json('/document', {
        'award': award['@id'],
        'lab': lab['@id'],
        'description': 'original',
    }, status=201).location
    return location, testapp.get(location + '?frame=raw').json


@pytest.mark.parametrize('method', ['post_json', 'put_json', 'patch_json'])
@pytest.mark.parametrize('validate', ['', '&validate=false'])
def test_document_skip_links_rejects_persisting_requests(
    testapp, validation_document, method, validate
):
    location, original = validation_document
    body = dict(original, description='must not persist')
    target = location
    if method == 'post_json':
        body = {key: body[key] for key in ('award', 'lab', 'description')}
        body['uuid'] = str(uuid4())
        target = '/document'

    getattr(testapp, method)(target + '?skip_links=true' + validate, body, status=400)

    assert testapp.get(location + '?frame=raw').json == original
    if method == 'post_json':
        testapp.get('/documents/' + body['uuid'] + '/', status=404)


@pytest.mark.parametrize('method', ['post_json', 'put_json', 'patch_json'])
def test_document_check_only_can_defer_links_without_writing(
    testapp, validation_document, method
):
    location, original = validation_document
    body = dict(original, lab=str(uuid4()), description='must not persist')
    target = location
    if method == 'post_json':
        body = {key: body[key] for key in ('award', 'lab', 'description')}
        body['uuid'] = str(uuid4())
        target = '/document'

    response = getattr(testapp, method)(
        target + '?check_only=true&skip_links=true', body, status=200
    )

    assert response.json['status'] == 'success'
    assert testapp.get(location + '?frame=raw').json == original
    if method == 'post_json':
        testapp.get('/documents/' + body['uuid'] + '/', status=404)


@pytest.mark.parametrize('validate_only,skip_links', [(True, True), (True, False), (False, False)])
def test_loadxl_document_patch_only_respects_validation_mode(
    testapp, validation_document, validate_only, skip_links
):
    location, original = validation_document
    revisions_before = testapp.get(location + '@@revision-history').json['revisions']
    store = {'document': [{'uuid': original['uuid'], 'description': 'updated'}]}

    output = b''.join(load_all_gen(
        testapp, store, None, from_json=True, patch_only=True,
        validate_only=validate_only, skip_links=skip_links, noset_last_modified=True,
    )).decode('utf-8').splitlines()

    assert not any(line.startswith('ERROR:') for line in output), output
    current = testapp.get(location + '?frame=raw').json
    revisions_after = testapp.get(location + '@@revision-history').json['revisions']
    if validate_only:
        assert any(line.startswith('CHECK:') for line in output), output
        assert not any(line.startswith('PATCH:') for line in output), output
        assert current == original
        assert revisions_after == revisions_before
    else:
        assert any(line.startswith('PATCH:') for line in output), output
        assert current['description'] == 'updated'
        assert len(revisions_after) == len(revisions_before) + 1
