import { getGraphHeight } from './layout-utilities-drawing';
import { getRelationships, isRelationship } from './data-utilities';



/** Should already have relationships */
export function assignTreeHeightIndices(objectGraph, filterUnrelatedIndividuals = false){

    const unassignedIDs = new Set(objectGraph.map(function(og){
        return og.id;
    }));
    const visitedRelationships = new Set();

    function performAssignments(q){
        while (q.length) {
            const individual = q.shift();
            const {
                _parentalRelationship = null,
                _maritalRelationships = [],
                _drawing : { heightIndex },
                id
            } = individual;

            if (!unassignedIDs.has(id)){
                continue;
            }
            unassignedIDs.delete(id);
            //individual._drawing = individual._drawing || {};
            //individual._drawing.heightIndex = heightIndex;

            if (_parentalRelationship && !visitedRelationships.has(_parentalRelationship)){
                visitedRelationships.add(_parentalRelationship);
                _parentalRelationship._drawing = { heightIndex : heightIndex + 1 };
                _parentalRelationship.children.forEach(function(sibling){
                    if (sibling === individual || !unassignedIDs.has(sibling.id)) return;
                    sibling._drawing = { heightIndex }; // Same as that of individual
                    q.push(sibling);
                });
                _parentalRelationship.partners.forEach(function(parent){
                    if (!unassignedIDs.has(parent.id)) return;
                    parent._drawing = { heightIndex: heightIndex + 1 };
                    q.push(parent);
                });
            }

            _maritalRelationships.forEach(function(maritalRelationship){
                if (visitedRelationships.has(maritalRelationship)) return;
                visitedRelationships.add(maritalRelationship);
                maritalRelationship._drawing = { heightIndex }; // Same as that of individual
                maritalRelationship.children.forEach(function(child){
                    if (!unassignedIDs.has(child.id)) return;
                    child._drawing = { heightIndex: heightIndex - 1 };
                    q.push(child);
                });
                maritalRelationship.partners.forEach(function(partner){
                    if (partner === individual || !unassignedIDs.has(partner.id)) return;
                    partner._drawing = { heightIndex };
                    q.push(partner);
                });
            });

        }
    }

    // Assign to individuals starting from proband (1st item in list)
    // Handle any lingering-unattached-to-proband individuals by assigning them 0.
    while (unassignedIDs.size > 0){
        let nextUnassignedIndv;
        for (let i = 0; i < objectGraph.length; i++){
            if (unassignedIDs.has(objectGraph[i].id)){
                nextUnassignedIndv = objectGraph[i];
                break;
            }
        }
        nextUnassignedIndv._drawing = { heightIndex : 0 };
        performAssignments([ nextUnassignedIndv ]);
    }


    // Ensure each relationship is on same height index as lowest heightIndex of partners
    // Then that all children are at that index or lower.

    function moveLower(rel, maxHeightIdx = null, seen = null){
        if (!seen) seen = new Set();
        if (seen.has(rel)) return;
        seen.add(rel);
        if (!maxHeightIdx){
            let smallestHeightIndexOfPartners = Infinity;
            rel.partners.forEach(function(partner){
                smallestHeightIndexOfPartners = Math.min(smallestHeightIndexOfPartners, partner._drawing.heightIndex);
            });
            if (smallestHeightIndexOfPartners < rel._drawing.heightIndex){
                console.log("Moved relationship", rel, rel._drawing.heightIndex, smallestHeightIndexOfPartners);
                rel._drawing.heightIndex = smallestHeightIndexOfPartners;
            }

            maxHeightIdx = rel._drawing.heightIndex;
        } else {
            if (maxHeightIdx < rel._drawing.heightIndex){
                rel._drawing.heightIndex = maxHeightIdx;
            }
        }
        rel.children.forEach(function(child, idx){
            if (child._drawing.heightIndex >= maxHeightIdx){
                child._drawing.heightIndex = maxHeightIdx - 1;
                (child._maritalRelationships || []).forEach(function(mr){
                    moveLower(mr, maxHeightIdx - 1, new Set(seen));
                });
            }
        });

        rel.partners.forEach(function(partner){
            if (partner._parentReferences.length === 0 && partner._maritalRelationships.length === 1) {
                const maxChildHeightIndex = Math.max(...rel.children.map(function(ch){ return ch._drawing.heightIndex; }));
                if (maxChildHeightIndex < maxHeightIdx){
                    partner._drawing.heightIndex = maxHeightIdx;
                }
            }/*else if (partner._maritalRelationships.length > 1){
                (partner._maritalRelationships || []).forEach(function(mr){
                    moveLower(mr, maxHeightIdx - 1, new Set(seen));
                });
            }*/
        });
    }

    const relationships = [...visitedRelationships];
    relationships.forEach(function(rel){
        moveLower(rel);
        /*
        let smallestHeightIndexOfPartners = Infinity;
        rel.partners.forEach(function(partner){
            smallestHeightIndexOfPartners = Math.min(smallestHeightIndexOfPartners, partner._drawing.heightIndex);
        });

        console.log("Moving? relationship",
            rel.partners.map(function(p){ return p.name; }),
            rel.partners.map(function(p){ return p._drawing.heightIndex; }),
            rel.children.map(function(c){ return c.name; }),
            rel.children.map(function(c){ return c._drawing.heightIndex; }),
            rel._drawing.heightIndex //, smallestHeightIndexOfPartners
        );


        if (smallestHeightIndexOfPartners < rel._drawing.heightIndex){
            console.log("Moved relationship", rel, rel._drawing.heightIndex, smallestHeightIndexOfPartners);
            rel._drawing.heightIndex = smallestHeightIndexOfPartners;
        }

        rel.children.forEach(function(child, idx){
            if (child._drawing.heightIndex >= rel._drawing.heightIndex){
                child._drawing.heightIndex = rel._drawing.heightIndex - 1;
            }
        });

        rel.partners.forEach(function(partner){
            if (partner._parentReferences.length === 0 && partner._maritalRelationships.length === 1) {
                const maxChildHeightIndex = Math.max(...rel.children.map(function(ch){ return ch._drawing.heightIndex; }));
                if (maxChildHeightIndex < smallestHeightIndexOfPartners){
                    partner._drawing.heightIndex = smallestHeightIndexOfPartners;
                }
            }
        });
        */
    });

    // while (q.length) {
    //     const { individual, heightIndex } = q.shift();
    //     const { _parentReferences = [], _childReferences = [], id } = individual;
    //     if (visited[id]){
    //         continue;
    //     }
    //     individual._drawing = individual._drawing || {};
    //     individual._drawing.heightIndex = heightIndex;
    //     visited[id] = true;
    //     const parentHeightIndex = heightIndex + 1;
    //     const childHeightIndex = heightIndex - 1;
    //     _childReferences.forEach(function(child, childIndex){
    //         /*
    //         let nextXIndex;
    //         if (parent.gender === 'male'){
    //             nextXIndex = -1;
    //         } else if (parent.gender === 'female'){
    //             nextXIndex = 1;
    //         }
    //         */
    //         q.push({ 'individual': child, 'heightIndex': childHeightIndex });
    //     });
    //     _parentReferences.forEach(function(parent, parentIndex){
    //         /*
    //         let nextXIndex;
    //         if (parent.gender === 'male'){
    //             nextXIndex = -1;
    //         } else if (parent.gender === 'female'){
    //             nextXIndex = 1;
    //         }
    //         */
    //         q.push({ 'individual': parent, 'heightIndex': parentHeightIndex });
    //     });
    //
    // }


    // Shift heightIndices so 0 is smallest.
    let smallestHeightIndex = 0;
    objectGraph.forEach(function(indv){
        smallestHeightIndex = Math.min(smallestHeightIndex, indv._drawing.heightIndex);
    });

    if (smallestHeightIndex !== 0){ // adjust so starts w 0
        const diff = 0 - smallestHeightIndex;
        objectGraph.forEach(function(indv){
            indv._drawing.heightIndex += diff;
        });
        relationships.forEach(function(rel){
            rel._drawing.heightIndex += diff;
        });
    }

    return objectGraph;
}


