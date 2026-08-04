import pytest

from base64 import b64decode, b64encode
from pathlib import Path
from pyramid.httpexceptions import HTTPFound
from snovault import BLOBS
from unittest import mock

from ..types import (
    Document,
    download,
    get_s3_presigned_url,
    normalize_document_attachment_mime_type,
)


pytestmark = [pytest.mark.working, pytest.mark.setone]


RED_DOT = """data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
9TXL0Y4OHwAAAABJRU5ErkJggg=="""

BLUE_DOT = """data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA
oAAAAKAQMAAAC3/F3+AAAACXBIWXMAAA7DAAAOwwHHb6hkAA
AAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQ
AAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPA
AAAANQTFRFALfvPEv6TAAAAAtJREFUCB1jYMAHAAAeAAEBGN
laAAAAAElFTkSuQmCC"""

ACTIVE_HTML = (
    "data:text/html;base64,"
    "PGh0bWw+PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PjwvaHRtbD4="
)
ACTIVE_SVG = (
    "data:image/svg+xml;base64,"
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3Jp"
    "cHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4="
)


@pytest.fixture
def testing_download(testapp):
    url = '/testing-downloads/'
    item = {
        'attachment': {
            'download': 'red-dot.png',
            'href': RED_DOT,
        },
        'attachment2': {
            'download': 'blue-dot.png',
            'href': BLUE_DOT,
        },
    }
    res = testapp.post_json(url, item, status=201)
    return res.location


def test_download_create(testapp, testing_download):
    res = testapp.get(testing_download)
    attachment = res.json['attachment']
    attachment2 = res.json['attachment2']

    assert attachment['href'] == '@@download/attachment/red-dot.png'
    assert attachment['type'] == 'image/png'
    assert attachment['width'] == 5
    assert attachment['height'] == 5
    assert attachment['md5sum'] == 'b60ab2708daec7685f3d412a5e05191a'
    url = testing_download + '/' + attachment['href']
    res = testapp.get(url)
    assert res.content_type == 'image/png'
    assert res.headers['Content-Disposition'] == 'attachment; filename="red-dot.png"'
    assert res.body == b64decode(RED_DOT.split(',', 1)[1])

    assert attachment2['href'] == '@@download/attachment2/blue-dot.png'
    assert attachment2['type'] == 'image/png'
    assert attachment2['width'] == 10
    assert attachment2['height'] == 10
    assert attachment2['md5sum'] == '013f03aa088adb19aa226c3439bda179'
    url = testing_download + '/' + attachment2['href']
    res = testapp.get(url)
    assert res.content_type == 'image/png'
    assert res.headers['Content-Disposition'] == 'attachment; filename="blue-dot.png"'
    assert res.body == b64decode(BLUE_DOT.split(',', 1)[1])


@pytest.mark.parametrize('filename,href,content_type', [
    ('active.html', ACTIVE_HTML, 'text/html'),
    ('active.svg', ACTIVE_SVG, 'image/svg+xml'),
])
def test_active_content_download_is_forced_to_attachment(
    testapp, filename, href, content_type
):
    item = {
        'attachment': {
            'download': filename,
            'href': href,
        },
    }
    location = testapp.post_json('/testing-downloads/', item, status=201).location
    attachment = testapp.get(location).json['attachment']
    response = testapp.get(location + '/' + attachment['href'])

    assert response.content_type == content_type
    assert response.headers['Content-Disposition'] == (
        'attachment; filename="%s"' % filename
    )


def test_s3_presign_forces_sanitized_attachment_disposition():
    client = mock.Mock()
    client.generate_presigned_url.return_value = 'https://example.test/download'
    with mock.patch('encoded.types.boto3.client', return_value=client):
        location = get_s3_presigned_url(
            {'bucket': 'bucket', 'key': 'key'},
            'unsafe\r\n"name.svg',
        )

    assert location == 'https://example.test/download'
    params = client.generate_presigned_url.call_args.kwargs['Params']
    assert params['ResponseContentDisposition'] == (
        'attachment; filename="unsafename.svg"'
    )


