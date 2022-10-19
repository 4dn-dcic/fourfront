import os
import pkg_resources
import pytest
import time
import webtest

from snovault import DBSESSION
from snovault.elasticsearch import create_mapping
from snovault.util import generate_indexer_namespace_for_testing
from .. import main
from ..loadxl import load_all
from .conftest_settings import make_app_settings_dictionary


# this file was previously used to setup the test fixtures for the BDD tests.
# now, it holds the app_settings / app / workbook needed to test a full
# app with indexing, including elasticsearch and loaded workbook inserts

@pytest.fixture
def external_tx():
    pass


INDEXER_NAMESPACE_FOR_TESTING = generate_indexer_namespace_for_testing('ff')


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
    settings['indexer.namespace'] = INDEXER_NAMESPACE_FOR_TESTING

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


@pytest.mark.fixture_cost(500)
@pytest.yield_fixture(scope='session')
def workbook(app):
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = webtest.TestApp(app, environ)

    # just load the workbook inserts
    load_res = load_all(testapp, pkg_resources.resource_filename('encoded', 'tests/data/workbook-inserts/'), [])
    if load_res:
        raise(load_res)

    time.sleep(3)  # Fixture is time-consuming anyway, so indulge a sleep to let SQS internals to catch up
    testapp.post_json('/index', {})
    yield
    # There is no cleanup because this fixture is designed to leave data in effect for reuse.
    # Tt's expected all tests are read-only. -kmp 28-Sep-2021
