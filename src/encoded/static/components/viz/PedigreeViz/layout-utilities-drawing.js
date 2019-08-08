


export function getGraphHeight(orderByHeightIndex, dims){
    const heightIndicesLen = orderByHeightIndex.length;
    return (
        ((heightIndicesLen - 1) * dims.individualYSpacing)
        + (heightIndicesLen * dims.individualHeight)
        + (dims.graphPadding * 2)
    );
}

export function getGraphWidth(objectGraph, dims){
    let minX = Infinity;
    let maxX = 0;
    objectGraph.forEach(function(individual){
        minX = Math.min(minX, individual._drawing.xCoord);
        maxX = Math.max(maxX, individual._drawing.xCoord);
    });
    const relativeMidpoint = dims.individualWidth / 2;
    minX -= (relativeMidpoint + dims.graphPadding);
    maxX += (relativeMidpoint + dims.graphPadding);
    return maxX - minX;
}


/** Distance from _bottom_ of graph */
export function individualYPosition(heightIndex, dims){
    return (
        dims.graphPadding
        + (heightIndex * dims.individualHeight)
        + (heightIndex * dims.individualYSpacing)
    );
}

export function individualTopPositionDepr(heightIndex, dims, graphHeight){
    const yPos = individualYPosition(heightIndex, dims);
    console.log("TYOP");
    return (graphHeight - dims.graphPadding) - yPos;
}


export function individualTopPosition(yCoord, dims){
    return yCoord + dims.graphPadding - (dims.individualHeight / 2);
}

export function individualLeftPosition(xCoord, dims){
    return dims.graphPadding + xCoord - Math.floor(dims.individualWidth / 2);
}

export function relationshipTopPosition(yCoord, dims){
    return dims.graphPadding + yCoord - (dims.relationshipSize / 2);
}


