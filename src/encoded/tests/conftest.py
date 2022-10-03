"""py.test fixtures for Pyramid.

http://pyramid.readthedocs.org/en/latest/narr/testing.html
"""

import datetime as datetime_module
import logging
import os
import pkg_resources
import pytest
import webtest


from dcicutils.qa_utils import notice_pytest_fixtures, MockFileSystem
from pyramid.request import apply_request_extensions
from pyramid.testing import DummyRequest
from pyramid.threadlocal import get_current_registry, manager as threadlocal_manager
from snovault import DBSESSION, ROOT, UPGRADER
from snovault.elasticsearch import ELASTIC_SEARCH, create_mapping
from snovault.util import generate_indexer_namespace_for_testing
from .conftest_settings import make_app_settings_dictionary
from .. import main
from ..loadxl import load_all


"""
README:
    * This file contains application level fixtures and hooks in the server/data fixtures present in
      other files. 
    * There are "app" based fixtures that rely only on postgres, "es_app" fixtures that 
      use both postgres and ES (for search/ES related testing)
"""


@pytest.fixture(autouse=True)
def autouse_external_tx(external_tx):
    pass


@pytest.fixture(scope='session')
def app_settings(request, wsgi_server_host_port, conn, DBSession):  # noQA - We didn't choose the fixture name.
    notice_pytest_fixtures(request, wsgi_server_host_port, conn, DBSession)
    settings = make_app_settings_dictionary()
    settings['auth0.audiences'] = 'http://%s:%s' % wsgi_server_host_port
    settings[DBSESSION] = DBSession
    return settings


INDEXER_NAMESPACE_FOR_TESTING = generate_indexer_namespace_for_testing('cgap')


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


def pytest_configure():
    logging.basicConfig(format='%(message)s')
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

    class Shorten(logging.Filter):
        max_len = 500

        def filter(self, record):
            if record.msg == '%r':
                record.msg = record.msg % record.args
                record.args = ()
            if len(record.msg) > self.max_len:
                record.msg = record.msg[:self.max_len] + '...'
            return True

    logging.getLogger('sqlalchemy.engine.base.Engine').addFilter(Shorten())


@pytest.yield_fixture
def threadlocals(request, dummy_request, registry):
    notice_pytest_fixtures(request, dummy_request, registry)
    threadlocal_manager.push({'request': dummy_request, 'registry': registry})
    yield dummy_request
    threadlocal_manager.pop()


class MyDummyRequest(DummyRequest):
    def remove_conditional_headers(self):
        pass

    def _get_registry(self):
        if self._registry is None:
            return get_current_registry()
        return self._registry

    def _set_registry(self, registry):
        self.__dict__['registry'] = registry

    def _del_registry(self):
        self._registry = None

    registry = property(_get_registry, _set_registry, _del_registry)


@pytest.fixture
def dummy_request(root, registry, app):
    request = app.request_factory.blank('/dummy')
    request.root = root
    request.registry = registry
    request._stats = {}
    request.invoke_subrequest = app.invoke_subrequest
    apply_request_extensions(request)
    return request


@pytest.fixture(scope='session')
def app(app_settings):
    """ WSGI application level functional testing. """
    return main({}, **app_settings)


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
def registry(app):
    return app.registry


@pytest.fixture
def elasticsearch(registry):
    return registry[ELASTIC_SEARCH]


@pytest.fixture
def upgrader(registry):
    return registry[UPGRADER]


@pytest.fixture
def root(registry):
    return registry[ROOT]


# Available Fixtures
# ------------------
#
#  ################## +-----------------------------------------+----------------------------------------------------+
#  ################## |               Basic Application         |      Application with ES + Postgres                |
#  ################## +-----------------------+-----------------+---------------------------+------------------------+
#  ################## |   JSON content        |  HTML content   |      JSON content         |      HTML content      |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#  Anonymous User     | anontestapp           | anonhtmltestapp |  anon_es_testapp          | anon_html_es_testapp   |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#  System User        | testapp               | htmltestapp     |  es_testapp               | html_es_testapp        |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#  Authenticated User | authenticated_testapp | -----           |  authenticated_es_testapp | -----                  |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#  Submitter User     | submitter_testapp     | -----           |  -----                    | -----                  |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#  Indexer User       | -----                 | -----           |  indexer_testapp          | -----                  |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#  Embed User         | embed_testapp         | -----           |  -----                    | -----                  |
#  -------------------+-----------------------+-----------------+---------------------------+------------------------+
#
# TODO: Reconsider naming to have some underscores interspersed for better readability.
#       e.g., html_testapp rather than htmltestapp, and especially anon_html_test_app rather than anonhtmltestapp.
#       -kmp 03-Feb-2020


@pytest.fixture
def anontestapp(app):
    """TestApp for anonymous user (i.e., no user specified), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': "application/json"
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def anonhtmltestapp(app):
    """TestApp for anonymous (not logged in) user, accepting text/html content."""
    environ = {
        'HTTP_ACCEPT': 'text/html'
    }
    test_app = webtest.TestApp(app, environ)
    return test_app


@pytest.fixture
def anon_es_testapp(es_app):
    """ TestApp simulating a bare Request entering the application (with ES enabled) """
    environ = {
        'HTTP_ACCEPT': 'application/json'
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture
def anon_html_es_testapp(es_app):
    """TestApp with ES + Postgres for anonymous (not logged in) user, accepting text/html content."""
    environ = {
        'HTTP_ACCEPT': 'text/html'
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture(scope="session")
def testapp(app):
    """TestApp for username TEST, accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST'
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def htmltestapp(app):
    """TestApp for TEST user, accepting text/html content."""
    environ = {
        'HTTP_ACCEPT': 'text/html',
        'REMOTE_USER': 'TEST',
    }
    test_app = webtest.TestApp(app, environ)
    return test_app


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
def authenticated_testapp(app):
    """TestApp for an authenticated, non-admin user (TEST_AUTHENTICATED), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_AUTHENTICATED',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def authenticated_es_testapp(es_app):
    """ TestApp for authenticated non-admin user with ES """
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_AUTHENTICATED',
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture
def submitter_testapp(app):
    """TestApp for a non-admin user (TEST_SUBMITTER), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_SUBMITTER',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def indexer_testapp(es_app):
    """ Indexer testapp, meant for manually triggering indexing runs by posting to /index.
        Always uses the ES app (obviously, but not so obvious previously) """
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'INDEXER',
    }
    return webtest.TestApp(es_app, environ)


@pytest.fixture
def embed_testapp(app):
    """TestApp for user EMBED, accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'EMBED',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def wsgi_app(wsgi_server):
    """TestApp for WSGI server."""
    return webtest.TestApp(wsgi_server)


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


@pytest.yield_fixture
def mocked_file_system():
    with MockFileSystem(auto_mirror_files_for_read=True).mock_exists_open_remove():
        yield
