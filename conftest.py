import pytest
import tempfile


def pytest_addoption(parser):
    parser.addoption("--es", action="store", default="", dest='es',
        help="use a remote es for testing")
    parser.addoption("--aws-auth", action="store_true",
        help="connect using aws authorization")


@pytest.fixture(scope='session')
def remote_es(request):
    return request.config.getoption("--es")


@pytest.fixture(scope='session')
def aws_auth(request):
    return request.config.getoption("--aws-auth")


def pytest_configure():
    # This adjustment is important to set the default choice of temporary filenames to a nice short name
    # because without it some of the filenames we generate end up being too long, and critical functionality
    # ends up failing. Some socket-related filenames, for example, seem to have length limits. -kmp 5-Jun-2020
    tempfile.tempdir = '/tmp'
