'use strict';

import _ from 'underscore';
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import parseDOM from 'html-dom-parser/lib/html-to-dom-server';
import domToReact from 'html-react-parser/lib/dom-to-react';
import patchedConsoleInstance from './patched-console';
import { Field, Term } from './Schemas';
import * as analytics from './analytics';
import { isServerSide } from './misc';
import url from 'url';

var console = patchedConsoleInstance;

/**
 * Convert a link_id, if one exists on param 'object', to an '@id' link.
 * If an '@id' exists already, gets that.
 *
 * @param {Object} o - Must have a 'link_id' or '@id' property. Else will return null.
 * @returns {string|null} The Item's '@id'.
 */
export function atIdFromObject(o){
    if (!o) return null;
    if (typeof o !== 'object') return null;
    if (typeof o['@id'] === 'string') return o['@id'];
    if (typeof o.link_id === 'string') return o.link_id.replace(/~/g, "/");
    return null;
}


export function linkFromItem(item, addDescriptionTip = true, propertyForTitle = 'display_title', elementProps = {}, suppressErrors = false){
    var href = atIdFromObject(item);
    var title = (propertyForTitle && item[propertyForTitle]) || item.display_title || item.title || item.name || href;
    if (!href || !title){
        if (item && typeof item === 'object' && typeof item.error === 'string'){
            return <em>{ item.error }</em>;
        }
        // Uh oh, probably not an Item
        if (!suppressErrors) console.error("Could not get atId for Item", item);
        return null;
    }
    
    var propsToInclude = elementProps && _.clone(elementProps);

    if (typeof propsToInclude.key === 'undefined'){
        propsToInclude.key = href;
    }
    
    if (addDescriptionTip && typeof propsToInclude['data-tip'] === 'undefined' && item.description){
        propsToInclude['data-tip'] = item.description;
        propsToInclude.className = (propsToInclude.className || '') + ' inline-block';
    }
    
    return (
        <a href={href} {...propsToInclude}>{ title }</a>
    );
}


/** Return the properties dictionary from a schema for use as tooltips */
export function tipsFromSchema(schemas, content){
    if (content['@type'] && Array.isArray(content['@type']) && content['@type'].length > 0){
        var type = content['@type'][0];
        return tipsFromSchemaByType(schemas, content['@type'][0]);
    //} else if (content['@id'] && typeof content['@id'] === 'string'){
    //    const lowerCaseType = _.filter(content['@id'].split('/'))[0].replace(/\-/g, '_');
    //    const schemasKeyedByLowerType = _.object(_.map(_.filter(_.values(schemas), function(schm){ return !!(schm.id); }), function(schm){
    //        let schmLowerKey = schm.id.replace('/profiles/', '').replace('.json', '');
    //        return [schmLowerKey, schm];
    //    }));
    //    return tipsFromSchemaByType(schemasKeyedByLowerType, lowerCaseType);
    }
    return {};
}