/** Individuals with no parents defined */
export function getParentlessIndividuals(objectGraph){
    return objectGraph.filter(function(individual){
        if (!individual.parents || individual.parents.length === 0){
            return true;
        }
        return false;
    });
}

/** Individuals with no children defined */
export function getChildlessIndividuals(objectGraph){
    return objectGraph.filter(function(individual){
        if (!individual.children || individual.children.length === 0){
            return true;
        }
        return false;
    });
}

export function indvListToMap(list){
    const idMap = {};
    list.forEach(function(indv){
        idMap[indv.id] = indv;
    });
    return idMap;
}

/**
 * Must have `_drawing.heightIndex` already.
 */
export function getParentlessPartners(objectGraph, memoized = {}){
    const rootlessPartners = {};
    const idMap = (memoized.indvListToMap || indvListToMap)(objectGraph);
    const parentlessIndividuals = (memoized.getParentlessIndividuals || getParentlessIndividuals)(objectGraph);
    parentlessIndividuals.forEach(function(parentlessIndv){
        const { _childReferences, _drawing } = parentlessIndv;
        const otherParentIDSet = _childReferences.reduce(function(allParentIDs, child){
            child._parentReferences.forEach(function(parent){
                if (parent.id !== parentlessIndv.id){
                    allParentIDs.add(parent.id);
                }
            });
            return allParentIDs;
        }, new Set());
        const otherParents = [...otherParentIDSet].map(function(pID){ return idMap[pID]; });
        const otherParentsHeightIndices = otherParents.map(function(oP){ return oP._drawing.heightIndex; });
        for (let i = 0; i < otherParentsHeightIndices.length; i++){
            if (otherParents[i]._drawing.heightIndex !== _drawing.heightIndex){
                return; // continue/skip for ordering purposes
            }
        }

        otherParents.forEach(function(oP){
            const { _parentReferences } = oP;
            if (_parentReferences.length > 0){
                rootlessPartners[oP.id] = rootlessPartners[oP.id] || [];
                rootlessPartners[oP.id].push(parentlessIndv);
            }
        });

    });
    // TODO: ensure it works
    return rootlessPartners;
}

