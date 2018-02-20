'use strict';

import url from 'url';
import _ from 'underscore';
import { filtersToHref } from './experiments-filters';


let cachedNavFunction = null;
let callbackFunctions = [];
let store = null;

/**
 * Navigation function, defined globally to act as alias of App.navigate.
 * Is set in App constructor via navigate.setNavigateFunction.
 * 
 * Singleton function, defined the old fashioned way (pre ES6).
 * Uses the same parameters as app.prototype.navigate(..).
 * 
 * Use by importing and calling in the same way app.navigate might be used.
 * 
 * @param {string}      href                        Where to navigate to.
 * @param {Object}      [options={}]                Additional options, examine App.navigate for details.
 * @param {function}    [callback]                  Optional callback, accepts the response object.
 * @param {function}    [fallbackCallback]          Optional callback called if any error with response, including 404 error. Accepts response object -or- error object, if AJAX request failed.
 * @param {Object}      [includeReduxDispatch={}]   Optional state to save to Redux store, in addition to the 'href' and 'context' set by navigate function.
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
    store = require('../store');
    cachedNavFunction = navFxn;
};


navigate.browseBaseHref = function(stateName = 'all'){
    //console.log(e);
    console.log(this);
    return '/browse/';
};

navigate.browseBaseHref.mappings = {
    'all' : {
        'query' : { 'type' : 'ExperimentSetReplicate', 'experimentset_type' : 'replicate' },
    },
    'only_4dn' : {
        'query' : { 'type' : 'ExperimentSetReplicate', 'experimentset_type' : 'replicate', 'award.project' : '4DN' },
    }
};


/** Utility function to get root path of browse page. */
navigate.getBrowseHrefRoot = function(href){
    var hrefParts = url.parse(href);
    if (!navigate.isBrowseHref(hrefParts)){
        return hrefParts.protocol + '//' + (hrefParts.auth || '') + hrefParts.host + '/browse/';
    }
    return href;
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
