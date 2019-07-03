'use strict';

import _ from 'underscore';

/** _MAY_ move to common repo portal */
export function getDateHistogramIntervalFromFacet(facet){
    return (facet && facet.aggregation_definition
        && facet.aggregation_definition.date_histogram
        && facet.aggregation_definition.date_histogram.interval
    );
}



/** @deprecated */ /** _MAY_ move to common repo portal */
export function isTermSelectedAccordingToExpSetFilters(term, field, expSetFilters = null){
    if (!expSetFilters) expSetFilters = currentExpSetFilters(); // If no expSetFilters are supplied, get them from Redux store.
    if (typeof expSetFilters[field] !== 'undefined' && typeof expSetFilters[field].has === 'function' && expSetFilters[field].has(term)) return true;
    return false;
}


export function transformExpSetFiltersToExpFilters(expSetFilters){
    var expSetKeys = _.keys(expSetFilters);
    var expFilters = {};
    var i = 0;
    for (i = 0; i < expSetKeys.length; i++){
        if (expSetKeys[i].slice(0,19) === 'experiments_in_set.'){
            expFilters[expSetKeys[i].slice(19)] = expSetFilters[expSetKeys[i]];
        } else {
            expFilters['experiment_sets.' + expSetKeys[i]] = expSetFilters[expSetKeys[i]];
        }
    }
    return expFilters;
}

export function transformExpSetFiltersToFileFilters(expSetFilters){
    var expSetKeys = _.keys(expSetFilters);
    var expFilters = {};
    var i = 0;
    for (i = 0; i < expSetKeys.length; i++){
        if (expSetKeys[i].slice(0,19) === 'experiments_in_set.'){
            expFilters['experiments.' + expSetKeys[i].slice(19)] = expSetFilters[expSetKeys[i]];
        } else {
            expFilters['experiments.experiment_sets.' + expSetKeys[i]] = expSetFilters[expSetKeys[i]];
        }
    }
    return expFilters;
}


/**
 * Hardcoded URL query params which are _definitely_ not filters.
 * Taken from search.py
 */
export const NON_FILTER_URL_PARAMS = [
    'limit', 'y.limit', 'x.limit', 'mode',
    'format', 'frame', 'datastore', 'field', 'region', 'genome',
    'sort', 'from', 'referrer', 'q', 'before', 'after'
];