export function getChildlessSiblings(objectGraph, memoized = {}){
    const leafSiblings = {};
    const seen = {};
    const leafIndividuals = (memoized.getChildlessIndividuals || getChildlessIndividuals)(objectGraph);
    leafIndividuals.forEach(function(indv){
        const { id, _parentalRelationship = null } = indv;
        if (seen[id]) return;
        if (_parentalRelationship && _parentalRelationship.children.length >= 2){
            leafSiblings[id] = [];
            _parentalRelationship.children.forEach(function(sibling){
                if (sibling.id === id || sibling._maritalRelationships.length > 0) return;
                leafSiblings[id].push(sibling);
                seen[sibling.id] = true;
            });
        }
    });
    return leafSiblings;
}



export function permutate2DArray1Dimension(arr, from = 0, permutations = []){
    const len = arr.length;
    if (from === len - 1) {
        permutations.push([].concat(...arr));
        return permutations;
    }

    for (let i = from; i < len; i++) {
        // Swap
        let temp = arr[i];
        arr[i] = arr[from];
        arr[from] = temp;
        // Recurse
        permutate2DArray1Dimension(arr, from + 1, permutations);
        // Reverse
        temp = arr[i];
        arr[i] = arr[from];
        arr[from] = temp;
    }

    return permutations;
}

export function computePossibleParentlessPermutations(objectGraph, memoized = {}, skip={}){
    const parentlessIndividuals = (memoized.getParentlessIndividuals || getParentlessIndividuals)(objectGraph);
    const seen = {};
    const buckets = [];
    parentlessIndividuals.forEach(function(indv){
        if (seen[indv.id] || skip[indv.id]) return;
        const nextBucket = [];
        nextBucket.push(indv);
        seen[indv.id] = true;

        // grouping: place parents which are only connected to the same relationship in the same bucket
        if (indv._maritalRelationships.length === 1){
            const otherPartners = indv._maritalRelationships[0].partners.filter(function(partner){
                return partner.id !== indv.id;
            });
            otherPartners.forEach(function(oP){
                if (!seen[oP.id]){
                    if (oP._parentReferences.length === 0 && oP._maritalRelationships.length === 1){
                        nextBucket.push(oP);
                        seen[oP.id] = true;
                    }
                }
            });
        }

        buckets.push(nextBucket);
    });

    return permutate2DArray1Dimension(buckets);
}



export function computePossibleChildlessPermutations(objectGraph, memoized = {}, skip={}){
    const leafSiblingsObj = (memoized.getChildlessSiblings || getChildlessSiblings)(objectGraph);
    const idMap = (memoized.indvListToMap || indvListToMap)(objectGraph);
    const seen = {};
    const buckets = [];
    Object.keys(leafSiblingsObj).forEach(function(leafIndvID){
        const siblings = leafSiblingsObj[leafIndvID];
        const bucket = [ idMap[leafIndvID], ...siblings ];
        buckets.push(bucket);
        bucket.forEach(function(indv){
            seen[indv.id] = true;
        });
    });

    objectGraph.forEach(function(indv){
        if (seen[indv.id] || skip[indv.id]) return;
        if (indv._childReferences.length > 0) return;
        buckets.push([indv]);
    });

    return permutate2DArray1Dimension(buckets);
}


