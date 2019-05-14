'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { isServerSide } from './misc';
import * as d3 from 'd3'; // TODO change to only import d3.select and d3.interpolateNumber

/**
 * Most of these functions should not be run from a component until it has mounted as they do not work
 * on serverside (depend on window, document, DOM, etc.)
 */

/** Get distance from top of browser viewport to an element's top. */
export function getElementTop(el){
    if (!(typeof window !== 'undefined' && window && document && document.body)) return null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    var bodyRect = document.body.getBoundingClientRect();
    var boundingRect = el.getBoundingClientRect();
    return boundingRect.top - bodyRect.top;
}

export function getElementOffset(el){
    if (!(typeof window !== 'undefined' && window && document && document.body)) return null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    var bodyRect = document.body.getBoundingClientRect();
    var boundingRect = el.getBoundingClientRect();
    return {
        'top' : boundingRect.top - bodyRect.top,
        'left' : boundingRect.left - bodyRect.left
    };
}

export function getElementOffsetFine(el) {
    var x = 0;
    var y = 0;

    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
        // FF & IE don't support body's scrollTop - use window instead
        x += el.offsetLeft - (el.tagName === 'BODY' ? window.pageXOffset : el.scrollLeft);
        y += el.offsetTop - (el.tagName === 'BODY' ? window.pageYOffset : el.scrollTop);
        el = el.offsetParent;
    }

    return { left: x, top: y };
}

/**
 * Shorten a string to a maximum character length, splitting on word break (or other supplied character).
 * Optionally append an ellipsis.
 *
 * @param {string}  originalText
 * @param {number}  maxChars
 * @param {boolean} [addEllipsis=true]
 * @param {string}  [splitOn=' ']
 */
export const shortenString = memoize(function(originalText, maxChars = 28, addEllipsis = true, splitOn = ' '){
    var textArr         = originalText.split(splitOn),
        nextLength,
        returnArr       = [],
        returnStrLen    = 0;

    while (typeof textArr[0] === 'string'){
        nextLength = textArr[0].length + splitOn.length;
        if (returnStrLen + nextLength <= maxChars){
            returnArr.push(textArr.shift());
            returnStrLen += nextLength;

        } else break;
    }
    if (textArr.length === 0) return originalText;
    return returnArr.join(splitOn) + (addEllipsis ? '...' : '');
});

/**
 * Get current grid size, if need to sidestep CSS.
 * Keep widths in sync with stylesheet, e.g. $screen-sm-min, $screen-md-min, & $screen-lg-min
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {string} - Abbreviation for column/grid Bootstrap size, e.g. 'lg', 'md', 'sm', or 'xs'.
 */
export const responsiveGridState = memoize(function(width = null){
    if (typeof width !== 'number') {
        // Assumed to be null or undefined which should mean we are
        // server-side or not yet mounted.
        return 'lg';
    }
    if (width >= 1200) return 'lg';
    if (width >= 992) return 'md';
    if (width >= 768) return 'sm';
    return 'xs';
});


/**
 * Get the width of what a 12-column bootstrap section would be in current viewport size.
 * Keep widths in sync with stylesheet, e.g.
 * $container-tablet - $grid-gutter-width,
 * $container-desktop - $grid-gutter-width, and
 * $container-large-desktop - $grid-gutter-width
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @param {number} [windowWidth] Optional current window width to supply.
 * @return {integer}
 */
export function gridContainerWidth(windowWidth = null){
    // Subtract 20 for padding/margins.
    switch(responsiveGridState(windowWidth)){
        case 'lg': return 1140;
        case 'md': return 940;
        case 'sm': return 720;
        case 'xs':
            if (isServerSide()) return 400;
            return (windowWidth || window.innerWidth) - 20;
    }
}


/**
 * Check width of text if it were to fit on one line.
 * Must only be called client-side. Will throw error server-side.
 *
 * @param {string} textContent - Either text or text-like content, e.g. with span elements.
 * @param {string} [font] - Font to use/measure. Include font-size. Defaults to "1rem 'Work Sans'".
 * @param {boolean} [roundToPixel] - Whether to round result up.
 * @return {integer} - Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
 */
export const textWidth = memoize(function(
    textContent,
    font = "1rem 'Work Sans'",
    roundToPixel = false
){
    var canvas, context, width;

    try {
        // Attempt to use HTML5 canvas for sub-pixel accuracy, no DOM update, etc.
        canvas = textWidth.canvas || (textWidth.canvas = document.createElement("canvas"));
        context = canvas.getContext("2d");
        context.font = font;
        var metrics = context.measureText(textContent);
        width = metrics.width;
    } catch (e){
        // Fallback to older DOM-based check.
        console.warn("Failed to get text width with HTML5 canvas method, falling back to DOM method.");
        width = textContentWidth(
            textContent,
            'div',
            null,
            null,
            { 'font' : font }
        );
    }
    if (roundToPixel){
        return Math.floor(width) + 1;
    } else {
        return width;
    }
});


