import pytest

# this file was previously used to setup the test fixtures for the BDD tests.
# now, it holds the app_settings / app / workbook needed to test a full
# app, including elasticsearch and loaded workbook inserts

@pytest.fixture
def external_tx():
    pass


@pytest.fixture(scope='session')
def app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth):
    from ..conftest import _app_settings
    import os
    settings = _app_settings.copy()
    settings['create_tables'] = True
    settings['persona.audiences'] = 'http://%s:%s' % wsgi_server_host_port
    settings['elasticsearch.server'] = elasticsearch_server
    settings['sqlalchemy.url'] = postgresql_server
    settings['collection_datastore'] = 'elasticsearch'
    settings['item_datastore'] = 'elasticsearch'
    settings['indexer'] = True
    app_settings['indexer.namespace'] = os.environ.get('TRAVIS_JOB_ID', '') # set namespace for tests

    # use aws auth to access elasticsearch
    if aws_auth:
        settings['elasticsearch.aws_auth'] = aws_auth
    return settings


@pytest.yield_fixture(scope='session')
def app(app_settings, **kwargs):
    """
    Pass all kwargs onto create_mapping
    """
    from encoded import main
    from snovault.elasticsearch import create_mapping
    app = main({}, **app_settings)
    create_mapping.run(app, **kwargs)

    yield app

    from snovault import DBSESSION
    DBSession = app.registry[DBSESSION]
    # Dispose connections so postgres can tear down.
    DBSession.bind.pool.dispose()


@pytest.fixture(autouse=True)
def teardown(app):
    """
    Alternative to ..test_indexing.teardown
    Simply call /index to clear out the indexing queue after each test
    """
    from ..conftest import indexer_testapp
    indexer_testapp(app).post_json('/index', {'record': True})


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
