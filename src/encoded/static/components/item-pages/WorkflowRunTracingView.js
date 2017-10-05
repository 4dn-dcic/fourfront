import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Checkbox, Button } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout } from './../util';
import { WorkflowNodeElement, TabbedView } from './components';
import { ItemBaseView } from './DefaultItemView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { commonGraphPropsFromProps, RowSpacingTypeDropdown, WorkflowGraphSectionControls, WorkflowGraphSection, filterOutParametersFromGraphData } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';
import moment from 'moment';
import ReactTooltip from 'react-tooltip';

// Testing / Dummy data
//import * as dummyFile from './../testdata/file-processed-4DNFIYIPFFUA-with-graph';
//import { dummy_analysis_steps } from './../testdata/steps-for-e28632be-f968-4a2d-a28e-490b5493bdc2';
//import { MORE_PARTIALLY_RELEASED_PROCESSED_FILES } from './../testdata/traced_workflow_runs/replicate-4DNESLLTENG9';
//import { HISTORY } from './../testdata/traced_workflow_runs/file_processed-4DN';


export function allFilesForWorkflowRunsMappedByUUID(items){
    return _.reduce(items, function(m, workflowRun){
        return _.extend(m, allFilesForWorkflowRunMappedByUUID(workflowRun));
    }, {});
}


export function filterOutIndirectFilesFromGraphData(graphData){
    var deleted = {  };
    var nodes = _.filter(graphData.nodes, function(n, i){
        if (n.type === 'input' || n.type === 'output'){
            if (n && n.meta && n.meta.in_path === true){
                return true;
            }
            deleted[n.id] = true;
            return false;
        }
        return true;
    });
    var edges = _.filter(graphData.edges, function(e,i){
        if (deleted[e.source.id] === true || deleted[e.target.id] === true) {
            return false;
        }
        return true;
    });
    return { nodes, edges };
}

export function filterOutReferenceFilesFromGraphData(graphData){
    var deleted = {  };
    var nodes = _.filter(graphData.nodes, function(n, i){

        if (n && n.meta && n.meta.run_data && n.meta.run_data.file && Array.isArray(n.meta.run_data.file['@type'])){

            if (n.meta.run_data.file['@type'].indexOf('FileReference') > -1) {
                deleted[n.id] = true;
                return false;
            }

        }

        return true;
    });
    var edges = _.filter(graphData.edges, function(e,i){
        if (deleted[e.source.id] === true || deleted[e.target.id] === true) {
            return false;
        }
        return true;
    });
    return { nodes, edges };
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


export class WorkflowRunTracingView extends ItemBaseView {
    
    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.handleToggleAllRuns = this.handleToggleAllRuns.bind(this);
        this.tabbedView = this.tabbedView.bind(this);
        //var steps = HISTORY;
        var steps = null;
        this.state = {
            'mounted' : false,
            'steps' : steps,
            'allRuns' : false,
            'loading' : false
        };
    }

    componentDidMount(){

        var changeTabToGraphSectionIfHaveHash = function(){
            if (isGraphSectionOpen(this.props.href)){
                if (this.refs.tabbedView && this.refs.tabbedView.refs && this.refs.tabbedView.refs.tabs && typeof this.refs.tabbedView.refs.tabs.setActiveKey === 'function'){
                    try {
                        this.refs.tabbedView.refs.tabs.setActiveKey(TabbedView.getDefaultActiveKeyFromContents(this.getTabViewContents()));
                    } catch (e) {
                        console.warn('Could not automatically switch tabs to Graph section, perhaps no longer supported by rc-tabs.');
                    }
                }
            }
        }.bind(this);

        var state = { 'mounted' : true };
        if (!this.state.steps){
            state.loading = true;
            this.loadGraphSteps();
        }
        this.setState(state, function(){ setTimeout(changeTabToGraphSectionIfHaveHash, 750); });
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
                    this.setState({ 'steps' : r, 'loading' : false }, cb);
                } else {
                    this.setState({ 'steps' : 'ERROR', 'loading' : false }, cb);
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
        this.setState({ 'allRuns' : !this.state.allRuns, 'loading' : true }, ()=>{
            this.loadGraphSteps(true);
        });
    }

    tabbedView(){
        return <TabbedView contents={this.getTabViewContents} ref="tabbedView" />;
    }

}

export class TracedGraphSectionControls extends WorkflowGraphSectionControls {
    render(){
        var {
            showReferenceFiles, onToggleReferenceFiles, showIndirectFiles, onToggleIndirectFiles, showParameters, onToggleParameters,
            allRuns, onToggleAllRuns, loading, isAllRunsCheckboxDisabled, rowSpacingType, onSetRowSpacingType, fullscreenViewEnabled, onToggleFullScreenView
        } = this.props;
        return (
            <div className="workflow-view-controls-container">
                
                { typeof showReferenceFiles === 'boolean' && typeof onToggleReferenceFiles === 'function' ?
                    <div className="inline-block show-params-checkbox-container">
                        <Checkbox checked={showReferenceFiles} onChange={onToggleReferenceFiles}>
                            Show Reference Files
                        </Checkbox>
                    </div>
                : null }

                { typeof showIndirectFiles === 'boolean' && typeof onToggleIndirectFiles === 'function' ?
                    <div className="inline-block show-params-checkbox-container">
                        <Checkbox checked={showIndirectFiles} onChange={onToggleIndirectFiles}>
                            Show More Context
                        </Checkbox>
                    </div>
                : null }

                { this.showParameters() }
                
                { typeof allRuns === 'boolean' ?
                    <div className="inline-block show-params-checkbox-container">
                        <Checkbox checked={!allRuns && !isAllRunsCheckboxDisabled} onChange={onToggleAllRuns} disabled={isAllRunsCheckboxDisabled}>
                        { loading ? <i className="icon icon-spin icon-fw icon-circle-o-notch" style={{ marginRight : 3 }}/> : '' } Collapse Similar Runs
                        </Checkbox>
                    </div>
                : null }

                { this.rowSpacingTypeDropdown() }
                { this.fullScreenButton() }
            </div>
        );
    }
}

