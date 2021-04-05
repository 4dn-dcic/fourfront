import argparse
import structlog
import logging

from pyramid.paster import get_app
from snovault.elasticsearch.create_mapping import run as run_create_mapping
from dcicutils.log_utils import set_logging
from dcicutils.deployment_utils import CreateMappingOnDeployManager


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
    'QualityMetricMcool',

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


def _run_create_mapping(app, args):
    """
    Runs create_mapping with deploy options and report errors. Allows args passed from argparse in main to override
    the default deployment configuration.

    :param app: pyramid application handle
    :param args: args from argparse
    :return: None
    """

    try:

        deploy_cfg = CreateMappingOnDeployManager.get_deploy_config(env=get_my_env(app), args=args, log=log,
                                                                    client='create_mapping_on_deploy')

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
