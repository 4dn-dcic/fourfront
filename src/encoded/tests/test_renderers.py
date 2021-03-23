import pytest
import urllib.parse

from dcicutils.lang_utils import n_of
from dcicutils.misc_utils import filtered_warnings
from dcicutils.qa_utils import MockResponse
from pyramid.testing import DummyRequest
from unittest import mock
from .. import renderers
from ..renderers import (
    best_mime_type, should_transform, MIME_TYPES_SUPPORTED, MIME_TYPE_DEFAULT,
    MIME_TYPE_JSON, MIME_TYPE_HTML, MIME_TYPE_LD_JSON, MIME_TYPE_TRIAGE_MODE,
)


pytestmark = [pytest.mark.setone, pytest.mark.working]


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

    # The MIME_TYPES_SUPPORTED is a list whose first element has elevated importance as we've structured things.
    # First check that it is a list, and that its contents contain the things we support. That isn't controversial.
    assert isinstance(MIME_TYPES_SUPPORTED, list)
    assert set(MIME_TYPES_SUPPORTED) == {MIME_TYPE_JSON, MIME_TYPE_HTML, MIME_TYPE_LD_JSON}
    # Check that the first element is consistent with the MIME_TYPE_DEFAULT.
    # It's an accident of history that this next relationship matters, but at this point check for consistency.
    assert MIME_TYPE_DEFAULT == MIME_TYPES_SUPPORTED[0]
    # Now we concern ourselves with the actual values...
    assert MIME_TYPES_SUPPORTED == [MIME_TYPE_HTML, MIME_TYPE_JSON, MIME_TYPE_LD_JSON]
    assert MIME_TYPE_DEFAULT == MIME_TYPE_HTML

    # Regardless of whether we're using legacy mode or modern mode, we should get the same result.
    assert MIME_TYPE_TRIAGE_MODE in ['legacy', 'modern']


VARIOUS_MIME_TYPES_TO_TEST = ['*/*', 'text/html', 'application/json', 'application/ld+json', 'text/xml', 'who/cares']


def test_best_mime_type():

    # TODO: I think best_mime_type is not doing the right thing. It SHOULD be looking at the Accept header
    #       not at a constant list. For now a test of legacy behavior to keep it stable, but at some point
    #       we should experiment with making it responsive to bids in the Accept field.
    #       -kmp 18-Mar-2021

    the_constant_answer=MIME_TYPE_DEFAULT

    with filtered_warnings("ignore", category=DeprecationWarning):
        # Suppresses this warning:
        #     DeprecationWarning: The behavior of .best_match for the Accept classes is currently being maintained
        #       for backward compatibility, but the method will be deprecated in the future, as its behavior is not
        #       specified in (and currently does not conform to) RFC 7231.
        for requested_mime_type in VARIOUS_MIME_TYPES_TO_TEST:
            req = DummyRequest(headers={'Accept': requested_mime_type})
            assert best_mime_type(req, 'legacy') == the_constant_answer
            assert best_mime_type(req, 'modern') == the_constant_answer
            req = DummyRequest(headers={})  # The Accept header in the request just isn't being consulted
            assert best_mime_type(req, 'modern') == the_constant_answer
            assert best_mime_type(req, 'modern') == the_constant_answer


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

    passed = []
    failed = []
    problem_area = set()

    with filtered_warnings("ignore", category=DeprecationWarning):
        # Suppresses this warning:
        #     DeprecationWarning: The behavior of .best_match for the Accept classes is currently being maintained
        #       for backward compatibility, but the method will be deprecated in the future, as its behavior is not
        #       specified in (and currently does not conform to) RFC 7231.

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

                                _should_transform = should_transform(req, resp)

                                situation = {
                                    'method': method,
                                    "format": _format,
                                    "encoded_params": urllib.parse.urlencode(params),
                                    "requested": requested_mime_type,
                                    "response_content_type": response_content_type,
                                    "frame": frame,
                                    "url": url,
                                    "params": params,
                                }

                                if req.method not in ('GET', 'HEAD'):
                                    rule_applied = "method not GET or HEAD"
                                    correct = not _should_transform
                                elif resp.content_type != 'application/json':
                                    # If the response MIME type is not application/json,
                                    # it just can't be transformed at all.
                                    rule_applied = "content_type is not application/json"
                                    correct = not _should_transform
                                # TODO: Lack of support for this case is a bug we should fix. -kmp 17-Mar-2021
                                # elif params.get("frame", "page") != 'page':
                                #     rule_applied = "?frame=xxx is not page"
                                #     correct = not _should_transform
                                elif _format is not None:
                                    rule_applied = "?format=xxx given but not html"
                                    correct = _should_transform is (_format == 'html')
                                else:
                                    rule_applied = "default method (no other rules matched)"
                                    correct = _should_transform  # If no cue is given, default to HTML

                                if correct:
                                    # There are a lot of cases, so we don't print stuff here by default, but
                                    # uncomment to see what cases are passing as they pass:
                                    # print(situation)
                                    # print("=should_transform?=>", _should_transform, "(correct)")
                                    passed.append(situation)

                                else:
                                    # There are a lot of cases, so we don't print stuff here by default, but
                                    # uncomment to see what cases are failing as they fail:
                                    # print(situation)
                                    # print("=should_transform?=>", _should_transform, "(WRONG)")
                                    failed.append(situation)
                                    problem_area.add(rule_applied)

    if failed:
        # Collect all failures in one place:
        print("FAILED:")
        for failure in failed:
            print(" method=%(method)s format=%(format)s requested=%(requested)s"
                  " response_content_type=%(response_content_type)s frame=%(frame)s"
                  " url=%(url)s params=%(encoded_params)s"
                  % failure)

    n_failed = len(failed)
    n_passed = len(passed)
    assert not n_failed, (
            "%s passed, %s FAILED (%s: %s)"
            % (n_passed, n_failed, n_of(problem_area, "problem area"), ", ".join(problem_area))
    )
    print("\n", n_passed, "combinations tried. ALL PASSED")


def test_should_transform_without_best_mime_type():

    # As we call things now, we really don't need the best_mime_type function because it just returns the
    # first element of its first argument. That probably should change. Because it should be a function
    # of the request and its Accept offerings. Even so, we test for this now not because this makes programs
    # right, but so we notice if/when this truth changes. -kmp 23-Mar-2021

    with mock.patch.object(renderers, "best_mime_type") as mock_best_mime_type:

        # Demonstrate that best_mime_type(...) could be replaced by MIME_TYPES_SUPPORTED[0]
        mock_best_mime_type.return_value = MIME_TYPES_SUPPORTED[0]

        test_should_transform()
