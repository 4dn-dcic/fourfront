'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { console, isServerSide } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';


export default class StateContainer extends React.Component {

    constructor(props){
        super(props);
        this.defaultOnNodeClick = this.defaultOnNodeClick.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'selectedNode' : null
        };
    }

    componentWillReceiveProps(nextProps){

        var selectedNode    = this.state.selectedNode,
            newState        = {},
            foundNode;

        // Update own selectedNode to latest v, if still exists & new one not otherwise set.
        if (selectedNode && ( this.props.nodes !== nextProps.nodes )){
            var find = { 'name' : selectedNode.name, 'nodeType' : selectedNode.nodeType };
            if (selectedNode.id) find.id = selectedNode.id; // Case: IO Node
            foundNode = _.findWhere(nextProps.nodes, find);
            if (foundNode){
                newState.selectedNode = foundNode;
            } else {
                newState.selectedNode = null;
            }
        }

        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    defaultOnNodeClick(node, selectedNode, evt){
        this.setState(function(prevState){
            if (prevState.selectedNode === node){
                return { 'selectedNode' : null };
            } else {
                return { 'selectedNode' : node };
            }
        });
    }

    handleNodeClick(node, evt){
        if (typeof this.props.onNodeClick === 'function'){
            this.props.onNodeClick.call(this, node, this.state.selectedNode, evt);
        } else {
            this.defaultOnNodeClick(node, this.state.selectedNode, evt);
        }
    }

    detailPane(){
        if (typeof this.props.renderDetailPane === 'function'){
            return this.props.renderDetailPane(this.state.selectedNode, this.props);
        }
        return null;
    }

    render(){
        var detailPane = null;
        return (
            <div className="state-container" data-is-node-selected={!!(this.state.selectedNode)}>
                {
                    React.Children.map(this.props.children, (child)=>{
                        return React.cloneElement(child, _.extend(
                            _.omit(this.props, 'children'), { onNodeClick : this.handleNodeClick }, this.state
                        ));
                    })
                }
                { this.detailPane() }
            </div>
        );
    }

}
