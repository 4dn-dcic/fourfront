import pytest
from encoded.commands.clear_db_es_contents import (
    clear_db_tables,
    run_clear_db_es
)

pytestmark = [pytest.mark.setone, pytest.mark.working]


def test_clear_db_tables(app, testapp):
    # post an item and make sure it's there
    post_res = testapp.post_json('/testing-post-put-patch/', {'required': 'abc'},
                                 status=201)
    testapp.get(post_res.location, status=200)
    clear_db_tables(app)
    # item should no longer be present
    testapp.get(post_res.location, status=404)


def test_run_clear_db_envs(app):
    # if True, then it cleared DB
    assert run_clear_db_es(app, None, True) == True
    prev_env = app.registry.settings.get('env.name')

    # should never run on these envs
    app.registry.settings['env.name'] = 'fourfront-webprod'
    assert run_clear_db_es(app, None, True) == False
    app.registry.settings['env.name'] = 'fourfront-webprod2'
    assert run_clear_db_es(app, None, True) == False

    # test if we are only running on specific envs
    app.registry.settings['env.name'] = 'fourfront-test-env'
    assert run_clear_db_es(app, 'fourfront-other-env', True) == False
    assert run_clear_db_es(app, 'fourfront-test-env', True) == True

    # reset settings after test
    if prev_env is None:
        del app.registry.settings['env.name']
    else:
        app.registry.settings['env.name'] = prev_env
