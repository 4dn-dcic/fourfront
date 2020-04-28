"""
based on environment variables make a config file for build out
"""

import datetime
import glob
import io
import json
import os
import subprocess
import sys
import toml
import argparse


_MY_DIR = os.path.dirname(__file__)
TEMPLATE_DIR = os.path.join(_MY_DIR, "ini_files")
INI_FILE_NAME = "production.ini"
PYPROJECT_DIR = os.path.dirname(_MY_DIR)
PYPROJECT_FILE_NAME = os.path.join(PYPROJECT_DIR, "pyproject.toml")


def build_ini_file_from_template(template_file_name, init_file_name):
    with io.open(init_file_name, 'w') as init_file_fp:
        build_ini_stream_from_template(template_file_name=template_file_name,
                                       init_file_stream=init_file_fp)


# Ref: https://stackoverflow.com/questions/19911123/how-can-you-get-the-elastic-beanstalk-application-version-in-your-application
EB_MANIFEST_FILENAME = "/opt/elasticbeanstalk/deploy/manifest"


def get_eb_bundled_version():
    """
    Returns the
    This will return None when there is no eb source bundle.
    """
    if os.path.exists(EB_MANIFEST_FILENAME):
        try:
            with io.open(EB_MANIFEST_FILENAME, 'r') as fp:
                data = json.load(fp)
            return data.get('VersionLabel')
        except Exception as e:
            print("get_eb_bundled_version got error: %s" % e)
            return None
    else:
        print("Doesn't exist")
        return None


def get_local_git_version():
    return subprocess.check_output(['git', 'describe', '--dirty']).decode('utf-8').strip('\n')


def get_app_version():  # This logic (perhaps most or all of this file) should move to dcicutils
    try:
        return get_eb_bundled_version() or get_local_git_version()
    except Exception:
        return 'unknown-version-at-' + datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")


def build_ini_stream_from_template(template_file_name, init_file_stream):
    extra_vars = {
        'APP_VERSION': get_app_version(),
        'PROJECT_VERSION': toml.load(PYPROJECT_FILE_NAME)['tool']['poetry']['version']
    }

    # We assume these variables are not set, but best to check first. Confusion might result otherwise.
    for extra_var in extra_vars:
        if extra_var in os.environ:
            raise RuntimeError("The environment variable %s is already set to %s." % (extra_var, os.environ[extra_var]))

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
                init_file_stream.write(expanded_line)

    finally:

        for key in extra_vars.keys():
            # Let's be tidy and put things back the way they were before.
            # Most things probably don't care, but testing might.
            del os.environ[key]


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
        parser = argparse.ArgumentParser(description=
            "Generates a product.ini file from a template appropriate for the given environment,"
            " which defaults from the value of the ENV_NAME environment variable "
            " and may be given with or without a 'fourfront-' prefix. ")
        parser.add_argument("--env",
                            help="environment name",
                            default=os.environ['ENV_NAME'],
                            choices=template_environment_names())
        parser.add_argument("--target",
                            help="the name of a .ini file to generate",
                            default=INI_FILE_NAME)
        args = parser.parse_args()
        template_file_name = environment_template_filename(args.env)
        ini_file_name = args.target
        # print("template_file_name=", template_file_name)
        # print("ini_file_name=", ini_file_name)
        build_ini_file_from_template(template_file_name, ini_file_name)
    except Exception as e:
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    main()
