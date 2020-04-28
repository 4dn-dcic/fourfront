"""
based on environment variables make a config file for build out
"""

import datetime
import glob
import io
import json
import os
import re
import pkg_resources
import subprocess
import sys
import toml
import argparse

from dcicutils.env_utils import (
    is_stg_or_prd_env, prod_bucket_env, get_standard_mirror_env,
)
from dcicutils.misc_utils import PRINT


_MY_DIR = os.path.dirname(__file__)
TEMPLATE_DIR = os.path.join(_MY_DIR, "ini_files")
INI_FILE_NAME = "production.ini"
PYPROJECT_DIR = os.path.dirname(_MY_DIR)
PYPROJECT_FILE_NAME = os.path.join(PYPROJECT_DIR, "pyproject.toml")


def build_ini_file_from_template(template_file_name, init_file_name,
                                     bs_env=None, bs_mirror_env=None, s3_bucket_env=None,
                                     data_set=None, es_server=None, es_namespace=None):
    """
    Builds a .ini file from a given template file.

    Args:
        template_file_name (str): The name of the template file to drive the construction.
        init_file_name (str): The name of the .ini file to build.
        bs_env (str): The ElasticBeanstalk environment name for which this .ini file should work.
        bs_mirror_env (str): The name of the ElasticBeanstalk environment that acts as a blue/green mirror.
        s3_bucket_env (str): Environment name that will become part of the s3 bucket env. (Usually defaults properly.)
        data_set (str): An identifier for data to load (either 'prod' for prd/stg envs, or 'test' for others)
        es_server (str): The server name (or server:port) for the ElasticSearch server.
        es_namespace (str): The ElasticSearch namespace to use (probably but not necessarily same as bs_env).
    """
    with io.open(init_file_name, 'w') as init_file_fp:
        build_ini_stream_from_template(template_file_name=template_file_name,
                                       init_file_stream=init_file_fp,
                                       bs_env=bs_env,
                                       bs_mirror_env=bs_mirror_env,
                                       s3_bucket_env=s3_bucket_env,
                                       data_set=data_set,
                                       es_server=es_server,
                                       es_namespace=es_namespace)


# Ref: https://stackoverflow.com/questions/19911123/how-can-you-get-the-elastic-beanstalk-application-version-in-your-application
EB_MANIFEST_FILENAME = "/opt/elasticbeanstalk/deploy/manifest"


def get_eb_bundled_version():
    """
    Returns the version of the ElasticBeanstalk source bundle, by inspecting its manifest.
    The manifest is a JSON dictionary and the version is associated with the 'VersionLabel' key.
    This will return None if that information cannot be obtained.
    """
    if os.path.exists(EB_MANIFEST_FILENAME):
        try:
            with io.open(EB_MANIFEST_FILENAME, 'r') as fp:
                data = json.load(fp)
            return data.get('VersionLabel')
        except Exception:
            return None
    else:
        return None


def get_local_git_version():
    return subprocess.check_output(['git', 'describe', '--dirty']).decode('utf-8').strip('\n')


def get_app_version():  # This logic (perhaps most or all of this file) should move to dcicutils
    try:
        return get_eb_bundled_version() or get_local_git_version()
    except Exception:
        return 'unknown-version-at-' + datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")


EMPTY_ASSIGNMENT = re.compile(r'^[ \t]*[A-Za-z][A-Za-z0-9.-_]*[ \t]*=[ \t\r\n]*$')


