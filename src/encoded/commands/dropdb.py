import re
import subprocess
import argparse
from os import environ
import os
import time


def run(host, dbname, port, user, pwd):

    # stop_httpd
    subprocess.check_call(['service', 'httpd', 'stop'])

    env = os.environ.copy()
    env['PGPASSWORD'] = pwd

    # dropdb
    def dbcmd(cmd):
        return "%s -p %s -h %s -U %s -e %s" % (cmd, port, host, user, dbname)

    subprocess.Popen(dbcmd('/usr/bin/dropdb'), shell=True, env=env)

    # drop elastic search
    es_server = "http://127.31.49.128:9872"

    def drop_index(name):
        cmd = ['/usr/bin/curl', '-XDELTE', '%s/%s' % (es_server, name)]
        print("about to drop index %s with cmd %s " % (name, cmd))
        status = subprocess.call(cmd)
        print("drop %s index returned %s" % (name, status))


    # probably shouldn't drop shared indexes
    # drop_index("annotations")
    if os.environ.get("ENV_NAME") == "PROD":
        drop_index("ffprod")
    else:
        drop_index("snovault")

    # createdb, also wait to ensure everybody is caught up
    subprocess.Popen(dbcmd('createdb'), shell=True, env=env).wait()

    # parachute
    print("prepare to jump")
    for i in range(10):
        time.sleep(1)
        print(".")

    os.system("shutdown -r now")


def main():

    # just incase let's try to source some environment variables
    command = ['bash', '-c', 'source /opt/python/current/env && env']
    proc = subprocess.Popen(command, stdout=subprocess.PIPE)

    for line in proc.stdout:
        (key, _, value) = line.decode("utf8").partition("=")
        os.environ[key] = value.strip("\n")

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
