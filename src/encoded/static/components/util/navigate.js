'use strict';

var url = require('url');

var cachedNavFunction = null;


var navigate = function(){
    if (typeof cachedNavFunction !== 'function') throw new Error('No navigate function cached.');
    return cachedNavFunction.apply(cachedNavFunction, arguments);
};

/******* PUBLIC STATIC FUNCTIONS *******/

navigate.setNavigateFunction = function(navFxn){
    if (typeof navFxn !== 'function') throw new Error("Not a function.");
    cachedNavFunction = navFxn;
};

navigate.getBrowseHref = function(href){
    var hrefParts = url.parse(href);
    if (!navigate.isBrowseHref(hrefParts)){
        return hrefParts.protocol + '//' + (hrefParts.auth || '') + hrefParts.host + '/browse/';
    }
    return href;
};

navigate.isBrowseHref = function(href){
    if (typeof href === 'string') href = url.parse(href);
    if (href.pathname.slice(0,8) === '/browse/') return true;
    return false;
};

navigate.isSearchHref = function(href){
    if (typeof href === 'string') href = url.parse(href);
    if (href.pathname.slice(0,8) === '/search/') return true;
    return false;
};

module.exports = navigate;
