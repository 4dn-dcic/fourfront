'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var { console, isServerSide } = require('./../util');

/**
 * Utility functions for aiding with visualizations.
 * 
 * @module {Object} viz/utilities
 */

/** @alias module:viz/utilities */
var vizUtil = module.exports = {

    /** 
     * Taken from http://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
     * 
     * @param {string} str - String to generate a color form.
     * @returns {string} A CSS color.
     */
    stringToColor : function(str) {
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
    },
    /** 
     * Helper function for window.requestAnimationFrame. Falls back to browser-prefixed versions if default not available, or falls back to setTimeout with 0ms delay if no requestAnimationFrame available at all.
     * 
     * @param {function} cb - Callback method.
     * @returns {undefined|string} Undefined or timeout ID if falling back to setTimeout.
     */
    requestAnimationFrame : function(cb){
        if (!isServerSide() && typeof window !== 'undefined'){
            if (typeof window.requestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
            if (typeof window.webkitRequestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
            if (typeof window.mozRequestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
        }
        return setTimeout(cb, 0);
    },
    /** @ignore */
    colorCache : {},        // We cache generated colors into here to re-use and speed up.
    /** @ignore */
    colorCacheByField : {},

    /**
     * Mapping of colors to particular terms.
     * @type {Object.<string>}
     */
    predefinedColors : {    // Keys should be all lowercase
        "human (homo sapiens)"  : "rgb(218, 112, 6)",
        "human"                 : "rgb(218, 112, 6)",
        "mouse (mus musculus)"  : "rgb(43, 88, 169)",
        "mouse"                 : "rgb(43, 88, 169)",
        "other"                 : "#a173d1",
        "end"                   : "#bbbbbb",
        "none"                  : "#bbbbbb"
    },

    colorPalettes : {
        'muted' : [
            '#5da5da',  // blue
            '#faa43a',  // orange
            '#60bd68',  // green
            '#f17cb0',  // pink
            '#b2912f',  // brown
            '#b276b2',  // purple
            '#decf3f',  // yellow
            '#f15854',  // red
            '#4d4d4d'   // gray
        ]
    },
    /** 
     * @param   {string} field
     * @param   {string} term
     * @param   {string|Object} [color]
     * @param   {string} [palette="muted"]
     * @returns {string|Object}
     */
    addToColorCacheByField : function(field, term, color = null, palette = 'muted'){
        if (typeof vizUtil.colorCacheByField[field] === 'undefined'){
            vizUtil.colorCacheByField[field] = {};
        }
        var index = _.keys(vizUtil.colorCacheByField[field]).length;
        if (!color){
            // Select one.
            color = vizUtil.colorPalettes[palette][index % vizUtil.colorPalettes[palette].length];
        }
        vizUtil.colorCacheByField[field][term] = {
            'index' : index,
            'color' : color
        };
        return color;
    },

    getFromColorCacheByField : function(field, term){
        if (typeof vizUtil.colorCacheByField[field] === 'undefined'){
            return null;
        }
        return (vizUtil.colorCacheByField[field][term] && vizUtil.colorCacheByField[field][term].color) || null;
    },

    colorForNode : function(node, cachedOnly = false, palette = null, predefinedColors = null, nullInsteadOfDefaultColor = false){
        var defaultColor = nullInsteadOfDefaultColor ? null : '#aaaaaa';
        
        var nodeDatum = node.data || node, // Handle both pre-D3-ified and post-D3-ified nodes.
            field = nodeDatum.field || null,
            term = (nodeDatum.term && nodeDatum.term.toLowerCase()) || null;

        // Handle exceptions first
        if (nodeDatum.color){
            return nodeDatum.color;
        } else if (field === 'accession'){ // This is an experiment_set node. We give it a unique color.
            return defaultColor;
        }

        // Grab from existing cache, if set.
        var existingColor = vizUtil.getFromColorCacheByField(field,term);
        if (existingColor !== null) return existingColor;

        // Grab from predefined colors, if set.
        if (
            field && term && predefinedColors &&
            typeof predefinedColors[term] !== 'undefined'
        ){
            return vizUtil.addToColorCacheByField(field, term, predefinedColors[term]);
        }

        if (cachedOnly) return defaultColor;

        // Set a cycled palette color
        return vizUtil.addToColorCacheByField(field, term, null, palette || 'muted');
    },

    colorForNodeAutoGenerated : function cfn(node, predefinedColors = vizUtil.predefinedColors, cachedOnly = false){
        var nodeDatum = node.data || node; // So can process on d3-gen'd/wrapped elements as well as plain datums.

        if (nodeDatum.color){
            return nodeDatum.color;
        }

        // Normalize name to lower case (as capitalization etc may change in future)
        var nodeName = 
            (nodeDatum.name && nodeDatum.name.toLowerCase()) ||
            (nodeDatum.term && nodeDatum.term.toLowerCase()) ||
            null;

        if (nodeName && typeof predefinedColors[nodeName] !== 'undefined'){
            vizUtil.colorCache[nodeName] = predefinedColors[nodeName];
            return predefinedColors[nodeName];
        } else if (nodeName && typeof vizUtil.colorCache[nodeName] !== 'undefined') {
            return vizUtil.colorCache[nodeName]; // Previously calc'd color
        } else if (cachedOnly || !nodeName){
            return '#aaa';
        } else if (
            nodeDatum.field === 'accession' ||
            nodeDatum.field === 'experiments_in_set.accession' || 
            nodeDatum.field === 'experiments_in_set.experiment_summary' ||
            nodeDatum.field === 'experiments_in_set.digestion_enzyme.name' ||
            nodeDatum.field === 'experiments_in_set.biosample.biosource_summary'
        ){

            //if (node.data.field === 'experiments_in_set.accession'){
            //    return '#bbb';
            //}

            // Use a variant of parent node's color
            if (node.parent) {
                var color = null;
                if (nodeDatum.field === 'accession'){
                    color = d3.color('#aaa').darker(Math.sqrt(nodeDatum.experiments) / 10);
                } else if (nodeDatum.field === 'experiments_in_set.experiment_summary' || nodeDatum.field === 'experiments_in_set.digestion_enzyme.name'){
                    color = d3.interpolateRgb(
                        cfn(node.parent, predefinedColors),
                        vizUtil.stringToColor(nodeName)
                    )(.4);
                } else if (nodeDatum.field === 'experiments_in_set.biosample.biosource_summary' && Array.isArray(node.parent.children)){
                    color = d3.interpolateRgb(
                        cfn(node.parent, predefinedColors),
                        d3.color(vizUtil.stringToColor(nodeName)).darker(
                            0.5 + (
                                (2 * (node.parent.children.indexOf(node) + 1)) / node.parent.children.length
                            )
                        )
                    )(.3);
                } else if (nodeDatum.field === 'experiments_in_set.accession') {
                    // color = d3.color(this.colorForNodeAutoGenerated(node.parent)).brighter(0.7);
                    color = d3.interpolateRgb(
                        cfn(node.parent, predefinedColors),
                        d3.color("#ddd")
                    )(.8);
                }
                
                if (color) {
                    vizUtil.colorCache[nodeName] = color;
                    return color;
                }
            }
        }

        // Fallback
        vizUtil.colorCache[nodeName] = vizUtil.stringToColor(nodeName);
        return vizUtil.colorCache[nodeName];
    },

    sortObjectsByColorPalette : function(objects, palette = 'muted'){
        var orderedColorList = vizUtil.colorPalettes[palette];
        if (!orderedColorList) {
            console.error("No palette " + palette + ' found.');
            return objects;
        }
        if (objects && objects[0] && !objects[0].color){
            console.warn("No colors assigned to objects.");
            return objects;
        }

        var groups = _.groupBy(objects, 'color');
        var runs = 0;

        function getSortedSection(){
            return _.map(orderedColorList, function(color){
                var o = groups[color] && groups[color].shift();
                if (groups[color] && groups[color].length === 0) delete groups[color];
                return o;
            }).filter(function(o){
                if (!o) return false;
                return true;
            });
        }
    
        var result = [];
        while (_.keys(groups).length > 0 && runs < 20){
            result = result.concat(getSortedSection());
            runs++;
        }

        if (runs > 1){
            console.warn("sortObjectsByColorPalette took longer than 1 run: " + runs, groups);
        }

        return result;
    },

    extendStyleOptions : function(propsStyleOpts, defaultStyleOpts){
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
    },

    getCommonDefaultStyleOpts : function(){
        // TODO
    },

    /** @namespace */
    style : {
        
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
    },

    /** Functions which are to be called from Chart instances with .apply(this, ...) */
    mixin : {

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

    }

};