import argparse
import logging
import structlog
import transaction

from dcicutils.env_utils import is_stg_or_prd_env
from dcicutils.lang_utils import disjoined_list
from pyramid.paster import get_app
from snovault import DBSESSION
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from sqlalchemy import MetaData
from typing import Optional, List
from zope.sqlalchemy import mark_changed
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
    success = False
    session = app.registry[DBSESSION]
    meta = MetaData(bind=session.connection())
    meta.reflect()
    connection = session.connection().connect()
    try:
        # truncate tables by only deleting contents
        for table in meta.sorted_tables:
            connection.execute(table.delete())
    except Exception as e:
        log.error(f"clear_db_es_contents: Error on DB drop_all/create_all. {type(e)}: {e}")
        transaction.abort()
    else:
        # commit all changes to DB
        session.flush()
        mark_changed(session())
        transaction.commit()
        success = True
    return success


SKIPPING_CLEAR_ATTEMPT = 'Skipping the attempt to clear DB.'


def run_clear_db_es(app, only_envs: Optional[List[str]] = None, skip_es: bool = False) -> bool:
    """
    This function actually clears DB/ES. Takes a Pyramid app as well as two flags. _Use with care!_

    For safety, this function will return without side-effect if ...
    - The current environment is any production system.
    - The current environment is not a member of the `only_envs` argument (list).

    If `arg_skip_es` (default False) is True, this function will return after DB clear
    and before running create_mapping.

    Args:
        app: Pyramid application
        only_envs (list): a list of env names that are the only envs where this action will run
        skip_es (bool): if True, do not run create_mapping after DB clear

    Returns:
        bool: True if DB was cleared (regardless of ES)
    """
    current_env = app.registry.settings.get('env.name', 'local')

    if is_stg_or_prd_env(current_env):
        log.error(f"clear_db_es_contents: This action cannot be performed on env {current_env}"
                  f" because it is a production-class (stg or prd) environment."
                  f" {SKIPPING_CLEAR_ATTEMPT}")
        return False

    if only_envs and current_env not in only_envs:
        log.error(f"clear_db_es_contents: The current environment, {current_env}, is not {disjoined_list(only_envs)}."
                  f" {SKIPPING_CLEAR_ATTEMPT}")
        return False

    log.info('clear_db_es_contents: Clearing DB tables...')
    db_success = clear_db_tables(app)
    if not db_success:
        log.error("clear_db_es_contents: Clearing DB tables failed!"
                  " Such failures may happen, for example, when there are external DB connections."
                  " You might want to try running clear_db_es_contents again.")
        return False
    log.info("clear_db_es_contents: Successfully cleared DB.")

    # create mapping after clear DB to remove ES contents
    if not skip_es:
        log.info("clear_db_es_contents: Clearing ES with create_mapping...")
        run_create_mapping(app, purge_queue=True)
        log.info("clear_db_es_contents: Successfully cleared ES.")

    log.info("clear_db_es_contents: All done.")
    return True


def main(simulated_args=None):
    logging.basicConfig()
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)

    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description='Clear DB and ES Contents', epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help='path to configfile')
    parser.add_argument('--app-name', help='Pyramid app name in configfile')
    parser.add_argument('--only-if-env', '--only-if-envs', dest='only_envs', default=None,
                        help=("A comma-separated list of envs where this action is allowed to run."
                              " If omitted, any env is OK to run."))
    parser.add_argument("--confirm", action="store_true", dest="confirm", default=None,
                        help="Specify --confirm to require interactive confirmation.")
    parser.add_argument("--no-confirm", action="store_false", dest="confirm", default=None,
                        help="Specify --no-confirm to suppress interactive confirmation.")
    parser.add_argument('--skip-es', action='store_true', default=False,
                        help='If set, do not run create_mapping after DB drop')
    args = parser.parse_args(simulated_args)

    confirm = args.confirm
    app_name = args.app_name
    config_uri = args.config_uri
    only_envs = args.only_envs
    skip_es = args.skip_es

    if confirm is None:
        confirm = not only_envs  # If only_envs is supplied, we have better protection so don't need to confirm

    # get the pyramids app
    app = get_app(config_uri, app_name)

    # create db schema
    configure_dbsession(app)

    only_envs = [x for x in (only_envs or "").split(',') if x]

    if confirm:
        env_to_confirm = app.registry.settings.get('env.name', 'local')
        env_confirmation = input(f'This will completely clear DB contents for environment {env_to_confirm}.\n'
                                 f' Type the env name to confirm: ')
        if env_confirmation != env_to_confirm:
            print(f"NOT confirmed. {SKIPPING_CLEAR_ATTEMPT}")
            return

    # actually run. split this out for easy testing
    run_clear_db_es(app=app, only_envs=only_envs, skip_es=skip_es)


if __name__ == '__main__':
    main()
