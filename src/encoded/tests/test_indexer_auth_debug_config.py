"""Static guardrail: shipped .ini configuration must never enable
``pyramid.debug_authorization``.

When ``pyramid.debug_authorization`` is true, Pyramid adds per-view permission
tracing that is pure overhead on the indexer render hot path (and noisy in
logs). Fourfront's shipped configuration currently either sets it to ``false``
or omits it (defaulting to false); the only intentional ``true`` lives in the
in-memory test app fixture (``conftest_settings.py``), which is Python, not a
shipped ``.ini`` file, and is therefore not scanned here.

This is a pure static check (no ES/DB/app) mirroring snovault's
``test_indexer_auth_debug_config.py``, so it locks the invariant against future
regressions in any Fourfront-shipped ini/template.
"""

import os
import re

import pytest


pytestmark = [pytest.mark.working, pytest.mark.unit]


REPOSITORY_ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)

# Directories that never contain Fourfront-shipped configuration.
_EXCLUDED_DIR_NAMES = {
    ".git", ".cache", ".idea", "node_modules", "coverage",
    "__pycache__", "scratchpad", "verifyenv",
}

# pytest.ini configures pytest, not a Pyramid app; it is not an app ini.
_EXCLUDED_BASENAMES = {"pytest.ini"}

_DEBUG_AUTH_RE = re.compile(
    r"^\s*pyramid\.debug_authorization\s*=\s*(?P<value>\S+)", re.IGNORECASE
)


def _shipped_ini_files():
    matches = []
    for dirpath, dirnames, filenames in os.walk(REPOSITORY_ROOT_DIR):
        # prune excluded directories in-place so os.walk doesn't descend into them
        dirnames[:] = [
            d for d in dirnames
            if d not in _EXCLUDED_DIR_NAMES and not d.endswith(".egg-info")
        ]
        for filename in filenames:
            if filename in _EXCLUDED_BASENAMES:
                continue
            if filename.endswith(".ini") or filename.endswith(".ini.template"):
                matches.append(os.path.join(dirpath, filename))
    return matches


def test_shipped_ini_files_discovered():
    # Sanity: make sure the scan actually finds the known config files, otherwise
    # a path change could silently turn this guardrail into a no-op.
    found = {os.path.relpath(p, REPOSITORY_ROOT_DIR) for p in _shipped_ini_files()}
    assert "development.ini.template" in found
    assert os.path.join("deploy", "ini_files", "any.ini") in found
    assert os.path.join(
        "deploy", "docker", "local", "docker_development.ini.template"
    ) in found


def test_no_shipped_ini_enables_debug_authorization():
    offenders = []
    for path in _shipped_ini_files():
        with open(path, "r") as fp:
            for lineno, line in enumerate(fp, start=1):
                match = _DEBUG_AUTH_RE.match(line)
                if not match:
                    continue
                value = match.group("value").lower()
                if value in ("true", "1", "yes", "on"):
                    offenders.append(
                        "%s:%d -> %s" % (os.path.relpath(path, REPOSITORY_ROOT_DIR),
                                         lineno, line.strip())
                    )
    assert not offenders, (
        "pyramid.debug_authorization must not be enabled in shipped configuration; "
        "offending lines:\n" + "\n".join(offenders)
    )
