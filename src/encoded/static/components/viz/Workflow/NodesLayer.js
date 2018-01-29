'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { console, Filters } from './../../util';

import Node from './Node';


export default class NodesLayer extends React.Component {

    static processNodes(nodes, props){
        return _.sortBy(_.sortBy(nodes, 'name'), 'nodeType'); // Sort nodes so on updates, they stay in same(-ish) order and can transition.
    }

    static defaultProps = {
        onNodeMouseEnter : null,
        onNodeMouseLeave : null,
        onNodeClick : null
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(){
        ReactTooltip.rebuild();
    }

    render(){
        var p = this.props;
        var fullHeight = p.outerHeight;
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        var renderedNodes = null;
        if (this.props.scrollContainerWrapperMounted){
            var processedNodes = NodesLayer.processNodes(this.props.nodes, this.props);
            var countInActiveContext = _.reduce(processedNodes, function(m,n){ return ( n.isCurrentContext ? ++m : m ); }, 0);
            var lastActiveContextNode = null;
            if (countInActiveContext > 0){
                lastActiveContextNode = _.sortBy(_.filter(processedNodes, function(n){ return n.isCurrentContext; }), 'column' ).reverse()[0];
            }
            renderedNodes = _.map(processedNodes, function(node, i){
                var nodeProps = _.extend( _.omit(p, 'children', 'nodes'), {
                    node : node,
                    onMouseEnter : p.onNodeMouseEnter && p.onNodeMouseEnter.bind(p.onNodeMouseEnter, node),
                    onMouseLeave : p.onNodeMouseLeave && p.onNodeMouseLeave.bind(p.onNodeMouseLeave, node),
                    onClick : typeof p.onNodeClick === 'function' && p.onNodeClick.bind(p.onNodeClick, node),
                    key : node.id || node.name || i,
                    nodeElement : p.nodeElement || null,
                    className : p.nodeClassName || null,
                    isCurrentContext : node.isCurrentContext,
                    countInActiveContext : countInActiveContext,
                    lastActiveContextNode : lastActiveContextNode
                });
                return <Node {...nodeProps} />;
            });
        }
        return (
            <div className="nodes-layer-wrapper" style={{ width : Math.max(p.contentWidth, fullWidth), height : fullHeight }}>
                <div className="nodes-layer" style={{ width : Math.max(p.contentWidth, fullWidth), height : fullHeight }}>
                    { renderedNodes }
                </div>
            </div>
        );
    }

}
