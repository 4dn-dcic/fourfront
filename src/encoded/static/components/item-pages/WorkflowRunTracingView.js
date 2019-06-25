import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, ajax } from './../util';
import { WorkflowNodeElement } from './components/WorkflowNodeElement';
import { WorkflowDetailPane } from './components/WorkflowDetailPane';
import { WorkflowGraphSectionControls } from './components/WorkflowGraphSectionControls';
import DefaultItemView from './DefaultItemView';
import Graph, { parseAnalysisSteps, DEFAULT_PARSING_OPTIONS } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { commonGraphPropsFromProps, WorkflowGraphSection, checkIfIndirectOrReferenceNodesExist } from './WorkflowView';
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
//import { STEPS } from './../testdata/traced_workflow_runs/replicate-4DNESXZ4FW4T-2';
//import { STEPS } from './../testdata/traced_workflow_runs/replicate-4DNES9L4AK6Q';
//import { STEPS } from './../testdata/traced_workflow_runs/replicate-4DNESXKBPZKQ';
//import { STEPS } from './../testdata/traced_workflow_runs/4DNESIQ6IPCO';
//_testing_data = STEPS;


export function allFilesForWorkflowRunsMappedByUUID(items){
    return _.reduce(items, function(m, workflowRun){
        return _.extend(m, allFilesForWorkflowRunMappedByUUID(workflowRun));
    }, {});
}


export default class WorkflowRunTracingView extends DefaultItemView {

    constructor(props){
        super(props);
        this.shouldGraphExist = this.shouldGraphExist.bind(this);
        this.handleToggleAllRuns = this.handleToggleAllRuns.bind(this);
        var steps = _testing_data || null;
        this.state = {
            'mounted' : false,
            'steps' : steps,
            'allRuns' : false,
            'loadingGraphSteps' : false
        };
    }

