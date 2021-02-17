from dcicutils.qa_utils import MockResponse
from unittest import mock
from pyramid.testing import DummyRequest
from .. import renderers
from ..renderers import (
    best_mime_type, should_transform, MIME_TYPES_SUPPORTED, MIME_TYPE_DEFAULT,
    MIME_TYPE_JSON, MIME_TYPE_HTML, MIME_TYPE_LD_JSON,
)


DEFAULT_SHOULD_TRANSFORM = (MIME_TYPE_DEFAULT == MIME_TYPE_HTML)


class DummyResponse(MockResponse):

    def __init__(self, content_type=None, status_code: int = 200, json=None, content=None, url=None,
                 params=None):
        self.params = {} if params is None else params
        self.content_type = content_type
        super().__init__(status_code=status_code, json=json, content=content, url=url)


def test_mime_variables():

    # Really these don't need testing but it's useful visually to remind us of their values here.
    assert MIME_TYPE_HTML == 'text/html'
    assert MIME_TYPE_JSON == 'application/json'
    assert MIME_TYPE_LD_JSON == 'application/ld+json'
    assert MIME_TYPES_SUPPORTED == [MIME_TYPE_JSON, MIME_TYPE_HTML, MIME_TYPE_LD_JSON]
    assert MIME_TYPE_DEFAULT == MIME_TYPE_JSON


VARIOUS_MIME_TYPES_TO_TEST = ['*/*', 'text/html', 'application/json', 'application/ld+json', 'text/xml', 'who/cares']


def test_best_mime_type(the_constant_answer=MIME_TYPE_DEFAULT):

    for requested_mime_type in VARIOUS_MIME_TYPES_TO_TEST:
        req = DummyRequest(headers={'Accept': requested_mime_type})
        assert best_mime_type(req, 'legacy') == the_constant_answer
        assert best_mime_type(req, 'modern') == the_constant_answer
        req = DummyRequest(headers={})  # The Accept header in the request just isn't being consulted
        assert best_mime_type(req, 'modern') == the_constant_answer
        assert best_mime_type(req, 'modern') == the_constant_answer


def test_best_mime_type_traditional():

    test_best_mime_type('application/json')


TYPICAL_URLS = [
    'http://whatever/foo',
    'http://whatever/foo/',
    'http://whatever/foo.json',
    'http://whatever/foo.html',
]

ALLOWED_FRAMES_OR_NONE = ['raw', 'page', 'embedded', 'object', 'bad', None]

SOME_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']

ALLOWED_FORMATS_OR_NONE = ['json', 'html', None]


def test_should_transform():

    for method in SOME_HTTP_METHODS:
        for _format in ALLOWED_FORMATS_OR_NONE:
            for requested_mime_type in VARIOUS_MIME_TYPES_TO_TEST:
                for response_content_type in VARIOUS_MIME_TYPES_TO_TEST:
                    for frame in [None] + ALLOWED_FRAMES_OR_NONE:
                        for url in TYPICAL_URLS:

                            params = {}
                            if frame is not None:
                                params['frame'] = frame
                            if _format is not None:
                                params['format'] = _format

                            req = DummyRequest(headers={'Accept': requested_mime_type},
                                               method=method,
                                               url=url,
                                               params=params)
                            resp = DummyResponse(content_type=response_content_type, url=url)

                            print("method=", method,
                                  "format=", _format,
                                  "params=", params,
                                  "requested=", requested_mime_type,
                                  "response_content_type=", response_content_type,
                                  "frame=", frame,
                                  )

                            if req.method not in ('GET', 'HEAD'):
                                assert not should_transform(req, resp)
                            elif resp.content_type != 'application/json':
                                # If the response MIME type is not application/json,
                                # it just can't be transformed at all.
                                assert not should_transform(req, resp)
                            elif params.get("frame", "page") != 'page':
                                assert not should_transform(req, resp)
                            elif _format is not None:
                                assert should_transform(req, resp) is (_format == 'html')
                            else:
                                assert should_transform(req, resp) is DEFAULT_SHOULD_TRANSFORM


def test_should_transform_without_best_mime_type():

    with mock.patch.object(renderers, "best_mime_type") as mock_best_mime_type:

        # Demonstrate that best_mime_type(...) could be replaced by MIME_TYPES_SUPPORTED[0]
        mock_best_mime_type.return_value = MIME_TYPES_SUPPORTED[0]

        test_should_transform()

