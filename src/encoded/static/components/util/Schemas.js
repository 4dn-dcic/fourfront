'use strict';

import _ from 'underscore';
import url from 'url';


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


export const Term = {

    toName : function(field, term){
        var name = null;

        switch (field) {
            case 'experimentset_type':
                name = Term.capitalizeSentence(term);
                break;
            case 'type':
                name = getTitleForType(term);
                break;
            default:
                name = null;
                break;
        }

        // Remove 'experiments_in_set' and test as if an experiment field. So can work for both ?type=Experiment, ?type=ExperimentSet.
        if (typeof name === 'string') return name;
        var standardizedFieldKey = field.replace('experiments_in_set.', '');

        switch (standardizedFieldKey) {
            case 'biosample.biosource.individual.organism.name':
                name = Term.capitalize(term);
                break;
            case 'biosample.biosource.biosource_type':
                name = Term.capitalizeSentence(term);
                break;
            default:
                name = null;
                break;
        }

        if (typeof name !== 'string') name = term;

        return name;
    },

    capitalize : function(word)        {
        if (typeof sen !== 'string') return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    },
    capitalizeSentence : function(sen) {
        if (typeof sen !== 'string') return sen;
        return sen.split(' ').map(Term.capitalize).join(' ');
    }

};


export const Field = {

    nameMap : {
        'experiments_in_set.biosample.biosource.individual.organism.name' : 'Organism',
        'accession' : 'Experiment Set',
        'experiments_in_set.digestion_enzyme.name' : 'Enzyme',
        'experiments_in_set.biosample.biosource_summary' : 'Biosource',
        'experiments_in_set.lab.title' : 'Lab',
        'experimentset_type' : 'Set Type'
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

            if (linkToName === 'Experiment'){
                return combineSchemaPropertiesFor(['Experiment', 'ExperimentRepliseq', 'ExperimentHiC', 'ExperimentCaptureC']);
            } else if (linkToName === 'Individual'){
                return combineSchemaPropertiesFor(['Individual', 'IndividualHuman', 'ExperimentHiC', 'IndividualMouse']);
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
            } else if (property.linkTo) {
                nextSchemaProperties = getNextSchemaProperties(property.linkTo);
            }

            if (nextSchemaProperties) return getProperty(nextSchemaProperties, fieldPartIndex + 1);
        }

        return getProperty(baseSchemaProperties, 0);

    }

};


export const itemTypeHierarchy = {
    'Experiment': [
        'Experiment', 'ExperimentHiC', 'ExperimentMic', 'ExperimentCaptureC', 'ExperimentRepliseq'
    ],
    'ExperimentSet': [
        'ExperimentSet', 'ExperimentSetReplicate'
    ],
    'File': [
        'File', 'FileCalibration', 'FileFasta', 'FileFastq', 'FileProcessed', 'FileReference'
    ],
    'FileSet': [
        'FileSet', 'FileSetCalibration'
    ],
    'Individual': [
        'Individual', 'IndividualHuman', 'IndividualMouse'
    ],
    'Treatment': [
        'Treatment', 'TreatmentChemical', 'TreatmentRnai'
    ]
};


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