export function getMaxHeightIndex(objectGraph){
    return objectGraph.reduce(function(currMax, individual){
        if (individual._drawing.heightIndex > currMax){
            return individual._drawing.heightIndex;
        }
        return currMax;
    }, -1);
}


function initOrdering(objectGraph, startIndividuals = null, direction = "children", stack = false, memoized = {}){
    const q = startIndividuals.slice(0);
    if (!stack){
        q.reverse();
    }

    const orderByHeightIndex = []; // 2D
    const maxHeightIndex = (memoized.getMaxHeightIndex || getMaxHeightIndex)(objectGraph);
    for (let i = 0; i <= maxHeightIndex; i++){
        orderByHeightIndex[i] = [];
    }

    function addToQ(indv){
        if (stack){
            q.push(indv);
        } else {
            q.unshift(indv);
        }
    }

    function assignOrder(node){
        const { id, _drawing : { heightIndex } } = node;
        const orderAssignedInIndex = orderByHeightIndex[heightIndex].length;
        seenOrderInIndex[id] = orderAssignedInIndex;
        orderByHeightIndex[heightIndex].push(node);
    }

    const seenOrderInIndex = {};
    const seenIndvs = [];
    while (true){
        while (q.length){
            const individual = q.pop();
            const {
                id,
                _drawing : { heightIndex },
                _maritalRelationships = [],
                _parentalRelationship = null
            } = individual;
            if (typeof seenOrderInIndex[id] !== "undefined") continue;
            assignOrder(individual);
            seenIndvs.push(individual);

            if (direction === "parents" && _parentalRelationship){
                if (typeof seenOrderInIndex[_parentalRelationship.id] === "undefined"){
                    assignOrder(_parentalRelationship);
                    _parentalRelationship.partners.forEach(addToQ);
                }
            } else if (direction === "children" && _maritalRelationships){
                _maritalRelationships.forEach(function(mr){
                    if (typeof seenOrderInIndex[mr.id] !== "undefined") return;
                    assignOrder(mr);
                    mr.children.forEach(addToQ);
                });
            }
        }
        if (seenIndvs.length === objectGraph.length){
            break;
        } else {
            // Have Individuals not connected to proband
            console.error("Unconnected individuals found", seenOrderInIndex, objectGraph);
            for (let i = 0; i < objectGraph.length; i++){
                if (typeof seenOrderInIndex[objectGraph[i].id] === 'undefined'){
                    q.push(objectGraph[i]);
                    break;
                }
            }
        }
    }
    return { orderByHeightIndex, seenOrderInIndex };
}

function countNodesInBetween(order, heightIndex, orderFrom, orderTo){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    let num = 0;
    const begin = Math.min(orderFrom, orderTo) + 1;
    const end = Math.max(orderFrom, orderTo) - 1;
    for (let ord = begin; ord <= end; ord++){
        const indv = orderByHeightIndex[heightIndex][ord];
        indv._parentReferences.forEach(function(parent){
            if (parent._drawing.heightIndex !== heightIndex){
                num++;
                return;
            }
            const parentOrder = seenOrderInIndex[parent.id];
            if (parentOrder < (begin - 1) || parentOrder > (end + 1)){
                num++;
            }
        });
    }
    return num;
}

function countEdgeCrossingInstance(order, fromNode, toNode){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    const orderFrom = seenOrderInIndex[fromNode.id];
    const orderTo = seenOrderInIndex[toNode.id];
    const hiFrom = fromNode._drawing.heightIndex;
    const hiTo = toNode._drawing.heightIndex;

    if (hiFrom === hiTo){
        return (Math.abs(orderFrom - orderTo) - 1) * 2;
        //return countNodesInBetween(order, hiFrom, orderFrom, orderTo);
    }

    let crossings = 0;

    function checkAndCount(node){
        if (fromNode === node) return;
        if (seenOrderInIndex[node.id] < orderTo){
            crossings++;
        }
    }

    const subsequentSiblingsInIndex = orderByHeightIndex[hiFrom].slice(orderTo);
    subsequentSiblingsInIndex.forEach(function(siblingInIndex){
        const { id, partners, children, _maritalRelationships, _parentalRelationship } = siblingInIndex;
        if (isRelationship(siblingInIndex)) {
            if (hiTo < hiFrom){
                children.forEach(checkAndCount);
            }
        } else {
            if (hiTo > hiFrom){
                if (_parentalRelationship){
                    checkAndCount(_parentalRelationship);
                }
            }
        }
        //siblingInIndex._childReferences.forEach(checkAndCount);
    });

    return crossings;
}

