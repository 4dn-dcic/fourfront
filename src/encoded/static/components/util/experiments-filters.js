'use strict';

var Alerts = null; //require('./../alerts');
var store = null;

import _ from 'underscore';
import url from 'url';
import queryString from 'query-string';
import * as ajax from './ajax';
import * as object from './object';
import * as Schemas from './Schemas';
import { navigate } from './navigate';


export let getSchemas = null;
export let getPage =  function(){ return 1;  };
export let getLimit = function(){ return 25; };



/**
 * Get current expSetFilters from store. Utility method to use from other components if don't want to pass expSetFilters down as prop.
 * Keep in mind to only use from functions or callbacks, because if it is not a prop, will not update components visually when changed.
 *
 * @public
 * @static
 */
export const currentExpSetFilters = contextFiltersToExpSetFilters;

/** If the given term is selected, return the href for the term */
export function getUnselectHrefIfSelectedFromResponseFilters(term, field, filters) {
    for (var filter in filters) {
        if (filters[filter]['field'] == field && filters[filter]['term'] == term) {
            return url.parse(filters[filter]['remove']).search;
        }
    }
    return null;
}

/**
 * @param {string} unselectHref - Returned from unselectHrefIfSelected, if used.
 * @param {string} field - What field to build for.
 * @param {string} term - What term to build for.
 * @param {string} searchBase - Original href or search base of current page.
 */
export function buildSearchHref(unselectHref, field, term, searchBase){
    var href;
    if (unselectHref) {
        href = unselectHref;
    } else {
        var parts = url.parse(searchBase, true);
        var query = _.clone(parts.query);
        // format multiple filters on the same field
        if(field in query){
            if(Array.isArray(query[field])){
                query[field] = query[field].concat(term);
            }else{
                query[field] = [query[field]].concat(term);
            }
        }else{
            query[field] = term;
        }
        query = queryString.stringify(query);
        parts.search = query && query.length > 0 ? ('?' + query) : '';
        href = url.format(parts);
    }
    return href;
}


/**
 * Given a field/term, add or remove filter from expSetFilters (in redux store) within context of current state of filters.
 *
 * @param {string}  field               Field, in object dot notation.
 * @param {string}  term                Term to add/remove from active filters.
 * @param {string}  [experimentsOrSets='experiments'] - Informs whether we're standardizing field to experiments_in_set or not. Defaults to 'experiments'.
 * @param {Object}  [expSetFilters]     The expSetFilters object that term is being added or removed from; if not provided it grabs state from redux store.
 * @param {function}[callback]          Callback function to call after updating redux store.
 * @param {boolean} [returnInsteadOfSave=false]  - Whether to return a new updated expSetFilters object representing would-be changed state INSTEAD of updating redux store. Useful for doing a batched update.
 * @param {string}  [href]              Current or base href to use for AJAX request if using AJAX to update.
 */
export function changeFilter(
    field,
    term,
    expSetFilters = null,
    callback = null,
    returnInsteadOfSave = false,
    href = null
){
    // If no expSetFilters are supplied, grab current ones from Redux store.
    if (!expSetFilters) expSetFilters = currentExpSetFilters();

    // store currently selected filters as a dict of sets
    var tempObj = {};
    var newObj = {};

    var expSet = expSetFilters[field] ? new Set(expSetFilters[field]) : new Set();
    if (expSet.has(term)) {
        // term is already present, so delete it
        expSet.delete(term);
    } else {
        expSet.add(term);
    }
    if(expSet.size > 0){
        tempObj[field] = expSet;
        newObj = _.extend({}, expSetFilters, tempObj);
    }else{ //remove key if set is empty
        newObj = _.extend({}, expSetFilters);
        delete newObj[field];
    }

    if (returnInsteadOfSave){
        return newObj;
    } else {
        console.info("Saving new filters:", newObj);
        return saveChangedFilters(newObj, href, callback);
    }
}


