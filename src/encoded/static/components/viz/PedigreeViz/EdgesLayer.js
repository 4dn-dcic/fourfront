import React from 'react';
import memoize from 'memoize-one';
import * as d3 from 'd3';


export const EdgesLayer = React.memo(function EdgesLayer(props){
    const { graphHeight, graphWidth, edges, ...passProps } = props;
    const { directEdges, adjustableEdges } = edges;
    const allEdges = [].concat(directEdges).concat(adjustableEdges);
    return (
        <g className="individuals-edge-shape-layer">
            { allEdges.map((edge) => {
                const edgeId = edge.fromVertex.toString() + "-to-" + edge.toVertex.toString();
                return <Edge key={edgeId} id={edgeId} edge={edge} {...passProps} />; 
            } )}
        </g>
    );
});


function makeEdgePathDimensions(edgeObj, dims){
    const { edgeLedge, edgeCornerDiameter = 10 } = dims;
    const path = d3.path();
    const vertices = edgeObj.vertices.map(function(v){
        return [ dims.graphPadding + v[0], dims.graphPadding + v[1] ];
    });
    let [ prevCoord ] = vertices;
    let currCoord, futureCoord;
    path.moveTo(...prevCoord);
    for (var i = 1; i < vertices.length; i++){
        currCoord = vertices[i];
        futureCoord = vertices[i + 1] || null;
        if (
            (futureCoord && (currCoord[0] !== futureCoord[0] && currCoord[1] !== futureCoord[1]))
            || (currCoord[0] !== prevCoord[0] && currCoord[1] !== prevCoord[1])
        ){ // Not orthagonol
            path.lineTo(...currCoord);
        } else if (futureCoord && futureCoord[0] !== prevCoord[0] && futureCoord[1] !== prevCoord[1]){
            const currCoordModified = currCoord.slice(0);
            const intermediatePt = currCoord.slice(0);
            let toLeftMultiplier;
            let toUpMultiplier;
            if (currCoord[0] !== futureCoord[0]){
                //console.log("IScurvinging-X")
                toLeftMultiplier = currCoord[0] < futureCoord[0] ? 1 : -1;
                toUpMultiplier = currCoord[1] > prevCoord[1] ? -1 : 1;
                currCoordModified[1] += (toUpMultiplier * edgeCornerDiameter);
                intermediatePt[0] = currCoord[0] + (toLeftMultiplier * edgeCornerDiameter);
                intermediatePt[1] = currCoord[1];
            } else {
                toUpMultiplier = currCoord[1] < futureCoord[1] ? 1 : -1;
                toLeftMultiplier = currCoord[0] < prevCoord[0] ? 1 : -1;
                //currCoordModified[1] += (toUpMultiplier * edgeCornerDiameter);
                currCoordModified[0] += (toLeftMultiplier * edgeCornerDiameter);
                intermediatePt[0] = currCoord[0];
                intermediatePt[1] = currCoord[1] + (toUpMultiplier * edgeCornerDiameter);
            }

            path.lineTo(...currCoordModified);

            path.arcTo(
                currCoord[0],
                currCoord[1],
                futureCoord[0],
                futureCoord[1],
                edgeCornerDiameter
            );

            path.lineTo(...intermediatePt);
        } else {
            path.lineTo(...currCoord);
        }
        prevCoord = vertices[i];
    }
    return path.toString();
}


class Edge extends React.PureComponent {

    constructor(props){
        super(props);
        this.memoizedMakeEdgePathDimensions = memoize(makeEdgePathDimensions);
    }

    render(){
        const { edge, id, dims } = this.props;
        const { adjustable } = edge;
        const edgePathDim = this.memoizedMakeEdgePathDimensions(edge, dims);
        const cls = "edge-path" + (adjustable ? " is-adjustable" : " not-adjustable");
        return (
            <path d={edgePathDim} className={cls} id={id} />
        );
    }
}