export function createEdges(objectGraph, dims, graphHeight){


    console.log('GRAPH PRE EDGES', objectGraph);

    const seenParentalRelationships = new Set();
    const seen = {};

    const directEdges = [];
    const adjustableEdges = [];

    const q = [objectGraph[0]];

    while(q.length){
        const indv = q.shift();
        if (seen[indv.id]) continue;
        seen[indv.id] = true;
        const { _maritalRelationships, _parentalRelationship : parentRelation } = indv;

        _maritalRelationships.forEach(function(mr){
            mr.children.forEach(function(ch){
                q.push(ch);
            });
            mr.partners.forEach(function(p){
                q.push(p);
            });
        });

        // Edge to parent relationship - special-ish case
        if (parentRelation){
            const {
                children,
                partners,
                _drawing : { xCoord : relationXCoord, heightIndex : relationHeightIndex, yCoord: relationYCoord }
            } = parentRelation;

            let midPoint = null;
            if (children.length === 0 || seenParentalRelationships.has(parentRelation)){
                continue;
            }
            seenParentalRelationships.add(parentRelation);
            if (children.length === 1){
                midPoint = [ // Center of child top
                    //children[0]._drawing.xCoord + (dims.individualWidth / 2),
                    relationXCoord,
                    children[0]._drawing.yCoord - (dims.individualHeight / 2)
                ];
            } else if (children.length >= 2){
                //let smallestHeightIndex = Infinity;
                let biggestYCoord = 0;
                let smallestXCoord = Infinity;
                let biggestXCoord = 0;
                children.forEach(function(child){
                    //smallestHeightIndex = Math.min(smallestHeightIndex, child._drawing.heightIndex);
                    biggestYCoord = Math.max(biggestYCoord, child._drawing.yCoord);
                    smallestXCoord = Math.min(smallestXCoord, child._drawing.xCoord);
                    biggestXCoord = Math.max(biggestXCoord, child._drawing.xCoord);
                    console.log('DDD1', smallestXCoord, biggestXCoord, child._drawing.xCoord, child._drawing.yCoord);
                });
                const childEdgeSegmentTopCoord = biggestYCoord - (dims.individualHeight / 2) - (dims.individualYSpacing / 2);
                const childEdgeSegment = {
                    fromVertex : [
                        smallestXCoord,
                        childEdgeSegmentTopCoord
                    ],
                    toVertex: [
                        biggestXCoord,// + dims.individualWidth,
                        childEdgeSegmentTopCoord
                    ],
                    adjustable: false,
                    direct: true, // We won't modify this further
                    descriptor : "child-spanning horizontal edge"
                };
                midPoint = [
                    relationXCoord,
                    childEdgeSegmentTopCoord
                ];
                // Add edge that spans width of children
                directEdges.push(childEdgeSegment);

                // Add edge from each child to this span -
                children.forEach(function(child){
                    const childEdgeVertSegment = {
                        fromNode: child,
                        fromVertex : [ // From child top
                            child._drawing.xCoord,
                            child._drawing.yCoord - (dims.individualHeight / 2)
                        ],
                        toVertex: [ // To horiz line
                            child._drawing.xCoord,
                            childEdgeSegmentTopCoord
                        ],
                        adjustable: false,
                        direct: true, // We won't modify this further
                        descriptor : "child to horizontal edge"
                    };
                    directEdges.push(childEdgeVertSegment);
                });
            }

            // Add edge from midpoint to relationship
            if (midPoint){
                const mpToRelationshipEdgeSegment = {
                    fromVertex : [
                        relationXCoord,
                        relationYCoord
                    ],
                    toVertex: midPoint,
                    adjustable: false,
                    direct: true, // We won't modify this further
                    descriptor : "child midpoint to relationship"
                };
                directEdges.push(mpToRelationshipEdgeSegment);
            }

            // Add edges to parent(s) - Relationship Edges
            // Then add to q
            partners.forEach(function(partner){
                // Vertical center of relationship
                const fromX = relationXCoord;
                const fromY = relationYCoord;

                // Vertical center of indv node
                const toX = partner._drawing.xCoord;
                const toY = partner._drawing.yCoord;

                const attachToTargetOnLeftSide = toX >= fromX;
                const toXAttachment = ((dims.individualWidth / 2) * (attachToTargetOnLeftSide ? -1 : 1));
                const toXAttachmentLedge = dims.edgeLedge * (attachToTargetOnLeftSide ? -1 : 1);
                const parentEdge = {
                    fromNode: parentRelation,
                    fromVertex : [ fromX, fromY ], // Relationship
                    toNode: partner,
                    toVertex: [ toX + toXAttachment, toY ], // Partner
                    adjustable: true,
                    direct: false,
                    descriptor : "relationship midpoint to partner"
                };
                parentEdge.vertices = [
                    // Relationship
                    parentEdge.fromVertex,
                    [ parentEdge.fromVertex[0] - toXAttachmentLedge, parentEdge.fromVertex[1] ],
                    // Parent
                    [ parentEdge.toVertex[0] + toXAttachmentLedge, parentEdge.toVertex[1] ],
                    parentEdge.toVertex
                ];

                //if (fromY !== toY){ // Make orthaganol
                //    parentEdge.vertices.splice(2, 0, [fromX - toXAttachmentLedge, toY]);
                //}

                adjustableEdges.push(parentEdge);

                q.push(partner);
            });

            children.forEach(function(ch){
                q.push(ch);
            });


        } // End if parentRelation
    }

    directEdges.forEach(function(edge){
        edge.vertices = [edge.fromVertex, edge.toVertex];
    });

    function trySubdivisions(subdivisions = 1){
        if (subdivisions >= 2){
            console.error("Could not build a connecting path");
            //throw new Error("Could not build a connecting path");
            return;
        }
        //try {
            const visibilityGraph = computeVisibilityGraph(objectGraph, directEdges, dims, graphHeight, false, subdivisions);
            tracePaths(adjustableEdges, visibilityGraph);
        //} catch (e){
        //    trySubdivisions(subdivisions + 1);
        //}
    }

    const visibilityGraphInitial = computeVisibilityGraph(objectGraph, directEdges, dims, graphHeight, true);
    try {
        tracePaths(adjustableEdges, visibilityGraphInitial);
    } catch (e){
        trySubdivisions();
    }

    return { adjustableEdges, directEdges };
}

function manhattanDistance(fromV, toV){
    // Manhattan distance
    const xDiff = Math.abs(fromV[0] - toV[0]);
    const yDiff = Math.abs(fromV[1] - toV[1]);
    return (yDiff + xDiff);
}