export class FileViewGraphSection extends WorkflowGraphSection {
    
    static getTabObject(props, state, onToggleAllRuns){
        var { loading, steps, mounted, allRuns } = state;
        var { context } = props;

        var iconClass = "icon icon-fw icon-";
        var tooltip = null;
        if (steps === null || loading){
            iconClass += 'circle-o-notch icon-spin';
            tooltip = "Graph is loading";
        } else if (!Array.isArray(steps) || steps.length === 0) {
            iconClass += 'times';
            tooltip = "Graph currently not available for this file. Please check back later.";
        } else {
            iconClass += 'code-fork';
        }
        var parts = url.parse(props.href);
        var hash = (parts.hash && parts.hash.length > 1 && parts.hash.slice(1)) || null;
        return {
            tab : <span data-tip={tooltip} className="inline-block"><i className={iconClass} /> Graph</span>,
            key : 'graph',
            disabled : !Array.isArray(steps) || steps.length === 0,
            isDefault : isGraphSectionOpen(props.href, hash),
            content : <FileViewGraphSection
                {...props}
                steps={steps}
                mounted={mounted}
                key={"graph-for-" + context.uuid}
                onToggleAllRuns={onToggleAllRuns}
                allRuns={allRuns}
                loading={loading}
                urlHash={hash}
            />
        };
    }

    static isNodeDisabled(node){
        if (node.type === 'step') return false;
        if (node && node.meta && node.meta.run_data){
            return false;
        }
        return true;
    }

    static isNodeCurrentContext(node, context){
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
        this.onToggleIndirectFiles = this.onToggleIndirectFiles.bind(this);
        this.onToggleReferenceFiles = this.onToggleReferenceFiles.bind(this);
        this.onToggleAllRuns = _.throttle(this.onToggleAllRuns.bind(this), 1000);
        this.onChangeRowSpacingType = this.onChangeRowSpacingType.bind(this);
        this.onToggleFullScreenView = this.onToggleFullScreenView.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : 'detail',
            'showIndirectFiles' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'stacked',
            'fullscreenViewEnabled' : false,
            'showParameters' : false
        };
    }

    commonGraphProps(){

        var steps = this.props.steps;
        
        var graphData = parseAnalysisSteps(this.props.steps);
        if (!this.state.showParameters){
            graphData = filterOutParametersFromGraphData(graphData);
        }

        this.anyGroupNodesExist = !this.props.allRuns && _.any(graphData.nodes, function(n){ return n.type === 'input-group' || n.type === 'output-group'; });

        //var graphData = this.parseAnalysisSteps(); // Object with 'nodes' and 'edges' props.
        if (!this.state.showIndirectFiles){
            graphData = filterOutIndirectFilesFromGraphData(graphData);
        }
        if (!this.state.showReferenceFiles){
            graphData = filterOutReferenceFilesFromGraphData(graphData);
        }
        var fileMap = allFilesForWorkflowRunsMappedByUUID(
            (this.props.context.workflow_run_outputs || []).concat(this.props.context.workflow_run_inputs || [])
        );
        var nodes = mapEmbeddedFilesToStepRunDataIDs( graphData.nodes, fileMap );
        return _.extend(commonGraphPropsFromProps(this.props), {
            'isNodeDisabled' : FileViewGraphSection.isNodeDisabled,
            'nodes' : nodes,
            'edges' : graphData.edges,
            'columnSpacing' : 100, //graphData.edges.length > 40 ? (graphData.edges.length > 80 ? 270 : 180) : 90,
            'rowSpacingType' : this.state.rowSpacingType,
            'nodeElement' : <WorkflowNodeElement />,
            'isNodeCurrentContext' : (typeof this.props.isNodeCurrentContext === 'function' && this.props.isNodeCurrentContext) || (node => FileViewGraphSection.isNodeCurrentContext(node, this.props.context))

        });
    }

    onToggleIndirectFiles(){
        this.setState({ 'showIndirectFiles' : !this.state.showIndirectFiles });
    }

    onToggleReferenceFiles(){
        this.setState({ 'showReferenceFiles' : !this.state.showReferenceFiles });
    }

    onToggleAllRuns(){
        return this.props.onToggleAllRuns();
    }

    render(){
        var graphProps = null;
        if (Array.isArray(this.props.steps)){
            graphProps = this.commonGraphProps();
        }
        var isAllRunsCheckboxDisabled = this.props.loading || (!this.props.allRuns && !this.anyGroupNodesExist ? true : false);

        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart) + (this.state.fullscreenViewEnabled ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <TracedGraphSectionControls
                        {...this.state}
                        {..._.pick(this.props, 'allRuns', 'onToggleAllRuns', 'loading')}
                        onToggleReferenceFiles={this.onToggleReferenceFiles}
                        onToggleIndirectFiles={this.onToggleIndirectFiles}
                        onChangeRowSpacingType={this.onChangeRowSpacingType}
                        onToggleFullScreenView={this.onToggleFullScreenView}
                        onToggleShowParameters={this.onToggleShowParameters}
                        isAllRunsCheckboxDisabled={isAllRunsCheckboxDisabled}
                    />
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="graph-wrapper" style={{ opacity : this.props.loading ? 0.33 : 1 }}>
                    { graphProps ? <Graph { ...graphProps } /> : null }
                </div>
            </div>
        );

    }

}