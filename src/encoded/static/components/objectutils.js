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

var ajaxLoad = module.exports.ajaxLoad = function(url, callback, method = 'GET', fallback = null, data = null){

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
    if(method == 'POST' && data){
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
        if(method == 'POST' && data){
            xhr.send(data);
        }else{
            xhr.send();
        }
    });
}