/** Needs work - maybe along w. computeVisibilityGraph **/
function tracePaths(adjustableEdges, visibilityGraph){
    const { hSegments, vSegments } = visibilityGraph;

    //const vertexQ = vertices.slice(0);
    const hSegmentQ = hSegments.slice(0);
    const vSegmentQ = vSegments.slice(0);


    function getEdgeTargetV(otherV, edge){
        let connectsAt = null;
        if (otherV[0] === edge[0][0] && otherV[1] === edge[0][1]){
            connectsAt = 1;
        } else if (otherV[0] === edge[1][0] && otherV[1] === edge[1][1]){
            connectsAt = 0;
        } else {
            // Not a connector.
            return null;
        }
        return edge[connectsAt];
    }

    function getNextEdgeFromQ(currV, targetV, skip=null){
        const hLen = hSegmentQ.length;
        const vLen = vSegmentQ.length;
        let i = 0;
        let checkQ;
        for (i = 0; i < (vLen + hLen); i++){
            let checkIdx = i;
            checkQ = vSegmentQ;
            if (checkIdx >= vLen){
                checkIdx -= vLen;
                checkQ = hSegmentQ;
            }
            const edge = checkQ[checkIdx];
            const v = getEdgeTargetV(currV, edge);
            if (!v) continue;
            if (skip && skip.has(edge)) continue;
            return { edge, v };
        }
        throw new Error("No viable edges found.");
    }

    /** @deprecated? */
    function getNextEdgeFromQPriority(currV, targetV, skip=null, direction=null){
        const hLen = hSegmentQ.length;
        const vLen = vSegmentQ.length;
        let i = 0;
        let checkQ;
        let bestEdgeFromQ = null;
        let bestEdgePriorityCost = Infinity;
        let bestV = null;
        for (i = 0; i < (hLen + vLen); i++){
            let checkIdx = i;
            checkQ = hSegmentQ;
            if (checkIdx >= hLen){
                checkIdx -= hLen;
                checkQ = vSegmentQ;
            }
            const edge = checkQ[checkIdx];
            const v = getEdgeTargetV(currV, edge);
            if (!v) continue;
            if (skip && skip.has(edge)) continue;
            const ownEdgeCost = manhattanDistance(...edge);
            if (v[0] === targetV[0] && v[1] === targetV[1]){
                return {
                    costEst: ownEdgeCost,
                    edge, v
                };
            }

            const distCostEstimate = manhattanDistance(v, targetV) + ownEdgeCost;
            let priorityCost = distCostEstimate; // TODO finish/fix
            if (direction){
                const edgeIsVertical = (edge[0][0] === edge[1][0]);
                if (edgeIsVertical && direction === 'v') {
                    priorityCost = distCostEstimate - (ownEdgeCost * 2);
                } else if (!edgeIsVertical && direction === 'h'){
                    priorityCost = distCostEstimate - (ownEdgeCost * 2);
                }
            }
            //console.log('TTT', priorityCost, distCostEstimate, direction);

            if (priorityCost < bestEdgePriorityCost){
                bestEdgePriorityCost = priorityCost;
                bestEdgeFromQ = edge;
                bestV = v;
            }
        }
        if (bestEdgeFromQ === null){
            throw new Error("No viable edges found.");
        }
        return {
            'costEst': bestEdgePriorityCost,
            'edge': bestEdgeFromQ,
            'v': bestV
        };
    }


    function computeDistance(initCurrV, targetV, edgeIndex=0){

        const vQueue = [{
            v: initCurrV,
            searchPath: [],
            pathLengthCost: 0,
            skip: new Set()
        }];

        let bestPathTotalCost = Infinity;
        let bestPathTotal = null;

        const bestResultsPerVertex = new Map();

        function getNextVQueueSet(){
            let bestCostEstimate = Infinity;
            let bestIdx = -1;
            let i;
            for (i = 0; i < vQueue.length; i++){
                const { v, pathLengthCost, searchPath } = vQueue[i];
                let costToTargetEstimate = manhattanDistance(v, targetV) + pathLengthCost;

                const prevEdge1 = searchPath[searchPath.length - 1];
                const prevEdge2 = searchPath[searchPath.length - 2];
                if (prevEdge1 && prevEdge2){
                    if (!(
                        (prevEdge1[0][0] === prevEdge1[1][0] && prevEdge2[0][0] === prevEdge2[1][0])
                        || (prevEdge1[0][1] === prevEdge1[1][1] && prevEdge2[0][1] === prevEdge2[1][1])
                    )){ // If not both vertical or horizontal
                        costToTargetEstimate += 100;
                    }
                }

                /* //todo ?
                let intersected = false;
                for (let j = 0; j < edgeIndex; j++){
                    const prevAdjEdge = adjustableEdges[j];
                    for (let j2 = 0; j2 < prevAdjEdge.vertices.length; j2++){
                        const prevAdjEdgeV = prevAdjEdge.vertices[j2];
                        if (prevAdjEdgeV[0] === v[0] && prevAdjEdgeV[1] === v[1]){
                            // Intersection
                            console.log("INTERSECTED", v);
                            intersected = true;
                            break;
                        }
                    }
                    if (intersected) break;
                }
                if (intersected){
                    costToTargetEstimate += 200;
                }
                */

                if (costToTargetEstimate < bestCostEstimate){
                    bestCostEstimate = costToTargetEstimate;
                    bestIdx = i;
                }
            }
            const result = vQueue[bestIdx];
            vQueue.splice(bestIdx, 1);
            return result;
        }

        let iterations = 0;
        while (vQueue.length){
            const currArgs = getNextVQueueSet();
            const { v: currV, searchPath: currSearchPath, pathLengthCost: currPathLengthCost, skip } = currArgs;

            // TODO see if remembered dist <= than new, & update

            const existingRes = bestResultsPerVertex.get(currV);
            if (existingRes && existingRes.pathLengthCost <= currPathLengthCost){
                continue;
            } else {
                bestResultsPerVertex.set(currV, currArgs);
            }

            if (currV[0] === 560 && currV[1] === 160){
                console.log(
                    "GOTNEWWW", currV,
                    '\nDEPTH', currSearchPath.length,
                    '\nCOSTNOW', currPathLengthCost,
                    '\nOWNPATH', currSearchPath.map(function(e){ return e[0].join(',') + '-' + e[1].join(','); }),
                    //'\nSKIP', [...skip.values()]
                );
            }

            const nextArgSets = [];
            while (true){ // Collect viable next edges
                try {
                    const nextArgs = getNextEdgeFromQ(currV, targetV, skip);
                    nextArgSets.push(nextArgs);
                    skip.add(nextArgs.edge);
                } catch (e) {
                    //console.error(e);
                    break;
                }
            }

            //console.log('VV', currV, targetV, currPathLengthCost, nextArgSets, [...skip], iterations);

            let found = false;
            nextArgSets.forEach(function({ edge, v, costEst }){
                if (v[0] === targetV[0] && v[1] === targetV[1]){
                    const resultToCache = {
                        costToTarget: manhattanDistance(...edge),
                        pathToTarget: [edge]
                    };
                    const retObj = {
                        cost: currPathLengthCost + resultToCache.costToTarget,
                        path: [].concat(currSearchPath).concat(resultToCache.pathToTarget)
                    };
                    if (retObj.cost < bestPathTotalCost){
                        bestPathTotalCost = retObj.cost;
                        bestPathTotal = retObj.path;
                    }
                    bestResultsPerVertex.set(currV, resultToCache);
                    console.log('Computed', retObj.cost, retObj.path, retObj.cost < bestPathTotalCost);
                    found = true;
                    return;
                }
                vQueue.push({
                    v,
                    searchPath: [].concat(currSearchPath).concat([edge]),
                    pathLengthCost: currPathLengthCost + manhattanDistance(...edge),
                    skip: new Set(skip)
                });
            });

            iterations++;

            if (found){
                console.info("FOUND after", iterations);
                break;
            }

            if (iterations > 20000){
                console.error("PAST 20k!!!");
                break;
            }
        }

        return { 'path': bestPathTotal, 'cost': bestPathTotalCost };

    }


    function computeDistanceOld(currV, targetV, currSearchPath = [], currPathLengthCost = 0, maxCost = Infinity, skip = null, vPathsFound = null){
        
        skip = skip || new Set(currSearchPath);
        vPathsFound = vPathsFound || new Map();
        const cacheRes = vPathsFound.get(currV);
        if (cacheRes){
            return {
                cost: currPathLengthCost + cacheRes.costToTarget,
                path: cacheRes.costToTarget !== Infinity ? [].concat(currSearchPath).concat(cacheRes.pathToTarget) : null
            };
        }
        if (currPathLengthCost > maxCost){
            return {
                cost: Infinity
            };
        }

        if (currV[0] === 560 && currV[1] === 160){
            console.log(
                "GOTNEWWW", currV,
                '\nDEPTH', currSearchPath.length,
                '\nCOSTNOW', currPathLengthCost,
                '\nOWNPATH', currSearchPath.map(function(e){ return e[0].join(',') + '-' + e[1].join(','); }),
                '\nSKIP', [...skip.values()]
            );
        }

        let bestPath = null;
        let bestCost = Infinity;
        let counter = 0;

        while (true){
            counter++;
            if (counter > 3){ // Should go in 3 directions @ most (not away from target)
                //console.log('PAST 100');
                return { path: bestPath, cost: bestCost };
            }
            let prevDirection = null;
            const prevEdge = currSearchPath[currSearchPath.length - 1];
            if (prevEdge){
                if (prevEdge[0][0] === prevEdge[1][0]){
                    prevDirection = 'v';
                } else {
                    prevDirection = 'h';
                }
            }
            let nextArgs;
            try {
                nextArgs = getNextEdgeFromQ(currV, targetV, skip, prevDirection);
            } catch (e) {
                //console.log('BREAK', counter);
                break;
            }
            const { edge, v, costEst } = nextArgs;
            if (v[0] === targetV[0] && v[1] === targetV[1]){
                const retObj = {
                    cost: currPathLengthCost + manhattanDistance(...edge),
                    path: [].concat(currSearchPath).concat([edge])
                };
                console.log('Computed', retObj.cost, retObj.path);
                return retObj;
            }
            skip.add(edge);
            const foundShortest = computeDistance(
                v,
                targetV,
                [].concat(currSearchPath).concat([edge]),
                currPathLengthCost + manhattanDistance(...edge),
                bestCost === Infinity ? manhattanDistance((currSearchPath[0] && currSearchPath[0][0]) || currV, targetV) * 3 : bestCost, //depth + 1,
                new Set(skip),
                vPathsFound
            );
            if (currV[0] === 560 && currV[1] === 160){
                console.log(
                    "GOT", currV,
                    "\nTO", v,
                    '\nDEPTH', currSearchPath.length,
                    '\nGRAPHTRAVELCOST', foundShortest.cost,
                    '\nESTCOST', costEst,
                    '\nCOSTNOW', currPathLengthCost,
                    '\nFOUNDPATH', foundShortest.path,
                    '\nFUTUREPATH', foundShortest.path ? foundShortest.path.slice(currSearchPath.length) : null,
                    '\nOWNPATH', currSearchPath,
                    '\nSKIP', [...skip.values()]
                );
            }
            if (foundShortest.path){
                //console.log("got", foundShortest.cost, foundShortest.path, bestCost, currSearchPath.length);
                if (foundShortest.cost < bestCost){
                    bestCost = foundShortest.cost;
                    bestPath = foundShortest.path;
                }/* else if (foundShortest.cost === bestCost){
                    let prevDirection = null;
                    const prevEdge = currSearchPath[currSearchPath.length - 1];
                    console.log('PREV', prevEdge, currV, v);
                    if (prevEdge){
                        if (prevEdge[0][0] === prevEdge[1][0]){
                            prevDirection = 'v';
                        } else {
                            prevDirection = 'h';
                        }
                    }
                    if (prevDirection) {
                        const nextDirection = (currV[0] === v[0]) ? 'v' : 'h';
                        if (nextDirection === prevDirection){
                            bestCost = foundShortest.cost;
                            bestPath = foundShortest.path;
                        }
                    }
                }*/
            }
            //if (currV[0] === 240 && currV[1] === 320){
            //    console.log("DIDD", edge, costEst);
            //}
        }
        //console.log("SET", currV, bestCost - currPathLengthCost)
        if (currV[0] === 560 && currV[1] === 160){
            console.log(
                "SET", currV,
                '\nDEPTH', currSearchPath.length,
                '\nGRAPHTRAVELCOST', bestCost,
                //'\nESTCOST', costEst,
                '\nCOSTNOW', currPathLengthCost,
                '\nPATH', bestPath,
                '\nFUTUREPATH', bestPath ? bestPath.slice(currSearchPath.length) : null,
                '\nOWNPATH', currSearchPath,
                '\nSKIP', [...skip.values()]
            );
        }
        //if (bestCost !== Infinity){
            vPathsFound.set(currV, {
                'path': bestPath,
                'cost': bestCost,
                'pathToTarget' : bestCost !== Infinity ? bestPath.slice(currSearchPath.length) : null,
                'costToTarget' : bestCost - currPathLengthCost
            });
        //}
        //console.log('Returned', bestCost, bestPath, bestPath && bestPath.length);
        return { 'path': bestPath, 'cost': bestCost };
    }


    adjustableEdges.forEach(function(edge, edgeIndex){
        // We have 4 pts min in each due to edgeLedge
        const edgeVLen = edge.vertices.length;
        const fromV = edge.vertices[1];
        const toV = edge.vertices[edgeVLen - 2];

        console.log('Orig', edge, edge.vertices.slice(0));
        const { cost, path } = computeDistance(fromV, toV, edgeIndex);

        console.log("COST", cost);

        if (!path) {
            throw new Error('Could not find path');
        }

        // Remove edges from queues
        let pathIdx;
        for (pathIdx = 0; pathIdx < path.length; pathIdx++){
            const e = path[pathIdx];
            const useQ = e[0][0] === e[1][0] ? vSegmentQ : hSegmentQ;
            let i;
            let found = false;
            for (i = 0; i < useQ.length; i++){
                if (useQ[i] === e){
                    found = true;
                    break;
                }
            }
            if (found){
                useQ.splice(i, 1);
            } else {
                console.error("couldnt delete", e);
            }
        }

        const newPoints = path.reduce(function(m, edgePart){
            if (m.length === 0){
                if (edge.vertices[1][0] === edgePart[0][0] && edge.vertices[1][1] === edgePart[0][1]){
                    // Make sure connect edges at right vertex
                    m.push(edgePart[1]);
                } else {
                    m.push(edgePart[0]);
                }
                return m;
            }

            const lastAdded = m[m.length - 1];
            let nextToAdd;
            //const lastItem2 = m[m.length - 2];

            if (lastAdded[0] === edgePart[0][0] && lastAdded[1] === edgePart[0][1]){
                nextToAdd = edgePart[1];
            } else {
                nextToAdd = edgePart[0];
            }

            m.push(nextToAdd);

            return m;
        }, []);

        const removeLen = edge.vertices.length - 3;
        edge._tempNextVertices = edge.vertices.slice();
        edge._tempNextVertices.splice(2, removeLen, ...newPoints);
        console.log('New', removeLen, newPoints, edge._tempNextVertices.slice(0), path);

    });

    // After all edges traced w.o. exceptions, cement the `nextVertices` into `vertices`.
    adjustableEdges.forEach(function(edge){
        edge.vertices = edge._tempNextVertices;
        delete edge._tempNextVertices;
    });
}

