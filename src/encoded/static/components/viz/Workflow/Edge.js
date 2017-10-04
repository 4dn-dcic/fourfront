'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import { console } from './../../util';

import Node from './Node';
import { traceNodePathAndRun } from './parsing-functions';


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

    static isDistantlyRelated(edge, selectedNode, isNodeDisabled){
        if (Edge.isDisabled(edge, isNodeDisabled)) return false;
        if (!selectedNode) return false;
        if (selectedNode.column < edge.source.column) return false;
        var selectedInputs = (selectedNode && (selectedNode.inputNodes || (selectedNode.outputOf && [selectedNode.outputOf]))) || null;

        function check(node, prevNode, nextNodes){
            return Node.isSelected(edge.target, node);
        }

        if (Array.isArray(selectedInputs) && selectedInputs.length > 0){
            var results = _.flatten(_.map(selectedInputs, (sI)=>{
                return traceNodePathAndRun(sI, check, 'input', selectedNode);
            }), false);

            return _.any(results);
        }
        return false;
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

    /**
     * Draw a bezier path from startPt to endPt.
     * 
     * @param {Object} startPt - Object with x and y coordinates.
     * @param {Object} endPt - Object with x and y coordinates.
     * @param {Number[]} [ledgeWidths] - Little widths of line right before/after node. To allow for horizontal arrow.
     * @returns {string} 'd' attribute value for an SVG path.
     */
    static drawBezierEdge(startPt, endPt, config){
        var { rowSpacing, columnSpacing, nodeEdgeLedgeWidths } = config;
        var ledgeWidths = nodeEdgeLedgeWidths;

        var path = d3.path();
        path.moveTo(startPt.x, startPt.y);
        path.lineTo(
            startPt.x + ledgeWidths[0],
            startPt.y
        ); // First ledge

        var nodeXDif = Math.abs(endPt.x - startPt.x);
        var bezierStartPt   = { 'x' : startPt.x + ledgeWidths[0], 'y' : startPt.y },
            bezierEndPt     = { 'x' : endPt.x - ledgeWidths[1], 'y' : endPt.y  };

        if (nodeXDif > columnSpacing/* && Math.abs(endPt.y - startPt.y) <= this.props.rowSpacing * 2*/){ // Draw straight line until last section. Length depending on how close together y-axes are (revert to default bezier if far apart).
            bezierStartPt.x += Math.max( 0,  nodeXDif - (columnSpacing * (Math.abs(endPt.y - startPt.y) / rowSpacing * 2.5))  );
            //path.lineTo(bezierStartPt.x, bezierStartPt.y);
        }

        var bezierXDif = Math.abs(bezierStartPt.x - bezierEndPt.x);

        var controlPoints = [
            {'x' : bezierStartPt.x + (bezierXDif * 0.5),   'y': startPt.y},
            {'x' : bezierEndPt.x - (bezierXDif * 0.5),     'y': endPt.y}
        ];

        if (startPt.x > endPt.x){
            // Our input edge appears AFTER the target.
            //var dif = Math.min(1, 5 / Math.max(1, Math.abs(endPt.y - startPt.y) )) * (this.props.rowSpacing || 75);
            var dif = Math.max(rowSpacing || 75);
            controlPoints[0].y += dif * (endPt.y >= startPt.y ? 1 : -1);
            controlPoints[1].y += dif * (endPt.y - startPt.y > rowSpacing ? -1 : 1);
            controlPoints[1].x = endPt.x - (Math.abs(endPt.x - startPt.x) * .5);

        }

        path.bezierCurveTo(
            controlPoints[0].x,
            controlPoints[0].y,// - pathAscend,
            controlPoints[1].x,
            controlPoints[1].y,// + pathAscend,
            bezierEndPt.x, endPt.y
        );
        
        // Final ledge
        path.lineTo(
            endPt.x,
            endPt.y
        );
        return path.toString();
    }

    static drawStraightLineCurved(startPt, endPt, config){
        var path;
        var radius = config.curveRadius || config.radius;
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

        return path.toString();
    }

    static drawStraightLineToCurve(){

    }

    /**
     * @deprecated
     */
    static drawStraightEdge(startPt, endPt){
        var path;
        path = d3.path();
        path.moveTo(startPt.x, startPt.y);
        path.lineTo(endPt.x, endPt.y);
        path.closePath();
        return path.toString();
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

    generatePathDimension(edge, edgeStyle = 'bezier', startOffset = 5, endOffset = -5){
        if (this.props.pathArrows){
            endOffset -= 10;
        }
        if (Edge.isSelected(edge, this.props.selectedNode, this.props.isNodeDisabled) || Edge.isRelated(edge, this.props.selectedNode, this.props.isNodeDisabled)){
            endOffset -= 2;
        }
        if (typeof this.props.isNodeCurrentContext === 'function' && this.props.isNodeCurrentContext(edge.source)){
            startOffset += 5;
        }
        if (typeof this.props.isNodeCurrentContext === 'function' && this.props.isNodeCurrentContext(edge.target)){
            endOffset -= 5;
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
            return Edge.drawStraightEdge(startPt, endPt);
        }
        if (edgeStyle === 'curve'){
            return Edge.drawStraightLineCurved(startPt, endPt, _.pick(this.props, 'curveRadius'));
        }
        if (edgeStyle === 'bezier'){
            return Edge.drawBezierEdge(startPt, endPt, _.pick(this.props, 'columnSpacing', 'rowSpacing', 'nodeEdgeLedgeWidths'));
        }
    }

    render(){
        var edge = this.props.edge;
        var disabled = Edge.isDisabled(edge, this.props.isNodeDisabled);
        var selected = Edge.isSelected(edge, this.props.selectedNode, disabled);
        var related = false;//Edge.isRelated(edge, this.props.selectedNode, disabled);
        var isDistantlyRelated = false;
        if (!related && this.props.selectedNode){
            isDistantlyRelated = Edge.isDistantlyRelated(edge, this.props.selectedNode, disabled);
        }
        return (
            <path
                d={this.generatePathDimension(edge, this.props.edgeStyle)}
                className={"edge-path" + (disabled ? ' disabled' : '' )}
                data-edge-selected={selected}
                data-edge-related={related || isDistantlyRelated}
                data-source={edge.source.name}
                data-target={edge.target.name}
                markerEnd={this.props.pathArrows ? "url(#pathArrow)" : null}
            />
        );
    }
}
