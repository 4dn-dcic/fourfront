import os
import pytest
import tempfile

from dcicutils.env_base import EnvBase
from dcicutils.misc_utils import PRINT, override_environ
from dcicutils.secrets_utils import assumed_identity


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


PRINT("=" * 80)
PRINT("Configuring environment variables...")

my_selected_account = os.environ.get("ACCOUNT_NUMBER")

# TODO: Maybe make this test programmable in env_utils sometime. -kmp 21-Jul-2022
desired_env = 'fourfront-mastertest'

my_selected_env = os.environ.get("ENV_NAME")

if not my_selected_account or my_selected_account == "643366669028":
    PRINT("The legacy account is correctly selected for testing Fourfront.")
elif not my_selected_env:
    print("ENV_NAME was not set. It is being set to {desired_env}.")
    os.environ['ENV_NAME'] = desired_env
elif my_selected_env != desired_env:
    PRINT(f"ENV_NAME must be set to {desired_env} (or left unset) for testing. (It is set to {my_selected_env}.)")
    exit(1)
else:
    PRINT(f"Leaving ENV_NAME set to {desired_env}.")

if os.environ.get("GLOBAL_BUCKET_ENV"):
    raise AssertionError("Please do not set GLOBAL_BUCKET_ENV. You should only be using GLOBAL_ENV_BUCKET by now.")

if not os.environ.get("GLOBAL_ENV_BUCKET"):

    existing_identity = os.environ.get("IDENTITY")
    env_identity = 'C4AppConfigFourfrontMastertestApplicationConfigurationfourfrontmastertest'
    if existing_identity and existing_identity != env_identity:
        PRINT(f"IDENTITY is set incompatibly for ENV_NAME={desired_env}.")
        exit(1)
    else:
        PRINT(f"The identity {env_identity} is being temporarily assumed to find a GLOBAL_ENV_BUCKET.")
        with override_environ(IDENTITY=env_identity):
            with assumed_identity():
                global_env_bucket = EnvBase.global_env_bucket_name()
        # This mustn't be set while the identity is assumed. It needs to be set globally.
        os.environ['GLOBAL_ENV_BUCKET'] = global_env_bucket
        print(f"GLOBAL_ENV_BUCKET set to {os.environ['GLOBAL_ENV_BUCKET']!r}")


PRINT("=" * 80)
