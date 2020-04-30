import datetime
import os
import pytest
import re
import subprocess

from contextlib import contextmanager
from io import StringIO
from unittest import mock

from dcicutils.qa_utils import override_environ
from .. import generate_production_ini
from ..generate_production_ini import FourfrontDeployer


TEMPLATE_DIR = FourfrontDeployer.TEMPLATE_DIR
build_ini_file_from_template = FourfrontDeployer.build_ini_file_from_template
build_ini_stream_from_template = FourfrontDeployer.build_ini_stream_from_template
any_environment_template_filename = FourfrontDeployer.any_environment_template_filename
environment_template_filename = FourfrontDeployer.environment_template_filename
template_environment_names = FourfrontDeployer.template_environment_names
get_local_git_version = FourfrontDeployer.get_local_git_version
get_eb_bundled_version = FourfrontDeployer.get_eb_bundled_version
get_app_version = FourfrontDeployer.get_app_version
EB_MANIFEST_FILENAME = FourfrontDeployer.EB_MANIFEST_FILENAME
PYPROJECT_FILE_NAME = FourfrontDeployer.PYPROJECT_FILE_NAME

# TODO: Maybe this should move to env_utils? If not, at least to a non-test file.
#       Then again, if we used the "single parameterized ini file" we could side-step that. -kmp 3-Apr-2020

FOURFRONT_DEPLOY_NAMES = ['blue', 'green', 'hotseat', 'mastertest', 'webdev', 'webprod', 'webprod2']


def test_environment_template_filename():

    with pytest.raises(ValueError):
        environment_template_filename('foo')

    actual = os.path.abspath(environment_template_filename('webdev'))

    assert actual.endswith("/ini_files/webdev.ini")
    assert os.path.exists(actual)

    assert environment_template_filename('webdev') == environment_template_filename('fourfront-webdev')


def test_any_environment_template_filename():

    actual = os.path.abspath(any_environment_template_filename())
    assert actual.endswith("/ini_files/any.ini")


def test_template_environment_names():

    names = template_environment_names()

    required_names = FOURFRONT_DEPLOY_NAMES

    for required_name in required_names:
        assert required_name in names


MOCKED_SOURCE_BUNDLE = "/some/source/bundle"
MOCKED_BUNDLE_VERSION = 'v-12345-bundle-version'
MOCKED_LOCAL_GIT_VERSION = 'v-67890-git-version'
MOCKED_PROJECT_VERSION = '11.22.33'

def make_mocked_check_output_for_get_version(simulate_git_command=True, simulate_git_repo=True):
    def mocked_check_output(command):
        if simulate_git_command and command[0] == 'git':
            assert command == ['git', 'describe', '--dirty']  # This is the only case we handle
            if simulate_git_repo:
                return bytes(MOCKED_LOCAL_GIT_VERSION, 'utf-8')
            else:
                raise subprocess.CalledProcessError(returncode=1, cmd=command)
        else:
            raise FileNotFoundError("Simulated absence of 'git'.")
    return mocked_check_output


