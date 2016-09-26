'''
This script will be used to manage the aws install.  We currently have two AWS environments
* 4dn-web-dev - daily builds go here, actually more of a testing environment
              - tied to master branch in git
* 4dn-prod    - produciton releases are deployed here
              - tied to the production branch in git

This script will look for the following env variables:
ENV_NAME == 'PROD' for production tasks
ENCODED_VERSION - sets the version of encode, for bug reporting purposes
ADMIN_SECRET - use for production deployment first time to set password for admin
# TODO: change below to use `ENV_NAME`
NODE_ENV == 'production' set by gulpfile.js to tell webpack to packages js propertly

Basically we are going to do the following steps.

1.  Install Nodejs
2.  Setup apache
3.  Bootstrap
4.  Buildout
5.  Secret key for sesisons
6.  update pyramid config file, to have appropriate settings for aws
7.  setup elastic search mapping (or re-initialize)
8.  Create / Update elastic search indexes
9.  Load data (dummy data for test, just admin for production)
10. Setup WSGI

The "normal" non environment sensitive .ebextension file looks like this:

container_commands:
  01_nodejs_install:
    command: curl --silent --location https://rpm.nodesource.com/setup_4.x |
                sudo bash - && yum install nodejs -y
  02_setup_apache:
    command: cp .ebextensions/encoded-apache.conf /etc/httpd/conf.d/encoded-apache.conf
  03_bootstrap:
    command: "source /opt/python/run/venv/bin/activate && python bootstrap.py
            --buildout-version 2.4.1 --setuptools-version 18.1 > /var/log/deploy.log"
  04_buildout:
    command: "source /opt/python/run/venv/bin/activate && bin/buildout  >> /var/log/deploy.log"
  05_secret_key:
    command: cat /dev/urandom | head -c 256 | base64 > session-secret.b64
  06_jerry_rig_pyramid_config:
    command: "source /opt/python/run/venv/bin/activate && python deploy/set_beanstalk_config.py
                >> /var/log/deploy.log"
  07_elastic_search_mapping:
    command: "bin/create-mapping production.ini --app-name app  >> /var/log/deploy.log"
    leader_only: true
  08_elastic_search_index:
    command: "bin/index-annotations production.ini --check-first --app-name app
            >> /var/log/deploy.log"
    leader_only: true
  09_load_dummy_data:
    command: "bin/load-data production.ini --app-name app  >> /var/log/deploy.log"
    leader_only: true
  10_setup_wsgi_home:
    command: "mkdir -p /home/wsgi && chown wsgi:wsgi /home/wsgi"

'''
import os
import subprocess

virtual_env = 'source /opt/python/run/venv/bin/activate'


def is_prod():
    return os.environ.get('ENV_NAME') == 'PROD'


def get_buildout_cmd():
    cfg_file = 'buildout.cfg'
    if is_prod():
        cfg_file = 'production.cfg'

    return "/bin/buildout -c %s" % (cfg_file)


def run_w_venv(cmd, log_file='/var/log/deploy.log'):
    return "%s && %s >> %s" % (virtual_env, cmd, log_file)


def main():
    # buildout
    buildout_cmd = get_buildout_cmd().split()
    my_env = os.environ.copy()
    print(buildout_cmd)
    subprocess.check_output(buildout_cmd, env=my_env)


if __name__ == "__main__":
    main()
