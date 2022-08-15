import contextlib
import pytest

from dcicutils.env_utils import EnvUtils
from dcicutils.lang_utils import disjoined_list
from dcicutils.qa_utils import logged_messages, input_mocked
from unittest import mock
from ..commands import clear_db_es_contents as clear_db_es_contents_module
from ..commands.clear_db_es_contents import (
    clear_db_tables,
    run_clear_db_es,
    main as clear_db_es_contents_main
)


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.indexing]


def test_clear_db_tables(app, testapp):
    # post an item and make sure it's there
    post_res = testapp.post_json('/testing-post-put-patch/', {'required': 'abc'},
                                 status=201)
    testapp.get(post_res.location, status=200)
    clear_res = clear_db_tables(app)
    assert clear_res is True
    # item should no longer be present
    testapp.get(post_res.location, status=404)


_FOURFRONT_PRODUCTION_ENVS = ['fourfront-production-blue', 'fourfront-production-green', 'data', 'staging']
# Really we only care about the first of these names, but the rest are names that were at one time
# planned to be stg or prd names for cgap, so we'll use them to tell that run_clear_db_es is properly
# skipping any such names. -kmp 4-Jun-2022
_CGAP_PRODUCTION_ENVS = ['fourfront-cgap', 'fourfront-cgap-green', 'cgap-green', 'fourfront-cgap-blue', 'cgap-blue']

_PRODUCTION_ENVS = EnvUtils.app_case(if_fourfront=_FOURFRONT_PRODUCTION_ENVS, if_cgap=_CGAP_PRODUCTION_ENVS)

TEST_ENV = EnvUtils.app_case(if_fourfront='fourfront-mastertest', if_cgap='cgap-devtest')

OTHER_ENV = EnvUtils.app_case(if_fourfront='fourfront-foo', if_cgap='cgap-foo')

DECOY_ENV_1 = TEST_ENV + '-decoy-1'
DECOY_ENV_2 = TEST_ENV + '-decoy-2'


@contextlib.contextmanager
def local_env_name_registry_setting_for_testing(app, envname):
    old_env = app.registry.settings.get('env.name')
    print(f"Remembering old env.name = {old_env}")
    try:
        app.registry.settings['env.name'] = envname
        print(f"Set env.name = {envname}")
        yield
    finally:
        if old_env is None:
            print(f"Removing env.name")
            del app.registry.settings['env.name']
        else:
            print(f"Restoring env.name to {old_env}")
            app.registry.settings['env.name'] = old_env


@pytest.mark.unit
def test_run_clear_db_es_unit(app, testapp):

    with mock.patch.object(clear_db_es_contents_module, "clear_db_tables") as mock_clear_db_tables:
        with mock.patch.object(clear_db_es_contents_module, "run_create_mapping") as mock_run_create_mapping:

            def mocked_is_stg_or_prd_env(env):
                result = (env in _PRODUCTION_ENVS  # really this should be enough
                          # for pragmatic redundancy since these will match our real production systems, protect them
                          or env in _CGAP_PRODUCTION_ENVS
                          or env in _FOURFRONT_PRODUCTION_ENVS
                          or env.endswith("blue") or env.endswith("green") or env.endswith("cgap"))
                print(f"Mocked is_stg_or_prd_env({env}) returning {result}.")
                return result

            with mock.patch.object(clear_db_es_contents_module, "is_stg_or_prd_env") as mock_is_stg_or_prd_env:
                mock_is_stg_or_prd_env.side_effect = mocked_is_stg_or_prd_env

                expected_db_clears = 0
                expected_es_clears = 0

                assert mock_clear_db_tables.call_count == expected_db_clears
                assert mock_run_create_mapping.call_count == expected_es_clears

                # It works positionally
                assert run_clear_db_es(app, None, True) is True
                expected_db_clears += 1
                expected_es_clears += 0

                assert mock_clear_db_tables.call_count == expected_db_clears
                assert mock_run_create_mapping.call_count == expected_es_clears

                # It works by keyword argument
                assert run_clear_db_es(app, only_envs=None, skip_es=True) is True
                expected_db_clears += 1
                expected_es_clears += 0

                assert mock_clear_db_tables.call_count == expected_db_clears
                assert mock_run_create_mapping.call_count == expected_es_clears

                for production_env in _PRODUCTION_ENVS:
                    with local_env_name_registry_setting_for_testing(app, production_env):
                        # should never run on production envs env
                        assert clear_db_es_contents_module.is_stg_or_prd_env(production_env) is True
                        with logged_messages(module=clear_db_es_contents_module, error=[
                            (f'clear_db_es_contents: This action cannot be performed on env {production_env}'
                             f' because it is a production-class (stg or prd) environment.'
                             f' Skipping the attempt to clear DB.')]):
                            assert run_clear_db_es(app, only_envs=None, skip_es=True) is False
                        expected_db_clears += 0
                        expected_es_clears += 0
                        assert mock_clear_db_tables.call_count == expected_db_clears
                        assert mock_run_create_mapping.call_count == expected_es_clears

                with local_env_name_registry_setting_for_testing(app, TEST_ENV):

                    allowed_envs = [OTHER_ENV]

                    # test if we are only running on specific envs
                    with logged_messages(module=clear_db_es_contents_module,
                                         error=[(f'clear_db_es_contents: The current environment, {TEST_ENV},'
                                                 f' is not {disjoined_list(allowed_envs)}.'
                                                 f' Skipping the attempt to clear DB.')]):
                        assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=True) is False
                    expected_db_clears += 0
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    # test again if we are only running on specific envs
                    with logged_messages(module=clear_db_es_contents_module,
                                         error=[(f'clear_db_es_contents: The current environment, {TEST_ENV},'
                                                 f' is not {disjoined_list(allowed_envs)}.'
                                                 f' Skipping the attempt to clear DB.')]):
                        assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=False) is False
                    expected_db_clears += 0
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    # test if we are only running on specific envs
                    assert run_clear_db_es(app, only_envs=[TEST_ENV], skip_es=True) is True
                    expected_db_clears += 1
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    # test again if we are only running on specific envs
                    assert run_clear_db_es(app, only_envs=[TEST_ENV], skip_es=False) is True
                    expected_db_clears += 1
                    expected_es_clears += 1
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    allowed_envs = [DECOY_ENV_1, DECOY_ENV_2]
                    # test if we are only running on specific envs
                    with logged_messages(module=clear_db_es_contents_module,
                                         error=[(f'clear_db_es_contents: The current environment, {TEST_ENV},'
                                                 f' is not {disjoined_list(allowed_envs)}.'
                                                 f' Skipping the attempt to clear DB.')]):
                        assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=False) is False
                    expected_db_clears += 0
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    allowed_envs = [DECOY_ENV_1, TEST_ENV]
                    # test if we are only running on specific envs
                    assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=False) is True
                    expected_db_clears += 1
                    expected_es_clears += 1
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears


