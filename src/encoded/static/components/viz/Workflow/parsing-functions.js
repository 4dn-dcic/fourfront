'use strict';

import _ from 'underscore';
import { console } from './../../util';


export function parseAnalysisSteps(analysis_steps, parsingMethod = 'output'){

    /**** Outputs ****/

    var nodes = [];
    var edges = [];

    /* Temp Vars */
    var ioIdsUsed = {  }; // Keep track of IO arg node ids used, via keys; prevent duplicates by incrementing int val.

    /**** Functions ****/

    function stepNodeID   (step) { return step.uuid || step['@id'] || step.link_id || step.name; }
    function stepNodeName (step) { return step.display_title || step.title || step.name || step['@id']; }
    function inputNodeID  (stepInput, readOnly = true) {
        return preventDuplicateNodeID(
            stepInput.id /*|| (Array.isArray(stepInput.source) && stepInput.source.length > 0 && stepInput.source[0].name)*/ || stepInput.name,
            readOnly
        );
    }
    function outputNodeID (stepOutput, readOnly = true){
        return preventDuplicateNodeID(
            stepOutput.id /*|| (Array.isArray(stepOutput.target) && stepOutput.target.length > 0 && (stepOutput.target[1] || stepOutput.target[0]).name)*/ || stepOutput.name,
            readOnly
        );
    }


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


    function generateOutputNode(stepOutput, column, outputOfNode, readOnly = true){
        return {
            column      : column,
            format      : (Array.isArray(stepOutput.target) && stepOutput.target.length > 0 && stepOutput.target[0].type) || null,
            id          : outputNodeID(stepOutput, readOnly),
            name        : stepOutput.name,
            type        : 'output',
            meta        : _.extend({}, stepOutput.meta || {}, _.omit(stepOutput, 'required', 'name', 'meta')),
            outputOf    : outputOfNode
        };
    }

    /**
     * Generate output nodes from step.outputs and create edges between them and stepNode.
     * 
     * @param {Object} step - Analysis Step
     * @param {number} column - Column index (later translated into X coordinate).
     * @param {Object} stepNode - Analysis Step Node Reference
     */
    function generateOutputNodesSimple(step, column, stepNode){

        var outputNodes = _.flatten(step.outputs.map(function(stepOutput, j){
            return expandIONodes(stepOutput, column, stepNode, "output", false);
        }), true);

        // Find __ INPUT __ nodes with same file
        // if any exist, replace them, re-use instead of adding new, and make edge.
        // also... : move node down in column list somehow
        outputNodes = _.filter(outputNodes, function(oN){
            for (var i = 0; i < nodes.length; i++){
                if (nodes[i] && nodes[i].meta && nodes[i].meta.run_data && nodes[i].meta.run_data.file){
                    if (checkNodeFileForMatch(oN, nodes[i].meta.run_data.file)){
                        nodes[i].outputOf = stepNode;
                        
                        nodes[i].format = oN.format;
                        //nodes[i].name = oN.name || nodes[i].name; //ioNodeNameCombo(nodes[i], oN);
                        nodes[i].type = 'output';
                        if (nodes[i].meta && oN.meta && oN.meta.argument_type){
                            nodes[i].meta.argument_type = oN.meta.argument_type;
                        }
                        edges.push({
                            'source' : stepNode,
                            'target' : nodes[i],
                            'capacity' : 'Output',
                        });
                        return false;
                    }
                }
            }
            return true;
        });
        
        outputNodes.forEach(function(n){
            edges.push({
                'source' : stepNode,
                'target' : n,
                'capacity' : 'Output',
            });
        });

        nodes = nodes.concat(outputNodes);
        return outputNodes;
    }

    function generateInputNode(stepInput, column, inputOfNode, readOnly = true){
        return {
            column      : column,
            format      : (Array.isArray(stepInput.source) && stepInput.source.length > 0 && stepInput.source[0].type) || null, // First source type takes priority
            id          : inputNodeID(stepInput, readOnly),
            name        : stepInput.name, 
            type        : 'input',
            inputOf     : inputOfNode,
            meta        : _.extend({}, stepInput.meta || {}, _.omit(stepInput, 'required', 'name', 'meta')),
            required    : stepInput.required || false,
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
                    'name' : stepInput.name,
                    'id' : stepInput.name + '.' + (file.accession || file.uuid || idx),
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
                _.forEach(groupKeys, function(grouping){
                    _.forEach(_.keys(groups[grouping]), function(group){
                        if (groups[grouping][group].has(file.uuid || file)){
                            if (typeof m[grouping] === 'undefined'){
                                m[grouping] = {};
                            }
                            if (typeof m[grouping][group] === 'undefined'){
                                m[grouping][group] = new Set();
                            }
                            m[grouping][group].add(file);
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
                var groupNode = {
                    column      : column,
                    format      : groupTypeToCheck,
                    id          : stepInput.name + '.group:' + groupingName + '.' + wfPair[0],
                    name        : stepInput.name,
                    type        : inputOrOutput + '-group',
                    meta        : _.extend({}, stepInput.meta || {}, _.omit(stepInput, 'required', 'name', 'meta')),
                    inputOfNode : inputOfNode
                };
                groupNode.meta[groupingName] = wfPair[0];
                m.push(groupNode);
                return m;
            },[]);

            return expandFilesToIndividualNodes(filesNotInGroups).concat(groupNodes);
        }

        return expandFilesToIndividualNodes(files);
        
    }

    function ioNodeNameCombo(nodeAsInputNode, nodeAsOutputNode){
        if (nodeAsOutputNode.name === nodeAsInputNode.name) return nodeAsOutputNode.name;
        return (
            nodeAsOutputNode.name.indexOf('>') > -1 ? nodeAsOutputNode.name : (
                ((typeof nodeAsOutputNode.outputOf !== 'undefined' && nodeAsOutputNode.name) || '') +
                (nodeAsInputNode.name && typeof nodeAsInputNode.inputOf !== 'undefined' ? ((nodeAsOutputNode.name && typeof nodeAsOutputNode.outputOf !== 'undefined' && ' > ') || '') + nodeAsInputNode.name : '' )
            )
        );
    }

    function filterNodesToRelatedIONodes(allNodes, stepName){
        return _.filter(nodes, function(n){
            if (n.type === 'output' || n.type === 'input'){
                var targetPropertyName = n.type === 'input' ? 'source' : 'target';
                if (!Array.isArray(n.meta[targetPropertyName])) return false;

                for (var i = 0; i < n.meta[targetPropertyName].length; i++){
                    if (n.meta[targetPropertyName][i].step === stepName) return true;
                }

                if (n[n.type + 'Of']){
                    if (n[n.type + 'Of'].name === stepName) return true;
                }

                return false;
            }
            return false;
        });
    }


    /**
     * Find existing or generate new input nodes for each input in step.inputs and
     * create edges between them and stepNode.
     * 
     * @param {Object} step - Analysis Step
     * @param {number} column - Column index (later translated into X coordinate).
     * @param {Object} stepNode - Analysis Step Node Reference
     */
    function generateInputNodesComplex(step, column, stepNode){
        var inputNodesMatched = [];
        var inputNodesCreated = [];

        step.inputs.forEach(function(fullStepInput){
            if (!Array.isArray(fullStepInput.source)) return;

            var inputNodes = []; // All input nodes matched to step input will be in here

            // Step 1. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var inputNodesToMatch = expandIONodes(fullStepInput, column, stepNode, "input", true);
            //console.log('NEED TO MATCH for' + fullStepInput.name, inputNodesToMatch);
            var nodesNamesMatched = {  };

            var currentInputNodesMatched = (
                _.filter(nodes /*allRelatedIONodes*/, function(n){
                    if (_.find(fullStepInput.source, function(s){
                        // Match source/target (todo: inputOf to array)
                        if (s.name === n.name && n.outputOf && s.step === n.outputOf.name) return true;
                        if (s.name === n.name && n.inputOf && stepNode.name === n.inputOf.name) return true;

                        // Match Groups
                        if (typeof s.grouped_by === 'string' && typeof s[s.grouped_by] === 'string'){
                            if (n.meta && Array.isArray(n.meta.source) && _.any(n.meta.source, function(nS){
                                return typeof nS.grouped_by === 'string' && typeof nS[nS.grouped_by] === 'string' && nS[nS.grouped_by] === s[s.grouped_by];
                            })) return true;
                        }
                        // Match File
                        if (Array.isArray(s.for_file) && _.any(s.for_file, checkNodeFileForMatch.bind(checkNodeFileForMatch, n))) return true;
                        else if (s.for_file && !Array.isArray(s.for_file) && checkNodeFileForMatch(n, s.for_file)) return true;
                        // Match Output Nodes
                        if ( _.find(
                                n.meta.target || [],
                                function(t){
                                    if (t.step === step.name && fullStepInput.name === t.name) return true;
                                    return false;
                                }
                            )
                        ) return true;
                        
                        return false;
                    })){
                        nodesNamesMatched[n.name] = fullStepInput.name;
                        return true;
                    }

                    return false;
                })
            );

            var matchedNames = _.keys(nodesNamesMatched);
            var nodesNamesMatchedInverted = _.invert(nodesNamesMatched);

            //console.log('MATCHED', currentInputNodesMatched);

            if (currentInputNodesMatched.length > 0){
                inputNodesMatched = inputNodesMatched.concat(currentInputNodesMatched);
                inputNodes = inputNodes.concat(currentInputNodesMatched);
                _.forEach(currentInputNodesMatched, function(n){
                    var inNodeName = nodesNamesMatched[n.name];
                    if (typeof inNodeName === 'undefined') return;
                    var inNodes = _.where(inputNodesToMatch, { 'name' : inNodeName });
                    if (!inNodes || inNodes.length === 0) return;
                    
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
                    if (!inNode) return;
                    //console.log(n, inNode);
                    _.extend(n, {
                        'inputOf' : inNode.inputOf,
                        'meta' : _.extend(n.meta, inNode.meta),
                        //'name' : n.name || inNode.name //ioNodeNameCombo(inNode, n)
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
                        n.id = preventDuplicateNodeID(n.id, false);
                        return n;
                    }
                );
                nodes = nodes.concat(unmatchedInputNodes);
                inputNodesCreated = inputNodesCreated.concat(unmatchedInputNodes);
                inputNodes = inputNodes.concat(unmatchedInputNodes);
            }

            //console.log('CREATED', inputNodesCreated);

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

    function generateInputNodesSimple(step, column, stepNode){

        var inputNodes = _.flatten(step.inputs.map(function(stepInput, j){
            return expandIONodes(stepInput, column, stepNode, "input", false);
        }), true);
        
        inputNodes.forEach(function(n){
            edges.push({
                'source' : n,
                'target' : stepNode,
                'capacity' : 'Input',
            });
        });

        nodes = nodes.concat(inputNodes);
        return inputNodes;
    }

    function generateOutputNodesComplex(step, column, stepNode){

        var inputNodesMatched = [];
        var inputNodesCreated = [];

        step.outputs.forEach(function(fullStepOutput){
            if (!Array.isArray(fullStepOutput.target)) return;

            var outputNodes = []; // All input nodes matched to step input will be in here

            // Step 1. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var outputNodesToMatch = expandIONodes(fullStepOutput, column, stepNode, "output", true);
            var nodesNamesMatched = {  };

            // Sorry. Try to match up a previous input node by its source (s) with one of our output target (t)
            var currentOutputNodesMatched = (
                _.filter(nodes, function(n){
                    if (n.type === 'input'
                    &&  _.find(n.meta.source, function(s){
                        if (s.step === step.name && s.name === fullStepOutput.name) return true;
                        return false;
                    })
                    ){
                        nodesNamesMatched[n.name] = fullStepOutput.name;
                        return true;
                    }
                    if (_.find(fullStepOutput.target, function(t){
                        if (n.type === 'input' && t.step === n.inputOf.name &&
                            (t.name === n.name)
                        ) return true;
                        return false;
                    })){
                        nodesNamesMatched[n.name] = fullStepOutput.name;
                        return true;
                    }
                    else return false;
                })
            );

            var matchedNames = _.keys(nodesNamesMatched); //_.pluck(currentOutputNodesMatched, 'name');

            if (currentOutputNodesMatched.length > 0){
                inputNodesMatched = inputNodesMatched.concat(currentOutputNodesMatched);
                outputNodes = outputNodes.concat(currentOutputNodesMatched);
                // Merge any bound-metadata from 'output' node version to its existing 'input' counterpart.
                _.forEach(currentOutputNodesMatched, function(n){
                    var outNodeName = nodesNamesMatched[n.name];
                    if (typeof outNodeName === 'undefined') return;
                    var outNode = _.findWhere(outputNodesToMatch, { 'name' : outNodeName });
                    if (!outNode) return;
                    _.extend(n, { 'outputOf' : outNode.outputOf, 'meta' : _.extend(n.meta, outNode.meta) });
                });
            }

            // Step 2. For any unmatched input nodes, create them (via adding to 'nodes' list).
            if (currentOutputNodesMatched.length < outputNodesToMatch.length){
                //var matchedNames = _.pluck(currentOutputNodesMatched, 'name');
                var unmatchedInputNodes = _.map(
                    _.filter(outputNodesToMatch, function(n,idx){
                        if (matchedNames.indexOf(n.name) > -1) return false;
                        return true;
                    }),
                    function(n){
                        n.id = preventDuplicateNodeID(n.id, false);
                        return n;
                    }
                );
                nodes = nodes.concat(unmatchedInputNodes);
                inputNodesCreated = inputNodesCreated.concat(unmatchedInputNodes);
                outputNodes = outputNodes.concat(unmatchedInputNodes);
            }

            // Finally, attach edge to all input nodes associated to step input.
            if (outputNodes.length > 0) {
                _.forEach(outputNodes, function(n){
                    edges.push({
                        'source' : stepNode,
                        'target' : n,
                        'capacity' : 'Output'
                    });
                });
            }

        });

        return { 'created' : inputNodesCreated, 'matched' : inputNodesMatched };
    }

    var processedSteps = {}; // Just for optimization

    function findNextStepsFromIONode(ioNodes){

        var targetPropertyName = parsingMethod === 'output' ? 'target' : 'source';
        /*
        var remainingSteps = analysis_steps.filter(function(step){
            if (typeof processedSteps[stepNodeID(step) || stepNodeName(step)] !== 'undefined'){
                return false;
            }
            return true;
        });
        */
        var nextSteps = new Set();

        ioNodes.forEach(function(n){
            if (n.meta && Array.isArray(n.meta[targetPropertyName])){
                n.meta[targetPropertyName].forEach(function(t){
                    if (typeof t.step === 'string'){
                        var matchedStep = _.findWhere(analysis_steps, { 'name' : t.step });
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
     * @param {Object} step - AnalysisStep object representation, extended with additional 'inputs' and 'outputs' arrays. 
     * @param {number} [level=0] - Step level or depth. Used for nodes' column (precursor to X axis position).
     */
    function processStepInPath(step, level = 0){
        var stepNode = generateStepNode(step, (level + 1) * 2 - 1);

        var inputNodesUsedOrCreated, outputNodesCreated;

        if (parsingMethod === 'output'){
            inputNodesUsedOrCreated  = generateInputNodesComplex(step, (level + 1) * 2 - 2, stepNode);
            outputNodesCreated = generateOutputNodesSimple(step, (level + 1) * 2, stepNode);

            nodes.push(stepNode);

            processedSteps[stepNode.id || stepNode.name] = stepNode;

            findNextStepsFromIONode(outputNodesCreated).forEach(function(nextStep){
                if (typeof processedSteps[stepNodeID(nextStep)] === 'undefined'){
                    processStepInPath(nextStep, level + 1);
                } else {
                    generateInputNodesComplex(nextStep, (level + 2) * 2 - 2, processedSteps[stepNodeID(nextStep)]);
                }
            });
        } else {
            
            outputNodesCreated = generateOutputNodesComplex(step, (level + 1) * 2, stepNode);
            inputNodesUsedOrCreated  = generateInputNodesSimple(step, (level + 1) * 2 - 2, stepNode);

            nodes.push(stepNode);

            processedSteps[stepNode.id || stepNode.name] = stepNode;

            findNextStepsFromIONode(inputNodesUsedOrCreated).forEach(function(nextStep){
                processStepInPath(nextStep, level - 1);
            });
        }
        
        
    }

    /***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
     *  Process each Analysis Step as a node. Inputs & output nodes placed in alternating column.  *
     ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****/

    /**
     * Process step[]->output[]->step[]->output[] graph.
     * Start at first analysis step in array.
     */
    function processStepIOPath(){
        if (Array.isArray(analysis_steps) && analysis_steps.length > 0){
            if (parsingMethod === 'output'){


                processStepInPath(analysis_steps[0]);
                //console.log('FIRSTSTEP', analysis_steps[0])

                for (var i = 0; i < 1000; i++){

                    if (_.keys(processedSteps).length < analysis_steps.length){
                        var nextSteps = _.filter(analysis_steps, function(s){
                            if (typeof processedSteps[stepNodeID(s)] === 'undefined') return true;
                            return false;
                        });
                        //console.log('NEXTSTEPS', i, nextSteps);
                        if (nextSteps.length > 0) processStepInPath(nextSteps[0]);
                    } else {
                        break;
                    }

                }



            } else if (parsingMethod === 'input') {
                processStepInPath(analysis_steps[analysis_steps.length - 1], analysis_steps.length - 1);
                var colDepthMin = _.reduce(nodes, function(m,n){ return Math.min(n.column, m); }, 100);
                if (colDepthMin > 0){
                    nodes.forEach(function(n){
                        n.column -= colDepthMin;
                    });
                }
                
            }
        }
        
    }

    /**
     * Process steps linearly, by their order in list.
     * @deprecated
     * @param {Object} step - List of AnalysisSteps, each extended with 'inputs' and 'outputs' arrays.
     * @param {number} index - Step index.
     */
    function processStepsLinearly(){
        analysis_steps.forEach(function(step, i){
            var stepNode = generateStepNode(step, (i + 1) * 2 - 1);
            generateInputNodesComplex(step, (i + 1) * 2 - 2, stepNode);
            generateOutputNodesSimple(step, (i + 1) * 2, stepNode);
            nodes.push(stepNode);
        });
    }



    /** Entry Point **/
    
    if (parsingMethod === 'linear'){
        processStepsLinearly();
    } else if (parsingMethod === 'input' || parsingMethod === 'output') {
        processStepIOPath();
    }

    return {
        'nodes' : nodes,
        'edges' : edges
    };

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
