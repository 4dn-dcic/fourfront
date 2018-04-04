'''
based on environment variables make a config file for build out
'''
import os
import multiprocessing


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
env_name = {real_env_name}
create_tables = true
load_test_data = encoded.loadxl:{load_function}
mpindexer = {should_index}
indexer = {should_index}
indexer_processes = {procs}
'''
# TODO: add in indexer.processes


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
    data['real_env_name'] = os.environ.get("ENV_NAME", "")
    data['env_name'] = os.environ.get("ENV_NAME", "")
    # staging env points to prod buckets
    if data['env_name'] in ['fourfront-staging', 'fourfront-webprod2']:
        data['env_name'] = 'fourfront-webprod'

    data['should_index'] = 'true'
    data['load_function'] = 'load_test_data'
    data['procs'] = str(multiprocessing.cpu_count())
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
