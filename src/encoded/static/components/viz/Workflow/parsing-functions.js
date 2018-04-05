'use strict';

import _ from 'underscore';
import { console } from './../../util';

/** @module parsing-functions */


/**
 * Type definition for Step input/output argument source or target object.
 * 
 * @typedef {Object} StepIOArgumentTargetOrSource
 * @property {string} type      Type of IO argument in context of this target/source, e.g. 'Input File', 'Output Processed File'. "Global" workflow file args/IOs are "Workflow Output File" or "Workflow Input File"
 * @property {string} name      Name of this IO/argument in context of this target/source (e.g. if a step, or global workflow arg).
 * @property {string} [step]    ID of the step IO/argument comes from or is going to, if not a global argument w/ type = 'Workflow Output File' or type = 'Workflow Input File'.
 */
var StepIOArgumentTargetOrSource;

/**
 * Type definition for a Step input/output argument run_data.
 * Exact same as Node.meta.run_data, however here the arguments have not yet been expanded into multiple nodes per argument, so properties are lists to-be-expanded.
 * 
 * @typedef {Object} StepIOArgumentRunData
 * @property {Object[]} [file]                      File(s) for step argument. This should be a list of objects. This might be list of 'at-id' strings in case WorkflowRun has not finished indexing.
 * @property {string[]|number[]} [value]            Value(s) for step argument. This should be a list of strings or numbers. Is present if is an IO parameter input.
 * @property {Object[]} [meta]                      Additional information about the file or run that might not be included on the Files or Values themselves.                  
 */
var StepIOArgumentRunData;

/**
 * Type definition for a Step input/output argument.
 * 
 * @typedef {Object} StepIOArgument
 * @property {string} name                          Name of argument in context of step itself
 * @property {Object} meta                          Various properties related to the argument itself, in context of Step.
 * @property {StepIOArgumentRunData} [run_data]     Data about the run, if any present (if WorkflowRun or WorkflowRun trace).
 * @property {StepIOArgumentTargetOrSource[]} [target]   List of targets for IO
 * @property {StepIOArgumentTargetOrSource[]} [source]   List of sources for IO
 */
var StepIOArgument;

/**
 * Type definition for a Step.
 * 
 * @typedef {Object} Step
 * @property {string} name                          Name of step
 * @property {Object} meta                          Various properties related to the step itself.
 * @property {StepIOArgument[]} inputs              Input arguments
 * @property {StepIOArgument[]} outputs             Output arguments
 */
var Step;


/**
 * Type definition for a Node's Run Data.
 * More properties may be added to this node after parseAnalysisSteps() function is complete which relate to Graph/UI state.
 * 
 * @typedef {Object} NodeRunData
 * @property {Object} [file]                        Related file for node. This should be an object, e.g. as returned from a linkTo.
 * @property {string|number} [value]                Value for node. This should be a string or number. Is present if is an IO paramater node.
 * @property {Object} [meta]                        Additional information about the file or run that might not be included on the File or Value itself.
 */
var NodeRunData;

/**
 * @typedef {Object} NodeMeta
 * @property {NodeRunData} [run_data]                   Information about specific to a run(s), if we have a WorkflowRun or WorkflowRun trace. For example - file or parameter value.
 * @property {StepIOArgumentTargetOrSource[]} [source]  List of sources for IO, copied over from step(s) which reference it.
 * @property {StepIOArgumentTargetOrSource[]} [target]  List of targets for IO, copied over from step(s) which reference it.
 */
var NodeMeta;

/**
 * Object structure which represents a visible 'node' on the workflow graph.
 * 
 * @typedef {Object} Node
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
var Node;


/**
 * Connects two nodes together via reference.
 * 
 * @typedef {Object} Edge
 * @property {Node} source - Node at which the edge starts.
 * @property {Node} target - Node at which the edge ends.
 */
var Edge;


/**
 * @typedef {Object} ParsingOptions
 * @property {string}   direction                   Direction of tracing. Only output is currently supported.
 * @property {number[]} [skipSortOnColumns=[1]]     List of column integers to skip sorting on.
 * @property {boolean}  [dontCorrectColumns=false]  If true, will leave column assignments as were given at 'time of trace' rather than re-calculated on preceding nodes.
 * @property {function} [nodesPreSortFxn]           Function through which all nodes get run through before sorting within column. Use this to change nodes' column assignments before sorting within columns.
 * @property {function} [nodesInColumnSortFxn]      A sort function taking 2 nodes as params and returning a 1 or -1. Arranges nodes within a column.
 * @property {function} [nodesInColumnPostSortFxn]  A function  which takes list of nodes and column number and returns list of nodes. Use to run post-sort transformations or re-ordering.
 *
 * @property {boolean}  [showReferenceFiles=true]   If false, nodes/edges or IOs with 'meta.type === reference file' will be filtered out of graph. TODO: Replace with more flexible list of 'filter out rules'.
 * @property {boolean}  [showParameters=true]       If false, nodes/edges or IOs with 'meta.type === parameter' will be filtered out of graph. TODO: Replace with more flexible list of 'filter out rules'.
 */
