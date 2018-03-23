'''
Post-Deploy Test Initiation Examples:

bin/test -v -v -m "postdeploy" \
      --splinter-implicit-wait 10 \
      --splinter-webdriver chrome \
      --splinter-socket-timeout 300 \
      --splinter-webdriver-executable /Users/alex/executables/chromedriver \
      --host-url localhost:8000 \
      ./src/encoded/tests/post_deploy

bin/test -v -v -m "postdeploy" \
      --splinter-implicit-wait 10 \
      --splinter-webdriver remote \
      --splinter-remote-url "http://$SAUCE_USERNAME:$SAUCE_ACCESS_KEY@localhost:4445/wd/hub" \
      --splinter-socket-timeout 300 \
      --browser-arg tunnel-identifier "$TRAVIS_JOB_NUMBER" \
      --browser-arg-int build  "$TRAVIS_BUILD_NUMBER" \
      --browser-arg-int idleTimeout 300 \
      --browser-arg name "$TRAVIS_REPO_SLUG $TRAVIS_BRANCH $TRAVIS_COMMIT" \
      --browser-arg browser "$BROWSER" \
      --cov src/encoded \
      --host-url staging.4dnucleome.org \
      ./src/encoded/tests/post_deploy

If want to use custom host-url (default: localhost:8000), you MUST supply path to ./src/encoded/tests/post_deploy.
This also speeds things up quite a bit (less collection of tests).

Instead of "postdeploy", may also use "postdeploy_local", which will only select a subset of tests which are expected to pass on a local environment.
'''

import pytest
import os, json
from encoded.tests import AppendInt2


@pytest.fixture(scope='session')
def splinter_window_size():
    # Sauce Labs seems to only support 1024x768.
    return (1024, 768)


##########################################################
###  General PostDeploy Browser Tests Configurations   ###
##########################################################


@pytest.fixture
def config():
    return {
        'table_load_limit' : 25         # How many Items load-as-you-scroll table fetches per request.
    }


def boot_up_local_application_to_test_against():
    from snovault.tests.serverfixtures import (
        wsgi_server_host_port,      # Generates tuple of localhost, open port int
        elasticsearch_host_port,    # Generates tuple of localhost, open port int
        wsgi_server,                # Starts up WSGI server, returns URL (?)
        postgresql_server,          # Starts up PG server, returns URL
        elasticsearch_server,       # Starts up ES server, returns URL
    )
    from snovault.elasticsearch import create_mapping
    from encoded.tests.features.conftest import (workbook, app_settings) # Full indexing settings.
    from .. import test_indexing

    wsgi_host_port_to_use = wsgi_server_host_port()
    es_host_port_to_use = elasticsearch_host_port()

    for pg_server in postgresql_server(request):                                                        # Boot up PG server
        for es_server in elasticsearch_server(request, es_host_port_to_use):                            # Boot up ES server
            curr_app_settings = app_settings(wsgi_host_port_to_use, es_server, pg_server)
            print('Will run create_mapping & load up data...', '\nSettings: ', json.dumps(curr_app_settings, indent=4, sort_keys=True), '\n', request)
            for curr_app in test_indexing.app(curr_app_settings):                                       # Boot up 4DN app
                create_mapping.run(curr_app)                                                            # Run create mapping
                for web_server_root_url in wsgi_server(request, curr_app, wsgi_host_port_to_use):       # Boot up WSGI HTTP server
                    print('Testing against', web_server_root_url)
                    for wkbk in workbook(curr_app):                                                     # Load up workbook data (optional-ish as 4DN app itself loads some up)
                        yield web_server_root_url                                                       # Yield the WSGI HTTP server root url


#@pytest.mark.fixture_cost(500)
@pytest.yield_fixture(scope='session')
def root_url(request, host_url, launch_servers):
    if not launch_servers:
        yield host_url
    else:
        for web_server_root_url in boot_up_local_application_to_test_against(request):
            yield web_server_root_url



##########################################################
### Custom command-line arguments to use as fixture(s) ###
##########################################################


def get_host_url():
    default_host = 'localhost:8000'
    url_to_use = os.environ.get('POSTDEPLOY_TEST_URL', default_host)
    return url_to_use


def pytest_addoption(parser):
    parser.addoption('--browser-arg', nargs=2, dest='browser_args', action='append', type='string')
    parser.addoption('--browser-arg-int', nargs=2, dest='browser_args', action=AppendInt2, type='string')
    parser.addoption("--launch-servers", action="store_true", default=False, help="If true, will boot up & load servers.")
    parser.addoption("--host-url", action="store", default=get_host_url(), help="What domain/host to test against, e.g. localhost:8000 or data.4dnucleome.org.")


@pytest.fixture(scope='session')
def launch_servers(request):
    val = request.config.getoption("--launch-servers")
    return val

@pytest.fixture(scope='session')
def host_url(request):
    val = request.config.getoption("--host-url")
    if val[0:4] != 'http':
        val = 'http://' + val
    if val.endswith('/'):
        val = val[:-1]
    return val




'''
def pytest_generate_tests(metafunc):
    # This is called for every test. Only get/set command line arguments
    # if the argument is specified in the list of test "fixturenames".
    if 'host_url' in metafunc.fixturenames and metafunc.config.option.host_url is not None:
        val = metafunc.config.option.host_url
        if val[0:4] != 'http':
            val = 'http://' + val
        if val.endswith('/'):
            val = val[:-1]
        metafunc.parametrize("host_url", [val])
    if 'launch_servers' in metafunc.fixturenames and metafunc.config.option.host_url is not None:
        metafunc.parametrize("launch_servers", [metafunc.config.option.launch_servers])
'''


