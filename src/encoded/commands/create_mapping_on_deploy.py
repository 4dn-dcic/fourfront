import argparse
import logging

from pyramid.paster import get_app
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from dcicutils.beanstalk_utils import whodaman

logger = logging.getLogger(__name__)
EPILOG = __doc__


def main():
    parser = argparse.ArgumentParser(
        description="Create Elasticsearch mapping on deployment", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--app-name', help="Pyramid app name in configfile")

    logging.basicConfig()

    args = parser.parse_args()
    app = get_app(args.config_uri, args.app_name)
    # Loading app will have configured from config file. Reconfigure here:
    logging.getLogger('encoded').setLevel(logging.DEBUG)

    # check if staging
    try:
        data_env = whodaman()
        env = app.registry.settings.get('env.name')
        if 'webprod' in env:
            if data_env != env:
                logger.info("looks like we are on staging, run create mapping without check first")
                run_create_mapping(app, check_first=False)
                return
        # handle mastertest ... by blowing away all data first
        if 'mastertest' in env:
            logger.info("looks like we are on mastertest, run create mapping without check first")
            run_create_mapping(app, check_first=False, purge_queue=True)
            return
        logger.info("looks like we are NOT on staging or mastertest so run create mapping with check first")
    except Exception:
        import traceback
        logger.warning("error checking whodaman: %s " % traceback.format_exc())
        logger.warning("couldn't get wodaman, so assuming NOT staging")
    logger.info("... using default create mapping case")
    run_create_mapping(app, check_first=True, purge_queue=True)
