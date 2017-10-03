'use strict';

import _ from 'underscore';
import { console } from './../../util';



/**
 * Type definition for Step input/output argument source or target object.
 * 
 * @typedef {Object} StepIOArgumentTargetOrSource
 * @property {string} type      Type of IO argument in context of this target/source, e.g. 'Input File', 'Output Processed File'. "Global" workflow file args/IOs are "Workflow Output File" or "Workflow Input File"
 * @property {string} name      Name of this IO/argument in context of this target/source (e.g. if a step, or global workflow arg).
 * @property {string} [step]    ID of the step IO/argument comes from or is going to, if not a global argument w/ type = 'Workflow Output File' or type = 'Workflow Input File'.
 */

/**
 * Type definition for a Step input/output argument.
 * 
 * @typedef {Object} StepIOArgument
 * @property {string} name                          Name of argument in context of step itself
 * @property {Object} meta                          Various properties related to the argument itself, in context of Step.
 * @property {StepIOArgumentTargetOrSource[]} [target]   List of targets for IO
 * @property {StepIOArgumentTargetOrSource[]} [source]   List of sources for IO
 */

 /**
 * Type definition for a Step.
 * 
 * @typedef {Object} Step
 * @property {string} name                          Name of step
 * @property {Object} meta                          Various properties related to the step itself.
 * @property {StepIOArgument[]} inputs              Input arguments
 * @property {StepIOArgument[]} outputs             Output arguments
 */

