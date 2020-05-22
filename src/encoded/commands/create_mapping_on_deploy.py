import argparse
import structlog
import logging

from pyramid.paster import get_app
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from dcicutils.log_utils import set_logging
from dcicutils.beanstalk_utils import whodaman
from dcicutils.env_utils import is_test_env, is_hotseat_env, guess_mirror_env, is_stg_or_prd_env

log = structlog.getLogger(__name__)
EPILOG = __doc__

# This order determines order that items will be mapped + added to the queue
# Can use item type (e.g. file_fastq) or class name (e.g. FileFastq)
ITEM_INDEX_ORDER = [
    'Award',
    'Lab',
    'AccessKey',
    'User',

    'Ontology',
    'OntologyTerm',

    'StaticSection',
    'Document',
    'Protocol',

    'FileFormat',
    'ExperimentType',

    'Vendor',
    'Organism',

    'Gene',
    'GenomicRegion',
    'BioFeature',
    'Target',

    'Construct',
    'Enzyme',
    'Antibody',

    'FileReference',

    'IndividualChicken',
    'IndividualFly',
    'IndividualHuman',
    'IndividualMouse',
    'IndividualPrimate',
    'IndividualZebrafish',

    'Image',
    'Modification',

    'Biosource',
    'BiosampleCellCulture',
    'Biosample',

    'Workflow',
    'WorkflowMapping',

    'PublicationTracking',
    'Software',
    'AnalysisStep',
    'Badge',
    'SopMap',
    'SummaryStatistic',
    'SummaryStatisticHiC',
    'TrackingItem',

    'TreatmentAgent',
    'TreatmentRnai',

    'ImagingPath',
    'MicroscopeSettingA1',
    'MicroscopeSettingA2',
    'MicroscopeSettingD1',
    'MicroscopeSettingD2',
    'MicroscopeConfiguration',

    'HiglassViewConfig',
    'QualityMetricAtacseq',
    'QualityMetricBamqc',
    'QualityMetricBamcheck',
    'QualityMetricChipseq',
    'QualityMetricDedupqcRepliseq',
    'QualityMetricFastqc',
    'QualityMetricFlag',
    'QualityMetricPairsqc',
    'QualityMetricMargi',
    'QualityMetricRnaseq',
    'QualityMetricRnaseqMadqc',
    'QualityMetricWorkflowrun',
    'QualityMetricQclist',

    'ExperimentAtacseq',
    'ExperimentCaptureC',
    'ExperimentChiapet',
    'ExperimentDamid',
    'ExperimentHiC',
    'ExperimentMic',
    'ExperimentRepliseq',
    'ExperimentSeq',
    'ExperimentTsaseq',
    'ExperimentSet',
    'ExperimentSetReplicate',

    'Publication',

    'FileCalibration',
    'FileFastq',
    'FileMicroscopy',
    'FileProcessed',
    'FileSet',
    'FileSetCalibration',
    'FileSetMicroscopeQc',
    'FileVistrack',

    'DataReleaseUpdate',

    'WorkflowRun',
    'WorkflowRunAwsem',
    'WorkflowRunSbg',

    'Page',
]


def get_my_env(app):
    """
    Gets the env name of the currently running environment

    :param app: handle to Pyramid app
    :return: current env
    """
    # Return value is presumably one of the above-declared environments
    return app.registry.settings.get('env.name')


def get_deployment_config(app):
    """
    Gets deployment configuration for the current environment.

    Sets ENV_NAME, WIPE_ES, SKIP and STRICT as side-effects.
        ENV_NAME: env we are deploying to
        WIPE_ES: whether or not to completely wipe ES, otherwise only re-index different mappings
        SKIP: whether or not to skip the create_mapping step entirely
        STRICT: whether or not to "strictly" reindex things (no invalidation)

    :param app: handle to Pyramid app
    :return: dict of config options
    """
    deploy_cfg = {}
    current_prod_env = whodaman()  # current_prod_end = <current-data-env>
    my_env = get_my_env(app)
    deploy_cfg['ENV_NAME'] = my_env
    deploy_cfg['SKIP'] = False  # set to True to skip the create_mapping step
    deploy_cfg['STRICT'] = False
    deploy_cfg['WIPE_ES'] = False
    if my_env == guess_mirror_env(current_prod_env):
        log.info('This looks like our staging environment -- wipe ES')
        deploy_cfg['WIPE_ES'] = True
        deploy_cfg['STRICT'] = True
    elif is_stg_or_prd_env(my_env):
        log.info('This looks like an uncorrelated production environment. Something is definitely wrong.')
        raise RuntimeError('Tried to run CMOD on production - error\'ing deployment')  # note that this will cause any deployments to production to fail!
    elif is_test_env(my_env):
        if is_hotseat_env(my_env):
            log.info('Looks like we are on hotseat -- do nothing to ES')
            deploy_cfg['SKIP'] = True
            deploy_cfg['STRICT'] = True
        else:
            log.info('Looks like we are on webdev or mastertest -- wipe ES')
            deploy_cfg['WIPE_ES'] = True
    else:
        log.warning('This environment is not recognized: %s' % my_env)
        log.warning('Proceeding without wiping ES')
    return deploy_cfg


def override_deploy_cfg(deploy_cfg, b, key):
    """ Overrides the given deployment_config's "key" option if 'b' is True.

    :param deploy_cfg: deployment configuration, from function above
    :param b: Boolean if True, will set deploy_cfg[key] to True, otherwise will leave
    :param key: key to set
    """
    if not isinstance(b, bool):
        raise RuntimeError('Passed non-boolean object %s for "b", aborting.' % b)
    if b:
        log.info('Overriding deploy_cfg: %s with True' % key)
        deploy_cfg[key] = b


def _run_create_mapping(app, args):
    """
    Runs create_mapping with deploy options and report errors. Allows args passed from argparse in main to override
    the default deployment configuration.

    XXX: Should be refactored into CMDeployer in dcicutils.deployment_utils.py - Will 5/22/2020

    :param app: pyramid application handle
    :param args: args from argparse
    :return: None
    """
    try:
        deploy_cfg = get_deployment_config(app)
        log.info('Running create mapping on env: %s' % deploy_cfg['ENV_NAME'])
        override_deploy_cfg(deploy_cfg, args.wipe_es, 'WIPE_ES')
        override_deploy_cfg(deploy_cfg, args.skip, 'SKIP')
        override_deploy_cfg(deploy_cfg, args.strict, 'STRICT')
        if not deploy_cfg['SKIP']:
            run_create_mapping(app,
                               check_first=(not deploy_cfg['WIPE_ES']),
                               purge_queue=args.clear_queue,  # this option does not vary, so no need to override
                               item_order=ITEM_INDEX_ORDER,
                               strict=deploy_cfg['STRICT'])
    except Exception as e:
        log.error("Exception encountered while gathering deployment information or running create_mapping")
        log.error(str(e))
        exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Create Elasticsearch mapping on deployment", epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('config_uri', help="path to configfile")
    parser.add_argument('--app-name', help="Pyramid app name in configfile")
    parser.add_argument('--wipe-es', help="Specify to wipe ES", action='store_true', default=False)
    parser.add_argument('--skip', help='Specify to skip this step altogether', default=False)
    parser.add_argument('--clear-queue', help="Specify to clear the SQS queue", action='store_true', default=False)
    parser.add_argument('--strict', help='Specify to do a strict reindex', default=False)

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
