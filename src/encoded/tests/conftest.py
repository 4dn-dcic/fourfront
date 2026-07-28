"""py.test fixtures for Pyramid.

http://pyramid.readthedocs.org/en/latest/narr/testing.html
"""

import datetime as datetime_module
import logging
import os
import pkg_resources
import pytest
import webtest
from sqlalchemy import exc

from dcicutils.ff_mocks import NO_SERVER_FIXTURES
from dcicutils.qa_utils import notice_pytest_fixtures, MockFileSystem
from pyramid.request import apply_request_extensions
from pyramid.testing import DummyRequest
from pyramid.threadlocal import get_current_registry, manager as threadlocal_manager
from snovault import COLLECTIONS, DBSESSION, ROOT, STORAGE, UPGRADER
from snovault.elasticsearch import ELASTIC_SEARCH, create_mapping
from snovault.util import generate_indexer_namespace_for_testing
from .conftest_settings import make_app_settings_dictionary
from .. import main
from snovault.loadxl import load_all


"""
README:
    * This file contains application level fixtures and hooks in the server/data fixtures present in
      other files. 
    * There are "app" based fixtures that rely only on postgres, "es_app" fixtures that 
      use both postgres and ES (for search/ES related testing)
"""


# hacked version
@pytest.fixture
def external_tx(request, conn):
    # overridden from snovault to detect and continue from savepoint error
    if NO_SERVER_FIXTURES:
        yield 'NO_SERVER_FIXTURES'
        return

    notice_pytest_fixtures(request)
    # print('BEGIN external_tx')
    try:
        tx = conn.begin_nested()
    except exc.PendingRollbackError as e:
        if 'inactive savepoint transaction' in str(e):
            conn._nested_transaction.rollback()
            tx = conn.begin_nested()
        else:
            raise
    try:
        yield tx
        tx.rollback()
    except exc.InternalError as e:
        err_msg = str(e)
        if 'savepoint' in err_msg and 'does not exist' in err_msg:
            pass
        else:
            raise


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


INDEXER_NAMESPACE_FOR_TESTING = generate_indexer_namespace_for_testing('fourfront')


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


@pytest.fixture
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

        # Drain the normal queue first so this fixture exercises the production
        # indexing path. If deferred/in-flight SQS messages leave concrete DB
        # UUIDs absent from ES, recover those UUIDs synchronously instead of
        # issuing blind immediate queue passes that cannot see messages during
        # their visibility timeout.
        indexing_history = []
        queue_result = testapp.post_json('/index', {'record': True}).json
        indexing_history.append(cls._indexing_summary('queue', queue_result))

        max_sync_passes = 3
        for sync_pass in range(max_sync_passes + 1):
            counts = testapp.get('/counts').json
            missing, extra = cls._workbook_index_delta(es_app)
            if not missing and not extra:
                return True
            if extra or sync_pass == max_sync_passes:
                raise RuntimeError(
                    "Workbook indexing did not converge. counts=%r missing=%r "
                    "extra=%r indexing_history=%r"
                    % (
                        counts['db_es_total'],
                        cls._describe_uuids(es_app, missing),
                        cls._describe_uuids(es_app, extra),
                        indexing_history,
                    )
                )

            sync_result = testapp.post_json(
                '/index',
                {'record': True, 'uuids': sorted(missing)}
            ).json
            indexing_history.append(
                cls._indexing_summary('sync-%s' % (sync_pass + 1), sync_result)
            )

        raise AssertionError("Unreachable workbook indexing state.")

    @staticmethod
    def _workbook_index_delta(es_app):
        storage = es_app.registry[STORAGE]
        item_types = tuple(es_app.registry[COLLECTIONS].by_item_type)
        db_uuids = set(str(uuid) for uuid in storage.write.__iter__(*item_types))
        es_uuids = set(str(uuid) for uuid in storage.read.__iter__(*item_types))
        return db_uuids - es_uuids, es_uuids - db_uuids

    @staticmethod
    def _describe_uuids(es_app, uuids):
        storage = es_app.registry[STORAGE]
        descriptions = []
        for item_uuid in sorted(uuids):
            model = storage.write.get_by_uuid(item_uuid)
            descriptions.append({
                'uuid': item_uuid,
                'item_type': getattr(model, 'item_type', '<not-in-database>'),
            })
        return descriptions

    @staticmethod
    def _indexing_summary(mode, result):
        content = result.get('indexing_content', {})
        return {
            'mode': mode,
            'indexing_count': result.get('indexing_count'),
            'errors': result.get('errors', []),
            'initial_queue_status': content.get('initial_queue_status'),
            'finished_queue_status': content.get('finished_queue_status'),
        }


@pytest.fixture(scope='session')
def workbook(es_app):
    """ Loads a bunch of data (tests/data/workbook-inserts) into the system on first run
        (session scope doesn't work). """
    WorkbookCache.initialize_if_needed(es_app)


@pytest.fixture
def mocked_file_system():
    with MockFileSystem(auto_mirror_files_for_read=True).mock_exists_open_remove():
        yield


def pytest_configure(config):
    # Added 2023-06-14 to fix test_auth0.test_jwt_is_stateless_so_doesnt_actually_need_login
    # which does not want the Auth0Secret environment variable to be set; don't think this
    # really should be set for any tests; and just for completeness also unset other
    # related environment variable, Auth0Client.
    os.environ.pop('Auth0Secret', None)
    os.environ.pop('Auth0Client', None)
