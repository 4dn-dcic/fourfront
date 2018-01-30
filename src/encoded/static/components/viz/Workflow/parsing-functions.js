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
 * Type definition for a Step input/output argument run_data.
 * Exact same as Node.meta.run_data, however here the arguments have not yet been expanded into multiple nodes per argument, so properties are lists to-be-expanded.
 * 
 * @typedef StepIOArgumentRunData
 * @property {Object[]} [file]                      File(s) for step argument. This should be a list of objects. This might be list of '@id' strings in case WorkflowRun has not finished indexing.
 * @property {string[]|number[]} [value]            Value(s) for step argument. This should be a list of strings or numbers. Is present if is an IO parameter input.
 * @property {Object[]} [meta]                      Additional information about the file or run that might not be included on the Files or Values themselves.                  
 */

/**
 * Type definition for a Step input/output argument.
 * 
 * @typedef StepIOArgument
 * @property {string} name                          Name of argument in context of step itself
 * @property {Object} meta                          Various properties related to the argument itself, in context of Step.
 * @property {StepIOArgumentRunData} [run_data]     Data about the run, if any present (if WorkflowRun or WorkflowRun trace).
 * @property {StepIOArgumentTargetOrSource[]} [target]   List of targets for IO
 * @property {StepIOArgumentTargetOrSource[]} [source]   List of sources for IO
 */

/**
 * Type definition for a Step.
 * 
 * @typedef Step
 * @property {string} name                          Name of step
 * @property {Object} meta                          Various properties related to the step itself.
 * @property {StepIOArgument[]} inputs              Input arguments
 * @property {StepIOArgument[]} outputs             Output arguments
 */


/**
 * Type definition for a Node.
 * More properties may be added to this node after parseAnalysisSteps() function is complete which relate to Graph/UI state.
 * 
 * @typedef NodeRunData
 * @property {Object} [file]                        Related file for node. This should be an object, e.g. as returned from a linkTo.
 * @property {string|number} [value]                Value for node. This should be a string or number. Is present if is an IO paramater node.
 * @property {Object} [meta]                        Additional information about the file or run that might not be included on the File or Value itself.
 * 
 * @typedef NodeMeta
 * @property {NodeRunData} [run_data]                   Information about specific to a run(s), if we have a WorkflowRun or WorkflowRun trace. For example - file or parameter value.
 * @property {StepIOArgumentTargetOrSource[]} [source]  List of sources for IO, copied over from step(s) which reference it.
 * @property {StepIOArgumentTargetOrSource[]} [target]  List of targets for IO, copied over from step(s) which reference it.
 *
 * @typedef Node
 * @property {string} type                          Basic categorization of the node - one of "input", "output", "input-group", "step". Subject to change.
 * @property {string} name                          Name of node. Unique for all step nodes. Not necessarily unique for IO nodes.
 * @property {string} [id]                          For IO nodes only: Unique self-generated ID exists on IO nodes, in addition to non-necessarily-unique name.
 * @property {NodeMeta} meta                        Various properties related to the node, to be used for styling & annotating the node or showing information onClick.
 * @property {number} column                        Column to which the Node is currently assigned.
 * @property {Node[]} [inputNodes]                  For Step nodes only: List of other nodes which lead to this node, if is a step node.
 * @property {Node[]} [outputNodes]                 For Step nodes only: List of other nodes to which this node leads, if is a step node.
 * @property {Node[]} [inputOf]                     For IO nodes only: List of other node references to which this input is an input to, if an IO node.
 * @property {Node} [outputOf]                      For IO nodes only: Another node reference from which this node is output of, if an output IO node.
 * @property {Object} [argNamesOnSteps]             For IO nodes only: Mapping of IO name by step name, as IO name varies by step it is described by.
 * @property {string} [format]                      For IO nodes only: The 'argument_type' from CWL, e.g. 'Workflow Parameter', 'Workflow Output File', etc.
 */


/**
 * Type definition for an Edge between nodes.
 * 
 * @typedef {Object} Edge
 * @property {Node} source - Node at which the edge starts.
 * @property {Node} target - Node at which the edge ends.
 */





