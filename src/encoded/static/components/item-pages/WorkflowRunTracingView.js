import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Checkbox, Button } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout } from './../util';
import { WorkflowNodeElement, TabbedView, WorkflowDetailPane } from './components';
import DefaultItemView from './DefaultItemView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps, DEFAULT_PARSING_OPTIONS } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { commonGraphPropsFromProps, RowSpacingTypeDropdown, WorkflowGraphSectionControls, WorkflowGraphSection, checkIfIndirectOrReferenceNodesExist } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';
import moment from 'moment';
import ReactTooltip from 'react-tooltip';

// Testing / Dummy data
var _testing_data;
//import * as dummyFile from './../testdata/file-processed-4DNFIYIPFFUA-with-graph';
//import { dummy_analysis_steps } from './../testdata/steps-for-e28632be-f968-4a2d-a28e-490b5493bdc2';
//import { HISTORY } from './../testdata/traced_workflow_runs/file_processed-4DN';
//import { PARTIALLY_RELEASED_PROCESSED_FILES, PARTIALLY_RELEASED_PROCESSED_FILES_ALL_RUNS } from './../testdata/traced_workflow_runs/replicate-4DNESLLTENG9';
//import { ALL_RUNS } from './../testdata/traced_workflow_runs/files-processed-4DNFI18UHVRO';
//import { STEPS } from './../testdata/traced_workflow_runs/replicate-4DNESXZ4FW4T';
//import { STEPS } from './../testdata/traced_workflow_runs/replicate-4DNES9L4AK6Q';
//_testing_data = STEPS;


export function allFilesForWorkflowRunsMappedByUUID(items){
    return _.reduce(items, function(m, workflowRun){
        return _.extend(m, allFilesForWorkflowRunMappedByUUID(workflowRun));
    }, {});
}


export function isGraphSectionOpen(href, hash){
    if (!href || typeof href !== 'string') return false;
    if (typeof hash !== 'string' || !hash){
        var parts = url.parse(href);
        hash = parts.hash;
    }
    
    if (typeof hash === 'string' && hash && hash.length > 1) return true;
    return false;
}


export class WorkflowRunTracingView extends DefaultItemView {
    
    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.handleToggleAllRuns = this.handleToggleAllRuns.bind(this);
        this.tabbedView = this.tabbedView.bind(this);
        var steps = _testing_data || null;
        this.state = {
            'mounted' : false,
            'steps' : steps,
            'allRuns' : false,
            'loadingGraphSteps' : false
        };
    }

    componentDidMount(){
        var nextState = { 'mounted' : true };

        if (!this.state.steps){
            nextState.loadingGraphSteps = true;
            this.loadGraphSteps();
        }
        this.setState(nextState);
    }

    componentDidUpdate(pastProps, pastState){
        if (this.props.context !== pastProps.context && !_testing_data){
            console.info('Updated WorkflowRunTracingView -- re-loading steps.');
            this.setState({ 'steps' : null, 'loadingGraphSteps' : true }, () => this.loadGraphSteps() );
        }
    }

    loadGraphSteps(force = false, cb = null, cache = false){
        var context = this.props.context;
        if (typeof context.uuid !== 'string') return;
        if (!force && Array.isArray(this.state.steps) && this.state.steps.length > 0) return;
        if (
            !force && (
                Array.isArray(context['@type']) && _.contains(context['@type'], 'ExperimentSet') // If ExpSet or Exp, don't do if no processed files
                && (!Array.isArray(context.processed_files) || context.processed_files.length === 0)
            ) || (
                Array.isArray(context['@type']) && _.contains(context['@type'], 'File') // If File, don't do if not output of a workflow_run.
                && (!(Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0))
            )
        ) return;

        var callback = function(r){
            requestAnimationFrame(()=>{
                if (Array.isArray(r) && r.length > 0){
                    this.setState({ 'steps' : r, 'loadingGraphSteps' : false }, cb);
                } else {
                    this.setState({ 'steps' : 'ERROR', 'loadingGraphSteps' : false }, cb);
                }
            });
        }.bind(this);

        var tracingHref = '/trace_workflow_run_steps/' + this.props.context.uuid + '/';
        var opts = {};
        if (!cache) {
            opts['timestamp'] = moment.utc().unix();
        }
        if (this.state.allRuns === true){
            opts['all_runs'] = true;
        }
        if (_.keys(opts).length > 0){
            tracingHref += '?' + _.map(_.pairs(opts), function(p){ return p[0] + '=' + p[1]; }).join('&');
        }

        ajax.load(tracingHref, callback, 'GET', callback);
    }

    handleToggleAllRuns(){
        this.setState({ 'allRuns' : !this.state.allRuns, 'loadingGraphSteps' : true }, ()=>{
            this.loadGraphSteps(true);
        });
    }

    tabbedView(){
        return <TabbedView contents={this.getTabViewContents} ref="tabbedView" />;
    }

}

