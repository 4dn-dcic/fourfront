'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { console, isServerSide } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';
import { windowHref } from './../../globals';


export function findNodeFromHref(href, nodes){
    if (typeof href !== 'string' || !Array.isArray(nodes)) return null;
    var parts = url.parse(href);
    if (typeof parts.hash !== 'string' || parts.hash.length === 0) return null;
    var findPart = decodeURIComponent(parts.hash.slice(1));
    return _.find(nodes, function(node){
        if (typeof node.id === 'string'){
            if (node.id === findPart) return true;
            return false;
        }
        if (typeof node.name === 'string'){
            if (node.name === findPart) return true;
        }
        return false;
    }) || null;
}


export default class StateContainer extends React.Component {

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.defaultOnNodeClick = this.defaultOnNodeClick.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.href = this.href.bind(this);
        this.render = this.render.bind(this);

        var state = {
            'selectedNode' : null
        };

        if (props.checkHrefForSelectedNode){
            var href = this.href(props.href, props.checkWindowLocationHref);
            var foundNode = findNodeFromHref(href, props.nodes);
            if (foundNode){
                state.selectedNode = foundNode;
            }
        }

        this.state = state;
    }

    componentWillReceiveProps(nextProps){

        var newState = {};
        var foundNode;

        if (nextProps.checkHrefForSelectedNode){
            // Update selectedNode from location hash.
            foundNode = findNodeFromHref(this.href(nextProps.href, nextProps.checkWindowLocationHref), nextProps.nodes);
            if (foundNode){
                newState.selectedNode = foundNode;
            } else {
                newState.selectedNode = null;
                if (window && window.location && window.location.hash) window.location.hash = '';
            }
        }

        // Update own selectedNode to latest v, if still exists & new one not otherwise set.
        if (typeof newState.selectedNode === 'undefined' && this.state.selectedNode){
            var find = { 'name' : this.state.selectedNode.name, 'nodeType' : this.state.selectedNode.nodeType };
            if (this.state.selectedNode.id) find.id = this.state.selectedNode.id; // Case: IO Node
            foundNode = _.findWhere(this.props.nodes, find);
            if (foundNode){
                newState.selectedNode = foundNode;
            } else {
                newState.selectedNode = null;
            }
        }

        if (_.keys(newState).length > 0) this.setState(newState);
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

    href(
        fallbackHref = (this.props && this.props.href) || null,
        checkWindowLocationHref = (this.props && typeof this.props.checkWindowLocationHref === 'boolean') ? this.props.checkWindowLocationHref : true
    ){
        if (checkWindowLocationHref) return windowHref(fallbackHref);
        return fallbackHref;
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
