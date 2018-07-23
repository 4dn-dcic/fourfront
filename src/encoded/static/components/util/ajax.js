'use strict';

import _ from 'underscore';
import * as JWT from './json-web-token';
var console = require('./patched-console').default;

/**
 * @private
 */
const defaultHeaders = {
    "Content-Type"      : "application/json; charset=UTF-8",
    "Accept"            : "application/json",
    "X-Requested-With"  : "XMLHttpRequest" // Allows some server-side libs (incl. pyramid) to identify using `request.is_xhr`.
};

/**
 * @private
 * @function
 * @param {XMLHttpRequest} xhr - XHR object.
 * @param {Object} [headers={}] - Headers object.
 * @returns {XMLHttpRequest} XHR object with set headers.
 */
function setHeaders(xhr, headers = {}, deleteHeaders = []) {
    headers = JWT.addToHeaders(_.extend({}, defaultHeaders, headers)); // Set defaults, add JWT if set

    // Put everything in the header
    var headerKeys = _.keys(headers);
    for (var i=0; i < headerKeys.length; i++){
        if (deleteHeaders.indexOf(headerKeys[i]) > -1){
            continue;
        }
        xhr.setRequestHeader(headerKeys[i], headers[headerKeys[i]]);
    }

    return xhr;
}


export function load(url, callback, method = 'GET', fallback = null, data = null, headers = {}, deleteHeaders = []){
    if (typeof window === 'undefined') return null;

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                if (typeof callback === 'function'){
                    callback(JSON.parse(xhr.responseText));
                }
            } else {
                var response;
                try {
                    response = JSON.parse(xhr.responseText);
                    console.error('ajax.load error: ', response);
                    if (typeof fallback === 'function') fallback(response);
                } catch (error) {
                    console.error('Non-JSON error response:', xhr.responseText);
                    if (typeof fallback === 'function') fallback(xhr);
                }
            }
        }
    };

    xhr.open(method, url, true);
    xhr = setHeaders(xhr, headers, deleteHeaders || []);

    if (data){
        xhr.send(data);
    } else {
        xhr.send();
    }
}

export function promise(url, method = 'GET', headers = {}, data = null, cache = true, debugResponse = false){
    var xhr;
    var promiseInstance = new Promise(function(resolve, reject) {
        xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var response = null;
            // response SHOULD be json
            try {
                response = JSON.parse(xhr.responseText);
                if (debugResponse) console.info('Received data from ' + method + ' ' + url + ':', response);
            } catch (e) {
                console.log(xhr);
                console.error("Non-JSON error response:", xhr.responseText);
                reject(xhr);
                return;
            }
            resolve(response);
        };
        xhr.onerror = reject;
        if (cache === false && url.indexOf('format=json') > -1){
            url += '&ts=' + parseInt(Date.now());
        }
        xhr.open(method, url, true);
        xhr = setHeaders(xhr, headers);

        if(data){
            xhr.send(data);
        }else{
            xhr.send();
        }
        return xhr;
    });
    promiseInstance.xhr = xhr;
    promiseInstance.abort = function(){
        if (promiseInstance.xhr.readyState !== 4) promiseInstance.xhr.abort();
    };
    return promiseInstance;
}

/**
 * Wrapper around function promise() which is slightly more relevant for navigation.
 * Strips hash from URL, sets same origin police.
 *
 * @export
 * @param {any} url
 * @param {any} options
 */
export function fetch(url, options){
    options = _.extend({credentials: 'same-origin'}, options);
    var http_method = options.method || 'GET';
    var headers = options.headers = _.extend({}, options.headers || {});
    // Strip url fragment.
    var url_hash = url.indexOf('#');
    if (url_hash > -1) {
        url = url.slice(0, url_hash);
    }
    var data = options.body ? options.body : null;
    var request = promise(url, http_method, headers, data, options.cache === false ? false : true);
    request.xhr_begin = 1 * new Date();
    request.then(response => {
        request.xhr_end = 1 * new Date();
    });
    return request;
}

/** Calls ajax.fetch() internally, but adds 'json' function to return self. */
export function fetchPolyfill(url, options){
    var req = fetch(url, options);
    req.then((resp) => {
        resp.json = function(){ return resp; };
    });
    return req;
}
