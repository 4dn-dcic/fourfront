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


export function permutateArray(arr, from = 0, permutations = []){
    const len = arr.length;
    if (from === len - 1) {
        permutations.push(arr.slice(0));
        return permutations;
    }

    for (let i = from; i < len; i++) {
        // Swap
        let temp = arr[i];
        arr[i] = arr[from];
        arr[from] = temp;
        // Recurse
        permutateArray(arr, from + 1, permutations);
        // Reverse
        temp = arr[i];
        arr[i] = arr[from];
        arr[from] = temp;
    }

    return permutations;
}

export function flattenBuckets(arr){
    return arr.reduce(function(retList, itemOrList, idx){
        if (Array.isArray(itemOrList)){
            return retList.concat(itemOrList);
        }
        retList.push(itemOrList);
        return retList;
    }, []);
}

export function permutate2DArray1Dimension(arr){
    return permutateArray(arr).map(flattenBuckets);
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
        if (indv._maritalRelationships.length === 1 && !seen[indv._maritalRelationships.id]){
            const otherPartners = indv._maritalRelationships[0].partners.filter(function(partner){
                return partner.id !== indv.id && partner._parentReferences.length === 0 && partner._maritalRelationships.length === 1;
            });
            if (otherPartners.length + 1 === indv._maritalRelationships[0].partners.length){
                nextBucket.push(indv._maritalRelationships[0]);
                seen[indv._maritalRelationships.id] = true;
                otherPartners.forEach(function(oP){
                    if (!seen[oP.id]){
                        if (oP._parentReferences.length === 0 && oP._maritalRelationships.length === 1){
                            nextBucket.push(oP);
                            seen[oP.id] = true;
                        }
                    }
                });
            }

        }

        buckets.push(nextBucket);
    });

    console.log("ROOTBUCKETS", buckets);

    return permutate2DArray1Dimension(buckets);
}



