'use strict';

import _ from 'underscore';
import url from 'url';
import React from 'react';
import { linkFromItem } from './object';

let cachedSchemas = null;

/**
 * Should be set by app.js to return app.state.schemas
 *
 * @type {function}
 */
export function get(){
    return cachedSchemas;
}

export function set(schemas){
    cachedSchemas = schemas;
    return true;
}

export const itemTypeHierarchy = {
    'Experiment': [
        'ExperimentHiC', 'ExperimentMic', 'ExperimentCaptureC', 'ExperimentRepliseq', 'ExperimentAtacseq'
    ],
    'ExperimentSet': [
        'ExperimentSet', 'ExperimentSetReplicate'
    ],
    'File': [
        'FileCalibration', 'FileFasta', 'FileFastq', 'FileProcessed', 'FileReference'
    ],
    'FileSet': [
        'FileSet', 'FileSetCalibration'
    ],
    'Individual': [
        'IndividualHuman', 'IndividualMouse'
    ],
    'Treatment': [
        'TreatmentChemical', 'TreatmentRnai'
    ],
    'QualityMetric' : [
        'QualityMetricFastqc', 'QualityMetricBamqc', 'QualityMetricPairsqc'
    ],
    'WorkflowRun' : [
        'WorkflowRun', 'WorkflowRunSbg', 'WorkflowRunAwsem'
    ]
};

export const Term = {

    toName : function(field, term, allowJSXOutput = false){

        if (allowJSXOutput && typeof term !== 'string' && term && typeof term === 'object'){
            // Object, probably an item.
            return linkFromItem(term);
        }

        var name = null;

        switch (field) {
            case 'experimentset_type':
                name = Term.capitalizeSentence(term);
                break;
            case 'type':
                name = getTitleForType(term);
                break;
            case 'status':
                name = Term.capitalizeSentence(term);
                break;
            default:
                name = null;
                break;
        }

        // Remove 'experiments_in_set' and test as if an experiment field. So can work for both ?type=Experiment, ?type=ExperimentSet.
        if (typeof name === 'string') return name;
        var standardizedFieldKey = field;
        if (standardizedFieldKey.slice(0, 19) === 'experiments_in_set.'){
            standardizedFieldKey = standardizedFieldKey.slice(19);
        }

        switch (standardizedFieldKey) {
            case 'biosample.biosource.individual.organism.name':
                name = Term.capitalize(term);
                break;
            case 'file_type':
            case 'file_classification':
            case 'file_type_detailed':
            case 'files.file_type':
            case 'files.file_classification':
            case 'files.file_type_detailed':
            case 'biosample.biosource.biosource_type':
                name = Term.capitalizeSentence(term);
                break;
            case 'file_size':
                if (typeof term === 'number'){
                    name = term;
                } else if (!isNaN(parseInt(term))) {
                    name = parseInt(term);
                }
                if (typeof name === 'number' && !isNaN(name)){
                    name = Term.bytesToLargerUnit(name);
                } else {
                    name = null;
                }
                break;
            case 'link_id':
                name = term.replace(/~/g, "/");
                break;
            default:
                name = null;
                break;
        }

        if (typeof name !== 'string') name = term;

        return name;
    },

    capitalize : function(word)        {
        if (typeof word !== 'string') return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    },
    capitalizeSentence : function(sen) {
        if (typeof sen !== 'string') return sen;
        return sen.split(' ').map(Term.capitalize).join(' ');
    },

    byteLevels : ['Bytes', 'kB', 'MB', 'GB', 'TB', 'Petabytes', 'Exabytes'],

    bytesToLargerUnit : function(bytes, level = 0){
        if (bytes > 1024 && level < Term.byteLevels.length) {
            return Term.bytesToLargerUnit(bytes / 1024, level + 1);
        } else {
            return (Math.round(bytes * 100) / 100) + ' ' + Term.byteLevels[level];
        }
    }

};


