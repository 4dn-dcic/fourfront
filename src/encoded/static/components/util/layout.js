'use strict';

import React from 'react';
import _ from 'underscore';
import { isServerSide } from './misc';
import * as d3 from 'd3';
import * as vizUtil from './../viz/utilities';

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
export function shortenString(originalText, maxChars = 28, addEllipsis = true, splitOn = ' '){
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
}

/**
 * Get current grid size, if need to sidestep CSS.
 * Keep widths in sync with stylesheet, e.g. $screen-sm-min, $screen-md-min, & $screen-lg-min
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {string} - Abbreviation for column/grid Bootstrap size, e.g. 'lg', 'md', 'sm', or 'xs'.
 */
export function responsiveGridState(){
    if (isServerSide()) return 'lg';
    if (window.innerWidth >= 1200) return 'lg';
    if (window.innerWidth >= 992) return 'md';
    if (window.innerWidth >= 768) return 'sm';
    return 'xs';
}


/**
 * Get the width of what a 12-column bootstrap section would be in current viewport size.
 * Keep widths in sync with stylesheet, e.g.
 * $container-tablet - $grid-gutter-width,
 * $container-desktop - $grid-gutter-width, and
 * $container-large-desktop - $grid-gutter-width
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {integer}
 */
export function gridContainerWidth(){
    // Subtract 20 for padding/margins.
    switch(responsiveGridState()){
        case 'lg': return 1140;
        case 'md': return 940;
        case 'sm': return 720;
        case 'xs':
            if (isServerSide()) return 400;
            return window.innerWidth - 20;
    }
}


/**
 * Check width of text if it were to fit on one line.
 * @param {string} textContent - Either text or text-like content, e.g. with span elements.
 * @param {string} [font] - Font to use/measure. Include font-size. Defaults to "1rem 'Work Sans'".
 * @param {boolean} [roundToPixel] - Whether to round result up.
 * @return {integer} - Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
 */
export function textWidth(
    textContent,
    font = "1rem 'Work Sans'",
    roundToPixel = false
){
    if (isServerSide()) return null;
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
}


export function textHeight(
    textContent = "Some String",
    width = 200,
    containerClassName = null,
    style = null,
    containerElement = null
){
    if (isServerSide()) return null;
    
    var height;
    var contElem;
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
}


/**
 * Check width of text or text-like content if it were to fit on one line.
 * @param {string} textContent - Either text or text-like content, e.g. with span elements.
 * @param {string} [containerElementType] - Type of element to fit into, e.g. 'div' or 'p'.
 * @param {string} [containerClassName] - ClassName of containing element, e.g. with 'text-large' to use larger text size.
 * @param {integer} [widthForHeightCheck] - If provided, will return an object which will return height of text content when constrained to width.
 * @return {integer|Object} - Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
 */
export function textContentWidth(
    textContent,
    containerElementType = 'div',
    containerClassName = null,
    widthForHeightCheck = null,
    style = null
){
    if (isServerSide()){
        return null;
    }
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
}


export function verticalCenterOffset(innerElem, extraHeight = 0, outerElem = null){
    if (!outerElem) {
        outerElem = innerElem.offsetParent || innerElem.parentElement;
    }
    if (!outerElem || !innerElem.offsetHeight || !outerElem.offsetHeight) return 0;
    return ((outerElem.offsetHeight + extraHeight) - innerElem.offsetHeight) / 2;
}


/**
 * 
 * @param {string|number|HTMLElement} to - Where to scroll to.
 * @param {number} duration - How long should take.
 */
export function animateScrollTo(to, duration = 750, offsetBeforeTarget = 100, callback = null){

    if (!document || !document.body) return null;

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
    if (document && document.body && document.body.scrollHeight && window && window.innerHeight){
        // Try to prevent from trying to scroll past max scrollable height.
        elementTop = Math.min(document.body.scrollHeight - window.innerHeight, elementTop);
    }

    function scrollTopTween(scrollTop){
        return function(){
            var interpolate = d3.interpolateNumber(this.scrollTop, scrollTop);
            return function(t){ document.body.scrollTop = interpolate(t); };
        };
    }
    var origScrollTop = document.body.scrollTop;
    var animation = d3.select(document.body)
        .interrupt()
        .transition()
        .duration(duration)
        .tween("bodyScroll", scrollTopTween(elementTop));

    if (typeof callback === 'function'){
        animation.on('end', callback);
    }
}



/**
 * Wrap this around other React components to send them a forceUpdate()-based re-render trigger
 * when the page has been resized. Debounced at 300ms (default).
 * 
 * @prop {number} delay - Milliseconds to debounce.
 * @prop {React.Component} children - Another React component which needs to be updated in response to window resize.
 */
export class WindowResizeUpdateTrigger extends React.Component {

    static defaultProps = {
        'delay' : 300
    }

    constructor(props){
        super(props);
        this.onResize = _.debounce(this.onResize.bind(this), props.delay);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.render = this.render.bind(this);
    }

    onResize(){
        this.forceUpdate();
    }

    componentDidMount(){
        if (isServerSide() || !window || !document) return null;
        window.addEventListener('resize', this.onResize);
    }

    componentWillUnmount(){
        if (isServerSide() || !window || !document) return null;
        window.removeEventListener('resize', this.onResize);
    }

    render(){
        return React.cloneElement(this.props.children);
    }

}
