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