export const Field = {

    nameMap : {
        'experiments_in_set.biosample.biosource.individual.organism.name' : 'Organism',
        'accession' : 'Experiment Set',
        'experiments_in_set.digestion_enzyme.name' : 'Enzyme',
        'experiments_in_set.biosample.biosource_summary' : 'Biosource',
        'experiments_in_set.lab.title' : 'Lab',
        'experiments_in_set.experiment_type' : 'Experiment Type',
        'experimentset_type' : 'Set Type',
        'link_id' : "Link",
        'display_title' : "Title"
    },

    toName : function(field, schemas, schemaOnly = false){
        if (!schemaOnly && Field.nameMap[field]){
            return Field.nameMap[field];
        } else {
            var schemaProperty = Field.getSchemaProperty(field, schemas);
            if (schemaProperty && schemaProperty.title){
                Field.nameMap[field] = schemaProperty.title; // Cache in nameMap for faster lookups.
                return schemaProperty.title;
            } else if (!schemaOnly) {
                return field;
            } else {
                return null;
            }
        }
    },

    getSchemaProperty : function(field, schemas = null, startAt = 'ExperimentSet', skipExpFilters=false){
        if (!schemas && !skipExpFilters) schemas = get && get();
        var baseSchemaProperties = (schemas && schemas[startAt] && schemas[startAt].properties) || null;
        if (!baseSchemaProperties) return null;
        if (field.slice(0,5) === 'audit') return null;
        var fieldParts = field.split('.');

        function getNextSchemaProperties(linkToName){

            function combineSchemaPropertiesFor(relatedLinkToNames){
                return _.reduce(relatedLinkToNames, function(schemaProperties, schemaName){
                    if (schemas[schemaName]){
                        return _.extend(schemaProperties, schemas[schemaName].properties);
                    }
                    else return schemaProperties;
                }, {});
            }

            if (typeof itemTypeHierarchy[linkToName] !== 'undefined') {
                return combineSchemaPropertiesFor(itemTypeHierarchy[linkToName]);
            } else {
                return schemas[linkToName].properties;
            }
        }


        function getProperty(propertiesObj, fieldPartIndex){
            var property = propertiesObj[fieldParts[fieldPartIndex]];
            if (fieldPartIndex >= fieldParts.length - 1) return property;
            var nextSchemaProperties = null;
            //console.log(propertiesObj, fieldParts, fieldPartIndex);
            if (property.type === 'array' && property.items && property.items.linkTo){
                nextSchemaProperties = getNextSchemaProperties(property.items.linkTo);
            } else if (property.type === 'array' && property.items && property.items.linkFrom){
                nextSchemaProperties = getNextSchemaProperties(property.items.linkFrom);
            } else if (property.linkTo) {
                nextSchemaProperties = getNextSchemaProperties(property.linkTo);
            } else if (property.linkFrom) {
                nextSchemaProperties = getNextSchemaProperties(property.linkFrom);
            }

            if (nextSchemaProperties) return getProperty(nextSchemaProperties, fieldPartIndex + 1);
        }

        return getProperty(baseSchemaProperties, 0);

    }

};

/**
 * Converts a nested object from this form: "key" : { ..., "items" : { ..., "properties" : { "property" : { ...details... } } } }
 * To this form: "key" : { ... }, "key.property" : { ...details... }, ...
 *
 * @param {Object} tips - Schema property object with a potentially nested 'items'->'properties' value(s).
 * @returns {Object} Object with period-delimited keys instead of nested value to represent nested schema structure.
 */
export function flattenSchemaPropertyToColumnDefinition(tips, depth = 0){
    var flattened = (
        _.pairs(tips).filter(function(p){
            if (p[1] && ((p[1].items && p[1].items.properties) || (p[1].properties))) return true;
            return false;
        }).reduce(function(m, p){
            _.keys((p[1].items || p[1]).properties).forEach(function(childProperty){
                if (typeof m[p[0] + '.' + childProperty] === 'undefined') {
                    m[p[0] + '.' + childProperty] = (p[1].items || p[1]).properties[childProperty];
                    m[p[0]] = _.omit(m[p[0]], 'items', 'properties');
                }
                if (!m[p[0] + '.' + childProperty].title && m[p[0] + '.' + childProperty].linkTo){ // If no Title, but yes linkTo, set Title to be Title of linkTo's Schema.
                    m[p[0] + '.' + childProperty].title = getTitleForType(m[p[0] + '.' + childProperty].linkTo);
                }
                //if ( m[p[0] + '.' + childProperty].items && m[p[0] + '.' + childProperty].items.properties )
            });
            return m;
        }, _.clone(tips))
    );

    // Recurse the result.
    if ( // Any more nested levels?
        depth < 4 &&
        _.find(_.pairs(flattened), function(p){
            if (p[1] && ((p[1].items && p[1].items.properties) || (p[1].properties))) return true;
            return false;
        })
    ) flattened = flattenSchemaPropertyToColumnDefinition(flattened, depth + 1);

    return flattened;
}


