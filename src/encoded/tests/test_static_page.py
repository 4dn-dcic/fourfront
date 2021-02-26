import contextlib
import pytest
import webtest

from dcicutils.qa_utils import notice_pytest_fixtures
from dcicutils.misc_utils import url_path_join


pytestmark = [pytest.mark.working]


@pytest.fixture(scope='session')
def help_page_section_json():
    return {
        "title": "",
        "name": "help.user-guide.rest-api.rest_api_submission",
        "file": "/docs/source/rest_api_submission.rst",
        "uuid": "442c8aa0-dc6c-43d7-814a-854af460b020"
    }


@pytest.fixture(scope='session')
def help_page_json():
    return {
        "name": "help/user-guide/rest-api",
        "title": "The REST-API",
        "content": ["442c8aa0-dc6c-43d7-814a-854af460b020"],
        "uuid": "a2aa8bb9-9dd9-4c80-bdb6-2349b7a3540d",
        "table-of-contents": {
            "enabled": True,
            "header-depth": 4,
            "list-styles": ["decimal", "lower-alpha", "lower-roman"]
        }
    }


@pytest.fixture(scope='session')
def help_page_json_draft():
    return {
        "name": "help/user-guide/rest-api-draft",
        "title": "The REST-API",
        "content": ["442c8aa0-dc6c-43d7-814a-854af460b020"],
        "uuid": "a2aa8bb9-9dd9-4c80-bdb6-2349b7a3540c",
        "table-of-contents": {
            "enabled": True,
            "header-depth": 4,
            "list-styles": ["decimal", "lower-alpha", "lower-roman"]
        },
        "status": "draft"
    }


@pytest.fixture(scope='session')
def help_page_json_deleted():
    return {
        "name": "help/user-guide/rest-api-deleted",
        "title": "The REST-API",
        "content": ["442c8aa0-dc6c-43d7-814a-854af460b020"],
        "uuid": "a2aa8bb9-9dd9-4c80-bdb6-2349b7a3540a",
        "table-of-contents": {
            "enabled": True,
            "header-depth": 4,
            "list-styles": ["decimal", "lower-alpha", "lower-roman"]
        },
        "status": "deleted"
    }


# Move this to some test utilities place when debugged
JSON_HEADERS = {'Content-Type': 'application/json', 'Accept': 'application/json'}


# Move this to some test utilities place when debugged
@contextlib.contextmanager
def posted_page(testapp, base_url, content):
    uuid = content.get('uuid')
    try:
        [val] = testapp.post_json(base_url, content, status=(201, 301)).maybe_follow().json['@graph']
    except webtest.AppError:
        val = testapp.get(url_path_join('/', base_url, uuid),
                          headers=JSON_HEADERS,
                          status=(200, 301)).maybe_follow().json
    uuid = uuid or val.get('uuid')
    yield val
    if uuid:
        # Note: Without JSON headers, this will get a 415 even if it's not using the result data. -kmp 23-Feb-2021
        testapp.delete(url_path_join('/', uuid), headers=JSON_HEADERS)


def wait_for_index(testapp):
    testapp.post_json("/index", {"record": False})


@pytest.fixture()
def posted_help_page_section(workbook, es_testapp, help_page_section_json):
    notice_pytest_fixtures(workbook)
    with posted_page(es_testapp, '/static-sections', help_page_section_json) as val:
        yield val


@pytest.yield_fixture()
def posted_help_page(workbook, es_testapp, posted_help_page_section, help_page_json):
    notice_pytest_fixtures(workbook, posted_help_page_section)
    with posted_page(es_testapp, '/pages', help_page_json) as val:
        yield val


@pytest.yield_fixture()
def posted_help_page_draft(workbook, es_testapp, posted_help_page_section, help_page_json_draft):
    notice_pytest_fixtures(workbook, posted_help_page_section)
    with posted_page(es_testapp, '/pages', help_page_json_draft) as val:
        yield val


@pytest.yield_fixture()
def posted_help_page_deleted(workbook, es_testapp, posted_help_page_section, help_page_json_deleted):
    notice_pytest_fixtures(workbook, posted_help_page_section)
    with posted_page(es_testapp, '/pages', help_page_json_deleted) as val:
        yield val

# TODO: There is no help_page_json_restricted.  What was that supposed to test? -kmp 23-Feb-2021
#
# @pytest.yield_fixture()
# def posted_help_page_restricted(workbook, es_testapp, posted_help_page_section, help_page_json_restricted):
#     notice_pytest_fixtures(workbook, posted_help_page_section)
#     with posted_page(es_testapp, '/pages', help_page_json_restricted) as val:
#         yield val


def test_get_help_page(workbook, es_testapp, posted_help_page):
    wait_for_index(es_testapp)
    help_page_url = "/" + posted_help_page['name']
    res = es_testapp.get(help_page_url, status=200)
    assert res.json['@id'] == help_page_url
    assert res.json['@context'] == help_page_url
    assert 'HelpPage' in res.json['@type']
    assert 'StaticPage' in res.json['@type']
    # assert res.json['content'] == help_page['content'] # No longer works latter is set to an @id of static_section
    # Instead lets check what we have embedded on GET request is inside our doc file (rest_api_submission.md).
    assert 'Accession and uuid are automatically assigned during initial posting' in res.json['content'][0]['content']
    assert res.json['toc'] == posted_help_page['table-of-contents']


def test_get_help_page_draft(workbook, anon_html_es_testapp, html_es_testapp, posted_help_page_draft):
    wait_for_index(html_es_testapp)
    help_page_url = "/" + posted_help_page_draft['name']
    anon_html_es_testapp.get(help_page_url, status=403)
    html_es_testapp.get(help_page_url, status=200)


def test_get_help_page_deleted(workbook, anon_html_es_testapp, html_es_testapp, posted_help_page_deleted):
    wait_for_index(html_es_testapp)
    help_page_url = "/" + posted_help_page_deleted['name']
    anon_html_es_testapp.get(help_page_url, status=403)
    html_es_testapp.get(help_page_url, status=200)  # Why 200 and not 404? -kmp 23-Feb-2021


# Changed out posted_help_page_restricted for posted_help_page. -kmp 23-Feb-2021
def test_get_help_page_no_access(workbook, anon_html_es_testapp, html_es_testapp, posted_help_page):
    wait_for_index(html_es_testapp)
    help_page_url = "/" + posted_help_page['name']
    anon_html_es_testapp.get(help_page_url, status=403)
    html_es_testapp.get(help_page_url, status=200)


def test_page_unique_name(workbook, es_testapp, posted_help_page, posted_help_page_draft):
    # POST again with same name and expect validation error
    new_page = {'name': posted_help_page['name']}
    res = es_testapp.post_json('/page', new_page, status=422)
    expected_val_err = "%s already exists with name '%s'" % (posted_help_page['uuid'], new_page['name'])
    actual_error_description = res.json['errors'][0]['description']
    print("expected:", expected_val_err)
    print("actual:", actual_error_description)
    assert expected_val_err in actual_error_description

    # also test PATCH of an existing page with another name
    res = es_testapp.patch_json(posted_help_page_draft['@id'], {'name': new_page['name']}, status=422)
    assert expected_val_err in res.json['errors'][0]['description']
