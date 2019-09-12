/**
 * @module
 * A collection of functions meant to transform list of Individuals or similar data into a
 * standardized list of pedigree individuals and then a graph
 */


/**
 * Performs the following:
 * - Change all `mother` & `father` single values into list of `parents`.
 * - Make sure `parents` & `children` (both arrays) exist and are bidirectional.
 * - Convert all ids to strings if not already.
 * - Shift proband to start of list (if not already there).
 */
export function standardizeObjectsInList(jsonList){

    const idObjMap = {};

    // Clone each object into a new one before proceeding to avoid changing props in place.
    // New list, also.
    let nextList = jsonList.map(function(indv){
        const nextIndv = Object.assign({}, indv);
        const indvKeys = Object.keys(nextIndv);
        // Clone lists to avoid modifying passed props in place.
        // Can skip Objects (only extraneous `data` should possibly exist)
        indvKeys.forEach(function(k){
            if (Array.isArray(nextIndv[k])){
                nextIndv[k] = nextIndv[k].slice(0);
            }
        });

        idObjMap[indv.id] = nextIndv;
        return nextIndv;
    });

    // Standardize ids to strings if not already.
    // Standardize gender/sex to "gender" as key & one of "male", "female", "undetermined" as value.
    nextList.forEach(function(indv){
        indv.id = indv.id.toString();
        // Ensure we store strings instd of numbers for type-safety.
        indv.parents = (indv.parents || []).map(function(parentID){
            return parentID.toString();
        });
        indv.children = (indv.children || []).map(function(childID){
            return childID.toString();
        });

        indv.gender = individualGender(indv);
        delete indv.sex;
        const probandVal = !!(indv.isProband || indv.proband || indv.is_proband);
        delete indv.proband;
        delete indv.isProband; // Leave as undefined for remaining Individuals
        indv.isProband = probandVal || false;
    });


    /**
     * Ensure all ids are of type string,
     * reduce into only parents[] and children[].
     */
    function standardizeFamilialIdentifiers(listOfIndividuals){

        // Merge father and mother to 'parents'
        listOfIndividuals.forEach(function(indv){
            if (indv.father){
                indv.father = indv.father.toString();
                if (indv.parents.indexOf(indv.father) === -1){
                    indv.parents.push(indv.father);
                }
            }
            delete indv.father;
            if (indv.mother){
                indv.mother = indv.mother.toString();
                if (indv.parents.indexOf(indv.mother) === -1){
                    indv.parents.push(indv.mother);
                }
            }
            delete indv.mother;
        });

        listOfIndividuals.forEach(function(indv){
            const { id: indvID } = indv;
            const { parents = [], children = [] } = indv;
            parents.forEach(function(parentID){
                const parentIndv = idObjMap[parentID];
                parentIndv.children = (parentIndv.children && parentIndv.children.slice(0)) || [];
                if (parentIndv.children.indexOf(indvID) > -1){
                    return;
                }
                parentIndv.children.push(indvID);
            });
            children.forEach(function(childID){
                const childIndv = idObjMap[childID];
                childIndv.parents = (childIndv.parents && childIndv.parents.slice(0)) || [];
                if (childIndv.parents.indexOf(indvID) > -1){
                    return;
                }
                childIndv.parents.push(indvID);
            });
        });
        return listOfIndividuals;
    }


    nextList = standardizeFamilialIdentifiers(nextList);

    // Ensure proband is at start of list.
    const [ proband, probandIndex ] = findProband(nextList, true);
    if (proband){ // Ensure is at start of list
        if (probandIndex !== 0){
            nextList.splice(probandIndex, 1);
            nextList.unshift(proband);
        }
    } else {
        console.error("No explicit proband found, assuming first item in list is proband.");
    }

    // Empty/default/falsy values for non-present keys/values
    nextList.forEach(function(indv){
        // @todo validate that all are of type string, etc.
        indv.diseases = indv.diseases || [];
        indv.diseases.forEach(function(diseaseStr){
            if (typeof diseaseStr !== 'string') {
                throw new Error("Validation - individual has non-string diseases value - " + indv.id);
            }
            // todo check for duplicates
        });
        indv.carrierOfDiseases = indv.carrierOfDiseases || [];
        indv.carrierOfDiseases.forEach(function(diseaseStr){
            if (typeof diseaseStr !== 'string') {
                throw new Error("Validation - individual has non-string carrierOfDiseases value - " + indv.id);
            }
            if (indv.diseases.indexOf(diseaseStr) > -1){
                const msg = "Validation - indvidual has same disease in carrierOfDiseases as diseases - " + indv.id;
                throw new Error(msg);
                //console.warn(msg);
                // todo remove from carrierOfDiseases.
                // todo check for duplicates
            }
        });
        indv.asymptoticDiseases = indv.asymptoticDiseases || [];
        indv.asymptoticDiseases.forEach(function(diseaseStr){
            if (typeof diseaseStr !== 'string') {
                throw new Error("Validation - individual has non-string asymptoticDiseases value");
            }
            if (indv.diseases.indexOf(diseaseStr) > -1){
                const msg = "Validation - indvidual has same disease in asymptoticDiseases as diseases - " + indv.id;
                throw new Error(msg);
                //console.warn(msg);
                // todo remove from asymptoticDiseases.
                // todo check for duplicates
            }
        });

        indv.age = indv.age || indv.ageNumber;
        indv.ageText = indv.ageText || (typeof indv.age === 'number' ? (indv.age + " years") : null);

        indv.isConsultand = indv.isConsultand || false;
        indv.isStillBirth = indv.isStillBirth || false;
        indv.isSpontaneousAbortion = indv.isSpontaneousAbortion || false;
        indv.isTerminatedPregnancy = indv.isTerminatedPregnancy || false;
        indv.isEctopic = indv.isEctopic || false;

        indv.isDeceased = indv.isDeceased || indv.isTerminatedPregnancy || indv.isSpontaneousAbortion || indv.isStillBirth || indv.isEctopic || false;
        indv.isPregnancy = indv.isPregnancy || indv.isTerminatedPregnancy || indv.isSpontaneousAbortion || indv.isStillBirth || indv.isEctopic || false;

        indv.data = indv.data || {};
    });

    return nextList;
}

