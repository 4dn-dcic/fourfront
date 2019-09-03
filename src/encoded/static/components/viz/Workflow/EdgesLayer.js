'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { TransitionGroup, Transition } from 'react-transition-group';
import { path as d3Path } from 'd3';

import Edge from './Edge';





export function traceEdges(
    originalEdges,
    nodes,
    columnWidth, columnSpacing, rowSpacing, contentWidth, contentHeight, innerMargin, nodeEdgeLedgeWidths = [10, 10]
){
    const topMargin = (innerMargin && innerMargin.top) || 0;
    const leftMargin = (innerMargin && innerMargin.left) || 0;
    const endHeight = topMargin + contentHeight + (innerMargin && Math.max(0, innerMargin.bottom - 10)) || 0;
    const colStartXMap = {}; // Filled in visibility graph

    const nodesByColumn = _.reduce(nodes, function(m, node){
        const { column } = node;
        if (typeof m[column] === 'undefined'){
            m[column] = []; // Keys assigned as str, not numbers
        }
        m[column].push(node);
        return m;
    }, {});
    const columnCount = _.keys(nodesByColumn).length;

    function buildVisibilityGraph(subdivisions = 4){
        // Horizontal Line Y Coords
        const partialHeight = rowSpacing / subdivisions;
        const quarterHeight = rowSpacing / 4;
        const horizontalLineYCoords = [];
        let currY = topMargin;
        while (currY >= 10){
            currY -= partialHeight;
        }
        while (currY < endHeight){
            currY += partialHeight;
            horizontalLineYCoords.push(currY);
        }

        const segments = [];

        for (let columnIdx = 0; columnIdx < columnCount; columnIdx++){
            const nodesInColYCoords = _.pluck(nodesByColumn[columnIdx], 'y');
            const nodesInColYCoordsLen = nodesInColYCoords.length;
            let colStartX = colStartXMap[columnIdx];
            if (typeof colStartX === 'undefined'){
                colStartX = colStartXMap[columnIdx] = leftMargin + (columnIdx * columnWidth) + (columnSpacing * columnIdx);
            }
            const colEndX = colStartX + columnWidth;
            _.forEach(horizontalLineYCoords, function(yCoord){
                for (let i = 0; i < nodesInColYCoordsLen; i++){
                    const highY = nodesInColYCoords[i] + quarterHeight;
                    const lowY = nodesInColYCoords[i] - quarterHeight;
                    if (yCoord <= highY && yCoord >= lowY){
                        return;
                    }
                }
                const segment = [[colStartX, yCoord], [colEndX, yCoord]];
                segments.push(segment);
            });
        }

        console.log('HORZ', horizontalLineYCoords, endHeight, nodesByColumn, segments);
        return segments;
    }

    function assembleSegments(segmentQ, subdivisionsUsed = 4){

        function getNearestSegment(columnIdx, prevYCoord, targetYCoord, previousEdges = []){
            const segmentQLen = segmentQ.length;
            const startXForCol = colStartXMap[columnIdx];
            const prevEdgesLen = previousEdges.length;

            const upperY = Math.max(prevYCoord, targetYCoord);
            const lowerY = Math.min(prevYCoord, targetYCoord);
            //const yCoordMedian = (prevYCoord + targetYCoord) / 2;

            let closestSegmentDiff = Infinity;
            let closestSegmentIdx = -1;
            let currSegment = null, currDiff = null, currSegmentY = 0;
            let i, j, prevEdge, prevVs, intersections = 0;
            for (i = 0; i < segmentQLen; i++){
                currSegment = segmentQ[i];
                currSegmentY = currSegment[0][1];
                if (currSegment[0][0] !== startXForCol){
                    continue;
                }

                //currDiff = Math.abs(yCoordMedian - currSegmentY);
                if (currSegmentY > upperY){
                    currDiff = currSegmentY - upperY;
                } else if (currSegmentY < lowerY){
                    currDiff = lowerY - currSegmentY;
                } else {
                    // Any path between lower and upper bound is fine.
                    // Favor those closer to prev edge
                    //currDiff = Math.abs(yCoordMedian - currSegmentY) * 0.1;
                    currDiff = Math.abs(prevYCoord - currSegmentY) * 0.1;
                }

                // Check for intersections, add to score
                intersections = 0;
                for (j = 0; j < prevEdgesLen; j++){
                    prevEdge = previousEdges[j];
                    if (Array.isArray(prevEdge.vertices)){
                        prevVs = prevEdge.vertices;
                    } else {
                        prevVs = [
                            [ prevEdge.source.x + columnWidth, prevEdge.source.y ],
                            [ prevEdge.target.x, prevEdge.target.y ]
                        ];
                    }

                    prevVs.reduce(function(prevV, v){
                        if (!prevV){
                            return v;
                        }
                        if (!(prevV[0] <= startXForCol && v[0] >= startXForCol)){
                            return v;
                        }
                        if (
                            (v[1] > currSegmentY && prevV[1] < prevYCoord) ||
                            (v[1] < currSegmentY && prevV[1] > prevYCoord)
                        ) {
                            if (intersections === 0) intersections += 2;
                            intersections++;
                        }
                        return v;
                    }, null);

                }

                currDiff += (intersections * (rowSpacing / 2));

                if (closestSegmentDiff > currDiff){
                    closestSegmentDiff = currDiff;
                    closestSegmentIdx = i;
                }

            }
            if (closestSegmentIdx === -1){
                return null;
            }
            const bestSegment = segmentQ[closestSegmentIdx];
            segmentQ.splice(closestSegmentIdx, 1);
            return bestSegment;
        }

        const originalEdgesSortedByLength = originalEdges.slice(0).sort(function(edgeA, edgeB){
            // Handle the shorter edges first
            const { source: sA, target: tA } = edgeA;
            const { source: sB, target: tB } = edgeB;
            const xDistA = Math.abs(tA.x - sA.x);
            const xDistB = Math.abs(tB.x - sB.x);

            if (xDistA < xDistB) return -1;
            if (xDistA > xDistB) return 1;

            const yDistA = Math.abs(tA.y - sA.y);
            const yDistB = Math.abs(tB.y - sB.y);

            if (yDistA < yDistB) return -1;
            if (yDistA > yDistB) return 1;



            return 0;
        });

        return originalEdgesSortedByLength.map(function(edge, edgeIdx){
            const { source, target } = edge;
            const { column: sourceCol, x: sourceX, y: sourceY } = source;
            const { column: targetCol, x: targetX, y: targetY } = target;
            const columnDiff = targetCol - sourceCol;
            if (columnDiff <= 0){
                // Shouldn't happen I don't think except if file is re-used/generated or some other unexpected condition.
                console.error("Target column is greater than source column", source, target);
                return edge; // Skip tracing it.
            }
            if (columnDiff === 1){
                return edge; // Doesn't need to go around obstacles, skip.
            }

            const vertices = [[ sourceX + columnWidth, sourceY ]];

            let prevY = sourceY;
            for (let colIdx = sourceCol + 1; colIdx < targetCol; colIdx++){
                //const yDiff = targetY - prevY;
                //const idealYCoord = prevY + (yDiff / 2); // (((colIdx - sourceCol) / columnDiff) * yDiff);
                const bestSegment = getNearestSegment(
                    colIdx,
                    prevY,
                    targetY,
                    originalEdgesSortedByLength.slice(0, edgeIdx)
                );
                if (!bestSegment){
                    throw new Error("Could not find viable path for edge");
                }
                const [ [ bsX, bsY ], [ beX, beY ] ] = bestSegment;
                vertices.push([ bsX - nodeEdgeLedgeWidths[0], bsY ]);
                vertices.push([ beX + nodeEdgeLedgeWidths[1], beY ]);
                prevY = beY;
            }
            vertices.push([ targetX, targetY ]);

            return _.extend({ vertices }, edge);
        });

    }

    let horizontalSegments;
    let tracedEdges = null;
    let attempts = 0;
    while (!tracedEdges && attempts < 5){
        horizontalSegments = buildVisibilityGraph(4 + attempts);
        try {
            tracedEdges = assembleSegments(horizontalSegments, 4 + attempts);
        } catch (e){
            tracedEdges = null;
            if (e.message === "Could not find viable path for edge"){
                console.warn("Could not find path", attempts);
            } else {
                throw e;
            }
        }
        attempts++;
    }

    return { edges: tracedEdges, horizontalSegments };
}



