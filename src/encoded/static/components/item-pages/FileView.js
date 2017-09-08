'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, MenuItem, Dropdown, DropdownButton } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement } from './components';
import { ItemBaseView } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { commonGraphPropsFromProps, doValidAnalysisStepsExist, filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, RowSpacingTypeDropdown } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';
//import * as dummyFile from './../testdata/file-processed-4DNFIYIPFFUA-with-graph';
//import { dummy_analysis_steps } from './../testdata/steps-for-e28632be-f968-4a2d-a28e-490b5493bdc2';



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



export class WorkflowRunTracingView extends ItemBaseView {

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.handleToggleAllRuns = this.handleToggleAllRuns.bind(this);
        //var steps = dummy_analysis_steps;
        var steps = null;
        this.state = {
            'mounted' : false,
            'steps' : steps,
            'allRuns' : false,
            'loading' : false
        };
    }

    componentDidMount(){
        var state = { 'mounted' : true };
        if (!this.state.steps){
            state.loading = true;
            this.loadGraphSteps();
        }
        this.setState(state);
    }

    loadGraphSteps(force = false, cb = null){
        if (typeof this.props.context.uuid !== 'string') return;
        if (!force && Array.isArray(this.state.steps) && this.state.steps.length > 0) return;

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
        if (this.state.allRuns === true){
            tracingHref += '?all_runs=True';
        }

        ajax.load(tracingHref, callback, 'GET', callback);
    }

    handleToggleAllRuns(){
        this.setState({ 'allRuns' : !this.state.allRuns, 'loading' : true }, ()=>{
            this.loadGraphSteps(true);
        });
    }

}




export default class FileView extends WorkflowRunTracingView {

    static doesGraphExist(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
        );
    }

    constructor(props){
        super(props);
    }

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;

        initTabs.push(FileViewOverview.getTabObject(context, this.props.schemas));
        
        var steps = this.state.steps;

        if (FileView.doesGraphExist(context)){
            initTabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns));
        }

        return initTabs.concat(this.getCommonTabs());
    }

}

globals.panel_views.register(FileView, 'File');


class FileViewOverview extends React.Component {

    static getTabObject(context, schemas){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'experiments-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileViewOverview context={context} schemas={schemas} />
                </div>
            )
        };
    }

    static propTypes = {
        'context' : PropTypes.shape({
            'experiments' : PropTypes.arrayOf(PropTypes.shape({
                'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                    'link_id' : PropTypes.string.isRequired
                }))
            })).isRequired
        }).isRequired
    }

    render(){
        var { context } = this.props;

        var setsByKey;
        var table = null;

        if (context && context.experiments) setsByKey = expFxn.experimentSetsFromFile(context);

        if (_.keys(setsByKey).length > 0){
            table = <ExperimentSetTablesLoaded experimentSetObject={setsByKey} />;
        }

        return (
            <div>
                <OverViewBody result={context} schemas={this.props.schemas} />
                { table }
            </div>
        );

    }

}

class OverViewBody extends React.Component {

    relatedFiles(){
        var file = this.props.result;
        if (!Array.isArray(file.related_files) || file.related_files.length === 0){
            return null;
        }

        return _.map(file.related_files, function(rf){

            return (
                <li className="related-file">
                    { rf.relationship_type } { object.linkFromItem(rf.file) }
                </li>
            );
        });

    }

    render(){
        var file = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file);

        return (
            <div className="row">
                <div className="col-md-9 col-xs-12">
                    <div className="row overview-blocks">

                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_format'} tips={tips} elementType="h5" fallbackTitle="File Format" />
                                <div>
                                    { Schemas.Term.toName('file_format', file.file_format) || 'Unknown/Other' }
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_type'} tips={tips} elementType="h5" fallbackTitle="File Type" />
                                <div>
                                    { Schemas.Term.toName('file_type', file.file_type) || 'Unknown/Other'}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_classification'} tips={tips} elementType="h5" fallbackTitle="General Classification" />
                                <div>
                                    { file.file_classification ? Schemas.Term.toName('file_classification', file.file_classification) : 'Unknown/Other' }
                                </div>
                            </div>
                        </div>

                        { Array.isArray(file.related_files) && file.related_files.length > 0 ?
                        <div className="col-sm-12">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'related_files'} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                                <ul>
                                    { this.relatedFiles() }
                                </ul>
                            </div>
                        </div>
                        : null }