/** Return the properties dictionary from a schema for use as tooltips */
export function tipsFromSchemaByType(schemas, itemType='ExperimentSet'){
    var tips = {};
    if(itemType && typeof schemas === 'object' && schemas !== null){
        if (schemas[itemType]){
            tips = schemas[itemType].properties;
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
 * @param {boolean} [suppressNotFoundError=false] - If true, will not print a console warning message if no value found.
 * @return {?any} Value corresponding to propertyName.
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

/**
 * Check if parameter is a valid JSON object or array.
 *
 * @param {Object|Array} content - Parameter to test for JSON validity.
 * @returns {boolean} Whether passed in param is JSON.
 * @todo Research if a more performant option might exist for this.
 */
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
 * Sets value to be deeply nested within an otherwise empty object, given a field with dot notation.
 * Use for creating objects for PATCH requests. Does not currently support arrays.
 * If want to update a full object rather than create an empty one, use @see deepExtendObject with output.
 *
 * @param {string|string[]} field   Property name of object of where to nest value, in dot-notation or pre-split into array.
 * @param {*} value                 Any value to nest.
 * @returns {Object} - Object with deepy-nested value.
 * @example
 *   generateSparseNestedProperty('human.body.leftArm.indexFinger', 'Orange') returns
 *   { human : { body : { leftArm : { indexFinger : 'Orange' } } } }
 */
export function generateSparseNestedProperty(field, value){
    if (typeof field === 'string') field = field.split('.');
    if (!Array.isArray(field)) throw new Error("Could not create nested field in object. Check field name.");

    var currObj = {};
    currObj[field.pop()] = value;

    if (field.length === 0) return currObj;
    return generateSparseNestedProperty(field, currObj);
}


/**
 * Performs an IN-PLACE 'deep merge' of a small object (one property per level, max) into a host object.
 *
 * @param {Object} hostObj           Object to merge/insert into.
 * @param {Object} nestedObj         Object whose value to insert into hostObj.
 * @param {number} [maxDepth=10]     Max number of recursions or object depth.
 * @param {number} [currentDepth=0]  Current recursion depth.
 * @returns {boolean} False if failed.
 */
export function deepExtend(hostObj, nestedObj, maxDepth = 10, currentDepth = 0){
    var nKey = Object.keys(nestedObj)[0]; // Should only be 1.
    if (currentDepth > maxDepth){
        // Doubt we'd go this deep... so cancel out
        return false;
    }
    if (typeof hostObj[nKey] !== 'undefined'){
        if (typeof nestedObj[nKey] === 'object' && !Array.isArray(hostObj[nKey]) ){
            return deepExtend(hostObj[nKey], nestedObj[nKey], currentDepth + 1);
        } else {
            // No more nested objects, insert here.
            hostObj[nKey] = nestedObj[nKey];
            return true;
        }
    } else if (typeof nestedObj[nKey] !== 'undefined') {
        // Field doesn't exist on hostObj, but does on nestedObj, == new field.
        hostObj[nKey] = nestedObj[nKey];
        return true;
    } else {
        // Whoops, doesn't seem like fields match.
        return false;
    }
}

/**
 * Extends _child properties_ of first argument object with properties from subsequent objects.
 * All arguments MUST be objects with objects as children.
 */
export function extendChildren(){
    var args    = Array.from(arguments),
        argsLen = args.length;

    if (args.length < 2) return args[0];

    var hostObj = args[0] || {}, // Allow null to be first arg, because why not.
        allKeys = Array.from(
            _.reduce(args.slice(1), function(m, obj){
                _.forEach(_.keys(obj), function(k){
                    m.add(k);
                });
                return m;
            }, new Set())
        );

    _.forEach(allKeys, function(childProperty){
        for (var objIndex = 0; objIndex < argsLen; objIndex++){
            var currObjToCopyFrom = args[objIndex];
            if (typeof currObjToCopyFrom[childProperty] !== 'undefined'){
                if (typeof hostObj[childProperty] === 'undefined'){
                    hostObj[childProperty] = {};
                }
                _.extend(hostObj[childProperty], currObjToCopyFrom[childProperty]);
            }
        }
    });

    return hostObj;
}


/**
 * Deep-clone a given object using JSON stringify/parse.
 * Does not handle or clone references or non-serializable types.
 *
 * @param {Object|Array} obj - JSON to deep-clone.
 * @returns {Object|Array} Cloned JSON.
 */
export function deepClone(obj){
    return JSON.parse(JSON.stringify(obj));
}



export function htmlToJSX(htmlString){
    var nodes, result,
        // Theoretically, esp in modern browsers, almost any tag/element name can be used to create a <div>.
        // So we allow them in our HTML, but exclude elements/tags with numbers, special characters, etc.
        // Except for hardcoded exceptions defined here in someTags.
        someTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    try {
        nodes = parseDOM(htmlString, { decodeEntities: true, lowerCaseAttributeNames: false });
    } catch (e) {
        console.error('HTML parsing error', e);
        return <div className="error">Parsing Error. Check your markup.</div>;
    }

    /**
     * Filters out nodes and node children recursively if detect an invalid tag name.
     * Also removes any <script> tags.
     */
    function filterNodes(nodeList){
        return _.filter(
            _.map(nodeList, function(n){
                if (n.type === 'tag'){
                    if (someTags.has(n.name)) return n;

                    // Exclude scripts due to security vulnerability potential.
                    if (n.name === 'script') return null;

                    // Filter out nonsensical tags which will likely break React, e.g. <hr?>
                    var match = n.name.match(/[\W\s\d]/);
                    if (match && (match.length > 1 || match[0] !== '/')){
                        return null;
                    }

                    // Recurse on children
                    if (Array.isArray(n.children)) {
                        n = _.extend({}, n, { 'children' : filterNodes(n.children) });
                    }
                }
                return n;
            })
        );
    }

    try {
        result = domToReact(filterNodes(nodes));
    } catch (e) {
        console.error('HTML parsing error', e);
        return <div className="error">Parsing Error. Check your markup.</div>;
    }

    return result;
}



/**
 * Check if param is in form of an @id. Doesn't validate whether proper collection, etc. just URL format.
 *
 * @param {string} value - String to test.
 * @returns {boolean} - Whether is valid-ish.
 */
export function isValidAtIDFormat(value){
    return (
        value && typeof value === 'string' && value.length > 3 &&
        value.charAt(0) === '/' && value[value.length - 1] === '/' &&
        (value.match(/\//g) || []).length === 3
    );
}

/**
 * Performs a rudimentary check on an object to determine whether it is an Item.
 * Checks for presence of properties 'display_title' and '@id'.
 * 
 * @param {Object} content - Object to check.
 * @returns {boolean} Whether 'content' param is (likely to be) an Item.
 */
export function isAnItem(content){
    return (
        content &&
        typeof content === 'object' &&
        (typeof content.display_title === 'string' || typeof content.uuid === 'string') &&
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

export function isUUID(uuid){
    try {
        uuid = assertUUID(uuid);
        return true;
    } catch (e){
        return false;
    }
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
        'itemType' : PropTypes.string,
        'schemas' : PropTypes.object
    }

    render(){
        var { elementType, title, property, result, schemas, tips, fallbackTitle, itemType } = this.props;
        var schemaProperty = null;
        var tooltip = null;
        if (tips){
            if (typeof tips === 'string'){
                tooltip = tips;
            } else {
                tooltip = (tips && tips[property] && tips[property].description) || null;
            }
            if (!title) title = (tips && tips[property] && tips[property].title) || null;
        }
        if (!title || !tooltip) {
            try {
                schemaProperty = Field.getSchemaProperty(property, schemas, itemType || result['@type'][0]);
            } catch (e){
                console.warn('Failed to get schemaProperty', itemType, property);
            }
            tooltip = (schemaProperty && schemaProperty.description) || null;
            if (!title) title = (schemaProperty && schemaProperty.title) || null;
        }
        
        

        return <TooltipInfoIconContainer {...this.props} tooltip={tooltip} title={title || fallbackTitle || property} elementType={this.props.elementType} />;
    }
}

/**
 * Use this Component to generate a 'copy' button.
 * 
 * @prop {string} value - What to copy to clipboard upon clicking the button.
 * @prop {boolean} [flash=true] - Whether to do a 'flash' effect of the button and children wrapper on click.
 * @prop {JSX.Element[]} [children] - What to wrap and present to the right of the copy button. Optional. Should be some formatted version of 'value' string, e.g. <span className="accession">{ accession }</span>.
 * @prop {string|React.Component} [wrapperElement='div'] - Element type to wrap props.children in, if any.
 */
export class CopyWrapper extends React.Component {

    static defaultProps = {
        'wrapperElement' : 'div',
        'className' : null,
        'flash' : true,
        'iconProps' : {},
        'includeIcon' : true,
        'flashActiveTransform' : 'scale3d(1.2, 1.2, 1.2) translate3d(0, 0, 0)',
        'flashInactiveTransform' : 'translate3d(0, 0, 0)'
    }

    static copyToClipboard(value, successCallback = null, failCallback = null){
        var textArea = document.createElement('textarea');
        textArea.style.top = '-100px';
        textArea.style.left = '-100px';
        textArea.style.position = 'absolute';
        textArea.style.width = '5px';
        textArea.style.height = '5px';
        textArea.style.padding = 0;
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';

        // Avoid flash of white box if rendered for any reason.
        textArea.style.background = 'transparent';
        textArea.value = value;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
            if (typeof successCallback === 'function'){
                return successCallback(value);
            }
            return true;
        } catch (err) {
            console.error('Oops, unable to copy', err);
            if (typeof failCallback === 'function'){
                return failCallback(value);
            }
            return false;
        }
    }

    constructor(props){
        super(props);
        this.flashEffect = this.flashEffect.bind(this);
        if (typeof props.mounted !== 'boolean') this.state = { 'mounted' : false };
    }

    componentDidMount(){
        if (typeof this.props.mounted !== 'boolean') this.setState({ 'mounted' : true });
        ReactTooltip.rebuild();
    }

    componentDidUpdate(){
        ReactTooltip.rebuild();
    }

    flashEffect(){
        var wrapper = this.refs.wrapper;
        if (!this.props.flash || !this.refs || !wrapper) return null;

        if (typeof this.props.wrapperElement === 'function'){
            // Means we have a React component vs a React/JSX element.
            wrapper = ReactDOM.findDOMNode(wrapper);
        }

        if (!wrapper) return null;

        wrapper.style.transform = this.props.flashActiveTransform;
        setTimeout(()=>{
            wrapper.style.transform = this.props.flashInactiveTransform;
        }, 100);
    }

    onCopy(){
        this.flashEffect();
        if (typeof this.props.onCopy === 'function') this.props.onCopy();
    }

    render(){
        var { value, children, mounted, wrapperElement, iconProps, includeIcon } = this.props;
        if (!value) return null;
        var isMounted = (mounted || (this.state && this.state.mounted)) || false;

        var copy = (e) => {
            return CopyWrapper.copyToClipboard(value, (v)=>{
                this.onCopy();
                analytics.event('CopyWrapper', 'Copy', {
                    'eventLabel' : 'Value',
                    'name' : v
                });
            }, (v)=>{
                analytics.event('CopyWrapper', 'ERROR', {
                    'eventLabel' : 'Unable to copy value',
                    'name' : v
                });
            });
        };

        var elemsToWrap = [];
        if (children)                   elemsToWrap.push(children);
        if (children && isMounted)      elemsToWrap.push(' ');
        if (isMounted && includeIcon)   elemsToWrap.push(<i {...iconProps} key="copy-icon" className="icon icon-fw icon-copy" title="Copy to clipboard" />);

        var wrapperProps = _.extend(
            {
                'ref'       : 'wrapper',
                'style'     : { 'transition' : 'transform .4s', 'transformOrigin' : '50% 50%' },
                'className' : 'clickable copy-wrapper ' + this.props.className || '',
                'onClick'   : copy
            },
            _.omit(this.props, 'children', 'style', 'value', 'onCopy', 'mounted', ..._.keys(CopyWrapper.defaultProps))
        );

        return React.createElement(wrapperElement, wrapperProps, elemsToWrap);
    }
}



/**
 * Functions which are specific to Items [structure] in the 4DN/Encoded database. Some are just aliased from functions above for now for backwards compatibility.
 * Contains sections for Aliases, Functions, and Secondary Dictionaries of functions (e.g. for 'User').
 */
export const itemUtil = {

    // Aliases

    isAnItem        : isAnItem,
    generateLink    : linkFromItem,
    atId            : atIdFromObject,



    // Funcs

    /**
     * Function to determine title for each Item object.
     * 
     * @param {Object} props - Object containing props commonly supplied to Item page. At minimum, must have a 'context' property.
     * @returns {string} Title string to use.
     */
    titleFromProps : function(props) {
        var title = itemUtil.getTitleStringFromContext(props.context || {});
        if (!title && props.href){
            title = url.parse(props.href).path;
        }
        return title || null;
    },

    /**
     * Get Item title string from a context object (JSON representation of Item).
     * 
     * @param {Object} context - JSON representation of an Item object.
     * @returns {string} The title.
     */
    getTitleStringFromContext : function(context){
        return (
            context.display_title   ||
            context.title           ||
            context.name            ||
            context.download        ||
            context.accession       ||
            context.uuid            ||
            ( typeof context['@id'] === 'string' ? context['@id'] :
                null //: 'No title found'
            )
        );
    },

    /**
     * Determine whether the title which is displayed is an accession or not.
     * Use for determining whether to include accession in ItemHeader.TopRow.
     * 
     * @param {Object} context          JSON representation of an Item object.
     * @param {string} [displayTitle]   Display title of Item object. Gets it from context if not provided.
     * @returns {boolean} If title is an accession (or contains it).
     */
    isDisplayTitleAccession : function(context, displayTitle = null, checkContains = false){
        if (!displayTitle) displayTitle = itemUtil.getTitleStringFromContext(context);
        if (context.accession && context.accession === displayTitle) return true;
        if (checkContains && displayTitle.indexOf(context.accession) > -1) return true;
        return false;
    },

    /**
     * Compare two arrays of Items to check if they contain the same Items, by their @id.
     * Does _NOT_ compare the fields within each Item (e.g. to detect changed or more 'complete').
     * 
     * @param {Object[]} listA      1st list of Items to compare.
     * @param {Object[]} listB      2nd list of Items to compare.
     * @returns {boolean} True if equal.
     */
    compareResultsByID : function(listA, listB){
        var listALen = listA.length;
        if (listALen !== listB.length) return false;
        for (let i = 0; i < listALen; i++){
            if (atIdFromObject(listA[i]) !== atIdFromObject(listB[i])) return false;
        }
        return true;
    },


    /**
     * Performs a `_.uniq` on list of Items by their @id.
     *
     * @param {Item[]} items - List of Items to unique.
     * @returns {Item[]} Uniqued list.
     */
    uniq : function(items){
        return _.uniq(items, false, function(o){ return atIdFromObject(o);  } );
    },


    // Secondary Dictionaries -- functions by Item type.

    User : {

        /**
         * Generate a URL to get Gravatar image from Gravatar service.
         *
         * @param {string} email                    User's email address.
         * @param {number} size                     Width & height of image square.
         * @param {string} [defaultImg='retro']     Style of Gravatar image.
         * @returns {string} A URL.
         */
        buildGravatarURL : function(email, size=null, defaultImg='retro'){
            var md5 = require('js-md5');
            if (defaultImg === 'kanye') defaultImg = 'https://media.giphy.com/media/PcFPiuGZVqK2I/giphy.gif'; // Easter egg-ish option.
            var url = 'https://www.gravatar.com/avatar/' + md5(email);
            url += "?d=" + defaultImg;
            if (size) url += '&s=' + size;
            return url;
        },

        /**
         * Generate an <img> element with provided size, className, and Gravatar src.
         *
         * @param {string} email                    User's email address.
         * @param {number} size                     Width & height of image square.
         * @param {Object} props                    Extra element props for <img> element returned.
         * @param {string} [defaultImg='retro']     Style of Gravatar image.
         * @returns {Element} A React Image (<img>) element.
         */
        gravatar(email, size=null, props={}, defaultImg='retro'){
            return <img title="Obtained via Gravatar" {...props} src={itemUtil.User.buildGravatarURL(email, size, defaultImg)} className={'gravatar' + (props.className ? ' ' + props.className : '')} />;
        },


        /**
         * Definitions for regex validators.
         *
         * @public
         * @constant
         */
        localRegexValidation : {
            /**
             * http://www.regular-expressions.info/email.html -> changed capital A to lowercase
             *
             * @public
             * @constant
             */
            email : '^[a-Z0-9][a-Z0-9._%+-]{0,63}@(?:(?=[a-Z0-9-]{1,63}\.)[a-Z0-9]+(?:-[a-Z0-9]+)*\.){1,8}[a-Z]{2,63}$',
            /**
             * Digits only, with optional extension (space + x, ext, extension + [space?] + 1-7 digits) and
             * optional leading plus sign (for international).
             *
             * @public
             * @constant
             */
            phone : '[+]?[\\d]{10,36}((\\sx|\\sext|\\sextension)(\\s)?[\\d]{1,7})?$'
        }

    }

};
