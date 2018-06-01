'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import { console } from './../../util';

import Node from './Node';
import { traceNodePathAndRun } from './parsing-functions';


export const pathDimensionFunctions = {

    /**
     * Draw a bezier path from startPt to endPt.
     * 
     * @param {Object} startPt - Object with x and y coordinates.
     * @param {Object} endPt - Object with x and y coordinates.
     * @param {Number[]} [ledgeWidths] - Little widths of line right before/after node. To allow for horizontal arrow.
     * @returns {string} 'd' attribute value for an SVG path.
     */
    'drawBezierEdge' : function(startPt, endPt, config){
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
    },

    'drawStraightLineCurved' : function(startPt, endPt, config){
        var path;
        var radius = Math.min(config.curveRadius || config.radius, Math.abs(startPt.y - endPt.y) / 2);
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
    },

    drawStraightLineToCurve : function(){

    },

    /**
     * @deprecated
     */
    'drawStraightEdge' : function(startPt, endPt){
        var path;
        path = d3.path();
        path.moveTo(startPt.x, startPt.y);
        path.lineTo(endPt.x, endPt.y);
        path.closePath();
        return path.toString();
    }
};


export default class Edge extends React.Component {

    static isSelected(edge, selectedNode, isNodeDisabled = null){
        return (
            Node.isSelected(edge.source, selectedNode) ||
            Node.isSelected(edge.target, selectedNode)
        );
    }

    static isRelated(edge, selectedNode, isNodeDisabled = null){
        return (
            Node.isRelated(edge.source, selectedNode) ||
            Node.isRelated(edge.target, selectedNode)
        );
    }