export function parseAnalysisSteps(analysis_steps, parsingMethod = 'output'){

    /*************
     ** Outputs **
     *************/

    var nodes = [];
    var edges = [];

    /*************
     * Temp Vars *
     *************/

    var ioIdsUsed = {  };       // Keep track of IO arg node ids used, via keys; prevent duplicates by incrementing int val.
    var processedSteps = {};    // Keep track of steps already processed & added to graph. We start drawing first step, and its inputs/outputs, then recursively draw steps that its outputs go to. At the end, we restart from step that has not yet been encountered/processed, if any.

    /***************
     ** Functions **
     ***************/

    function stepNodeID   (step) { return step.uuid || (step.meta && typeof step.meta === 'object' && step.meta['@id']) || step['@id'] || step.link_id || step.name; }
    function stepNodeName (step) { return step.display_title || step.title || step.name || step['@id']; }

    function ioNodeID(stepIOArg, readOnly = true){
        return preventDuplicateNodeID(
            stepIOArg.id /*|| (Array.isArray(stepInput.source) && stepInput.source.length > 0 && stepInput.source[0].name)*/ || stepIOArg.name,
            readOnly
        );
    }

    /**
     * Generate name for IO node based on 'global' step argument input source or output target name, if available.
     * If no global source or target (w/ 'type' === 'Workflow (Input|Output) File') available, reverts to StepIOArgument.name (name of argument in context of step itself, at time of drawing).
     * 
     * @param {StepIOArgument} stepIOArg - Input or output argument of a step.
     * @returns {string} Name of node.
     */
    function ioNodeName(stepIOArg){
        var nameToUse = stepIOArg.name || null; // Default; name of step argument from step we're drawing IO nodes currently.
        var list = null;
        if (Array.isArray(stepIOArg.target)){
            list = stepIOArg.target;
        }
        if (Array.isArray(stepIOArg.source)){
            if (list) list = list.concat(stepIOArg.source);
            else list = stepIOArg.source;
        }
        if (!list) return nameToUse;
        var i, listLength = list.length;
        for (i = 0; i < listLength; i++){
            if (list[i] && (list[i].type === 'Workflow Output File' || list[i].type === 'Workflow Input File') && typeof list[i].name === 'string'){
                nameToUse = list[i].name;
                break;
            }
        }
        return nameToUse;
    }

    /**
     * Pass a should-be-unique ID through this function to check if same ID exists already.
     * If so, returns a copy of ID with '~' + increment appended to it.
     * 
     * @param {string} id - ID to make sure is unique. 
     * @param {boolean} [readOnly=true] If true, will NOT update increment count in cache. Use readOnly when generating nodes to match against without concretely adding them to final list of nodes (yet/ever).
     * @returns {string} Original id, if unique, or uniqueified ID.
     */
    function preventDuplicateNodeID(id, readOnly = true){
        if (typeof id !== 'string') throw new Error('param id is not a string.');
        id = id.replace(/(~\d+)/,'');
        if (readOnly) {
            return (typeof ioIdsUsed[id] === 'number' && ioIdsUsed[id] > 1 ? id + '~' + ioIdsUsed[id] : id);
        }
        if (typeof ioIdsUsed[id] === 'undefined') {
            ioIdsUsed[id] = 1;
            return id;
        }
        return id + '~' + (++ioIdsUsed[id]);
    }

    function compareTwoFilesByUUID(file1, file2){
        if (typeof file1 === 'string' && typeof file2 === 'string' && file1 === file2){
            return true;
        }
        if (typeof file1 === 'object' && typeof file2 === 'object' && (file1.uuid || 'a') === (file2.uuid || 'b')){
            return true;
        }
        if (typeof file1 === 'object' && typeof file2 === 'string' && (file1.uuid || 'a') === file2){
            return true;
        }
        if (typeof file1 === 'string' && typeof file2 === 'object' && file1 === (file2.uuid || 'b')){
            return true;
        }
        return false;
    }

    function checkNodeFileForMatch(n, file){
        return (n.meta && n.meta.run_data && n.meta.run_data.file &&
                file &&
                compareTwoFilesByUUID(file, n.meta.run_data.file));
    }


    function generateStepNode(step, column){
        return {
            id : stepNodeID(step),
            type : 'step',
            name : stepNodeName(step),
            meta : _.extend(
                {},
                step.meta || {},
                _.omit(step, 'inputs', 'outputs', 'meta'),
            ),
            column : column
        };
    }

    function generateInputNode(stepInput, column, inputOfNode, readOnly = true){
        var namesOnSteps = {};
        namesOnSteps[inputOfNode.id] = stepInput.name;
        return {
            column       : column,
            format       : (Array.isArray(stepInput.source) && stepInput.source.length > 0 && stepInput.source[0].type) || null, // First source type takes priority
            id           : ioNodeID(stepInput, readOnly),
            name         : ioNodeName(stepInput),// stepInput.name, 
            argNamesOnSteps : namesOnSteps,
            type         : 'input',
            inputOf      : [inputOfNode],
            meta         : _.extend({}, stepInput.meta || {}, _.omit(stepInput, 'required', 'name', 'meta')),
            required     : stepInput.required || false,
        };
    }

    function generateOutputNode(stepOutput, column, outputOfNode, readOnly = true){
        var namesOnSteps = {};
        namesOnSteps[outputOfNode.id] = stepOutput.name;
        return {
            column       : column,
            format       : (Array.isArray(stepOutput.target) && stepOutput.target.length > 0 && stepOutput.target[0].type) || null,
            id           : ioNodeID(stepOutput, readOnly),
            name         : ioNodeName(stepOutput),
            argNamesOnSteps : namesOnSteps,
            type         : 'output',
            meta         : _.extend({}, stepOutput.meta || {}, _.omit(stepOutput, 'required', 'name', 'meta')),
            outputOf     : outputOfNode
        };
    }

    /**
     * Generate multiple nodes from one step input or output.
     * Checks to see if WorkflowRun (via presence of run_data object in step input/output), and if multiple files exist in run_data.file, 
     * will generate that many nodes.
     *
     * @returns {Object[]} List of expanded I/O nodes.
     */
    function expandIONodes(stepInput, column, inputOfNode, inputOrOutput, readOnly){

        var nodeGenerateFxn = inputOrOutput === 'output' ? generateOutputNode : generateInputNode;

        if (typeof stepInput.run_data === 'undefined' || !Array.isArray(stepInput.run_data.file) || stepInput.run_data.file.length === 0) { // Not valid WorkflowRun
            return [nodeGenerateFxn(stepInput, column, inputOfNode, readOnly)];
        }

        function expandFilesToIndividualNodes(files){
            return _.map(files, function(file, idx){
                if (Array.isArray(file)){
                    idx = file[0];
                    file = file[1];
                }
                var stepInputAdjusted = _.extend({}, stepInput, {
                    'name'  : ioNodeName(stepInput),
                    'id'    : ioNodeName(stepInput) + '.' + (file.accession || file.uuid || idx),
                    'run_data' : _.extend({}, stepInput.run_data, {
                        'file' : file,
                        'meta' : (stepInput.run_data.meta && stepInput.run_data.meta[idx]) || null
                    })
                });
                return nodeGenerateFxn(stepInputAdjusted, column, inputOfNode, readOnly);
            });
        }

        var files = stepInput.run_data.file;
        var groupTypeToCheck = inputOrOutput === 'output' ? 'Output File Group' : 'Input File Group';
        var groupSources = _.filter(stepInput.source || [], function(s){
            return (s.type === groupTypeToCheck && typeof s.for_file === 'string');
        });

        if (groupSources.length > 0){

            var groups = _.reduce(groupSources, function(m,v){
                if (typeof m[v.grouped_by] === 'undefined'){
                    m[v.grouped_by] = {};
                }
                if (typeof m[v.grouped_by][v[v.grouped_by]] === 'undefined'){
                    m[v.grouped_by][v[v.grouped_by]] = new Set();
                }
                m[v.grouped_by][v[v.grouped_by]].add(v.for_file) ;
                return m;
            }, {});

            var groupKeys = _.keys(groups);
            var filesNotInGroups = [];
            var filesByGroup = _.reduce(stepInput.run_data.file, function(m, file, idx){
                var incl = false;
                _.forEach(groupKeys, function(groupingTypeKey){
                    _.forEach(_.keys(groups[groupingTypeKey]), function(group){
                        if (groups[groupingTypeKey][group].has(file.uuid || file)){
                            if (typeof m[groupingTypeKey] === 'undefined'){
                                m[groupingTypeKey] = {};
                            }
                            if (typeof m[groupingTypeKey][group] === 'undefined'){
                                m[groupingTypeKey][group] = new Set();
                            }
                            m[groupingTypeKey][group].add(file);
                            incl = true;
                        }
                    });
                    
                });
                if (!incl) {
                    filesNotInGroups.push([idx, file]);
                }
                return m;

            }, {}); // Returns e.g. { 'workflow' : { '/someWorkflow/@id/' : Set([ { ..file.. },{ ..file.. },{ ..file.. }  ]) } }

            // Should only be one groupingName for now.
            var groupingName = 'workflow';
            var groupNodes = _.reduce(_.pairs(filesByGroup[groupingName]), function(m, wfPair, i){
                var namesOnSteps = {};
                namesOnSteps[inputOfNode.id] = stepInput.name;
                var groupNode = {
                    column      : column,
                    format      : groupTypeToCheck,
                    id          : ioNodeName(stepInput)+ '.group:' + groupingName + '.' + wfPair[0],
                    name        : ioNodeName(stepInput),
                    argNamesOnSteps : namesOnSteps,
                    type        : inputOrOutput + '-group',
                    meta        : _.extend({}, stepInput.meta || {}, _.omit(stepInput, 'required', 'name', 'meta')),
                    inputOf     : [inputOfNode]
                };
                groupNode.meta[groupingName] = wfPair[0];
                m.push(groupNode);
                return m;
            },[]);

            return expandFilesToIndividualNodes(filesNotInGroups).concat(groupNodes);
        }

        return expandFilesToIndividualNodes(files);
        
    }

    /**
     * Generate output nodes from step.outputs and create edges between them and stepNode.
     * 
     * @param {Object} step - Analysis Step
     * @param {number} column - Column index (later translated into X coordinate).
     * @param {Object} stepNode - Analysis Step Node Reference
     */
    function generateOutputNodesSimple(step, column, stepNode){

        var outputNodesToCreate = _.flatten(step.outputs.map(function(stepOutput, j){
            return expandIONodes(stepOutput, column, stepNode, "output", false);
        }), true);

        // Find __ INPUT __ nodes with same file (checks OUTPUT as well, there just shouldn't be any unless a unique file comes out of 2+ steps)
        // if any exist, replace them, re-use instead of adding new, and make edge.
        // also... : move node down in column list somehow
        var existingMatchedNodes = [];
        var newOutputNodes = _.filter(outputNodesToCreate, function(oN){
            for (var i = 0; i < nodes.length; i++){
                if (nodes[i] && nodes[i].meta && nodes[i].meta.run_data && nodes[i].meta.run_data.file){
                    if (checkNodeFileForMatch(oN, nodes[i].meta.run_data.file)){
                        nodes[i].outputOf = stepNode;
                        
                        nodes[i].format = oN.format;
                        //nodes[i].name = oN.name || nodes[i].name; //ioNodeNameCombo(nodes[i], oN);
                        nodes[i].type = 'output'; // Convert our found input file to an output file, if not already.
                        if (nodes[i].meta && oN.meta && oN.meta.argument_type){
                            nodes[i].meta.argument_type = oN.meta.argument_type;
                        }
                        nodes[i].wasMatchedAsOutputOf = stepNode.id; // For debugging.
                        edges.push({
                            'source' : stepNode,
                            'target' : nodes[i],
                            'capacity' : 'Output',
                        });
                        existingMatchedNodes.push(nodes[i]);
                        return false;
                    }
                }
            }
            return true;
        });

        stepNode.outputNodes = _.sortBy(existingMatchedNodes.concat(newOutputNodes), 'id');
        
        newOutputNodes.forEach(function(n){
            edges.push({
                'source' : stepNode,
                'target' : n,
                'capacity' : 'Output',
            });
        });

        nodes = nodes.concat(newOutputNodes);
        return newOutputNodes;
    }

    

    

    /**
     * Find existing or generate new input nodes for each input in step.inputs and
     * create edges between them and stepNode.
     * 
     * @param {Step} step - Analysis Step
     * @param {number} column - Column index (later translated into X coordinate).
     * @param {Object} stepNode - Analysis Step Node Reference
     * @returns {Object} Object containing two lists - 'created' and 'matched' - containing nodes which were newly created and matched & re-used, respectively, for this step's input arguments.
     */
    function generateInputNodesComplex(step, column, stepNode){
        var inputNodesMatched = [];
        var inputNodesCreated = [];

        step.inputs.forEach(function(fullStepInput){
            if (!Array.isArray(fullStepInput.source)) return;

            var inputNodes = []; // All input nodes matched to step input will be in here, e.g. to draw edges from to step.

            // Step 1. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var inputNodesToMatch = expandIONodes(fullStepInput, column, stepNode, "input", true);
            //console.log('NEED TO MATCH for' + fullStepInput.name, inputNodesToMatch);
            var nodesNamesMatched = {  };

            var currentInputNodesMatched = (
                _.filter(nodes /*allRelatedIONodes*/, function(n){
                    
                    // Skip any step nodes
                    if (n.type === 'step') return false;

                    // Compare IO nodes against step input arg sources
                    if (_.find(fullStepInput.source, function(s){
                        
                        // Match node by source step name === node.outputOf (stepNode); source.step is normally step.name but may be ID as well.
                        if (s.step && n.argNamesOnSteps[s.step] === s.name && n.outputOf && (s.step === n.outputOf.id || s.step === n.outputOf.name)) return true; // Case: existing node is output node of our step.input.source.step
                        // Match node by current step === node.inputOf (stepNode)
                        if (s.step && n.argNamesOnSteps[s.step] === s.name && Array.isArray(n.inputOf) && _.any(n.inputOf, function(nIO){ return stepNode.id === nIO.id; })) return true; // Case: existing node is already input node of current step(.input.source)

                        // Match Groups
                        if (typeof s.grouped_by === 'string' && typeof s[s.grouped_by] === 'string'){
                            if (n.meta && Array.isArray(n.meta.source) && _.any(n.meta.source, function(nS){
                                return typeof nS.grouped_by === 'string' && typeof nS[nS.grouped_by] === 'string' && nS[nS.grouped_by] === s[s.grouped_by];
                            })){ // Matched by Workflow (or other grouping type), now lets ensure it's the right group.
                                var nodeBeingCheckedGroupFiles = _.pluck(_.filter(n.meta.source, function(nS){ return typeof nS.for_file === 'string'; }), 'for_file');
                                return (s.for_file && _.contains(nodeBeingCheckedGroupFiles, s.for_file) && true) || false;
                            }
                        }

                        // Match By File
                        if (Array.isArray(s.for_file) && _.any(s.for_file, checkNodeFileForMatch.bind(checkNodeFileForMatch, n))) return true;
                        else if (s.for_file && !Array.isArray(s.for_file) && checkNodeFileForMatch(n, s.for_file)) return true;

                        // Match Output Nodes that target this step.
                        if (Array.isArray(n.meta.target) && _.find(n.meta.target, function(t){
                            if (t.step === step.name && fullStepInput.name === t.name) return true;
                            return false;
                        })) return true;
                        
                        return false;
                    })){
                        nodesNamesMatched[n.name] = ioNodeName(fullStepInput);
                        return true;
                    }

                    return false;
                })
            );

            //console.log('MATCHED', currentInputNodesMatched);

            if (currentInputNodesMatched.length > 0){
                inputNodesMatched = inputNodesMatched.concat(currentInputNodesMatched);
                inputNodes = inputNodes.concat(currentInputNodesMatched);

                // Extend each existing node `n` that we've matched with data from nodes that would've been newly created otherwise `inNode`.
                _.forEach(currentInputNodesMatched, function(n){
                    var inNodeName = nodesNamesMatched[n.name];
                    if (typeof inNodeName === 'undefined'){
                        console.warn("Didn't find new node to extend from which was previously matched against node", n);
                        return;
                    }
                    var inNodes = _.where(inputNodesToMatch, { 'name' : inNodeName });
                    if (!inNodes || inNodes.length === 0) {
                        console.warn("Didn't find new node to extend from which was previously matched against node", inNodeName, n);
                        return;
                    }
                    
                    var inNode;
                    // Sometimes we have more than 1 file per argument 'name'. So lets narrow it down.
                    if (inNodes.length === 1){
                        inNode = inNodes[0];
                    } else {
                        inNode = _.find(inNodes, function(inMore){
                            if (inMore && inMore.meta && inMore.meta.run_data && inMore.meta.run_data.file && n.meta && n.meta.run_data && n.meta.run_data.file){
                                return compareTwoFilesByUUID(n.meta.run_data.file, inMore.meta.run_data.file);
                            }
                            return false;
                        });
                    }
                    if (!inNode){
                        console.warn("Didn't find new node to extend from which was previously matched against node", inNodeName, n);
                        return;
                    }
                    var combinedMeta = _.extend(n.meta, inNode.meta);
                    _.extend(n, {
                        'inputOf' : _.sortBy( (n.inputOf || []).concat(inNode.inputOf || []), 'id'),
                        'meta' : combinedMeta,
                        'name' : ioNodeName(combinedMeta) || n.name,
                        'argNamesOnSteps' : _.extend(n.argNamesOnSteps, inNode.argNamesOnSteps),
                        'id' : preventDuplicateNodeID(inNode.id, false),
                        'wasMatchedAsInputOf' : (n.wasMatchedAsInputOf || []).concat(stepNode.id) // Used only for debugging.
                    });
                });
            }

            // Step 2. For any unmatched input nodes, create them (via adding to 'nodes' list).
            if (currentInputNodesMatched.length < inputNodesToMatch.length){
                var unmatchedInputNodes = _.map(
                    _.filter(inputNodesToMatch, function(n,idx){
                        if (typeof nodesNamesMatched[n.name] !== 'undefined') return false;
                        // Compare file, if we have them.
                        if (n.meta && n.meta.run_data && n.meta.run_data.file){
                            var fileToMatch = n.meta.run_data.file;
                            var filesToCheck = _.filter(_.map(currentInputNodesMatched, function(n2){
                                return (n2 && n2.meta && n2.meta.run_data && n2.meta.run_data.file) || null;
                            }), function(n2){ return n2 !== null; });

                            if ( _.any(filesToCheck, function(f){ return compareTwoFilesByUUID(f, fileToMatch); }) ){
                                return false;
                            }
                        }
                        return true;
                    }),
                    function(n){
                        n.id = preventDuplicateNodeID(n.id, false); // Cement ID in dupe ID cache from previously read-only 'to-check-only' value.
                        n.generatedAsInputOf = (n.generatedAsInputOf || []).concat(stepNode.id); // Add reference to stepNode to indicate how/where was drawn from. For debugging only.
                        return n;
                    }
                );
                nodes = nodes.concat(unmatchedInputNodes); // <- Add new nodes to list of all nodes.
                inputNodesCreated = inputNodesCreated.concat(unmatchedInputNodes);
                inputNodes = inputNodes.concat(unmatchedInputNodes);
                //console.log('NEW NODES CREATED', unmatchedInputNodes, unmatchedInputNodes[0].column, stepNode.column, stepNode.id);
            }

            //console.log('CREATED', inputNodesCreated);

            // Keep references to incoming nodes on our step.
            stepNode.inputNodes = _.sortBy(  inputNodesCreated.concat(inputNodesMatched)  , 'id'  );

            // Finally, attach edge to all input nodes associated to step input.
            if (inputNodes.length > 0) {
                _.forEach(inputNodes, function(n){
                    var existingEdge = _.find(edges, function(e){
                        if (e.source === n && e.target === stepNode) return true;
                    });
                    if (existingEdge) return;
                    edges.push({
                        'source' : n,
                        'target' : stepNode,
                        'capacity' : 'Input'
                    });
                });
            }

        });

        return { 'created' : inputNodesCreated, 'matched' : inputNodesMatched };
    }

    function findNextStepsFromIONode(ioNodes){

        var targetPropertyName = parsingMethod === 'output' ? 'target' : 'source';
        var nextSteps = new Set();

        ioNodes.forEach(function(n){
            if (n.meta && Array.isArray(n.meta[targetPropertyName])){
                n.meta[targetPropertyName].forEach(function(t){
                    if (typeof t.step === 'string'){
                        var matchedStep = _.find(analysis_steps, function(step){ return stepNodeID(step) === t.step; });
                        if (matchedStep) {
                            nextSteps.add(matchedStep);
                        }
                    }
                });
            }
        });

        return [...nextSteps];
    }

    /**
     * Recursive function which generates step, output, and input nodes (if input not matched to existing node),
     * starting at param 'step' and tracing path, splitting if needs to, of outputNodes->meta.target.step->outputNodes->meta.target.step->...
     * 
     * @param {Step} step - Step object representation from backend-provided list of steps.
     * @param {number} [level=0] - Step level or depth. Used for nodes' column (precursor to X axis position).
     */
    function processStepInPath(step, level = 0){
        var stepNode = generateStepNode(step, (level + 1) * 2 - 1);

        var inputNodesUsedOrCreated, outputNodesCreated;

        if (parsingMethod === 'output'){
            inputNodesUsedOrCreated = generateInputNodesComplex(
                step,                   // Step
                (level + 1) * 2 - 2,    // (Preliminary) Column
                stepNode                // Step Node
            );
            outputNodesCreated = generateOutputNodesSimple(
                step,                   // Step
                (level + 1) * 2,        // (Preliminary) Column
                stepNode                // Step Node
            );

            nodes.push(stepNode);

            processedSteps[stepNode.id] = stepNode;

            findNextStepsFromIONode(outputNodesCreated).forEach(function(nextStep){
                if (typeof processedSteps[stepNodeID(nextStep)] === 'undefined'){
                    processStepInPath(nextStep, level + 1);
                } else {
                    generateInputNodesComplex(nextStep, (level + 2) * 2 - 2, processedSteps[stepNodeID(nextStep)]);
                }
            });
        } else {

            throw Error("Input-direction drawing not currently supported.");

        }
        
        
    }

    /***********************************************************************************************
     ** Process each Analysis Step as a node. Inputs & output nodes placed in alternating column. **
     ***********************************************************************************************/

    /**
     * Process step[]->output[]->step[]->output[] graph. Start at first analysis step in array.
     * @returns {void} Nothing
     */
    function processStepIOPath(){
        if (Array.isArray(analysis_steps) && analysis_steps.length > 0){

            processStepInPath(analysis_steps[0]);

            // We should be done at this point, however there might steps which were not drawn from output path stemming from first step, so here
            // we loop up to 1000 times and repeat drawing process until no more steps are left to draw.

            for (var i = 0; i < 1000; i++){
                if (_.keys(processedSteps).length < analysis_steps.length){
                    var nextSteps = _.filter(analysis_steps, function(s){
                        if (typeof processedSteps[stepNodeID(s)] === 'undefined') return true;
                        return false;
                    });
                    if (nextSteps.length > 0) processStepInPath(nextSteps[0]);
                } else {
                    break;
                }

            }

        }
        
    }


    /*********************
     **** Entry Point ****
     *********************/
    
    processStepIOPath();

    return correctColumnAssignments({ nodes, edges });

}

