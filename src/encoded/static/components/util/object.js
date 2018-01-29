'use strict';

import _ from 'underscore';
import React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { Field } from './Schemas';
import * as analytics from './analytics';
import { isServerSide } from './misc';


/**
 * Convert a link_id, if one exists on param 'object', to an '@id' link.
 * If an '@id' exists already, gets that.
 * 
 * @param {Object} object - Must have a 'link_id' or '@id' property. Else will return null.
 * @returns {string|null} The Item's '@id'.
 */
export function atIdFromObject(o){
    if (!o) return null;
    if (typeof o !== 'object') return null;
    if (typeof o['@id'] === 'string') return o['@id'];
    if (typeof o.link_id === 'string') return o.link_id.replace(/~/g, "/");
    return null;
}


export function linkFromItem(item, addDescriptionTip = true, propertyForTitle = 'display_title', elementProps, suppressErrors = false){
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
    
    var propsToInclude = elementProps && _.clone(elementProps) || {};

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
    if(content['@type'] && Array.isArray(content['@type']) && content['@type'].length > 0){
        var type = content['@type'][0];
        return tipsFromSchemaByType(schemas, content['@type'][0]);
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

// Found on SO. TODO: Propagate into places where it could be used for DRYness.
export function serializeObjectToURLQuery(obj){
    var str = [];
    for(var p in obj)
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    return str.join("&");
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
        'iconProps' : {}
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
        if (!this.props.flash || !this.refs || !this.refs.wrapper) return null;
        this.refs.wrapper.style.transform = 'scale3d(1.2, 1.2, 1.2) translate3d(10%, 0, 0)';
        setTimeout(()=>{
            this.refs.wrapper.style.transform = 'translate3d(0, 0, 0)';
        }, 100);
    }

    onCopy(){
        this.flashEffect();
        if (typeof this.props.onCopy === 'function') this.props.onCopy();
    }

    render(){
        var { value, children, mounted, wrapperElement, iconProps } = this.props;
        if (!value) return null;
        var isMounted = (mounted || (this.state && this.state.mounted)) || false;

        function copy(){
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
                this.onCopy();
                analytics.event('CopyWrapper', 'Copy', {
                    'eventLabel' : 'Value',
                    'name' : value
                });
            } catch (err) {
                console.error('Oops, unable to copy',err);
                analytics.event('CopyWrapper', 'ERROR', {
                    'eventLabel' : 'Unable to copy value',
                    'name' : value
                });
            }
        }

        var elemsToWrap = [];
        if (children)               elemsToWrap.push(children);
        if (children && isMounted)  elemsToWrap.push(' ');
        if (isMounted)              elemsToWrap.push(<i {...iconProps} className="icon icon-fw icon-copy clickable" title="Copy to clipboard" onClick={copy.bind(this)} />);

        var wrapperProps = _.extend(
            { 'ref' : 'wrapper', 'style' : { 'transition' : 'transform .4s', 'transformOrigin' : '50% 50%' }, 'className' : 'copy-wrapper ' + this.props.className || '' },
            _.omit(this.props, 'refs', 'children', 'style', 'value', 'onCopy', 'flash', 'wrapperElement', 'mounted', 'iconProps')
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

    isAnItem : isAnItem,
    generateLink : linkFromItem,
    atId : atIdFromObject,



    // Funcs

    /**
     * Function to determine title for each Item object.
     * 
     * @param {Object} props - Object containing props commonly supplied to Item page. At minimum, must have a 'context' property.
     * @returns {string} Title string to use.
     */
    titleFromProps : function(props) {
        var context = props.context;
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
     * Get Item title string from a context object (JSON representation of Item).
     * 
     * @param {Object} context - JSON representation of an Item object.
     * @returns {string} The title.
     */
    getTitleStringFromContext : function(context){
        return itemUtil.titleFromProps({'context' : context});
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
        }

    }

};
