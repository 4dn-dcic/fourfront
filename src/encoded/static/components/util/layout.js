'use strict';

var { isServerSide } = require('./misc');

/** 
 * Most of these functions should not be run from a component until it has mounted as they do not work
 * on serverside (depend on window, document, DOM, etc.)
 */
var layout = module.exports = {

    /** Get distance from top of browser viewport to an element's top. */
    getElementTop : function(el){
        if (!(typeof window !== 'undefined' && window && document && document.body)) return null;
        if (!el || typeof el.getBoundingClientRect !== 'function') return null;
        var bodyRect = document.body.getBoundingClientRect();
        var boundingRect = el.getBoundingClientRect();
        return boundingRect.top - bodyRect.top;
    },

    getElementOffset : function(el){
        if (!(typeof window !== 'undefined' && window && document && document.body)) return null;
        if (!el || typeof el.getBoundingClientRect !== 'function') return null;
        var bodyRect = document.body.getBoundingClientRect();
        var boundingRect = el.getBoundingClientRect();
        return {
            'top' : boundingRect.top - bodyRect.top,
            'left' : boundingRect.left - bodyRect.left
        };
    },

    getElementOffsetFine : function(el) {
        var x = 0;
        var y = 0;

        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
            // FF & IE don't support body's scrollTop - use window instead
            x += el.offsetLeft - (el.tagName === 'BODY' ? window.pageXOffset : el.scrollLeft);
            y += el.offsetTop - (el.tagName === 'BODY' ? window.pageYOffset : el.scrollTop);
            el = el.offsetParent;
        }

        return { left: x, top: y };
    },

    /**
     * Get current grid size, if need to sidestep CSS.
     * Keep widths in sync with stylesheet, e.g. $screen-sm-min, $screen-md-min, & $screen-lg-min
     * in src/encoded/static/scss/bootstrap/_variables.scss.
     *
     * @return {string} - Abbreviation for column/grid Bootstrap size, e.g. 'lg', 'md', 'sm', or 'xs'.
     */
    responsiveGridState : function(){
        if (isServerSide()) return 'lg';
        if (window.innerWidth >= 1200) return 'lg';
        if (window.innerWidth >= 992) return 'md';
        if (window.innerWidth >= 768) return 'sm';
        return 'xs';
    },


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
    gridContainerWidth : function(){
        // Subtract 20 for padding/margins.
        switch(layout.responsiveGridState()){
            case 'lg': return 1140;
            case 'md': return 940;
            case 'sm': return 720;
            case 'xs':
                if (isServerSide()) return 400;
                return window.innerWidth - 20;
        }

    },


    /**
     * Check width of text or text-like content if it were to fit on one line.
     * @param {string} textContent - Either text or text-like content, e.g. with span elements.
     * @param {string} [containerElementType] - Type of element to fit into, e.g. 'div' or 'p'.
     * @param {string} [containerClassName] - ClassName of containing element, e.g. with 'text-large' to use larger text size.
     * @param {integer} [widthForHeightCheck] - If provided, will return an object which will return height of text content when constrained to width.
     * @return {integer|Object} - Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
     */
    textContentWidth : function(
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
    },




}; 

