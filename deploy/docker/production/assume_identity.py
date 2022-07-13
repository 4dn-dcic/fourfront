# This code snippet is adapated from AWS ECS Documentation
# The plan is 'create' environments by uploading Secrets to AWS Secrets Manager
# and retrieve the secrets upon deployment.
# The idea is the container runner will have an assumed IAM role granting access
# specifically to the secret

import os
import logging
from dcicutils.misc_utils import override_environ
from dcicutils.deployment_utils import BasicOrchestratedFourfrontIniFileManager
from dcicutils.secrets_utils import assume_identity


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__file__)
_MY_DIR = os.path.dirname(__file__)


class FourfrontDockerIniFileManager(BasicOrchestratedFourfrontIniFileManager):
    """ This runs at top level, so path is slightly different. """
    # should work but doesn't (missing fourfront): os.path.join(os.path.dirname(_MY_DIR), "pyproject.toml")
    # expected = <hardwired>
    # actual = <computed>
    # assert actual == expected, "The actual value %s was not what we expected, %s." % (actual, expected)
    TEMPLATE_DIR = '/home/nginx/fourfront/deploy/ini_files'
    PYPROJECT_FILE_NAME = '/home/nginx/fourfront/pyproject.toml'


def build_production_ini_from_global_application_configuration():
    """ This function makes a request to secrets manager for the identity passed to the container.
        See documentation on API in dcicutils.
    """
    identity = assume_identity()

    # build production.ini
    with override_environ(**identity):

        # TODO: this probably needs configuring but minimal
        FourfrontDockerIniFileManager.build_ini_file_from_template(
            '/home/nginx/fourfront/deploy/ini_files/fourfront_any_alpha.ini',
            '/home/nginx/fourfront/production.ini'
        )


if __name__ == '__main__':
    build_production_ini_from_global_application_configuration()