def test_build_ini_file_from_template():
    # NOTE: This implicitly also tests build_ini_file_from_stream.

    some_template_file_name = "mydir/whatever"
    some_ini_file_name = "mydir/production.ini"
    env_vars = dict(RDS_DB_NAME='snow_white', RDS_USERNAME='user', RDS_PASSWORD='my-secret',
                    RDS_HOSTNAME='unittest', RDS_PORT="6543")

    with override_environ(**env_vars):

        for env_var in env_vars:
            assert env_var in os.environ and os.environ[env_var] == env_vars[env_var], (
                    "os.environ[%r] did not get added correctly" % env_var
            )

        class MockFileStream:
            FILE_SYSTEM = {}
            @classmethod
            def reset(cls):
                cls.FILE_SYSTEM = {}
            def __init__(self, filename, mode):
                assert 'w' in mode
                self.filename = filename
                self.output_string_stream = StringIO()
            def __enter__(self):
                return self.output_string_stream
            def __exit__(self, type, value, traceback):
                self.FILE_SYSTEM[self.filename] = self.output_string_stream.getvalue().strip().split('\n')

        def mocked_open(filename, mode='r', encoding=None):
            assert encoding in (None, 'utf-8')
            # In this test there are two opens, one for read and one for write, so we discriminate on that basis.
            print("Enter mock_open", filename, mode)
            if mode == 'r':
                if filename == EB_MANIFEST_FILENAME:
                    print("reading mocked EB MANIFEST:", EB_MANIFEST_FILENAME)
                    return StringIO('{"Some": "Stuff", "VersionLabel": "%s", "Other": "Stuff"}\n'
                                    % MOCKED_BUNDLE_VERSION)
                elif filename == some_template_file_name:
                    print("reading mocked TEMPLATE FILE", some_ini_file_name)
                    return StringIO(
                        '[Foo]\n'
                        'DATABASE = "${RDS_DB_NAME}"\n'
                        'SOME_URL = "http://${RDS_USERNAME}@$RDS_HOSTNAME:$RDS_PORT/"\n'
                        'OOPS = "$NOT_AN_ENV_VAR"\n'
                        'HMMM = "${NOT_AN_ENV_VAR_EITHER}"\n'
                        'SHHH = "$RDS_PASSWORD"\n'
                        'VERSION = "${APP_VERSION}"\n'
                        'PROJECT_VERSION = "${PROJECT_VERSION}"\n'
                    )
                elif filename == PYPROJECT_FILE_NAME:
                    print("reading mocked TOML FILE", PYPROJECT_FILE_NAME)
                    return StringIO(
                        '[something]\n'
                        'version = "5.6.7"\n'
                        '[tool.poetry]\n'
                        'author = "somebody"\n'
                        'version = "%s"\n' % MOCKED_PROJECT_VERSION
                    )
                else:
                    raise AssertionError("mocked_open(%r, %r) unsupported." % (filename, mode))
            else:
                assert mode == 'w'
                assert filename == some_ini_file_name
                return MockFileStream(filename, mode)

        with mock.patch("subprocess.check_output") as mock_check_output:
            mock_check_output.side_effect = make_mocked_check_output_for_get_version()
            with mock.patch("os.path.exists") as mock_exists:
                def mocked_exists(filename):
                    return filename in [EB_MANIFEST_FILENAME, some_template_file_name]
                mock_exists.side_effect = mocked_exists
                with mock.patch("io.open", side_effect=mocked_open):
                    build_ini_file_from_template(some_template_file_name, some_ini_file_name)

        assert MockFileStream.FILE_SYSTEM[some_ini_file_name] == [
            '[Foo]',
            'DATABASE = "snow_white"',
            'SOME_URL = "http://user@unittest:6543/"',
            'OOPS = "$NOT_AN_ENV_VAR"',
            'HMMM = "${NOT_AN_ENV_VAR_EITHER}"',
            'SHHH = "my-secret"',
            'VERSION = "%s"' % MOCKED_BUNDLE_VERSION,
            'PROJECT_VERSION = "%s"' % MOCKED_PROJECT_VERSION,
        ]

        MockFileStream.reset()

        with mock.patch("subprocess.check_output") as mock_check_output:
            mock_check_output.side_effect = make_mocked_check_output_for_get_version()
            with mock.patch("os.path.exists") as mock_exists:
                def mocked_exists(filename):
                    # Important to this test: This will return False for EB_MANIFEST_FILENAME,
                    # causing the strategy of using the version there to fall through,
                    # so we expect to try using the git version instead.
                    return filename in [some_template_file_name]
                mock_exists.side_effect = mocked_exists
                with mock.patch("io.open", side_effect=mocked_open):
                    build_ini_file_from_template(some_template_file_name, some_ini_file_name)

        assert MockFileStream.FILE_SYSTEM[some_ini_file_name] == [
            '[Foo]',
            'DATABASE = "snow_white"',
            'SOME_URL = "http://user@unittest:6543/"',
            'OOPS = "$NOT_AN_ENV_VAR"',
            'HMMM = "${NOT_AN_ENV_VAR_EITHER}"',
            'SHHH = "my-secret"',
            'VERSION = "%s"' % MOCKED_LOCAL_GIT_VERSION,
            'PROJECT_VERSION = "%s"' % MOCKED_PROJECT_VERSION,
        ]

        MockFileStream.reset()

        with mock.patch("subprocess.check_output") as mock_check_output:
            mock_check_output.side_effect = make_mocked_check_output_for_get_version(simulate_git_command=False)
            with mock.patch("os.path.exists") as mock_exists:
                def mocked_exists(filename):
                    # Important to this test: This will return False for EB_MANIFEST_FILENAME,
                    # causing the strategy of using the version there to fall through,
                    # so we expect to try using the git version instead, which will also fail
                    # because we're simulating the absence of Git.
                    return filename in [some_template_file_name]
                mock_exists.side_effect = mocked_exists
                class MockDateTime:
                    DATETIME = datetime.datetime
                    @classmethod
                    def now(cls):
                        return cls.DATETIME(2001,2,3,4,55,6)
                with mock.patch("io.open", side_effect=mocked_open):
                    with mock.patch.object(datetime, "datetime", MockDateTime()):
                        build_ini_file_from_template(some_template_file_name, some_ini_file_name)

        assert MockFileStream.FILE_SYSTEM[some_ini_file_name] == [
            '[Foo]',
            'DATABASE = "snow_white"',
            'SOME_URL = "http://user@unittest:6543/"',
            'OOPS = "$NOT_AN_ENV_VAR"',
            'HMMM = "${NOT_AN_ENV_VAR_EITHER}"',
            'SHHH = "my-secret"',
            'VERSION = "unknown-version-at-20010203045506000000"',  # We mocked datetime.datetime.now() to get this
            'PROJECT_VERSION = "%s"' % MOCKED_PROJECT_VERSION,
        ]

        MockFileStream.reset()

        # Uncomment this for debugging...
        # assert False, "PASSED"


