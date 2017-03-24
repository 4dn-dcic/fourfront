'use strict';

var _ = require('underscore');


module.exports = {

    /**
     * Convert a link_id, if one exists on param 'object', to an '@id' link.
     * If an '@id' exists already, gets that.
     * 
     * @memberof module:item-pages/components.FilesInSetTable
     * @static
     * @public
     * @param {Object} object - Must have a 'link_id' or '@id' property. Else will return null.
     * @returns {string|null} The Item's '@id'.
     */
    atIdFromObject : function(o){
        return (
            o && typeof o === 'object' &&
                ((o.link_id && o.link_id.replace(/~/g, "/")) || o['@id']) 
            ) || null;
    },

    /** Return the properties dictionary from a schema for use as tooltips */
    tipsFromSchema : function(schemas, content){
        var tips = {};
        if(content['@type'] && typeof schemas === 'object' && schemas !== null){
            var type = content['@type'][0];
            if(schemas[type]){
                tips = schemas[type]['properties'];
            }
        }
        return tips;
    },

    /**
     * Find property within an object using a propertyName in object dot notation.
     * Recursively travels down object tree following dot-delimited property names.
     * If any node is an array, will return array of results.
     * 
     * @param {Object} object - Item to traverse or find propertyName in.
     * @param {string|string[]} propertyName - (Nested) property in object to retrieve, in dot notation or ordered array.
     * @return {*} - Value corresponding to propertyName.
     */

    getNestedProperty : function(object, propertyName, suppressNotFoundError = false){

        if (typeof propertyName === 'string') propertyName = propertyName.split('.'); 
        if (!Array.isArray(propertyName)) throw new Error('Using improper propertyName in objectutils.getNestedProperty.');
        try {
            return (function findNestedValue(currentNode, fieldHierarchyLevels, level = 0){
                if (level == fieldHierarchyLevels.length) return currentNode;

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

    },

    randomId : function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    },

    singleTreatment : function(treatment) {
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

};