                    </div>

                </div>
                <div className="col-md-3 col-xs-12">
                    <div className="file-download-container">
                        <fileUtil.FileDownloadButtonAuto result={file} />
                        { file.file_size && typeof file.file_size === 'number' ?
                        <h6 className="text-400">
                            <i className="icon icon-fw icon-hdd-o" /> { Schemas.Term.toName('file_size', file.file_size) }
                        </h6>
                        : null }
                    </div>
                </div>
            </div>
        );

    }
}



export class FileViewGraphSection extends React.Component {

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
        return {
            tab : <span data-tip={tooltip} className="inline-block"><i className={iconClass} /> Graph</span>,
            key : 'graph',
            disabled : !Array.isArray(steps) || steps.length === 0,
            content : <FileViewGraphSection
                {...props}
                steps={steps}
                mounted={mounted}
                key={"graph-for-" + context.uuid}
                onToggleAllRuns={onToggleAllRuns}
                allRuns={allRuns}
                loading={loading}
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
        //this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.onToggleIndirectFiles = this.onToggleIndirectFiles.bind(this);
        this.onToggleReferenceFiles = this.onToggleReferenceFiles.bind(this);
        this.onToggleAllRuns = _.throttle(this.onToggleAllRuns.bind(this), 1000);
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : 'detail',
            'showIndirectFiles' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'stacked'
        };
    }
    /*
    componentWillReceiveProps(nextProps){
        if (nextProps.allRuns !== this.props.allRuns){
            if (nextProps.allRuns && this.state.rowSpacingType !== 'stacked') {
                this.setState({ 'rowSpacingType' : 'stacked' });
            }
            else if (!nextProps.allRuns && this.state.rowSpacingType !== 'wide') {
                this.setState({ 'rowSpacingType' : 'wide' });
            }
        }
    }
    */
    commonGraphProps(){

        var steps = this.props.steps;
        
        var graphData = parseAnalysisSteps(this.props.steps);
        if (!this.state.showParameters){
            graphData = filterOutParametersFromGraphData(graphData);
        }

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
        this.setState({ showIndirectFiles : !this.state.showIndirectFiles });
    }

    onToggleReferenceFiles(){
        this.setState({ showReferenceFiles : !this.state.showReferenceFiles });
    }

    onToggleAllRuns(){
        return this.props.onToggleAllRuns();
    }

    render(){
        var graphProps = null;
        if (Array.isArray(this.props.steps)){
            graphProps = this.commonGraphProps();
        }
        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart)}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <div className="workflow-view-controls-container">
                        <div className="inline-block show-params-checkbox-container">
                            <Checkbox checked={this.state.showReferenceFiles} onChange={this.onToggleReferenceFiles}>
                                Show Reference Files
                            </Checkbox>
                        </div>
                        <div className="inline-block show-params-checkbox-container">
                            <Checkbox checked={this.state.showIndirectFiles} onChange={this.onToggleIndirectFiles}>
                                Show More Context
                            </Checkbox>
                        </div>
                        <div className="inline-block show-params-checkbox-container">
                            <Checkbox checked={!this.props.allRuns} onChange={this.onToggleAllRuns} disabled={this.props.loading}>
                            { this.props.loading ? <i className="icon icon-spin icon-fw icon-circle-o-notch" style={{ marginRight : 3 }}/> : '' } Collapse Similar Runs
                            </Checkbox>
                        </div>
                        <div className="inline-block">
                            <RowSpacingTypeDropdown currentKey={this.state.rowSpacingType} onSelect={(eventKey, evt)=>{
                                requestAnimationFrame(()=>{
                                    if (eventKey === this.state.rowSpacingType) return;
                                    this.setState({ rowSpacingType : eventKey });
                                });
                            }}/>
                        </div>
                    </div>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="graph-wrapper" style={{ opacity : this.props.loading ? 0.33 : 1 }}>
                    { graphProps ? <Graph { ...graphProps } /> : null }
                </div>
            </div>
        );

    }

}