    componentDidMount(){
        super.componentDidMount(...arguments); // DefaultItem's this.maybeSetRedirectedAlert()
        var nextState = { 'mounted' : true };
        if (!this.state.steps){
            // Will always evaluate unless are using _testing_data to override.
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

    shouldGraphExist(){
        return true;
    }

    loadGraphSteps(force = false, cb = null, cache = false){
        const { context } = this.props;
        const { steps } = this.state;

        if (typeof context.uuid !== 'string') return;
        if (!this.shouldGraphExist()) return;
        if (!force && Array.isArray(steps) && steps.length > 0) return;

        var tracingHref = '/trace_workflow_run_steps/' + context.uuid + '/',
            callback = (r) => {
                requestAnimationFrame(()=>{
                    if (Array.isArray(r) && r.length > 0){
                        this.setState({ 'steps' : r, 'loadingGraphSteps' : false }, cb);
                    } else {
                        this.setState({ 'steps' : 'ERROR', 'loadingGraphSteps' : false }, cb);
                    }
                });
            },
            opts = {};

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
        this.setState(function({ allRuns }){
            return { 'allRuns' : !allRuns, 'loadingGraphSteps' : true };
        }, () => { this.loadGraphSteps(true); });
    }
}


export class FileViewGraphSection extends WorkflowGraphSection {

    /**
     * Returns tab object representation for Graph section.
     * Used by any ItemView which loads provenance graph steps into its state.steps.
     *
     * @param {Object} props - All props from parent Item view.
     * @param {Object} state - All properties from parent Item view state.
     * @param {!Object[]} state.steps - Steps of provenance graph, AJAXed-in by parent Item view.
     * @param {boolean} state.mounted - Whether parent component/view has been mounted yet.
     * @param {boolean} state.allRuns - Whether 'all runs' (vs grouped runs) are currently being loaded.
     * @param {boolean} state.loadingGraphSteps - Whether steps are currently being loaded.
     * @param {function} onToggleAllRuns - Callback function passed from parent Item view. Called when 'toggle all runs' checkbox is changed.
     * @returns {{ tab: JSX.Element, key: string, disabled?: boolean, isDefault?: boolean, content: JSX.Element }} Tab object
     */
    static getTabObject(props, state, onToggleAllRuns, width){
        const { loadingGraphSteps, steps } = state;
        const { context } = props;
        let iconClass = "icon icon-fw icon-";
        let tooltip = null;

        if (steps === null || loadingGraphSteps){
            iconClass += 'circle-o-notch icon-spin';
            tooltip = "Graph is loading";
        } else if (!Array.isArray(steps) || steps.length === 0) {
            iconClass += 'times';
            tooltip = "Graph currently not available for this file. Please check back later.";
        } else {
            iconClass += 'sitemap icon-rotate-90';
        }

        return {
            'tab'       : <span data-tip={tooltip} className="inline-block"><i className={iconClass} /> Provenance</span>,
            'key'       : 'graph-section',
            'disabled'  : !Array.isArray(steps) || steps.length === 0,
            'content'   : (
                <FileViewGraphSection {...props} {..._.pick(state, 'steps', 'mounted', 'allRuns')} width={width}
                    key={"graph-for-" + context.uuid} onToggleAllRuns={onToggleAllRuns} loading={loadingGraphSteps} />
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
        this.commonGraphProps           = this.commonGraphProps.bind(this);
        this.onToggleIndirectFiles      = _.throttle(this.onToggleIndirectFiles.bind(this), 250);
        this.onToggleReferenceFiles     = _.throttle(this.onToggleReferenceFiles.bind(this), 250);
        this.onToggleAllRuns            = _.throttle(this.onToggleAllRuns.bind(this), 1000);
        this.isNodeCurrentContext       = this.isNodeCurrentContext.bind(this);
        this.state = _.extend({
            'showChart' : 'detail',
            'showIndirectFiles' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'stacked',
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
        var { steps, allRuns } = this.props,
            parsingOptions = _.extend(
                {}, DEFAULT_PARSING_OPTIONS, _.pick(this.state, 'showReferenceFiles', 'showParameters', 'showIndirectFiles')
            ),
            legendItems = _.clone(WorkflowDetailPane.Legend.defaultProps.items),
            graphData   = parseAnalysisSteps(steps, parsingOptions);

        if (!this.state.showParameters){
            delete legendItems['Input Parameter']; // Remove legend items which aren't relevant for this context.
        }

        this.anyGroupNodesExist = !allRuns && _.any(graphData.nodes, function(n){
            return n.nodeType === 'input-group' || n.nodeType === 'output-group';
        });

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
        this.setState(function({ showIndirectFiles }){
            return { "showIndirectFiles" : !showIndirectFiles };
        });
    }

    onToggleAllRuns(){
        return this.props.onToggleAllRuns();
    }

    render(){
        const { steps, loadingGraphSteps, isFullscreen, allRuns, loading } = this.props;
        const { showIndirectFiles, anyIndirectPathIONodes, anyReferenceFileNodes, showChart } = this.state;
        const graphProps = Array.isArray(steps) ? this.commonGraphProps() : null;
        const isReferenceFilesCheckboxDisabled = !anyReferenceFileNodes;
        const isAllRunsCheckboxDisabled = loading || (!allRuns && !this.anyGroupNodesExist ? true : false);
        const isShowMoreContextCheckboxDisabled = !showIndirectFiles && !anyIndirectPathIONodes;

        return (
            <div className={"tabview-container-fullscreen-capable workflow-view-container workflow-viewing-" + (showChart) + (isFullscreen ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <WorkflowGraphSectionControls
                        {...this.state} {..._.pick(this.props, 'allRuns', 'onToggleAllRuns', 'windowWidth', 'isFullscreen')}
                        enabledControls={['referenceFilesCheckbox', 'indirectFilesCheckbox', 'allRunsCheckbox', 'rowSpacingTypeDropdown']}
                        loading={loadingGraphSteps}
                        onToggleReferenceFiles={this.onToggleReferenceFiles} onToggleIndirectFiles={this.onToggleIndirectFiles}
                        onChangeRowSpacingType={this.onChangeRowSpacingType} onToggleFullScreenView={this.onToggleFullScreenView} onToggleShowParameters={this.onToggleShowParameters}
                        isAllRunsCheckboxDisabled={isAllRunsCheckboxDisabled} isShowMoreContextCheckboxDisabled={isShowMoreContextCheckboxDisabled} isReferenceFilesCheckboxDisabled={isReferenceFilesCheckboxDisabled} />
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="graph-wrapper" style={{ opacity : this.props.loading ? 0.33 : 1 }}>
                    { graphProps ? <Graph { ...graphProps } /> : null }
                </div>
            </div>
        );

    }

}