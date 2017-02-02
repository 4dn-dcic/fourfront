'use strict';

var React = require('react');
var _ = require('underscore');
var { console, isServerSide } = require('./../../util');

module.exports = React.createClass({

    getDefaultProps : function(){
        return {
            'parentId' : 'main',
            'selectedNodes' : []
        };
    },

    getInitialState : function(){
        return {
            'highlighted' : [],
            'sequential' : true
        };
    },

    updateHoverNodes : function(sequence = []){
        this.setState({ 'highlighted' :  sequence });
    },

    renderCrumbs : function(){
        return _.uniq(this.props.selectedNodes.concat(this.state.highlighted), function(node){
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