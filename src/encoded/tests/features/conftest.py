import os
import pytest
import webtest

from encoded import main
from pkg_resources import resource_filename

from snovault import DBSESSION
from snovault.elasticsearch import create_mapping

from ..conftest_settings import make_app_settings_dictionary
from ..conftest_more_apps import indexer_testapp


# this file was previously used to setup the test fixtures for the BDD tests.
# now, it holds the app_settings / app / workbook needed to test a full
# app, including elasticsearch and loaded workbook inserts

@pytest.fixture
def external_tx():
    pass


@pytest.fixture(scope='session')
def app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth):
    settings = make_app_settings_dictionary()
    settings['create_tables'] = True
    settings['persona.audiences'] = 'http://%s:%s' % wsgi_server_host_port
    settings['elasticsearch.server'] = elasticsearch_server
    settings['sqlalchemy.url'] = postgresql_server
    settings['collection_datastore'] = 'elasticsearch'
    settings['item_datastore'] = 'elasticsearch'
    settings['indexer'] = True
    settings['indexer.namespace'] = os.environ.get('TRAVIS_JOB_ID', '') # set namespace for tests

    # use aws auth to access elasticsearch
    if aws_auth:
        settings['elasticsearch.aws_auth'] = aws_auth
    return settings


@pytest.yield_fixture(scope='session')
def app(app_settings, **kwargs):
    """
    Pass all kwargs onto create_mapping
    """
    app = main({}, **app_settings)
    create_mapping.run(app, **kwargs)

    yield app

    DBSession = app.registry[DBSESSION]
    # Dispose connections so postgres can tear down.
    DBSession.bind.pool.dispose()


@pytest.fixture(autouse=True)
def teardown(app):
    """
    Alternative to ..test_indexing.teardown
    Simply call /index to clear out the indexing queue after each test
    """
    indexer_testapp(app).post_json('/index', {'record': True})


@pytest.mark.fixture_cost(500)
@pytest.yield_fixture(scope='session')
def workbook(app):
    from ..test_indexing import teardown
    teardown(app, use_collections=None)  # recreate all indices
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = webtest.TestApp(app, environ)

    from ...loadxl import load_all
    # just load the workbook inserts
    load_res = load_all(testapp, resource_filename('encoded', 'tests/data/workbook-inserts/'), [])
    if load_res:
        raise(load_res)

    testapp.post_json('/index', {})
    yield
    # XXX cleanup
