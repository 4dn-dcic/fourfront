"""Offline deploy contracts: stub executables, never AWS or a deployment."""

import os
from base64 import b64decode
from pathlib import Path
import subprocess

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[3]
DEPLOY = ROOT / 'deploy/docker/production'
pytestmark = [pytest.mark.working, pytest.mark.unit]


def executable(path, text):
    path.write_text('#!/bin/bash\n' + text)
    path.chmod(0o755)


@pytest.mark.parametrize('application', ['portal', 'deployment', 'ingester', 'indexer', 'local'])
def test_dispatcher_propagates_child_failure(tmp_path, application):
    executable(tmp_path / ('entrypoint_%s.bash' % application), 'exit 17\n')
    secret = tmp_path / 'session-secret.b64'
    secret.write_text('b2xk\n')
    result = subprocess.run(['bash', str(DEPLOY / 'entrypoint.bash')], cwd=tmp_path,
                            env=dict(os.environ, application_type=application), capture_output=True)
    assert result.returncode == 17
    assert len(b64decode(secret.read_bytes())) == 256


def test_portal_never_starts_with_failed_identity(tmp_path):
    executable(tmp_path / 'poetry', 'exit 17\n')
    executable(tmp_path / 'supervisord', 'touch supervisor-started\n')
    result = subprocess.run(['bash', str(DEPLOY / 'entrypoint_portal.bash')], cwd=tmp_path,
                            env=dict(os.environ, PATH=str(tmp_path) + ':' + os.environ['PATH']), capture_output=True)
    assert result.returncode == 17
    assert not (tmp_path / 'supervisor-started').exists()


def test_portal_supervisor_replaces_dispatcher_process(tmp_path):
    (tmp_path / 'entrypoint_portal.bash').write_text((DEPLOY / 'entrypoint_portal.bash').read_text())
    executable(tmp_path / 'poetry', 'exit 0\n')
    executable(tmp_path / 'supervisord', 'echo $$ > supervisor-pid\n')
    env = dict(os.environ, application_type='portal', PATH=str(tmp_path) + ':' + os.environ['PATH'])
    process = subprocess.Popen(['bash', str(DEPLOY / 'entrypoint.bash')], cwd=tmp_path, env=env,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    process.communicate(timeout=10)
    assert process.returncode == 0
    assert int((tmp_path / 'supervisor-pid').read_text()) == process.pid


def test_nginx_runtime_identity_and_paths():
    dockerfile = (ROOT / 'Dockerfile').read_text()
    nginx = (DEPLOY / 'nginx.conf').read_text()
    supervisor = (DEPLOY / 'supervisord.conf').read_text()
    assert 'USER nginx\nRUN nginx -v && nginx -t\nUSER root' in dockerfile
    assert 'chown -R nginx:nginx /data/nginx/cache' in dockerfile
    assert 'pid /data/nginx/cache/nginx.pid;' in nginx
    assert 'error_log stderr warn;' in nginx
    assert 'worker_priority -' not in nginx
    assert 'stopsignal=QUIT' in supervisor


def test_build_does_not_overwrite_locked_moto():
    makefile = (ROOT / 'Makefile').read_text()
    assert 'pip install "moto' not in makefile
    after_poetry = makefile.split('build-after-poetry:', 1)[1].split('\nfix-dist-info:', 1)[0]
    assert 'make moto-setup' not in after_poetry


def test_ci_namespace_and_independent_cleanup():
    text = (ROOT / '.github/workflows/main.yml').read_text()
    assert '$ {{' not in text
    job = yaml.safe_load(text)['jobs']['build']
    # Do not expose test secrets to dependency install scripts or Docker builds.
    assert not any('secrets.' in value for value in job['env'].values())
    qa_steps = [step for step in job['steps'] if step.get('name', '').startswith('QA')]
    assert len(qa_steps) == 2
    assert all(step['env']['ACCOUNT_NUMBER'] == '${{ secrets.ACCOUNT_NUMBER }}' for step in qa_steps)
    assert 'github.run_attempt' in job['env']['TEST_JOB_ID']
    assert 'matrix.namespace' in job['env']['TEST_JOB_ID']
    assert all(entry['namespace'].islower() for entry in job['strategy']['matrix']['include'])
    cleanup = [step for step in job['steps'] if step.get('name', '').startswith('Cleanup')]
    assert len(cleanup) == 2
    assert all('always()' in step['if'] for step in cleanup)
    aws = next(step for step in job['steps'] if step.get('uses', '').startswith('aws-actions/'))
    assert "!= 'Docker'" in aws['if']
