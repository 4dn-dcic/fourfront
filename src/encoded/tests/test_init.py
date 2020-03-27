import pytest

from .. import get_mirror_env_from_settings
from ..commands.create_mapping_on_deploy import (
    ENV_WEBPROD,
    ENV_WEBPROD2,
    ENV_MASTERTEST,
    ENV_PRODUCTION_BLUE,
    ENV_PRODUCTION_GREEN,
    BEANSTALK_PROD_MIRRORS,
)


pytestmark = pytest.mark.working


def test_get_mirror_env_webprod():
    """ Tests that when getting mirror env on various envs returns the correct mirror """

    settings = {'env.name': ENV_WEBPROD}
    mirror = get_mirror_env_from_settings(settings)
    assert mirror == ENV_WEBPROD2

    settings = {'env.name': ENV_WEBPROD2}
    mirror = get_mirror_env_from_settings(settings)
    assert mirror == ENV_WEBPROD

    settings = {'env.name': ENV_PRODUCTION_GREEN}
    mirror = get_mirror_env_from_settings(settings)
    assert mirror == ENV_PRODUCTION_BLUE

    settings = {'env.name': ENV_PRODUCTION_BLUE}
    mirror = get_mirror_env_from_settings(settings)
    assert mirror == ENV_PRODUCTION_GREEN

    settings = {'env.name': ENV_MASTERTEST}
    mirror = get_mirror_env_from_settings(settings)
    assert mirror is None
