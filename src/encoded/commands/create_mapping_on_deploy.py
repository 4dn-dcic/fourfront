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
    'QualityMetricWorkflowrun',

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

WEBPROD = 'fourfront-webprod'
WEBPROD_TWO = 'fourfront-webprod2'
MASTERTEST = 'fourfront-mastertest'
HOTSEAT = 'fourfront-hotseat'
WEBDEV = 'fourfront-webdev'


BEANSTALK_PROD = [
    WEBPROD,
    WEBPROD_TWO,
]

BEANSTALK_TEST = [
    MASTERTEST,
    HOTSEAT,
    WEBDEV,
]

FF_DEPLOY_CONFIG_SIZE = 2

class DeploymentConfig(object):
    """
        Basic class wrapping an arbitrary number of configuration options
        The caller must know the structure and how to interpret it
        Values default to None and are set to None when del'd
    """

    def __init__(self, size):
        self.tuple = [None] * size
        self.size = size

    def __getitem__(self, idx):
        if (idx >= self.size):
            raise IndexError('Index out of bounds on DeploymentConfig.get')
        return self.tuple[idx]
    
    def __setitem__(self, idx, val):
        if (idx >= self.size):
            raise IndexError('Index out of bounds on DeploymentConfig.set')
        self.tuple[idx] = val

    def __delitem__(self, idx):
        if (idx >= self.size):
            raise IndexError('Index out of bounds on DeploymentConfig.del')
        self.tuple[idx] = None


def get_deployment_config(app):
    """
        Gets the current data environment from 'whodaman()' and checks
        via environment variable if we are on production.
        Returns a DeploymentConfig object with deployment options based on
        the environment we are on
    """
    deploy_cfg = DeploymentConfig(FF_DEPLOY_CONFIG_SIZE)
    current_data_env = whodaman()
    my_env = app.registry.settings.get('env.name')
    deploy_cfg[0] = my_env
    if (current_data_env == my_env):
        log.info('This looks like our production environment -- SKIPPING ALL')
        exit(1)
    elif my_env in BEANSTALK_PROD:
        log.info('This looks like our staging environment -- do not wipe ES')
        deploy_cfg[1] = False  # do not wipe ES
    elif my_env in BEANSTALK_TEST:
        if my_env == HOTSEAT:
            log.info('Looks like we are on hotseat -- do not wipe ES')
            deploy_cfg[1] = False
        else:
            log.info('Looks like we are on webdev or mastertest -- wipe ES')
            deploy_cfg[1] = True
    return deploy_cfg


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
    set_logging(in_prod=app.registry.settings.get('production'), log_name=__name__, level=logging.DEBUG)
    # set_logging(app.registry.settings.get('elasticsearch.server'), app.registry.settings.get('production'), level=logging.DEBUG)

    # get deployment config, check whether to run create mapping with or without
    # check_first. This is where you could do more things based on deployment options
    try:
        deploy_cfg = get_deployment_config(app)
        if deploy_cfg[1]:  # if we want to wipe ES
            run_create_mapping(app, check_first=False, item_order=ITEM_INDEX_ORDER)
        else:
            run_create_mapping(app, check_first=True, item_order=ITEM_INDEX_ORDER)
    except Exception as e:
        log.error("Exception encountered while gathering deployment information or running create_mapping")
        log.error(str(e))