/**
 * Update expSetFilters by generating new href from supplied expSetFilters and fetching/navigating to copy of current href/URL with updated query.
 * Before calling, make sure expSetFilters is a new or cloned object (not props.expSetFilters) for Redux to recognize that it has changed.
 *
 * @param {Object}  expSetFilters   A new or cloned expSetFilters object to save. Can be empty (to clear all filters).
 * @param {boolean} [useAjax=true]  Whether to use AJAX and update context & href in Redux store as well.
 * @param {string}  [href]          Base URL to use for AJAX request, with protocol (i.e. http(s)), hostname (i.e. domain name), and path, at minimum. Required if using AJAX.
 * @param {function}[callback]      Callback function.
 */
export function saveChangedFilters(newExpSetFilters, href=null, callback = null){
    if (!store)   store = require('./../../store');
    if (!Alerts) Alerts = require('../alerts').default;

    var originalReduxState = store.getState();

    if (!href){
        console.warn("No HREF (3rd param) supplied, using current href from Redux store. This might be wrong depending on where we should be browsing.");
        href = originalReduxState.href;
    }

    if (typeof href !== 'string') throw new Error("No valid href (3rd arg) supplied to saveChangedFilters: " + href);

    var newHref = filtersToHref(newExpSetFilters, href);

    navigate(newHref, { replace : true, skipConfirmCheck: true }, (result)=>{
        if (result && result.total === 0){
            // No results, unset new filters.
            Alerts.queue(Alerts.NoFilterResults); // Present an alert box informing user that their new selection is now being UNSELECTED because it returned no results.
            navigate(originalReduxState.href, { skipRequest : true });
        } else {
            // Success. Remove any no result alerts.
            Alerts.deQueue(Alerts.NoFilterResults);
        }
        if (typeof callback === 'function') setTimeout(callback, 0);
    }, (err) =>{
        // Fallback callback
        if (err && (err.status === 404 || err.total === 0)) Alerts.queue(Alerts.NoFilterResults);
        if (typeof callback === 'function') setTimeout(callback, 0);
    });

}


export function isTermSelectedAccordingToExpSetFilters(term, field, expSetFilters = null){
    if (!expSetFilters) expSetFilters = currentExpSetFilters(); // If no expSetFilters are supplied, get them from Redux store.
    if (typeof expSetFilters[field] !== 'undefined' && typeof expSetFilters[field].has === 'function' && expSetFilters[field].has(term)) return true;
    return false;
}


