


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
                _drawing : {
                    xCoord : relationXCoord,
                    yCoord: relationYCoord,
                    heightIndex : relationHeightIndex
                }
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

    let visibilityGraph = computeVisibilityGraph(objectGraph, directEdges, dims, graphHeight, true);
    let subdivisions = 3;
    function trySubdivisions(){
        if (subdivisions >= 5){
            console.error("Could not build a connecting path");
            //throw new Error("Could not build a connecting path");
            return;
        }
        try {
            visibilityGraph = computeVisibilityGraph(objectGraph, directEdges, dims, graphHeight, false, subdivisions);
            tracePaths(adjustableEdges, visibilityGraph);
        } catch (e){
            subdivisions++;
            trySubdivisions();
        }
    }

    try {
        tracePaths(adjustableEdges, visibilityGraph);
    } catch (e){
        trySubdivisions();
    }

    return { adjustableEdges, directEdges, visibilityGraph, subdivisions };
}

function manhattanDistance(fromV, toV){
    const xDiff = Math.abs(fromV[0] - toV[0]);
    const yDiff = Math.abs(fromV[1] - toV[1]);
    return yDiff + xDiff;
}

/** Needs work - maybe along w. computeVisibilityGraph **/
function tracePaths(adjustableEdges, visibilityGraph){
    const {
        hSegments: hSegmentQ,
        vSegments: vSegmentQ
    } = visibilityGraph;

    //const hSegmentQ = hSegments.slice(0);
    //const vSegmentQ = vSegments.slice(0);


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

    function getNextAvailableEdgeSegments(currV, skip=null){
        const hLen = hSegmentQ.length;
        const vLen = vSegmentQ.length;
        const resultList = [];
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
            resultList.push({ edge, v });
        }
        return resultList;
    }

    function computeDistance(initCurrV, targetV, initSearchPath = []){

        const vQueue = [{
            v: initCurrV,
            searchPath: initSearchPath,
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

                const distToTargetEst = manhattanDistance(v, targetV);
                const prevEdge1 = searchPath[searchPath.length - 1];
                const prevEdge2 = searchPath[searchPath.length - 2];
                const isVertical = prevEdge1[0][0] === prevEdge1[1][0];
                let costToTargetEstimate = distToTargetEst + pathLengthCost;

                if (prevEdge2 && !(
                    (
                        isVertical && prevEdge2[0][0] === prevEdge2[1][0]
                    ) || (
                        !isVertical && prevEdge2[0][1] === prevEdge2[1][1]
                    )
                )){ // If not both vertical or horizontal
                    costToTargetEstimate = costToTargetEstimate * 3;
                }

                //todo ?
                ///*
                let intersected = 0;
                adjustableEdges.forEach(function(edge){
                    if (typeof edge._tempNextVertices === 'undefined') return;
                    for (let j2 = 1; j2 < edge._tempNextVertices.length; j2++){
                        const prevAdjEdge = [ edge._tempNextVertices[j2-1], edge._tempNextVertices[j2] ];
                        if (isVertical && prevAdjEdge[0][1] === prevAdjEdge[1][1] && v[1] === prevAdjEdge[0][1]){
                            if ((prevAdjEdge[0][0] >= v[0] && prevAdjEdge[1][0] <= v[0]) || (prevAdjEdge[0][0] <= v[0] && prevAdjEdge[1][0] >= v[0])){
                                intersected++;
                                break;
                            }
                        }
                        if (!isVertical && prevAdjEdge[0][0] === prevAdjEdge[1][0] && v[0] === prevAdjEdge[0][0]){
                            if ((prevAdjEdge[0][1] >= v[1] && prevAdjEdge[1][1] <= v[1]) || (prevAdjEdge[0][1] <= v[1] && prevAdjEdge[1][1] >= v[1])){
                                intersected++;
                                break;
                            }
                        }
                    }
                });
                if (intersected){
                    costToTargetEstimate = costToTargetEstimate * ((intersected / 4) + 1);
                }
                //*/

                if (costToTargetEstimate < bestCostEstimate){
                    bestCostEstimate = costToTargetEstimate;
                    bestIdx = i;
                }
            }
            const result = vQueue[bestIdx];
            vQueue.splice(bestIdx, 1);
            result.heuristicCostTotal = (result.heuristicCostTotal || 0) + bestCostEstimate;
            return result;
        }

        let iterations = 0;
        while (vQueue.length){
            const currArgs = getNextVQueueSet();
            const {
                v: currV,
                searchPath: currSearchPath,
                pathLengthCost: currPathLengthCost,
                skip,
                heuristicCostTotal
            } = currArgs;

            const existingRes = bestResultsPerVertex.get(currV);
            if (existingRes && existingRes.pathLengthCost < currPathLengthCost){
                continue;
            }
            if (existingRes && existingRes.heuristicCostTotal <= heuristicCostTotal){
                continue;
            }
            bestResultsPerVertex.set(currV, currArgs);

            if (currV[0] === 600 && currV[1] === 40){
                console.log(
                    "GOTNEWWW", currV,
                    '\nDEPTH', currSearchPath.length,
                    '\nCOSTNOW', currPathLengthCost, heuristicCostTotal,
                    '\nOWNPATH', currSearchPath.map(function(e){ return e[0].join(',') + '-' + e[1].join(','); }),
                    //'\nSKIP', [...skip.values()]
                );
            }

            if (currV[0] === targetV[0] && currV[1] === targetV[1]){
                if (currPathLengthCost < bestPathTotalCost){
                    bestPathTotalCost = currPathLengthCost;
                    bestPathTotal = currSearchPath;
                    console.info("FOUND after", iterations);
                    break;
                }
            }

            const nextAvailableSegments = getNextAvailableEdgeSegments(currV, skip);

            //console.log('VV', currV, targetV, currPathLengthCost, nextEdgesAndVs, [...skip], iterations);

            nextAvailableSegments.forEach(function({ edge, v }){
                const nextSkip = new Set(skip);
                nextSkip.add(edge);
                vQueue.push({
                    v,
                    searchPath: [].concat(currSearchPath).concat([edge]),
                    pathLengthCost: currPathLengthCost + manhattanDistance(...edge),
                    skip: nextSkip,
                    heuristicCostTotal
                });
            });

            iterations++;

            if (iterations > 20000){
                console.error("PAST 20k!!!");
                break;
            }
        }

        return { 'path': bestPathTotal, 'cost': bestPathTotalCost };

    }

    adjustableEdges.forEach(function(edge, edgeIndex){
        // We have 4 pts min in each due to edgeLedge
        const edgeVLen = edge.vertices.length;
        const fromV = edge.vertices[1];
        const toV = edge.vertices[edgeVLen - 2];

        console.log('Orig', edge, edge.vertices.slice(0));
        const { cost, path } = computeDistance(fromV, toV, [ edge.vertices.slice(0,2) ]);

        console.log("COST", cost);

        if (!path) {
            throw new Error('Could not find path');
        }

        // Remove edges from queues
        let pathIdx;
        for (pathIdx = 1; pathIdx < path.length; pathIdx++){ // Skip first edge segment (edge ledge)
            const edgeSegmentToRemove = path[pathIdx];
            const useQ = (edgeSegmentToRemove[0][0] === edgeSegmentToRemove[1][0] ? vSegmentQ : hSegmentQ);
            const useQLen = useQ.length;
            let found = false, i;
            for (i = 0; i < useQLen; i++){
                if (useQ[i] === edgeSegmentToRemove){
                    found = true;
                    break;
                }
            }
            if (found){
                useQ.splice(i, 1);
            } else {
                console.error("couldnt delete", edgeSegmentToRemove);
            }
        }

        edge._tempNextVertices = path.reduce(function(m, edgePart){
            const lastAdded = m[m.length - 1];
            if (lastAdded[0] === edgePart[0][0] && lastAdded[1] === edgePart[0][1]){
                m.push(edgePart[1]);
            } else {
                m.push(edgePart[0]);
            }
            return m;
        }, [ edge.vertices[0] ]);

        // Last edgeLedge
        edge._tempNextVertices.push(edge.vertices[edge.vertices.length - 1]);
        edge._visibilityGraphVertices = edge._tempNextVertices.slice(0);

        // Flatten joining vertical + horizontal segments into bigger segments to simplify DOM
        // path 'd' attribute as well as improve intersection checking performance.
        const { prevV: lastV, vertices: flattenedVertices } = edge._tempNextVertices.reduce(function(m, v){
            if (!m.prevV){
                m.vertices.push(v);
                return { prevV: v, vertices: m.vertices, currDir: "any" };
            }
            let nextDir = m.currDir;
            if (m.currDir === "any"){
                if (v[0] === m.prevV[0]){
                    nextDir = "horizontal";
                } else {
                    nextDir = "vertical";
                }
            } else if (m.currDir === "horizontal"){
                if (v[0] !== m.prevV[0]){
                    m.vertices.push(m.prevV);
                    nextDir = "vertical";
                }
            } else if (m.currDir === "vertical"){
                if (v[1] !== m.prevV[1]){
                    m.vertices.push(m.prevV);
                    nextDir = "horizontal";
                }
            }
            return { prevV: v, vertices: m.vertices, currDir: nextDir };
        }, { prevV : null, vertices: [], currDir : null });

        if (flattenedVertices[flattenedVertices.length - 1] !== lastV){
            flattenedVertices.push(lastV);
        }

        edge._tempNextVertices = flattenedVertices;

        console.log('New', edge._tempNextVertices.slice(0), path);


    });

    // After all edges traced w.o. exceptions, cement the `nextVertices` into `vertices`.
    adjustableEdges.forEach(function(edge){
        edge.vertices = edge._tempNextVertices;
        delete edge._tempNextVertices;
    });
}

