'use strict';

var SingleTreatment = module.exports.SingleTreatment = function(treatment) {
    var treatmentText = '';

    if (treatment.concentration) {
        treatmentText += treatment.concentration + (treatment.concentration_units ? ' ' + treatment.concentration_units : '') + ' ';
    }
    treatmentText += treatment.treatment_term_name + (treatment.treatment_term_id ? ' (' + treatment.treatment_term_id + ')' : '') + ' ';
    if (treatment.duration) {
        treatmentText += 'for ' + treatment.duration + ' ' + (treatment.duration_units ? treatment.duration_units : '');
    }
    return treatmentText;
};


/**
 * Check if JS is processing on serverside, vs in browser (clientside).
 * Adapted from react/node_modules/fbjs/lib/ExecutionEnvironment.canUseDOM()
 * 
 * @return {boolean} - True if processing on serverside.
 */
var isServerSide = module.exports.isServerSide = function(){
    if (typeof window == 'undefined' || !window || !window.document || !window.document.createElement){
        return true;
    }
    return false;
}


/**
 * Check if process.env.NODE_ENV is not on 'production'.
 * 
 * @return {boolean} - True if NODE_ENV != 'production'.
 */
var isDebugging = module.exports.isDebugging = function(){
    // process.env.NODE_ENV is set in webpack.config.js if running 'npm run build'
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
        return false;
    }
    return true;
}

/** 
 * Custom patched console for debugging. Only print out statements if debugging/development environment.
 * Prevent potential issues where console might not be available (earlier IE).
 */
var patchedConsole = module.exports.console = (function(){

    if (!isServerSide() && window.patchedConsole) return window.patchedConsole; // Re-use instance if available.
    
    var PatchedConsole = function(){
        this._initArgs = arguments; // arguments variable contains any arguments passed to function in an array.
        this._enabled = true; // Default
        this._available = true;

        if (!console || !console.log) { // Check for seldomly incompatible browsers
            this._available = false;
        }

        if (!isDebugging) {
            this._enabled = false; // Be silent on production.
        }

        this._methods = ['log', 'assert', 'dir', 'error', 'info', 'warn', 'clear', 'profile', 'profileEnd'];
        this._nativeConsole = console;

        this._patchMethods = function(){
            this._methods.forEach(function(methodName){
                if (!(this._enabled && this._available)) {
                    this[methodName] = function(){return false;};
                } else {
                    this[methodName] = this._nativeConsole[methodName];
                }
            }.bind(this));
        }.bind(this);

        // Ability to override, e.g. on production.
        this.on = function(){
            this._enabled = true;
            this._patchMethods();
        }.bind(this);

        this.off = function(){
            this._enabled = false;
            this._patchMethods();
        }.bind(this);

        this._patchMethods();
    }

    var patchedConsole = new PatchedConsole();

    if (!isServerSide()) {
        window.patchedConsole = patchedConsole;
    }
    return patchedConsole;
})();


var ajaxLoad = module.exports.ajaxLoad = function(url, callback, method = 'GET', fallback = null, data = null){
    if (typeof window == 'undefined') return null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
            if (xmlhttp.status == 200) {
                if (typeof callback == 'function'){
                    callback(JSON.parse(xmlhttp.responseText));
                }
            } else if (xmlhttp.status == 400) {
                (patchedConsole || console).error('There was an error 400');
                if (typeof fallback == 'function'){
                    fallback();
                }
            } else {
                (patchedConsole || console).error('something else other than 200 was returned');
                if (typeof fallback == 'function'){
                    fallback();
                }
            }
        }
    };
    xmlhttp.open(method, url, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    (patchedConsole || console).log('___DATA___',data);
    if(data){
        xmlhttp.send(data);
    }else{
        xmlhttp.send();
    }
}