    static isDistantlyRelated(edge, selectedNode, isNodeDisabled){
        //if (Edge.isDisabled(edge, isNodeDisabled)) return false;
        if (!selectedNode) return false;

        function checkInput(node, prevNode, nextNodes){
            return Node.isSelected(edge.target, node);
        }

        function checkOutput(node, prevNode, nextNodes){
            return Node.isSelected(edge.source, node);
        }

        var selectedInputs = (selectedNode && (selectedNode.inputNodes || (selectedNode.outputOf && [selectedNode.outputOf]))) || null;

        if (Array.isArray(selectedInputs) && selectedInputs.length > 0){
            var resultsHistory = _.flatten(_.map(selectedInputs, (sI)=>{
                return traceNodePathAndRun(sI, checkInput, 'input', selectedNode);
            }), false);
            if (_.any(resultsHistory)) return true;
        }

        var selectedOutputs = (selectedNode && (selectedNode.outputNodes || (selectedNode.inputOf && selectedNode.inputOf))) || null;

        if (Array.isArray(selectedOutputs) && selectedOutputs.length > 0){
            var resultsFuture =  _.flatten(_.map(selectedOutputs, (sO)=>{
                return traceNodePathAndRun(sO, checkOutput, 'output', selectedNode);
            }), false);
            if (_.any(resultsFuture)) return true;
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

    static getComputedProperties(props){
        var edge = props.edge;
        var disabled = Edge.isDisabled(edge, props.isNodeDisabled);
        var selected = Edge.isSelected(edge, props.selectedNode, disabled);
        var related = false;//Edge.isRelated(edge, this.props.selectedNode, disabled);
        //var isDistantlyRelated = false;
        if (!related && props.selectedNode){
            //isDistantlyRelated
            related = Edge.isDistantlyRelated(edge, props.selectedNode, disabled);
        }
        return { disabled, selected, related };
    }

    static defaultProps = {
        'edgeStyle' : 'bezier',
        'curveRadius' : 12
    }

    static pathArrowsMarkers(){
        return (
            <defs>
                <marker
                    id="pathArrowBlack"
                    viewBox="0 0 15 15" refX="0" refY="5" orient="auto"
                    markerUnits="strokeWidth" markerWidth="6" markerHeight="5">
                    <path d="M 0 0 L 10 5 L 0 10 Z" className="pathArrow-marker marker-color-black" />
                </marker>
                <marker
                    id="pathArrowGray"
                    viewBox="0 0 15 15" refX="0" refY="5" orient="auto"
                    markerUnits="strokeWidth" markerWidth="6" markerHeight="5">
                    <path d="M 0 0 L 10 5 L 0 10 Z" className="pathArrow-marker marker-color-gray" />
                </marker>
                <marker
                    id="pathArrowLightGray"
                    viewBox="0 0 15 15" refX="0" refY="5" orient="auto"
                    markerUnits="strokeWidth" markerWidth="6" markerHeight="5">
                    <path d="M 0 0 L 10 5 L 0 10 Z" className="pathArrow-marker marker-color-light-gray" />
                </marker>
            </defs>
        );
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.generatePathDimension = this.generatePathDimension.bind(this);
        this.state = _.extend({
            'pathDimension' : this.generatePathDimension(props.edge, props.edgeStyle)
        }, Edge.getComputedProperties(props));
    }

    /**
     * If any of our nodes' coordinates have updated, update state.pathDimension either via a D3 animation tween acting on setState or instantly via setState.
     * Whether instant or gradual dimension update is based on result of this.doTransitionOfEdge() : boolean/
     */
    componentDidUpdate(pastProps){
        if (this.didNodeCoordinatesChange(this.props, pastProps)){
            if (this.doTransitionOfEdge()) {
                // Animate
                this.transitionPathDimensions(
                    { 'x' : pastProps.startX,   'y' : pastProps.startY },
                    { 'x' : this.props.startX,  'y' : this.props.startY },
                    { 'x' : pastProps.endX,     'y' : pastProps.endY },
                    { 'x' : this.props.endX,    'y' : this.props.endY },
                );
            } else {
                // Instant
                this.setState({
                    'pathDimension' : this.generatePathDimension(this.props.edge, this.props.edgeStyle)
                });
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState){
        var propKeys = _.without(_.keys(nextProps), 'scrollContainerWrapperElement', 'scrollContainerWrapperMounted', 'nodes', 'edges', 'href', 'renderDetailPane');
        var stateKeys = _.keys(nextState);
        var i;
        for (i = 0; i < propKeys.length; i++){
            if (this.props[propKeys[i]] !== nextProps[propKeys[i]]){
                return true;
            }
        }
        for (i = 0; i < stateKeys.length; i++){
            if (this.state[stateKeys[i]] !== nextState[stateKeys[i]]){
                return true;
            }
        }
        if (this.didNodeCoordinatesChange(nextProps, this.props)){
            return true;
        }
        return false;
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.selectedNode !== this.props.selectedNode){
            this.setState(Edge.getComputedProperties(nextProps));
        }
    }

    doTransitionOfEdge(props = this.props){
        if (props.noTransition) return false;
        if (props.edgeCount > 80) return false;
        return true;
    }

    didNodeCoordinatesChange(nextProps, pastProps){
        if (
            nextProps.startX !== pastProps.startX ||
            nextProps.startY !== pastProps.startY ||
            nextProps.endX !== pastProps.endX ||
            nextProps.endY !== pastProps.endY
        ) return true;
        return false;
    }

    transitionPathDimensions(startPtA, startPtB, endPtA, endPtB){

        var changeTween = function(){
            return (function(){
                var interpolateSourceX = d3.interpolateNumber(startPtA.x, startPtB.x);
                var interpolateSourceY = d3.interpolateNumber(startPtA.y, startPtB.y);
                var interpolateTargetX = d3.interpolateNumber(endPtA.x, endPtB.x);
                var interpolateTargetY = d3.interpolateNumber(endPtA.y, endPtB.y);

                return (t)=>{
                    this.setState({
                        'pathDimension' : this.generatePathDimension(this.props.edge, this.props.edgeStyle,
                            { 'x' : interpolateSourceX(t), 'y' : interpolateSourceY(t) },
                            { 'x' : interpolateTargetX(t), 'y' : interpolateTargetY(t) },
                        )
                    });
                    //window.scrollTo(0, interpolate(t));
                };
            }.bind(this));
        }.bind(this);

        //var origScrollTop = scrollElement.scrollTop;
        var animation = d3.select(this)
            .interrupt()
            .transition()
            .ease(d3.easeQuadOut)
            .duration(500)
            .tween("changeDimension", changeTween());
    }

    generatePathDimension(edge, edgeStyle = 'bezier', startPtOverride = null, endPtOverride = null, startOffset = 5, endOffset = -5){
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
            x : ((startPtOverride && startPtOverride.x) || this.props.startX) + this.props.columnWidth + startOffset,
            y : ((startPtOverride && startPtOverride.y) || this.props.startY)
        };

        var endPt = {
            x : ((endPtOverride && endPtOverride.x) || this.props.endX) + endOffset,
            y : ((endPtOverride && endPtOverride.y) || this.props.endY)
        };

        if (edgeStyle === 'straight'){
            return pathDimensionFunctions.drawStraightEdge(startPt, endPt);
        }
        if (edgeStyle === 'curve'){
            return pathDimensionFunctions.drawStraightLineCurved(startPt, endPt, _.pick(this.props, 'curveRadius'));
        }
        if (edgeStyle === 'bezier'){
            return pathDimensionFunctions.drawBezierEdge(startPt, endPt, _.pick(this.props, 'columnSpacing', 'rowSpacing', 'nodeEdgeLedgeWidths'));
        }
    }

    render(){
        var edge = this.props.edge;
        var { disabled, selected, related, pathDimension } = this.state;

        var markerEnd;
        if (!this.props.pathArrows)     markerEnd = null;
        else if (selected || related)   markerEnd = 'pathArrowBlack';
        else if (disabled)              markerEnd = 'pathArrowLightGray';
        else                            markerEnd = 'pathArrowGray';

        return (
            <path
                d={pathDimension}
                className={"edge-path" + (disabled ? ' disabled' : '' )}
                data-edge-selected={selected}
                data-edge-related={related}
                data-source={edge.source.name}
                data-target={edge.target.name}
                markerEnd={markerEnd && "url(#" + markerEnd + ")"}
            />
        );
    }
}
