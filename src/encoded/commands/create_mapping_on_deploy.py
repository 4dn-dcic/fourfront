import argparse
import structlog
import logging

from dcicutils.deployment_utils import CreateMappingOnDeployManager
from dcicutils.env_utils import is_beanstalk_env, is_stg_or_prd_env
from dcicutils.log_utils import set_logging
from pyramid.paster import get_app
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from ..appdefs import ITEM_INDEX_ORDER


log = structlog.getLogger(__name__)
EPILOG = __doc__

def get_my_env(app):
    """
    Gets the env name of the currently running environment

    :param app: handle to Pyramid app
    :return: current env
    """
    # Return value is presumably one of the above-declared environments
    return app.registry.settings.get('env.name')


def _run_create_mapping(app, args):
    """
    Runs create_mapping with deploy options and report errors. Allows args passed from argparse in main to override
    the default deployment configuration.

    :param app: pyramid application handle
    :param args: args from argparse
    :return: None
    """

    try:
        my_env = get_my_env(app)
        deploy_cfg = {'SKIP': True}  # default
        if is_beanstalk_env(my_env):
            deploy_cfg = CreateMappingOnDeployManager.get_deploy_config(env=my_env, args=args, log=log,
                                                                        client='create_mapping_on_deploy')
        elif is_stg_or_prd_env(my_env):
            deploy_cfg['SKIP'] = False
            deploy_cfg['WIPE_ES'] = True
            deploy_cfg['STRICT'] = True
            deploy_cfg['ENV_NAME'] = my_env

        if not deploy_cfg['SKIP']:
            log.info('Calling run_create_mapping for env %s.' % deploy_cfg['ENV_NAME'])
            run_create_mapping(app=app,
                               check_first=(not deploy_cfg['WIPE_ES']),
                               purge_queue=args.clear_queue,  # this option does not vary, so no need to override
                               item_order=ITEM_INDEX_ORDER,
                               strict=deploy_cfg['STRICT'])
        else:
            log.info('NOT calling run_create_mapping for env %s.' % deploy_cfg['ENV_NAME'])

        exit(0)

    except Exception as e:
        log.error("Exception encountered while gathering deployment information or running create_mapping")
        log.error("%s: %s" % (e.__class__.__name__, e))
        exit(1)


def main():
    parser = argparse.ArgumentParser(  # noqa - PyCharm wrongly thinks the formatter_class is specified wrong here.
        description="Create Elasticsearch mapping on deployment", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('--clear-queue', help="Specify to clear the SQS queue", action='store_true', default=False)
    CreateMappingOnDeployManager.add_argparse_arguments(parser)

    args = parser.parse_args()
    app = get_app(args.config_uri, args.app_name)
    # Loading app will have configured from config file. Reconfigure here:
    set_logging(in_prod=app.registry.settings.get('production'), log_name=__name__, level=logging.DEBUG)
    # set_logging(app.registry.settings.get('elasticsearch.server'),
    #             app.registry.settings.get('production'),
    #             level=logging.DEBUG)

    _run_create_mapping(app, args)
    exit(0)


if __name__ == '__main__':
    main()