export function getAbstractTypeForType(type){
    var possibleParentTypes = _.keys(itemTypeHierarchy);
    var i;
    var foundIndex;
    for (i = 0; i < possibleParentTypes.length; i++){
        foundIndex = itemTypeHierarchy[possibleParentTypes[i]].indexOf(type);
        if ( foundIndex > -1 ){
            return possibleParentTypes[i];
        }
    }
    return null;
}


/**
 * Returns the leaf type from the Item's '@type' array.
 *
 * @throws {Error} Throws error if no types array ('@type') or it is empty.
 * @param {Object} context - JSON representation of current Item.
 * @returns {string} Most specific type's name.
 */
export function getItemType(context){
    if (!Array.isArray(context['@type']) || context['@type'].length < 1){
        return null;
        //throw new Error("No @type on Item object (context).");
    }
    return context['@type'][0];
}


/**
 * Returns base Item type from Item's '@type' array. This is the type right before 'Item'.

 * @param {Object} context - JSON representation of current Item.
 * @param {string[]} context['@type] - List of types for the Item.
 * @returns {string} Base Ttem type.
 */
export function getBaseItemType(context){
    var types = context['@type'];
    if (!Array.isArray(types) || types.length === 0) return null;
    var i = 0;
    while (i < types.length){
        if (types[i + 1] === 'Item'){
            return types[i]; // Last type before 'Item'.
        }
        i++;
    }
    return types[i-1]; // Fallback.
}


/**
 * Returns schema for the specific type of Item we're on.
 *
 * @param {string} itemType - The type for which to get schema.
 * @param {Object} [schemas] - Mapping of schemas, by type.
 * @returns {Object} Schema for itemType.
 */
export function getSchemaForItemType(itemType, schemas = null){
    if (typeof itemType !== 'string') return null;
    if (!schemas){
        schemas = (get && get()) || null;
    }
    if (!schemas) return null;
    return schemas[itemType] || null;
}

/**
 * Lookup the title for an Item type, given the entire schemas object.
 *
 * @param {string} atType - Item type.
 * @param {Object} [schemas=null] - Entire schemas object, e.g. as stored in App state.
 * @returns {string} Human-readable title.
 */
export function getTitleForType(atType, schemas = null){
    if (!atType) return null;

    // Grab schemas from Filters if we don't have them but they've been cached into there from App.
    schemas = schemas || (get && get());

    if (schemas && schemas[atType] && schemas[atType].title){
        return schemas[atType].title;
    }

    // Correct baseType to title if not in schemas.
    switch (atType){
        case 'ExperimentSet':
            return 'Experiment Set';
        default:
            return atType;
    }
}

/**
 * Get title for leaf Item type from Item's context + schemas.
 *
 * @export
 * @param {Object} context - JSON representation of Item.
 * @param {Object} [schemas=null] - Schemas object passed down from App.
 * @returns {string} Human-readable Item detailed type title.
 */
export function getItemTypeTitle(context, schemas = null){
    return getTitleForType(getItemType(context), schemas);
}

/**
 * Get title for base Item type from Item's context + schemas.
 *
 * @export
 * @param {Object} context - JSON representation of Item.
 * @param {Object} [schemas=null] - Schemas object passed down from App.
 * @returns {string} Human-readable Item base type title.
 */
export function getBaseItemTypeTitle(context, schemas = null){
    return getTitleForType(getBaseItemType(context), schemas);
}
