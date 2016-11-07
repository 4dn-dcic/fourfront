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


var ajaxLoad = module.exports.ajaxLoad = function(url, callback, method = 'GET', fallback = null, data = null, headers = null){
    if (typeof window == 'undefined') return null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
            if (xmlhttp.status == 200) {
                if (typeof callback == 'function'){
                    callback(JSON.parse(xmlhttp.responseText));
                }
            } else if (xmlhttp.status == 400) {
                console.error('There was an error 400');
                if (typeof fallback == 'function'){
                    fallback();
                }
            } else {
                console.error('something else other than 200 was returned');
                if (typeof fallback == 'function'){
                    fallback();
                }
            }
        }
    };
    xmlhttp.open(method, url, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    if(headers){
        for(var i=0; i<Object.keys(headers).length; i++){
            xmlhttp.setRequestHeader(Object.keys(headers)[i], 
              headers[Object.keys(headers)[i]]);
        }
    }
    if(data){
        xmlhttp.send(data);
    }else{
        xmlhttp.send();
    }
}

var ajaxPromise = module.exports.ajaxPromise = function(url, method, headers = null, data = null){
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            // response SHOULD be json
            resolve(JSON.parse(xhr.responseText));
        };
        xhr.onerror = reject;
        xhr.open(method, url, true);
        if(headers){
            for(var i=0; i<Object.keys(headers).length; i++){
                xhr.setRequestHeader(Object.keys(headers)[i], headers[Object.keys(headers)[i]]);
            }
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
 * Keep widths in sync with stylesheet, e.g. $screen-sm-min, $screen-md-min, & $screen-lg-min
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {integer}
 */
var gridContainerWidth = module.exports.gridContainerWidth = function(){
    if (isServerSide()) return 1140;
    // Subtract 20 for padding.
    if (window.innerWidth >= 1200) return 1140;
    if (window.innerWidth >= 992) return 940;
    if (window.innerWidth >= 768) return 720;
    return window.innerWidth - 20;
};