/**
 * @todo
 * Performance esp. can be improved by getting rid of the incremental xCoord and yCoord
 * which are used to define lines (before they get broken up into line segments)
 * and instead traversing the graph and collecting all x coords and y coords of interest to
 * use as lines which then break up into segments. If this is is done, the graph automatically
 * becomes a little less pretty, so would need to add a subsequent step (maybe dif function) where
 * normalize paths to go down center of 'alleys'.
 */
export function computeVisibilityGraph(objectGraph, directEdges, dims, graphHeight, countDirectEdges = true, subdivisions = 1){

    const hSegments = [];
    const vSegments = [];

    const divCount = subdivisions * 2;

    const seenRelationships = new Set();

    const halfIndvWidth = dims.individualWidth / 2;
    const halfIndvHeight = dims.individualHeight / 2;
    const halfRelationSize = dims.relationshipSize / 2;

    const partIndWidth = dims.individualWidth / divCount;
    const partIndHeight = dims.individualHeight / divCount;
    const partIndXSpacing = dims.individualXSpacing / divCount;
    const partIndYSpacing = dims.individualYSpacing / divCount;

    graphHeight = graphHeight - (dims.graphPadding * 2);
    const graphWidth = getGraphWidth(objectGraph, dims) - (dims.graphPadding * 2);

    const boundingBoxes = [];

    objectGraph.forEach(function(indv){
        const {
            _drawing: { xCoord, yCoord },
            _maritalRelationships,
            _parentalRelationship
        } = indv;
        const indvVertices = [
            [ xCoord - halfIndvWidth, yCoord - halfIndvHeight ], // TL
            [ xCoord - halfIndvWidth, yCoord + halfIndvHeight ], // BL
            [ xCoord + halfIndvWidth, yCoord - halfIndvHeight ], // TR
            [ xCoord + halfIndvWidth, yCoord + halfIndvHeight ]  // BR
        ];
        boundingBoxes.push(indvVertices);
        const relationships = _maritalRelationships.slice(0);
        if (_parentalRelationship){
            relationships.push(_parentalRelationship);
        }
        relationships.forEach(function(relationship){
            const { _drawing : { xCoord, yCoord: relationYCoord } } = relationship;
            if (seenRelationships.has(relationship)){
                return;
            }
            seenRelationships.add(relationship);
            const relationShipVertices = [
                [ xCoord - halfRelationSize, relationYCoord - halfRelationSize ], // TL
                [ xCoord - halfRelationSize, relationYCoord + halfRelationSize ], // BL
                [ xCoord + halfRelationSize, relationYCoord - halfRelationSize ], // TR
                [ xCoord + halfRelationSize, relationYCoord + halfRelationSize ]  // BR
            ];
            boundingBoxes.push(relationShipVertices);
            //vertices = vertices.concat(relationShipVertices);
        });
    });

    // We make these into faux boxes to prevent edge crossings
    // These all contain 2 vertices at most
    directEdges.forEach(function(edge){
        if (!countDirectEdges){
            boundingBoxes.push(edge.vertices);
            return;
        }
        if (edge.vertices[0][0] === edge.vertices[1][0]){
            // Vertical line segment
            if (edge.vertices[0][1] > edge.vertices[1][1]){
                boundingBoxes.push([
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[1][1] ],
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[0][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[1][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[0][1] ]
                ]);
            } else {
                boundingBoxes.push([
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[0][1] ],
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[1][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[0][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[1][1] ]
                ]);
            }
        } else {
            // Horizontal line segment
            if (edge.vertices[0][0] < edge.vertices[1][0]){
                boundingBoxes.push([
                    [ edge.vertices[0][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[0][0], edge.vertices[1][1] + halfRelationSize ],
                    [ edge.vertices[1][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[1][0], edge.vertices[1][1] + halfRelationSize ]
                ]);
            } else {
                boundingBoxes.push([
                    [ edge.vertices[1][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[1][0], edge.vertices[1][1] + halfRelationSize ],
                    [ edge.vertices[0][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[0][0], edge.vertices[1][1] + halfRelationSize ]
                ]);
            }
        }
    });

    function splitSortFxn(a, b){
        a = typeof a === 'number' ? a : a[0];
        b = typeof b === 'number' ? b : b[0];
        return a - b;
    }

    function reduceSplits(splits, splitArrs){
        splitArrs.sort(splitSortFxn);
        splits = [...splits].concat(splitArrs).sort(splitSortFxn);
        //console.log('SPLITS1Sort', JSON.parse(JSON.stringify(splits)));
        const skipArr = new Set();
        splitArrs.forEach(function(sa){
            if (skipArr.has(sa)) return;
            splits = splits.filter(function(s){
                //if (isNaN(s)) return false; // Additional cleaning
                if (typeof s === 'number'){
                    if (s >= sa[0] && s <= sa[1]){
                        return false;
                    }
                } else if (Array.isArray(s) && !skipArr.has(s)){
                    if (s !== sa && s[0] <= sa[1]){
                        // Merge into curr arr.
                        sa[1] = s[1];
                        skipArr.add(s);
                        return false;
                    }
                }
                skipArr.add(sa);
                return true;
            });
        });
        return splits;
    }

    const vertlineXCoords = [];
    let xCoordToSave = 0;
    let counter = 0;
    let odd = true;
    while (xCoordToSave < graphWidth){
        // Make vert lines, split them into pieces
        if (counter % (2 * divCount) < divCount){ // Even
            xCoordToSave += partIndWidth;
        } else {
            xCoordToSave += partIndXSpacing;
        }
        vertlineXCoords.push(xCoordToSave);
        counter++;
    }

    let yCoord = 0;
    const horizLineYCoords = [];
    counter = 0;
    while (yCoord < graphHeight){
        // Make horiz lines, split them into pieces
        if (counter % (2 * divCount) < divCount){ // Even
            yCoord += partIndHeight;
        } else {
            yCoord += partIndYSpacing;
        }
        horizLineYCoords.push(yCoord);
        odd = !odd;
        console.log('Y-', yCoord);
        let splits = new Set();
        const splitArrs = [];

        // Add splits at horiz line intersections
        vertlineXCoords.forEach(function(xC){
            splits.add(xC);
        });
        boundingBoxes.forEach(function(bb){
            if (bb.length === 2){
                if (bb[0][1] === bb[1][1]){ // Horiz Line
                    if (bb[0][1] === yCoord){
                        splitArrs.push([ bb[0][0], bb[1][0] ].sort(splitSortFxn));
                    }
                } else {
                    if ( // Vertical Line which may intersect
                        bb[0][1] > yCoord && bb[1][1] < yCoord ||
                        bb[0][1] < yCoord && bb[1][1] > yCoord
                    ){
                        splits.add(bb[0][0]);
                    }
                }
                //*/
            } else if (bb.length === 4){
                if (bb[0][1] <= yCoord && bb[3][1] >= yCoord){
                    //console.log('BB', bb, [ bb[0][0], bb[3][0] ], [...splits]);
                    splitArrs.push([ bb[0][0], bb[3][0] ]);
                } else {
                    splits.add(bb[0][0]);
                    splits.add(bb[3][0]);
                }
                // Add edgeLedge splits
                if (bb[0][0] - dims.edgeLedge >= 0){
                    splits.add(bb[0][0] - dims.edgeLedge);
                }
                if (bb[3][0] + dims.edgeLedge <= graphHeight){
                    splits.add(bb[3][0] + dims.edgeLedge);
                }
            }
        });
        //console.log('SPLITS1', splits, splitArrs);
        splits = reduceSplits(splits, splitArrs);
        //console.log('SPLITS', splits);
        const lastX = splits.reduce(function(lastX, currSplit){
            let x2;
            let nextLastX;
            if (Array.isArray(currSplit)){
                x2 = currSplit[0];
                nextLastX = currSplit[1];
            } else {
                nextLastX = currSplit;
                x2 = currSplit;
            }
            if (x2 === lastX){
                return nextLastX;
            }
            hSegments.push([
                [lastX, yCoord],
                [x2, yCoord]
            ]);
            return nextLastX;
        }, 0);
        if (lastX < graphWidth){
            hSegments.push([
                [lastX, yCoord],
                [graphWidth, yCoord]
            ]);
        }
    }

    vertlineXCoords.forEach(function(xCoord){

        console.log('X-', xCoord);
        let splits = new Set();
        const splitArrs = [];

        // Add splits at horiz line intersections
        horizLineYCoords.forEach(function(yC){
            splits.add(yC);
        });

        boundingBoxes.forEach(function(bb){
            if (bb.length === 2){
                if (bb[0][0] === bb[1][0]){ // Vertical Line
                    if (bb[0][0] === xCoord){
                        console.log('sameline', xCoord);
                        splitArrs.push([ bb[0][1], bb[1][1] ].sort(splitSortFxn));
                    }
                } else {
                    if ( // Horiz Line which may intersect
                        bb[0][0] > xCoord && bb[1][0] < xCoord ||
                        bb[0][0] < xCoord && bb[1][0] > xCoord
                    ){
                        splits.add(bb[0][1]);
                    }
                }
            } else if (bb.length === 4){
                if (bb[0][0] <= xCoord && bb[3][0] >= xCoord){
                    splitArrs.push([bb[0][1], bb[3][1]]);
                } else {
                    splits.add(bb[0][1]);
                    splits.add(bb[3][1]);
                }
                //todo
            }
        });
        splits = reduceSplits(splits, splitArrs);
        console.log('SPLITS-h', splits);
        const lastY = splits.reduce(function(lastY, currSplit){
            let y2;
            let nextLastY;
            if (Array.isArray(currSplit)){
                y2 = currSplit[0];
                nextLastY = currSplit[1];
            } else {
                nextLastY = currSplit;
                y2 = currSplit;
            }
            if (y2 === lastY){
                return nextLastY;
            }
            vSegments.push([
                [xCoord, lastY],
                [xCoord, y2]
            ]);
            return nextLastY;
        }, 0);

        if (lastY < graphHeight){
            vSegments.push([
                [xCoord, lastY],
                [xCoord, graphHeight]
            ]);
        }
    });

    // Add intersections of segments into vertices list.
    /*
    let vertices = new Set();
    hSegments.forEach(function([ [h1X, hY], [h2X] ]){
        vSegments.forEach(function([ [vX, v1Y], [ , v2Y] ]){
            if ((h1X >= vX && h2X <= vX) || (h1X <= vX && h2X >= vX)){
                if ((v1Y >= hY && v2Y <= hY) || v1Y <= hY && v2Y >= hY){
                    vertices.add([ vX, hY ].join('\t'));
                }
            }
        });
    });

    vertices = [...vertices].map(function(v){
        const [ x, y ] = v.split('\t');
        return [ parseInt(x), parseInt(y) ];
    });
    */

    // For each vertex, make sure we have a single reference for simpler future lookups
    uniquifyVertices(hSegments, vSegments);

    console.log('DDD', hSegments, vSegments);

    return { hSegments, vSegments };
}

function uniquifyVertices(...pathLists){
    const uniqueVertices = new Set();
    const allPaths = pathLists.reduce(function(m, paths){
        m = m.concat(paths);
        return m;
    }, []);
    allPaths.forEach(function(pathSegment){
        const uniqueVs = [...uniqueVertices];
        const vLen = uniqueVs.length;
        let i;
        const found = [];
        pathSegment.forEach(function(pathV, idx){
            for (i = 0; i < vLen; i++){
                const existingV = uniqueVs[i];
                if (existingV[0] === pathV[0] && existingV[1] === pathV[1]){
                    pathSegment.splice(idx, 1, existingV);
                    found[idx] = true;
                    break;
                }
            }
            if (!found[idx]){
                uniqueVertices.add(pathV);
            }
        });
    });
}

/** Gets all diseases, uniqifies, then assigns a numerical index to each. */
export function graphToDiseaseIndices(objectGraph){
    // Collect affective diseases first.
    let allDiseases = objectGraph.reduce(function(m, indv){
        indv.diseases.forEach(function(diseaseStr){  m.add(diseaseStr); });
        return m;
    }, new Set());
    // Carrier of disease(s) (clinical evaluation)
    allDiseases = objectGraph.reduce(function(m, indv){
        indv.carrierOfDiseases.forEach(function(diseaseStr){  m.add(diseaseStr); });
        return m;
    }, allDiseases);
    // Asymptotic/presymptotic disease(s) (clinical evaluation)
    allDiseases = objectGraph.reduce(function(m, indv){
        indv.asymptoticDiseases.forEach(function(diseaseStr){  m.add(diseaseStr); });
        return m;
    }, allDiseases);
    const diseaseToIndex = {};
    [...allDiseases].forEach(function(diseaseStr, idx){
        diseaseToIndex[diseaseStr] = idx + 1;
    });
    return diseaseToIndex;
}
