'''
based on environment variables make a config file for build out
'''
import os


BASE = '''[buildout]
extends = buildout.cfg


[production-ini]
file_upload_bucket = elasticbeanstalk-{env_name}-files
blob_bucket = elasticbeanstalk-{env_name}-blobs
system_bucket = elasticbeanstalk-{env_name}-system
file_wfout_bucket = elasticbeanstalk-{env_name}-wfoutput
region_search_instance = {es_server}
elasticsearch_instance = {es_server}
elasticsearch_index = {env_name}
sqlalchemy_url = {dbconn}

create_tables = true
load_test_data = encoded.loadxl:{load_function}
'''


def dbconn_from_env():
    prfx = "RDS"
    if prfx:
        db = os.environ[prfx + '_DB_NAME']
        user = os.environ[prfx + '_USERNAME']
        pwd = os.environ[prfx + '_PASSWORD']
        host = os.environ[prfx + '_HOSTNAME']
        port = os.environ[prfx + '_PORT']
        return "postgresql://%s:%s@%s:%s/%s" % (user, pwd, host, port, db)
    return "postgresql://abh:def@local-host:123/ebd"


def build_cfg_file():
    data = {}
    data['dbconn'] = dbconn_from_env()
    data['env_name'] = os.environ.get("ENV_NAME", "")
    data['load_function'] = 'load_test_data'
    # this is temporary while we have environments switched, change back later
    # if 'prod' in data['env_name'].lower():
    if data['env_name'].lower() in ['4dn-web-dev', 'fourfront-webdev']:
        data['es_server'] = '172.31.49.128:9872'
        data['load_function'] = 'load_prod_data'
    elif data['env_name'].lower() == 'fourfront-webprod':
        data['es_server'] = '172.31.16.84:9872'
    else: # this will soon be base case
        data['es_server'] = os.environ.get("ES_URL")
        if os.environ.get("LOAD_FUNCTION"):
            data['load_function'] = os.environ.get("LOAD_FUNCTION")

    file_dir, _ = os.path.split(os.path.abspath(__file__))
    filename = os.path.join(file_dir, '..', 'beanstalk.cfg')
    print (filename)

    with open(filename, 'w') as bs_ini:
        bs_ini.write(BASE.format(**data))


if __name__ == "__main__":
    build_cfg_file()