var ajaxPromise = module.exports.ajaxPromise = function(url, method, headers = {}, data = null){
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            // response SHOULD be json
            resolve(JSON.parse(xhr.responseText));
        };
        xhr.onerror = reject;
        xhr.open(method, url, true);
        if (typeof headers["Content-Type"] == 'undefined'){
            headers["Content-Type"] = "application/json;charset=UTF-8";
        }
        var headerKeys = Object.keys(headers);
        for (var i=0; i < headerKeys.length; i++){
            xhr.setRequestHeader(headerKeys[i], headers[headerKeys[i]]);
        }
    
        if(data){
            xhr.send(data);
        }else{
            xhr.send();
        }
    });
}

/**
 * Format a timestamp to pretty output. Uses moment.js, which uses Date() object in underlying code.
 * 
 * @param {string} timestamp - Timestamp as provided by server output. No timezone corrections currently.
 * @param {string} [outputFormat] - Defaults to "MMMM Do, YYYY" for, e.g. "October 31st, 2016".
 * @return {string} Prettified date/time output.
 */
var parseDateTime = module.exports.parseDateTime = function(timestamp, outputFormat = "MMMM Do, YYYY"){
    if (!Date) {
        return timestamp; // Date object may or may not be available server-side.
    } else {
        var moment = require('moment'); // require allows to load code in conditionally, so lets do that until more funcs require moment.
        return moment(timestamp).format(outputFormat);
    }
};

/**
 * Check width of text or text-like content if it were to fit on one line.
 * @param {string} textContent - Either text or text-like content, e.g. with span elements.
 * @param {string} [containerElementType] - Type of element to fit into, e.g. 'div' or 'p'.
 * @param {string} [containerClassName] - ClassName of containing element, e.g. with 'text-large' to use larger text size.
 * @param {integer} [widthForHeightCheck] - If provided, will return an object which will return height of text content when constrained to width.
 * @return {integer|Object} - Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
 */
var textContentWidth = module.exports.textContentWidth = function(
    textContent,
    containerElementType = 'div',
    containerClassName = '',
    widthForHeightCheck = null
){
    if (isServerSide()){
        return null;
    };
    var contElem = document.createElement(containerElementType);
    contElem.className = "off-screen " + containerClassName;
    contElem.innerHTML = textContent;
    contElem.style.whiteSpace = "nowrap";
    document.body.appendChild(contElem);
    var textLineWidth = contElem.clientWidth;
    var fullContainerHeight;
    if (widthForHeightCheck){
        contElem.style.whiteSpace = "";
        contElem.style.display = "block";
        contElem.style.width = widthForHeightCheck + "px";
        fullContainerHeight = contElem.clientHeight;
    }
    document.body.removeChild(contElem);
    if (fullContainerHeight) {
        return { containerHeight : fullContainerHeight, textWidth : textLineWidth };
    }
    return textLineWidth;
}

/**
 * Get the width of what a 12-column bootstrap section would be in current viewport size.
 * Keep widths in sync with stylesheet, e.g. 
 * $container-tablet - $grid-gutter-width, 
 * $container-desktop - $grid-gutter-width, and
 * $container-large-desktop - $grid-gutter-width 
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {integer}
 */
var gridContainerWidth = module.exports.gridContainerWidth = function(){
    // Subtract 20 for padding/margins.
    switch(responsiveGridState()){
        case 'lg': return 1140;
        case 'md': return 940;
        case 'sm': return 720;
        case 'xs':
            if (isServerSide()) return 400;
            return window.innerWidth - 20;
    }

};

/**
 * Get current grid size, if need to sidestep CSS.
 * Keep widths in sync with stylesheet, e.g. $screen-sm-min, $screen-md-min, & $screen-lg-min
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {string} - Abbreviation for column/grid Bootstrap size, e.g. 'lg', 'md', 'sm', or 'xs'.
 */

var responsiveGridState = module.exports.responsiveGridState = function(){
    if (isServerSide()) return 'lg';
    if (window.innerWidth >= 1200) return 'lg';
    if (window.innerWidth >= 992) return 'md';
    if (window.innerWidth >= 768) return 'sm';
    return 'xs';
};
