'use strict';

var React = require('react');
var _ = require('underscore');

module.exports.ChartBreadcrumbs = React.createClass({

    getDefaultProps : function(){
        return {
            'parentId' : 'main'
        };
    },

    getInitialState : function(){
        return {
            'nodes' : [{
                'data' : {
                    'name' : 'Initial Crumb (invisible)'
                },
                'color' : '#ccc'
            }],
            'visible' : false
        };
    },

    renderCrumbs : function(){
        return this.state.nodes.map(function(node,i){
            return (
                <span 
                    className="chart-crumb"
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
            <div className="chart-breadcrumbs" id={this.props.parentId + '-crumbs'} style={{ 'opacity' : this.state.visible ? 1 : 0 }}>
                { this.renderCrumbs() }
            </div>
        );
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
    }

};

module.exports.util = util;