import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { format } from "date-fns";
import ReactTooltip from 'react-tooltip';

import { console, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { requestAnimationFrame as raf } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';

import Graph from '@hms-dbmi-bgm/react-workflow-viz';

import { WorkflowNodeElement } from './components/WorkflowNodeElement';
import { WorkflowDetailPane } from './components/WorkflowDetailPane';
import { WorkflowGraphSectionControls } from './components/WorkflowGraphSectionControls';
import DefaultItemView from './DefaultItemView';

import { commonGraphPropsFromProps, WorkflowGraphSection, checkIfIndirectOrReferenceNodesExist } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';

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
//import { STEPS } from './../testdata/traced_workflow_runs/hotseat-replicate-4DNES18BMU79';
//import { STEPS } from './../testdata/traced_workflow_runs/4DNESXZ4FW4T';
//import { STEPS } from './../testdata/traced_workflow_runs/file_processed_4DNFI9WF1Y8W';
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
        this.handleToggleAllRuns = _.throttle(this.handleToggleAllRuns.bind(this), 1000, { trailing: false });
        const steps = _testing_data || null;
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

        let tracingHref = '/trace_workflow_run_steps/' + context.uuid + '/';
        const callback = (r) => {
            if (Array.isArray(r) && r.length > 0){
                this.setState({ 'steps' : r, 'loadingGraphSteps' : false }, cb);
            } else {
                this.setState({ 'steps' : 'ERROR', 'loadingGraphSteps' : false }, cb);
            }
        };
        const opts = {};

        if (!cache) {
            opts.timestamp = format(new Date(), 't');
        }
        if (this.state.allRuns === true){
            opts.all_runs = true;
        }
        if (_.keys(opts).length > 0){
            tracingHref += '?' + _.map(_.pairs(opts), function([ optKey, optVal ]){
                return encodeURIComponent(optKey) + '=' + encodeURIComponent(optVal);
            }).join('&');
        }

        ajax.load(tracingHref, callback, 'GET', callback);
    }

    handleToggleAllRuns(){
        this.setState(function({ allRuns }){
            return {
                'allRuns' : !allRuns,
                'loadingGraphSteps' : true
            };
        }, () => {
            this.loadGraphSteps(true);
        });
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
            iconClass += 'circle-notch fas icon-spin';
            tooltip = "Graph is loading";
        } else if (!Array.isArray(steps) || steps.length === 0) {
            iconClass += 'times fas';
            tooltip = "Graph currently not available for this file. Please check back later.";
        } else {
            iconClass += 'sitemap icon-rotate-90 fas';
        }

        return {
            'tab'       : <span data-tip={tooltip} className="d-inline-block"><i className={iconClass} /> Provenance</span>,
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

    static anyGroupNodesExist(nodes){
        return _.any(nodes, function(n){
            return n.nodeType === 'input-group' || n.nodeType === 'output-group';
        });
    }

    constructor(props){
        super(props);
        this.commonGraphProps           = this.commonGraphProps.bind(this);
        this.onToggleIndirectFiles      = _.throttle(this.onToggleIndirectFiles.bind(this), 1000, { trailing: false });
        this.onToggleReferenceFiles     = _.throttle(this.onToggleReferenceFiles.bind(this), 1000, { trailing: false });
        this.onToggleAllRuns            = _.throttle(this.onToggleAllRuns.bind(this), 1000, { trailing: false });
        this.isNodeCurrentContext       = this.isNodeCurrentContext.bind(this);
        this.state = {
            'showChart' : 'detail',
            'showIndirectFiles' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'stacked',
            'showParameters' : false
        };

        this.memoized = {
            ...this.memoized,
            anyGroupNodesExist : memoize(FileViewGraphSection.anyGroupNodesExist),
            allFilesForWorkflowRunsMappedByUUID : memoize(allFilesForWorkflowRunsMappedByUUID),
            mapEmbeddedFilesToStepRunDataIDs : memoize(mapEmbeddedFilesToStepRunDataIDs)
        };
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
        const {
            steps, allRuns, isNodeCurrentContext,
            context : { workflow_run_outputs = [], workflow_run_inputs = [] }
        } = this.props;
        const { showReferenceFiles, showParameters, showIndirectFiles, rowSpacingType } = this.state;
        const parsingOptions = { showReferenceFiles, showParameters, showIndirectFiles };
        const legendItems = _.clone(WorkflowDetailPane.Legend.defaultProps.items);
        const { anyReferenceFileNodes } = this.memoized.checkIfIndirectOrReferenceNodesExist(steps);
        const { nodes: originalNodes, edges } = this.memoized.parseAnalysisSteps(steps, parsingOptions);

        if (!showParameters){
            delete legendItems['Input Parameter']; // Remove legend items which aren't relevant for this context.
        }

        if (!showReferenceFiles || !anyReferenceFileNodes){
            delete legendItems['Input Reference File'];
        }
        if (allRuns || !this.memoized.anyGroupNodesExist(originalNodes)){
            delete legendItems['Group of Similar Files'];
        }

        const fileMap = this.memoized.allFilesForWorkflowRunsMappedByUUID(workflow_run_outputs.concat(workflow_run_inputs));
        const nodes = this.memoized.mapEmbeddedFilesToStepRunDataIDs(originalNodes, fileMap );

        return {
            ...commonGraphPropsFromProps({ ...this.props, legendItems }),
            nodes, edges, rowSpacingType,
            'isNodeDisabled' : FileViewGraphSection.isNodeDisabled,
            'columnSpacing' : 100,
            'isNodeCurrentContext' : (typeof isNodeCurrentContext === 'function' && isNodeCurrentContext) || this.isNodeCurrentContext

        };
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
        const { showIndirectFiles, showChart } = this.state;
        const { anyIndirectPathIONodes, anyReferenceFileNodes } = this.memoized.checkIfIndirectOrReferenceNodesExist(steps);
        const graphProps = Array.isArray(steps) ? this.commonGraphProps() : null;
        const isReferenceFilesCheckboxDisabled = !anyReferenceFileNodes;
        const isAllRunsCheckboxDisabled = loading || !graphProps || (!allRuns && !this.memoized.anyGroupNodesExist(graphProps.nodes) ? true : false);
        const isShowMoreContextCheckboxDisabled = !showIndirectFiles && !anyIndirectPathIONodes;
        const outerCls = (
            "tabview-container-fullscreen-capable workflow-view-container"
            + " workflow-viewing-" + (showChart)
            + (isFullscreen ? ' full-screen-view' : '')
        );

        return (
            <div className={outerCls}>
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