var ParsingOptions;





 /** @type ParsingOptions */
export const DEFAULT_PARSING_OPTIONS = {
    'direction'                 : 'output',
    'skipSortOnColumns'         : [1],
    'dontCorrectColumns'        : false,
    'nodesPreSortFxn'           : nodesPreSortFxn,
    'nodesInColumnSortFxn'      : nodesInColumnSortFxn,
    'nodesInColumnPostSortFxn'  : nodesInColumnPostSortFxn,
    'showReferenceFiles'        : true,
    'showParameters'            : true
};


/**
 * Converts a list of steps (each with inputs & outputs) into a list of nodes and list of edges between those nodes to feed directly into the
 * Workflow graph component.
 * 
 * @param {Step[]} analysis_steps                       List of steps from the back-end to generate nodes & edges from.
 * @param {ParsingOptions} [parsingOptions]             Options for parsing and post-processing.
 * @returns {{ 'nodes' : Node[], 'edges' : Edge[] }}    Container object for the two lists.
 */
export function parseAnalysisSteps(analysis_steps, parsingOptions = DEFAULT_PARSING_OPTIONS){

    /*************
     ** Outputs **
     *************/

    /** @type Node[] */
    let nodes = [];
    /** @type Edge[] */
    let edges = [];

    /*************
     * Temp Vars *
     *************/

    /**
     * Keep track of IO arg node ids used, via keys; prevent duplicates by incrementing int val.
     * @type {Object.<string, number>}
     */
    let ioIdsUsed = {};

    /**
     * Keep track of steps already processed & added to graph.
     * We start drawing first step, and its inputs/outputs, then recursively draw steps that its outputs go to.
     * At the end, we restart the process from a step that has not yet been encountered/processed, if any.
     * 
     * @type {Object.<string, Node>}
     */
    let processedSteps = {};

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
     * @param   {string}  id               ID to make sure is unique. 
     * @param  {boolean}  [readOnly=true]  If true, will NOT update increment count in cache. Use readOnly when generating nodes to match against without concretely adding them to final list of nodes (yet/ever).
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
     * @param    {Step}  step     A step object from which to generate step node from. 
     * @param  {number}  column   Column number to assign to this node.
     * @returns {Node} Node object representation.
     */
    function generateStepNode(step, column){
        return {
            'nodeType'  : 'step',
            'name'      : step.name,
            '_inputs'   : step.inputs,
            '_outputs'  : step.outputs,
            'meta'      : _.extend( {}, step.meta || {}, _.omit(step, 'inputs', 'outputs', 'meta') ),
            'column'    : column
        };
    }

    /**
     * @param  {StepIOArgument}  stepIOArgument   Input or output argument of a step for/from which to create output node(s) from.
     * @param          {number}  column           Column number to assign to this node.
     * @param            {Node}  stepNode         Step node from which this IO node is being created from. Will be connected to IO node with an edge.
     * @param          {string}  nodeType         Type of node in relation to stepNode - either "input" or "output".
     * @param         {boolean}  [readOnly=true]  If true, will not generate unique ID for IO node.
     * @returns {Node} Node object representation.
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
                if (!val) console.error('No value(s) on', value_list, stepNode);
                var id = ioNodeName(stepIOArgument) + '.';
                var run_data = _.extend({}, stepIOArgument.run_data, { 'meta' : (stepIOArgument.run_data.meta && stepIOArgument.run_data.meta[idx]) || null });
                if (propertyToExpand === 'file'){
                    id += (val && val.accession || val && val.uuid || idx);
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
     * Find existing or generate new IO nodes for each input or output argument in step.inputs or step.outputs and
     * create edges between them and stepNode.
     * 
     * @param {Step} step - Analysis Step
     * @param {number} column - Column index (later translated into X coordinate).
     * @param {Node} stepNode - Analysis Step Node Reference
     * @param {string} [ioNodeType='input'] - Type of IO, either 'input' or 'output'.
     * @returns {{ 'created' : Node[], 'matched' : Node[] }} Object containing two lists - 'created' and 'matched' - containing nodes which were newly created and matched & re-used, respectively, for this step's input arguments.
     */
    function generateIONodesFromStep(step, column, stepNode, ioNodeType = 'input'){

        var stepIOTargetType = ioNodeType === 'input' ? 'source' : 'target';
        var  oppIOTargetType = ioNodeType === 'input' ? 'target' : 'source';

        var ioNodesMatched = [];
        var ioNodesCreated = [];

        /**
         * Compares an input node and a step input argument to see if they refer to same file or value, independent of matching argument names.
         * Used as an extra check to help handle provenance graphs where step argument names for terminal input files might differ, yet use the same file.
         * 
         * @param {Node} node - Node to compare run_data file from.
         * @param {StepIOArgument} - Step Input argument whose source.for_file to compare against node run_data file.
         * @returns {boolean} True if both have same file.
         */
        function areInputRunDataPresentAndEqual(node, stepIO){
            if (!(node.meta && node.meta.run_data)) return false;
            if (!(stepIO[stepIOTargetType].length === 1 && typeof stepIO[stepIOTargetType][0].step === 'undefined')) return false;
            return (
                (node.meta.run_data.file && node.meta.run_data.file.uuid && typeof stepIO[stepIOTargetType][0].for_file === 'string' && node.meta.run_data.file.uuid === stepIO[stepIOTargetType][0].for_file) ||
                (typeof node.meta.run_data.value !== 'undefined' && stepIO.run_data && typeof stepIO.run_data.value !== 'undefined' && node.meta.run_data.value === stepIO.run_data.value)
            );
        }

        function areAnyRunDataPresentAndEqual(node, stepIO){
            if (!(node.meta && node.meta.run_data)) return false;
            return (
                (node.meta.run_data.file && node.meta.run_data.file.uuid && (
                    _.any(stepIO[stepIOTargetType], function(tg){ return (typeof tg.for_file === 'string' && node.meta.run_data.file.uuid === tg.for_file); })
                )) ||
                (typeof node.meta.run_data.value !== 'undefined' && stepIO.run_data && typeof stepIO.run_data.value !== 'undefined' && node.meta.run_data.value === stepIO.run_data.value)
            );
        }

        _.forEach(step[ioNodeType + 's'], function(stepIO){
            if (!Array.isArray(stepIO[stepIOTargetType])) return;

            var isGlobalInputArg = stepIO[stepIOTargetType].length === 1 && typeof stepIO[stepIOTargetType][0].step === 'undefined' && !(stepIO.meta && stepIO.meta.cardinality === 'array');

            // Step 1a. Associate existing input nodes from prev. steps if same argument/name as for this one.
            var ioNodeIDsMatched = {  };


            var currentIONodesMatched = (
                _.filter(nodes, function(n){
                    
                    // Ignore any step nodes
                    if (n.nodeType === 'step') return false;

                    // Re-use global inputs nodes if not cardinality:array
                    if (ioNodeType === 'input' && isGlobalInputArg){ // Is global input file
                        if (Array.isArray(n['_' + stepIOTargetType]) && n['_' + stepIOTargetType].length === 1 && typeof n['_' + stepIOTargetType][0].step === 'undefined' && (
                            n['_' + stepIOTargetType][0].name === stepIO[stepIOTargetType][0].name /* <-- for workflows, workflow_runs */ || areInputRunDataPresentAndEqual(n, stepIO) /* <-- for provenance graphs */
                        )){
                            // Double check that if there is a file, that files are equal as well, to account for provenance graphs with multiple workflows of same type and having same IO arg names, etc.
                            if (!(n.meta && n.meta.run_data) || !(stepIO.run_data) || areInputRunDataPresentAndEqual(n, stepIO)){
                                ioNodeIDsMatched[n.id] = ioNodeName(stepIO);
                                return true;
                            }
                        }
                    } else if (!isGlobalInputArg && _.any(stepIO[stepIOTargetType], function(s){ // Compare IO nodes against step input arg sources
                        
                        // Match nodes by source step & name, check that they target this step.
                        if (s.step && n.argNamesOnSteps[s.step] === s.name && Array.isArray(n['_' + oppIOTargetType]) && _.any(n['_' + oppIOTargetType], function(t){ return t.step === step.name; })){

                            // Double check that if there is a file, that files are equal as well, to account for provenance graphs with multiple workflows of same type and having same IO arg names, etc.
                            if (!(n.meta && n.meta.run_data) || !(stepIO.run_data) || areAnyRunDataPresentAndEqual(n, stepIO)){
                                return true;
                            }
                        }

                        // Extra CWL-like check case by existing node target step match
                        if (Array.isArray(n['_' + oppIOTargetType]) && _.any(n['_' + oppIOTargetType], function(t){

                            if (t.step && t.step === step.name && stepIO.name === t.name){ // Is a match
                                // Double check that if there is a file, that files are equal as well, to account for provenance graphs with multiple workflows of same type and having same IO arg names, etc.
                                if (!(n.meta && n.meta.run_data) || !(stepIO.run_data) || areAnyRunDataPresentAndEqual(n, stepIO)){
                                    return true;
                                }
                            }
                            return false;
                        })) return true;

                        /**** EXTRA NON-CWL THINGS ****/

                        // Match Groups
                        if (ioNodeType === 'input' && typeof s.grouped_by === 'string' && typeof s[s.grouped_by] === 'string'){
                            if (n.meta && Array.isArray(n['_' + stepIOTargetType]) && _.any(n['_' + stepIOTargetType], function(nodeSource){
                                return typeof nodeSource.grouped_by === 'string' && typeof nodeSource[nodeSource.grouped_by] === 'string' && nodeSource[nodeSource.grouped_by] === s[s.grouped_by];
                            })){ // Matched by Workflow (or other grouping type), now lets ensure it's the right group.
                                var nodeBeingCheckedGroupFiles = _.pluck(_.filter(n['_' + stepIOTargetType], function(nS){ return typeof nS.for_file === 'string'; }), 'for_file');
                                return (s.for_file && _.contains(nodeBeingCheckedGroupFiles, s.for_file) && true) || false;
                            }
                        }

                        // Match By File
                        //if (Array.isArray(s.for_file) && _.any(s.for_file, checkNodeFileForMatch.bind(checkNodeFileForMatch, n))){
                        //    return true;
                        //} else if (s.for_file && !Array.isArray(s.for_file) && checkNodeFileForMatch(n, s.for_file)){
                        //    return true;
                        //}

                        return false;
                    })){
                        // We save stepIOArgument.name here rather than the stepIO ID because ID is generated by us and is just name + ~increment if non-unique name (same arg name on different steps).
                        // IO node name is unique re: unique context of input/output names within a step.
                        ioNodeIDsMatched[n.id] = ioNodeName(stepIO);
                        return true;
                    }

                    return false;
                })
            );

            //console.log('MATCHED', currentIONodesMatched, nodes, ioNodeIDsMatched);

            // Step 1b. Create input nodes we need to add, and extend our matched node with its fake-new-node-counterpart's data.
            var ioNodesToCreate = expandIONodes(stepIO, column, stepNode, ioNodeType, true);
            //console.log('NEED TO FILTER for' + stepIO.name, _.pluck(inputNodesToMatch, 'id'));
            //console.log('NEED TO EXTEND FROM', inputNodesToMatch);

            if (currentIONodesMatched.length > 0){
                ioNodesMatched = ioNodesMatched.concat(currentIONodesMatched);

                // Extend each existing node `n` that we've matched with data from nodes that would've been newly created otherwise `inNode`.
                _.forEach(currentIONodesMatched, function(n){
                    // Sub-Step 1: Grab the new node we created (inputNodesTomatch) but didn't use because matched existing node in `var currentIONodesMatched`.
                    try {
                        //console.log('FIND', n.id, ioNodeIDsMatched[n.id], stepNode);
                        var inNode, inNodes = _.where(ioNodesToCreate, { 'name' : ioNodeIDsMatched[n.id] });
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
                        console.warn("Didn't find newly-created temporary node to extend from which was previously matched against node", n, stepIO, stepNode, e);
                        return;
                    }

                    // Sub-Step 2: Extend the node we did match with any new relevant information from input definition on next step (available from new node we created but are throwing out).
                    var combinedMeta = _.extend(n.meta, inNode.meta, {
                        'global' : n.meta.global || inNode.meta.global || false, // Make true if either is true.
                        'type' : (n.meta && n.meta.type) || (inNode.meta && inNode.meta.type),
                        'file_format' : (n.meta && n.meta.file_format) || (inNode.meta && inNode.meta.file_format)
                    });
                    _.extend(n, {
                        'meta'              : combinedMeta,
                        'name'              : ioNodeType === 'output' ? (inNode.name || n.name) : (n.name || inNode.name),
                        'argNamesOnSteps'   : _.extend(n.argNamesOnSteps, inNode.argNamesOnSteps),
                        '_source'           : n._source || inNode._source,
                        '_target'           : n._target || inNode._target,
                        'ioType'            : n.ioType || inNode.ioType,
                        'inputOf'           : _.sortBy( (n.inputOf || []).concat(inNode.inputOf || []), 'id'),
                        'nodeType'          : (n.nodeType === 'output' || inNode.nodeType === 'output') ? 'output' : (n.nodeType || inNode.nodeType) // Prefer nodeType=output
                    });
                    if (ioNodeType === 'input'){
                        n.wasMatchedAsInputOf = (n.wasMatchedAsInputOf || []).concat(stepNode.name); // Used only for debugging.
                    } else {
                        n.wasMatchedAsOutputOf = stepNode.name; // Used only for debugging.
                        n.outputOf = stepNode;
                    }
                });
            }

            // Step 2. Filter out nodes from ioNodesToCreate which we have matched already, then for any unmatched input nodes, create them (via adding to high-level output 'nodes' list & cementing their ID).
            if (currentIONodesMatched.length < ioNodesToCreate.length){
                var unmatchedIONodesToCreate = _.map(
                    _.filter(ioNodesToCreate, function(n,idx){
                        
                        if (typeof ioNodeIDsMatched[n.id] !== 'undefined') return false;

                        // Compare new node's file with already-matched files to filter new node out, if have files.
                        if (n.meta && n.meta.run_data && n.meta.run_data.file){
                            var fileToMatch = n.meta.run_data.file;
                            var filesToCheck = _.filter(_.map(currentIONodesMatched, function(n2){
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
                        if (ioNodeType === 'input'){
                            n.generatedAsInputOf = (n.generatedAsInputOf || []).concat(stepNode.name); // Add reference to stepNode to indicate how/where was drawn from. For debugging only.
                        } else {
                            n.generatedAsOutputOf = (n.generatedAsOutputOf || []).concat(stepNode.name);
                        }
                        return n;
                    }
                );
                nodes = nodes.concat(unmatchedIONodesToCreate); // <- Add new nodes to list of all nodes.
                ioNodesCreated = ioNodesCreated.concat(unmatchedIONodesToCreate);
                //console.log('NEW NODES CREATED', unmatchedIONodesToCreate, unmatchedIONodesToCreate[0].column, stepNode.column, stepNode.id);
            }

            //console.log('CREATED', inputNodesCreated, ioNodeIDsMatched);

            // Keep references to incoming nodes on our step.
            //console.log('EXISTINGNODES', stepNode[ioNodeType + 'Nodes'])
            stepNode[ioNodeType + 'Nodes'] = _.sortBy(  ioNodesCreated.concat(ioNodesMatched)  , 'id'  );
            //console.log('NEWNODES', stepNode[ioNodeType + 'Nodes']) // We get EXISTINGNODES + 1.

            // Finally, attach edge to all input nodes associated to step input.
            if (stepNode[ioNodeType + 'Nodes'].length > 0) {
                _.forEach(stepNode[ioNodeType + 'Nodes'], function(n){
                    var existingEdge = _.find(edges, function(e){
                        if (e[stepIOTargetType] === n && e[oppIOTargetType] === stepNode) return true;
                    });
                    if (existingEdge) return;
                    var newEdge = {};
                    newEdge[stepIOTargetType] = n;
                    newEdge[oppIOTargetType] = stepNode;
                    newEdge.capacity = ioNodeType;
                    edges.push(newEdge);
                });
            }

        });

        return { 'created' : ioNodesCreated, 'matched' : ioNodesMatched };
    }


    function findNextStepsFromIONode(ioNodes){

        var targetPropertyName = parsingOptions.direction === 'output' ? '_target' : '_source';
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

        if (parsingOptions.direction === 'output'){

            var inputNodes = generateIONodesFromStep(step, (level + 1) * 2 - 2, stepNode, 'input');
            var outputNodes = generateIONodesFromStep(step, (level + 1) * 2, stepNode, 'output');

            nodes.push(stepNode);

            processedSteps[stepNode.name] = stepNode;

            _.forEach(findNextStepsFromIONode(outputNodes.created), function(nextStep){
                if (typeof processedSteps[nextStep.name] === 'undefined'){
                    processStepInPath(nextStep, level + 1);
                } else {
                    generateIONodesFromStep(nextStep, (level + 2) * 2 - 2, processedSteps[nextStep.name], 'input');
                }
            });

            return stepNode;
        } else {

            throw new Error("Input-direction drawing not currently supported.");

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
                    if (nextSteps.length > 0) {
                        processStepInPath(nextSteps[0]);
                    }
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

    /************************
     ** Do post-processing **
     ************************/


    
    var graphData = { nodes, edges };

    if (!parsingOptions.showParameters){
        graphData = filterOutParametersFromGraphData(graphData);
    }

    if (!parsingOptions.showReferenceFiles){
        graphData = filterOutReferenceFilesFromGraphData(graphData);
    }

    var sortedNodes = _.sortBy(graphData.nodes, 'column');

    if (typeof parsingOptions.nodesPreSortFxn === 'function'){
        sortedNodes = parsingOptions.nodesPreSortFxn(sortedNodes);
    }

    // Arrange into lists of columns
    var nodesByColumnPairs = _.pairs(_.groupBy(correctColumnAssignments(sortedNodes), 'column'));

    // Add prelim index for each node, over-written in sorting if any.
    nodesByColumnPairs = _.map(nodesByColumnPairs, function(columnGroup){
        _.forEach(columnGroup[1], function(n, i){
            n.origIndexInColumn = i;
        });
        return [ parseInt(columnGroup[0]), columnGroup[1] ];
    });

    // Sort nodes within columns.
    if (typeof parsingOptions.nodesInColumnSortFxn === 'function'){
        nodesByColumnPairs = _.map(nodesByColumnPairs, (columnGroup)=>{
            var nodesInColumn;
            // Sort
            if (Array.isArray(parsingOptions.skipSortOnColumns) && parsingOptions.skipSortOnColumns.indexOf(columnGroup[0]) > -1){
                nodesInColumn = columnGroup[1].slice(0);
            } else {
                nodesInColumn = columnGroup[1].sort(parsingOptions.nodesInColumnSortFxn);
            }

            _.forEach(nodesInColumn, function(n, i){ n.indexInColumn = i; }); // Update w/ new index in column

            // Run post-sort fxn, e.g. to manually re-arrange nodes within columns. If avail.
            if (typeof parsingOptions.nodesInColumnPostSortFxn === 'function'){
                nodesInColumn = parsingOptions.nodesInColumnPostSortFxn(nodesInColumn, columnGroup[0]);
                _.forEach(nodesInColumn, function(n, i){ n.indexInColumn = i; }); // Update w/ new index in column
            }

            return [ columnGroup[0], nodesInColumn ];
        });
    }

    sortedNodes = _.reduce(nodesByColumnPairs, function(m,colPair){
        return m.concat(colPair[1]);
    }, []);

    if (parsingOptions.dontCorrectColumns){
        return { 'nodes' : sortedNodes, 'edges' : graphData.edges };
    }

    return correctColumnAssignments({ 'nodes' : sortedNodes , 'edges' : graphData.edges });

}

/**
 * Use this function to run another function on each node recursively along a path of nodes.
 * See how is used in function correctColumnAssignments.
 * TODO: Create typedef for node Object.
 * 
 * @param {Node}     nextNode               - Current node in path on which fxn is ran on.
 * @param {function} fxn                    - Function to be ran on each node. Is passed a {Object} 'node', {Object} 'previousNode', and {Object[]} 'nextNodes' positional arguments. previousNode will be null when fxn is executed for first time, unless passed in initially.
 * @param {string}   [direction='output']   - One of 'output' or 'input'. Which direction to traverse.
 * @param {Node}     [lastNode=null]        - Optionally supply the initial 'last node' to be included.
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

/**
 * @param {{ nodes : Node[], edges: Edge[] } | Node[] } graphData - Object containing nodes and edges. Or just nodes themselves.
 * @returns {{ nodes : Node[], edges: Edge[] } | Node[] } graphData or nodes with corrected column assignments.
 */
export function correctColumnAssignments(graphData){
    var nodes;
    if (Array.isArray(graphData)) nodes = graphData;
    else if (Array.isArray(graphData.nodes)) nodes = graphData.nodes;
    else throw new Error('No nodes provided.');

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


export function parseBasicIOAnalysisSteps(analysis_steps, workflowItem, parsingOptions){

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
    ], parsingOptions);

}


/** Functions for post-processing, used as defaults but may be overriden. */



/**
 * For when "Show Parameters" UI setting === false.
 *
 * @param {{ nodes : Node[], edges: Edge[] }} graphData - Object containing nodes and edges.
 * @returns {{ nodes : Node[], edges: Edge[] }} Copy of graphData with 'parameter' nodes and edges filtered out.
 */
export function filterOutParametersFromGraphData(graphData){
    var deleted = {  };
    var nodes = _.filter(graphData.nodes, function(n, i){
        if (n.nodeType === 'input' && n.ioType && n.ioType === 'parameter') {
            deleted[n.id] = true;
            return false;
        }
        return true;
    });
    var edges = _.filter(graphData.edges, function(e,i){
        return !(deleted[e.source.id] === true || deleted[e.target.id] === true);
    });
    return { nodes, edges };
}


/**
 * For when "Show Reference Files" UI setting === false.
 *
 * @param {{ nodes : Node[], edges: Edge[] }} graphData - Object containing nodes and edges.
 * @returns {{ nodes : Node[], edges: Edge[] }} Copy of graphData with 'reference file' nodes and edges filtered out.
 */
export function filterOutReferenceFilesFromGraphData(graphData){
    var deleted = {  };
    var nodes = _.filter(graphData.nodes, function(n, i){

        if (n.ioType === 'reference file'){
            deleted[n.id] = true;
            return false;
        }

        return true;
    });
    var edges = _.filter(graphData.edges, function(e,i){
        return !(deleted[e.source.id] === true || deleted[e.target.id] === true);
    });
    return { nodes, edges };
}





/**
 * Use for changing columns of nodes before sorting/arranging within columns.
 * 
 * @param {Node[]} nodes - List of nodes which will be modified before sorting within columns.
 */
export function nodesPreSortFxn(nodes){
    // For any 'global input files', put them in first column (index 0).
    // MODIFIES IN-PLACE! Because it's a fine & performant side-effect if column assignment changes in-place. We may change this later.
    _.forEach(nodes, function(node){
        if (node.nodeType === 'input' && node.meta && node.meta.global && !node.outputOf && node.column !== 0){
            node.column = 0;
        }
    });
    return nodes;
}

/**
 * Used for listOfNodesForColumn.sort(...) to arrange nodes vertically within a column.
 * 
 * @param {Node} node1 - Node A to compare.
 * @param {Node} node2 - Node B to compare.
 * @returns {number} -1, 0, or 1.
 */
export function nodesInColumnSortFxn(node1, node2){

    function isNodeFileReference(n){
        return typeof n.ioType === 'string' && n.ioType === 'reference file';
    }

    function isNodeParameter(n){
        return typeof n.ioType === 'string' && n.ioType === 'parameter';
        //return n.meta.run_data && !n.meta.run_data.file && n.meta.run_data.value && (typeof n.meta.run_data.value === 'string' || typeof n.meta.run_data.value === 'number');
    }

    function getNodeFromListForComparison(nodeList, highestColumn = true){
        if (!Array.isArray(nodeList) || nodeList.length === 0) return null;
        var sortedList = _.sortBy(nodeList.slice(0), function(n){
            return (typeof n.indexInColumn === 'number' ? n.indexInColumn : n.origIndexInColumn);
        });
        sortedList = _.sortBy(sortedList, function(n){ return highestColumn ? -n.column : n.column; });
        return (
            _.find(sortedList, function(n){ return typeof n.indexInColumn === 'number' || typeof n.origIndexInColumn === 'number'; })
            || sortedList[0]
            || null
        );
    }

    function compareNodesBySameColumnIndex(n1, n2){
        if (n1 && !n2) return -1;
        if (!n1 && n2) return 1;
        if (n1 && n2){
            if (n1.column === n2.column){
                var n1idx = typeof n1.indexInColumn === 'number' ? n1.indexInColumn : n1.origIndexInColumn;
                var n2idx = typeof n2.indexInColumn === 'number' ? n2.indexInColumn : n2.origIndexInColumn;
                if (n1idx < n2idx) return -1;
                if (n1idx > n2idx) return 1;
            }
        }
        return 0;
    }

    function compareNodeInputOf(n1, n2){
        var n1InputOf = getNodeFromListForComparison(n1.nodeType === 'step' ? n1.outputNodes : n1.inputOf, false);
        var n2InputOf = getNodeFromListForComparison(n2.nodeType === 'step' ? n2.outputNodes : n2.inputOf, false);

        var ioResult = compareNodesBySameColumnIndex(n1InputOf, n2InputOf);
        if (ioResult !== 0) return ioResult;
        
        if (n1.name === n2.name){
            return 0;
        }
        return (n1.name < n2.name) ? -1 : 1;

    }

    function compareNodeOutputOf(n1, n2){
        var n1OutputOf = n1.nodeType === 'step' ? (n1.inputNodes && getNodeFromListForComparison(n1.inputNodes)) : n1.outputOf;
        var n2OutputOf = n2.nodeType === 'step' ? (n2.inputNodes && getNodeFromListForComparison(n2.inputNodes)) : n2.outputOf;

        if ((n1OutputOf && typeof n1OutputOf.indexInColumn === 'number' && n2OutputOf && typeof n2OutputOf.indexInColumn === 'number')){
            if (n1OutputOf.column === n2OutputOf.column){
                if (n1OutputOf.indexInColumn < n2OutputOf.indexInColumn) return -1;
                if (n1OutputOf.indexInColumn > n2OutputOf.indexInColumn) return 1;
            }
        }
        if ((n1OutputOf && n1OutputOf.name && n2OutputOf && n2OutputOf.name)){
            if (n1OutputOf.name === n2OutputOf.name){

                if (typeof n1.inputOf !== 'undefined' && typeof n2.inputOf === 'undefined'){
                    return -3;
                } else if (typeof n1.inputOf === 'undefined' && typeof n2.inputOf !== 'undefined'){
                    return 3;
                }
                if (n1.name < n2.name) return -1;
                if (n1.name > n2.name) return 1;
                return 0;//compareNodeInputOf(n1, n2);

            }
            return n1OutputOf.name < n2OutputOf.name ? -3 : 3;
        }
        return 0;
    }

    function nonIOStepCompare(n1,n2){ // Fallback
        return 0; // Use order step was given to us in.
    }

    var ioResult;

    if (node1.nodeType === 'step' && node2.nodeType === 'step'){

        if (node1.inputNodes && !node2.inputNodes) return -1;
        if (!node1.inputNodes && node2.inputNodes) return 1;
        if (node1.inputNodes && node2.inputNodes){
            ioResult = compareNodesBySameColumnIndex(
                getNodeFromListForComparison(node1.inputNodes),
                getNodeFromListForComparison(node2.inputNodes)
            );
            console.log(node1, node2, ioResult, _.clone(getNodeFromListForComparison(node1.inputNodes)), _.clone(getNodeFromListForComparison(node2.inputNodes)));
            if (ioResult !== 0) return ioResult;
        }
        
        return nonIOStepCompare(node1,node2);
    }
    if (node1.nodeType === 'output' && node2.nodeType === 'input'){
        return -1;
    } else if (node1.nodeType === 'input' && node2.nodeType === 'output'){
        return 1;
    }

    // Groups go to bottom always. For now.
    if (node1.nodeType === 'input-group' && node2.nodeType !== 'input-group'){
        return 1;
    } else if (node1.nodeType !== 'input-group' && node2.nodeType === 'input-group'){
        return -1;
    }

    if (node1.nodeType === node2.nodeType){

        if (node1.nodeType === 'output'){
            ioResult = compareNodeOutputOf(node1, node2);
            return ioResult;
        }

        if (node1.nodeType === 'input'){
            if (isNodeParameter(node1) && isNodeParameter(node2)){
                return compareNodeInputOf(node1, node2);
            }
            else if (isNodeParameter(node1)) return 5;
            else if (isNodeParameter(node2)) return -5;

            if (isNodeFileReference(node1)){
                if (isNodeFileReference(node2)) {
                    //return 0;
                    //...continue
                } else {
                    return 7;
                }
            } else if (isNodeFileReference(node2)) {
                return -7;
            }

            ioResult = compareNodeInputOf(node1, node2);
            return ioResult;
        }
    }

    return  0;

}

export function nodesInColumnPostSortFxn(nodesInColumn, columnNumber){
    var groupNodes = _.filter(nodesInColumn, { 'nodeType' : 'input-group' });
    if (groupNodes.length > 0){
        _.forEach(groupNodes, function(gN){
            var relatedFileSource = _.find(gN._source, function(s){ return typeof s.grouped_by === 'undefined' && typeof s.name === 'string' && s.for_file; });
            var relatedFileNode = relatedFileSource && _.find(nodesInColumn, function(n){
                if (n && n.meta && n.meta.run_data && n.meta.run_data.file && (n.meta.run_data.file.uuid || n.meta.run_data.file) === (relatedFileSource.for_file || 'x') ){
                    return true;
                }
                return false;
            });
            if (relatedFileNode){
                // Re-arrange group node to be closer to its relation.
                var oldIdx = nodesInColumn.indexOf(gN);
                nodesInColumn.splice(oldIdx, 1);
                var afterThisIdx = nodesInColumn.indexOf(relatedFileNode);
                nodesInColumn.splice(afterThisIdx + 1, 0, gN);
            }
        });
    }
    
    if (nodesInColumn.length > 2 && _.every(nodesInColumn, function(n){ return n.nodeType === 'step'; })){
        // If all step nodes, move those with more inputs toward the middle.
        var nodesByNumberOfInputs = _.groupBy(nodesInColumn.slice(0), function(n){ return n.inputNodes.length; });
        var inputCounts = _.keys(nodesByNumberOfInputs).map(function(num){ return parseInt(num); }).sort();
        if (inputCounts.length > 1){ // If any step nodes which have more inputs than others.
            inputCounts.reverse().pop();
            //console.log('INPUTCOUNTS', inputCounts, nodesByNumberOfInputs);
            var popped, nodesToCenter, middeIndex;
            while (inputCounts.length > 0){ // In low->high # of inputs (after first lowest)
                popped = inputCounts.pop();
                nodesToCenter = nodesByNumberOfInputs[popped + ''];

                _.forEach(nodesToCenter, function(nodeToCenter){ // Remove these nodes
                    var oldIdx = nodesInColumn.indexOf(nodeToCenter);
                    nodesInColumn.splice(oldIdx, 1);
                });

                middeIndex = Math.floor(nodesInColumn.length / 2); // Re-add them in middle of remaining nodes.
                nodesInColumn.splice(middeIndex, 0, ...nodesToCenter);
            }
            
            
        }
    }

    /* TODO: later
    if (columnNumber === 0){
        var firstReferenceIndex = _.findIndex(nodesInColumn, function(n){ return n.ioType === 'reference file'; });
        if (firstReferenceIndex > -1){
            nodesInColumn.splice(firstReferenceIndex, 0, {
                'nodeType' : 'spacer',
                'column' : 0,
                'id' : 'spacer1'
            },{
                'nodeType' : 'spacer',
                'column' : 0,
                'id' : 'spacer2'
            });
        }
    }
    */
    
    return nodesInColumn;
}