export function computeVisibilityGraph(objectGraph, directEdges, dims, graphHeight, countDirectEdges = true, divCount = 2){

    const hSegments = [];
    const vSegments = [];

    const seenRelationships = new Set();

    const halfIndvWidth = dims.individualWidth / 2;
    const halfIndvHeight = dims.individualHeight / 2;
    const halfRelationSize = dims.relationshipSize / 2;

    // We might have nodes be in same 'column' of spacing of dif rows
    // if even # of children siblings
    const partIndWidth = dims.individualWidth / divCount; // / 2;
    const partIndHeight = dims.individualHeight / 2;
    const partIndXSpacing = dims.individualXSpacing / divCount;
    const partIndYSpacing = dims.individualYSpacing / divCount;

    console.log('PART', partIndHeight, partIndYSpacing);

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
        // Hacky - arrays are instances of object.
        indvVertices.obstacleType = "individual";
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
            relationShipVertices.obstacleType = "relationship";
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
        let bb = null;
        if (edge.vertices[0][0] === edge.vertices[1][0]){
            // Vertical line segment
            if (edge.vertices[0][1] > edge.vertices[1][1]){
                bb = [
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[1][1] ],
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[0][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[1][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[0][1] ]
                ];
            } else {
                bb = [
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[0][1] ],
                    [ edge.vertices[0][0] - halfRelationSize, edge.vertices[1][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[0][1] ],
                    [ edge.vertices[0][0] + halfRelationSize, edge.vertices[1][1] ]
                ];
            }
        } else {
            // Horizontal line segment
            if (edge.vertices[0][0] < edge.vertices[1][0]){
                bb = [
                    [ edge.vertices[0][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[0][0], edge.vertices[1][1] + halfRelationSize ],
                    [ edge.vertices[1][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[1][0], edge.vertices[1][1] + halfRelationSize ]
                ];
            } else {
                bb = [
                    [ edge.vertices[1][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[1][0], edge.vertices[1][1] + halfRelationSize ],
                    [ edge.vertices[0][0], edge.vertices[1][1] - halfRelationSize ],
                    [ edge.vertices[0][0], edge.vertices[1][1] + halfRelationSize ]
                ];
            }
        }
        // Hacky-ish - arrays are instances of object.
        bb.obstacleType = "edge";
        boundingBoxes.push(bb);
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
    let xCoordToSave;// = -partIndWidth;
    let counter = -1;
    const maxWidthCounter = graphWidth / partIndWidth;

    // We moved to this approach instead of the commented-out
    // below one due to JS floats not being precise at all.
    // It relies on dims.individualXSpacing and dims.individualWidth being equal
    while (counter < maxWidthCounter){
        counter++;
        xCoordToSave = counter * partIndWidth;
        xCoordToSave = Math.round(xCoordToSave * 10000) / 10000;
        vertlineXCoords.push(xCoordToSave);
    }

    /*
    while (xCoordToSave < graphWidth){
        // Make vert lines, split them into pieces
        // TODO: Reconsider; only practical atm if partIndWidth
        // & partIndXSpacing are equal since nodes might occupy
        // the partIndXSpacing area if even # of children of parent
        // relationship, for example
        if (counter % (2 * divCount) < divCount){
            xCoordToSave += partIndWidth;
        } else {
            xCoordToSave += partIndXSpacing;
        }
        // Round it so we don't be comparing 239.9999999997 vs 240 to get !==.
        const remainder = xCoordToSave % dims.individualWidth;
        if ((remainder < .00001) || (dims.individualWidth - remainder < .00001)){
            xCoordToSave = Math.round(xCoordToSave * 10000) / 10000;
        }
        //xCoordToSave += partIndXSpacing;
        vertlineXCoords.push(xCoordToSave);
        counter++;
    }
    */

    let yCoord = -partIndHeight;
    const horizLineYCoords = [];
    counter = -1;
    // Unlike approach for xCoords, this approach can break if partIndHeight
    // or partIndYSpacing is a float, esp something like XX.33333, since is not precise.
    // For now, partIndHeight is always 40 and dims.individualYSpacing is 120, wherein 120 is
    // divisible by integers 1-6, which covers all our possible subdivisions for time being.
    // In the future, we could return to this to make sure float values are handled and rounded.
    while (yCoord < graphHeight){
        // Make horiz lines, split them into pieces
        if (counter % (2 + divCount) < 2){ // Within row of individuals
            yCoord += partIndHeight;
        } else {
            yCoord += partIndYSpacing;  // Within row of spacing area
        }
        horizLineYCoords.push(yCoord);
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
                    splitArrs.push([ bb[0][0], bb[3][0] ]);
                    // Add edgeLedge splits
                    if (bb.obstacleType === 'individual'){
                        if (bb[0][0] - dims.edgeLedge >= 0){
                            splits.add(bb[0][0] - dims.edgeLedge);
                        }
                        if (bb[3][0] + dims.edgeLedge <= graphWidth){
                            splits.add(bb[3][0] + dims.edgeLedge);
                        }
                    } else if (bb.obstacleType === 'relationship'){
                        const centerPt = bb[0][0] + ((bb[3][0] - bb[0][0]) / 2);
                        if (centerPt - dims.edgeLedge >= 0){
                            splits.add(centerPt - dims.edgeLedge);
                        }
                        if (centerPt + dims.edgeLedge <= graphWidth){
                            splits.add(centerPt + dims.edgeLedge);
                        }
                    }
                } else {
                    //splits.add(bb[0][0]);
                    //splits.add(bb[3][0]);
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
        counter++;
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
                    //splits.add(bb[0][1]);
                    //splits.add(bb[3][1]);
                }
                //todo
            }
        });
        splits = reduceSplits(splits, splitArrs);
        console.log('SPLITS-h', splits, splitArrs);
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

/**
 * Make sure only 1 object reference exists for each
 * vertex (array of [x,y]) for simpler comparisons.
 */
function uniquifyVertices(...edgeSegmentsList){
    const uniqueVertices = new Set();
    const allPaths = edgeSegmentsList.reduce(function(m, verticesList){
        m = m.concat(verticesList);
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



/**
 * Gets all diseases, uniqifies, then assigns a numerical index to each.
 * Disease indices start from 1 for easier truthy/falsy checking.
 */
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
