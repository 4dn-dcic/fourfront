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
        if (readOnly) {
            return (typeof ioIdsUsed[id] === 'number' ? id + '~' + ioIdsUsed[id] : id);
        }
        if (typeof ioIdsUsed[id] === 'undefined') {
            ioIdsUsed[id] = 1;
            return id;
        }
        return id + '~' + (++ioIdsUsed[id]);
    }


    function generateStepNode(step, column){
        return {
            id : stepNodeID(step),
            type : 'step',
            name : stepNodeName(step),
            meta : _.extend({}, step.meta || {}, _.omit(step, 'inputs', 'outputs', 'meta')),
            description : step.description,
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
        
        return _.map(stepInput.run_data.file, function(file, idx){
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

    function filterNodesToRelatedIONodes(allNodes, stepName){
        return _.filter(nodes, function(n){
            if (n.type === 'output' || n.type === 'input'){
                var targetPropertyName = n.type === 'input' ? 'source' : 'target';
                if (!Array.isArray(n.meta[targetPropertyName])) return false;
                for (var i = 0; i < n.meta[targetPropertyName].length; i++){
                    if (n.meta[targetPropertyName][i].step === stepName) return true;
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
        var allRelatedIONodes = filterNodesToRelatedIONodes(nodes, step.name);
        var inputNodesMatched = [];
        var inputNodesCreated = [];

        step.inputs.forEach(function(fullStepInput){
            if (!Array.isArray(fullStepInput.source)) return;

            var inputNodes = []; // All input nodes matched to step input will be in here

            // Step 1. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var inputNodesToMatch = expandIONodes(fullStepInput, column, stepNode, "input", true);
            var nodesNamesMatched = {  };

            var currentInputNodesMatched = (
                _.filter(allRelatedIONodes, function(n){
                    if (_.find(fullStepInput.source, function(s){
                        if (s.name === n.name && s.step === n.outputOf.name) return true;

                        if ( _.find(
                                n.meta.target || [],
                                function(t){
                                    if (t.step === step.name && fullStepInput.name === t.name) return true;
                                    return false;
                                }
                            )
                        ) return true;
                        else return false;
                    })){
                        nodesNamesMatched[n.name] = fullStepInput.name;
                        return true;
                    }
                    else return false;
                })
            );

            var matchedNames = _.keys(nodesNamesMatched);

            if (currentInputNodesMatched.length > 0){
                inputNodesMatched = inputNodesMatched.concat(currentInputNodesMatched);
                inputNodes = inputNodes.concat(currentInputNodesMatched);
                _.forEach(currentInputNodesMatched, function(n){
                    var inNodeName = nodesNamesMatched[n.name];
                    if (typeof inNodeName === 'undefined') return;
                    var inNode = _.findWhere(inputNodesToMatch, { 'name' : inNodeName });
                    if (!inNode) return;
                    _.extend(n, { 'inputOf' : inNode.inputOf, 'meta' : _.extend(n.meta, inNode.meta) });
                });
            }

            // Step 2. For any unmatched input nodes, create them (via adding to 'nodes' list).
            if (currentInputNodesMatched.length < inputNodesToMatch.length){
                var unmatchedInputNodes = _.map(
                    _.filter(inputNodesToMatch, function(n,idx){
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
                inputNodes = inputNodes.concat(unmatchedInputNodes);
            }

            // Finally, attach edge to all input nodes associated to step input.
            if (inputNodes.length > 0) {
                _.forEach(inputNodes, function(n){
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
        var allRelatedIONodes = filterNodesToRelatedIONodes(nodes, step.name);

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
                _.filter(allRelatedIONodes, function(n){
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
        
        var remainingSteps = analysis_steps.filter(function(step){
            if (typeof processedSteps[stepNodeID(step) || stepNodeName(step)] !== 'undefined'){
                return false;
            }
            return true;
        });

        var nextSteps = new Set();

        ioNodes.forEach(function(n){
            if (n.meta && Array.isArray(n.meta[targetPropertyName])){
                var target = n.meta[targetPropertyName][1] || n.meta[targetPropertyName][0]; // Optimization. If input of another step, it'll be second item in array if a Workflow Output target also present.
                if (typeof target.step === 'string'){
                    var matchedStep = _.findWhere(analysis_steps, { 'name' : target.step });
                    if (matchedStep) {
                        nextSteps.add(matchedStep);
                    }
                }
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

            processedSteps[stepNode.id || stepNode.name] = step;

            findNextStepsFromIONode(outputNodesCreated).forEach(function(nextStep){
                processStepInPath(nextStep, level + 1);
            });
        } else {
            
            outputNodesCreated = generateOutputNodesComplex(step, (level + 1) * 2, stepNode);
            inputNodesUsedOrCreated  = generateInputNodesSimple(step, (level + 1) * 2 - 2, stepNode);

            nodes.push(stepNode);

            processedSteps[stepNode.id || stepNode.name] = step;

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
