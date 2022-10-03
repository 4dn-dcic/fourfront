# import pkg_resources
# import pytest
# import webtest
#
# from snovault import DBSESSION
# from snovault.elasticsearch import create_mapping
# from snovault.util import generate_indexer_namespace_for_testing
# from .. import main
# from ..loadxl import load_all
# from .conftest_settings import make_app_settings_dictionary
#
#
# # this file was previously used to setup the test fixtures for the BDD tests.
# # now, it holds the app_settings / app / workbook needed to test a full
# # app with indexing, including elasticsearch and loaded workbook inserts
#
# @pytest.fixture
# def external_tx():
#     pass
#
#
# INDEXER_NAMESPACE_FOR_TESTING = generate_indexer_namespace_for_testing('ff')
#
#
# @pytest.fixture(scope='session')
# def es_app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server, aws_auth):
#     settings = make_app_settings_dictionary()
#     settings['create_tables'] = True
#     settings['persona.audiences'] = 'http://%s:%s' % wsgi_server_host_port
#     settings['elasticsearch.server'] = elasticsearch_server
#     settings['sqlalchemy.url'] = postgresql_server
#     settings['collection_datastore'] = 'elasticsearch'
#     settings['item_datastore'] = 'elasticsearch'
#     settings['indexer'] = True
#     settings['indexer.namespace'] = INDEXER_NAMESPACE_FOR_TESTING
#
#     # use aws auth to access elasticsearch
#     if aws_auth:
#         settings['elasticsearch.aws_auth'] = aws_auth
#     return settings
#
#
# @pytest.yield_fixture(scope='session')
# def es_app(es_app_settings, **kwargs):
#     """
#     Pass all kwargs onto create_mapping
#     """
#
#     app = main({}, **es_app_settings)
#     create_mapping.run(app, **kwargs)
#
#     yield app
#
#     DBSession = app.registry[DBSESSION]
#     # Dispose connections so postgres can tear down.
#     DBSession.bind.pool.dispose()
#
#
# @pytest.fixture(scope='session')
# def es_testapp(es_app):
#     """ TestApp with ES + Postgres. Must be imported where it is needed. """
#     environ = {
#         'HTTP_ACCEPT': 'application/json',
#         'REMOTE_USER': 'TEST',
#     }
#     return webtest.TestApp(es_app, environ)
#
#
# @pytest.fixture
# def html_es_testapp(es_app):
#     """TestApp with ES + Postgres for TEST user, accepting text/html content."""
#     environ = {
#         'HTTP_ACCEPT': 'text/html',
#         'REMOTE_USER': 'TEST',
#     }
#     return webtest.TestApp(es_app, environ)
#
#
# @pytest.fixture
# def anon_es_testapp(es_app):
#     """ TestApp simulating a bare Request entering the application (with ES enabled) """
#     environ = {
#         'HTTP_ACCEPT': 'application/json'
#     }
#     return webtest.TestApp(es_app, environ)
#
#
# class WorkbookCache:
#     """ Caches whether or not we have already provisioned the workbook. """
#     done = None
#
#     @classmethod
#     def initialize_if_needed(cls, es_app):
#         if not cls.done:
#             cls.done = cls.make_fresh_workbook(es_app)
#
#     @classmethod
#     def make_fresh_workbook(cls, es_app):
#         environ = {
#             'HTTP_ACCEPT': 'application/json',
#             'REMOTE_USER': 'TEST',
#         }
#         testapp = webtest.TestApp(es_app, environ)
#
#         # Just load the workbook inserts
#         # Note that load_all returns None for success or an Exception on failure.
#         load_res = load_all(testapp, pkg_resources.resource_filename('encoded', 'tests/data/workbook-inserts/'), [])
#
#         if isinstance(load_res, Exception):
#             raise load_res
#         elif load_res:
#             raise RuntimeError("load_all returned a true value that was not an exception.")
#
#         testapp.post_json('/index', {})
#         return True
#
#
# @pytest.fixture(scope='session')
# def workbook(es_app):
#     """ Loads a bunch of data (tests/data/workbook-inserts) into the system on first run
#         (session scope doesn't work). """
#     WorkbookCache.initialize_if_needed(es_app)
