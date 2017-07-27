from pyramid.paster import get_app
import logging
from webtest import TestApp
from encoded.verifier import verify_item

EPILOG = __doc__


def run(app, uuids=None):
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }

    testapp = TestApp(app, environ)
    registry = app.registry
    indexer_environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'INDEXER',
    }
    indexer_testapp = TestApp(app, indexer_environ)

    for uuid in uuids:
        return verify_item(uuid, indexer_testapp, testapp, registry)


def main():
    ''' Verifies and item against database / ES and checks embeds '''

    import argparse
    parser = argparse.ArgumentParser(
        description="Verifies and item against database / ES and checks embeds", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('uuid', action='append', help="Items UUID")
    parser.add_argument('app_name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    args = parser.parse_args()

    logging.basicConfig()
    app = get_app(args.config_uri, args.app_name)

    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)
    return run(app, args.uuid)


if __name__ == '__main__':
    main()
