"""py.test fixtures for Pyramid.

http://pyramid.readthedocs.org/en/latest/narr/testing.html
"""

import pkg_resources
import pytest
import webtest

# from dcicutils.qa_utils import notice_pytest_fixtures
# from pyramid.request import apply_request_extensions
# from pyramid.testing import DummyRequest
# from pyramid.threadlocal import get_current_registry, manager as threadlocal_manager
# from snovault import DBSESSION, ROOT, UPGRADER
from snovault.elasticsearch import create_mapping  # ELASTIC_SEARCH,
# from snovault.util import generate_indexer_namespace_for_testing
from .. import main
from ..loadxl import load_all
from .conftest_settings import make_app_settings_dictionary, INDEXER_NAMESPACE_FOR_TESTING


"""
README:
    * This file contains "es_app" fixtures that use both postgres and ES (for search/ES related testing)
"""


@pytest.fixture
def external_tx():
    pass


@pytest.fixture(scope='session')
def es_app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth):
    settings = make_app_settings_dictionary()
    settings['create_tables'] = True
    settings['persona.audiences'] = 'http://%s:%s' % wsgi_server_host_port  # 2-tuple such as: ('localhost', '5000')
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


@pytest.fixture(scope='session')
def es_app(es_app_settings, **kwargs):
    """
    App that uses both Postgres and ES - pass this as "app" argument to TestApp.
    Pass all kwargs onto create_mapping
    """
    app = main({}, **es_app_settings)
    create_mapping.run(app, **kwargs)

    return app


@pytest.fixture
def anon_es_testapp(es_app):
    """ TestApp simulating a bare Request entering the application (with ES enabled) """
    environ = {
        'HTTP_ACCEPT': 'application/json',
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture
def anon_html_es_testapp(es_app):
    """TestApp with ES + Postgres for anonymous (not logged in) user, accepting text/html content."""
    environ = {
        'HTTP_ACCEPT': 'text/html'
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture(scope='session')
def es_testapp(es_app):
    """ TestApp with ES + Postgres. Must be imported where it is needed. """
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture
def html_es_testapp(es_app):
    """TestApp with ES + Postgres for TEST user, accepting text/html content."""
    environ = {
        'HTTP_ACCEPT': 'text/html',
        'REMOTE_USER': 'TEST',
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture
def indexer_testapp(es_app):
    """ Indexer testapp, meant for manually triggering indexing runs by posting to /index.
        Always uses the ES app (obviously, but not so obvious previously) """
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'INDEXER',
    }
    return webtest.TestApp(es_app, environ)




class WorkbookCache:
    """ Caches whether or not we have already provisioned the workbook. """
    done = None

    @classmethod
    def initialize_if_needed(cls, es_app):
        if not cls.done:
            cls.done = cls.make_fresh_workbook(es_app)

    @classmethod
    def make_fresh_workbook(cls, es_app):
        environ = {
            'HTTP_ACCEPT': 'application/json',
            'REMOTE_USER': 'TEST',
        }
        testapp = webtest.TestApp(es_app, environ)

        # Just load the workbook inserts
        # Note that load_all returns None for success or an Exception on failure.
        load_res = load_all(testapp, pkg_resources.resource_filename('encoded', 'tests/data/workbook-inserts/'), [])

        if isinstance(load_res, Exception):
            raise load_res
        elif load_res:
            raise RuntimeError("load_all returned a true value that was not an exception.")

        testapp.post_json('/index', {})
        return True


@pytest.fixture(scope='session')
def workbook(es_app):
    """ Loads a bunch of data (tests/data/workbook-inserts) into the system on first run
        (session scope doesn't work). """
    WorkbookCache.initialize_if_needed(es_app)