@pytest.mark.unit
def test_clear_db_es_contents_main():

    # It should never get to these first two in this test, but they're ethere for safety.
    with mock.patch.object(clear_db_es_contents_module, "clear_db_tables"):
        with mock.patch.object(clear_db_es_contents_module, "run_create_mapping"):

            class FakeApp:

                class Registry:
                    def __init__(self):
                        self.settings = {}

                def __init__(self, config_uri, appname):
                    self.appname = appname
                    self.config_uri = config_uri
                    self.registry = self.Registry()

                def __str__(self):
                    return f"<FakeApp {self.appname} {self.config_uri} {id(self)}>"

                def __repr__(self):
                    return str(self)

            class MockDBSession:

                def __init__(self, app):
                    self.app = app

            apps = {}

            def mocked_get_app(config_uri, appname):
                key = (config_uri, appname)
                app = apps.get(key)
                if not app:
                    apps[key] = app = FakeApp(config_uri, appname)
                return app

            def mocked_configure_dbsession(app):
                return MockDBSession(app)

            with mock.patch.object(clear_db_es_contents_module, "run_clear_db_es") as mock_run_clear_db_es:
                with mock.patch.object(clear_db_es_contents_module, "get_app") as mock_get_app:
                    mock_get_app.side_effect = mocked_get_app
                    with mock.patch.object(clear_db_es_contents_module,
                                           "configure_dbsession") as mock_configure_dbsession:
                        mock_configure_dbsession.side_effect = mocked_configure_dbsession

                        config_uri = 'production.ini'
                        appname = "app"


                        with input_mocked(
                                # We'll be prompted for the environment name to confirm.
                                "local",
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, None),
                                                                    only_envs=[],
                                                                    skip_es=False)

                        with input_mocked(
                                # No input prompting will occur because --no-confirm was supplied.
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri, "--no-confirm"])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, None),
                                                                    only_envs=[],
                                                                    skip_es=False)

                        with input_mocked(
                                # We'll be prompted for the environment name to confirm.
                                "local",
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri, "--app-name", appname])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                                    only_envs=[],
                                                                    skip_es=False)

                        with input_mocked(
                                # We'll be prompted for the environment name to confirm.
                                "local",
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri, "--app-name", appname, '--skip-es'])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                                    only_envs=[],
                                                                    skip_es=True)

                        with input_mocked(
                                # No input prompting will occur because --only-if-env was supplied.
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri, "--app-name", appname, "--only-if-env", TEST_ENV])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                                    only_envs=[TEST_ENV],
                                                                    skip_es=False)

                        with input_mocked(
                                # We'll be prompted for the environment name to confirm.
                                "local",
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri, "--app-name", appname, "--only-if-env", TEST_ENV,
                                                       "--confirm"])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                                    only_envs=[TEST_ENV],
                                                                    skip_es=False)

                        with input_mocked(
                                # No input prompting will occur because --only-if-env was supplied.
                                module=clear_db_es_contents_module):

                            clear_db_es_contents_main([config_uri, "--app-name", appname,
                                                       "--only-if-env", f"{TEST_ENV},{OTHER_ENV}"])
                            mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                                    only_envs=[TEST_ENV, OTHER_ENV],
                                                                    skip_es=False)
