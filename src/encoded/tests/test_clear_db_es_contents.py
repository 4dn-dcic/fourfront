import contextlib
import pytest

from dcicutils.common import OrchestratedApp
from dcicutils.env_utils import EnvUtils, APP_FOURFRONT
from dcicutils.lang_utils import disjoined_list
from unittest import mock
from ..commands import clear_db_es_contents as clear_db_es_contents_module
from ..commands.clear_db_es_contents import (
    clear_db_tables,
    run_clear_db_es,
    main as clear_db_es_contents_main
)


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.indexing]


def is_running_app(app: OrchestratedApp) -> bool:  # Move to dcicutils.env_utils
    return app == EnvUtils.ORCHESTRATED_APP


class MockLog:

    def __init__(self, *, messages=None, key=None):
        self.messages = messages or {}
        self.key = key

    def _addmsg(self, kind, msg):
        self.messages[kind] = msgs = self.messages.get(kind, [])
        msgs.append(msg[self.key] if self.key else msg)

    def error(self, msg):
        self._addmsg('error', msg)

    def info(self, msg):
        self._addmsg('info', msg)


@contextlib.contextmanager
def logged_messages(**kwargs):
    mocked_log = MockLog()
    with mock.patch.object(clear_db_es_contents_module, "log", mocked_log):
        yield mocked_log
        assert mocked_log.messages == dict(**kwargs)


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

_PRODUCTION_ENVS = _FOURFRONT_PRODUCTION_ENVS if is_running_app(APP_FOURFRONT) else _CGAP_PRODUCTION_ENVS

TEST_ENV = 'fourfront-mastertest' if is_running_app(APP_FOURFRONT) else 'cgap-devtest'

OTHER_ENV = 'fourfront-foo' if is_running_app(APP_FOURFRONT) else 'cgap-foo'



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


@contextlib.contextmanager
def input_mocked(*inputs):
    input_stack = list(reversed(inputs))

    def mocked_input(*args, **kwargs):
        assert input_stack, "There is insufficient mocked input available."
        return input_stack.pop()

    with mock.patch.object(clear_db_es_contents_module, "input") as mock_input:
        mock_input.side_effect = mocked_input
        yield mock_input
        assert not input_stack, "Not all inputs were used."
        assert mock_input.call_count == len(inputs)


