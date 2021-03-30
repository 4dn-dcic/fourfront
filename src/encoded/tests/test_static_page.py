import pytest

from dcicutils.qa_utils import notice_pytest_fixtures
from .workbook_fixtures import workbook, app_settings, app
from ..util import workbook_lookup

notice_pytest_fixtures(workbook, app_settings, app)

pytestmark = [pytest.mark.working, pytest.mark.workbook, pytest.mark.indexing]


@pytest.fixture
def static_help_page_default():
    return workbook_lookup(item_type='Page', name='help/user-guide/rest-api')


def test_static_help_page_default(static_help_page_default):
    assert static_help_page_default['name'] == 'help/user-guide/rest-api'


@pytest.fixture
def static_help_page_draft():
    return workbook_lookup(item_type='Page', name='help/user-guide/rest-api-draft')


@pytest.fixture
def static_help_page_deleted():
    return workbook_lookup(item_type='Page', name='help/user-guide/rest-api-deleted')


def test_get_help_page(workbook, testapp, static_help_page_default):
    notice_pytest_fixtures(workbook, testapp, static_help_page_default)
    testapp = testapp
    help_page_url = "/" + static_help_page_default['name']
    res = testapp.get(help_page_url, status=200)
    assert res.json['@id'] == help_page_url
    assert res.json['@context'] == help_page_url
    assert 'HelpPage' in res.json['@type']
    assert 'StaticPage' in res.json['@type']
    # assert res.json['content'] == help_page['content'] # No longer works latter is set to an @id of static_section
    # Instead lets check what we have embedded on GET request is inside our doc file (rest_api_submission.md).
    assert 'Accession and uuid are automatically assigned during initial posting' in res.json['content'][0]['content']
    assert res.json['toc'] == static_help_page_default['table-of-contents']


def test_get_help_page_draft(workbook, anonhtmltestapp, htmltestapp, static_help_page_draft):
    notice_pytest_fixtures(workbook, anonhtmltestapp, htmltestapp, static_help_page_draft)
    help_page_url = "/" + static_help_page_draft['name']
    anonhtmltestapp.get(help_page_url, status=403)
    htmltestapp.get(help_page_url, status=200)


def test_get_help_page_deleted(workbook, anonhtmltestapp, htmltestapp, static_help_page_deleted):
    notice_pytest_fixtures(workbook, anonhtmltestapp, htmltestapp, static_help_page_deleted)
    help_page_url = "/" + static_help_page_deleted['name']
    anonhtmltestapp.get(help_page_url, status=403)
    htmltestapp.get(help_page_url, status=200)  # Why 200 and not 404? -kmp 23-Feb-2021


def test_get_help_page_no_access(workbook, anontestapp, testapp, anonhtmltestapp, htmltestapp,
                                 static_help_page_default, static_help_page_draft, static_help_page_deleted):
    notice_pytest_fixtures(workbook, anontestapp, testapp, anonhtmltestapp, htmltestapp,
                           static_help_page_default, static_help_page_draft, static_help_page_deleted)
    success = True
    for app_name, testapp, role in [("anon_es", anontestapp, 'anon'),
                                    ("es", testapp, 'system'),
                                    ("anon_html_es", anonhtmltestapp, 'anon'),
                                    ("html_es", htmltestapp, 'system')]:
        for help_page, is_public in [(static_help_page_default, True),
                                     (static_help_page_draft, False),
                                     (static_help_page_deleted, False)]:
            expected_code = 200 if is_public else (403 if role == 'anon' else 200)
            page_name = help_page['name']
            help_page_url = "/" + page_name
            res = testapp.get(help_page_url, status=(200, 301, 403, 404)).maybe_follow()
            actual_code = res.status_code
            if actual_code == expected_code:
                print("%s => %s: SUCCESS (%s)" % (app_name, page_name, actual_code))
            else:
                print("%s => %s: FAILED (%s, not %s): %s..."
                      % (app_name, page_name, actual_code, expected_code, res.body[:20]))
                success = False
    assert success, "Test failed."


def check_page_unique_name(testapp, conflicting_page, page_to_patch):
    """
    Tries to post and patch page_to_patch but expects to get a 422 error because of a conflict with conflicting_page.
    Since under normal circumstances no change will occur, it is considered safe to do as part of workbook tests.
    """

    conflicting_document = {'name': conflicting_page['name']}
    conflict_message = "%s already exists with name '%s'" % (conflicting_page['uuid'], conflicting_page['name'])

    def check_conflict(res):
        actual_error_description = res.json['errors'][0]['description']
        print("expected:", conflict_message)
        print("actual:", actual_error_description)
        assert conflict_message in actual_error_description

    # Test that POST of a new page with the same name as an existing page is not allowed.
    check_conflict(testapp.post_json('/page', conflicting_document, status=422))

    # Also test PATCH of an existing page with the same name as another existing page is not allowed.
    page_to_patch_uuid_url = '/' + page_to_patch['uuid']
    check_conflict(testapp.patch_json(page_to_patch_uuid_url, conflicting_document, status=422))

    actual_page_to_patch = testapp.get(page_to_patch_uuid_url).maybe_follow().json
    check_conflict(testapp.patch_json(actual_page_to_patch['@id'], conflicting_document, status=422))


def test_page_unique_name(workbook, testapp, static_help_page_draft, static_help_page_default):
    notice_pytest_fixtures(workbook, testapp, static_help_page_draft, static_help_page_default)
    check_page_unique_name(testapp=testapp,
                           conflicting_page=static_help_page_default,
                           page_to_patch=static_help_page_draft)


def test_page_unique_name_deleted(workbook, testapp, static_help_page_draft, static_help_page_deleted):
    notice_pytest_fixtures(workbook, testapp, static_help_page_draft, static_help_page_deleted)
    check_page_unique_name(testapp=testapp,
                           conflicting_page=static_help_page_deleted,
                           page_to_patch=static_help_page_draft)