def test_get_app_version():

    with mock.patch('subprocess.check_output') as mock_check_output:

        with mock.patch("os.path.exists") as mock_exists:
            mock_exists.return_value = True
            with mock.patch("io.open") as mock_open:
                mock_open.return_value = StringIO('{"VersionLabel": "%s"}' % MOCKED_BUNDLE_VERSION)
                mock_check_output.side_effect = make_mocked_check_output_for_get_version()
                assert get_app_version() == MOCKED_BUNDLE_VERSION

        mock_check_output.side_effect = make_mocked_check_output_for_get_version()
        assert get_app_version() == MOCKED_LOCAL_GIT_VERSION

        # Simulate 'git' command not found.
        mock_check_output.side_effect = make_mocked_check_output_for_get_version(simulate_git_command=False)
        v = get_app_version()
        assert re.match("^unknown-version-at-[0-9]+$", v)

        assert not os.environ.get('EB_CONFIG_SOURCE_BUNDLE')
        # Simulate 'git' repo not found.
        mock_check_output.side_effect = make_mocked_check_output_for_get_version(simulate_git_repo=False)
        v = get_app_version()
        assert re.match("^unknown-version-at-[0-9]+$", v)


def test_get_local_git_version():

    with mock.patch('subprocess.check_output') as mock_check_output:

        mock_check_output.side_effect = make_mocked_check_output_for_get_version()
        assert get_local_git_version() == MOCKED_LOCAL_GIT_VERSION

        mock_check_output.side_effect = make_mocked_check_output_for_get_version(simulate_git_command=False)
        with pytest.raises(FileNotFoundError):
            get_local_git_version()

        mock_check_output.side_effect = make_mocked_check_output_for_get_version(simulate_git_repo=False)
        with pytest.raises(subprocess.CalledProcessError):
            get_local_git_version()


def test_get_eb_bundled_version():

    with mock.patch("os.path.exists") as mock_exists:
        mock_exists.return_value = True
        with mock.patch("io.open") as mock_open:
            mock_open.return_value = StringIO('{"VersionLabel": "%s"}' % MOCKED_BUNDLE_VERSION)
            assert get_eb_bundled_version() == MOCKED_BUNDLE_VERSION

    with mock.patch("os.path.exists") as mock_exists:
        mock_exists.return_value = False
        with mock.patch("io.open") as mock_open:
            def mocked_open_error(filename, mode='r'):
                raise Exception("Simulated file error (file not found or permissions problem).")
            mock_open.side_effect = mocked_open_error
            assert get_eb_bundled_version() is None


