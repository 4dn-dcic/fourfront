"""
based on environment variables make a config file for build out
"""

import glob
import io
import os
import sys
import argparse


TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "ini_files")
INI_FILE_NAME = "production.ini"


def build_ini_file_from_template(template_file_name, init_file_name):
    with io.open(init_file_name, 'w') as init_file_fp:
        build_ini_stream_from_template(template_file_name=template_file_name,
                                       init_file_stream=init_file_fp)


def build_ini_stream_from_template(template_file_name, init_file_stream):
    with io.open(template_file_name, 'r') as template_fp:
        for line in template_fp:
            expanded_line = os.path.expandvars(line)
            # Uncomment for debugging, but this must not be disabled for production code so that passwords
            # are not echoed into logs. -kmp 26-Feb-2020
            # if '$' in line:
            #     print("line=", line)
            #     print("expanded_line=", expanded_line)
            init_file_stream.write(expanded_line)


def environment_template_filename(env_name):
    prefix = "fourfront-"
    short_env_name = env_name[len(prefix):] if env_name.startswith(prefix) else env_name
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
