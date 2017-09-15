'use strict';

import _ from 'underscore';
import React from 'react';
import PropTypes from 'prop-types';


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


export function linkFromItem(item, propertyForTitle = 'display_title', elementProps){
    var href = atIdFromObject(item);
    var title = item[propertyForTitle] || item.display_title || item.title || item.name;
    if (!href || !title){
        if (item && typeof item === 'object' && typeof item.error === 'string'){
            return <em>{ item.error }</em>;
        }
        // Uh oh, probably not an Item
        console.error("Could not get atId for Item", item);
        return null;
    }
    return (
        <a href={href} {...elementProps}>{ title }</a>
    );
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
    var errorMsg;
    if (typeof propertyName === 'string') propertyName = propertyName.split('.'); 
    if (!Array.isArray(propertyName)){
        errorMsg = 'Using improper propertyName "' + propertyName + '" in object.getNestedProperty.';
        console.error(errorMsg);
        return null;
    }
    if (!object || typeof object !== 'object'){
        errorMsg = 'Not valid object.';
        console.error(errorMsg);
        return null;
    }
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
        errorMsg = 'Could not get ' + propertyName.join('.') + ' from nested object.';
        if (!suppressNotFoundError) console.warn(errorMsg);
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

export function isAnItem(content){
    return (
        content &&
        typeof content === 'object' &&
        typeof content.display_title === 'string' &&
        typeof atIdFromObject(content) === 'string'
    );
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

/**
 * Assert that param passed in & returned is in UUID format.
 * 
 * @param {string} uuid - UUID string to be asserted.
 * @returns {string} Original UUID string (uuid param) if in valid form.
 * @throws Error if not in valid UUID format.
 */
export function assertUUID(uuid){
    if (typeof uuid !== 'string') throw new Error('UUID is not a string!');
    var parts = uuid.split('-');
    if (parts.length !== 5) {
        throw new Error("UUID string passed is in invalid format (should be 5 segments of characters delimited by dashes).");
    }
    if (parts[0].length !== 8 || parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4 || parts[4].length !== 12) throw new Error('Incorrect UUID format.');
    return uuid;
}

export function isAccessionRegex(accessionStr){
    if (accessionStr.match(/^4DN(EX|ES|FI|FS|SR|BS|IN|WF)[1-9A-Z]{7}$/)){
        return true;
    }
    return false;
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


export class TooltipInfoIconContainer extends React.Component {
    render(){
        var { elementType, title, tooltip, className } = this.props;
        return React.createElement(elementType || 'div', {
            'className' : "tooltip-info-container" + (typeof className === 'string' ? ' ' + className : '')
        }, (
            <span>{ title }&nbsp;{ typeof tooltip === 'string' ?
                <i data-tip={tooltip} className="icon icon-info-circle"/>
            : null }</span>
        ));
    }
}

export class TooltipInfoIconContainerAuto extends React.Component {

    static propTypes = {
        'property' : PropTypes.string.isRequired,
        'title' : PropTypes.oneOfType([ PropTypes.string, PropTypes.element ]),
        'result' : PropTypes.shape({
            '@type' : PropTypes.array.isRequired
        }).isRequired,
        'schemas' : PropTypes.object.isRequired
    }

    render(){
        var { elementType, title, property, result, schemas, tips, fallbackTitle } = this.props;
        if (!tips){
            tips = tipsFromSchema(schemas, result);
        }
        var tooltip = (tips && tips[property] && tips[property].description) || null;
        if (!title){
            title = (tips && tips[property] && tips[property].title) || null;
        }

        return <TooltipInfoIconContainer tooltip={tooltip} title={title || fallbackTitle || property} elementType={this.props.elementType} />;
    }
}