export const textHeight = memoize(function(
    textContent = "Some String",
    width = 200,
    containerClassName = null,
    style = null,
    containerElement = null
){
    var height, contElem;
    if (containerElement && typeof containerElement.cloneNode === 'function'){
        contElem = containerElement.cloneNode(false);
    } else {
        contElem = document.createElement('div');
    }
    contElem.className = "off-screen " + (containerClassName || '');
    contElem.innerHTML = textContent;
    if (style){
        _.extend(contElem.style, style);
    }
    contElem.style.display = "block";
    contElem.style.width = width + "px";
    if (containerElement && containerElement.parentElement){
        containerElement.parentElement.appendChild(contElem);
        height = contElem.clientHeight;
        containerElement.parentElement.removeChild(contElem);
    } else {
        document.body.appendChild(contElem);
        height = contElem.clientHeight;
        document.body.removeChild(contElem);
    }
    return height;
});


/**
 * Check width of text or text-like content if it were to fit on one line.
 *
 * @param {string} textContent                      Either text or text-like content, e.g. with span elements.
 * @param {string} [containerElementType="div"]     Type of element to fit into, e.g. 'div' or 'p'.
 * @param {?string} [containerClassName=null]       ClassName of containing element, e.g. with 'text-large' to use larger text size.
 * @param {?integer} [widthForHeightCheck=null]     If provided, will return an object which will return height of text content when constrained to width.
 * @param {?Object} [style=null]                    Any additional style properties.
 * @return {integer|{ containerHeight: number, textWidth: number }} Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
 */
export const textContentWidth = memoize(function(
    textContent,
    containerElementType = 'div',
    containerClassName = null,
    widthForHeightCheck = null,
    style = null
){
    var contElem = document.createElement(containerElementType);
    contElem.className = "off-screen " + (containerClassName || '');
    contElem.innerHTML = textContent;
    if (style) contElem.style = style;
    contElem.style.whiteSpace = "nowrap";
    document.body.appendChild(contElem);
    var textLineWidth = contElem.clientWidth;
    var fullContainerHeight;
    if (widthForHeightCheck){
        contElem.style.whiteSpace = "";
        contElem.style.display = "block";
        contElem.style.width = widthForHeightCheck + "px";
        fullContainerHeight = contElem.clientHeight;
    }
    document.body.removeChild(contElem);
    if (fullContainerHeight) {
        return { containerHeight : fullContainerHeight, textWidth : textLineWidth };
    }
    return textLineWidth;
});

/**
 * Grabs the outer-most scrolling container for the page, either <body> or <html>.
 * Needed because the outer-most scrolling container differs between Google Chrome (which use `document.body`, aka <body>)
 * and Mozilla Firefox & MS Edge (which use `document.documentElement`, aka <html>).
 *
 * @returns {HTMLElement}
 */
export function getScrollingOuterElement(){
    if (!window || !document) return null;

    // Best. Chrome will return document.body automatically here.
    if (typeof document.scrollingElement !== 'undefined' && document.scrollingElement){
        return document.scrollingElement;
    }
    if (document.documentElement && typeof document.documentElement.scrollTop === 'number'){
        return document.documentElement;
    }
    if (document.body && typeof document.body.scrollTop === 'number'){
        return document.body;
    }
    return document.body;
}