def test_blob_url_branch_receives_sanitized_download_metadata():
    blob_storage = mock.Mock()
    blob_storage.get_blob_url.return_value = 'https://example.test/download'
    context = mock.Mock(
        properties={},
        propsheets={
            'downloads': {
                'attachment': {
                    'download': 'unsafe\r\n"name.svg',
                    'blob_id': 'blob-id',
                },
            },
        },
    )
    request = mock.Mock(
        subpath=('attachment', 'unsafe\r\n"name.svg'),
        registry={BLOBS: blob_storage},
    )

    with pytest.raises(HTTPFound) as raised:
        download(context, request)

    assert raised.value.location == 'https://example.test/download'
    download_meta = blob_storage.get_blob_url.call_args.args[0]
    assert download_meta['download'] == 'unsafename.svg'
    assert context.propsheets['downloads']['attachment']['download'] == (
        'unsafe\r\n"name.svg'
    )


def test_download_update(testapp, testing_download):
    item = {
        'attachment': {
            'download': 'blue-dot.png',
            'href': BLUE_DOT,
        },
        'attachment2': {
            'download': 'red-dot.png',
            'href': RED_DOT,
        },
    }
    testapp.put_json(testing_download, item, status=200)
    res = testapp.get(testing_download)
    attachment = res.json['attachment']
    attachment2 = res.json['attachment2']

    assert attachment['href'] == '@@download/attachment/blue-dot.png'
    url = testing_download + '/' + attachment['href']
    res = testapp.get(url)
    assert res.content_type == 'image/png'
    assert res.body == b64decode(BLUE_DOT.split(',', 1)[1])

    assert attachment2['href'] == '@@download/attachment2/red-dot.png'
    url = testing_download + '/' + attachment2['href']
    res = testapp.get(url)
    assert res.content_type == 'image/png'
    assert res.body == b64decode(RED_DOT.split(',', 1)[1])


def test_download_update_no_change(testapp, testing_download):
    item = {
        'attachment': {
            'download': 'red-dot.png',
            'href': '@@download/attachment/red-dot.png',
        },
        'attachment2': {
            'download': 'blue-dot.png',
            'href': '@@download/attachment2/blue-dot.png',
        },
    }
    testapp.put_json(testing_download, item, status=200)

    res = testapp.get(testing_download)
    attachment = res.json['attachment']
    attachment2 = res.json['attachment2']
    assert attachment['href'] == '@@download/attachment/red-dot.png'
    assert attachment2['href'] == '@@download/attachment2/blue-dot.png'


def test_download_update_one(testapp, testing_download):
    item = {
        'attachment': {
            'download': 'red-dot.png',
            'href': '@@download/attachment/red-dot.png',
        },
        'attachment2': {
            'download': 'red-dot.png',
            'href': RED_DOT,
        },
    }
    testapp.put_json(testing_download, item, status=200)

    res = testapp.get(testing_download)
    attachment = res.json['attachment']
    attachment2 = res.json['attachment2']

    assert attachment['href'] == '@@download/attachment/red-dot.png'
    url = testing_download + '/' + attachment['href']
    res = testapp.get(url)
    assert res.content_type == 'image/png'
    assert res.body == b64decode(RED_DOT.split(',', 1)[1])

    assert attachment2['href'] == '@@download/attachment2/red-dot.png'
    url = testing_download + '/' + attachment2['href']
    res = testapp.get(url)
    assert res.content_type == 'image/png'
    assert res.body == b64decode(RED_DOT.split(',', 1)[1])


def test_download_remove_one(testapp, testing_download):
    item = {
        'attachment': {
            'download': 'red-dot.png',
            'href': '@@download/attachment/red-dot.png',
        },
    }
    testapp.put_json(testing_download, item, status=200)

    res = testapp.get(testing_download)
    assert 'attachment' in res.json
    assert 'attachment2' not in res.json

    url = testing_download + '/@@download/attachment2/red-dot.png'
    testapp.get(url, status=404)


@pytest.mark.parametrize(
    'href',
    [
        '@@download/attachment/another.png',
        'http://example.com/another.png',
    ])
def test_download_update_bad_change(testapp, testing_download, href):
    item = {'attachment': {
        'download': 'red-dot.png',
        'href': href,
    }}
    testapp.put_json(testing_download, item, status=422)


@pytest.mark.parametrize(
    'href',
    [
        'http://example.com/another.png',
        'data:image/png;base64,NOT_BASE64',
        'data:image/png;NOT_A_PNG',
        'data:text/plain;asdf',
    ])
