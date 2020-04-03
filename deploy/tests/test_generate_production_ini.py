import os
import pytest

from contextlib import contextmanager
from io import StringIO
from unittest import mock

from .. import generate_production_ini
from ..generate_production_ini import (
    TEMPLATE_DIR,
    build_ini_file_from_template,
    build_ini_stream_from_template,
    environment_template_filename,
    template_environment_names,
)


# TODO: Maybe this should move to env_utils? If not, at least to a non-test file.
#       Then again, if we used the "single parameterized ini file" we could side-step that. -kmp 3-Apr-2020

FOURFRONT_DEPLOY_NAMES = ['hotseat', 'mastertest', 'webdev', 'webprod', 'webprod2']


@contextmanager
def override_environ(**overrides):
    to_delete = []
    to_restore = {}
    env = os.environ
    try:
        for k, v in overrides.items():
            if k in env:
                to_restore[k] = env[k]
            else:
                to_delete.append(k)
            env[k] = v
        yield
    finally:
        for k in to_delete:
            del os.environ[k]
        for k, v in to_restore.items():
            os.environ[k] = v

def test_environment_template_filename():

    with pytest.raises(ValueError):
        environment_template_filename('foo')

    actual = os.path.abspath(environment_template_filename('webdev'))

    assert actual.endswith("/ini_files/webdev.ini")
    assert os.path.exists(actual)

    assert environment_template_filename('webdev') == environment_template_filename('fourfront-webdev')


def test_template_environment_names():

    names = template_environment_names()

    required_names = FOURFRONT_DEPLOY_NAMES

    for required_name in required_names:
        assert required_name in names


def test_build_ini_file_from_template():
    # NOTE: This implicitly also tests build_ini_file_from_stream.

    lines = []
    some_template_file_name = "mydir/whatever"
    some_ini_file_name = "mydir/production.ini"
    output_string_stream = StringIO()
    env_vars = dict(RDS_DB_NAME='snow_white', RDS_USERNAME='user', RDS_PASSWORD='my-secret',
                    RDS_HOSTNAME='unittest', RDS_PORT="6543")

    with override_environ(**env_vars):

        for env_var in env_vars:
            assert env_var in os.environ and os.environ[env_var] == env_vars[env_var], (
                    "os.environ[%r] did not get added correctly" % env_var
            )

        class MockFileStream:
            def __init__(self, filename, mode):
                pass
            def __enter__(self):
                return output_string_stream
            def __exit__(self, type, value, traceback):
                lines.extend(output_string_stream.getvalue().strip().split('\n'))

        def mocked_open(filename, mode):
            # In this test there are two opens, one for read and one for write, so we discriminate on that basis.
            print("Enter mock_open", filename, mode)
            if mode == 'r':
                assert filename == some_template_file_name
                return StringIO(
                    '[Foo]\n'
                    'DATABASE = "${RDS_DB_NAME}"\n'
                    'SOME_URL = "http://${RDS_USERNAME}@$RDS_HOSTNAME:$RDS_PORT/"\n'
                    'OOPS = "$NOT_AN_ENV_VAR"\n'
                    'HMMM = "${NOT_AN_ENV_VAR_EITHER}"\n'
                    'SHHH = "$RDS_PASSWORD"\n'
                )
            else:
                assert mode == 'w'
                assert filename == some_ini_file_name
                return MockFileStream(filename, mode)

        with mock.patch("io.open", side_effect=mocked_open):
            build_ini_file_from_template(some_template_file_name, some_ini_file_name)

        assert lines == [
            '[Foo]',
            'DATABASE = "snow_white"',
            'SOME_URL = "http://user@unittest:6543/"',
            'OOPS = "$NOT_AN_ENV_VAR"',
            'HMMM = "${NOT_AN_ENV_VAR_EITHER}"',
            'SHHH = "my-secret"',
        ]