export function getPageVerticalScrollPosition(){
    if (isServerSide() || !window || !document) return null;
    return window.pageYOffset || ((document.scrollingElement && document.scrollingElement.scrollTop) || (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop);
}


/**
 * Scroll to a target element, element ID, or scrollTop position over a period of time via transition.
 *
 * @param {string|number|HTMLElement} to - Where to scroll to.
 * @param {number} [duration=750] - How long should take.
 * @param {number} [offsetBeforeTarget=72] - How much padding under target element to give, e.g. to account for fixed top bar.
 * @param {?function} [callback=null] - Optional callback.
 * @returns {void}
 */
export function animateScrollTo(to, duration = 750, offsetBeforeTarget = 112, callback = null){

    if (!document || !document.body) return null;

    var scrollElement = getScrollingOuterElement();
    var elementTop;

    if (typeof to === 'string'){
        var elem = document.getElementById(to);
        if (!elem) throw new Error(to + " not found in document.");
        elementTop = getElementTop(elem);
    //} else if (typeof to === "ELEMENT" /* FIND PROPER TYPEOF */){
    } else if (typeof to === 'number'){
        elementTop = to;
    } else throw new Error("Invalid argument 'to' supplied.");


    if (elementTop === null) return null;

    elementTop = Math.max(0, elementTop - offsetBeforeTarget); // - offset re: nav bar header.
    if (scrollElement && scrollElement.scrollHeight && window && window.innerHeight){
        // Try to prevent from trying to scroll past max scrollable height.
        elementTop = Math.min(scrollElement.scrollHeight - window.innerHeight, elementTop);
    }

    function scrollTopTween(scrollTop){
        return function(){
            var interpolate = d3.interpolateNumber(this.scrollTop, scrollTop);
            return function(t){ window.scrollTo(0, interpolate(t)); /*scrollElement.scrollTop = interpolate(t);*/ };
        };
    }
    var origScrollTop = scrollElement.scrollTop;
    var animation = d3.select(scrollElement)
        .interrupt()
        .transition()
        .duration(duration)
        .tween("bodyScroll", scrollTopTween(elementTop));

    if (typeof callback === 'function'){
        animation.on('end', callback);
    }
}

export function toggleBodyClass(className, toggleTo = null, bodyElement = null){

    bodyElement = bodyElement || (window && document && document.body) || null;

    var allClasses = (Array.isArray(className) ? className : (typeof className === 'string' ? allClasses = className.split(' ') : null ));
    if (!className) {
        throw new Error('Invalid className supplied. Must be a string or array.');
    }

    if (bodyElement){
        var bodyClasses = bodyElement.className.split(' ');

        _.forEach(allClasses, function(classToToggle, i){
            var willSet;
            if (typeof toggleTo === 'boolean'){
                willSet = toggleTo;
            } else if (Array.isArray(toggleTo) && typeof toggleTo[i] === 'boolean'){
                willSet = toggleTo[i];
            } else {
                willSet = bodyClasses.indexOf(classToToggle) === -1;
            }
            if (willSet){
                bodyClasses.push(classToToggle);
                bodyClasses = _.uniq(bodyClasses);
            } else {
                var indexToRemove = bodyClasses.indexOf(classToToggle);
                if (indexToRemove > -1){
                    bodyClasses = _.uniq(bodyClasses.slice(0, indexToRemove).concat(bodyClasses.slice(indexToRemove + 1)));
                }
            }
        });

        bodyElement.className = bodyClasses.length > 0 ? (bodyClasses.length === 1 ? bodyClasses[0] : bodyClasses.join(' ')) : null;
    }

}


/**
 * Handle browser capabilities, a la Modernizr.
 *
 * Entry point is `setHtmlFeatClass`. Called in browser.js.
 * May *only* be called from mounted components (componentDidMount method
 * would be a good method to use this from), because actual DOM is needed.
 *
 * @deprecated
 * @constant
 */

export const BrowserFeat = {

    'feat': {},

    /**
     * Return object with browser capabilities; return from cache if available.
     */
    'getBrowserCaps': function (feat) {
        if (Object.keys(this.feat).length === 0) {
            // Detect SVG
            this.feat.svg = document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#Image', '1.1');

            // Detect <canvas>
            this.feat.canvas = (function() {
                var elem = document.createElement('canvas');
                return !!(elem.getContext && elem.getContext('2d'));
            })();

            // Detect toDataURL
            this.feat.todataurlpng = (function() {
                var canvas = document.createElement('canvas');
                return !!(canvas && canvas.toDataURL && canvas.toDataURL('image/png').indexOf('data:image/png') === 0);
            })();

            // Detect CSS transforms
            this.feat.csstransforms = (function() {
                var elem = document.createElement('tspan');
                return 'transform' in elem.style;
            })();

            // Detect FlexBox
            this.feat.flexbox = (function() {
                var elem = document.createElement('tspan');
                return 'flexBasis' in elem.style;
            })();

            // UA checks; should be retired as soon as possible
            this.feat.uaTrident = (function() {
                return navigator.userAgent.indexOf('Trident') > 0;
            })();

            // UA checks; should be retired as soon as possible
            this.feat.uaEdge = (function() {
                return navigator.userAgent.indexOf('Edge') > 0;
            })();

        }
        return feat ? this.feat[feat] : this.feat;
    },

    'setHtmlFeatClass': function() {
        var htmlclass = [];

        this.getBrowserCaps();

        // For each set feature, add to the <html> element's class
        var keys = Object.keys(this.feat);
        var i = keys.length;
        while (i--) {
            if (this.feat[keys[i]]) {
                htmlclass.push(keys[i]);
            } else {
                htmlclass.push('no-' + keys[i]);
            }
        }

        // Now write the classes to the <html> DOM element
        document.documentElement.className = htmlclass.join(' ');
    }
};
