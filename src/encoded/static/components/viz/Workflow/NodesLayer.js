'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import ReactTooltip from 'react-tooltip';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { console, Filters } from './../../util';

import Node from './Node';


export default class NodesLayer extends React.PureComponent {

    static sortedNodes = memoize(function(nodes){
        return _.sortBy(_.sortBy(nodes.slice(0), 'name'), 'nodeType'); // Sort nodes so on updates, they stay in same(-ish) order and can transition.
    });

    static defaultProps = {
        'onNodeMouseEnter' : null,
        'onNodeMouseLeave' : null,
        'onNodeClick' : null
    };

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(){
        ReactTooltip.rebuild();
    }

    renderNodeElements(){
        if (!this.props.scrollContainerWrapperMounted){
            return null;
        }
        var {
                nodes, outerHeight, innerWidth, innerMargin,
                onNodeMouseEnter, onNodeMouseLeave, onNodeClick, nodeClassName
            } = this.props,
            sortedNodes             = NodesLayer.sortedNodes(nodes),
            countInActiveContext    = _.reduce(sortedNodes, function(m,n){ return ( n.isCurrentContext ? ++m : m ); }, 0),
            lastActiveContextNode   = countInActiveContext === 0 ? null : _.sortBy(_.filter(sortedNodes, function(n){ return n.isCurrentContext; }), 'column' ).reverse()[0];

        return _.map(sortedNodes, (node, nodeIndex) => {
            var nodeProps = _.extend(
                _.omit(this.props, 'children', 'nodes', 'width', 'innerWidth', 'outerWidth', 'windowWidth'),
                {
                    node, countInActiveContext, lastActiveContextNode,
                    'onMouseEnter'  : onNodeMouseEnter && onNodeMouseEnter.bind(onNodeMouseEnter, node),
                    'onMouseLeave'  : onNodeMouseLeave && onNodeMouseLeave.bind(onNodeMouseLeave, node),
                    'onClick'       : onNodeClick && onNodeClick.bind(onNodeClick, node),
                    'key'           : node.id || node.name || nodeIndex,
                    'className'     : nodeClassName
                }
            );
            return (
                <CSSTransition classNames="workflow-node-transition" unmountOnExit timeout={500} key={nodeProps.key}>
                    <Node {...nodeProps} />
                </CSSTransition>
            );
        });

    }

    render(){
        var { innerMargin, innerWidth, outerHeight, contentWidth } = this.props,
            fullWidth = innerWidth + innerMargin.left + innerMargin.right,
            layerStyle = { 'width' : Math.max(contentWidth, fullWidth), 'height' : outerHeight };

        return (
            <div className="nodes-layer-wrapper" style={layerStyle}>
                <div className="nodes-layer" style={layerStyle}>
                    <TransitionGroup component={null}>{ this.renderNodeElements() }</TransitionGroup>
                </div>
            </div>
        );
    }

}
