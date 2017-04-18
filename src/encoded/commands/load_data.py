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
    parser.add_argument('--access-key', help="store local or copy to s3, will generate and store access key for admin user")
    args = parser.parse_args()



    #get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    #create db schema
    configure_dbsession(app)


    load_test_data = app.registry.settings.get('snovault.load_test_data')
    print("****** load test data is %s" % (load_test_data))
    load_test_data = DottedNameResolver().resolve(load_test_data)
    load_test_data(app, args.access_key)

if __name__ == "__main__":
    main()
