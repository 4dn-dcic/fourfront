import sys
import argparse
import logging
import structlog
import transaction
from pyramid.paster import get_app

from dcicutils.env_utils import is_stg_or_prd_env
from snovault import STORAGE
from snovault.elasticsearch.indexer_utils import get_uuids_for_types
from .. import configure_dbsession


logger = structlog.getLogger(__name__)
EPILOG = __doc__


def purge_item_type_from_storage(app, item_types, prod=False):
    """
    Purges all items with the given item_types from our storage. This function could partially purge
    an item type if an error is encountered. Note that this will work no matter what resources are backing
    'PickStorage'.

    IMPORTANT: If an error occurs the DB transaction is rolled back, but the ES deletions will persist.
               Re-running 'create_mapping' on this item type will reindex the items.

    :param app: app to access settings from, either a testapp (testapp.app.registry) or regular app(.registry)
    :param item_types: list of types to purge from DB
    :param prod: bool whether to allow run on prod, default False
    :return: True in success, False otherwise
    """
    if not hasattr(app, 'registry'):
        app = app.app
        if not hasattr(app, 'registry'):
            raise RuntimeError('Passed app to purge_item_type_from_db does not contain a registry.')

    if 'env.name' in app.registry.settings:
        env = app.registry.settings['env.name']
        if is_stg_or_prd_env(env) and not prod:
            logger.error('Tried to run purge_item_type_from_storage on prod without specifying'
                         'the prod options - exiting.')
            return False

    # purge uuids directly from PickStorage, ignoring status=deleted checks
    configure_dbsession(app)
    uuids_to_purge = set(get_uuids_for_types(app.registry, item_types))
    pstorage = app.registry[STORAGE]
    for uuid in uuids_to_purge:
        try:
            pstorage.purge_uuid(uuid)
        except Exception as e:  # XXX: handle recoverable exceptions?
            logger.error('Encountered exception purging an item type from the DB: %s' % str(e))
            transaction.abort()
            return False

    transaction.commit()
    return True


def main():
    """ Entry point for this command """
    logging.basicConfig()

    parser = argparse.ArgumentParser(
        description='Clear an item type out of metadata storage',
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('config_uri', help='path to configfile')
    parser.add_argument('item_type', help='item type to run on')
    parser.add_argument('--app-name', help='Pyramid app name in configfile')
    parser.add_argument('--prod', help='Whether or not to proceed if we are on a production server',
                        action='store_true', default=False)
    args = parser.parse_args()

    app = get_app(args.config_uri, args.app_name)
    sys.exit(purge_item_type_from_storage(app, [args.item_type], prod=args.prod))
