'use strict';

/**
 * This lives in own file to allow us to import it in from Cypress tests without any other
 * dependencies needing to be installed.
 *
 * @todo Have abstract types be in /profiles/ also, have autogenerated version of this be there.
 */

export const itemTypeHierarchy = {
    'QualityMetric' : [
        'QualityMetricFastqc', 'QualityMetricBamqc', 'QualityMetricPairsqc',
        'QualityMetricDedupqcRepliseq'
    ],
    'UserContent' : [
        'StaticSection'
    ]
};