/**
 * Use this function to run another function on each node recursively along a path of nodes.
 * See how is used in function correctColumnAssignments.
 * TODO: Create typedef for node Object.
 * 
 * @export
 * @param {Object}   nextNode               - Current node in path on which fxn is ran on.
 * @param {function} fxn                    - Function to be ran on each node. Is passed a {Object} 'node', {Object} 'previousNode', and {Object[]} 'nextNodes' positional arguments. previousNode will be null when fxn is executed for first time, unless passed in initially.
 * @param {string}   [direction='output']   - One of 'output' or 'input'. Which direction to traverse.
 * @param {any}      [lastNode=null]        - Optionally supply the initial 'last node' to be included.
 * @param {number}   [depth=0]              - Internal recursion depth.
 * @returns {Array} Unflattened list of function results.
 */
export function traceNodePathAndRun(nextNode, fxn, direction = 'output', lastNode = null, depth = 0){
    if (typeof fxn !== 'function') return null;
    var nextNodes = (
        direction === 'output' ? (
            Array.isArray(nextNode.outputNodes) ? nextNode.outputNodes :
                Array.isArray(nextNode.inputOf) ? nextNode.inputOf :
                    []
        ) : direction === 'input' ? (
            Array.isArray(nextNode.inputNodes) ? nextNode.inputNodes :
                nextNode.outputOf ? [nextNode.outputOf] :
                    []
        ) : []
    );
    var fxnResult = fxn(nextNode, lastNode, nextNodes);
    if (depth > 1000){
        console.error("Reached max depth (1000) at node ", nextNode);
        return [fxnResult, null];
    }
    var nextResults = _.map(nextNodes, function(n){ return traceNodePathAndRun(n, fxn, direction, nextNode, depth + 1); });
    return [fxnResult, nextResults];
}