@pytest.mark.unit
def test_run_clear_db_es_unit(app, testapp):

    def mocked_is_stg_or_prd_env(env):
        result = env.endswith("blue") or env.endswith("green") or env.endswith("cgap")
        print(f"Mocked is_stg_or_prd_env({env}) returning {result}.")
        return result

    with mock.patch.object(clear_db_es_contents_module, "is_stg_or_prd_env") as mock_is_stg_or_prd_env:
        mock_is_stg_or_prd_env.side_effect = mocked_is_stg_or_prd_env
        with mock.patch.object(clear_db_es_contents_module, "clear_db_tables") as mock_clear_db_tables:
            with mock.patch.object(clear_db_es_contents_module, "run_create_mapping") as mock_run_create_mapping:

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
                        with logged_messages(error=[
                            (f'clear_db_es_contents: This action cannot be performed on env {production_env}'
                             f' because it is a production-class (stg or prd) environment.'
                             f' Skipping the attempt to clear DB.')]):
                            assert run_clear_db_es(app, only_envs=None, skip_es=True) is False
                        expected_db_clears += 0
                        expected_es_clears += 0
                        assert mock_clear_db_tables.call_count == expected_db_clears
                        assert mock_run_create_mapping.call_count == expected_es_clears

                test_env = 'fourfront-test-env'
                with local_env_name_registry_setting_for_testing(app, test_env):

                    allowed_envs = ['fourfront-other-env']

                    # test if we are only running on specific envs
                    with logged_messages(error=[(f'clear_db_es_contents: The current environment, {test_env},'
                                                 f' is not {disjoined_list(allowed_envs)}.'
                                                 f' Skipping the attempt to clear DB.')]):
                        assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=True) is False
                    expected_db_clears += 0
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    # test again if we are only running on specific envs
                    with logged_messages(error=[(f'clear_db_es_contents: The current environment, {test_env},'
                                                 f' is not {disjoined_list(allowed_envs)}.'
                                                 f' Skipping the attempt to clear DB.')]):
                        assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=False) is False
                    expected_db_clears += 0
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    # test if we are only running on specific envs
                    assert run_clear_db_es(app, only_envs=['fourfront-test-env'], skip_es=True) is True
                    expected_db_clears += 1
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    # test again if we are only running on specific envs
                    assert run_clear_db_es(app, only_envs=['fourfront-test-env'], skip_es=False) is True
                    expected_db_clears += 1
                    expected_es_clears += 1
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    allowed_envs = ['fourfront-test-env-decoy-1', 'fourfront-test-env-decoy-2']
                    # test if we are only running on specific envs
                    with logged_messages(error=[(f'clear_db_es_contents: The current environment, {test_env},'
                                                 f' is not {disjoined_list(allowed_envs)}.'
                                                 f' Skipping the attempt to clear DB.')]):
                        assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=False) is False
                    expected_db_clears += 0
                    expected_es_clears += 0
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears

                    allowed_envs = ['fourfront-test-env-decoy-1', test_env]
                    # test if we are only running on specific envs
                    assert run_clear_db_es(app, only_envs=allowed_envs, skip_es=False) is True
                    expected_db_clears += 1
                    expected_es_clears += 1
                    assert mock_clear_db_tables.call_count == expected_db_clears
                    assert mock_run_create_mapping.call_count == expected_es_clears


@pytest.mark.unit
def test_clear_db_es_contents_main():

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
            with mock.patch.object(clear_db_es_contents_module, "configure_dbsession") as mock_configure_dbsession:
                mock_configure_dbsession.side_effect = mocked_configure_dbsession

                config_uri = 'production.ini'
                appname = "app"

                with input_mocked("local"):  # We'll be prompted for the environment name to confirm.

                    clear_db_es_contents_main([config_uri])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, None),
                                                            only_envs=[],
                                                            skip_es=False)

                with input_mocked():  # No input prompting will occur because --no-confirm was supplied.

                    clear_db_es_contents_main([config_uri, "--no-confirm"])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, None),
                                                            only_envs=[],
                                                            skip_es=False)

                with input_mocked("local"):  # We'll be prompted for the environment name to confirm.

                    clear_db_es_contents_main([config_uri, "--app-name", appname])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                            only_envs=[],
                                                            skip_es=False)

                with input_mocked("local"):  # We'll be prompted for the environment name to confirm.

                    clear_db_es_contents_main([config_uri, "--app-name", appname, '--skip-es'])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                            only_envs=[],
                                                            skip_es=True)


                with input_mocked():  # No input prompting will occur because --only-if-env was supplied.

                    clear_db_es_contents_main([config_uri, "--app-name", appname, "--only-if-env", TEST_ENV])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                            only_envs=[TEST_ENV],
                                                            skip_es=False)

                with input_mocked("local"):  # We'll be prompted for the environment name to confirm.

                    clear_db_es_contents_main([config_uri, "--app-name", appname, "--only-if-env", TEST_ENV,
                                               "--confirm"])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                            only_envs=[TEST_ENV],
                                                            skip_es=False)

                with input_mocked():  # No input prompting will occur because --only-if-env was supplied.

                    clear_db_es_contents_main([config_uri, "--app-name", appname,
                                               "--only-if-env", f"{TEST_ENV},{OTHER_ENV}"])
                    mock_run_clear_db_es.assert_called_with(app=mocked_get_app(config_uri, appname),
                                                            only_envs=[TEST_ENV, OTHER_ENV],
                                                            skip_es=False)