export function sortByAge(indvA, indvB){
    return 0 - ((indvA.age || 0) - (indvB.age || 0));
}

export function sortByGender(indvA, indvB){
    const { gender: gA } = indvA;
    const { gender: gB } = indvB;
    if (gA === gB) return 0;
    // Male comes first
    if (gA === 'male' && gB !== 'male') return -1;
    if (gA !== 'male' && gB === 'male') return 1;
    // Undetermined comes last
    if (gA === 'undetermined' && gB !== 'undetermined') return 1;
    if (gA !== 'undetermined' && gB === 'undetermined') return -1;
    return 0;
}

export function individualGender(individual){
    let gender = individual.gender || individual.sex;
    gender = typeof gender === 'string' && gender.toLowerCase();
    const maleGenders = { 'm' : 1, 'male' : 1 };
    const femaleGenders = { 'f' : 1, 'female' : 1 };
    if (gender && maleGenders[gender]){
        return "male";
    } else if (gender && femaleGenders[gender]){
        return "female";
    } else {
        return "undetermined";
    }
}


export function findProband(jsonList, includeIndex = false){
    const len = jsonList.length;
    let currItem = null;
    let currIndex = 0;
    for (currIndex = 0; currIndex < len; currIndex++){ // Exit condition vs while loop
        currItem = jsonList[currIndex];
        if (currItem.proband === true || currItem.isProband === true){
            if (includeIndex){
                return [ currItem, currIndex ];
            }
            return currItem;
        }
    }
    if (includeIndex){
        return [ null, -1 ];
    }
    return null;
}

export function findNodeWithId(objectGraph, id){
    let i;
    let j;
    let currIndv;
    const len = objectGraph.length;
    for (i = 0; i < len; i++){
        currIndv = objectGraph[i];
        if (currIndv.id === id){
            return currIndv;
        }
        if (currIndv._parentalRelationship){
            if (currIndv._parentalRelationship.id === id){
                return currIndv._parentalRelationship;
            }
        }
        if (currIndv._maritalRelationships.length > 0){
            for (j = 0; j < currIndv._maritalRelationships.length; j++){
                if (currIndv._maritalRelationships[j].id === id){
                    return currIndv._maritalRelationships[j];
                }
            }
        }
    }
    return null;
}

export function isRelationship(node){
    const { partners, children, _maritalRelationships, _parentalRelationship } = node;
    if (!_maritalRelationships && !_parentalRelationship && (Array.isArray(partners) || Array.isArray(children))) {
        return true;
    }
    return false;
}

/**
 * Assumes a perfectly correct bidirectional graph/tree with all related IDs present.
 * First item in `jsonList` param assumed to be the proband.
 * Re-orders list to be proband-centric.
 * Maybe in future support 'limbs' to non-present relative(s)?
 *
 * @param {{ id: string, children: string[], parents: string[] }[]} jsonList List of individuals to connect.
 */
