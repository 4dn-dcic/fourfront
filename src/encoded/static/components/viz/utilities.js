'use strict';

import React from 'react';
import _ from 'underscore';
import * as d3 from 'd3';
import { console, isServerSide } from './../util';

/**
 * Utility functions for aiding with visualizations.
 * 
 * @module {Object} viz/utilities
 */

/** @alias module:viz/utilities */

/** 
 * Taken from http://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
 * 
 * @param {string} str - String to generate a color form.
 * @returns {string} A CSS color.
 */
export function stringToColor(str) {
    var hash = 0;
    var i;
    for (i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}


/** 
 * Helper function for window.requestAnimationFrame. Falls back to browser-prefixed versions if default not available, or falls back to setTimeout with 0ms delay if no requestAnimationFrame available at all.
 * 
 * @param {function} cb - Callback method.
 * @returns {undefined|string} Undefined or timeout ID if falling back to setTimeout.
 */
export function requestAnimationFrame(cb){
    if (!isServerSide() && typeof window !== 'undefined'){
        if (typeof window.requestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
        if (typeof window.webkitRequestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
        if (typeof window.mozRequestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
    }
    return setTimeout(cb, 0);
}


export function extendStyleOptions(propsStyleOpts, defaultStyleOpts){
    if (!defaultStyleOpts) throw new Error("No default style options provided.");
    if (!propsStyleOpts) return defaultStyleOpts;
    else {
        Object.keys(defaultStyleOpts).forEach((styleProp) => {
            if (typeof propsStyleOpts[styleProp] === 'undefined') return;
            if (typeof propsStyleOpts[styleProp] === 'object' && propsStyleOpts[styleProp]){
                _.extend(defaultStyleOpts[styleProp], propsStyleOpts[styleProp]);
            } else {
                defaultStyleOpts[styleProp] = propsStyleOpts[styleProp];
            }
        });
        return defaultStyleOpts;
    }
}


export function transformBarPlotAggregationsToD3CompatibleHierarchy(rootField, aggregateType = 'experiment_sets'){

    function genChildren(currField){
        return _.map(_.pairs(currField.terms), function(term_pair){
            var termName = term_pair[0];
            var termObj = term_pair[1];
            var isLeafTerm = typeof termObj.experiment_sets === 'number' && typeof termObj.field === 'undefined';
            if (isLeafTerm){
                return {
                    'name' : termName,
                    'size' : termObj[aggregateType]
                };
            } else if (typeof termObj.terms === 'object' && termObj.terms) { // Double check that not leaf (have sub-terms)
                return {
                    'name' : termName,
                    'children' : genChildren(termObj)
                };
            } else {
                return {
                    'name' : termName,
                    'size' : termObj.total && typeof termObj.total[aggregateType] === 'number' ? termObj.total[aggregateType] : 1
                };
            }
    
        });
    }

    return {
        'name' : rootField.field,
        'children' : genChildren(rootField)
    };

}


export const style = {
    
    translate3d : function(x=0, y=0, z=0, append = 'px'){
        if (!append) append = '';
        return 'translate3d(' + x + append + ',' + y + append + ',' + z + append + ')';
    },

    translate : function(x=0, y=0, append = 'px'){
        if (!append) append = '';
        return 'translate(' + x + append + ',' + y + append + ')';
    },

    /** 
     * @param {number} rotation - How much to rotate, in degrees.
     * @param {string|string[]|Object} [axes='z'] - Axes around which to rotate.
     */
    rotate3d : function(rotation, axes=['z']){
        if (typeof axes === 'string') axes = axes.split(',').map(function(axis){ return axis.trim(); });
        if (Array.isArray(axes)) axes = _.extend({ 'x': 0 , 'y': 0, 'z': 0 }, _.object(axes.map(function(axis){ return [axis, 1]; })));
        return 'rotate3d(' + axes.x + ',' + axes.y + ',' + axes.z + ',' + rotation + 'deg)';
    },

    scale3d : function(x=1, y=null, z=null){
        if (!y) y = x;
        if (!z) z = 1;
        return 'scale3d(' + x + ',' + y + ',' + z + ')';
    }
};


/** Functions which are to be called from Chart instances with .apply(this, ...) */
export const mixin = {

    getBreadcrumbs : function(){
        if (this.refs && typeof this.refs.breadcrumbs !== 'undefined') return this.refs.breadcrumbs;
        if (this.props.breadcrumbs && typeof this.props.breadcrumbs === 'function') {
            return this.props.breadcrumbs();
        }
        if (this.props.breadcrumbs && typeof this.props.breadcrumbs !== 'boolean') {
            return this.props.breadcrumbs;
        }
        return null;
    },

    getDescriptionElement : function(){
        if (this.refs && typeof this.refs.description !== 'undefined') return this.refs.description;
        if (this.props.descriptionElement && typeof this.props.descriptionElement === 'function') {
            return this.props.descriptionElement();
        }
        if (this.props.descriptionElement && typeof this.props.descriptionElement !== 'boolean') {
            return this.props.descriptionElement;
        }
        return null;
    },

    cancelPreventClicks : function(){
        if (typeof this.props.getCancelPreventClicksCallback === 'function'){
            var cancelPreventClicks = this.props.getCancelPreventClicksCallback();
            if (typeof cancelPreventClicks === 'function') return cancelPreventClicks();
        }
        return false;
    }

};



const highlightTermFxn = _.debounce(function(
    field = 'experiments_in_set.biosample.biosource.individual.organism.name',
    term = 'human',
    color = ''
){

    if (isServerSide()) return false;
    if (!document.querySelectorAll) return false;

    function setHighlightClass(el, off = false){
        var isSVG, className;
        //if (el.nodeName.toLowerCase() === 'path') console.log(el);
        if (el.className.baseVal) {
            isSVG = true;
            className = el.className.baseVal;
            //if (el.nodeName.toLowerCase() === 'path')console.log('isSVG', off);
        } else {
            isSVG = false;
            className = el.className;
        }

        if (el.classList && el.classList.add){
            if (!off) el.classList.add('highlight');
            else el.classList.remove('highlight');
            return isSVG;
        }

        if (!off){
            if (className.indexOf(' highlight') < 0) className = className + ' highlight';
        } else {
            if (className.indexOf(' highlight') > -1)   className = className.replace(' highlight', '');
        }

        if (isSVG)  el.className.baseVal = className;
        else        el.className = className;
        return isSVG;
    }

    requestAnimationFrame(function(){

        var colorIsSet =
            (color === null || color === false) ? false :
            (typeof color === 'string') ? color.length > 0 :
            (typeof color === 'object') ? true : false;

        _.each(document.querySelectorAll('[data-field]:not(.no-highlight)'), function(fieldContainerElement){
            setHighlightClass(fieldContainerElement, true);
        });

        if (colorIsSet){
            _.each(document.querySelectorAll('[data-field' + (field ? '="' + field + '"' : '') + ']:not(.no-highlight)'), function(fieldContainerElement){
                setHighlightClass(fieldContainerElement, false);
            });
        }

        // unhighlight previously selected terms, if any.
        _.each(document.querySelectorAll('[data-term]:not(.no-highlight)'), function(termElement){
            var dataField = termElement.getAttribute('data-field');
            if (field && dataField && dataField === field) return; // Skip, we need to leave as highlighted as also our field container.
            var isSVG = setHighlightClass(termElement, true);
            if (!isSVG && termElement.className.indexOf('no-highlight-color') === -1) termElement.style.backgroundColor = '';
        });

        if (colorIsSet){
            _.each(document.querySelectorAll('[data-term="' + term + '"]:not(.no-highlight)'), function(termElement){
                var isSVG = setHighlightClass(termElement, false);
                if (!isSVG && termElement.className.indexOf('no-highlight-color') === -1) termElement.style.backgroundColor = color;
            });
        }

    });
    return true;

}, 50);


/**
 * Highlights all terms on document (changes background color) of given field,term.
 * @param {string} field - Field, in object dot notation.
 * @param {string} term - Term to highlight.
 * @param {string} color - A valid CSS color.
 */
export function highlightTerm(
    field = 'experiments_in_set.biosample.biosource.individual.organism.name',
    term = 'human',
    color = ''
){
    return highlightTermFxn.apply(this, arguments);
}

/**
 * Resets background color of terms.
 */
export function unhighlightTerms(field = null){
    return highlightTermFxn(field, null, '');
}

