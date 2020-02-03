import pytest
import webtest


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
