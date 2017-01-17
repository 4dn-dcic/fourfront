'use strict';

var React = require('react');
var _ = require('underscore');
var { console, isServerSide } = require('../objectutils');

module.exports.ChartBreadcrumbs = React.createClass({

    getDefaultProps : function(){
        return {
            'parentId' : 'main',
            'selectedNodes' : []
        };
    },

    getInitialState : function(){
        return {
            'nodes' : [],
            'sequential' : true
        };
    },

    updateHoverNodes : function(sequence = []){
        this.setState({ 'nodes' :  sequence });
    },

    renderCrumbs : function(){
        return _.uniq(this.props.selectedNodes.concat(this.state.nodes), function(node){
            return node.data.name;
        }).map(function(node,i){
            return (
                <span 
                    className="chart-crumb"
                    data-field={node.data.field ? node.data.field : null}
                    key={i} 
                    style={{ backgroundColor : node.color }}

                >
                    { node.data.name }
                </span>
            );
        });
    },

    render : function(){
        return (
            <div className="chart-breadcrumbs" id={this.props.parentId + '-crumbs'}>
                { this.renderCrumbs() }
            </div>
        );
    }
});

module.exports.SVGFilters = React.createClass({

    getDefaultProps : function(){
        return {
            'enabled' : true,
            'wrapInOwnSVG' : true,
            'includeFilters' : ['svg-filter-highlight', 'svg-filter-brightness']
        };
    },

    shouldComponentUpdate : function(){
        return false; // We never need to update this. Let's improve performance a little bit instead of re-rendering.
    },

    renderFilters : function(){
        var filterComponents = [];
        this.props.includeFilters.forEach(function(filterID){
            if (filterID === 'svg-filter-highlight'){
                filterComponents.push(
                    <filter id="svg-filter-highlight">

                        <feFlood floodColor="black" result="COLOR-black"></feFlood>
                        <feImage xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="data:image/svg+xml;charset=utf-8,%3Csvg%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%22100px%22%20height%3D%22200px%22%20%20%3E%0A%09%3Cdefs%3E%0A%09%09%3Cpattern%20id%3D%22pattern%22%20patternUnits%3D%22userSpaceOnUse%22%20width%3D%2210%22%20height%3D%2210%22%3E%0A%0A%09%09%09%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M0%2C8.239V10h1.761L0%2C8.239z%22%2F%3E%0A%09%09%09%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M5%2C0l5%2C5l0%2C0V3.238L6.762%2C0H5z%22%2F%3E%0A%09%09%09%3Cpolygon%20fill%3D%22%23FFFFFF%22%20points%3D%220%2C3.239%200%2C5%205%2C10%206.761%2C10%20%22%2F%3E%0A%09%09%09%3Cpolygon%20fill%3D%22%23FFFFFF%22%20points%3D%221.762%2C0%200%2C0%2010%2C10%2010%2C8.238%20%22%2F%3E%0A%09%09%3C%2Fpattern%3E%0A%09%3C%2Fdefs%3E%0A%09%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23pattern)%22%20%2F%3E%0A%3C%2Fsvg%3E" 
                        x="0" y="2" width="100" height="200" result="STRIPED-FILL_10"></feImage>
                        <feTile in="STRIPED-FILL_10" result="STRIPED-FILL_20"></feTile>
                        <feComposite operator="in" in="STRIPED-FILL_20" in2="SourceAlpha" result="STRIPED-FILL_30"></feComposite>
                        <feComposite operator="in" in="COLOR-black" in2="STRIPED-FILL_30" result="STRIPED-FILL_40"></feComposite>

                        <feMerge result="BEVEL_40">
                            <feMergeNode in="SourceGraphic" />
                            <feMergeNode in="STRIPED-FILL_40" />
                        </feMerge>
                    
                </filter>
                );
            }
            if (filterID === 'svg-filter-brightness'){
                filterComponents.push(
                    <filter id="svg-filter-brightness">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.3"/>
                            <feFuncG type="linear" slope="1.3"/>
                            <feFuncB type="linear" slope="1.3"/>
                        </feComponentTransfer>
                    </filter>
                );
            }
        });
        return <defs>{ filterComponents }</defs>;
    },

    render : function(){
        if (!this.props.enabled) return null;
        if (this.props.wrapInOwnSVG){
            return <svg id="svg-filters">{ this.renderFilters() }</svg>;
        } else return this.renderFilters();
    }
});

var util = {

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
        if (!isServerSide() && typeof window !== undefined){
            if (typeof window.requestAnimationFrame !== undefined) return window.requestAnimationFrame(cb);
            if (typeof window.webkitRequestAnimationFrame !== undefined) return window.requestAnimationFrame(cb);
            if (typeof window.mozRequestAnimationFrame !== undefined) return window.requestAnimationFrame(cb);
        }
        return setTimeout(cb, 0);
    },

    style : {

        translate3d : function(x=0, y=0, z=0){
            return 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)';
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

module.exports.util = util;