function countEdgeCrossings(objectGraph, order, memoized = {}){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    let crossings = 0;

    orderByHeightIndex.forEach(function(nodesInRow, hi){ // going up
        nodesInRow.forEach(function(node){
            const { id, partners, children, _maritalRelationships, _parentalRelationship } = node;
            if (isRelationship(node)) {
                partners.forEach(function(indv){
                    crossings += countEdgeCrossingInstance(order, node, indv);
                });
                children.forEach(function(indv){
                    crossings += countEdgeCrossingInstance(order, node, indv);
                });
            } else {
                _maritalRelationships.forEach(function(mr){
                    crossings += countEdgeCrossingInstance(order, node, mr);
                });
                if (_parentalRelationship){
                    crossings += countEdgeCrossingInstance(order, node, _parentalRelationship);
                }
            }
            //const { _childReferences = [] } = individual;
            //_childReferences.forEach(function(child){
            //    crossings += countEdgeCrossingInstance(order, individual, child);
            //});
        });
    });

    return crossings;
}


function copyOrder(order, objectGraph, memoized = {}){

    function rereferenceOrder(orderUnreferenced, objectGraph, memoized = {}){
        const { orderByHeightIndex, seenOrderInIndex } = orderUnreferenced;
        const idMap = (memoized.indvListToMap || indvListToMap)(objectGraph);
        const nextOrderByHeightIndex = [];
        orderByHeightIndex.forEach(function(r, i){
            if (!Array.isArray(orderByHeightIndex[i])) return;
            nextOrderByHeightIndex[i] = orderByHeightIndex[i].map(function(id){
                return idMap[id];
            });
        });
        return { orderByHeightIndex: nextOrderByHeightIndex, seenOrderInIndex };
    }

    function serializeOrder(order){
        const { orderByHeightIndex, seenOrderInIndex } = order;
        const nextOrderByHeightIndex = [];
        orderByHeightIndex.forEach(function(r, i){
            nextOrderByHeightIndex[i] = orderByHeightIndex[i].map(function(indv){
                return indv.id;
            });
        });
        return { orderByHeightIndex: nextOrderByHeightIndex, seenOrderInIndex };
    }

    return rereferenceOrder(JSON.parse(JSON.stringify(serializeOrder(order))), objectGraph, memoized);
}


export function orderObjectGraph(objectGraph, memoized = {}){
    const parentlessIndividuals     = (memoized.getParentlessIndividuals || getParentlessIndividuals)(objectGraph);
    const leafChildren              = (memoized.getChildlessIndividuals || getChildlessIndividuals)(objectGraph);
    //const parentlessPartners        = (memoized.getParentlessPartners || getParentlessPartners)(objectGraph, memoized);
    //const leafSiblings              = (memoized.getChildlessSiblings || getChildlessSiblings)(objectGraph, memoized);
    const relationships             = (memoized.getRelationships || getRelationships)(objectGraph);
    const rootPermutations          = computePossibleParentlessPermutations(objectGraph, memoized);
    const leafPermutations          = computePossibleChildlessPermutations(objectGraph, memoized);

    let bestOrder = null;
    let bestCrossings = Infinity;
    let i;


    function checkCrossings(order){
        const edgeCrossings = countEdgeCrossings(objectGraph, order, memoized);
        console.log("ORDER", order, edgeCrossings);
        if (edgeCrossings < bestCrossings){
            bestOrder = order;//copyOrder(order, objectGraph, memoized);
            bestCrossings = edgeCrossings;
        }
    }

    for (i = 0; i < rootPermutations.length; i++){
        const orderBFS = initOrdering(objectGraph, parentlessIndividuals, "children", false);
        checkCrossings(orderBFS);
        if (bestCrossings === 0) break;
        const orderDFS = initOrdering(objectGraph, parentlessIndividuals, "children", true);
        checkCrossings(orderDFS);
        if (bestCrossings === 0) break;
    }

    if (bestCrossings !== 0){
        for (i = 0; i < leafPermutations.length; i++){
            const orderBFS = initOrdering(objectGraph, leafChildren, "parents", false);
            checkCrossings(orderBFS);
            if (bestCrossings === 0) break;
            const orderDFS = initOrdering(objectGraph, leafChildren, "parents", true);
            checkCrossings(orderDFS);
            if (bestCrossings === 0) break;
        }
    }

    // Apply to objects
    const { seenOrderInIndex } = bestOrder;
    objectGraph.forEach(function(indv){
        indv._drawing.orderInHeightIndex = seenOrderInIndex[indv.id];
    });

    console.log("BEST ORDER", bestOrder, bestCrossings, objectGraph);

    //console.log('TTT-ORDER', parentlessIndividuals, parentlessPartners, rootPermutations, leafSiblings, leafPermutations);
    return bestOrder;
}


