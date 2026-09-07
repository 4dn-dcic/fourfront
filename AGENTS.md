# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- The Python package is `encoded`; dependency/tool versions are in `pyproject.toml` and `poetry.lock`. Use a dedicated Python 3.11 environment and do not override the locked Moto after installation.
- Test entrypoints are `pytest.ini`, root `conftest.py`, and `src/encoded/tests/conftest_settings.py`. Root conftest initializes environment discovery and sets `IDENTITY`; even a nominal unit run can contact AWS. Truly service-free modules can use `pytest --noconftest -o addopts=`; integration tests need explicit isolated service fixtures.
- Frontend tests use Node 20, `npm test -- --runInBand`, the explicit ESM transform allowlist in `package.json`, and browser lifecycle fixtures in `jest/environment.js` and `jest/cleanup.js`. Keep dependency transforms narrow; `frontend-compatibility-test.js` guards those boundaries.
- Fourfront intentionally maintains local `src/encoded/search.py` and `batch_download.py` forks. Preserve its schemas, facets, and authorization contracts when aligning with Snovault.
- For ZIP/document insertion failures, consult `docs/attachment-mime.md` before changing MIME validation. Native libmagic and its rules are separate from the Python lockfile.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
