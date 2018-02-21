'use strict';

import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import { filtersToHref } from './experiments-filters';
let store = null;

let cachedNavFunction = null;
let callbackFunctions = [];


/**
 * Options to pass to App.navigate function.
 * @typedef {Object} NavigateOpts
 * @property {boolean} inPlace              Don't cancel out if loading same HREF/URL (e.g. allow refresh).
 * @property {boolean} replace              Replace Browser History entry with new HREF/URL instead of adding.
 * @property {boolean} skipConfirmCheck
 * @property {boolean} skipRequest          Don't perform request, just change URL.
 * @property {boolean} skipUpdateHref       Fetch/request new context, but don't update URL.
 * @property {boolean} cache                Set to false to explicitly not cache response. Shouldn't be necessary (browser does this by default).
 * @property {boolean} dontScrollToTop      Don't scroll to top of page after completion.
 */

/**
 * Navigation function, defined globally to act as alias of App.navigate.
 * Is set in App constructor via navigate.setNavigateFunction.
 * 
 * Singleton function, defined the old fashioned way (pre ES6).
 * Uses the same parameters as app.prototype.navigate(..).
 * 
 * Use by importing and calling in the same way app.navigate might be used.
 * 
 * @param {string}       href                        Where to navigate to.
 * @param {NavigateOpts} [options={}]                Additional options, examine App.navigate for details.
 * @param {function}     [callback]                  Optional callback, accepts the response object.
 * @param {function}     [fallbackCallback]          Optional callback called if any error with response, including 404 error. Accepts response object -or- error object, if AJAX request failed.
 * @param {Object}       [includeReduxDispatch={}]   Optional state to save to Redux store, in addition to the 'href' and 'context' set by navigate function.
 * 
 * @example
 * var { navigate } = require('./util');
 * navigate('/a/different/page', options);
 */
var navigate = function(href, options = {}, callback = null, fallbackCallback = null, includeReduxDispatch = {}){
    if (typeof cachedNavFunction !== 'function') throw new Error('No navigate function cached.');
    var callbackFxn = function(jsonResponse){
        if (typeof callback === 'function') callback(jsonResponse); // Original callback
        if (callbackFunctions.length > 0) callbackFunctions.forEach(function(cb){ cb(jsonResponse); }); // Any registered callbacks.
    };
    return cachedNavFunction.call(cachedNavFunction, href, options, callbackFxn, fallbackCallback, includeReduxDispatch);
};

/******* PUBLIC STATIC FUNCTIONS *******/

/** This must be called in app initialization to alias app.navigate into this global module/function. */
navigate.setNavigateFunction = function(navFxn){
    if (typeof navFxn !== 'function') throw new Error("Not a function.");
    store = require('../../store');
    //if (typeof window !== 'undefined') window.store2 = store;
    cachedNavFunction = navFxn;
};


navigate.getBrowseBaseParams = function(browseBaseState = null){
    if (!browseBaseState){
        if (store === null){
            store = require('../../store');
        }
        var storeState = store.getState();
        browseBaseState = storeState.browseBaseState;
    }
    return _.clone(navigate.getBrowseBaseParams.mappings[browseBaseState].parameters);
};


navigate.getBrowseBaseParams.mappings = {
    'all' : {
        'parameters' : { 'type' : 'ExperimentSetReplicate', 'experimentset_type' : 'replicate' },
    },
    'only_4dn' : {
        'parameters' : { 'type' : 'ExperimentSetReplicate', 'experimentset_type' : 'replicate', 'award.project' : '4DN' },
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

    return _.every(_.pairs(browseBaseParams), function(p){
        if (typeof hrefQuery[p[0]] === 'undefined') return false;
        if (Array.isArray(hrefQuery[p[0]])){
            if (Array.isArray(p[1])){
                return _.every(p[1], function(arrItem){
                    return hrefQuery[p[0]].indexOf(arrItem) > -1;
                });
            } else {
                return hrefQuery[p[0]].indexOf(p[1]) > -1;
            }
        } else {
            if (Array.isArray(p[1])){
                return false;
            } else {
                return hrefQuery[p[0]] === p[1];
            }
        }
    });
};


navigate.determineSeparatorChar = function(href){
    return (
        ['?','&'].indexOf(href.charAt(href.length - 1)) > -1 ? // Is last character a '&' or '?' ?
        '' : (
            href.match(/\?./) ?
            '&' : '?'
        )
    );
};


/** Utility function to check if we are on a browse page. */
navigate.isBrowseHref = function(href){
    if (typeof href === 'string') href = url.parse(href);
    if (href.pathname.slice(0,8) === '/browse/') return true;
    return false;
};


/** Utility function to check if we are on a search page. */
navigate.isSearchHref = function(href){
    if (typeof href === 'string') href = url.parse(href);
    if (href.pathname.slice(0,8) === '/search/') return true;
    return false;
};


/** Register a function to be called on each navigate response. */
navigate.registerCallbackFunction = function(fxn){
    callbackFunctions.push(fxn);
};


navigate.deregisterCallbackFunction = function(fxn){
    callbackFunctions = _.without(callbackFunctions, fxn);
};


export { navigate };
