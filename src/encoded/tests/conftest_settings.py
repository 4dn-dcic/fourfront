import os


REPOSITORY_ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))

# This fixes bug https://hms-dbmi.atlassian.net/browse/C4-776
# The problem was a warning about a deprecated use of pkg_resources.resource_filename, using a relative name:
# _ONTOLOGY_PATH = pkg_resources.resource_filename('encoded', '../../ontology.json'),
# However, that names a non-existent filename. Does it mean to refer to 'schemas/ontology.json'? -kmp 6-Feb-2022
_ONTOLOGY_PATH = os.path.join(REPOSITORY_ROOT_DIR, 'ontology.json')


_app_settings = {
    'collection_datastore': 'database',
    'item_datastore': 'database',
    'multiauth.policies': 'session remoteuser accesskey auth0',
    'multiauth.groupfinder': 'encoded.authorization.groupfinder',
    'multiauth.policy.session.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.session.base': 'pyramid.authentication.SessionAuthenticationPolicy',
    'multiauth.policy.session.namespace': 'mailto',
    'multiauth.policy.remoteuser.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.remoteuser.namespace': 'remoteuser',
    'multiauth.policy.remoteuser.base': 'pyramid.authentication.RemoteUserAuthenticationPolicy',
    'multiauth.policy.accesskey.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.accesskey.namespace': 'accesskey',
    'multiauth.policy.accesskey.base': 'encoded.authentication.BasicAuthAuthenticationPolicy',
    'multiauth.policy.accesskey.check': 'encoded.authentication.basic_auth_check',
    'multiauth.policy.auth0.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.auth0.namespace': 'auth0',
    'multiauth.policy.auth0.base': 'encoded.authentication.Auth0AuthenticationPolicy',
    'load_test_only': True,
    'testing': True,
    'indexer': True,
    'mpindexer': False,
    'env.name': 'fourfront_mastertest',  # MUST be different than the actual env name
    'production': True,
    'pyramid.debug_authorization': True,
    'postgresql.statement_timeout': 20,
    'sqlalchemy.url': 'dummy@dummy',
    'retry.attempts': 3,
    'ontology_path': _ONTOLOGY_PATH,
    # some file specific stuff for testing
    'file_upload_bucket': 'test-wfout-bucket',
    'file_wfout_bucket': 'test-wfout-bucket',
    'file_upload_profile_name': 'test-profile',
}

def make_app_settings_dictionary():
    return _app_settings.copy()
