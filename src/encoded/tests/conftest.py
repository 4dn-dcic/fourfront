'''py.test fixtures for Pyramid.

http://pyramid.readthedocs.org/en/latest/narr/testing.html
'''
import logging
import pytest
import webtest

from pyramid.request import apply_request_extensions
from pyramid.testing import DummyRequest, setUp, tearDown
from pyramid.threadlocal import get_current_registry, manager as threadlocal_manager
from snovault import DBSESSION, ROOT, UPGRADER
from snovault.elasticsearch import ELASTIC_SEARCH
from .. import main
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
    # From https://docs.pylonsproject.org/projects/pyramid/en/latest/api/testing.html#pyramid.testing.setUp
    # setUp:
    #   Set Pyramid registry and request thread locals for the duration of a single unit test.
    #   Use this function in the setUp method of a unittest test case which directly or indirectly uses:
    #     * any method of the pyramid.config.Configurator object returned by this function.
    #     * the pyramid.threadlocal.get_current_registry() or pyramid.threadlocal.get_current_request() functions.
    # tearDown:
    #   Undo the effects of pyramid.testing.setUp(). Use this function in the tearDown method of a unit test
    #   that uses pyramid.testing.setUp() in its setUp method.
    #
    # The recommended use with unittest can be found here:
    # https://docs.pylonsproject.org/projects/pyramid/en/latest/narr/testing.html#test-set-up-and-tear-down
    #   class MyTest(unittest.TestCase):
    #     def setUp(self):
    #       self.config = testing.setUp()
    #     def tearDown(self):
    #       testing.tearDown()
    # This is the approximate equivalent in pyTest:

    # TODO: Reonsider whether this setup/teardown is being done correctly
    raise Exception("fixture config used")
    the_config = setUp()
    yield the_config
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


# TODO: Reconsider naming to have some underscores interspersed for better readability.
#       e.g., html_testapp rather than htmltestapp, and especially anon_html_test_app rather than anonhtmltestapp.
#       -kmp 03-Feb-2020

@pytest.fixture
def anonhtmltestapp(app):
    return webtest.TestApp(app)


@pytest.fixture
def htmltestapp(app):
    """TestApp for TEST user and no HTTP_ACCEPT limitation, so HTML content can be tested."""
    # TODO: Name may be misleading. If only for HTML testing, seems like it should be text/html.
    #       Or if it spans CSS and other things, maybe call it page_content_testapp? -kmp 03-Feb-2020
    environ = {
        'REMOTE_USER': 'TEST',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture(scope="module")
def testapp(app):
    """TestApp for username TEST, accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def anontestapp(app):
    """TestApp for anonymous user (i.e., no user specified), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def authenticated_testapp(app):
    """TestApp for an authenticated, non-admin user (TEST_AUTHENTICATED), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_AUTHENTICATED',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def submitter_testapp(app):
    """TestApp for a non-admin user (TEST_SUBMITTER), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST_SUBMITTER',
    }
    return webtest.TestApp(app, environ)


@pytest.fixture
def indexer_testapp(app):
    """TestApp for indexing (user INDEXER), accepting JSON data."""
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'INDEXER',
    }
    return webtest.TestApp(app, environ)


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
