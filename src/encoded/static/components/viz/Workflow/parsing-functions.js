'use strict';

import _ from 'underscore';


export function parseAnalysisSteps(analysis_steps, parsingMethod = 'path'){

    /**** Outputs ****/

    var nodes = [];
    var edges = [];


    /**** Functions ****/

    function stepNodeID   (step) { return step.uuid || step['@id'] || step.link_id || step.name; }
    function stepNodeName (step) { return step.display_title || step.title || step.name || step['@id']; }


    function generateStepNode(step, column){
        return {
            id : stepNodeID(step),
            type : 'step',
            name : stepNodeName(step),
            meta : _.omit(step, 'inputs', 'outputs'),
            description : step.description,
            column : column
        };
    }


    function generateOutputNode(stepOutput, column, outputOfNode){
        return {
            column      : column,
            format      : stepOutput.target && stepOutput.target[0].type,
            id          : stepOutput.id || stepOutput.name,
            name        : stepOutput.name,
            type        : 'output',
            meta        : _.omit(stepOutput, 'required', 'name'),
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
    function generateOutputNodes(step, column, stepNode){

        var outputNodes = step.outputs.map(function(stepOutput, j){
            return generateOutputNode(stepOutput, column, stepNode);
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

    function generateInputNode(stepInput, column, inputOfNode){
        return {
            column      : column,
            format      : stepInput.source && stepInput.source[0].type, // First source type takes priority
            id          : stepInput.id || stepInput.name,
            name        : stepInput.name, 
            type        : 'input',
            inputOf     : inputOfNode,
            meta        : _.omit(stepInput, 'required', 'name'),
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
    function expandIONodes(stepInput, column, inputOfNode){
        if (typeof stepInput.run_data === 'undefined' || !Array.isArray(stepInput.run_data.file) || stepInput.run_data.file.length === 0) { // Not valid WorkflowRun
            return [generateInputNode(stepInput, column, inputOfNode)];
        }
        return _.map(stepInput.run_data.file, function(file, idx){
            var stepInputAdjusted = _.extend({}, stepInput, {
                'name' : stepInput.name,
                'id' : stepInput.name + '.' + idx,
                'run_data' : _.extend({}, stepInput.run_data, {
                    'file' : file,
                    'meta' : (stepInput.run_data.meta && stepInput.run_data.meta[idx]) || null
                })
            });
            return generateInputNode(stepInputAdjusted, column, inputOfNode);
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
    function generateInputNodes(step, column, stepNode){
        var allInputOutputNodes = _.filter(nodes, function(n){
            if (n.type === 'output' || n.type === 'input') return true;
            return false;
        });

        var inputNodesMatched = [];
        var inputNodesCreated = [];

        step.inputs.forEach(function(fullStepInput){
            if (!Array.isArray(fullStepInput.source)) return;

            var inputNodes = []; // All input nodes matched to step input will be in here

            // Step 1. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var inputNodesToMatch = expandIONodes(fullStepInput, column, stepNode);

            var currentInputNodesMatched = _.filter(allInputOutputNodes, function(n){
                if (n.name === (fullStepInput.source[1] || fullStepInput.source[0]).name){
                    return true;
                }
                return false;
            });

            if (currentInputNodesMatched.length > 0){
                inputNodesMatched = inputNodesMatched.concat(currentInputNodesMatched);
                inputNodes = inputNodes.concat(currentInputNodesMatched);
            }

            // Step 2. For any unmatched input nodes, create them (via adding to 'nodes' list).
            if (currentInputNodesMatched.length < inputNodesToMatch.length){
                var matchedNames = _.pluck(currentInputNodesMatched, 'name');
                var unmatchedInputNodes = _.filter(inputNodesToMatch, function(n,idx){
                    if (matchedNames.indexOf(n.name) > -1) return false;
                    return true;
                });
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

    var processedSteps = {}; // Just for optimization

    function findNextStepsFromOutputs(outputNodes){
        
        var remainingSteps = analysis_steps.filter(function(step){
            if (typeof processedSteps[stepNodeID(step) || stepNodeName(step)] !== 'undefined'){
                return false;
            }
            return true;
        });

        var nextSteps = new Set();

        outputNodes.forEach(function(oN){
            if (oN.meta && Array.isArray(oN.meta.target)){
                var target = oN.meta.target[1] || oN.meta.target[0]; // Optimization. If input of another step, it'll be second item in array if a Workflow Output target also present.
                if (typeof target.step === 'string'){
                    var matchedStep = _.findWhere(remainingSteps, { 'name' : target.step });
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

        var inputNodesUsedOrCreated  = generateInputNodes(step, (level + 1) * 2 - 2, stepNode);
        var outputNodesCreated = generateOutputNodes(step, (level + 1) * 2, stepNode);

        nodes.push(stepNode);

        processedSteps[stepNode.id || stepNode.name] = step;

        findNextStepsFromOutputs(outputNodesCreated).forEach(function(nextStep){
            processStepInPath(nextStep, level + 1);
        });
    }

    /***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
     *  Process each Analysis Step as a node. Inputs & output nodes placed in alternating column.  *
     ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****/

    /**
     * Process step[]->output[]->step[]->output[] graph.
     * Start at first analysis step in array.
     */
    function processStepOutputPath(){
        if (Array.isArray(analysis_steps) && analysis_steps.length > 0){
            processStepInPath(analysis_steps[0]);
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
            generateInputNodes(step, (i + 1) * 2 - 2, stepNode);
            generateOutputNodes(step, (i + 1) * 2, stepNode);
            nodes.push(stepNode);
        });
    }



    /** Entry Point **/
    
    if (parsingMethod === 'linear'){
        processStepsLinearly();
    } else {
        processStepOutputPath();
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
