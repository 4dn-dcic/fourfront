import argparse
import logging
import structlog

from dcicutils.env_utils import is_stg_or_prd_env
from pyramid.paster import get_app
from snovault import DBSESSION
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from .. import configure_dbsession


log = structlog.getLogger(__name__)


EPILOG = __doc__


def clear_db_tables(app):
    """
    Given a pyramids app that has a configuted DB session, will clear the
    contents of all DB tables

    Args:
        app: Pyramid application

    Returns:
        bool: True if successful, False if error encountered
    """
    import transaction
    from sqlalchemy import MetaData
    from zope.sqlalchemy import mark_changed
    success = False
    session = app.registry[DBSESSION]
    meta = MetaData(bind=session.connection(), reflect=True)
    connection = session.connection().connect()
    try:
        # truncate tables by only deleting contents
        for table in meta.sorted_tables:
            connection.execute(table.delete())
    except Exception as e:
        log.error('clear_db_es_contents: error on DB drop_all/create_all.'
                  ' Error : %s' % str(e))
        transaction.abort()
    else:
        # commit all changes to DB
        session.flush()
        mark_changed(session())
        transaction.commit()
        success = True
    return success


def run_clear_db_es(app, arg_env, arg_skip_es=False):
    """
    This function actually clears DB/ES. Takes a Pyramid app as well as two flags. _Use with care!_

    For safety, this function will return without side-effect on any production system.

    Also does additional checks based on arguments supplied:

    If an `arg_env` (default None) is given as a non-empty string value,
    this function will return without side-effect if the current app environment does not match the given value.

    If `arg_skip_es` (default False) is True, this function will return after DB clear
    and before running create_mapping.

    Args:
        app: Pyramid application
        arg_env (str): if provided, only run if environment matches this value
        arg_skip_es (bool): if True, do not run create_mapping after DB clear

    Returns:
        bool: True if DB was cleared (regardless of ES)
    """
    env = app.registry.settings.get('env.name', '')
    # for now, do NOT allow clearing of production systems
    if is_stg_or_prd_env(env):
        log.error('clear_db_es_contents: will NOT run on env %s. Exiting...' % env)
        return False
    if arg_env and arg_env != env:
        log.error('clear_db_es_contents: environment mismatch! Given --env %s '
                  'does not match current env %s. Exiting....' % (arg_env, env))
        return False

    log.info('clear_db_es_contents: clearing DB tables...')
    db_success = clear_db_tables(app)
    if not db_success:
        log.error('clear_db_es_contents: clearing DB failed! Try to run again.'
                  ' This command can fail if there are external DB connections')
        return False
    log.info('clear_db_es_contents: successfully cleared DB')

    # create mapping after clear DB to remove ES contents
    if not arg_skip_es:
        log.info('clear_db_es_contents: clearing ES with create_mapping...')
        run_create_mapping(app, purge_queue=True)
    log.info('clear_db_es_contents: done!')
    return True


def main():
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)

    parser = argparse.ArgumentParser(
        description='Clear DB and ES Contents', epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help='path to configfile')
    parser.add_argument('--app-name', help='Pyramid app name in configfile')
    parser.add_argument('--env', help='If provided, only run if on given environment')
    parser.add_argument('--skip-es', action='store_true', default=False,
                        help='If set, do not run create_mapping after DB drop')
    args = parser.parse_args()

    # get the pyramids app
    app = get_app(args.config_uri, args.app_name)

    # create db schema
    configure_dbsession(app)

    # confirm with user if not providing a specific env
    if not args.env:
        disp_env = app.registry.settings.get('env.name', 'local')
        name = input('This will completely clear DB contents for environment %s.'
                     ' Type the env name to confirm: ' % disp_env)
        if str(name) != disp_env:
            print("Could not confirm env. Exiting...")
            return

    # actually run. split this out for easy testing
    run_clear_db_es(app, args.env, args.skip_es)


if __name__ == '__main__':
    main()