export class TracedGraphSectionControls extends WorkflowGraphSectionControls {
    indirectFilesCheckbox(){
        if (typeof this.props.showIndirectFiles !== 'boolean' || typeof this.props.onToggleIndirectFiles !== 'function') return null;
        return (
            <div className="inline-block checkbox-container" key="show-indirect-files-checkbox">
                <Checkbox checked={this.props.showIndirectFiles} onChange={this.props.onToggleIndirectFiles} disabled={this.props.isShowMoreContextCheckboxDisabled}>
                    Show More Context
                </Checkbox>
            </div>
        );
    }
    allRunsCheckbox(){
        if (typeof this.props.allRuns !== 'boolean' || typeof this.props.onToggleAllRuns !== 'function') return null;
        return (
            <div className="inline-block checkbox-container" key="show-all-runs-checkbox">
                <Checkbox checked={!this.props.allRuns && !this.props.isAllRunsCheckboxDisabled} onChange={this.props.onToggleAllRuns} disabled={this.props.isAllRunsCheckboxDisabled}>
                    { this.props.loading ? <i className="icon icon-spin icon-fw icon-circle-o-notch" style={{ marginRight : 3 }}/> : '' } Collapse Similar Runs
                </Checkbox>
            </div>
        );
    }
    render(){
        return this.wrapper(this.referenceFilesCheckbox(), this.indirectFilesCheckbox(), /*this.parametersCheckbox(),*/ this.allRunsCheckbox(), this.rowSpacingTypeDropdown());
    }
}

export class FileViewGraphSection extends WorkflowGraphSection {
    
    static getTabObject(parentItemViewProps, parentItemViewState, onToggleAllRuns){
        var { loadingGraphSteps, steps, mounted, allRuns } = parentItemViewState;
        var { context } = parentItemViewProps;

        var iconClass = "icon icon-fw icon-";
        var tooltip = null;
        if (steps === null || loadingGraphSteps){
            iconClass += 'circle-o-notch icon-spin';
            tooltip = "Graph is loading";
        } else if (!Array.isArray(steps) || steps.length === 0) {
            iconClass += 'times';
            tooltip = "Graph currently not available for this file. Please check back later.";
        } else {
            iconClass += 'sitemap icon-rotate-90';
        }
        var parts = url.parse(parentItemViewProps.href);
        var hash = (parts.hash && parts.hash.length > 1 && parts.hash.slice(1)) || null;
        return {
            'tab'       : <span data-tip={tooltip} className="inline-block"><i className={iconClass} /> Graph</span>,
            'key'       : 'graph-section',
            'disabled'  : !Array.isArray(steps) || steps.length === 0,
            'isDefault' : isGraphSectionOpen(parentItemViewProps.href, hash),
            'content'   : (
                <FileViewGraphSection
                    {...parentItemViewProps}
                    steps={steps}
                    mounted={mounted}
                    key={"graph-for-" + context.uuid}
                    onToggleAllRuns={onToggleAllRuns}
                    allRuns={allRuns}
                    loading={loadingGraphSteps}
                    urlHash={hash}
                />
            )
        };
    }

    static isNodeDisabled(node){
        if (node.nodeType === 'step') return false;
        if (WorkflowNodeElement.doesRunDataExist(node)) return false;
        return true;
    }

    static isNodeCurrentContext(node, context){
        if (node.nodeType !== 'input' && node.nodeType !== 'output') return false;
        return (
            context && typeof context.accession === 'string' && node.meta.run_data && node.meta.run_data.file
            && typeof node.meta.run_data.file !== 'string' && !Array.isArray(node.meta.run_data.file)
            && typeof node.meta.run_data.file.accession === 'string'
            && node.meta.run_data.file.accession === context.accession
        ) || false;
    }

