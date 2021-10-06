import argparse
import logging
import structlog

from dcicutils.env_utils import permit_load_data
from pyramid.paster import get_app
from pyramid.path import DottedNameResolver
from .. import configure_dbsession


log = structlog.getLogger(__name__)


EPILOG = __doc__


def load_data_should_proceed(env, allow_prod):
    """ Returns True on whether or not load_data should proceed.

    :param env: env we are on
    :param allow_prod: prod argument from argparse, defaults to False
    :return: True if load_data should continue, False otherwise
    """

    return permit_load_data(envname=env, allow_prod=allow_prod, orchestrated_app='fourfront')

    # # do not run on a production environment unless we set --prod flag
    # if is_stg_or_prd_env(env) and not allow_prod:
    #     log.info('load_data: skipping, since we are on a production environment and --prod not used')
    #     return False
    #
    # # do not run on hotseat since it is a prod snapshot
    # if 'hotseat' in env:
    #     log.info('load_data: skipping, since we are on hotseat')
    #     return False
    #
    # return True


def main():
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)

    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Load Test Data", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--prod', action='store_true',
                        help="must be set to confirm this action is intended to happen on a production server")
    parser.add_argument('--overwrite', action='store_true',
                        help="must be set to update existing uuids with patch")
    args = parser.parse_args()

    # get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    # create db schema
    configure_dbsession(app)

    env = app.registry.settings.get('env.name', '')

    load_test_data = app.registry.settings.get('load_test_data')
    allow_prod = args.prod
    log.info("load_data: load_test_data function is %s" % (load_test_data))
    load_test_data = DottedNameResolver().resolve(load_test_data)

    if load_data_should_proceed(env, allow_prod):
        load_test_data(app, args.overwrite)


if __name__ == "__main__":
    main()
