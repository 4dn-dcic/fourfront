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
    parser.add_argument('--tables-only', action='store_true',
                        help="don't load data, just create tables")
    parser.add_argument('--clear-data', action='store_true',
                        help="clear out the data")

    args = parser.parse_args()

    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)


    #get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    #create db schema
    configure_dbsession(app, clear_data=args.clear_data)

    if not args.tables_only and not args.clear_data:
        load_test_data = app.registry.settings.get('snovault.load_test_data')
        load_test_data = DottedNameResolver().resolve(load_test_data)
        load_test_data(app)

if __name__ == "__main__":
    main()