    constructor(props){
        super(props);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.onToggleIndirectFiles      = _.throttle(this.onToggleIndirectFiles.bind(this), 250);
        this.onToggleReferenceFiles     = _.throttle(this.onToggleReferenceFiles.bind(this), 250);
        this.onToggleAllRuns            = _.throttle(this.onToggleAllRuns.bind(this), 1000);
        this.isNodeCurrentContext = this.isNodeCurrentContext.bind(this);
        this.render = this.render.bind(this);
        this.state = _.extend({
            'showChart' : 'detail',
            'showIndirectFiles' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'stacked',
            'fullscreenViewEnabled' : false,
            'showParameters' : false,
            'anyIndirectPathIONodes' : true, // Overriden
            'anyReferenceFileNodes' : true // Overriden
        }, checkIfIndirectOrReferenceNodesExist(props.steps));
    }

    componentWillReceiveProps(nextProps){
        if (this.props.steps !== nextProps.steps){
            this.setState(checkIfIndirectOrReferenceNodesExist(nextProps.steps));
        }
    }

    isNodeCurrentContext(node){
        return FileViewGraphSection.isNodeCurrentContext(node, this.props.context);
    }

    commonGraphProps(){

        var steps = this.props.steps;

        var parsingOptions = _.extend(
            {}, DEFAULT_PARSING_OPTIONS, _.pick(this.state, 'showReferenceFiles', 'showParameters', 'showIndirectFiles')
        );

        var legendItems = _.clone(WorkflowDetailPane.Legend.defaultProps.items);

        var graphData = parseAnalysisSteps(this.props.steps, parsingOptions);

        if (!this.state.showParameters){
            delete legendItems['Input Parameter']; // Remove legend items which aren't relevant for this context.
        }

        this.anyGroupNodesExist = !this.props.allRuns && _.any(graphData.nodes, function(n){ return n.nodeType === 'input-group' || n.nodeType === 'output-group'; });

        if (!this.state.showReferenceFiles || !this.state.anyReferenceFileNodes){
            delete legendItems['Input Reference File'];
        }
        if (!this.anyGroupNodesExist || this.props.all_runs){
            delete legendItems['Group of Similar Files'];
        }
        var fileMap = allFilesForWorkflowRunsMappedByUUID(
            (this.props.context.workflow_run_outputs || []).concat(this.props.context.workflow_run_inputs || [])
        );
        var nodes = mapEmbeddedFilesToStepRunDataIDs( graphData.nodes, fileMap );

        return _.extend(commonGraphPropsFromProps(_.extend({ legendItems }, this.props)), {
            'isNodeDisabled'        : FileViewGraphSection.isNodeDisabled,
            'nodes'                 : nodes,
            'edges'                 : graphData.edges,
            'columnSpacing'         : 100, //graphData.edges.length > 40 ? (graphData.edges.length > 80 ? 270 : 180) : 90,
            'rowSpacingType'        : this.state.rowSpacingType,
            'isNodeCurrentContext'  : (typeof this.props.isNodeCurrentContext === 'function' && this.props.isNodeCurrentContext) || this.isNodeCurrentContext

        });
    }

    onToggleIndirectFiles(){
        this.setState({ 'showIndirectFiles' : !this.state.showIndirectFiles });
    }

    onToggleAllRuns(){
        return this.props.onToggleAllRuns();
    }

    render(){
        var graphProps = Array.isArray(this.props.steps) ? this.commonGraphProps() : null,
            isReferenceFilesCheckboxDisabled = !this.state.anyReferenceFileNodes,
            isAllRunsCheckboxDisabled = this.props.loading || (!this.props.allRuns && !this.anyGroupNodesExist ? true : false),
            isShowMoreContextCheckboxDisabled = !this.state.showIndirectFiles && !this.state.anyIndirectPathIONodes;

        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart) + (this.state.fullscreenViewEnabled ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <TracedGraphSectionControls
                        {...this.state} {..._.pick(this.props, 'allRuns', 'onToggleAllRuns')} loading={this.props.loadingGraphSteps}
                        onToggleReferenceFiles={this.onToggleReferenceFiles} onToggleIndirectFiles={this.onToggleIndirectFiles}
                        onChangeRowSpacingType={this.onChangeRowSpacingType} onToggleFullScreenView={this.onToggleFullScreenView} onToggleShowParameters={this.onToggleShowParameters}
                        isAllRunsCheckboxDisabled={isAllRunsCheckboxDisabled} isShowMoreContextCheckboxDisabled={isShowMoreContextCheckboxDisabled} isReferenceFilesCheckboxDisabled={isReferenceFilesCheckboxDisabled} />
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="graph-wrapper" style={{ opacity : this.props.loading ? 0.33 : 1 }} children={graphProps ? <Graph { ...graphProps } /> : null} />
            </div>
        );

    }

}