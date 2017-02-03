'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var { console, isServerSide } = require('../util');

var vizUtil = module.exports = {

    // Taken from http://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
    stringToColor : function(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = '#';
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour += ('00' + value.toString(16)).substr(-2);
        }
        return colour;
    },

    requestAnimationFrame : function(cb){
        if (!isServerSide() && typeof window !== 'undefined'){
            if (typeof window.requestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
            if (typeof window.webkitRequestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
            if (typeof window.mozRequestAnimationFrame !== 'undefined') return window.requestAnimationFrame(cb);
        }
        return setTimeout(cb, 0);
    },

    colorCache : {}, // We cache generated colors into here to re-use and speed up.

    colorForNode : function(node, predefinedColors = {}, cachedOnly = false){
        var nodeDatum = node.data || node; // So can process on d3-gen'd/wrapped elements as well as plain datums.

        if (nodeDatum.color){
            return nodeDatum.color;
        }

        // Normalize name to lower case (as capitalization etc may change in future)
        var nodeName = nodeDatum.name.toLowerCase();

        if (typeof predefinedColors[nodeName] !== 'undefined'){
            vizUtil.colorCache[nodeName] = predefinedColors[nodeName];
            return predefinedColors[nodeName];
        } else if (typeof vizUtil.colorCache[nodeName] !== 'undefined') {
            return vizUtil.colorCache[nodeName]; // Previously calc'd color
        } else if (cachedOnly){
            return '#ddd';
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
                    color = d3.color('#fbfbfb').darker(Math.sqrt(nodeDatum.experiments) / 10);
                } else if (nodeDatum.field === 'experiments_in_set.experiment_summary' || nodeDatum.field === 'experiments_in_set.digestion_enzyme.name'){
                    color = d3.interpolateRgb(
                        vizUtil.colorForNode(node.parent, predefinedColors),
                        vizUtil.stringToColor(nodeName)
                    )(.4);
                } else if (nodeDatum.field === 'experiments_in_set.biosample.biosource_summary' && Array.isArray(node.parent.children)){
                    color = d3.interpolateRgb(
                        vizUtil.colorForNode(node.parent, predefinedColors),
                        d3.color(vizUtil.stringToColor(nodeName)).darker(
                            0.5 + (
                                (2 * (node.parent.children.indexOf(node) + 1)) / node.parent.children.length
                            )
                        )
                    )(.3);
                } else if (nodeDatum.field === 'experiments_in_set.accession') {
                    // color = d3.color(this.colorForNode(node.parent)).brighter(0.7);
                    color = d3.interpolateRgb(
                        vizUtil.colorForNode(node.parent, predefinedColors),
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