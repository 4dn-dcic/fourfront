import os

from dcicutils.qa_utils import VersionChecker
from .conftest_settings import REPOSITORY_ROOT_DIR


def test_version_and_changelog():

    class MyAppVersionChecker(VersionChecker):
        PYPROJECT = os.path.join(REPOSITORY_ROOT_DIR, "pyproject.toml")
        CHANGELOG = os.path.join(REPOSITORY_ROOT_DIR, "CHANGELOG.rst")

    MyAppVersionChecker.check_version()
