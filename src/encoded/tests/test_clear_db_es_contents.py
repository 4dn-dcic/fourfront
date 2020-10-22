import pytest

from unittest import mock
from ..commands.clear_db_es_contents import (
    clear_db_tables,
    run_clear_db_es
)
from ..commands import clear_db_es_contents


pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_clear_db_tables(app, testapp):
    # post an item and make sure it's there
    post_res = testapp.post_json('/testing-post-put-patch/', {'required': 'abc'},
                                 status=201)
    testapp.get(post_res.location, status=200)
    clear_res = clear_db_tables(app)
    assert clear_res is True
    # item should no longer be present
    testapp.get(post_res.location, status=404)


def test_run_clear_db_envs(app, testapp):

    orig_env = app.registry.settings.get('env.name')

    def test_clear(env_to_simulate, expecting_to_clear, arg_env=None):
        old_settings = app.registry.settings
        app.registry.settings = app.registry.settings.copy()
        try:
            print("Testing clear of", env_to_simulate)
            if env_to_simulate:
                app.registry.settings['env.name'] = env_to_simulate
            actually_cleared = run_clear_db_es(app, arg_env=arg_env, arg_skip_es=True)
            assert actually_cleared == expecting_to_clear
        finally:
            app.registry.settings = old_settings

    test_clear(env_to_simulate=None, expecting_to_clear=True)

    post_res = testapp.post_json('/testing-post-put-patch/', {'required': 'abc'}, status=201)
    testapp.get(post_res.location, status=200)

    with mock.patch.object(clear_db_es_contents, "clear_db_tables") as mock_clear_db_tables:

        # This is a backstop in case our logic is wrong so we don't fall through to catastrophe.
        def mocked_clear_db_tables(*args, **kwargs):
            raise AssertionError("mocked clear_db_tables called with %r and %r" % (args, kwargs))

        mock_clear_db_tables.side_effect = mocked_clear_db_tables

        # should never run on these envs (but we have mocked out the clear_db_tables just in case)
        test_clear(env_to_simulate='fourfront-webprod', expecting_to_clear=False)
        test_clear(env_to_simulate='fourfront-webprod2', expecting_to_clear=False)
        test_clear(env_to_simulate='fourfront-blue', expecting_to_clear=False)
        test_clear(env_to_simulate='fourfront-cgap', expecting_to_clear=False)
        # Let's NOT test green and just assume it works, rather than risking a public catastrophe if we goofed
        # on BOTH the logic and the mocking. Unlikely, but hey, weirder things have happened. -kmp 3-Apr-2020

        testapp.get(post_res.location, status=200)

    # test if we are only running on specific envs...

    # If the current environment (simulated for our test) is NOT the same as the env we declare we want,
    # this should return immediately False rather than clearing the DB.
    test_clear(env_to_simulate='fourfront-test-env', expecting_to_clear=False, arg_env='fourfront-other-env')
    testapp.get(post_res.location, status=200)

    # If the current environment (simulated for our test) IS the same as the env we declare we want,
    # this should clear the DB and return True.
    test_clear(env_to_simulate='fourfront-test-env', expecting_to_clear=True, arg_env='fourfront-test-env')
    testapp.get(post_res.location, status=404)

    # This just makes sure our cleanups on calls to test_clear() are actually working.
    assert app.registry.settings.get('env.name') == orig_env