/**
 * Converts a list of steps (each with inputs & outputs) into a list of nodes and list of edges between those nodes to feed directly into the
 * Workflow graph component.
 * 
 * @param {Step[]} analysis_steps                       List of steps from the back-end to generate nodes & edges from.
 * @param {string} [parsingMethod='output']             Deprecated.
 * @returns {{ 'nodes' : Node[], 'edges' : Edge[] }}    Container object for the two lists.
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

    /**
     * @param {StepIOArgument} stepIOArg - Input or output argument of a step.
     * @param {boolean} [readOnly=true] - @see preventDuplicateNodeID()
     * @returns {string} Unique ID for node.
     */
    function ioNodeID(stepIOArg, readOnly = true){
        return preventDuplicateNodeID(
            stepIOArg.id || stepIOArg.name,
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
        var isGlobal = stepIOArg.meta && stepIOArg.meta.global === true;

        if (isGlobal){
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
                if (list[i] && (typeof list[i].step === 'undefined') && typeof list[i].name === 'string'){ // Source or Target --not-- going to a step; use name of that (assumed global source/target)
                    nameToUse = list[i].name;
                    break;
                }
            }
        }
        return nameToUse;
    }

    /**
     * Pass a should-be-unique IO Node ID through this function to check if same ID exists already.
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
        if (!file1 || !file2) return false;
        if (typeof file1 === 'string' && typeof file2 === 'string' && file1 === file2){ // Somewhat deprecated case, but can still occur if WorkflowRun has not finished indexing and we are graphing it.
            return true;
        }
        if (typeof file1 === 'object' && typeof file2 === 'object' && (file1.uuid || 'a') === (file2.uuid || 'b')){ // Common case.
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

    /**
     * @param {Step} step       - A step object from which to generate step node from. 
     * @param {number} column   - Column number to assign to this node.
     * @returns {Node}          - Node object representation.
     */
    function generateStepNode(step, column){
        return {
            'nodeType' : 'step',
            'name'      : step.name,
            '_inputs'   : step.inputs,
            '_outputs'  : step.outputs,
            'meta'      : _.extend( {}, step.meta || {}, _.omit(step, 'inputs', 'outputs', 'meta') ),
            'column'    : column
        };
    }

    /**
     * @param {StepIOArgument} stepIOArgument   Input or output argument of a step for/from which to create output node(s) from.
     * @param {number} column                   Column number to assign to this node.
     * @param {Node} stepNode                   Step node from which this IO node is being created from. Will be connected to IO node with an edge.
     * @param {string} nodeType                 Type of node in relation to stepNode - either "input" or "output".
     * @param {boolean} [readOnly=true]         If true, will not generate unique ID for IO node.
     * @returns {Node} - Node object representation.
     */
    function generateIONode(stepIOArgument, column, stepNode, nodeType, readOnly = true){
        if (nodeType !== 'input' && nodeType !== 'output') throw new Error('Incorrect type, must be one of input or output.');

        // Relation to the stepNode. Input nodes have sources from the stepNode, output nodes have targets from the stepNode.
        var sourceOrTarget = nodeType === 'input' ? 'source' : 'target';

        var namesOnSteps = {};
        namesOnSteps[stepNode.name] = stepIOArgument.name;

        var ioType = stepIOArgument.meta && typeof stepIOArgument.meta.type === 'string' && stepIOArgument.meta.type.toLowerCase(); // Will be one of "data file", "report", "QC", "reference file", "parameter"

        var ioNode = {
            'column'          : column,
            'ioType'          : ioType,
            'id'              : ioNodeID(stepIOArgument, readOnly),
            'name'            : ioNodeName(stepIOArgument),
            'argNamesOnSteps' : namesOnSteps,
            'nodeType'        : nodeType,
            '_source'         : stepIOArgument.source,
            '_target'         : stepIOArgument.target,
            'meta'            : _.extend({}, stepIOArgument.meta || {}, _.omit(stepIOArgument, 'name', 'meta', 'source', 'target'))
        };

        if (nodeType === 'input')       ioNode.inputOf = [stepNode]; // May be input of multiple steps
        else if (nodeType === 'output') ioNode.outputOf = stepNode;

        return ioNode;
    }

    /**
     * Generate multiple nodes from one step input or output.
     * Checks to see if WorkflowRun (via presence of run_data object in step input/output), and if multiple files exist in run_data.file, 
     * will generate that many nodes.
     *
     * @param {StepIOArgument} stepIOArgument   Input or output argument of a step for/from which to create output node(s) from.
     * @param {number} column                   Column number to assign to this node.
     * @param {Node} stepNode                   Step node from which this IO node is being created from. Will be connected to IO node with an edge.
     * @param {string} nodeType                 Type of node in relation to stepNode - either "input" or "output".
     * @param {boolean} [readOnly=true]         If true, will not generate unique ID for IO node.
     * @returns {Node[]} List of expanded I/O nodes.
     */
    function expandIONodes(stepIOArgument, column, stepNode, nodeType, readOnly){

        //console.log('PARAM1', column, stepNode, stepIOArgument);

        // Return just the single node if we don't have array for run_data.file or run_data.value.
        if (typeof stepIOArgument.run_data === 'undefined' ||
            (!stepIOArgument.run_data.file && !stepIOArgument.run_data.value) ||
            (stepIOArgument.run_data.file && (!Array.isArray(stepIOArgument.run_data.file) || stepIOArgument.run_data.file.length === 0)) ||
            (stepIOArgument.run_data.value && (!Array.isArray(stepIOArgument.run_data.value) || stepIOArgument.run_data.value.length === 0))
        ){ // Not valid WorkflowRun
            return [generateIONode(stepIOArgument, column, stepNode, nodeType, readOnly)];
        }

        /**
         * This is how multiple files or values per step argument are handled.
         * A Step argument with an array instead of single item for 'run_data.file' or 'run_data.value' will get mapped/cloned to multiple nodes, each with a different single 'file' or 'value', respectively.
         * 
         * @param {Array} value_list - List of Files or Values from run_data to expand into multiple IO nodes.
         * @param {string} [propertyToExpend="file"] - One of 'file' or 'value' (for parameters).
         * @returns {Object[]} List of nodes for step argument.
         */
        function expandRunDataArraysToIndividualNodes(value_list, propertyToExpand = 'file'){
            return _.map(value_list, function(val, idx){
                if (Array.isArray(val)){
                    idx = val[0];
                    val = val[1];
                }
                var id = ioNodeName(stepIOArgument) + '.';
                var run_data = _.extend({}, stepIOArgument.run_data, { 'meta' : (stepIOArgument.run_data.meta && stepIOArgument.run_data.meta[idx]) || null });
                if (propertyToExpand === 'file'){
                    id += (val.accession || val.uuid || idx);
                    run_data.file = val;
                } else if (propertyToExpand === 'value') { // Case: Parameter or anything else.
                    id += idx;
                    run_data.value = val;
                }

                //console.log('RUNDATA', run_data);

                return generateIONode(_.extend({}, stepIOArgument, {
                    'name'  : ioNodeName(stepIOArgument),
                    'id'    : id,
                    'run_data' : run_data
                }), column, stepNode, nodeType, readOnly);
            });
        }

        var valuesForArgument, isParameterArgument;
        if (stepIOArgument.run_data && Array.isArray(stepIOArgument.run_data.value) && !stepIOArgument.run_data.file){
            isParameterArgument = true;
            valuesForArgument = stepIOArgument.run_data.value;
        } else {
            isParameterArgument = false;
            valuesForArgument = stepIOArgument.run_data.file;
        }

        //console.log('PARAM', isParameterArgument, valuesForArgument);

        // CREATE/HANDLE GROUP NODES ---- N.B. THIS IS LIKELY TEMPORARY AND WILL CHANGE ONCE WE HAVE DESIGN/IDEA FOR GROUPED WFRs. DOES NOT HANDLE PARAMETERS
        var groupSources = _.filter(stepIOArgument.source || [], function(s){
            return (typeof s.grouped_by === 'string' && typeof s[s.grouped_by] !== 'undefined' && typeof s.for_file === 'string');
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
            var filesByGroup = _.reduce(stepIOArgument.run_data.file, function(m, file, idx){
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
                namesOnSteps[stepNode.name] = stepIOArgument.name;
                var groupNode = {
                    'column'      : column,
                    'ioType'      : (stepIOArgument.meta && stepIOArgument.meta.type) || 'group',
                    'id'          : ioNodeName(stepIOArgument)+ '.group:' + groupingName + '.' + wfPair[0],
                    'name'        : ioNodeName(stepIOArgument),
                    'argNamesOnSteps' : namesOnSteps,
                    'nodeType'    : nodeType + '-group',
                    '_source'     : stepIOArgument.source,
                    '_target'     : stepIOArgument.target,
                    'meta'        : _.extend({}, stepIOArgument.meta || {}, _.omit(stepIOArgument, 'name', 'meta', 'source', 'target')),
                    'inputOf'     : [stepNode]
                };
                groupNode.meta[groupingName] = wfPair[0];
                m.push(groupNode);
                return m;
            },[]);

            return expandRunDataArraysToIndividualNodes(filesNotInGroups).concat(groupNodes);
        }
        // END CREATE/HANDLE GROUP NODEES

        return expandRunDataArraysToIndividualNodes(valuesForArgument, isParameterArgument ? 'value' : 'file');
        
    }

    /**
     * Generate output nodes from step.outputs and create edges between them and stepNode.
     * 
     * @param {Step} step - Analysis Step
     * @param {number} column - Column index (later translated into X coordinate).
     * @param {Node} stepNode - Analysis Step Node Reference
     * @returns {Node[]} List of new output nodes.
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
                        nodes[i].nodeType = 'output'; // Convert our found input file to an output file, if not already.
                        if (nodes[i].meta && oN.meta && oN.meta.type) nodes[i].meta.type = oN.meta.type;
                        if (nodes[i].meta && oN.meta && oN.meta.file_format) nodes[i].meta.file_format = oN.meta.file_format;
                        if (nodes[i].meta && oN.meta && oN.meta.global) nodes[i].meta.global = oN.meta.global;
                        if (nodes[i].meta && oN.meta && oN.meta.argument_type) nodes[i].meta.argument_type = oN.meta.argument_type;
                        if (!nodes[i]._source && oN._source) nodes[i]._source = oN._source;
                        if (!nodes[i]._target && oN._target) nodes[i]._source = oN._target;
                        nodes[i].wasMatchedAsOutputOf = stepNode.name; // For debugging.
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
     * @param {Node} stepNode - Analysis Step Node Reference
     * @returns {Object} Object containing two lists - 'created' and 'matched' - containing nodes which were newly created and matched & re-used, respectively, for this step's input arguments.
     */
    function generateInputNodesComplex(step, column, stepNode){
        var inputNodesMatched = [];
        var inputNodesCreated = [];

        /**
         * Compares an input node and a step input argument to see if they refer to same file or value, independent of matching argument names.
         * Used as an extra check to help handle provenance graphs where step argument names for terminal input files might differ, yet use the same file.
         * 
         * @param {Node} node - Node to compare run_data file from.
         * @param {StepIOArgument} - Step Input argument whose source.for_file to compare against node run_data file.
         * @returns {boolean} True if both have same file.
         */
        function areInputRunDataPresentAndEqual(node, stepInput){
            if (!(node.meta && node.meta.run_data)) return false;
            if (!(stepInput.source.length === 1 && typeof stepInput.source[0].step === 'undefined')) return false;
            return (
                (node.meta.run_data.file && node.meta.run_data.file.uuid && typeof stepInput.source[0].for_file === 'string' && node.meta.run_data.file.uuid === stepInput.source[0].for_file) ||
                (typeof node.meta.run_data.value !== 'undefined' && stepInput.run_data && typeof stepInput.run_data.value !== 'undefined' && node.meta.run_data.file.value === stepInput.run_data.value)
            );
        }

        step.inputs.forEach(function(fullStepInput){
            if (!Array.isArray(fullStepInput.source)) return;

            var inputNodes = []; // All input nodes matched to step input will be in here, e.g. to draw edges from to step.

            // Step 1a. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var ioNodeIDsMatched = {  };

            var currentInputNodesMatched = (
                _.filter(nodes /*allRelatedIONodes*/, function(n){
                    
                    // Ignore any step nodes
                    if (n.nodeType === 'step') return false;

                    // Re-use global inputs nodes if not cardinality:array
                    if (fullStepInput.source.length === 1 && typeof fullStepInput.source[0].step === 'undefined' && !(fullStepInput.meta && fullStepInput.meta.cardinality === 'array')){ // Is global input file
                        if (Array.isArray(n._source) && n._source.length === 1 && typeof n._source[0].step === 'undefined' && (
                            n._source[0].name === fullStepInput.source[0].name /* <-- for workflows, workflow_runs */ || areInputRunDataPresentAndEqual(n, fullStepInput) /* <-- for provenance graphs */
                        )){
                            // Double check that if there is a file, that files are equal as well, to account for provenance graphs with multiple workflows of same type and having same IO arg names, etc.
                            if (!(n.meta && n.meta.run_data) || areInputRunDataPresentAndEqual(n, fullStepInput)){
                                ioNodeIDsMatched[n.id] = ioNodeName(fullStepInput);
                                return true;
                            }
                        }
                    } else if (_.any(fullStepInput.source, function(s){ // Compare IO nodes against step input arg sources
                        
                        // Match nodes by source step & name, check that they target this step.
                        if (s.step && n.argNamesOnSteps[s.step] === s.name && Array.isArray(n._target) && _.any(n._target, function(t){ return t.step === step.name; })){
                            return true;
                        }

                        // Extra CWL-like check case by existing node target step match
                        if (Array.isArray(n._target) && _.any(n._target, function(t){
                            return (t.step === step.name && fullStepInput.name === t.name);
                        })) return true;

                        /**** EXTRA NON-CWL THINGS ****/

                        // Match Groups
                        if (typeof s.grouped_by === 'string' && typeof s[s.grouped_by] === 'string'){
                            if (n.meta && Array.isArray(n._source) && _.any(n._source, function(nodeSource){
                                return typeof nodeSource.grouped_by === 'string' && typeof nodeSource[nodeSource.grouped_by] === 'string' && nodeSource[nodeSource.grouped_by] === s[s.grouped_by];
                            })){ // Matched by Workflow (or other grouping type), now lets ensure it's the right group.
                                var nodeBeingCheckedGroupFiles = _.pluck(_.filter(n._source, function(nS){ return typeof nS.for_file === 'string'; }), 'for_file');
                                return (s.for_file && _.contains(nodeBeingCheckedGroupFiles, s.for_file) && true) || false;
                            }
                        }

                        // Match By File
                        if (Array.isArray(s.for_file) && _.any(s.for_file, checkNodeFileForMatch.bind(checkNodeFileForMatch, n))) return true;
                        else if (s.for_file && !Array.isArray(s.for_file) && checkNodeFileForMatch(n, s.for_file)) return true;
                        
                        return false;
                    })){
                        // We save stepIOArgument.name here rather than the fullStepInput ID because ID is generated by us and is just name + ~increment if non-unique name (same arg name on different steps).
                        // IO node name is unique re: unique context of input/output names within a step.
                        ioNodeIDsMatched[n.id] = ioNodeName(fullStepInput);
                        return true;
                    }

                    return false;
                })
            );

            //console.log('MATCHED', currentInputNodesMatched, nodes, ioNodeIDsMatched);

            // Step 1b. Create input nodes we need to add, and extend our matched node with its fake-new-node-counterpart's data.
            var inputNodesToMatch = expandIONodes(fullStepInput, column, stepNode, "input", true);
            //console.log('NEED TO FILTER for' + fullStepInput.name, _.pluck(inputNodesToMatch, 'id'));
            //console.log('NEED TO EXTEND FROM', inputNodesToMatch);

            if (currentInputNodesMatched.length > 0){
                inputNodesMatched = inputNodesMatched.concat(currentInputNodesMatched);
                inputNodes = inputNodes.concat(currentInputNodesMatched); // Add to inputNodes var to later draw edge for.

                // Extend each existing node `n` that we've matched with data from nodes that would've been newly created otherwise `inNode`.
                _.forEach(currentInputNodesMatched, function(n){
                    // Sub-Step 1: Grab the new node we created (inputNodesTomatch) but didn't use because matched existing node in `var currentInputNodesMatched`.
                    try {
                        //console.log('FIND', n.id, ioNodeIDsMatched[n.id], stepNode);
                        var inNode, inNodes = _.where(inputNodesToMatch, { 'name' : ioNodeIDsMatched[n.id] });
                        // Sometimes we may have more than 1 file per argument 'name'. So lets narrow it down.
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
                        if (!inNode) throw new Error(n.id + " new node version not found");
                    } catch (e){
                        console.warn("Didn't find newly-created temporary node to extend from which was previously matched against node", n, e);
                        return;
                    }

                    // Sub-Step 2: Extend the node we did match with any new relevant information from input definition on next step (available from new node we created but are throwing out).
                    var combinedMeta = _.extend(n.meta, inNode.meta, {
                        'global' : n.meta.global || inNode.meta.global || false // Make true if either is true.
                    });
                    _.extend(n, {
                        'inputOf' : _.sortBy( (n.inputOf || []).concat(inNode.inputOf || []), 'id'),
                        'meta' : combinedMeta,
                        'name' : ioNodeName(combinedMeta) || n.name,
                        'argNamesOnSteps' : _.extend(n.argNamesOnSteps, inNode.argNamesOnSteps),
                        'wasMatchedAsInputOf' : (n.wasMatchedAsInputOf || []).concat(stepNode.name), // Used only for debugging.
                        '_source' : n._source || inNode._source,
                        '_target' : n._target || inNode._target
                    });
                });
            }

            // Step 2. Filter out nodes from inputNodesToMatch which we have matched already, then for any unmatched input nodes, create them (via adding to high-level output 'nodes' list & cementing their ID).
            if (currentInputNodesMatched.length < inputNodesToMatch.length){
                var unmatchedInputNodes = _.map(
                    _.filter(inputNodesToMatch, function(n,idx){
                        
                        if (typeof ioNodeIDsMatched[n.id] !== 'undefined') return false;

                        // Compare new node's file with already-matched files to filter new node out, if have files.
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
                        n.generatedAsInputOf = (n.generatedAsInputOf || []).concat(stepNode.name); // Add reference to stepNode to indicate how/where was drawn from. For debugging only.
                        return n;
                    }
                );
                nodes = nodes.concat(unmatchedInputNodes); // <- Add new nodes to list of all nodes.
                inputNodesCreated = inputNodesCreated.concat(unmatchedInputNodes);
                inputNodes = inputNodes.concat(unmatchedInputNodes);
                //console.log('NEW NODES CREATED', unmatchedInputNodes, unmatchedInputNodes[0].column, stepNode.column, stepNode.id);
            }

            //console.log('CREATED', inputNodesCreated, ioNodeIDsMatched);

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

        var targetPropertyName = parsingMethod === 'output' ? '_target' : '_source';
        var nextSteps = new Set();

        _.forEach(ioNodes, function(n){
            if (!Array.isArray(n[targetPropertyName])) return;
            _.forEach(n[targetPropertyName], function(t){
                if (typeof t.step === 'string'){
                    var matchedStep = _.findWhere(analysis_steps, { 'name' : t.step });
                    if (matchedStep) {
                        nextSteps.add(matchedStep);
                    }
                }
            });
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

            processedSteps[stepNode.name] = stepNode;

            findNextStepsFromIONode(outputNodesCreated).forEach(function(nextStep){
                if (typeof processedSteps[nextStep.name] === 'undefined'){
                    processStepInPath(nextStep, level + 1);
                } else {
                    generateInputNodesComplex(nextStep, (level + 2) * 2 - 2, processedSteps[nextStep.name]);
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
                        if (typeof processedSteps[s.name] === 'undefined') return true;
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

    function checkIfGlobal(io){
        return (io.meta && io.meta.global) || (_.any((io.source || io.target || []), function(tg){ return tg.name && !tg.step; })) || false;
    }

    return parseAnalysisSteps([
        _.extend(
            _.omit(workflowItem, 'arguments', 'analysis_steps', 'link_id', '@context', 'cwl_data'), // Use workflowItem as if it were AnalysisStep
            {
                'inputs'    : _.filter(_.flatten( _.pluck(analysis_steps, 'inputs'), true ), checkIfGlobal),
                'outputs'   : _.filter(_.flatten( _.pluck(analysis_steps, 'outputs'), true ), checkIfGlobal)
            }
        )
    ]);

}
