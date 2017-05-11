'use strict';

var React = require('react');
import PropTypes from 'prop-types';
var _ = require('underscore');
var d3 = require('d3');
import { console } from './../../util';

import Node from './Node';


export default class Edge extends React.Component {

    static isSelected(edge, selectedNode, isNodeDisabled = null){
        return (
            Node.isSelected(edge.source, selectedNode) ||
            Node.isSelected(edge.target, selectedNode)
        ) && !Edge.isDisabled(edge, isNodeDisabled);
    }

    static isDisabled(edge, isNodeDisabled = null){
        if (typeof isNodeDisabled === 'boolean') return isNodeDisabled;
        return (
            typeof isNodeDisabled === 'function' &&
            (
                isNodeDisabled(edge.source) ||
                isNodeDisabled(edge.target)
            )
        );
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.generatePathDimension = this.generatePathDimension.bind(this);
    }

    generatePathDimension(edge, edgeStyle = 'curve', radius = 12){
        var startOffset = 5;//(edge.source.type === 'input' || edge.source.type === 'output') ? 0 : 5;
        var endOffset = -5; //(edge.target.type === 'input' || edge.target.type === 'output') ? 0 : -5;
        if (this.props.pathArrows){
            endOffset -= 8;
        }
        if (Edge.isSelected(edge, this.props.selectedNode, this.props.isNodeDisabled)){
            endOffset -= 2;
        }
        
        var startPt = {
            x : edge.source.x + this.props.columnWidth + startOffset,
            y : edge.source.y
        };

        var endPt = {
            x : edge.target.x + endOffset,
            y : edge.target.y
        };

        if (edgeStyle === 'straight'){
            var path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(endPt.x, endPt.y);
            path.closePath();
            return path.toString();
        }
        if (edgeStyle === 'curve'){
            var path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(
                startPt.x + ((endPt.x - startPt.x) / 2) - radius,
                startPt.y
            );

            var arcYOffset = Math.min(Math.max(endPt.y - startPt.y, -radius), radius)

            path.arcTo(
                startPt.x + ((endPt.x - startPt.x) / 2),
                startPt.y,
                startPt.x + ((endPt.x - startPt.x) / 2),
                startPt.y + arcYOffset,
                radius
            );

            path.lineTo(
                startPt.x + ((endPt.x - startPt.x) / 2),
                endPt.y - arcYOffset
            );

            path.arcTo(
                startPt.x + ((endPt.x - startPt.x) / 2),
                endPt.y,
                startPt.x + ((endPt.x - startPt.x) / 2) + radius,
                endPt.y,
                radius
            );

            path.lineTo(
                endPt.x,
                endPt.y
            );
            
            //path.closePath();
            return path.toString();
        }
    }

    render(){
        var edge = this.props.edge;
        var disabled = Edge.isDisabled(edge, this.props.isNodeDisabled);
        return (
            <path
                d={this.generatePathDimension(edge)}
                className={"edge-path" + (disabled ? ' disabled' : '' )}
                data-edge-selected={Edge.isSelected(edge, this.props.selectedNode, disabled)}
                data-source={edge.source.name}
                data-target={edge.target.name}
                markerEnd={this.props.pathArrows ? "url(#pathArrow)" : null}
            />
        );
    }
}
