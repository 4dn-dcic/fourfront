import os
import re
import toml.decoder

from setuptools import setup, find_packages
# from packaging.version import parse as version_parse
from sys import version_info as python_version_info
from semantic_version import SimpleSpec, Version


ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

PYPROJECT_TOML = toml.decoder.load(os.path.join(ROOT_DIR, 'pyproject.toml'))
POETRY_DATA = PYPROJECT_TOML['tool']['poetry']

_CARET_MATCH = re.compile(r"[\^]([0-9]+)([.].*)?$")
_TILDE_MATCH = re.compile(r"[~]([0-9]+[.])([0-9]+)([.].*)?$")


def fix_requirement(requirement):
    if isinstance(requirement, str):
        return _fix_requirement_string(requirement)
    elif isinstance(requirement, list):
        return fix_requirement(_select_requirement(requirement))
    elif isinstance(requirement, dict):
        return _fix_requirement_dict(requirement)
    else:
        raise ValueError(f"Unrecognized requirement: {requirement!r}")


def _select_requirement(requirement):
    if not isinstance(requirement, list):
        raise ValueError(f"{requirement!r} is not a list.")
    python_version = Version(f"{python_version_info.major}.{python_version_info.minor}.{python_version_info.micro}")
    for clause in requirement:
        if "python" not in clause:
            raise ValueError(f"Missing 'python' in clause: {clause!r}")
        if SimpleSpec(clause['python']).match(python_version):
            return clause
        raise ValueError(f"No clauses matched: {requirement!r}")


def _fix_requirement_string(requirement):
    m = _CARET_MATCH.match(requirement)
    if m:
        return ">=%s%s,<%s" % (m.group(1), m.group(2), int(m.group(1)) + 1)
    m = _TILDE_MATCH.match(requirement)
    if m:
        return ">=%s%s%s,<%s%s" % (m.group(1), m.group(2), m.group(3), m.group(1), int(m.group(2)) + 1)
    if requirement[0].isdigit():
        return "==" + requirement
    else:
        return requirement


def _fix_requirement_dict(requirement):
    if "version" not in requirement:
        raise ValueError(f"Missing 'version' in requirement: {requirement!r}")
    
    version = _fix_requirement_string(requirement["version"])
    extras = requirement.get("extras", [])

    if not extras:
        return version
    else:
        extras_str = "[" + ",".join(extras) + "]"
        return extras_str + version


_EMAIL_MATCH = re.compile(r"^([^<]*)[<]([^>]*)[>]$")


def author_and_email(authorship_spec):
    m = _EMAIL_MATCH.match(authorship_spec)
    if m:
        return m.group(1), m.group(2)
    else:
        raise ValueError("Expect authorship in format 'human_name <email_name@email_host>': %s" % authorship_spec)


def get_requirements(kind='dependencies'):
    return [
        pkg + fix_requirement(requirement)
        for pkg, requirement in POETRY_DATA[kind].items()
        if pkg != "python"
    ]


def flatten_config_data(key, dictionary):
    return "%s\n%s\n\n" % (key, "\n".join([
        key + " = " + val
        for key, val in dictionary.items()
    ]))


def entry_points():
    result = flatten_config_data("[console_scripts]", POETRY_DATA['scripts'])
    paste_dict = PYPROJECT_TOML['paste']
    for subkey in paste_dict:
        result += flatten_config_data('[paste.%s]' % subkey, paste_dict[subkey])
    return result


ENTRY_POINTS = entry_points()

PACKAGE_NAME = POETRY_DATA['name']
README = open(os.path.join(ROOT_DIR, 'README.rst')).read()
# CHANGES = open(os.path.join(ROOT_DIR, 'CHANGES.rst')).read())
DESCRIPTION = POETRY_DATA['description']
LONG_DESCRIPTION = README
AUTHOR, AUTHOR_EMAIL = author_and_email(POETRY_DATA['authors'][0])
URL = 'http://data.4dnucleome.org'
LICENSE = 'MIT'
INSTALL_REQUIRES = get_requirements()
TESTS_REQUIRE = get_requirements('dev-dependencies')
VERSION = POETRY_DATA['version']

if __name__ == '__main__':

    setup(
        name=PACKAGE_NAME,
        version=VERSION,
        description=DESCRIPTION,
        long_description=LONG_DESCRIPTION,
        packages=find_packages('src'),
        package_dir={'': 'src'},
        include_package_data=True,
        zip_safe=False,
        author=AUTHOR,
        author_email=AUTHOR_EMAIL,
        url=URL,
        license=LICENSE,
        install_requires=INSTALL_REQUIRES,
        tests_require=TESTS_REQUIRE,
        extras_require={'test': TESTS_REQUIRE},
        entry_points=ENTRY_POINTS,
    )
