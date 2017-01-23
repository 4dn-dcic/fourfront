'use strict';

var { isServerSide } = require('./misc');

var layout = module.exports = {

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
        };
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


}; 

