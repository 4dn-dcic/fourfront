import argparse
import logging
import structlog
from pyramid.path import DottedNameResolver
from pyramid.paster import get_app
from encoded import configure_dbsession

log = structlog.getLogger(__name__)
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
    parser.add_argument('--prod', action='store_true',
                        help="must be set to run on webprod/webprod2")
    parser.add_argument('--overwrite', action='store_true',
                        help="must be set to update existing uuids with patch")
    args = parser.parse_args()

    # get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    # create db schema
    configure_dbsession(app)

    env = app.registry.settings.get('env.name', '')

    load_test_data = app.registry.settings.get('snovault.load_test_data')
    log.info("load_data: load_test_data function is %s" % (load_test_data))
    load_test_data = DottedNameResolver().resolve(load_test_data)

    # do not run on webprod/webprod2 unless we set --prod flag
    if 'webprod' in env and not args.prod:
        log.info('load_data: skipping, since we are on webprod/webprod2 and --prod not used')
        return

    load_test_data(app, args.overwrite)

if __name__ == "__main__":
    main()
