'''py.test fixtures for Pyramid.

http://pyramid.readthedocs.org/en/latest/narr/testing.html
'''
import logging
import pytest
import webtest

from encoded import main

from pyramid.request import apply_request_extensions
from pyramid.testing import DummyRequest, setUp, tearDown
from pyramid.threadlocal import get_current_registry, manager as threadlocal_manager

from snovault import DBSESSION, ROOT, UPGRADER
from snovault.elasticsearch import ELASTIC_SEARCH

from .conftest_settings import make_app_settings_dictionary


pytest_plugins = [
    'encoded.tests.datafixtures',
    'snovault.tests.serverfixtures',
]


@pytest.fixture(autouse=True)
def autouse_external_tx(external_tx):
    pass


@pytest.fixture(scope='session')
def app_settings(request, wsgi_server_host_port, conn, DBSession):
    settings = make_app_settings_dictionary()
    settings['auth0.audiences'] = 'http://%s:%s' % wsgi_server_host_port
    # add some here for file testing
    settings[DBSESSION] = DBSession
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
def config():
    yield setUp()
    tearDown()


@pytest.yield_fixture
def threadlocals(request, dummy_request, registry):
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
    '''WSGI application level functional testing.
    '''
    return main({}, **app_settings)


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


@pytest.fixture
def anonhtmltestapp(app):
    return webtest.TestApp(app)


@pytest.fixture
def htmltestapp(app):
    environ = {
        'REMOTE_USER': 'TEST',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture(scope="module")
def testapp(app):
    '''TestApp with JSON accept header.
    '''
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def anontestapp(app):
    '''TestApp with JSON accept header.
    '''
    environ = {
        'HTTP_ACCEPT': 'application/json',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def authenticated_testapp(app):
    '''TestApp with JSON accept header for non-admin user.
    '''
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_AUTHENTICATED',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def submitter_testapp(app):
    '''TestApp with JSON accept header for non-admin user.
    '''
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_SUBMITTER',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def indexer_testapp(app):
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'INDEXER',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def embed_testapp(app):
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'EMBED',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def wsgi_app(wsgi_server):
    return webtest.TestApp(wsgi_server)