export function createObjectGraph(jsonList, filterUnrelatedIndividuals = false){
    const individualsLength = jsonList.length;
    const idObjMap = {};
    const resultList = [];

    const remainingIndividuals = new Set(jsonList.map(function(indvidual){
        const { id } = indvidual;
        // Using number isn't advisable as JS obj key (gets converted to str anyway) but is likely..
        if (typeof id !== 'string' && typeof id !== 'number'){
            throw new Error("Must be of type string or number.");
        }
        if (idObjMap[id]){
            throw new Error("ID already encountered - " + id);
        }
        // Clone new references, save to idObjMap for faster lookups.
        idObjMap[id] = Object.assign({}, indvidual);
        return idObjMap[id];
    }));

    function getNextRemainingIndividual(){
        for (let i = 0; i < individualsLength; i++){
            const { id } = jsonList[i];
            const individual = idObjMap[id];
            if (remainingIndividuals.has(individual)){
                return individual;
            }
        }
        return null;
    }


    const currIndvQ = [];
    let disconnectedIndividuals = null;
    let counter = 0;

    while (remainingIndividuals.size > 0){
        // Start with proband (first item in list)
        // or first remaining item after proband b added.
        currIndvQ.push(getNextRemainingIndividual());
        if (counter > 100) {
            throw new Error("Found 100+ disconnected-from-proband individuals. Exiting.");
        }
        if (counter > 0) {
            disconnectedIndividuals = [...remainingIndividuals];
            if (filterUnrelatedIndividuals){
                // Remove/note any unattached-to-proband-items & exit.
                console.error("Found " + disconnectedIndividuals.length + " disconnected-from-proband individuals.", disconnectedIndividuals);
                break;
            }
        }
        counter++;
        while (currIndvQ.length > 0){
            const individual = currIndvQ.shift();

            // Already seen/added
            if (!remainingIndividuals.has(individual)){
                continue;
            }
            remainingIndividuals.delete(individual);

            const { parents: parentIDs = [], children: childIDs = [] } = individual;

            individual._parentReferences = [];
            parentIDs.forEach(function(parentID){
                const parentObj = idObjMap[parentID];
                if (!parentObj){
                    throw new Error("Parent with ID \"" + parentID + "\" not found on individual \"" + id + "\".");
                }
                individual._parentReferences.push(parentObj);
                currIndvQ.unshift(parentObj);
            });

            individual._childReferences = [];
            childIDs.forEach(function(childID){
                const childObj = idObjMap[childID];
                if (!childObj){
                    throw new Error("Child with ID \"" + childID + "\" not found on individual \"" + id + "\".");
                }
                individual._childReferences.push(childObj);
                currIndvQ.push(childObj);
            });


            // Add to return list in order encountered when tracing from proband.
            resultList.push(individual);
        }

        console.log("RESULT B", resultList, jsonList, disconnectedIndividuals);
    }

    return {
        objectGraph: resultList,
        disconnectedIndividuals,
        connectedGroupCount: counter
    };
}


/** TODO: enforce 2 parents _or_ handle 3+ parents */
export function createRelationships(objectGraph, sepVal = '\t'){
    const idMap = {};
    const childToParentsMap = {};
    const parentRelationships = new Set();
    objectGraph.forEach(function(individual){
        const { _parentReferences = [], id } = individual;
        idMap[id] = individual;

        if (_parentReferences.length === 1){
            const errorMsg = "Expected 2(+) parents for individual " + id;
            //throw new Error(errorMsg);
            console.error(errorMsg);
        }

        individual._maritalRelationships = [];
        individual._parentalRelationship = null;

        if (_parentReferences.length === 0) {
            return;
        }

        childToParentsMap[id] = _parentReferences;
    });
    const childrenWithParentIDs = Object.keys(childToParentsMap);
    childrenWithParentIDs.forEach(function(childID){
        const parentIDs = childToParentsMap[childID].map(function(parent){
            return parent.id;
        });
        parentIDs.sort();
        const parentIDString = parentIDs.join(sepVal);
        parentRelationships.add(parentIDString);
    });

    const relationshipObjects = [...parentRelationships].map(function(prStr){
        const parentIDs = prStr.split(sepVal);
        const parents = parentIDs.map(function(pID){ return idMap[pID]; });
        const childrenSet = new Set();
        const [ parent1, ...otherParents ] = parents;
        (parent1._childReferences || []).forEach(function(child){
            childrenSet.add(child.id);
        });
        otherParents.forEach(function(parent){
            const childIDs = {};
            (parent._childReferences || []).forEach(function(c){
                childIDs[c.id] = true;
            });
            for (const childID of childrenSet){
                if (!childIDs[childID]) {
                    childrenSet.delete(childID);
                }
            }
        });

        const partners = parents.slice(0);
        partners.sort(sortByGender);
        const children = [...childrenSet].map(function(childID){ return idMap[childID]; });
        children.sort(sortByAge);

        // Will assign `_drawing` in subsequent functions
        return {
            partners,
            children,
            'id' : "relationship:" + parents.map(function(indv){ return indv.id; }).join(',')
        };
    });

    relationshipObjects.forEach(function(relationshipObject){
        relationshipObject.partners.forEach(function(p){
            //p._drawing = p._drawing || {};
            p._maritalRelationships.push(relationshipObject);
        });
        relationshipObject.children.forEach(function(c){
            //c._drawing = c._drawing || {};
            c._parentalRelationship = relationshipObject;
        });
    });

    return relationshipObjects;
}


export function getRelationships(objectGraph){
    const set = [];
    const seen = {};
    objectGraph.forEach(function(indv){
        if (indv._parentalRelationship){
            if (!seen[indv._parentalRelationship.id]){
                seen[indv._parentalRelationship.id] = true;
                set.push(indv._parentalRelationship);
            }
        }
        if (indv._maritalRelationships.length > 0){
            indv._maritalRelationships.forEach(function(mr){
                if (!seen[mr.id]){
                    seen[mr.id] = true;
                    set.push(mr);
                }
            });
        }
    });
    return set;
}