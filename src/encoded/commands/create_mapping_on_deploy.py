import argparse
import structlog
import loggin

from pyramid.paster import get_app
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from dcicutils.beanstalk_utils import whodaman

log = structlog.getLogger(__name__)
EPILOG = __doc__


def main():
    parser = argparse.ArgumentParser(
        description="Create Elasticsearch mapping on deployment", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--app-name', help="Pyramid app name in configfile")

    args = parser.parse_args()
    app = get_app(args.config_uri, args.app_name)
    # Loading app will have configured from config file. Reconfigure here:
    set_logging(app.registry.settings.get('production'), level=logging.DEBUG)

    # check if staging
    try:
        data_env = whodaman()
        env = app.registry.settings.get('env.name')
        if 'webprod' in env:
            if data_env != env:
                log.info("looks like we are on staging, run create mapping without check first")
                run_create_mapping(app, check_first=False)
                return
        # handle mastertest ... by blowing away all data first
        if 'mastertest' in env:
            run_create_mapping(app, check_first=False, purge_queue=True)
            return
    except Exception:
        import traceback
        log.warning("error checking whodaman: %s " % traceback.format_exc())
        log.warning("couldn't get wodaman, so assuming NOT Stagging")

    log.info("looks like we are NOT on staging so run create mapping with check first")
    run_create_mapping(app, check_first=True, purge_queue=True, skip_indexing=True)