def build_ini_stream_from_template(template_file_name, init_file_stream,
                                   bs_env=None, bs_mirror_env=None, s3_bucket_env=None, data_set=None,
                                   es_server=None, es_namespace=None):
    """
    Sends output to init_file_stream corresponding to the data noe would want in an ini file
    for the given template_file_name and available environment variables.

    Args:
        template_file_name: The template file to guide the output.
        init_file_stream: A stream to send output to.
        bs_env: A beanstalk environment.
        s3_bucket_env: Environment name that is part of the s3 bucket name. (Usually defaults properly.)
        data_set: 'test' or 'prod'. Default is 'test' unless bs_env is a staging or production environment.
        es_server: The name of an es server to use.
        es_namespace: The namespace to use on the es server. If None, this uses the bs_env.

    Returns: None

    """

    es_server = es_server or os.environ.get('ENCODED_ES_SERVER', "MISSING_ENCODED_ES_SERVER")
    bs_env = bs_env or os.environ.get("ENCODED_BS_ENV", "MISSING_ENCODED_BS_ENV")
    bs_mirror_env = bs_mirror_env or os.environ.get("ENCODED_BS_MIRROR_ENV", get_standard_mirror_env(bs_env)) or ""
    s3_bucket_env = s3_bucket_env or os.environ.get("ENCODED_S3_BUCKET_ENV",
                                                    prod_bucket_env(bs_env) if is_stg_or_prd_env(bs_env) else bs_env)
    data_set = data_set or os.environ.get("ENCODED_DATA_SET",
                                          "prod" if is_stg_or_prd_env(bs_env) else "test")
    es_namespace = es_namespace or os.environ.get("ENCODED_ES_NAMESPACE", bs_env)

    extra_vars = {
        'APP_VERSION': get_app_version(),
        'PROJECT_VERSION': toml.load(PYPROJECT_FILE_NAME)['tool']['poetry']['version'],
        'SNOVAULT_VERSION': pkg_resources.get_distribution("dcicsnovault").version,
        'UTILS_VERSION': pkg_resources.get_distribution("dcicutils").version,
        'ES_SERVER': es_server,
        'BS_ENV': bs_env,
        'BS_MIRROR_ENV': bs_mirror_env,
        'S3_BUCKET_ENV': s3_bucket_env,
        'DATA_SET': data_set,
        'ES_NAMESPACE': es_namespace,
    }

    # We assume these variables are not set, but best to check first. Confusion might result otherwise.
    for extra_var in extra_vars:
        if extra_var in os.environ:
            raise RuntimeError("The environment variable %s is already set to %s."
                               % (extra_var, os.environ[extra_var]))

    try:

        # When we've checked everything, go ahead and do the bindings.
        for var, val in extra_vars.items():
            os.environ[var] = val

        with io.open(template_file_name, 'r') as template_fp:
            for line in template_fp:
                expanded_line = os.path.expandvars(line)
                # Uncomment for debugging, but this must not be disabled for production code so that passwords
                # are not echoed into logs. -kmp 26-Feb-2020
                # if '$' in line:
                #     print("line=", line)
                #     print("expanded_line=", expanded_line)
                if not EMPTY_ASSIGNMENT.match(expanded_line):
                    init_file_stream.write(expanded_line)

    finally:

        for key in extra_vars.keys():
            # Let's be tidy and put things back the way they were before.
            # Most things probably don't care, but testing might.
            del os.environ[key]


def any_environment_template_filename():
    file = os.path.join(TEMPLATE_DIR, "any.ini")
    if not os.path.exists(file):
        raise ValueError("Special template any.ini was not found.")
    return file


def environment_template_filename(env_name):
    prefixes = ["fourfront-", "cgap-"]
    short_env_name = None
    for prefix in prefixes:
        if env_name.startswith(prefix):
            short_env_name = env_name[len(prefix):]
            break
    if short_env_name is None:
        short_env_name = env_name
    file = os.path.join(TEMPLATE_DIR, short_env_name + ".ini")
    if not os.path.exists(file):
        raise ValueError("No such environment: %s" % env_name)
    return file


def template_environment_names():
    return sorted([
        os.path.splitext(os.path.basename(file))[0]
        for file in glob.glob(os.path.join(TEMPLATE_DIR, "*"))
    ])


class GenerationError(Exception):
    pass


def main():
    try:
        if 'ENV_NAME' not in os.environ:
            raise GenerationError("ENV_NAME is not set.")
        parser = argparse.ArgumentParser(
            description="Generates a product.ini file from a template appropriate for the given environment,"
                        " which defaults from the value of the ENV_NAME environment variable "
                        " and may be given with or without a 'fourfront-' prefix. ")
        parser.add_argument("--env",
                            help="environment name",
                            default=os.environ['ENV_NAME'],
                            choices=template_environment_names())
        parser.add_argument("--target",
                            help="the name of a .ini file to generate",
                            default=INI_FILE_NAME)
        parser.add_argument("--bs_env",
                            help="an ElasticBeanstalk environment name",
                            default=None)
        parser.add_argument("--bs_mirror_env",
                            help="the name of the mirror of the ElasticBeanstalk environment name",
                            default=None)
        parser.add_argument("--s3_bucket_env",
                            help="name of env to use in s3 bucket name, usually defaulted without specifying",
                            default=None)
        parser.add_argument("--data_set",
                            help="a data set name",
                            choices=['test', 'prod'],
                            default=None)
        parser.add_argument("--es_server",
                            help="an ElasticSearch servername or servername:port",
                            default=None)
        parser.add_argument("--es_namespace",
                            help="an ElasticSearch namespace",
                            default=None)
        args = parser.parse_args()
        # template_file_name = environment_template_filename(args.env)
        template_file_name = any_environment_template_filename()
        ini_file_name = args.target
        # print("template_file_name=", template_file_name)
        # print("ini_file_name=", ini_file_name)
        build_ini_file_from_template(template_file_name, ini_file_name,
                                     bs_env=args.bs_env, bs_mirror_env=args.bs_mirror_env,
                                     s3_bucket_env=args.s3_bucket_env, data_set=args.data_set,
                                     es_server=args.es_server, es_namespace=args.es_namespace)
    except Exception as e:
        PRINT("Error (%s): %s" % (e.__class__.__name__, e))
        sys.exit(1)


if __name__ == "__main__":
    main()