def test_transitional_equivalence():
    """
    We used to use separate files for each environment. This tests that the new any.ini technology,
    with a few new environment variables, will produce the same thing.

    This proves that if we set at least "ENCODED_ES_SERVER" and "ENCODED_BS_ENV" environment variables,
    or invoke generate_ini_file adding the "--es_server" nad "--bs_env" arguments, we should get a proper
    production.ini.
    """

    # TODO: Once this mechanism is in place, the files blue.ini, green.ini, hotseat.ini, mastertest.ini,
    #       webdev.ini, webprod.ini, and webprod2.ini
    #       can either be removed (and these transitional tests removed) or transitioned to be test data.

    def tester(ref_ini, bs_env, data_set, es_server, es_namespace=None):

        assert ref_ini[:-4] == bs_env[10:]  # "xxx.ini" needs to match "fourfront-xxx"

        es_namespace = es_namespace or bs_env

        # Test of build_ini_from_template with just 2 keyword arguments explicitly supplied (bs_env, es_server),
        # and others defaulted.

        old_output = StringIO()
        new_output = StringIO()

        build_ini_stream_from_template(os.path.join(TEMPLATE_DIR, ref_ini), old_output)
        build_ini_stream_from_template(os.path.join(TEMPLATE_DIR, "any.ini"), new_output,
                                       # data_env and es_namespace are something we should be able to default
                                       bs_env=bs_env, es_server=es_server)

        old_content = old_output.getvalue()
        new_content = new_output.getvalue()
        assert old_content == new_content

        # Test of build_ini_from_template with all 4 keyword arguments explicitly supplied (bs_env, data_set,
        # es_server, es_namespace), none defaulted.


        old_output = StringIO()
        new_output = StringIO()

        build_ini_stream_from_template(os.path.join(TEMPLATE_DIR, ref_ini), old_output)
        build_ini_stream_from_template(os.path.join(TEMPLATE_DIR, "any.ini"), new_output,
                                       bs_env=bs_env, data_set=data_set, es_server=es_server, es_namespace=es_namespace)

        old_content = old_output.getvalue()
        new_content = new_output.getvalue()
        assert old_content == new_content

    with mock.patch.object(FourfrontDeployer, "get_app_version", return_value=MOCKED_PROJECT_VERSION):
        with mock.patch("toml.load", return_value={"tool": {"poetry": {"version": MOCKED_LOCAL_GIT_VERSION}}}):

            tester(ref_ini="blue.ini", bs_env="fourfront-blue", data_set="prod",
                   es_server="search-fourfront-blue-xkkzdrxkrunz35shbemkgrmhku.us-east-1.es.amazonaws.com:80")

            tester(ref_ini="green.ini", bs_env="fourfront-green", data_set="prod",
                   es_server="search-fourfront-green-cghpezl64x4uma3etijfknh7ja.us-east-1.es.amazonaws.com:80")

            tester(ref_ini="hotseat.ini", bs_env="fourfront-hotseat", data_set="prod",
                   es_server="search-fourfront-hotseat-f3oxd2wjxw3h2wsxxbcmzhhd4i.us-east-1.es.amazonaws.com:80")

            tester(ref_ini="mastertest.ini", bs_env="fourfront-mastertest", data_set="test",
                   es_server="search-fourfront-mastertest-wusehbixktyxtbagz5wzefffp4.us-east-1.es.amazonaws.com:80")

            tester(ref_ini="webdev.ini", bs_env="fourfront-webdev", data_set="prod",
                   es_server="search-fourfront-webdev-5uqlmdvvshqew46o46kcc2lxmy.us-east-1.es.amazonaws.com:80")

            tester(ref_ini="webprod.ini", bs_env="fourfront-webprod", data_set="prod",
                   es_server="search-fourfront-webprod-hmrrlalm4ifyhl4bzbvl73hwv4.us-east-1.es.amazonaws.com:80")

            tester(ref_ini="webprod2.ini", bs_env="fourfront-webprod2", data_set="prod",
                   es_server="search-fourfront-webprod2-fkav4x4wjvhgejtcg6ilrmczpe.us-east-1.es.amazonaws.com:80")
