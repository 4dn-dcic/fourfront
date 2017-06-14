'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { console, Filters } from './../../util';

import Node from './Node';


export default class NodesLayer extends React.Component {

    static processNodes(nodes){
        return _.map(
                _.sortBy(_.sortBy(nodes, 'name'), 'type'),  // Sort nodes so on updates, they stay in same(-ish) order and can transition.
                function(n){                                // Calculate extra properties
                    n.isGlobal = false;
                    if (typeof n.format === 'string'){
                        if (n.format.toLowerCase().indexOf('workflow') > -1){
                            n.isGlobal = true;
                        }
                    }
                    return n;
                }
            );
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
        var fullHeight = p.innerHeight + p.innerMargin.top + p.innerMargin.bottom;
        return (
            <div className="nodes-layer-wrapper" style={{ width : p.contentWidth, height : fullHeight }}>
                <div className="nodes-layer" style={{ width : p.contentWidth, height : fullHeight }}>
                    {
                        NodesLayer.processNodes(this.props.nodes).map(function(node, i){
                            var nodeProps = _.extend( _.omit(p, 'children', 'nodes'), {
                                node : node,
                                onMouseEnter : p.onNodeMouseEnter && p.onNodeMouseEnter.bind(p.onNodeMouseEnter, node),
                                onMouseLeave : p.onNodeMouseLeave && p.onNodeMouseLeave.bind(p.onNodeMouseLeave, node),
                                onClick : typeof p.onNodeClick === 'function' && p.onNodeClick.bind(p.onNodeClick, node),
                                key : node.id || node.name || i
                            });
                            if (p.nodeElement) return React.cloneElement(p.nodeElement, nodeProps);
                            else return <Node {...nodeProps} />;
                        })
                    }
                </div>
            </div>
        );
    }

}
