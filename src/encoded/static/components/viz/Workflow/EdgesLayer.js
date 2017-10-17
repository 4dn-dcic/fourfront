'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { console } from './../../util';

import Edge from './Edge';


export default class EdgesLayer extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    pathArrows(){
        if (!this.props.pathArrows) return null;
        return Edge.pathArrowsMarker();
    }

    render(){
        var fullHeight = this.props.outerHeight;
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        var divWidth = Math.max(fullWidth, this.props.contentWidth);
        var edges = this.props.edges;
        var edgeCount = edges.length;
        return (
            <div className="edges-layer-wrapper" style={{ width : divWidth, height : fullHeight }}>
                <svg className="edges-layer" width={ divWidth } height={ fullHeight }>
                    { this.pathArrows() }
                    {
                        // Move selected edges to top, and disabled ones to bottom, because CSS z-index doesn't work for SVG elements.
                        edges.sort((a,b)=>{
                            var isASelected = Edge.isSelected(a, this.props.selectedNode, this.props.isNodeDisabled);
                            var isBSelected = Edge.isSelected(b, this.props.selectedNode, this.props.isNodeDisabled);

                            if (isASelected && !isBSelected){
                                return 1;
                            } else if (!isASelected && isBSelected){
                                return -1;
                            } else {
                                return 0;
                            }
                        }).sort((a,b)=>{
                            var isADisabled = Edge.isDisabled(a, this.props.isNodeDisabled);
                            var isBDisabled = Edge.isDisabled(b, this.props.isNodeDisabled);

                            if (isADisabled && !isBDisabled){
                                return -1;
                            } else if (!isADisabled && isBDisabled) {
                                return 1;
                            } else {
                                return 0;
                            }
                        }).map((edge)=>
                            <Edge
                                {...this.props}
                                edge={edge}
                                edgeCount={edgeCount}
                                startX={edge.source.x}
                                startY={edge.source.y}
                                endX={edge.target.x}
                                endY={edge.target.y}
                                key={(edge.source.id || edge.source.name) + "----" + (edge.target.id || edge.target.name)}
                            />
                        )
                    }
                </svg>
            </div>
        );
    }

}
