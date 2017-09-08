'use strict';

var _ = require('underscore');
var url = require('url');
var ajax = require('./ajax');
var Alerts = null; //require('./../alerts');
var store = null;
var object = require('./object');
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
export function currentExpSetFilters(){
    if (!store) store = require('./../../store');
    return store.getState().expSetFilters;
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
 * @param {boolean} [useAjax=true]      Whether to use AJAX to fetch and save new experiment(-sets) to (props.)context. If true, must also provide href argument.
 * @param {string}  [href]              Current or base href to use for AJAX request if using AJAX to update.
 */
export function changeFilter(
    field,
    term,
    experimentsOrSets = 'experiments',
    expSetFilters = null,
    callback = null,
    returnInsteadOfSave = false,
    useAjax=true,
    href=null
){
    // If no expSetFilters (and maybe href, which is optional)
    // are supplied, get them from Redux store.
    if (!expSetFilters){
        if (!store) store = require('./../../store');
        var storeState = store.getState();
        expSetFilters = storeState.expSetFilters;
        if (!href) {
            href = storeState.href;
        }
    }

    // store currently selected filters as a dict of sets
    var tempObj = {};
    var newObj = {};

    // standardize on field naming convention for expSetFilters before they hit the redux store.
    field = standardizeFieldKey(field, experimentsOrSets);

    var expSet = expSetFilters[field] ? new Set(expSetFilters[field]) : new Set();
    if(expSet.has(term)){
        // term is already present, so delete it
        expSet.delete(term);
    }else{
        expSet.add(term);
    }
    if(expSet.size > 0){
        tempObj[field] = expSet;
        newObj = Object.assign({}, expSetFilters, tempObj);
    }else{ //remove key if set is empty
        newObj = Object.assign({}, expSetFilters);
        delete newObj[field];
    }

    if (returnInsteadOfSave){
        return newObj;
    } else {
        console.info("Saving new filters:", newObj, "Using AJAX:", useAjax);
        return saveChangedFilters(newObj, useAjax, href, callback, expSetFilters);
    }
}


/**
 * Update expSetFilters in redux store and, if using AJAX, update context and href as well after fetching.
 * Before calling, make sure expSetFilters is a new or cloned object (not props.expSetFilters) for Redux to recognize that it has changed.
 *
 * @param {Object}  expSetFilters   A new or cloned expSetFilters object to save. Can be empty (to clear all filters).
 * @param {boolean} [useAjax=true]  Whether to use AJAX and update context & href in Redux store as well.
 * @param {string}  [href]          Base URL to use for AJAX request, with protocol (i.e. http(s)), hostname (i.e. domain name), and path, at minimum. Required if using AJAX.
 * @param {function}[callback]      Callback function.
 */
export function saveChangedFilters(newExpSetFilters, useAjax=true, href=null, callback = null, originalFilters = null){
    if (!store)   store = require('./../../store');
    if (!Alerts) Alerts = require('../alerts').default;
    if (!useAjax) {
        store.dispatch({
            type : {'expSetFilters' : newExpSetFilters}
        });
        if (typeof callback === 'function') setTimeout(callback, 0);
        return true;
    }

    var originalReduxState = store.getState();

    if (!href){
        console.warn("No HREF (3rd param) supplied, using current href from Redux store. This might be wrong depending on where we should be browsing.");
        href = originalReduxState.href;
    }

    // Else we fetch new experiment_sets (i.e. (props.)context['@graph'] ) via AJAX.
    if (typeof href !== 'string') throw new Error("No valid href (3rd arg) supplied to saveChangedFilters: " + href);

    var newHref = filtersToHref(newExpSetFilters, href);

    var navigateFxn = (
        typeof navigate === 'function' ? navigate : null
    );

    store.dispatch({
        type: {
            'expSetFilters' : newExpSetFilters,
        }
    });

    if (navigateFxn){
        navigateFxn(newHref, { replace : true, skipConfirmCheck: true }, (result)=>{
            if (result && result.total === 0){
                // No results, unset new filters.
                Alerts.queue(Alerts.NoFilterResults); // Present an alert box informing user that their new selection is now being UNSELECTED because it returned no results.
                store.dispatch({
                    type : {
                        'expSetFilters' : originalReduxState.expSetFilters,
                        'context' : originalReduxState.context
                    }
                });
                navigateFxn(originalReduxState.href, { skipRequest : true });
            } else {
                // Success. Remove any no result alerts.
                Alerts.deQueue(Alerts.NoFilterResults);
            }
            if (typeof callback === 'function') setTimeout(callback, 0);
        }, (err) =>{
            // Fallback callback
            if (err && (err.status === 404 || err.total === 0)) Alerts.queue(Alerts.NoFilterResults);
            if (typeof callback === 'function') setTimeout(callback, 0);
        }/*, { 'expSetFilters' : newExpSetFilters }*/);
    } else {
        // DEPRECATED SECTION -- MIGHT NOT WORK.
        ajax.load(newHref, (newContext) => {
            Alerts.deQueue(Alerts.NoFilterResults);
            store.dispatch({
                type: {
                    'context'       : newContext,
                    //'expSetFilters' : newExpSetFilters,
                    'href'          : newHref
                }
            });
            if (typeof callback === 'function') setTimeout(callback, 0);
        }, 'GET', ()=>{
            // Fallback callback
            Alerts.queue(Alerts.NoFilterResults);
            if (typeof callback === 'function') setTimeout(callback, 0);
        });
    }

}


export function isTermSelectedAccordingToExpSetFilters(term, field, expSetFilters = null){
    // If no expSetFilters are supplied, get them from Redux store.
    if (!expSetFilters){
        if (!store) store = require('./../../store');
        var storeState = store.getState();
        expSetFilters = storeState.expSetFilters;
    }

    if (typeof expSetFilters[field] !== 'undefined'){
        if (expSetFilters[field].has && expSetFilters[field].has(term)){
            return true;
        }
    }
    return false;

}


export function unsetAllTermsForField(field, expSetFilters, save = true, href = null){
    var esf = _.clone(expSetFilters);
    delete esf[field];
    if (save && href){
        return saveChangedFilters(esf, true, href);
    } else {
        return esf;
    }
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
export function filtersToHref(expSetFilters, currentHref, page = null, sortColumn = null, sortReverse = false, hrefPath = null){
    var baseHref = getBaseHref(currentHref, hrefPath);

    // Include a '?' or '&' if needed.
    var sep = ['?','&'].indexOf(baseHref.charAt(baseHref.length - 1)) > -1 ? // Is last character a '&' or '?' ?
        '' : (
            baseHref.match(/\?./) ?
            '&' : '?'
        );

    var filterQuery = expSetFiltersToURLQuery(expSetFilters);

    if (!page)   page = getPage();

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
 * Parse href to return an expSetFilters object, the opposite of @see filtersToHref.
 * Used for server-side rendering to set initial selected filters in UI based on request URL.
 *
 * @param {string}   href              A URL or path containing query at end in form of ?...&field.name=term1&field2.name=term2[...]
 * @param {Object[]} [contextFilters]  Collection of objects from (props.)context.filters or context.facets which have a 'field' property to cross-ref and check if URL query args are facets.
 * @param {string}   [contextFilters.field]
 */
export function hrefToFilters(href, contextFilters = null){
    return _(url.parse(href, true).query).chain()
        .pairs() // Object to [key, val] pairs.
        .filter(function(queryPair){ // Get only facet fields query args.

            if (['type', 'experimentset_type'].indexOf(queryPair[0]) > -1) return false; // Exclude these for now.

            if (Array.isArray(contextFilters) && typeof _.findWhere(contextFilters,  {'field' : queryPair[0]}) !== 'undefined'){
                return true; // See if in context.filters, if is available.
            }

            // These happen to all start w/ 'experiments_in_set.' currently. Woops not anymore.
            if (queryPair[0].indexOf('experiments_in_set.') > -1) return true;
            return false;
        })
        .map(function(queryPair){ // Convert term(s) to Sets
            if (Array.isArray(queryPair[1])) return [  queryPair[0], new Set(queryPair[1])  ];
            else return [  queryPair[0], new Set([queryPair[1]])  ];
        })
        .object() // Pairs back to object. We have expSetFilters now.
        .value();
}


/** Convert expSetFilters, e.g. as stored in Redux, into a partial URL query: field.name=term1&field2.something=term2[&field3...] */
export function expSetFiltersToURLQuery(expSetFilters = null){
    if (!expSetFilters){
        if (!store) store = require('./../../store');
        expSetFilters = store.getState().expSetFilters;
    }
    return _.pairs(expSetFilters).map(function(filterPair){
        var field = filterPair[0];
        var terms = [...filterPair[1]]; // Set to Array
        return terms.map(function(t){
            return field + '=' + encodeURIComponent(t);
        }).join('&');
    }).join('&');
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
    var baseHref = urlParts.protocol + '//' + urlParts.host + hrefPath;
    var baseQuery = [];
    if (hrefPath.indexOf('/browse/') > -1){
        if (typeof urlParts.query.type !== 'string') baseQuery.push(['type','ExperimentSetReplicate']);
        else baseQuery.push(['type', urlParts.query.type]);
        if (typeof urlParts.query.experimentset_type !== 'string') baseQuery.push(['experimentset_type','replicate']);
        else baseQuery.push(['experimentset_type', urlParts.query.experimentset_type]);
    } else if (hrefPath.indexOf('/search/') > -1){
        if (typeof urlParts.query.type !== 'string') baseQuery.push(['type','Item']);
        else baseQuery.push(['type', urlParts.query.type]);
    }

    return baseHref + (baseQuery.length > 0 ? '?' + baseQuery.map(function(queryPair){ return queryPair[0] + '=' + queryPair[1]; }).join('&') : '');
}


/** Check whether expSetFiles exists and is empty. */
export function filterObjExistsAndNoFiltersSelected(expSetFilters = this.props.expSetFilters){
    return (
        typeof expSetFilters === 'object'
        && expSetFilters !== null
        && _.keys(expSetFilters).length === 0
    );
}


/**
 * Filter experiments or sets (graph arg) by filters, adjusting for adding/removing field or term (if defined) or ignored filters.
 *
 * @param {Object[]} graph      Array of experiment_sets or experiments as obtained from (props.)context['@graph'].
 * @param {Object}   filters    expSetFilters in form as obtained from Redux store, e.g. { experiments_in_set...organism.name : Set(['human','mouse']), ... }
 * @param {Object}   [ignored]
 * @param {string}   [field]
 * @param {string}   [term]
 */
export function siftExperimentsClientSide(graph, filters, ignored=null, field=null, term=null) {
    var passExperiments = new Set();
    // Start by adding all applicable experiments to set
    for(var i=0; i < graph.length; i++){
        if(graph[i].experiments_in_set){
            for(var j=0; j < graph[i].experiments_in_set.length; j++){
                passExperiments.add(graph[i].experiments_in_set[j]);
            }
        } else {
            passExperiments.add(graph[i]);
        }
    }
    // search through currently selected expt filters
    var filterKeys = Object.keys(filters);
    if (field && !_.contains(filterKeys, field)){
        filterKeys.push(field);
    }
    for(let experiment of passExperiments){
        var eliminated = false;
        for(var k=0; k < filterKeys.length; k++){
            var refinedFilterSet = null;
            if (ignored && typeof ignored === 'object' && ignored[filterKeys[k]] && ignored[filterKeys[k]].size > 0){
                // remove the ignored filters by using the difference between sets
                refinedFilterSet = new Set([...filters[filterKeys[k]]].filter(x => !ignored[filterKeys[k]].has(x)));
            }
            if (refinedFilterSet === null) refinedFilterSet = filters[filterKeys[k]];
            if (eliminated){
                break;
            }
            var valueProbe = experiment;
            var filterSplit = filterKeys[k].split('.');
            for(var l=0; l < filterSplit.length; l++){
                if(filterSplit[l] === 'experiments_in_set'){
                    continue;
                }
                // for now, use first item in an array (for things such as biosamples)
                if(Array.isArray(valueProbe)){
                    valueProbe = valueProbe[0];
                }
                if(valueProbe[filterSplit[l]]){
                    valueProbe = valueProbe[filterSplit[l]];
                    if(l === filterSplit.length-1){ // last level of filter
                        if(field && filterKeys[k] === field){
                            if(valueProbe !== term){
                                eliminated = true;
                                passExperiments.delete(experiment);
                            }
                        }else if(refinedFilterSet.size > 0 && !refinedFilterSet.has(valueProbe)){ // OR behavior if not active field
                            eliminated = true;
                            passExperiments.delete(experiment);
                        }
                    }
                }else{
                    if(filterKeys[k] !== field && refinedFilterSet.size > 0){
                        eliminated = true;
                        passExperiments.delete(experiment);
                        break;
                    }else{
                        break;
                    }
                }
            }
        }
    }

    return passExperiments;
}


/** For client-side filtering, add or remove experiments_in_set at start of field depending if filtering experiments or sets. */
export function standardizeFieldKey(field, expsOrSets = 'sets', reverse = false){
    if (expsOrSets === 'experiments' && field !== 'experimentset_type'){
        // ToDo: arrays of expSet- and exp- exclusive fields
        if (reverse){
            return field.replace('experiments_in_set.', '');
        } else if (field.slice(0, 19) !== 'experiments_in_set.') {
            if (field === 'type') return field;
            //if (field.slice(0, 6) === 'audit.') return field;
            return 'experiments_in_set.' + field;
        }
    }
    return field;
}

/****
 **** Legacy Client-Side Filtering Facets Functions. For local filtering, e.g. of ExperimentSets' Experiments
 ****/

/**
 * Find filters to ignore - i.e. filters which are set in expSetFilters but are
 * not present in facets.
 * 
 * @param {Object[]} facets - Array of complete facet objects (must have 'terms' & 'fields' properties).
 * @param {Object} expSetFilters - Object containing facet fields and their enabled terms: '{string} Field in item JSON hierarchy, using object dot notation : {Set} terms'.
 * 
 * @return {Object} The filters which are ignored. Object looks like expSetFilters.
 */
export function findIgnoredFiltersByMissingFacets(facets, expSetFilters){
    var ignoredFilters = {};
    for(var i=0; i < facets.length; i++){
        var ignoredSet = new Set();
        if(expSetFilters[facets[i].field]){
            for(let expFilter of [...expSetFilters[facets[i].field]]){ // [... ] to convert Set to Array
                var found = false;
                for(var j=0; j < facets[i].terms.length; j++){
                    if(expFilter === facets[i].terms[j].key){
                        found = true;
                        break;
                    }
                }
                if(!found){
                    ignoredSet.add(expFilter);
                }
            }
            if(ignoredSet.size > 0){
                ignoredFilters[facets[i].field] = ignoredSet;
            }
        }

    }
    return ignoredFilters;
}


/**
 * Find filters which to ignore based on if all experiments in experimentArray which are being filtered
 * have the same term for that selected filter. Geared towards usage by ExperimentSetView.
 * 
 * @param {Object[]} experimentArray - Experiments which are being filtered.
 * @param {Object} expSetFilters - Object containing facet field name as key and set of terms to filter by as value.
 * @param {string} [expsOrSets] - Whether are filtering experiments or sets, in order to standardize facet names.
 */
export function findIgnoredFiltersByStaticTerms(experimentArray, expSetFilters, expsOrSets = 'experiments'){
    var ignored = {};
    _.forEach(_.keys(expSetFilters), (selectedFacet, i)=>{ // Get facets/filters w/ only 1 applicable term

        // Unique terms in all experiments per filter
        if (
            _.flatten(
                // getNestedProperty returns array(s) if property is nested within array(s), so we needa flatten to get list of terms.
                experimentArray.map((experiment, j)=>{
                    var termVal = object.getNestedProperty(
                        experiment,
                        standardizeFieldKey(selectedFacet, expsOrSets, true)
                    );
                    if (Array.isArray(termVal)){ // Only include terms by which we're filtering
                        return termVal.filter((term) => expSetFilters[selectedFacet].has(term));
                    }
                    return termVal;
                })
            ).filter((experimentTermValue, j, allTermValues)=>{ 
                // Reduce to unique term vals (indexOf returns first index, so if is repeat occurance, returns false)
                return allTermValues.indexOf(experimentTermValue) === j;
            }).length < 2
        ) {
            ignored[selectedFacet] = expSetFilters[selectedFacet]; // Ignore all terms in filter.
        }

    });
    return ignored;
}