def test_download_create_bad_change(testapp, href):
    url = '/testing-downloads/'
    item = {'attachment': {
        'download': 'red-dot.png',
        'href': href,
    }}
    testapp.post_json(url, item, status=422)


def test_download_create_force_extension(testapp):
    url = '/testing-downloads/'
    item = {'attachment': {
        'download': 'red-dot.png',
        'href': '@@download/attachment/another.png',
    }}
    testapp.post_json(url, item, status=201)


def test_download_create_wrong_extension(testapp):
    url = '/testing-downloads/'
    item = {'attachment': {
        'download': 'red-dot.jpg',
        'href': RED_DOT,
    }}
    testapp.post_json(url, item, status=422)


def test_download_create_w_wrong_md5sum(testapp):
    url = '/testing-downloads/'
    item = {'attachment': {
        'download': 'red-dot.jpg',
        'href': RED_DOT,
        'md5sum': 'deadbeef',
    }}
    testapp.post_json(url, item, status=422)


def test_download_item_with_attachment(testapp, award, lab):
    item = {
        'attachment': {
            'download': 'red-dot.png',
            'href': RED_DOT,
            'blob_id': 'fa4558df-c38f-4d72-a1ea-c1a58133a4b0',
        },
        'award': award['@id'],
        'lab': lab['@id']
    }
    res = testapp.post_json('/document', item).json['@graph'][0]

    with mock.patch('encoded.types.get_s3_presigned_url', return_value=''):
        testapp.get(res['@id'] + res['attachment']['href'], status=200)


def browser_octet_stream_attachment(filename, content):
    return {
        'download': filename,
        'type': 'application/octet-stream',
        'href': 'data:application/octet-stream;base64,%s' % (
            b64encode(content).decode('ascii')
        ),
    }


def document_with_attachment(award, lab, attachment):
    return {
        'attachment': attachment,
        'award': award['@id'],
        'lab': lab['@id'],
    }


def test_normalize_document_attachment_mime_type_for_allowed_filename():
    attachment = browser_octet_stream_attachment('synthetic-document.pdf', b'pdf')
    properties = {'attachment': attachment}
    context = mock.Mock(type_info=mock.Mock(schema=Document.schema))
    request = mock.Mock(json=properties)

    normalize_document_attachment_mime_type(context, request)

    assert properties['attachment'] == {
        'download': 'synthetic-document.pdf',
        'type': 'application/pdf',
        'href': 'data:application/pdf;base64,cGRm',
    }
    assert properties['attachment'] is not attachment


def test_normalize_document_attachment_mime_type_keeps_unknown_filename():
    attachment = browser_octet_stream_attachment('synthetic-document.payload', b'bin')
    properties = {'attachment': attachment}
    context = mock.Mock(type_info=mock.Mock(schema=Document.schema))
    request = mock.Mock(json=properties)

    normalize_document_attachment_mime_type(context, request)

    assert properties['attachment'] is attachment


def test_document_upload_normalizes_browser_octet_stream(testapp, award, lab):
    pdf = Path(__file__).parent.joinpath('data', 'documents', 'test.pdf').read_bytes()
    item = document_with_attachment(
        award,
        lab,
        browser_octet_stream_attachment('synthetic-document.pdf', pdf),
    )

    document = testapp.post_json('/document', item, status=201).json['@graph'][0]

    assert document['attachment']['type'] == 'application/pdf'
    assert document['attachment']['href'].endswith('/synthetic-document.pdf')


def test_document_upload_still_rejects_octet_stream_content_mismatch(
    testapp, award, lab
):
    item = document_with_attachment(
        award,
        lab,
        browser_octet_stream_attachment('synthetic-document.pdf', b'\x00' * 1024),
    )

    response = testapp.post_json('/document', item, status=422)

    assert any(
        'Incorrect file type' in error['description']
        for error in response.json['errors']
    )


def test_document_upload_still_rejects_unknown_octet_stream_type(
    testapp, award, lab
):
    item = document_with_attachment(
        award,
        lab,
        browser_octet_stream_attachment('synthetic-document.payload', b'\x00' * 1024),
    )

    testapp.post_json('/document', item, status=422)
