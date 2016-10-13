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


def run(app, host, dbname, port, user, pwd):

    # stop_httpd
    subprocess.check_call(['sudo', 'service', 'httpd', 'stop'])

    print("password is ", pwd)

    # dropdb
    subprocess.check_call(['dropdb', '-p', port, '-h', host, '-U', user, '-e', dbname])

    # drop elastic search
    es = app.registry[ELASTIC_SEARCH]
    es.indices.delete(index='annotations')
    es.indices.delete(index='snowvault')
    # curl -XDELETE 'http://localhost:9200/twitter/'

    # createdb
    subprocess.check_call(['createdb', '-p', port, '-h', host, '-U', user, '-e', dbname])

    # parachute
    os.system("shutdown now -h")


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

    def hostname(value):
        if value != nameify(value):
            raise argparse.ArgumentTypeError(
                "%r is an invalid hostname, only [a-z0-9] and hyphen allowed." % value)
        return value

    parser = argparse.ArgumentParser(
        description="",
    )
    parser.add_argument('--port', default=os_port)
    parser.add_argument('--host', type=hostname, default=os_hostname)
    parser.add_argument('--dbuser', default=os_dbuser) 
    parser.add_argument('--pwd', default=os_dbpwd)
    parser.add_argument('--name', default=os_dbname)

    # get application info
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    args = parser.parse_args()

    logging.basicConfig()
    app = get_app(args.config_uri, args.app_name)

    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)

    return run(app, args.host, args.name, args.port, args.dbuser, args.pwd)


if __name__ == '__main__':
    main()
