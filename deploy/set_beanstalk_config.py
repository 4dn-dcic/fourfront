'''
take environment variables for postgresql and
ensure that get into production.ini
'''
import os
import subprocess

def dbconn_from_env():
    if 'RDS_DB_NAME' in os.environ:
        db = os.environ['RDS_DB_NAME']
        user = os.environ['RDS_USERNAME']
        pwd =  os.environ['RDS_PASSWORD']
        host = os.environ['RDS_HOSTNAME']
        port = os.environ['RDS_PORT']
        return "postgresql://%s:%s@%s:%s/%s" % (user, pwd, host, port, db)

def update_connection_string(conn):

    if not conn: return

    filename = 'base.ini'
    regex = 's#sqlalchemy.*#sqlalchemy.url = %s#' % (conn)

    print("updated base.ini with connection string", conn)
    subprocess.check_output(
        ['sed', '-i', '', regex, filename])

if __name__ == "__main__":
    update_connection_string(dbconn_from_env())
