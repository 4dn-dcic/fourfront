import pytest
import webtest

from .. import main
from pytest import fixture


pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_server_defaults(admin, anontestapp):
    email = admin['email']
    extra_environ = {'REMOTE_USER': str(email)}
    res = anontestapp.post_json(
        '/testing_server_default', {}, status=201,
        extra_environ=extra_environ,
    )
    item = res.json['@graph'][0]
    assert item['now'].startswith('2')
    assert item['user'] == admin['@id']
    assert item['accession'].startswith('4DNAB')

    anontestapp.patch_json(
        res.location, {}, status=200,
        extra_environ=extra_environ,
    )


@pytest.fixture(scope='session')
def test_accession_app(request, check_constraints, zsa_savepoints, app_settings):
    app_settings = app_settings.copy()
    app_settings['accession_factory'] = 'encoded.server_defaults.test_accession'
    return main({}, **app_settings)


@pytest.fixture
def test_accession_anontestapp(request, test_accession_app, external_tx, zsa_savepoints):
    '''TestApp with JSON accept header.
    '''
    environ = {
        'HTTP_ACCEPT': 'application/json',
    }
    return webtest.TestApp(test_accession_app, environ)


def test_test_accession_server_defaults(admin, test_accession_anontestapp):
    email = admin['email']
    extra_environ = {'REMOTE_USER': str(email)}
    res = test_accession_anontestapp.post_json(
        '/testing_server_default', {}, status=201,
        extra_environ=extra_environ,
    )
    item = res.json['@graph'][0]
    assert item['accession'].startswith('TSTAB')

    test_accession_anontestapp.patch_json(
        res.location, {}, status=200,
        extra_environ=extra_environ,
    )
