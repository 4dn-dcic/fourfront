import pytest
import os

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


@pytest.fixture
def config():
    return {
        'table_load_limit' : 25         # How many Items load-as-you-scroll table fetches per request.
    }


@pytest.mark.fixture_cost(500)
@pytest.fixture(scope='session')
def root_url(host_url, wsgi_server_host_port, elasticsearch_server, postgresql_server, launch_servers, wsgi_server, conn, DBSession):
    if not launch_servers:
        return host_url
    import encoded.tests.features.conftest as bddconf
    print('Will boot up servers & load up data...')
    for app in bddconf.app(bddconf.app_settings(wsgi_server_host_port, elasticsearch_server, postgresql_server)):
        for wkbk in bddconf.workbook(app):
            pass
    url = 'http://localhost:{}'.format(str(wsgi_server_host_port[1] or 80))
    print('Testing against', url)
    return url


@pytest.fixture(scope='session')
def splinter_window_size():
    # Sauce Labs seems to only support 1024x768.
    return (1024, 768)

@pytest.fixture
def external_tx():
    pass

##########################################################
### Custom command-line arguments to use as fixture(s) ###
##########################################################


def get_host_url():
    default_host = 'localhost:8000'
    url_to_use = os.environ.get('POSTDEPLOY_TEST_URL', default_host)
    return url_to_use


def pytest_addoption(parser):
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


