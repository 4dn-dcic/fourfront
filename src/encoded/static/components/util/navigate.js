'use strict';

import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';

import { memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/misc';
import { navigate as originalNavigate } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/navigate';
import { expSetFiltersToURLQuery, contextFiltersToExpSetFilters } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/search-filters';

let store = null;

const navigate = function(...args){ return originalNavigate(...args); };

// Carry over any util fxns. Then add more. Per portal.
_.extend(navigate, originalNavigate);

navigate.setNavigateFunction = function(...args){
    // eslint-disable-next-line prefer-destructuring
    store = require('../../store').store;
    originalNavigate.setNavigateFunction(...args);
};


/******* PUBLIC STATIC FUNCTIONS *******/

// TODO: Remove 4dn-specific ones

/**
 * Get the browse parameters for our given `browseBaseState`.
 * If `browseBaseState` param is not provided, it is retrieved from the Redux store.
 *
 * @param {string} [browseBaseState=null] The browse base state. By default is set to "only_4dn" on app init.
 * @returns {Object} JSON form of URI query params for given or current browseBaseState.
 */
navigate.getBrowseBaseParams = function(browseBaseState = null){
    if (browseBaseState === 'item_search') {
        return {};
    }
    if (!browseBaseState){
        if (store === null){
            // eslint-disable-next-line prefer-destructuring
            store = require('../../store').store;
        }
        var storeState = store.getState();
        browseBaseState = storeState.browseBaseState;
    }
    return _.clone(navigate.getBrowseBaseParams.mappings[browseBaseState].parameters);
};


navigate.getBrowseBaseParams.mappings = {
    'all' : {
        'parameters' : { 'type' : ['ExperimentSetReplicate'], 'experimentset_type' : ['replicate'] },
    },
    'only_4dn' : {
        'parameters' : { 'type' : ['ExperimentSetReplicate'], 'experimentset_type' : ['replicate'], 'award.project' : ['4DN'] },
    }
};


navigate.getBrowseBaseHref = function(browseBaseParams = null){
    if (!browseBaseParams) browseBaseParams = navigate.getBrowseBaseParams();
    else if (typeof browseBaseParams === 'string') browseBaseParams = navigate.getBrowseBaseParams(browseBaseParams);
    return '/browse/?' + queryString.stringify(browseBaseParams);
};


navigate.isValidBrowseQuery = function(hrefQuery, browseBaseParams = null){

    if (!browseBaseParams || typeof browseBaseParams !== 'object') browseBaseParams = navigate.getBrowseBaseParams(typeof browseBaseParams === 'string' ? browseBaseParams : null);
    if (typeof hrefQuery === 'string'){
        hrefQuery = url.parse(hrefQuery, true).query;
    }

    return _.every(_.pairs(browseBaseParams), function([field, listOfTerms]){
        if (typeof hrefQuery[field] === 'undefined') return false;
        if (Array.isArray(listOfTerms) && listOfTerms.length === 1) listOfTerms = listOfTerms[0];
        if (Array.isArray(hrefQuery[field])){
            if (Array.isArray(listOfTerms)){
                return _.every(listOfTerms, function(arrItem){
                    return hrefQuery[field].indexOf(arrItem) > -1;
                });
            } else {
                return hrefQuery[field].indexOf(listOfTerms) > -1;
            }
        } else if (Array.isArray(listOfTerms)){
            return false;
        } else {
            return hrefQuery[field] === listOfTerms;
        }
    });
};

navigate.isBaseBrowseQuery = function(hrefQuery, browseBaseState = null){
    var baseParams = navigate.getBrowseBaseParams(browseBaseState),
        field_diff1 = _.difference(_.keys(hrefQuery), _.keys(baseParams)),
        field_diff2 = _.difference(_.keys(baseParams), _.keys(hrefQuery)),
        failed = false;

    if (field_diff1.length > 0 || field_diff2.length > 0){
        return false;
    }

    _.forEach(_.pairs(hrefQuery), function([field, term]){
        if (failed) return;
        var baseParamTermList = baseParams[field];
        if (!Array.isArray(term)) term = [term];

        var term_diff1 = _.difference(term, baseParamTermList),
            term_diff2 = _.difference(baseParamTermList, term);

        if (term_diff1.length > 0 || term_diff2.length > 0){
            failed = true;
            return;
        }
    });

    if (failed) {
        return false;
    } else {
        return true;
    }
};


navigate.setBrowseBaseStateAndRefresh = function(
    newBrowseBaseState = 'all',
    currentHref = null,
    context = null,
    navOptions = null,
    callback = null
){

    if (!currentHref || !context){
        const storeState = store.getState();
        currentHref = storeState.href;
        context = storeState.context;
    }

    if (navOptions === null || navOptions === undefined){
        navOptions = { 'inPlace' : true, 'dontScrollToTop' : true, 'replace' : true };
    }

    if (navigate.isBrowseHref(currentHref)){
        const currBrowseBaseParams = navigate.getBrowseBaseParams();
        const currentExpSetFilters = contextFiltersToExpSetFilters((context && context.filters || null), currBrowseBaseParams);
        let nextBrowseHref = navigate.getBrowseBaseHref(newBrowseBaseState);

        if (_.keys(currentExpSetFilters).length > 0){
            nextBrowseHref += navigate.determineSeparatorChar(nextBrowseHref) + expSetFiltersToURLQuery(currentExpSetFilters);
        }
        const hrefParts = memoizedUrlParse(currentHref);
        if (hrefParts.query.q) {
            nextBrowseHref += navigate.determineSeparatorChar(nextBrowseHref) + 'q=' + encodeURIComponent(hrefParts.query.q);
        }
        // Refresh page THEN change update browse state b/c ChartDataController grabs 'expSetFilters' (to grab filtered aggregations) from context.filters so we want that in place before updating charts.
        navigate(nextBrowseHref, navOptions, callback, null, {
            'browseBaseState' : newBrowseBaseState
        });
    } else {
        // Change Redux store state but don't refresh page.
        store.dispatch({
            'type' : {
                'browseBaseState' : newBrowseBaseState
            }
        });
        if (typeof callback === 'function') callback();
    }
};

/** Utility function to check if we are on a browse page. */
navigate.isBrowseHref = function(href){
    if (typeof href === 'string') href = url.parse(href);
    if (href.pathname.slice(0,8) === '/browse/') return true;
    return false;
};

export { navigate };
