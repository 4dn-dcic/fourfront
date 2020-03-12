import argparse
import structlog
import logging

from pyramid.paster import get_app
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from dcicutils.log_utils import set_logging
from dcicutils.beanstalk_utils import whodaman

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

ENV_STAGING = 'fourfront-staging'
ENV_WEBPROD = 'fourfront-webprod'
ENV_WEBPROD2 = 'fourfront-webprod2'
ENV_MASTERTEST = 'fourfront-mastertest'
ENV_HOTSEAT = 'fourfront-hotseat'
ENV_WEBDEV = 'fourfront-webdev'


BEANSTALK_PROD_ENVS = [
    ENV_WEBPROD,
    ENV_WEBPROD2,
]

BEANSTALK_TEST_ENVS = [
    ENV_MASTERTEST,
    ENV_HOTSEAT,
    ENV_WEBDEV,
]


def get_my_env(app):
    """
    Gets the env name of the currently running environments
    """
    return app.registry.settings.get('env.name')


def get_deployment_config(app):
    """
        Gets the current data environment from 'whodaman()' and checks
        via environment variable if we are on production.
        Returns a dictionary with deployment options based on
        the environment we are on with keys: 'ENV_NAME' and 'WIPE_ES'
    """
    deploy_cfg = {}
    current_data_env = whodaman()
    my_env = get_my_env(app)
    deploy_cfg['ENV_NAME'] = my_env
    if current_data_env == my_env:
        log.info('This looks like our production environment -- do not wipe ES')
        deploy_cfg['WIPE_ES'] = False
    elif my_env in BEANSTALK_PROD_ENVS:
        log.info('This looks like our staging environment -- do not wipe ES')
        deploy_cfg['WIPE_ES'] = False  # do not wipe ES
    elif my_env in BEANSTALK_TEST_ENVS:
        if my_env == ENV_HOTSEAT:
            log.info('Looks like we are on hotseat -- do not wipe ES')
            deploy_cfg['WIPE_ES'] = False
        else:
            log.info('Looks like we are on webdev or mastertest -- wipe ES')
            deploy_cfg['WIPE_ES'] = True
    else:
        log.warning('Looks like we are on an unrecognized env: %s' % my_env)
        log.warning('Defaulting to not wipe ES')
        deploy_cfg['WIPE_ES'] = False
    return deploy_cfg


def _run_create_mapping(app, args):
    """
    Runs create_mapping with deploy options and report errors. Allows args passed from argparse in main to override
    the default deployment configuration

    :param app: pyramid application handle
    :param args: args from argparse
    :return: None
    """
    try:
        deploy_cfg = get_deployment_config(app)
        log.info('Running create mapping on env: %s' % deploy_cfg['ENV_NAME'])
        run_create_mapping(app, check_first=(not args.wipe_es), purge_queue=args.clear_queue, item_order=ITEM_INDEX_ORDER)
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
    parser.add_argument('--clear-queue', help="Specify to clear the SQS queue", action='store_true', default=False)

    args = parser.parse_args()
    app = get_app(args.config_uri, args.app_name)
    # Loading app will have configured from config file. Reconfigure here:
    set_logging(in_prod=app.registry.settings.get('production'), log_name=__name__, level=logging.DEBUG)
    # set_logging(app.registry.settings.get('elasticsearch.server'), app.registry.settings.get('production'), level=logging.DEBUG)

    _run_create_mapping(app, args)
    exit(0)


if __name__ == '__main__':
    main()
