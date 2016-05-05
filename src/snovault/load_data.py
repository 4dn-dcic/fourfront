import argparse
import logging

from pyramid.path import DottedNameResolver
from pyramid.paster import get_app
from encoded import configure_dbsession

logger = logging.getLogger(__name__)
EPILOG = __doc__


def main():
    parser = argparse.ArgumentParser(
        description="Run development servers", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    args = parser.parse_args()

    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)


    #get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    #create db schema
    configure_dbsession(app)

    load_test_data = app.registry.settings.get('snovault.load_test_data')
    load_test_data = DottedNameResolver().resolve(load_test_data)
    load_test_data(app)

if __name__ == "__main__":
    main()

