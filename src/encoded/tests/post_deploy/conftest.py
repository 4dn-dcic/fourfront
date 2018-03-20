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


@pytest.fixture(scope='session')
def app_url(host_url, launch_servers):
    # TODO: If launch_servers is true, init servers and return a URL.
    # Else, return host_url.
    pass



##########################################################
### Custom command-line arguments to use as fixture(s) ###
##########################################################


def get_host_url():
    default_host = 'localhost:8000'
    url_to_use = os.environ.get('POSTDEPLOY_TEST_URL', default_host)
    return url_to_use


def pytest_addoption(parser):
    parser.addoption("--host-url", action="store", default=get_host_url())
    parser.addoption("--launch-servers", action="store_true", default=False)


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