export function unsetAllTermsForField(field, expSetFilters, save = true, href = null){
    var esf = _.clone(expSetFilters);
    delete esf[field];
    if (save && href) return saveChangedFilters(esf, href);
    else return esf;
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
 * Convert expSetFilters to a URL, given a current URL whose path is used to append arguments
 * to (e.g. http://hostname.com/browse/  or http://hostname.com/search/).
 *
 * @param {Object}  expSetFilters    Filters as stored in Redux, keyed by facet field containing Set of term keys.
 * @param {string}  currentHref      String with at least current host & path which to use as base for resulting URL, e.g. http://localhost:8000/browse/[?type=ExperimentSetReplicate&experimentset_type=...].
 * @param {number}  [page=1]         Current page if using pagification.
 * @param {string}  [hrefPath]       Override the /path/ in URL returned, e.g. to /browse/.
 * @returns {string} URL which can be used to request filtered results from back-end, e.g. http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&from=0&limit=50&field.name=term1&field2.something=term2[...]
 */
export function filtersToHref(expSetFilters, currentHref, sortColumn = null, sortReverse = false, hrefPath = null){
    var baseHref = getBaseHref(currentHref, hrefPath);

    // Include a '?' or '&' if needed.
    var sep = ['?','&'].indexOf(baseHref.charAt(baseHref.length - 1)) > -1 ? // Is last character a '&' or '?' ?
        '' : (
            baseHref.match(/\?./) ?
            '&' : '?'
        );

    var filterQuery = expSetFiltersToURLQuery(expSetFilters);

    var urlString = (
        baseHref +
        (filterQuery.length > 0 ? sep + filterQuery : '')
    );

    if (!sortColumn){
        var parts = url.parse(currentHref, true);
        if (parts.query && typeof parts.query.sort === 'string'){
            if (parts.query.sort.charAt(0) === '-'){
                sortReverse = true;
                sortColumn = parts.query.sort.slice(1);
            } else {
                sortColumn = parts.query.sort;
            }
        }
    }

    if (typeof sortColumn === 'string'){
        if (sortReverse){
            urlString += ('&sort=-' + sortColumn);
        } else {
            urlString += ('&sort=' + sortColumn);
        }
    }

    return urlString;
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


/**
 * Convert back-end-supplied 'context.filters' array of filter objects into commonly-used 'expSetFilters' structure.
 * Replaces now-removed 'hrefToFilters' function and copy of expSetFilters passed down from Redux store.
 * 
 * @param {{ term : string, field : string, remove : string }[]} contextFilters     Array of filters supplied from back-end search.py.
 * @returns {Object} Object with fields (string, dot-separated-nested) as keys and Sets of terms (string) as values for those keys.
 */
export function contextFiltersToExpSetFilters(contextFilters = null){
    if (!contextFilters){ // Grab context.filters from Redux store if not supplied.
        if (!store) store = require('./../../store');
        var storeState = store.getState();
        contextFilters = (storeState && storeState.context && storeState.context.filters) || null;
    }
    if (!Array.isArray(contextFilters)){
        console.warn('No context filters available or supplied. Fine if this message appears outside of a /search/ or /browse/ page.');
        return {};
    }
    if (contextFilters.length === 0) return {};

    var browseBaseParams = navigate.getBrowseBaseParams();

    return _.reduce(contextFilters, function(memo, filterObj){
        if (typeof browseBaseParams[filterObj.field] !== 'undefined') return memo; // continue/skip.
        if (typeof memo[filterObj.field] === 'undefined'){
            memo[filterObj.field] = new Set([filterObj.term]);
        } else {
            memo[filterObj.field].add(filterObj.term);
        }
        return memo;
    }, {});
}


/** Convert expSetFilters, e.g. as stored in Redux, into a partial URL query: field.name=term1&field2.something=term2[&field3...] */
export function expSetFiltersToURLQuery(expSetFilters){
    return _.pairs(expSetFilters).map(function(filterPair){
        var field = filterPair[0];
        var terms = [...filterPair[1]]; // Set to Array
        return terms.map(function(t){
            return field + '=' + encodeURIComponent(t);
        }).join('&');
    }).join('&');
}

/**
 * Compare two versions of 'expSetFilters' structure to check if they are equal.
 * Used by ChartDataController.
 * 
 * @param {Object} expSetFiltersA - 1st set of filters, object with facet/field as keys and Sets of terms as values.
 * @param {Object} expSetFiltersB - 2nd set of filters, same as param expSetFiltersA.
 * @returns {boolean} true if equal.
 */
export function compareExpSetFilters(expSetFiltersA, expSetFiltersB){
    if ((expSetFiltersA && !expSetFiltersB) || (!expSetFiltersA && expSetFiltersB)) return false;
    var keysA = _.keys(expSetFiltersA);
    if (keysA.length !== _.keys(expSetFiltersB).length) return false;
    for (var i = 0; i < keysA.length; i++){
        if (typeof expSetFiltersB[keysA[i]] === 'undefined') return false;
        if (expSetFiltersA[keysA[i]] instanceof Set && expSetFiltersB[keysA[i]] instanceof Set){
            if (expSetFiltersA[keysA[i]].size !== expSetFiltersB[keysA[i]].size) return false;
            for (var termFromSetA of expSetFiltersA[keysA[i]]){
                if (!expSetFiltersB[keysA[i]].has(termFromSetA)) return false;
            }
        }
    }
    return true;
}


export function filtersToNodes(expSetFilters = {}, orderedFieldNames = null, flatten = false){
    // Convert orderedFieldNames into object/hash for faster lookups.
    var sortObj = null;
    if (Array.isArray(orderedFieldNames)) sortObj = _.invert(_.object(_.pairs(orderedFieldNames)));

    return _(expSetFilters).chain()
        .pairs() // fieldPair[0] = field, fieldPair[1] = Set of terms
        .sortBy(function(fieldPair){
            if (sortObj && typeof sortObj[fieldPair[0]] !== 'undefined') return parseInt(sortObj[fieldPair[0]]);
            else return fieldPair[0];
        })
        .reduce(function(m, fieldPair){
            var termNodes = [...fieldPair[1]].map(function(term){
                return {
                    'data' : {
                        'term' : term,
                        'name' : Schemas.Term.toName(fieldPair[0], term),
                        'field' : fieldPair[0]
                    }
                };
            });
            if (flatten){
                // [field1:term1, field1:term2, field1:term3, field2:term1]
                termNodes.push('spacer');
                return m.concat(termNodes);
            } else {
                // [[field1:term1, field1:term2, field1:term3],[field2:term1, field2:term2], ...]
                m.push(termNodes);
                return m;
            }
        }, [])
        .value();
}

/**
 * JSON.stringify() cannot store Set objects, which are used in expSetFilters, so we must convert
 * the Sets to/from Arrays upon needing to use JSON.stringify() and after returning from JSON.parse(),
 * such as when saving or grabbing the expSetFilter to/from the <script data-prop-name="expSetFilters"...>...</script>
 * element which is used to pass the filters from server-side render to client-side React initiatilization.
 *
 * @param {Object} expSetFilters  Object keyed by field name/key containing term key strings in form of Set or Array, which need to be converted to Set or Array.
 * @param {string} [to='array']   One of 'array' or 'set' for what to convert expSetFilter's terms to.
 */
export function convertExpSetFiltersTerms(expSetFilters, to = 'array'){
    return _(expSetFilters).chain()
        .pairs()
        .map(function(pair){
            if (to === 'array'){
                return [pair[0], [...pair[1]]];
            } else if (to === 'set'){
                return [pair[0], new Set(pair[1])];
            }
        })
        .object()
        .value();
}


/** Return URL without any queries or hash, ending at pathname. Add hardcoded stuff for /browse/ or /search/ endpoints. */
function getBaseHref(currentHref = '/browse/', hrefPath = null){
    var urlParts = url.parse(currentHref, true);
    if (!hrefPath){
        hrefPath = urlParts.pathname;
    }

    var baseHref = (urlParts.protocol && urlParts.host) ? urlParts.protocol + '//' + urlParts.host + hrefPath : hrefPath;
    var hrefQuery = {};
    var hrefQueryKeys = [];

    if (navigate.isBrowseHref(hrefPath)){
        hrefQuery = navigate.getBrowseBaseParams();
    } else if (hrefPath.indexOf('/search/') > -1){
        if (typeof urlParts.query.type !== 'string'){
            hrefQuery.type = 'Item';
        } else {
            hrefQuery.type = urlParts.query.type;
        }
    }

    var searchQuery = searchQueryStringFromHref(currentHref);
    if (searchQuery) {
        hrefQuery.q = searchQuery;
    }

    hrefQueryKeys = _.keys(hrefQuery);

    return baseHref + (hrefQueryKeys.length > 0 ? '?' + queryString.stringify(hrefQuery) : '');
}

export function searchQueryStringFromHref(href){
    if (!href) return null;
    if (typeof href !== 'string') return null;
    var searchQueryString = null;
    var searchQueryMatch = href.match(/(\?|&)(q)(=)[\w\s\+\-\%]+/);
    if (searchQueryMatch){
        searchQueryString = searchQueryMatch[0].replace(searchQueryMatch.slice(1).join(''), '').replace(/\+/g, ' ');
        if (decodeURIComponent){
            searchQueryString = decodeURIComponent(searchQueryString);
        }
    }
    return searchQueryString;
}


/** Check whether expSetFiles exists and is empty. */
export function filterObjExistsAndNoFiltersSelected(expSetFilters = this.props.expSetFilters){
    return (
        typeof expSetFilters === 'object'
        && expSetFilters !== null
        && _.keys(expSetFilters).length === 0
    );
}