export function correctColumnAssignments(graphData){
    var { nodes, edges } = graphData;

    var colCorrectFxn = function(node, lastNode, nextNodes){
        if (typeof node.column !== 'number' || typeof lastNode.column !== 'number'){
            console.error('No column number on one of theses nodes', node, lastNode);
            return;
        }
        var currentColDifference = node.column - lastNode.column;
        if (currentColDifference < 1){
            var colDifferenceToAdd = Math.abs(lastNode.column - node.column) + 1;
            node.column += colDifferenceToAdd;
        }
        
    };

    _.forEach(nodes, function(node){
        if (typeof node.column !== 'number'){
            console.error('No column number on node', node);
            return;
        }

        // Case: Step Node
        if (Array.isArray(node.outputNodes) && node.outputNodes.length > 0){

            var laggingOutputNodes = _.filter(node.outputNodes, function(oN){
                if (typeof oN.column === 'number' && oN.column <= node.column){
                    return true;
                    // !FIX!
                }
                return false;
            });

            _.forEach(laggingOutputNodes, function(loN){
                traceNodePathAndRun(loN, colCorrectFxn, 'output', node);
            });

        }

        // Case: IO Node
        if (Array.isArray(node.inputOf) && node.inputOf.length > 0){

            var laggingStepNodes = _.filter(node.inputOf, function(sN){
                if (typeof sN.column === 'number' && sN.column <= node.column){
                    return true;
                    // !FIX!
                }
                return false;
            });

            _.forEach(laggingStepNodes, function(lsN){
                traceNodePathAndRun(lsN, colCorrectFxn, 'output', node);
            });

        }

    });

    return graphData;
}


export function parseBasicIOAnalysisSteps(analysis_steps, workflowItem){

    var allWorkflowInputs = _.filter(
        _.flatten(
            _.pluck(analysis_steps, 'inputs'), true
        ),
        function(input){
            if (!Array.isArray(input.source)) return false;
            if (
                _.find(input.source, function(s){
                    if (s.type.indexOf('Workflow') > -1) return true;
                    return false;
                })
            ){
                return true;
            }
            return false;
        }
    );

    var allWorkflowOutputs = _.filter(
        _.flatten(
            _.pluck(analysis_steps, 'outputs'), true
        ),
        function(output){
            if (!Array.isArray(output.target)) return false;
            if (
                _.find(output.target, function(t){
                    if (t.type.indexOf('Workflow') > -1) return true;
                    return false;
                })
            ){
                return true;
            }
            return false;
        }
    );

    return parseAnalysisSteps([
        _.extend(
            _.omit(workflowItem, 'arguments', 'analysis_steps', 'link_id', '@context', 'cwl_data'), // Use workflowItem as if it were AnalysisStep
            {
                'inputs' : allWorkflowInputs,
                'outputs' : allWorkflowOutputs
            }
        )
    ]);

}
