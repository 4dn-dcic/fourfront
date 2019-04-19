'use strict';

/**
 * This lives in own file to allow us to import it in from Cypress tests without any other
 * dependencies needing to be installed.
 */

export const itemTypeHierarchy = {
    'Experiment': [
        'ExperimentAtacseq', 'ExperimentCaptureC', 'ExperimentChiapet', 'ExperimentDamid', 'ExperimentHiC',
        'ExperimentMic', 'ExperimentRepliseq', 'ExperimentSeq', 'ExperimentTsaseq'
    ],
    'ExperimentSet': [
        'ExperimentSetReplicate'
    ],
    'File': [
        'FileCalibration', 'FileFastq', 'FileProcessed', 'FileReference', 'FileMicroscopy', 'FileVistrack'
    ],
    'FileSet': [
        'FileSet', 'FileSetCalibration', 'FileSetMicroscopeQc'
    ],
    'Individual': [
        'IndividualHuman', 'IndividualPrimate', 'IndividualMouse', 'IndividualFly', 'IndividualChicken'
    ],
    'Treatment': [
        'TreatmentAgent', 'TreatmentRnai'
    ],
    'QualityMetric' : [
        'QualityMetricFastqc', 'QualityMetricBamqc', 'QualityMetricPairsqc',
        'QualityMetricDedupqcRepliseq'
    ],
    'WorkflowRun' : [
        'WorkflowRun', 'WorkflowRunSbg', 'WorkflowRunAwsem'
    ],
    'MicroscopeSetting' : [
        'MicroscopeSettingA1', 'MicroscopeSettingA2', 'MicroscopeSettingD1', 'MicroscopeSettingD2'
    ],
    'UserContent' : [
        'StaticSection', 'HiglassViewConfig' //, 'JupyterNotebook'
    ]
};
