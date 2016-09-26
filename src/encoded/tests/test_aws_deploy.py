import os
from encoded.commands import aws_deploy
# TODO: move /deploy to src/encoded.commands and write tests for deployment
# from encoded.commands import beanstalk_deploy


def test_is_prod():
    os.environ['ENV_NAME'] = 'PROD'
    assert aws_deploy.is_prod()

    del os.environ['ENV_NAME']
    assert not aws_deploy.is_prod()


def test_get_buildout_cmd():
    os.environ['ENV_NAME'] = 'PROD'
    assert "/bin/buildout -c production.cfg" == aws_deploy.get_buildout_cmd()
    del os.environ['ENV_NAME']
    assert "/bin/buildout -c buildout.cfg" == aws_deploy.get_buildout_cmd()


def test_run_w_venv():
    expected = 'source /opt/python/run/venv/bin/activate && /bin/buildout'
    expected += ' -c production.cfg >> /var/log/deploy.log'

    os.environ['ENV_NAME'] = 'PROD'
    assert expected == aws_deploy.run_w_venv(aws_deploy.get_buildout_cmd())

    del os.environ['ENV_NAME']
    expected_for_dev = 'source /opt/python/run/venv/bin/activate && /bin/buildout'
    expected_for_dev += ' -c buildout.cfg >> /var/log/deploy.log'

    assert expected_for_dev == aws_deploy.run_w_venv(aws_deploy.get_buildout_cmd())
