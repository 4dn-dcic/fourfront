'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import * as d3 from 'd3';
import { console } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';

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
    'drawBezierEdge' : function(startPt, endPt, columnSpacing, rowSpacing, nodeEdgeLedgeWidths){
        const ledgeWidths = nodeEdgeLedgeWidths;

        const path = d3.path();
        path.moveTo(startPt.x, startPt.y);
        path.lineTo(
            startPt.x + ledgeWidths[0],
            startPt.y
        ); // First ledge

        const nodeXDif = Math.abs(endPt.x - startPt.x);
        const bezierStartPt   = { 'x' : startPt.x + ledgeWidths[0], 'y' : startPt.y };
        const bezierEndPt     = { 'x' : endPt.x - ledgeWidths[1], 'y' : endPt.y  };

        if (nodeXDif > columnSpacing/* && Math.abs(endPt.y - startPt.y) <= this.props.rowSpacing * 2*/){ // Draw straight line until last section. Length depending on how close together y-axes are (revert to default bezier if far apart).
            bezierStartPt.x += Math.max( 0,  nodeXDif - (columnSpacing * (Math.abs(endPt.y - startPt.y) / rowSpacing * 2.5))  );
            //path.lineTo(bezierStartPt.x, bezierStartPt.y);
        }

        const bezierXDif = Math.abs(bezierStartPt.x - bezierEndPt.x);
        const controlPoints = [
            { 'x' : bezierStartPt.x + (bezierXDif * 0.5),   'y': startPt.y },
            { 'x' : bezierEndPt.x - (bezierXDif * 0.5),     'y': endPt.y }
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

    'drawStraightLineCurved' : memoize(function(startPt, endPt, curveRadius){
        const radius = Math.min(curveRadius, Math.abs(startPt.y - endPt.y) / 2);
        const arcYOffset = Math.min(Math.max(endPt.y - startPt.y, -radius), radius);
        const path = d3.path();

        path.moveTo(startPt.x, startPt.y);
        path.lineTo(
            startPt.x + ((endPt.x - startPt.x) / 2) - radius,
            startPt.y
        );

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
    }),

    'drawBezierEdgeVertices' : function(startPt, endPt, vertices, nodeEdgeLedgeWidths){
        const adjVertices = vertices.map(function(v){ return v.slice(); });
        adjVertices[0][0] = ((startPt && startPt.x) || adjVertices[0][0]);
        adjVertices[adjVertices.length - 1][0] = ((endPt && endPt.x) || adjVertices[adjVertices.length - 1][0]);
        if (nodeEdgeLedgeWidths[0]){
            adjVertices.unshift([ adjVertices[0][0], adjVertices[0][1] ]);
            adjVertices[1][0] += nodeEdgeLedgeWidths[0];
        }
        if (nodeEdgeLedgeWidths[1]){
            adjVertices.push([ adjVertices[adjVertices.length - 1][0], adjVertices[adjVertices.length - 1][1] ]);
            adjVertices[adjVertices.length - 2][0] -= nodeEdgeLedgeWidths[0];
        }
        adjVertices[0][0] = ((startPt && startPt.x) || adjVertices[0][0]);// + nodeEdgeLedgeWidths[0];
        adjVertices[adjVertices.length - 1][0] = ((endPt && endPt.x) || adjVertices[adjVertices.length - 1][0]);// - nodeEdgeLedgeWidths[1];
        const lineGenFxn = d3.line()
            .x(function(d){ return d[0]; })
            .y(function(d){ return d[1]; })
            .curve(d3.curveMonotoneX);
        return lineGenFxn(adjVertices);
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

    static isSelected(edge, selectedNode){
        return (
            Node.isSelected(edge.source, selectedNode) ||
            Node.isSelected(edge.target, selectedNode)
        );
    }

    static isRelated(edge, selectedNode){
        return Node.isRelated(edge.source, selectedNode);
        // Enable the following later _if_ we go beyond 1 input node deep.
        //return (
        //    Node.isRelated(edge.source, selectedNode) ||
        //    Node.isRelated(edge.target, selectedNode)
        //);
    }

    static isDistantlySelected(edge, selectedNode){
        if (!selectedNode) return false;

        function checkInput(node, prevNode, nextNodes){
            return Node.isSelected(edge.target, node);
        }

        function checkOutput(node, prevNode, nextNodes){
            return Node.isSelected(edge.source, node);
        }

        var selectedInputs = (selectedNode && (selectedNode.inputNodes || (selectedNode.outputOf && [selectedNode.outputOf]))) || null;

        if (Array.isArray(selectedInputs) && selectedInputs.length > 0){
            var resultsHistory = _.flatten(_.map(selectedInputs, function(sI){
                return traceNodePathAndRun(sI, checkInput, 'input', selectedNode);
            }), false);
            if (_.any(resultsHistory)) return true;
        }

        var selectedOutputs = (selectedNode && (selectedNode.outputNodes || (selectedNode.inputOf && selectedNode.inputOf))) || null;

        if (Array.isArray(selectedOutputs) && selectedOutputs.length > 0){
            var resultsFuture =  _.flatten(_.map(selectedOutputs, function(sO){
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

    static didNodeCoordinatesChange(nextProps, pastProps){
        if (
            nextProps.startX !== pastProps.startX ||
            nextProps.startY !== pastProps.startY ||
            nextProps.endX !== pastProps.endX ||
            nextProps.endY !== pastProps.endY
        ) return true;
        return false;
    }

    static defaultProps = {
        'edgeStyle' : 'bezier',
        'curveRadius' : 12
    };

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
        this.generatePathDimension = this.generatePathDimension.bind(this);
        this.transitionPathDimensions = this.transitionPathDimensions.bind(this);

        // Create own memoized copy/instance of intensive static functions.
        // Otherwise if left static, will be re-ran each time as many edges call it.

        this.memoized = {
            isDistantlySelected : memoize(Edge.isDistantlySelected),
            isRelated           : memoize(Edge.isRelated),
            isDisabled          : memoize(Edge.isDisabled),
            d : {
                drawBezierEdge          : memoize(pathDimensionFunctions.drawBezierEdge),
                drawBezierEdgeVertices  : memoize(pathDimensionFunctions.drawBezierEdgeVertices),
                drawStraightLineCurved  : memoize(pathDimensionFunctions.drawStraightLineCurved),
                drawStraightEdge        : memoize(pathDimensionFunctions.drawStraightEdge)
            }
        };

        this.getComputedProperties = this.getComputedProperties.bind(this);

        this.state = {
            'pathDimension' : this.generatePathDimension()
        };

        // Alternative implementation of transition -
        // adjust pathRef.current `d` attribute manually
        this.pathRef = React.createRef();
    }

    getComputedProperties(props = this.props){
        const { edge, selectedNode, isNodeDisabled } = props;
        const disabled = this.memoized.isDisabled(edge, isNodeDisabled);

        if (disabled || !selectedNode) {
            return { disabled, 'selected' : false, 'related' : false };
        }

        const selected = Edge.isSelected(edge, selectedNode);
        const related = this.memoized.isRelated(edge, selectedNode);
        const distantlySelected = selected || (selectedNode && this.memoized.isDistantlySelected(edge, selectedNode, disabled)) || false;

        return { disabled, selected, related, distantlySelected };
    }

    /**
     * If any of our nodes' coordinates have updated, update state.pathDimension either via a D3 animation tween acting on setState or instantly via setState.
     * Whether instant or gradual dimension update is based on result of `this.shouldDoTransitionOfEdge()` : boolean
     */
    componentDidUpdate(pastProps){
        const { startX, startY, endX, endY, edge } = this.props;
        if (Edge.didNodeCoordinatesChange(this.props, pastProps)){
            if (!this.shouldDoTransitionOfEdge()) {
                // Instant
                this.setState({ 'pathDimension' : this.generatePathDimension() });
            } else {
                // Animate
                const startEndPtCoords = [
                    { 'x' : pastProps.startX,   'y' : pastProps.startY },   // StartA
                    { 'x' : startX,             'y' : startY },             // StartB
                    { 'x' : pastProps.endX,     'y' : pastProps.endY },     // StartA
                    { 'x' : endX,               'y' : endY },               // StartB
                ];
                if (edge.vertices && pastProps.edge.vertices && edge.vertices.length === pastProps.edge.vertices.length){
                    this.transitionPathDimensions(
                        ...startEndPtCoords,
                        pastProps.edge.vertices,
                        edge.vertices,
                    );
                } else {
                    this.transitionPathDimensions(...startEndPtCoords);
                }
            }
        } else if (!_.isEqual(this.getPathOffsets(), this.getPathOffsets(pastProps))){
            // Instant
            this.setState({ 'pathDimension' : this.generatePathDimension() });
        }
    }

    shouldComponentUpdate(nextProps, nextState){
        if (Edge.didNodeCoordinatesChange(nextProps, this.props)){
            return true;
        }

        if (this.state.pathDimension !== nextState.pathDimension){
            return true;
        }

        const propKeys = _.without(
            _.keys(nextProps),
            'scrollContainerWrapperElement', 'scrollContainerWrapperMounted', 'nodes', 'edges', 'href', 'renderDetailPane',
            'isNodeCurrentContext', 'contentWidth', 'onNodeClick', 'edgeCount'
        );
        const propKeysLen = propKeys.length;
        var i;

        for (i = 0; i < propKeysLen; i++){
            if (this.props[propKeys[i]] !== nextProps[propKeys[i]]){
                return true;
            }
        }

        // If state.pathDimension changes we _do not_ update, since DOM elements should already be transitioned.
        return false;
    }

    shouldDoTransitionOfEdge(props = this.props){
        if (props.noTransition) return false;
        // Until we adjust all Edges to transition within a single DOM update/redraw,
        // we optimize by not transitioning unless <= 50 edges.
        // This is because each Edge currently launches own transition
        // which cascades into an exponential number of transitions/viewport-updates.
        if (props.edgeCount > 60) return false;
        return true;
    }

    /**
     * Transitions edge dimensions over time.
     * Updates `state.pathDimension` incrementally using d3.transition().
     *
     * @todo
     * In future, all transitions could be done in `EdgesLayer` instead of `Edge`,
     * this would allow us to batch all the DOM updates into a single function wrapped
     * in a `requestAnimationFrame` call. This will require some dynamic programming as
     * well as caching of ege:node-coords to detect changes and run transitions.
     * The changeTween itself should transition _all_ Edges that need to be transitioned.
     */
    transitionPathDimensions(startPtA, startPtB, endPtA, endPtB, startVertices, endVertices){
        const interpolateSourceX = d3.interpolateNumber(startPtA.x, startPtB.x);
        const interpolateSourceY = d3.interpolateNumber(startPtA.y, startPtB.y);
        const interpolateTargetX = d3.interpolateNumber(endPtA.x, endPtB.x);
        const interpolateTargetY = d3.interpolateNumber(endPtA.y, endPtB.y);
        let interpolationFxnPerVertex = null;

        if (startVertices && endVertices){
            interpolationFxnPerVertex = startVertices.map(function(startV, idx){
                return [
                    d3.interpolateNumber(startV[0], endVertices[idx][0]),
                    d3.interpolateNumber(startV[1], endVertices[idx][1])
                ];
            });
        }

        const pathElem = this.pathRef.current; // Necessary if using alternate transition approach(es).
        const changeTween = () =>
            (t) => {
                const nextCoords = [
                    { 'x' : interpolateSourceX(t), 'y' : interpolateSourceY(t) },
                    { 'x' : interpolateTargetX(t), 'y' : interpolateTargetY(t) }
                ];
                let nextVs = null;
                if (interpolationFxnPerVertex){
                    nextVs = interpolationFxnPerVertex.map(function([ interpX, interpY ], idx){
                        return [ interpX(t), interpY(t) ];
                    });
                }
                pathElem.setAttribute('d', this.generatePathDimension(...nextCoords, nextVs));
            };

        if (!pathElem) return;

        var animation = d3.select(this)
            .interrupt()
            .transition()
            .ease(d3.easeQuadOut)
            .duration(500)
            .tween("changeDimension", changeTween)
            .on('end', () => {
                this.setState({ 'pathDimension': this.generatePathDimension() });
            });
    }

    getPathOffsets(startOffset = 5, endOffset = -5, props = this.props){
        var { edge, pathArrows } = props,
            { disabled, selected, related, distantlySelected } = this.getComputedProperties(props);
        if (pathArrows)             endOffset -= 10;
        if (selected || related)    endOffset -= 5;
        if (distantlySelected)      endOffset -= 2;
        if (edge.source.isCurrentContext) startOffset += 5;
        if (edge.target.isCurrentContext) endOffset -= 5;
        return { startOffset, endOffset };
    }

    generatePathDimension(startPtOverride = null, endPtOverride = null, edgeVerticesOverride = null){
        const {
            edgeStyle, startX, startY, endX, endY, columnWidth,
            curveRadius, columnSpacing, rowSpacing, nodeEdgeLedgeWidths,
            edge: { vertices: customEdgeVertices = null }
        } = this.props;
        const { startOffset, endOffset } = this.getPathOffsets();

        const startPt = {
            'x' : ((startPtOverride && startPtOverride.x) || startX) + columnWidth + startOffset,
            'y' : ((startPtOverride && startPtOverride.y) || startY)
        };
        const endPt = {
            'x' : ((endPtOverride && endPtOverride.x) || endX) + endOffset,
            'y' : ((endPtOverride && endPtOverride.y) || endY)
        };

        if (customEdgeVertices || edgeVerticesOverride){
            return this.memoized.d.drawBezierEdgeVertices(startPt, endPt, edgeVerticesOverride || customEdgeVertices, nodeEdgeLedgeWidths);
        }

        if (edgeStyle === 'straight'){
            return this.memoized.d.drawStraightEdge(startPt, endPt);
        }
        if (edgeStyle === 'curve'){
            return this.memoized.d.drawStraightLineCurved(startPt, endPt, curveRadius);
        }
        if (edgeStyle === 'bezier'){
            return this.memoized.d.drawBezierEdge(startPt, endPt, columnSpacing, rowSpacing, nodeEdgeLedgeWidths);
        }
    }

    render(){
        const { edge, pathArrows, style } = this.props;
        const { pathDimension } = this.state;
        const { disabled, selected, related, distantlySelected } = this.getComputedProperties();
        let markerEnd;

        if (!pathArrows) {
            markerEnd = null;
        } else if (selected || related || distantlySelected){
            markerEnd = 'pathArrowBlack';
        } else if (disabled) {
            markerEnd = 'pathArrowLightGray';
        } else {
            markerEnd = 'pathArrowGray';
        }

        return (
            <path d={pathDimension} ref={this.pathRef} className={"edge-path" + (disabled ? ' disabled' : '' )}
                data-edge-selected={selected || distantlySelected} data-edge-related={related}
                data-source={edge.source.name} data-target={edge.target.name} style={style}
                markerEnd={markerEnd && "url(#" + markerEnd + ")"} />
        );
    }
}