export function computePossibleChildlessPermutations(objectGraph, memoized = {}, skip={}){
    const leafSiblingsObj = (memoized.getChildlessSiblings || getChildlessSiblings)(objectGraph);
    const leafIndividuals = (memoized.getChildlessIndividuals || getChildlessIndividuals)(objectGraph);
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

    leafIndividuals.forEach(function(indv){
        if (seen[indv.id] || skip[indv.id]) return;
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



/** NOT USED **/
function initOrderingSimple(objectGraph, memoized = {}){

    const q = [objectGraph[0]];

    const orderByHeightIndex = []; // 2D arr
    const maxHeightIndex = (memoized.getMaxHeightIndex || getMaxHeightIndex)(objectGraph);
    for (let i = 0; i <= maxHeightIndex; i++){
        orderByHeightIndex[i] = [];
    }

    function addToQ(indv){
        q.unshift(indv);
    }

    const orderAssignedDebugList = [];

    function assignOrder(node){
        const { id, _drawing : { heightIndex } } = node;
        const orderAssignedInIndex = orderByHeightIndex[heightIndex].length;
        seenOrderInIndex[id] = orderAssignedInIndex;
        orderByHeightIndex[heightIndex].push(node);
        orderAssignedDebugList.push({ 'id': node.name || node.id, 'h' : heightIndex, 'o' : orderAssignedInIndex });
        //console.log("DIRECT", direction, stack, id, heightIndex, orderAssignedInIndex, q.map(function(item){ return item.id; }));
    }

    const seenOrderInIndex = {};
    const seenIndvs = [];
    // eslint-disable-next-line no-constant-condition
    while (true){
        while (q.length){
            const node = q.pop();
            const {
                id,
                _drawing : { heightIndex },
                _maritalRelationships = [],
                _parentalRelationship = null,
                children = [],
                partners = []
            } = node;

            if (typeof seenOrderInIndex[id] !== "undefined") continue;

            assignOrder(node);

            if (isRelationship(node)){
                (partners || []).forEach(addToQ);
                (children || []).forEach(addToQ);
            } else {
                seenIndvs.push(node);
                _parentalRelationship && addToQ(_parentalRelationship);
                (_maritalRelationships || []).forEach(addToQ);
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

    console.log("ORDER ASSIGNMENTS", orderAssignedDebugList);

    return { orderByHeightIndex, seenOrderInIndex };
}

/** NOT USED **/
function divideIntoBuckets(rowOfNodes = []){
    const buckets = [];
    const seenIDs = {};
    let heightIndex = null;

    function isParentlessWithOneRelationship(partner){
        const sameIndex = partner._drawing.heightIndex === heightIndex;
        const noParents = (partner._parentReferences || []).length === 0;
        const singleRelationship = partner._maritalRelationships.length === 1;
        return sameIndex && noParents && singleRelationship;
    }

    rowOfNodes.forEach(function(node){
        const {
            id,
            _drawing : { heightIndex: hi },
            partners,
            children,
            _maritalRelationships = [],
            _parentalRelationship = null,
            _parentReferences = []
        } = node;
        if (seenIDs[id]) return;
        seenIDs[id] = true;
        if (heightIndex === null){
            heightIndex = hi;
        }
        const currBucket = [node];
        if (isRelationship(node)){
            // Group partner with relationship node if same heightIndex and no other relationships on partner
            const parentlessSinglePartners = (partners || []).filter(isParentlessWithOneRelationship);
            parentlessSinglePartners.forEach(function(partner, i){
                if (i === 0){
                    currBucket.unshift(partner);
                } else {
                    currBucket.push(partner);
                }
                seenIDs[partner.id] = true;
            });
        } else {
            // Group partner with relationship node if same heightIndex and no other relationships on partner
            if (_maritalRelationships.length === 1 && _parentReferences.length === 0 && _maritalRelationships[0]._drawing.heightIndex === heightIndex){
                currBucket.push(_maritalRelationships[0]);
                seenIDs[_maritalRelationships[0].id] = true;
                const parentlessSinglePartners = (_maritalRelationships[0].partners || []).filter(isParentlessWithOneRelationship);
                parentlessSinglePartners.forEach(function(partner, i){
                    if (partner.id === id) return; // Is self, skip
                    currBucket.push(partner);
                    seenIDs[partner.id] = true;
                });
            }
            // Group siblings w.o. relationships
            if (_parentalRelationship && _maritalRelationships.length === 0){
                const relationlessSiblings = (_parentalRelationship.children || []).filter(function(child){
                    if (child.id === id) return false; // Is self, skip
                    if (child._drawing.heightIndex === heightIndex && (child._maritalRelationships || []).length === 0){
                        return true;
                    }
                    return false;
                });
                relationlessSiblings.forEach(function(child){
                    currBucket.push(child);
                    seenIDs[child.id] = true;
                });
            }
        }
        buckets.push(currBucket);
    });
    console.log('BUCKETS', buckets);
    return buckets;
}

/** NOT USED **/
function createOrderingPermutations(order, memoized = {}){
    const { orderByHeightIndex } = order;
    const orderByHeightIndexPermutations = orderByHeightIndex.map(function(nodesInrow, heightIndex){
        return permutate2DArray1Dimension(divideIntoBuckets(nodesInrow));
    });
    const orderingPermutations = [];
    const totalCountPermutations = orderByHeightIndexPermutations.reduce(function(m, permutationsOfRow){
        return m * permutationsOfRow.length;
    }, 1);

    const counters = orderByHeightIndexPermutations.map(function(){
        return 0;
    });

    function incrementCounters(){
        let currHeightIndex = counters.length - 1;
        while (currHeightIndex >= 0){
            counters[currHeightIndex]++;
            if (counters[currHeightIndex] >= orderByHeightIndexPermutations[currHeightIndex].length){
                counters[currHeightIndex] = 0;
                currHeightIndex--;
            } else {
                break;
            }
        }
    }

    var i, hi;
    for (i = 0; i < totalCountPermutations; i++){
        const orderingPermutation = orderByHeightIndexPermutations.map(function(){ return []; });
        for (hi = 0; hi < orderByHeightIndexPermutations.length; hi++){
            orderingPermutation[hi] = orderByHeightIndexPermutations[hi][counters[hi]];
        }
        orderingPermutations.push(orderingPermutation);
        incrementCounters();
    }

    return orderingPermutations.map(function(orderByHeightIndex2){
        const seenOrderInIndex = {};
        orderByHeightIndex2.forEach(function(rowOfNodes){
            rowOfNodes.forEach(function(node, orderPos){
                seenOrderInIndex[node.id] = orderPos;
            });
        });
        return {
            orderByHeightIndex: orderByHeightIndex2,
            seenOrderInIndex
        };
    });
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

    const orderAssignedDebugList = [];

    function assignOrder(node){
        const { id, _drawing : { heightIndex } } = node;
        const orderAssignedInIndex = orderByHeightIndex[heightIndex].length;
        seenOrderInIndex[id] = orderAssignedInIndex;
        orderByHeightIndex[heightIndex].push(node);
        orderAssignedDebugList.push({ 'id': node.name || node.id, 'h' : heightIndex, 'o' : orderAssignedInIndex });
        //console.log("DIRECT", direction, stack, id, heightIndex, orderAssignedInIndex, q.map(function(item){ return item.id; }));
    }

    const seenOrderInIndex = {};
    const seenIndvs = [];
    // eslint-disable-next-line no-constant-condition
    while (true){
        while (q.length){
            const node = q.pop();
            const {
                id,
                _drawing : { heightIndex },
                _maritalRelationships = [],
                _parentalRelationship = null,
                children = [],
                partners = []
            } = node;

            if (typeof seenOrderInIndex[id] !== "undefined") continue;

            assignOrder(node);

            if (isRelationship(node)){
                if (direction === "parents" && partners){
                    partners.forEach(addToQ);
                } else if (direction === "children" && children){
                    children.forEach(addToQ);
                }
            } else {
                seenIndvs.push(node);
                if (direction === "parents" && _parentalRelationship){
                    addToQ(_parentalRelationship);
                } else if (direction === "children" && _maritalRelationships){
                    _maritalRelationships.forEach(addToQ);
                }
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

    //console.log("ORDER ASSIGNMENTS", direction, stack, orderAssignedDebugList, startIndividuals);

    return { orderByHeightIndex, seenOrderInIndex };
}

function countNodesInBetween(order, fromNode, toNode){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    const { _drawing : { heightIndex } } = fromNode;
    const orderFrom = seenOrderInIndex[fromNode.id];
    const orderTo = seenOrderInIndex[toNode.id];
    let num = 0;
    const begin = Math.min(orderFrom, orderTo) + 1;
    const end = Math.max(orderFrom, orderTo) - 1;
    for (let ord = begin; ord <= end; ord++){
        const node = orderByHeightIndex[heightIndex][ord];
        num += 2; // A node in between - count twice
        if (isRelationship(node)){
            node.partners.forEach(function(partner){
                if (partner._drawing.heightIndex !== heightIndex){
                    // Line going up - count add'l intersection
                    num++;
                    return;
                }
                const partnerOrder = seenOrderInIndex[partner.id];
                if (partnerOrder === orderFrom){
                    return; // Is self
                }
                if (partnerOrder < (begin - 1) || partnerOrder > (end + 1)){
                    num++;
                }
            });
            continue;
        }
        if (node._parentalRelationship){
            if (node._parentalRelationship.children.indexOf(fromNode) > -1 && node._parentalRelationship.children.indexOf(toNode) > -1){
                continue;
            }
            num++;
            const parentOrder = seenOrderInIndex[node._parentalRelationship.id];
            if (parentOrder >= (begin - 1) || parentOrder <= (end + 1)){
                num++;
                continue;
            }
        }
    }
    return num;
}

function countEdgeCrossingInstance(order, fromNode, toNode){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    const orderTo = seenOrderInIndex[toNode.id];
    const hiFrom = fromNode._drawing.heightIndex;
    const hiTo = toNode._drawing.heightIndex;

    let crossings = 0;

    if (hiFrom === hiTo){
        //crossings += (Math.abs(orderFrom - orderTo) - 1) * 2;
        crossings += countNodesInBetween(order, fromNode, toNode);
        return crossings;
    }

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

    const seenFrom = {};

    orderByHeightIndex.forEach(function(nodesInRow, hi){ // going up
        nodesInRow.forEach(function(node){ // left to right
            const { id, partners, children, _maritalRelationships, _parentalRelationship } = node;
            if (!seenFrom[id]) seenFrom[id] = new Set();
            if (isRelationship(node)) {
                partners.forEach(function(indv){
                    if (seenFrom[indv.id] && seenFrom[indv.id].has(id)) {
                        return;
                    }
                    crossings += countEdgeCrossingInstance(order, node, indv);
                    seenFrom[id].add(indv.id);
                });
                children.forEach(function(indv){
                    if (seenFrom[indv.id] && seenFrom[indv.id].has(id)) {
                        return;
                    }
                    crossings += countEdgeCrossingInstance(order, node, indv);
                    seenFrom[id].add(indv.id);
                });
            } else {
                _maritalRelationships.forEach(function(mr){
                    if (seenFrom[mr.id] && seenFrom[mr.id].has(id)) {
                        return;
                    }
                    crossings += countEdgeCrossingInstance(order, node, mr);
                    seenFrom[id].add(mr.id);
                });
                if (_parentalRelationship && (!seenFrom[_parentalRelationship.id] || !seenFrom[_parentalRelationship.id].has(id))){
                    crossings += countEdgeCrossingInstance(order, node, _parentalRelationship);
                    seenFrom[id].add(_parentalRelationship.id);
                    //(_parentalRelationship.children || []).forEach(function(sibling){
                    //    crossings += countEdgeCrossingInstance(order, node, sibling);
                    //});
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


export function orderObjectGraph(objectGraph, memoized = {}){
    //const parentlessIndividuals     = (memoized.getParentlessIndividuals || getParentlessIndividuals)(objectGraph);
    const leafChildren              = (memoized.getChildlessIndividuals || getChildlessIndividuals)(objectGraph);
    //const parentlessPartners        = (memoized.getParentlessPartners || getParentlessPartners)(objectGraph, memoized);
    //const leafSiblings              = (memoized.getChildlessSiblings || getChildlessSiblings)(objectGraph, memoized);
    //const relationships             = (memoized.getRelationships || getRelationships)(objectGraph);
    const rootPermutations          = computePossibleParentlessPermutations(objectGraph, memoized);
    const leafPermutations          = computePossibleChildlessPermutations(objectGraph, memoized);

    let bestOrder = null;
    let bestCrossings = Infinity;
    let i;

    //const orderingInitial = initOrderingSimple(objectGraph, memoized);
    //const orderingPermutations = createOrderingPermutations(orderingInitial);
    //const orderingPermutationsLen = orderingPermutations.length;


    console.log(
        'PERMUTATIONS',
        leafPermutations, leafChildren,
        rootPermutations,
        //orderingInitial,
        //orderingPermutations
    );

    function checkCrossings(order){
        const edgeCrossings = countEdgeCrossings(objectGraph, order, memoized);
        //console.log("ORDER", order, edgeCrossings);
        if (edgeCrossings < bestCrossings){
            bestOrder = order;//copyOrder(order, objectGraph, memoized);
            bestCrossings = edgeCrossings;
        }
    }

    //for (i = 0; i < orderingPermutationsLen; i++){
    //    checkCrossings(orderingPermutations[i]);
    //    if (bestCrossings === 0) break;
    //}

    for (i = 0; i < rootPermutations.length; i++){
        const orderBFS = initOrdering(objectGraph, rootPermutations[i], "children", false);
        checkCrossings(orderBFS);
        if (bestCrossings === 0) break;
        const orderDFS = initOrdering(objectGraph, rootPermutations[i], "children", true);
        checkCrossings(orderDFS);
        if (bestCrossings === 0) break;
    }

    if (bestCrossings !== 0){
        for (i = 0; i < leafPermutations.length; i++){
            const orderBFS = initOrdering(objectGraph, leafPermutations[i], "parents", false);
            checkCrossings(orderBFS);
            if (bestCrossings === 0) break;
            const orderDFS = initOrdering(objectGraph, leafPermutations[i], "parents", true);
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

    return bestOrder;
}


/** Needs work **/
export function positionObjectGraph(objectGraph, order, dims, memoized = {}){
    const { orderByHeightIndex, seenOrderInIndex } = order;
    const graphHeight = (memoized.getGraphHeight || getGraphHeight)(orderByHeightIndex, dims);
    //const relationships = (memoized.getRelationships || getRelationships)(objectGraph);
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
        //const seenPRs = (skipPRs && Object.assign({}, skipPRs)) || {};
        while (q.length){
            const child = q.shift();
            const { id, _drawing, _parentalRelationship, children } = child;
            if (seen[id]) continue;
            seen[id] = true;
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
                console.log('DDD2', name, relativeMidpoint, currNode);
            } else {

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
                    if (_drawing.xCoord < childrenMedian){
                        console.log("MOVING RELATIONSHIP", currNode, "TO", childrenMedian);
                        // Move left partner up also if no other assigned relationships at same height indx

                        // Maybe wrap in this if needed later..
                        //if (!prevNode._parentalRelationship) { }

                        let isPartner = false;
                        let otherAssignedCount = 0;
                        for (var i = 0; i < prevNode._maritalRelationships.length; i++){
                            if (prevNode._maritalRelationships[i] === currNode) {
                                isPartner = true;
                            } else if (typeof prevNode._maritalRelationships[i]._drawing.xCoord === 'number' && prevNode._maritalRelationships[i]._drawing.heightIndex === hi) {
                                otherAssignedCount++;
                                break;
                            }
                        }
                        if (isPartner && otherAssignedCount === 0){
                            const diff = childrenMedian - _drawing.xCoord;
                            console.log("MOVING RELATIONSHIP PARTNER", prevNode, "BY", diff);
                            prevNode._drawing.xCoord += diff;
                        }
                        _drawing.xCoord = childrenMedian;
                    } else {
                        // Move children up
                        const diff = _drawing.xCoord - childrenMedian;
                        console.log("SLIDING CHILDREN OF", currNode, "BY", diff);
                        slideChildren(children, diff, null, null);
                    }
                }

                console.log('DDD3', name, _drawing.xCoord, offsetFromPrevNode, prevNode);
            }

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
