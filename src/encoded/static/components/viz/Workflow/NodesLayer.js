'use strict';

var React = require('react');
import PropTypes from 'prop-types';
var _ = require('underscore');
import { console, Filters } from './../../util';
var ReactTooltip = require('react-tooltip');

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
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        return (
            <div className="nodes-layer-wrapper" style={{ width : this.props.contentWidth, height : fullHeight }}>
                <div className="nodes-layer" style={{ width : this.props.contentWidth, height : fullHeight }}>
                    {
                        NodesLayer.processNodes(this.props.nodes).map((node, i) =>
                            <Node
                                {..._.omit(this.props, 'children', 'nodes')}
                                node={node}
                                onMouseEnter={this.props.onNodeMouseEnter && this.props.onNodeMouseEnter.bind(this.props.onNodeMouseEnter, node)}
                                onMouseLeave={this.props.onNodeMouseLeave && this.props.onNodeMouseLeave.bind(this.props.onNodeMouseLeave, node)}
                                onClick={typeof this.props.onNodeClick === 'function' && this.props.onNodeClick.bind(this.props.onNodeClick, node)}
                                key={node.id || node.name}
                            />
                        )
                    }
                </div>
            </div>
        );
    }

}