/** Needs work **/
export function positionObjectGraph(objectGraph, order, dims, memoized = {}){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    const graphHeight = (memoized.getGraphHeight || getGraphHeight)(orderByHeightIndex, dims);
    const relationships = (memoized.getRelationships || getRelationships)(objectGraph);
    const yCoordByHeightIndex = orderByHeightIndex.map(function(indvsInRow, heightIndex){
        return graphHeight - (
            (dims.graphPadding * 2)
            + (heightIndex * dims.individualHeight)
            + (heightIndex * dims.individualYSpacing)
            + (dims.individualHeight / 2)
        );
    });
    const relativeMidpoint = Math.floor(dims.individualWidth / 2);
    const idMap = {};

    function slideChildren(children, diff, seenIndvs=null, skipPRs=null){
        const q = [...children];
        const seen = (seenIndvs && Object.assign({}, seenIndvs)) || {};
        const seenPRs = (skipPRs && Object.assign({}, skipPRs)) || {};
        while (q.length){
            const child = q.shift();
            const { id, _drawing, _parentalRelationship, children } = child;
            if (seen[id]) continue;
            seen[id] = true;
            console.log("b4SLID", id, child.name, child, diff);
            _drawing.xCoord += diff;
            console.log("SLID", id, child.name, diff, _drawing.xCoord);
            /*
            if (_parentalRelationship && !seenPRs[_parentalRelationship.id]){
                if (typeof _parentalRelationship._drawing.xCoord === 'number' && !seenPRs[_parentalRelationship.id]){
                    _parentalRelationship._drawing.xCoord += diff;
                    console.log("SLID", _parentalRelationship.id, diff, _parentalRelationship._drawing.xCoord);
                }
                seenPRs[_parentalRelationship.id] = true;
            }
            */
            // Right-er sibling-level nodes
            const orderPlace = seenOrderInIndex[id];
            orderByHeightIndex[_drawing.heightIndex].slice(orderPlace + 1).forEach(function(ch){
                q.push(ch);
            });
            // Own children
            if (isRelationship(child)){
                (children || []).forEach(function(ch){
                    q.push(ch);
                });
            }
        }
        return seen;
    }

    function boundsOfNodes(nodes){
        const xCoords = nodes.map(function(node){
            return node._drawing.xCoord;
        });
        if (xCoords.length === 1){
            console.log('MEDX', xCoords);
            return [ xCoords[0], xCoords[0] ];
        }
        console.log('MED', xCoords);
        const lowXBound = Math.min(...xCoords);
        const highXBound = Math.max(...xCoords);
        return [ lowXBound, highXBound ];
    }

    function calculateMedianOfNodes(nodes){
        const [ lowXBound, highXBound ] = boundsOfNodes(nodes);
        if (lowXBound === highXBound) return lowXBound;
        return Math.floor((lowXBound + highXBound) / 2);
    }

    function getPositionedRelationshipsAtHeightIndex(hi){
        return relationships.filter(function(relationship){
            const { _drawing } = relationship;
            //console.log('RELATION', _drawing.xCoord, hi, _drawing.heightIndex, JSON.parse(JSON.stringify(relationship._drawing)));
            return (typeof _drawing.xCoord === 'number' && _drawing.heightIndex === hi);
        });
    }

    console.log('TTTT', orderByHeightIndex, seenOrderInIndex);

    // Init coords
    orderByHeightIndex.forEach(function(nodesInRow, hi){
        if (orderByHeightIndex[hi].length === 0) return;
        //const [ firstIndv, ...remainingIndvs ] = individualsInRow;

        nodesInRow.reduce(function(prevNode, currNode){
            const { _maritalRelationships, _drawing, children, id, name } = currNode;
            idMap[id] = currNode;
            let offsetFromPrevNode = null;
            if (prevNode === null){
                _drawing.xCoord = relativeMidpoint;
                offsetFromPrevNode = _drawing.xCoord; // + dims.individualWidth + dims.individualXSpacing;
                console.log('DDD2', name, relativeMidpoint);
            } else {
                // Stack to left
                // maybe change to all relationships in row?
                /*
                const commonRowPrevRelationMedians = prevIndv._maritalRelationships.filter(function(mr){
                    return mr._drawing.heightIndex === _drawing.heightIndex;
                }).map(function(mr){
                    return mr._drawing.xCoord;
                });
                */


                


                /*
                const commonRowPrevRelationMedians = getPositionedRelationshipsAtHeightIndex(hi).map(function(mr){
                    return mr._drawing.xCoord;
                });

                console.log(commonRowPrevRelationMedians, getPositionedRelationshipsAtHeightIndex(hi));
                */

                offsetFromPrevNode = prevNode._drawing.xCoord + dims.individualWidth + dims.individualXSpacing;
                _drawing.xCoord = offsetFromPrevNode;

                if (isRelationship(currNode)){
                    const childrenWithAssignedXCoord = children.filter(function(c){
                        return typeof c._drawing.xCoord === 'number';
                    });
                    if (childrenWithAssignedXCoord.length !== children.length){
                        console.error("Some children of " + ( name || id ) + " have not been assigned positions yet:", children.slice());
                    }
                    const childrenMedian = calculateMedianOfNodes(childrenWithAssignedXCoord);
                    if (_drawing.xCoord < childrenMedian){ // Move self (relationship node) to right
                        _drawing.xCoord = childrenMedian;
                        console.log("MOVED", currNode, "TO", childrenMedian);
                    } else { // Move children up
                        const diff = _drawing.xCoord - childrenMedian;
                        console.log("SLIDING CHILDREN OF", currNode, "BY", diff);
                        slideChildren(children, diff, null, null);
                    }
                }

                /*
                if (commonRowPrevRelationMedians.length > 0){
                    const maxPrevRelationMedian = Math.max(...commonRowPrevRelationMedians);
                    if (maxPrevRelationMedian > (offsetFromPrevNode - relativeMidpoint)) {
                        _drawing.xCoord = (maxPrevRelationMedian + (dims.individualWidth + dims.individualXSpacing));
                    } else {
                        console.log('DDD4 - directly right of prev individual', name, _drawing.xCoord, prevIndv._drawing.xCoord);
                    }
                    console.log('DDD4 - has prev relation median', name,
                        maxPrevRelationMedian, offsetFromPrevNode, _drawing.xCoord, prevIndv._drawing.xCoord);
                } else {
                    console.log('DDD4 - NO prev relation median', name, _drawing.xCoord, prevIndv._drawing.xCoord);
                }
                */

                console.log('DDD3', name, _drawing.xCoord, offsetFromPrevNode, prevNode);
            }

            /*
            let prevNodeXCoord = _drawing.xCoord;
            const seenChildren = {};

            _maritalRelationships.forEach(function(relationship){
                const { children = [], partners = [] } = relationship;
                if (typeof relationship._drawing.xCoord === 'number'){
                    // Seen - we will always be coming to the right from left parent
                    // Make sure individual is to the right of any previously-assigned
                    // parents' xcoord. Case might be if on different heightIndex
                    // const prevXCoords = partners.filter(function(p){
                    //     return p.id !== id && p._drawing.xCoord;
                    // }).map(function(p){
                    //     return p._drawing.xCoord;
                    // });
                    // const minXCoord = Math.max(...prevXCoords) + relativeMidpoint + dims.individualXSpacing;
                    // if (minXCoord > _drawing.xCoord){
                    //     _drawing.xCoord = minXCoord;
                    // }
                    return;
                }

                relationship._drawing.xCoord = prevNodeXCoord + dims.individualWidth + dims.individualXSpacing; //offsetFromPrevIndv;
                relationship._drawing.yCoord = yCoordByHeightIndex[_drawing.heightIndex];

                //if (isNaN(relationship._drawing.xCoord)){
                //
                //}

                const childrenWithAssignedXCoord = children.filter(function(c){
                    return typeof c._drawing.xCoord === 'number';
                });

                if (childrenWithAssignedXCoord.length !== children.length){
                    console.error("Some children of " + ( name || id ) + " have not been assigned positions yet:", children.slice());
                }

                if (childrenWithAssignedXCoord.length > 0){
                    const median = calculateMedianOfNodes(childrenWithAssignedXCoord);
                    relationship._drawing.xCoord = median;

                    // Include extra dummy partner in calculation to make room for relationship node
                    const partnerLen = Math.max(partners.length + 1, 3);
                    const leftParentMinXCoord = (
                        median
                        - (((partnerLen * dims.individualWidth) + ((partnerLen - 1) * dims.individualXSpacing)) / 2)
                        + relativeMidpoint
                    );
                    if (leftParentMinXCoord >= _drawing.xCoord){
                        // Move self (individual) up
                        _drawing.xCoord = leftParentMinXCoord;
                    } else {
                        // We haven't moved, move children up.
                        const diff = _drawing.xCoord - leftParentMinXCoord;
                        // Skip children of relationships encountered in this loop before,
                        // instead offset them a smaller amount - median + right bound
                        const prevSeenChildren = Object.keys(seenChildren).map(function(id){
                            return idMap[id];
                        });
                        if (prevSeenChildren.length > 0){
                            const childRightBound = (
                                // median +
                                (((prevSeenChildren.length * dims.individualWidth) + ((prevSeenChildren.length - 1) * dims.individualXSpacing)) / 2)
                            );
                            slideChildren(prevSeenChildren, childRightBound, null, null);
                        }
                        Object.assign(
                            seenChildren,
                            slideChildren(children, diff, seenChildren, null)
                        );
                        //slideChildren(children, diff, null);
                        // Gets handled in `slideChildren`: relationship._drawing.xCoord = median + diff;
                    }
                    console.log(leftParentMinXCoord);
                }

                prevNodeXCoord = relationship._drawing.xCoord;

                console.log('DDD5', name, children.map(c => c._drawing.xCoord), relationship._drawing.xCoord,
                    _drawing.xCoord, calculateMedianOfNodes(children), offsetFromPrevIndv);
            });
            */

            // Set yCoord
            _drawing.yCoord = yCoordByHeightIndex[_drawing.heightIndex];

            return currNode;
        }, null);

        /*
        nodesInRow.forEach(function(individual){
            const { _childReferences, _maritalRelationships, _drawing, id } = individual;
            const commonRowMaritalRelationships = _maritalRelationships.filter(function(mr){
                return mr._drawing.heightIndex === _drawing.heightIndex;
            });
            if (commonRowMaritalRelationships.length === 2){
                // Move to middle if directly in between 2 other individuals (relationships)
                const [ mr1, mr2 ] = commonRowMaritalRelationships;
                let maxXOffset = 0;
                commonRowMaritalRelationships.forEach(function(mr){
                    const orders = mr.partners.map(function(p){ return seenOrderInIndex[p.id]; });
                    maxXOffset = Math.max(maxXOffset, Math.max(...orders) - seenOrderInIndex[id], seenOrderInIndex[id] - Math.min(...orders));
                });
                if (maxXOffset === 1){
                    _drawing.xCoord = Math.floor((mr1._drawing.xCoord + mr2._drawing.xCoord) / 2);
                }
            }
        });
        */

        // Recursively center above child nodes, slide them down if needed.
        //nodesInRow.forEach(function(individual){
        //    console.log('TT', indv);
        //    const { _childReferences, _maritalRelationships } = individual;
        //    
        //});
    });

    // Re-align to left edge if needed -
    let smallestXCoord = Infinity;
    objectGraph.forEach(function(indv){
        smallestXCoord = Math.min(smallestXCoord, indv._drawing.xCoord);
    });
    if (smallestXCoord > relativeMidpoint){
        const diff = relativeMidpoint - smallestXCoord;
        const seenPRs = new Set();
        objectGraph.forEach(function(indv){
            indv._drawing.xCoord += diff;
            if (indv._parentalRelationship && !seenPRs.has(indv._parentalRelationship)){
                indv._parentalRelationship._drawing.xCoord += diff;
                seenPRs.add(indv._parentalRelationship);
            }
        });
    }
}
