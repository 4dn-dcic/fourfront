import argparse
import os

import logging
from dcicutils.deployment_utils import create_file_from_template
from dcicutils.misc_utils import ignored, PRINT

EPILOG = __doc__


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
DOCKER_COMPOSE_FILE = os.path.join(ROOT_DIR, 'docker-compose.yml')
DOCKER_DEVELOPMENT_INI_FILE = os.path.join(ROOT_DIR, "deploy/docker/local/docker_development.ini")
DEVELOPMENT_INI_FILE = os.path.join(ROOT_DIR, "development.ini")
TEST_INI_FILE = os.path.join(ROOT_DIR, "test.ini")


DATA_SET_CHOICES = ['prod', 'test', 'local', 'deploy']
DEFAULT_DATA_SET = 'local'


def empty_assignment(line, expanded):
    ignored(line)
    return expanded.strip().endswith(': ""')


def template_creator(extra_environment_variables):
    def create_from_template(file, expect_change=False):
        template_file = file + ".template"
        if not os.path.exists(template_file):
            raise ValueError(f"The template file {template_file} does not exist.")
        warning = (f"The file {file} has unexpectedly changed. You may need to make build-docker-local-clean."
                   if not expect_change
                   else None)
        return create_file_from_template(template_file=template_file,
                                         to_file=file,
                                         extra_environment_variables=extra_environment_variables,
                                         omittable=empty_assignment,
                                         warn_if_changed=warning)
    return create_from_template


def prepare_docker(data_set=DEFAULT_DATA_SET, load_inserts=False, run_tests=False, s3_encrypt_key_id=""):
    extra_vars = {
        "DATA_SET": data_set,
        "LOAD_INSERTS": "true" if load_inserts else "",
        "RUN_TESTS": "true" if run_tests else "",
        "S3_ENCRYPT_KEY_ID": s3_encrypt_key_id or "",
    }
    prepare_from_template = template_creator(extra_vars)
    prepare_from_template(DOCKER_COMPOSE_FILE, expect_change=True)
    prepare_from_template(DOCKER_DEVELOPMENT_INI_FILE)


def prepare_docker_main():
    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Prepare docker files", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--data-set", default=DEFAULT_DATA_SET, choices=DATA_SET_CHOICES,
                        help=f"the data set to use (default: {DEFAULT_DATA_SET})")
    parser.add_argument("--load-inserts", default=False, action="store_true",
                        help="if supplied, causes inserts to be loaded (default: not loaded)")
    parser.add_argument("--run-tests", default=False, action="store_true",
                        help="if supplied, causes tests to be run in container (default: not tested)")
    parser.add_argument('--s3-encrypt-key-id', default=None,
                        help="an encrypt key id (default: None)")
    args = parser.parse_args()

    logging.basicConfig()
    prepare_docker(data_set=args.data_set,
                   load_inserts=args.load_inserts,
                   run_tests=args.run_tests,
                   s3_encrypt_key_id=args.s3_encrypt_key_id)


def prepare_local_dev(force=False):
    extra_vars = {}
    prepare_from_template = template_creator(extra_vars)
    for file in [TEST_INI_FILE, DEVELOPMENT_INI_FILE]:
        exists = os.path.exists(file)
        if not exists or force:
            reason = "it doesn't exist" if not exists else "--force was given to prepare-local-dev"
            PRINT(f"{'Recreating' if exists else 'Creating'} {file} because {reason} ...")
            prepare_from_template(file, expect_change=True)
            PRINT(f"{'Recreated' if exists else 'Created'} {file}.")
        else:
            PRINT(f"The file {file} already exists and will not be changed.")


def prepare_local_dev_main():
    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Prepare files used for local development (test.ini and development.ini)", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--force", default=False, action="store_true",
                        help="forces creation of a development.ini and test.ini even if they already exist."
                             " By default, creation is skipped for any file that already exists.")
    args = parser.parse_args()

    logging.basicConfig()
    prepare_local_dev(force=args.force)
