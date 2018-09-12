import pytest

# this file was previously used to setup the test fixtures for the BDD tests.
# now, it holds the app_settings / app / workbook needed to test a full
# app, including elasticsearch and loaded workbook inserts

@pytest.fixture
def external_tx():
    pass


@pytest.fixture(scope='session')
def app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth):
    from .. import test_indexing
    return test_indexing.app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth)


@pytest.yield_fixture(scope='session')
def app(app_settings):
    from .. import test_indexing
    from snovault.elasticsearch import create_mapping
    for app in test_indexing.app(app_settings):
        create_mapping.run(app)
        yield app


@pytest.mark.fixture_cost(500)
@pytest.yield_fixture(scope='session')
def workbook(app):
    from webtest import TestApp
    from ..test_indexing import teardown
    teardown(app, use_collections=None)  # recreate all indices
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    from ...loadxl import load_all
    from pkg_resources import resource_filename
    # just load the workbook inserts
    load_all(testapp, resource_filename('encoded', 'tests/data/workbook-inserts/'), [])

    testapp.post_json('/index', {})
    yield
    # XXX cleanup
