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
    return "postgresql://abh:def@local-host:123/ebd"

def update_connection_string(conn):

    if not conn: return
    file_dir, _ = os.path.split(os.path.abspath(__file__))
    filename = os.path.join(file_dir, '..','base.ini')
    print (filename)
    regex = 's#sqlalchemy.*#sqlalchemy.url = %s#' % (conn)

    # not for amazon linux use sed -i for osx use sed -i ''
    print("updated base.ini with connection string", conn)
    subprocess.check_output(
        ['sed', '-i', regex, filename])

if __name__ == "__main__":
    update_connection_string(dbconn_from_env())
