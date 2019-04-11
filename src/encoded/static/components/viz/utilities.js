'use strict';

import React from 'react';
import _ from 'underscore';
import * as d3 from 'd3';
import { NavItem, Navbar } from 'react-bootstrap';
import { console, isServerSide } from './../util';

/**
 * Utility functions for aiding with visualizations.
 *
 * @module {Object} viz/utilities
 */


/**
 * Taken from http://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
 * Somewhat deprecated as we use D3 color scales for most part now.
 *
 * @deprecated
 * @param {string} str - String to generate a color from. Any string.
 * @returns {string} A CSS color.
 */
export function stringToColor(str) {
    var hash = 0, color = '#', i;
    for (i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}


/**
 * Helper function for window.requestAnimationFrame. Falls back to browser-prefixed versions if default not available, or falls back to setTimeout with 0ms delay if no requestAnimationFrame available at all.
 *
 * @param {function} cb - Callback method.
 * @returns {undefined|string} Undefined or timeout ID if falling back to setTimeout.
 */
export function requestAnimationFrame(cb){
    if (!isServerSide() && typeof window !== 'undefined'){
        if (typeof window.requestAnimationFrame !== 'undefined')        return window.requestAnimationFrame(cb);
        if (typeof window.webkitRequestAnimationFrame !== 'undefined')  return window.webkitRequestAnimationFrame(cb);
        if (typeof window.mozRequestAnimationFrame !== 'undefined')     return window.mozRequestAnimationFrame(cb);
    }
    return setTimeout(cb, 0); // Mock it for old browsers and server-side.
}

/**
 * Used in Barplot/Chart.js to merge 'style' options. Only merges keys which are present on `styleOptsToExtend`.
 * Similar to underscore's `_.extend` but arguments are reversed and... sort of unnecessary.
 *
 * @deprecated
 * @param {Object} styleOptsToExtendFrom     Object of styles to extend from.
 * @param {Object} styleOptsToExtend         Object of styles to extend to.
 * @returns {Object} Returns `styleOptsToExtend` with key vals overriden from `styleOptsToExtendFrom`.
 */
export function extendStyleOptions(styleOptsToExtendFrom, styleOptsToExtend){
    if (!styleOptsToExtend) throw new Error("No default style options provided.");
    if (!styleOptsToExtendFrom) return styleOptsToExtend;
    else {
        _.keys(styleOptsToExtend).forEach((styleProp) => {
            if (typeof styleOptsToExtendFrom[styleProp] === 'undefined') return;
            if (typeof styleOptsToExtendFrom[styleProp] === 'object' && styleOptsToExtendFrom[styleProp]){
                _.extend(styleOptsToExtend[styleProp], styleOptsToExtendFrom[styleProp]);
            } else {
                styleOptsToExtend[styleProp] = styleOptsToExtendFrom[styleProp];
            }
        });
        return styleOptsToExtend;
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


/** Renders out the 4DN Logo SVG as a React element(s) */
export class FourfrontLogo extends React.PureComponent {

    static defaultProps = {
        'id'                        : "fourfront_logo_svg",
        'circlePathDefinitionOrig'  : "m1,30c0,-16.0221 12.9779,-29 29,-29c16.0221,0 29,12.9779 29,29c0,16.0221 -12.9779,29 -29,29c-16.0221,0 -29,-12.9779 -29,-29z",
        'circlePathDefinitionHover' : "m3.33331,34.33326c-2.66663,-17.02208 2.97807,-23.00009 29.99997,-31.33328c27.02188,-8.33321 29.66667,22.31102 16.6669,34.66654c-12.99978,12.35552 -15.64454,20.00017 -28.66669,19.00018c-13.02214,-0.99998 -15.33356,-5.31137 -18.00018,-22.33344z",
        'textTransformOrig'         : "translate(9, 37)",
        'textTransformHover'        : "translate(48, 24) scale(0.2, 0.6)",
        'fgCircleTransformOrig'     : "translate(50, 20) scale(0.35, 0.35) rotate(-135)",
        'fgCircleTransformHover'    : "translate(36, 28) scale(0.7, 0.65) rotate(-135)",
        'hoverDelayUntilTransform'  : 400,
        'title'                     : "Data Portal"
    };

    static svgElemStyle = {
        'verticalAlign' : 'middle',
        'display' : 'inline-block',
        'height' : '100%',
        'paddingBottom' : 10,
        'paddingTop' : 10,
        'transition' : "padding .3s, transform .3s"
    };

    static svgBGCircleStyle = {
        'fill' : "url(#fourfront_linear_gradient)",
        "stroke" : "transparent",
        "strokeWidth" : 1
    };

    static svgTextStyleOut = {
        'transition' : "letter-spacing 1s, opacity .7s, stroke .7s, stroke-width .7s, fill .7s",
        'fontSize' : 23,
        'fill' : '#fff',
        'fontFamily' : '"Mada","Work Sans",Helvetica,Arial,sans-serif',
        'fontWeight' : '600',
        'stroke' : 'transparent',
        'strokeWidth' : 0,
        'strokeLinejoin' : 'round',
        'opacity' : 1,
        'letterSpacing' : 0
    };

    static svgTextStyleIn = {
        'transition' : "letter-spacing 1s .4s linear, opacity .7s .4s, stroke .7s 4s, stroke-width .7s 4s, fill .7s .4s",
        'letterSpacing' : -14,
        'stroke' : 'rgba(0,0,0,0.2)',
        'opacity' : 0,
        'fill' : 'transparent',
        'strokeWidth' : 15
    };

    static svgInnerCircleStyleOut = {
        'transition': "opacity 1.2s",
        'opacity' : 0,
        'fill' : 'transparent',
        'strokeWidth' : 15,
        'stroke' : 'rgba(0,0,0,0.2)',
        'fontSize' : 23,
        'fontFamily' : '"Mada","Work Sans",Helvetica,Arial,sans-serif',
        'fontWeight' : '600',
        'strokeLinejoin' : 'round'
    };

    static svgInnerCircleStyleIn = {
        'transition': "opacity 1.2s .6s",
        'opacity' : 1
    };

    constructor(props){
        super(props);
        this.setHoverStateOnDoTiming = _.throttle(this.setHoverStateOnDoTiming.bind(this), 1000);
        this.setHoverStateOn    = this.setHoverStateOn.bind(this);
        this.setHoverStateOff   = this.setHoverStateOff.bind(this);

        this.svgRef             = React.createRef();
        this.bgCircleRef        = React.createRef();
        this.fgTextRef          = React.createRef();
        this.fgCircleRef        = React.createRef();

        this.state = { hover : false };
    }

    setHoverStateOn(e){
        this.setState({ 'hover': true }, this.setHoverStateOnDoTiming);
    }

    setHoverStateOnDoTiming(e){
        var { circlePathDefinitionHover, textTransformHover, fgCircleTransformHover, hoverDelayUntilTransform } = this.props;

        // CSS styles controlled via stylesheets

        setTimeout(()=>{
            if (!this.state.hover) return; // No longer hovering. Cancel.
            d3.select(this.bgCircleRef.current)
                .transition()
                .duration(1000)
                .attr('d', circlePathDefinitionHover);

            d3.select(this.fgTextRef.current)
                .transition()
                .duration(700)
                .attr('transform', textTransformHover);

            d3.select(this.fgCircleRef.current)
                .transition()
                .duration(1200)
                .attr('transform', fgCircleTransformHover);

        }, hoverDelayUntilTransform);
    }

    setHoverStateOff(e){
        this.setState({ 'hover' : false }, ()=>{

            d3.select(this.bgCircleRef.current)
                .interrupt()
                .transition()
                .duration(1000)
                .attr('d', this.props.circlePathDefinitionOrig);

            d3.select(this.fgTextRef.current)
                .interrupt()
                .transition()
                .duration(1200)
                .attr('transform', this.props.textTransformOrig);

            d3.select(this.fgCircleRef.current)
                .interrupt()
                .transition()
                .duration(1000)
                .attr('transform', this.props.fgCircleTransformOrig);
        });
    }

    renderDefs(){
        return (
            <defs>
                <linearGradient id="fourfront_linear_gradient" x1="1" y1="30" x2="59" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#238bae"/>
                    <stop offset="1" stopColor="#8ac640"/>
                </linearGradient>
                <linearGradient id="fourfront_linear_gradient_darker" x1="1" y1="30" x2="59" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#238b8e"/>
                    <stop offset="1" stopColor="#8aa640"/>
                </linearGradient>
            </defs>
        );
    }

    render(){
        var { id, circlePathDefinitionOrig, circlePathDefinitionHover, textTransformOrig,
            textTransformHover, fgCircleTransformOrig, onClick, title } = this.props,
            hover = this.state.hover;

        return (
            <Navbar.Brand>
                <NavItem href="/" onClick={onClick} onMouseEnter={this.setHoverStateOn} onMouseLeave={this.setHoverStateOff}>
                    <span className="img-container">
                        <svg id={id} ref={this.svgRef} viewBox="0 0 60 60" style={FourfrontLogo.svgElemStyle}>
                            { this.renderDefs() }
                            <path d={circlePathDefinitionOrig} style={FourfrontLogo.svgBGCircleStyle} ref={this.bgCircleRef} />
                            <text transform={textTransformOrig} style={hover ? _.extend({}, FourfrontLogo.svgTextStyleOut, FourfrontLogo.svgTextStyleIn) : FourfrontLogo.svgTextStyleOut} ref={this.fgTextRef}>
                                4DN
                            </text>
                            <text transform={fgCircleTransformOrig} style={hover ? _.extend({}, FourfrontLogo.svgInnerCircleStyleOut, FourfrontLogo.svgInnerCircleStyleIn) : FourfrontLogo.svgInnerCircleStyleOut} ref={this.fgCircleRef}>
                                O
                            </text>
                        </svg>
                    </span>
                    <span className="navbar-title">{ title }</span>
                </NavItem>
            </Navbar.Brand>
        );
    }

}



/**
 * Object containing functions which might help in setting a CSS style.
 *
 * @constant
 */
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