export default class EdgesLayer extends React.PureComponent {

    /**
     * Move selected edges to top, and disabled ones to bottom, because CSS z-index doesn't work for SVG elements.
     */
    static sortedEdges(edges, selectedNode, isNodeDisabled){
        return edges.slice(0).sort((a,b)=>{
            var isASelected = Edge.isSelected(a, selectedNode, isNodeDisabled);
            var isBSelected = Edge.isSelected(b, selectedNode, isNodeDisabled);

            if (isASelected && !isBSelected){
                return 1;
            } else if (!isASelected && isBSelected){
                return -1;
            } else {
                return 0;
            }
        }).sort((a,b)=>{
            var isADisabled = Edge.isDisabled(a, isNodeDisabled);
            var isBDisabled = Edge.isDisabled(b, isNodeDisabled);

            if (isADisabled && !isBDisabled){
                return -1;
            } else if (!isADisabled && isBDisabled) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    constructor(props){
        super(props);
        this.sortedEdges = this.sortedEdges.bind(this);
        //this.getAllPathElements = this.getAllPathElements.bind(this);
        //this.edgeRefs = [];
    }

    static edgeOnEnter(elem)    { elem.style.opacity = 0; }
    static edgeOnEntering(elem) { elem.style.opacity = 0; }
    static edgeOnEntered(elem)  { elem.style.opacity = null; /** Allows CSS to override, e.g. .15 opacity for disabled edges */ }
    static edgeOnExit(elem)     { elem.style.opacity = 0; }

    sortedEdges = memoize(function(edges, selectedNodes, isNodeDisabled){
        const nextEdges = EdgesLayer.sortedEdges(edges, selectedNodes, isNodeDisabled);
        // Create new list of refs each time we're updated.
        //this.edgeRefs = [];
        //_.forEach(nextEdges, ()=>{
        //    this.edgeRefs.push(React.createRef());
        //});
        return nextEdges;
    });

    // Experimentation with transitioning multiple edges at once within requestAnimationFrame.
    // Need to rethink design of this, an array for this.edgeRefs won't work as we need to keep
    // state.source.x, state.source.y cached in state and associated w/ each edge.
    // Possibly can use object keyed by 'key' string (as determined in render method).
    // Keeping for reference.
    //
    //getAllPathElements(){
    //    return _.map(this.edgeRefs, function(ref){
    //        return ref && ref.current && ref.current.pathRef && ref.current.pathRef.current;
    //    });
    //}

    pathArrows(){
        if (!this.props.pathArrows) return null;
        return Edge.pathArrowsMarkers();
    }

    /**
     * Wraps Edges and each Edge in TransitionGroup and Transition, respectively.
     * We cannot use CSSTransition at the moment because it does not change the className
     * of SVG element(s). We must manually change it (or an attribute of it).
     */
    render(){
        const {
            outerHeight, innerWidth, innerMargin, width, edges: origEdges, nodes,
            selectedNode, isNodeDisabled, contentWidth,
            columnWidth, columnSpacing, rowSpacing, innerHeight
        } = this.props;
        const {
            edges,
            horizontalSegments
        } = traceEdges(origEdges, nodes, columnWidth, columnSpacing, rowSpacing, contentWidth, innerHeight, innerMargin);
        const edgeCount = edges.length;
        const divWidth = Math.max(width, contentWidth);

        return (
            <div className="edges-layer-wrapper" style={{ 'width' : divWidth, 'height' : outerHeight }}>
                <svg className="edges-layer" width={divWidth} height={outerHeight}>
                    { this.pathArrows() }
                    <TransitionGroup component={null}>
                        {
                            _.map(this.sortedEdges(edges, selectedNode, isNodeDisabled), (edge, index) => {
                                const key = (edge.source.id || edge.source.name) + "----" + (edge.target.id || edge.target.name);
                                return (
                                    <Transition unmountOnExit mountOnEnter timeout={500} key={key}
                                        onEnter={EdgesLayer.edgeOnEnter} onEntering={EdgesLayer.edgeOnEntering}
                                        onExit={EdgesLayer.edgeOnExit} onEntered={EdgesLayer.edgeOnEntered}>
                                        <Edge {...this.props} {...{ key, edge, edgeCount }}
                                            startX={edge.source.x} startY={edge.source.y}
                                            endX={edge.target.x} endY={edge.target.y} />
                                    </Transition>
                                );
                            })
                        }
                    </TransitionGroup>
                    <DebugVizGraphLayer segments={horizontalSegments} />
                </svg>
            </div>
        );
    }

}

const DebugVizGraphLayer = React.memo(function DebugVizGraphLayer({ segments, enabled = false }){
    if (!enabled) return null;
    const paths = segments.map(function(seg){
        const path = d3Path();
        path.moveTo(...seg[0]);
        path.lineTo(...seg[1]);
        return path.toString();
    }).map(function(pathStr, idx){
        return <path d={pathStr} key={idx}/>;
    });
    return (
        <g className="vis-debug-graph">
            { paths }
        </g>
    );
});

