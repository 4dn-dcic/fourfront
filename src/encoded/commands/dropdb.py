import re
import subprocess
import argparse
from os import environ
import os
import logging
from snovault.elasticsearch.interfaces import ELASTIC_SEARCH
from pyramid.paster import get_app


def nameify(s):
    name = ''.join(c if c.isalnum() else '-' for c in s.lower()).strip('-')
    return re.subn(r'\-+', '-', name)[0]


def run(host, dbname, port, user, pwd):

    # stop_httpd
    subprocess.check_call(['service', 'httpd', 'stop'])

    print("password is ", pwd)
    env = os.environ.copy()
    env['PGPASSWORD'] = pwd

    # dropdb
    # this is still broke :(
    subprocess.Popen('/usr/bin/dropdb -p' + port + ' -h' + host + ' -U' + user + ' -e' + dbname,
                     shell=True, env=env)

    # drop elastic search
    subprocess.check_call(['curl', '-XDELETE', 'http://172.31.49.128:9872/annotations'])
    if os.environ.get("ENV_NAME") == "PROD":
        subprocess.check_call(['curl', '-XDELETE', 'http://172.31.49.128:9872/ffprod'])
    else:
        subprocess.check_call(['curl', '-XDELETE', 'http://172.31.49.128:9872/snovault'])

    # createdb
    subprocess.Popen('/usr/bin/createdb -p' + port + ' -h' + host + ' -U' + user + ' -e' + dbname,
                     shell=True, env=env)

    # parachute
    # os.system("shutdown -r now")


def main():

    # just incase let's try to source some environment variables
    command = ['bash', '-c', 'source /opt/python/current/env && env']
    proc = subprocess.Popen(command, stdout=subprocess.PIPE)

    for line in proc.stdout:
        (key, _, value) = line.decode("utf8").partition("=")
        os.environ[key] = value

    proc.communicate()

    # set to aws defaults
    os_port = environ.get('RDS_PORT')
    os_hostname = environ.get('RDS_HOSTNAME')
    os_dbuser = environ.get('RDS_USERNAME')
    os_dbpwd = environ.get('RDS_PASSWORD')
    os_dbname = environ.get('RDS_DB_NAME')

    parser = argparse.ArgumentParser(
        description="",
    )
    parser.add_argument('--port', default=os_port)
    parser.add_argument('--host', default=os_hostname)
    parser.add_argument('--dbuser', default=os_dbuser)
    parser.add_argument('--pwd', default=os_dbpwd)
    parser.add_argument('--name', default=os_dbname)

    args = parser.parse_args()

    return run(args.host, args.name, args.port, args.dbuser, args.pwd)


if __name__ == '__main__':
    main()
