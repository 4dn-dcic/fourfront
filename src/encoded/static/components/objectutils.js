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

var ajaxLoad = module.exports.ajaxLoad = function(url, callback, method = 'GET'){

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
            if (xmlhttp.status == 200) {
                if (typeof callback == 'function'){
                    callback(JSON.parse(xmlhttp.responseText));
                }
            } else if (xmlhttp.status == 400) {
                console.error('There was an error 400');
            } else {
                console.error('something else other than 200 was returned');
            }
        }
    };

    xmlhttp.open(method, url, true);
    xmlhttp.send();

}

/**
 * Check width of text or text-like content if it were to fit on one line.
 * @param {string} textContent - Either text or text-like content, e.g. with span elements.
 * @param {string} containerElementType - Type of element to fit into, e.g. 'div' or 'p'.
 * @param {string} containerClassName - ClassName of containing element, e.g. with 'text-large' to use larger text size.
 */
var textContentWidth = module.exports.textContentWidth = function(
    textContent, 
    containerElementType = 'div', 
    containerClassName = ''
){
    if (!window || !window.document){
        return null;
    };
    var contElem = document.createElement(containerElementType);
    contElem.className = "nowrap tester " + containerClassName;
    contElem.innerHTML = textContent;
    document.body.appendChild(contElem);
    var resultWidth = contElem.clientWidth;
    document.body.removeChild(contElem);
    return resultWidth;
}

/**
 * Get the width of what a 12-column bootstrap section would be in current viewport size.
 * Keep widths in sync with stylesheet.
 */
var gridContainerWidth = module.exports.gridContainerWidth = function(){
    var docWidth = document.documentElement.clientWidth;
    if (docWidth < 768) return docWidth - 20; // Account for padding.
    if (docWidth < 960) return 740;
    if (docWidth < 1160) return 940;
    return 1140;
};