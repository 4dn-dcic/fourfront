'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import { console } from './../../util';

import Node from './Node';


export default class Edge extends React.Component {

    static isSelected(edge, selectedNode, isNodeDisabled = null){
        return (
            Node.isSelected(edge.source, selectedNode) ||
            Node.isSelected(edge.target, selectedNode)
        ) && !Edge.isDisabled(edge, isNodeDisabled);
    }

    static isRelated(edge, selectedNode, isNodeDisabled = null){
        return (
            Node.isRelated(edge.source, selectedNode) ||
            Node.isRelated(edge.target, selectedNode)
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

    static defaultProps = {
        'edgeStyle' : 'bezier',
        'curveRadius' : 12
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.generatePathDimension = this.generatePathDimension.bind(this);
    }

    generatePathDimension(edge, edgeStyle = 'bezier', radius = 12, startOffset = 5, endOffset = -5){
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

        var pathAscend;
        var path;
        var controlPoints;
        if (edgeStyle === 'straight'){
            path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(endPt.x, endPt.y);
            path.closePath();
            return path.toString();
        }
        if (edgeStyle === 'curve'){
            path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(
                startPt.x + ((endPt.x - startPt.x) / 2) - radius,
                startPt.y
            );

            var arcYOffset = Math.min(Math.max(endPt.y - startPt.y, -radius), radius);

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
        if (edgeStyle === 'bezier'){
            //pathAscend = endPt.y > startPt.y ? 10 : (endPt.y === startPt.y ? 0 : -10);
            path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(
                startPt.x + 3,
                startPt.y
            );
            controlPoints = [
                {'x' : startPt.x + (Math.abs(endPt.x - startPt.x) * 0.5),   'y': startPt.y},
                {'x' : endPt.x - (Math.abs(endPt.x - startPt.x) * 0.8),     'y': endPt.y}
            ];
            if (startPt.x > endPt.x){
                // Our input edge appears AFTER the target.
                //var dif = Math.min(1, 5 / Math.max(1, Math.abs(endPt.y - startPt.y) )) * (this.props.rowSpacing || 75);
                var dif = Math.max(this.props.rowSpacing || 75);
                controlPoints[0].y += dif * (endPt.y >= startPt.y ? 1 : -1);
                controlPoints[1].y += dif * (endPt.y - startPt.y > this.props.rowSpacing ? -1 : 1);
                controlPoints[1].x = endPt.x - (Math.abs(endPt.x - startPt.x) * .5);

            }
            path.bezierCurveTo(
                controlPoints[0].x,
                controlPoints[0].y,// - pathAscend,
                controlPoints[1].x,
                controlPoints[1].y,// + pathAscend,
                endPt.x - 5, endPt.y
            );
            path.lineTo(
                endPt.x,
                endPt.y
            );
            return path.toString();
        }
        if (edgeStyle === 'bezier-old'){
            //pathAscend = endPt.y > startPt.y ? 10 : (endPt.y === startPt.y ? 0 : -10);
            path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(
                startPt.x + 3,
                startPt.y
            );
            controlPoints = [
                {'x' : startPt.x + ((endPt.x - startPt.x) * 0.5),   'y': startPt.y},
                {'x' : endPt.x - ((endPt.x - startPt.x) * 0.8),     'y': endPt.y}
            ];
            path.bezierCurveTo(
                controlPoints[0].x,
                controlPoints[0].y,// - pathAscend,
                controlPoints[1].x,
                controlPoints[1].y,// + pathAscend,
                endPt.x - 5, endPt.y
            );
            path.lineTo(
                endPt.x,
                endPt.y
            );
            return path.toString();
        }
    }

    render(){
        var edge = this.props.edge;
        var disabled = Edge.isDisabled(edge, this.props.isNodeDisabled);
        var selected = Edge.isSelected(edge, this.props.selectedNode, disabled);
        var related = Edge.isRelated(edge, this.props.selectedNode, disabled);
        return (
            <path
                d={this.generatePathDimension(edge, this.props.edgeStyle, this.props.curveRadius)}
                className={"edge-path" + (disabled ? ' disabled' : '' )}
                data-edge-selected={selected}
                data-edge-related={related}
                data-source={edge.source.name}
                data-target={edge.target.name}
                markerEnd={this.props.pathArrows ? "url(#pathArrow)" : null}
            />
        );
    }
}
