"""\
Examples
For the development.ini you must supply the paster app name:

    %(prog)s development.ini --app-name app --init --clear

"""

import argparse
import atexit
import logging
import os.path
import select
import shutil
import subprocess
import sys

from dcicutils.misc_utils import PRINT
from pkg_resources import resource_filename
from pyramid.paster import get_app, get_appsettings
from pyramid.path import DottedNameResolver
from snovault.elasticsearch import create_mapping
from snovault.tests import elasticsearch_fixture, postgresql_fixture


EPILOG = __doc__

logger = logging.getLogger(__name__)


def nginx_server_process(prefix='', echo=False):
    args = [
        os.path.join(prefix, 'nginx'),
        '-c', resource_filename('encoded', 'nginx-dev.conf'),
        '-g', 'daemon off;'
    ]
    process = subprocess.Popen(
        args,
        close_fds=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    if not echo:
        process.stdout.close()

    if echo:
        PRINT('Started: http://localhost:8000')

    return process


def ingestion_listener_compute_command(config_uri, app_name):
    raise NotImplementedError('The ingester is not yet implemented in Fourfront.')
    return [
        'poetry', 'run', 'ingestion-listener', config_uri, '--app-name', app_name
    ]


def ingestion_listener_process(config_uri, app_name, echo=True):
    """ Uses Popen to start up the ingestion-listener. """
    raise NotImplementedError('The ingester is not yet implemented in Fourfront.')

    args = ingestion_listener_compute_command(config_uri, app_name)

    process = subprocess.Popen(
        args,
        close_fds=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    if echo:
        PRINT('Starting Ingestion Listener...')

    return process


def main():
    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Run development servers", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--clear', action="store_true", help="Clear existing data")
    parser.add_argument('--init', action="store_true", help="Init database")
    parser.add_argument('--load', action="store_true", help="Load test set")
    parser.add_argument('--datadir', default='/tmp/snovault', help="path to datadir")
    # This can be turned on when the ingester is merged.
    # parser.add_argument('--no_ingest', action="store_true", default=False, help="Don't start the ingestion process.")
    args = parser.parse_args()

    run(app_name=args.app_name, config_uri=args.config_uri, datadir=args.datadir,
        # Until the ingester is merged, we just always pass ingest=False
        clear=args.clear, init=args.init, load=args.load, ingest=False)


def run(app_name, config_uri, datadir, clear=False, init=False, load=False, ingest=True):

    logging.basicConfig(format='')
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.INFO)

    # get the config and see if we want to connect to non-local servers
    # TODO: This variable seems to not get used? -kmp 25-Jul-2020
    config = get_appsettings(config_uri, app_name)

    datadir = os.path.abspath(datadir)
    pgdata = os.path.join(datadir, 'pgdata')
    esdata = os.path.join(datadir, 'esdata')
    # ----- comment out from HERE...
    if clear:
        for dirname in [pgdata, esdata]:
            if os.path.exists(dirname):
                shutil.rmtree(dirname)
    if init:
        postgresql_fixture.initdb(pgdata, echo=True)
    # ----- ... to HERE to disable recreation of test db
    # ----- may have to `rm /tmp/snovault/pgdata/postmaster.pid`

    processes = []

    @atexit.register
    def cleanup_process():
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                for line in process.stdout:
                    sys.stdout.write(line.decode('utf-8'))
            except IOError:
                pass
            process.wait()

    postgres = postgresql_fixture.server_process(pgdata, echo=True)
    processes.append(postgres)

    es_server_url = config.get('elasticsearch.server', "localhost")

    if "127.0.0.1" in es_server_url or "localhost" in es_server_url:
        # Bootup local ES server subprocess. Else assume connecting to remote ES cluster.
        elasticsearch = elasticsearch_fixture.server_process(esdata, echo=True)
        processes.append(elasticsearch)
    elif not config.get('indexer.namespace'):
        raise Exception("It looks like you are connecting to remote elasticsearch.server"
                        " but no indexer.namespace is defined.")
    elif not config.get("elasticsearch.aws_auth", False):
        # TODO detect if connecting to AWS or not before raising an Exception.
        PRINT("WARNING - elasticsearch.aws_auth is set to false."
              " Connection will fail if connecting to remote ES cluster on AWS.")

    nginx = nginx_server_process(echo=True)
    processes.append(nginx)

    if ingest:
        # Until ingester is merged, this 'if' will neer be entered.
        raise NotImplementedError('The ingester is not yet implemented in Fourfront.')
        ingestion_listener = ingestion_listener_process(config_uri, app_name)
        processes.append(ingestion_listener)

    if init:
        app = get_app(config_uri, app_name)
    else:
        app = None

    # clear queues and initialize indices before loading data. No indexing yet.
    # this is needed for items with properties stored in ES
    if init:
        create_mapping.run(app, skip_indexing=True, purge_queue=True)

    if init and load:
        load_test_data = app.registry.settings.get('load_test_data')
        load_test_data = DottedNameResolver().resolve(load_test_data)
        load_res = load_test_data(app)
        if load_res:  # None if successful
            raise load_res

        # now clear the queues and queue items for indexing
        create_mapping.run(app, check_first=True, strict=True, purge_queue=True)

    PRINT('Started. ^C to exit.')

    stdouts = [p.stdout for p in processes]

    # Ugly should probably use threads instead
    while True:
        readable, writable, err = select.select(stdouts, [], stdouts, 5)
        for stdout in readable:
            for line in iter(stdout.readline, b''):
                sys.stdout.write(line.decode('utf-8'))
        if err:
            for stdout in err:
                for line in iter(stdout.readline, b''):
                    sys.stdout.write(line.decode('utf-8'))
            break


if __name__ == '__main__':
    main()
