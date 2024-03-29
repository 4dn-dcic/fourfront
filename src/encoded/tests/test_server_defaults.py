import pytest
import webtest

from dcicutils.qa_utils import notice_pytest_fixtures
from .. import main


pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_server_defaults(admin, anontestapp):
    notice_pytest_fixtures(admin, anontestapp)

    email = admin['email']
    extra_environ = {'REMOTE_USER': str(email)}
    res = anontestapp.post_json(
        '/testing_server_default', {}, status=201,
        extra_environ=extra_environ,
    )
    item = res.json['@graph'][0]
    assert item['now'].startswith('2')
    assert item['user'] == admin['@id']
    assert item['accession'].startswith('TSTBS')  # recent change, use TEST accession instead

    anontestapp.patch_json(
        res.location, {}, status=200,
        extra_environ=extra_environ,
    )


@pytest.fixture(scope='session')
def test_accession_app(request, check_constraints, zsa_savepoints, app_settings):
    notice_pytest_fixtures(request, check_constraints, zsa_savepoints, app_settings)

    app_settings = app_settings.copy()
    return main({}, **app_settings)


@pytest.fixture
def test_accession_anontestapp(request, test_accession_app, external_tx, zsa_savepoints):
    """ TestApp with JSON accept header. """
    notice_pytest_fixtures(request, test_accession_app, external_tx, zsa_savepoints)
    environ = {
        'HTTP_ACCEPT': 'application/json',
    }
    return webtest.TestApp(test_accession_app, environ)
