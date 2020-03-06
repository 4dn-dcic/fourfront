import pytest
import time
import webtest

from .workbook_fixtures import app_settings, app


pytestmark = [pytest.mark.indexing, pytest.mark.working]


@pytest.fixture(scope='module')
def help_page_section_json():
    return {
        "title": "",
        "name" : "help.user-guide.rest-api.rest_api_submission",
        "file": "/docs/source/rest_api_submission.rst",
        "uuid" : "442c8aa0-dc6c-43d7-814a-854af460b020"
    }

@pytest.fixture(scope='module')
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

@pytest.fixture(scope='module')
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
        "status" : "draft"
    }

@pytest.fixture(scope='module')
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
        "status" : "deleted"
    }


@pytest.fixture(scope='module')
def posted_help_page_section(testapp, help_page_section_json):
    res = testapp.post_json('/static-sections/', help_page_section_json, status=201)
    return res.json['@graph'][0]


@pytest.fixture(scope='module')
def help_page(testapp, posted_help_page_section, help_page_json):
    try:
        res = testapp.post_json('/pages/', help_page_json, status=201)
        val = res.json['@graph'][0]
    except webtest.AppError:
        res = testapp.get('/' + help_page_json['uuid'], status=301).follow()
        val = res.json
    return val


@pytest.fixture(scope='module')
def help_page_deleted(testapp, posted_help_page_section, help_page_json_draft):
    try:
        res = testapp.post_json('/pages/', help_page_json_draft, status=201)
        val = res.json['@graph'][0]
    except webtest.AppError:
        res = testapp.get('/' + help_page_json_draft['uuid'], status=301).follow()
        val = res.json
    return val


@pytest.fixture(scope='module')
def help_page_restricted(testapp, posted_help_page_section, help_page_json_deleted):
    try:
        res = testapp.post_json('/pages/', help_page_json_deleted, status=201)
        val = res.json['@graph'][0]
    except webtest.AppError:
        res = testapp.get('/' + help_page_json_deleted['uuid'], status=301).follow()
        val = res.json
    return val


def test_get_help_page(testapp, help_page):
    help_page_url = "/" + help_page['name']
    res = testapp.get(help_page_url, status=200)
    assert res.json['@id'] == help_page_url
    assert res.json['@context'] == help_page_url
    assert 'HelpPage' in res.json['@type']
    assert 'StaticPage' in res.json['@type']
    #assert res.json['content'] == help_page['content'] # No longer works latter is set to an @id of static_section
    assert 'Accession and uuid are automatically assigned during initial posting' in res.json['content'][0]['content'] # Instead lets check what we have embedded on GET request is inside our doc file (rest_api_submission.md).
    assert res.json['toc'] == help_page['table-of-contents']


def test_get_help_page_deleted(anonhtmltestapp, help_page_deleted):
    help_page_url = "/" + help_page_deleted['name']
    anonhtmltestapp.get(help_page_url, status=403)


def test_get_help_page_no_access(anonhtmltestapp, testapp, help_page_restricted):
    help_page_url = "/" + help_page_restricted['name']
    anonhtmltestapp.get(help_page_url, status=403)
    testapp.get(help_page_url, status=200)


def test_page_unique_name(testapp, help_page, help_page_deleted):
    # POST again with same name and expect validation error
    new_page = {'name': help_page['name']}
    res = testapp.post_json('/page', new_page, status=422)
    expected_val_err = "%s already exists with name '%s'" % (help_page['uuid'], new_page['name'])
    assert expected_val_err in res.json['errors'][0]['description']

    # also test PATCH of an existing page with another name
    res = testapp.patch_json(help_page_deleted['@id'], {'name': new_page['name']}, status=422)
    assert expected_val_err in res.json['errors'][0]['description']
