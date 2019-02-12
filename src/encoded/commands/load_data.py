import argparse
import logging

from pyramid.path import DottedNameResolver
from pyramid.paster import get_app
from encoded import configure_dbsession
import sys
import os

logger = logging.getLogger(__name__)
EPILOG = __doc__


def main():

    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)


    parser = argparse.ArgumentParser(
        description="Load Test Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--access-key', default='s3',
                        help="store local or copy to s3, will generate and store access key for admin user")
    parser.add_argument('--drop-db-on-mt', action='store_true',  help="path to configfile")
    parser.add_argument('--prod', action='store_true',
                        help="must be set to run on webprod/webprod2")
    args = parser.parse_args()

    #get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    #create db schema
    configure_dbsession(app)

    env = app.registry.settings.get('env.name')

    load_test_data = app.registry.settings.get('snovault.load_test_data')
    print("****** load test data is %s" % (load_test_data))
    load_test_data = DottedNameResolver().resolve(load_test_data)

    # clear database on mastertest when flag is set and on the right env
    clear_tables = True if ('mastertest' in env and args.drop_db_on_mt) else False

    # do not run on webprod/webprod2 unless we set --prod flag
    if 'webprod' in env and not args.prod:
        return

    load_test_data(app, args.access_key, clear_tables)

if __name__ == "__main__":
    main()
