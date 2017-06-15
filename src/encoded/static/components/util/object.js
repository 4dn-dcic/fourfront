'use strict';

import _ from 'underscore';


/**
 * Convert a link_id, if one exists on param 'object', to an '@id' link.
 * If an '@id' exists already, gets that.
 * 
 * @param {Object} object - Must have a 'link_id' or '@id' property. Else will return null.
 * @returns {string|null} The Item's '@id'.
 */
export function atIdFromObject(o){
    return (
        o && typeof o === 'object' &&
            ((o.link_id && o.link_id.replace(/~/g, "/")) || o['@id']) 
        ) || null;
}



/** Return the properties dictionary from a schema for use as tooltips */
export function tipsFromSchema(schemas, content){
    var tips = {};
    if(content['@type'] && typeof schemas === 'object' && schemas !== null){
        var type = content['@type'][0];
        if(schemas[type]){
            tips = schemas[type].properties;
        }
    }
    return tips;
}

/**
 * Convert tips, as obtained from tipsFromSchema, into a list containing objects with at least the following properties:
 * 'key', 'title', 'description'
 */
export function listFromTips(tips){
    return _.map(_.pairs(tips), function(p){
        return _.extend(_.omit(p[1], 'key'), {
            'key' : p[0],
        });
    });
}



/**
 * Find property within an object using a propertyName in object dot notation.
 * Recursively travels down object tree following dot-delimited property names.
 * If any node is an array, will return array of results.
 * 
 * @param {Object} object - Item to traverse or find propertyName in.
 * @param {string|string[]} propertyName - (Nested) property in object to retrieve, in dot notation or ordered array.
 * @return {*} - Value corresponding to propertyName.
 */
export function getNestedProperty(object, propertyName, suppressNotFoundError = false){

    if (typeof propertyName === 'string') propertyName = propertyName.split('.'); 
    if (!Array.isArray(propertyName)) throw new Error('Using improper propertyName in objectutils.getNestedProperty.');
    try {
        return (function findNestedValue(currentNode, fieldHierarchyLevels, level = 0){
            if (level === fieldHierarchyLevels.length) return currentNode;

            if (Array.isArray(currentNode)){
                var arrayVals = [];
                for (var i = 0; i < currentNode.length; i++){
                    arrayVals.push( findNestedValue(currentNode[i], fieldHierarchyLevels, level) );
                }
                return arrayVals;
            } else {
                if (typeof object === 'undefined' || !object) {
                    if (!suppressNotFoundError) throw new Error('Field ' + _.clone(fieldHierarchyLevels).splice(0, level + 1).join('.') + ' not found on object.');
                    return;
                }
                return findNestedValue(
                    currentNode[fieldHierarchyLevels[level]],
                    fieldHierarchyLevels,
                    level + 1
                );
            }
        })(object, propertyName);
    } catch (e) {
        if (!suppressNotFoundError) console.warn('Could not get ' + propertyName.join('.') + ' from nested object.');
        return null;
    }

}



export function isValidJSON(content) {
    var isJson = true;
    try{
        var json = JSON.parse(JSON.stringify(content));
    } catch(err) {
        isJson = false;
    }
    return isJson;
}



/**
 * Used for object.randomId().
 * @private
 */
let randomIdIncrement = 0;

export function randomId() {
    return 'random-id-' + ++randomIdIncrement;
}


export function isEqual(obj1, obj2){
    var ob1Keys = _.keys(obj1).sort();
    var obj2Keys = _.keys(obj2).sort();
    if (ob1Keys.length !== obj2Keys.length) return false;
    var len = ob1Keys.length;
    var i;
    for (i = 0; i < len; i++){
        if (ob1Keys[i] !== obj2Keys[i]) return false;
    }
    for (i = 0; i < len; i++){
        if (obj1[ob1Keys[i]] !== obj2[ob1Keys[i]]) return false;
    }
    return true;
}


export function singleTreatment(treatment) {
    var treatmentText = '';

    if (treatment.concentration) {
        treatmentText += treatment.concentration + (treatment.concentration_units ? ' ' + treatment.concentration_units : '') + ' ';
    }
    treatmentText += treatment.treatment_term_name + (treatment.treatment_term_id ? ' (' + treatment.treatment_term_id + ')' : '') + ' ';
    if (treatment.duration) {
        treatmentText += 'for ' + treatment.duration + ' ' + (treatment.duration_units ? treatment.duration_units : '');
    }
    return treatmentText;
}
