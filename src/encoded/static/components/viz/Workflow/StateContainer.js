'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, isServerSide } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';


const memoizedFindNode = memoize(function(nodes, name, nodeType, id=null){
    return _.find(nodes, function(n){
        if (n.name !== name) return false;
        if (n.nodeType !== nodeType) return false;
        if (id !== null && n.id !== id) return false;
        return true;
    });
});


export default class StateContainer extends React.PureComponent {

    static getDerivedStateFromProps(props, state){
        if (state.selectedNode){
            var foundNode = memoizedFindNode(
                props.nodes,
                state.selectedNode.name,
                state.selectedNode.nodeType,
                state.selectedNode.id || null
            );
            if (foundNode){
                return { selectedNode : foundNode };
            }
        }
        return null;
    }

    constructor(props){
        super(props);
        this.defaultOnNodeClick = this.defaultOnNodeClick.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.state = {
            'selectedNode' : null
        };
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
