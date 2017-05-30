'use strict';

import url from 'url';
import _ from 'underscore';


let cachedNavFunction = null;
let callbackFunctions = [];


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
    cachedNavFunction = navFxn;
};

/** Utility function to get root path of browse page. */
navigate.getBrowseHref = function(href){
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

export default navigate;
