'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Fade } from 'react-bootstrap';
import { ItemDetailList } from './ItemDetailList';
import { ExperimentSetTablesLoaded } from './ExperimentSetTables';
import { FlexibleDescriptionBox } from './FlexibleDescriptionBox';
import { getTitleStringFromContext } from './../item';
import { console, object, layout, ajax, fileUtil, expFxn } from './../../util';


export class ViewMetricButton extends React.Component {

    static defaultProps = {
        title : "View Full QC Report"
    }

    render(){
        var file = this.props.file;
        var node = this.props.node;
        var title = this.props.title || null;
        var type = file.overall_quality_status;
        if (!FileDetailBody.isNodeQCMetric(node)) return null;
        if (typeof file.url !== 'string') return null;

        var className = (this.props.className || '') + " btn download-button btn-default" + (this.props.disabled ? ' disabled' : '');
        if (typeof type === 'string'){
            if      (type.toLocaleLowerCase() === 'pass') className += ' btn-success';
            else if (type.toLocaleLowerCase() === 'warn') className += ' btn-warning';
            else if (type.toLocaleLowerCase() === 'error') className += ' btn-error';
            else className += ' btn-info';
        }

        return (
            <a href={file.url} className={className} target="_blank" onClick={(e)=>{
                if (window && window.open){
                    e.preventDefault();
                    window.open(file.url, 'window', 'toolbar=no, menubar=no, resizable=yes, status=no, top=100, width=400');
                }
            }}>
                <i className="icon icon-fw icon-external-link" style={{ top : 1, position: 'relative' }}/>{ title ? <span>&nbsp; { title }</span> : null }
            </a>
        );
    }
}


class MetricsViewItem extends React.Component {

    static resultStringToIcon(resultStr = "UNKNOWN", extraIconClassName = ''){
        if (typeof resultStr !== 'string') return resultStr;
        switch(resultStr.toUpperCase()){
            case 'PASS':
                return <i className={"icon icon-check " + extraIconClassName} data-tip={resultStr} />;
            case 'WARN':
                return <i className={"icon icon-warning " + extraIconClassName} data-tip={resultStr} />;
            case 'ERROR':
                return <i className={"icon icon-exclamation-circle " + extraIconClassName} data-tip={resultStr} />;
            default:
                return resultStr;
        }
    }

    render(){
        var m = this.props.metric;
        var title;
        if (m.key === 'overall_quality_status'){
            title = <strong className="text-600">{ m.title || "Overall QC Status" }</strong>;
        } else {
            title = <span>{ m.title || m.key }</span>;
        }
        return (
            <div className="col-xs-12 col-sm-6 col-lg-6 metrics-view-item">
                <div className="inner">
                    <div className="row">
                        <div className="col-xs-9">
                            { title }
                            {/* <TooltipInfoIconContainer title={m.title || m.key} tooltip={m.description} /> */}
                        </div>
                        <div className="col-xs-3 text-center">
                            { MetricsViewItem.resultStringToIcon(m.result) }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export class MetricsView extends React.Component {

    static defaultProps = {
        'metrics' : [
            { 'key' : 'something', 'title' : 'Some Thing', 'result' : 'PASS' }
        ]
    }

    render(){
        return (
            <div className="metrics-view row">
                { this.props.metrics.map((m,i) => <MetricsViewItem metric={m} key={m.key || m.title || i} />) }
            </div>
        );
    }

}


class FileDetailBody extends React.Component {

    static isNodeQCMetric(node){
        if (node.meta && node.meta.run_data && node.meta.run_data.type === 'quality_metric') return true;
    }

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'file' : PropTypes.object.isRequired,
        'schemas' : PropTypes.object.isRequired,
        'minHeight' : PropTypes.number,
        'keyTitleDescriptionMap' : PropTypes.object
    }

    static defaultProps = {
        'canDownloadStatuses' : fileUtil.FileDownloadButtonAuto.defaultProps.canDownloadStatuses
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.maybeLoadFile = this.maybeLoadFile.bind(this);
        this.state = {
            file : this.props.file
        };
    }

    componentDidMount(){
        this.maybeLoadFile();
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.file !== this.props.file) {
            this.setState({ file : nextProps.file }, this.maybeLoadFile.bind(this, nextProps.file));
        }
    }

    maybeLoadFile(file = this.state.file){
        var hrefToRequest = null;
        
        if (typeof file === 'string') {
            hrefToRequest = '/files/' + file + '/';
        } else if (file && typeof file === 'object' && !Array.isArray(file)){
            if (!fileUtil.isFileDataComplete(file)) hrefToRequest = object.atIdFromObject(file);
        } else if (Array.isArray(file) && this.props.node && this.props.node.meta && this.props.node.meta.workflow){
            hrefToRequest = this.props.node.meta.workflow;
        }

        if (typeof hrefToRequest === 'string') { // Our file is not embedded. Is a UUID.
            ajax.load(hrefToRequest, (res)=>{
                if (res && typeof res === 'object'){
                    this.setState({ file : res });
                }
            }, 'GET', () => {
                this.setState({ file : null });
            });
            return true;
        }
        return false;
    }

    doesDescriptionOrNotesExist(){
        var file = this.props.file;
        return !!(file.description || file.notes || false);
    }

    canDownload(fileObj = this.state.file){
        if (fileObj && !Array.isArray(fileObj) && typeof fileObj !== 'string' && this.props.canDownloadStatuses.indexOf(fileObj.status) > -1){
            return true;
        }
        return false;
    }

    fileTitleBox(){
        var node = this.props.node;
        var file = this.state.file;
        var fileTitle;
        var fileTitleFormatted;
        var colClassName = "col-sm-6 col-lg-4";
        //if (typeof file === 'object' && file && !fileUtil.isFileDataComplete(file) && !Array.isArray(file)) {}
        if (typeof file === 'string') {
            fileTitle = null;
            fileTitleFormatted = <small><i className="icon icon-circle-o-notch icon-spin icon-fw"/></small>;
        } else if (Array.isArray(this.props.file)) { // Some sort of group
            fileTitle = 'Workflow';
            if (file && file.display_title) fileTitle = file.display_title;
            if (typeof node.meta.workflow === 'string'){
                fileTitleFormatted = <a href={node.meta.workflow}>{ fileTitle }</a>;
            } else {
                fileTitleFormatted = fileTitle;
            }
        } else {
            fileTitle = getTitleStringFromContext(file);
            if (!this.doesDescriptionOrNotesExist()){
                colClassName = "col-sm-6 col-lg-6";
            }
            fileTitleFormatted = <a href={object.atIdFromObject(file) || '/' + file.uuid}>{ fileTitle }</a>;
        }
        return (
            <div className={colClassName + " file-title box"}>
                <span className="text-600">
                    {
                    node.type === 'output' ? 'Generated' :
                        node.type === 'input' ? 'Used' :
                            null
                    } {
                        Array.isArray(this.props.file) ?
                            this.props.file.length + ' total files from' + (file && file.display_title ? ' workflow' : '')
                            :
                            'File'
                    }
                </span>
                <h3 className="text-400 text-ellipsis-container node-file-title" title={fileTitle}>
                    { fileTitleFormatted }
                </h3>
            </div>
        );
    }

    downloadLinkBox(){
        var gridSize = layout.responsiveGridState();
        //if (gridSize === 'sm' || gridSize === 'xs') return null;
        var file = this.state.file;
        //if ((!file.href && !file.url)) return <div className="col-sm-4 col-lg-4 box">&nbsp;</div>;

        var title = <span>Download</span>;
        var disabled = (!file.href && !file.url) || !this.canDownload();
        var content = <fileUtil.FileDownloadButton title={title} href={file.href || file.url} disabled={disabled} filename={file.filename} />;

        var colClassName = "col-sm-6 col-lg-4";
        if (!this.doesDescriptionOrNotesExist()){
            colClassName = "col-sm-6 col-lg-6";
        }

        return (
            <div className={colClassName + " right box buttons-container"}>
                <ViewMetricButton node={this.props.node} file={file}/> { content }
            </div>
        );
    }

    descriptionBox(){
        var file = this.state.file;
        var gridSize = layout.responsiveGridState();
        if (!this.doesDescriptionOrNotesExist() || typeof file === 'string' || !fileUtil.isFileDataComplete(file)) return null;
        return (
            <div className="col-xs-12 col-lg-4 box">
                <span className="text-600">{ file.description ? 'Description' : (file.notes ? 'Notes' : 'Description') }</span>
                <div className="description-box-container">
                    <FlexibleDescriptionBox
                        description={file.description || file.notes || <em>No description.</em>}
                        fitTo="self"
                        textClassName="text-large"
                        expanded={gridSize === 'xs' || gridSize === 'sm' || gridSize === 'md'}
                        dimensions={null}
                    />
                </div>
            </div>
        );
    }

    iframeBox(){
        var file = this.state.file;
        var node = this.props.node;
        if (!node.meta || !node.meta.run_data || node.meta.run_data.type !== 'quality_metric') return null; // IFrames only for quality metrics.
        if (typeof file.url !== 'string') return null;

        return (
            <div className="row">
                <div className="col-sm-12">
                    <hr/>
                    <iframe src={file.url} width="100%" height="400"/>
                </div>
            </div>
        );
    }

    render(){
        if (!this.state.file){
            return null;
        }

        var node = this.props.node;
        var body;
        if (typeof this.state.file === 'string'/* || !fileUtil.isFileDataComplete(this.state.file)*/){
            body = null;
        } else if (FileDetailBody.isNodeQCMetric(node)){
            var metrics = object.listFromTips(object.tipsFromSchema(this.props.schemas, this.state.file))
            .filter(function(m){
                if (m.key === 'status') return false;
                if (m.enum) return true;
                if (m.type === 'number') return true;
                return false;
            })
            .map((m)=>{
                return _.extend(m, {
                    'result' : this.state.file[m.key]
                });
            });
            body = <MetricsView metrics={metrics} />;
        } else if (Array.isArray(this.props.file) && typeof this.props.file[0] === 'object' && object.atIdFromObject(this.props.file[0])) {
            body = <ol>{
                _.map(this.props.file, function(f){
                    return <li><a href={object.atIdFromObject(f)}>{ f.display_title || f.accession }</a></li>;
                })
            }</ol>;
        } else {
            var fileLoaded = fileUtil.isFileDataComplete(this.state.file);
            var table = null;
            if (
                this.state.file && (Array.isArray(this.state.file.experiments) || Array.isArray(this.state.file.experiment_sets))
            ){
                var setsByKey = expFxn.experimentSetsFromFile(this.state.file);
                if (setsByKey && _.keys(setsByKey).length > 0){
                    table = <ExperimentSetTablesLoaded experimentSetObject={setsByKey} />;
                }
            }
            body = (
                <Fade in={fileLoaded} transitionAppear>
                    { fileLoaded ? 
                    <div>
                        { table }
                        { table ? <br/> : null }
                        <h3 className="tab-section-title">
                            <span>Details</span>
                        </h3>
                        <hr className="tab-section-title-horiz-divider"/>
                        <ItemDetailList
                            context={this.state.file}
                            schemas={this.props.schemas}
                            minHeight={this.props.minHeight}
                            keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                        />
                    </div>
                    : <div className="text-center"><br/><i className="icon icon-spin icon-circle-o-notch"/></div> }
                </Fade>
            );
        }


        return (
            <div>
                <div className="information">
                    <div className="row">
                        { this.fileTitleBox() }
                        { this.downloadLinkBox() }
                        { this.descriptionBox() }
                    </div>
                </div>
                <hr/>
                { body }
            </div>
        );
    }
}

class AnalysisStepSoftwareDetailRow extends React.Component {

    constructor(props){
        super(props);
        this.maybeLoadSoftware = this.maybeLoadSoftware.bind(this);
        this.state = {
            software : props.software
        };
    }

    componentDidMount(){
        this.maybeLoadSoftware();
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.software !== this.props.software) {
            this.setState({ software : nextProps.software }, this.maybeLoadSoftware.bind(this, nextProps.software));
        }
    }

    maybeLoadSoftware(software = this.state.software){
        if (typeof software === 'string') { // Our software is not embedded.
            ajax.load(software, (res)=>{
                if (res && typeof res === 'object'){
                    this.setState({ software : res });
                }
            }, 'GET', () => {
                this.setState({ software : null });
            });
        }
    }

    softwareUsedBox(){
        var soft = this.state.software;
        if (!soft){
            return (
                <div className="col-sm-6 box">
                    <span className="text-600">Software Used</span>
                    <h5 className="text-400 text-ellipsis-container">
                        <em>N/A</em>
                    </h5>
                </div>
            );
        }
        if (typeof soft === 'string'){
            return (
                <div className="col-sm-6 box">
                    <span className="text-600">Software Used</span>
                    <h5 className="text-400 text-ellipsis-container">
                        <i className="icon icon-circle-o-notch icon-spin icon-fw"/>
                    </h5>
                </div>
            );
        }
        var link = object.atIdFromObject(soft);
        var title;
        if (typeof soft.name === 'string' && soft.version){
            title = soft.name + ' v' + soft.version;
        } else if (soft.title) {
            title = soft.title;
        } else {
            title = link;
        }

        return (
            <div className="col-sm-6 box">
                <span className="text-600">Software Used</span>
                <h4 className="text-400 text-ellipsis-container">
                    <a href={link}>{ title }</a>
                </h4>
            </div>
        );
    }

    softwareLinkBox(){
        var soft = this.state.software;
        if (!soft || !soft.source_url) return (
            <div className="col-sm-6 box">
                <span className="text-600">Software Source</span>
                <h5 className="text-400 text-ellipsis-container">
                    <em>N/A</em>
                </h5>
            </div>
        );
        return (
            <div className="col-sm-6 box">
                <span className="text-600">Software Source</span>
                <h5 className="text-400 text-ellipsis-container">
                    <a href={soft.source_url} title={soft.source_url}>{ soft.source_url }</a>
                </h5>
            </div>
        );
    }

    render(){
        
        return (
            <div className="row">

                { this.softwareUsedBox() }
                { this.softwareLinkBox() }

            </div>
        );
    }

}

class WorkflowDetailsForWorkflowNodeRow extends React.Component {
    render(){
        var { workflow, workflow_run } = this.props;
        var title, innerContent;

        if (workflow) {
            var link = object.atIdFromObject(workflow);
            title = workflow.display_title || workflow.title || workflow.name;
            innerContent = <a href={link}>{ title }</a>;
        } else {
            innerContent = <em>N/A</em>;
        }

        console.log('WORKFLOW', workflow);

        var workflowSteps = workflow.steps || workflow_run.steps || workflow.workflow_steps;
        if (Array.isArray(workflowSteps) && workflowSteps.length > 0){
            workflowSteps = _.uniq(_.map(workflowSteps, function(step){
                return step.name;
            })).join(', ');
        } else {
            workflowSteps = <em>N/A</em>;
        }

        return (
            <div className="row">

                <div className="col-sm-6 box">
                    <span className="text-600">Workflow Name</span>
                    <h4 className="text-400 text-ellipsis-container" data-tip={title}>
                        { innerContent }
                    </h4>
                </div>

                <div className="col-sm-6 box steps-in-workflow">
                    <span className="text-600">Steps in Workflow</span>
                    <h5 className="text-400 text-ellipsis-container">
                        { workflowSteps }
                    </h5>
                </div>

            </div>
        );
    }
}

class SoftwareDetailsForWorkflowNodeRow extends React.Component {
    render(){

        var softwareList = this.props.software;

        var softwareElements;

        if (Array.isArray(softwareList) && softwareList.length > 0){
            softwareElements = _.map(softwareList, function(sw){
                return (
                    <a href={object.atIdFromObject(sw)}>{ sw.display_title }</a>
                );
            });
        } else {
            softwareElements = <em>N/A</em>;
        }

        return (
            <div className="row">

                <div className="col-sm-12 box steps-in-workflow">
                    <span className="text-600">Software Used in Workflow</span>
                    <h5 className="text-400 text-ellipsis-container">
                        { softwareElements }
                    </h5>
                </div>

            </div>
        );
    }
}

class AnalysisStepDetailBody extends React.Component {

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.maybeLoadWFR = this.maybeLoadWFR.bind(this);
        this.state = {
            wfr : (this.props.step && this.props.step['@id']) || null
        };
    }

    componentDidMount(){
        this.maybeLoadWFR();
    }

    componentWillReceiveProps(nextProps){
        if ((nextProps.step && nextProps.step['@id']) !== (this.props.step && this.props.step['@id'])) {
            this.setState({ wfr : nextProps.step['@id'] }, this.maybeLoadWFR.bind(this, nextProps.step['@id']));
        }
    }

    maybeLoadWFR(wfr = this.state.wfr){
        var hrefToRequest = null;
        
        if (typeof wfr === 'string') {
            hrefToRequest = wfr;
        } /*else if (wfr && typeof wfr === 'object' && !Array.isArray(wfr)){
            if (!fileUtil.isFileDataComplete(file)) hrefToRequest = object.atIdFromObject(file);
        }else if (Array.isArray(file) && this.props.node && this.props.node.meta && this.props.node.meta.workflow){
            hrefToRequest = this.props.node.meta.workflow;
        }*/

        if (typeof hrefToRequest === 'string') { // Our file is not embedded. Is a UUID.
            ajax.load(hrefToRequest, (res)=>{
                if (res && typeof res === 'object'){
                    this.setState({ wfr : res });
                }
            }, 'GET', () => {
                this.setState({ wfr : null });
            });
            return true;
        }
        return false;
    }

    stepTitleBox(){
        var { step, context, node } = this.props;
        var stepHref = object.atIdFromObject(step) || '/' + step.uuid;
        var titleString = step.name || step.title || step.display_title || step.uuid;

        var isStepWorkflow = context && (
            object.atIdFromObject(context) === stepHref ||
            (step && Array.isArray(step.analysis_step_types) && step.analysis_step_types.indexOf('Workflow Process') > -1)
        );
        
        var content = isStepWorkflow ? (
            <h3 className="text-300 text-ellipsis-container">{ titleString }</h3>
        ) : (
            <h3 className="text-400 text-ellipsis-container"><a href={stepHref}>{ titleString }</a></h3>
        );

        var label;
        if (isStepWorkflow){
            label = 'Workflow Process';
        } else if (step && Array.isArray(step['@type']) && step['@type'].indexOf('WorkflowRun') > -1){
            label = 'Run Name';
        } else {
            label = 'Step Name';
        }

        return (
            <div className="col-sm-6 box">
                <span className="text-600">{ label }</span>
                { content }
            </div>
        );
    }

    purposesBox(){
        var step = this.props.step;
        var purposeList = step.analysis_step_types;
        if (!Array.isArray(purposeList)){
            return <div className="col-sm-6 box"/>;
        }
        var elementType = 'h5';
        if (purposeList.length  === 1) elementType = 'h4';
        return(
            <div className="col-sm-6 box">
                <span className="text-600">Purpose{ purposeList.length > 1 ? 's' : '' }</span>
                { React.createElement(elementType, { 'className' : 'text-400' }, purposeList.map(function(p, i){
                    return <span className="text-capitalize" key={p}>{ p }{ i !== purposeList.length - 1 ? ', ' : '' }</span>;
                })) }
            </div>
        );
    }

    render(){
        var node = this.props.node;
        var step = this.props.step;
        var workflow = (step && step.workflow) || null;
        var wfr = (this.state.wfr && typeof this.state.wfr !== 'string' && this.state.wfr) || false; // If step ===  wfr, not step === analysis_step
        var self_software_used = step.software_used || (workflow && workflow.software_used) || null;
        if (typeof self_software_used === 'string' && self_software_used.charAt(0) !== '/' && object.isUUID(self_software_used)){
            self_software_used = '/software/' + self_software_used;
        }

        //var isThereAssociatedSoftware = !!(this.props.step && this.props.step.software_used);
        // Still need to test this .workflow_steps.step.software_used -> .steps.meta.software_used :
        var listOfSoftwareInWorkflow = (wfr && wfr.workflow && Array.isArray(wfr.workflow.steps) &&
            _.any(wfr.workflow.steps, function(workflowStep){ return workflowStep.meta && workflowStep.meta.software_used; }) &&
            _.uniq(_.filter(
                _.map(wfr.workflow.steps, function(workflowStep){ return (workflowStep.meta && workflowStep.meta.software_used) || null; }),
                function(s) { return s !== null; }
            ), false, object.atIdFromObject)
        ) || null;

        return(
            <div style={{ minHeight : this.props.minHeight }}>
                <div className="information">
                    <div className="row">

                        { this.stepTitleBox() }
                        { this.purposesBox() }

                    </div>
                    { workflow ? <hr/> : null }
                    { workflow ? <WorkflowDetailsForWorkflowNodeRow workflow_run={wfr} step={step} workflow={workflow}/> : null }
                    { listOfSoftwareInWorkflow ? <hr/> : null }
                    { listOfSoftwareInWorkflow ? <SoftwareDetailsForWorkflowNodeRow software={listOfSoftwareInWorkflow}/> : null }
                    { self_software_used ? <hr/> : null }
                    { self_software_used ? <AnalysisStepSoftwareDetailRow software={self_software_used}/> : null }
                    
                </div>
                <hr/>
                
                
                <Fade in={!!(wfr)} key="wfr-detail-container">
                    <div>
                        <h3 className="tab-section-title">
                            <span>Details</span>
                        </h3>
                        <hr className="tab-section-title-horiz-divider"/>
                        { wfr ?
                        <ItemDetailList
                            context={wfr}
                            schemas={this.props.schemas}
                            minHeight={this.props.minHeight}
                            keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                        />
                        : null }
                    </div>
                </Fade>
                { typeof this.state.wfr === 'string' ? 
                    <div className="text-center"><br/><i className="icon icon-spin icon-circle-o-notch"/></div>
                : null }
                
                
            </div>
        );
    }

}


export class WorkflowDetailPane extends React.Component {

    static propTypes = {
        'selectedNode' : PropTypes.oneOfType([ PropTypes.object, PropTypes.oneOf([null]) ])
    }

    static defaultProps = {
        'minHeight' : 800,
        'selectedNode' : null,
        'keyTitleDescriptionMap' : {
            '@id' : {
                'title' : 'Link'
            }
        }
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.body = this.body.bind(this);
    }

    body(typeTitle){
        var node = this.props.selectedNode;
        
        if (node.meta && node.meta.run_data && node.meta.run_data.file && node.meta.run_data.file){
            // File
            return (
                <layout.WindowResizeUpdateTrigger>
                    <FileDetailBody
                        key="body"
                        node={node}
                        file={node.meta.run_data.file}
                        schemas={this.props.schemas}
                        minHeight={this.props.minHeight}
                        keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                    />
                </layout.WindowResizeUpdateTrigger>
            );
        }
        if (node.meta && node.meta.run_data && (typeof node.meta.run_data.value === 'number' || typeof node.meta.run_data.value === 'string')){
            return (
                <div style={typeof this.props.minHeight === 'number' ? { minHeight : this.props.minHeight } : null}>
                    <div className="information">
                        <div className="text-600" style={{ paddingTop : 10 }}>Value Used</div>
                        <h3 className="text-500">
                            <pre>{ node.meta.run_data.value }</pre>
                        </h3>
                    </div>
                </div>
            );
        }
        if (node.type === 'step' && node.meta && typeof node.meta === 'object'){
            return (
                <AnalysisStepDetailBody
                    key="body"
                    step={node.meta}
                    node={node}
                    typeTitle={typeTitle}
                    schemas={this.props.schemas}
                    minHeight={this.props.minHeight}
                    context={this.props.context}
                    keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                />
            );
        }
    }

    render(){
        var node = this.props.selectedNode;
        console.log('SELECTED NODE', node);
        if (!node) return (
            <div className="detail-pane" style={{ minHeight : this.props.minHeight }}>
                <h5 className="text-400 text-center" style={{ paddingTop : 7 }}>
                    <small>Select a node above for more detail.</small>
                </h5>
            </div>
        );

        var type;

        if ((node.meta && node.meta['@type']) && (node.meta['@type'].indexOf('WorkflowRun') > -1 || node.meta['@type'].indexOf('Workflow'))){
            type = 'Workflow Run';
        } else if ((node.meta && node.meta['@type']) && node.meta['@type'].indexOf('Workflow')) {
            type = 'Workflow';
        } else if (node.type === 'step'){
            type = 'Analysis Step';
        } else {
            type = node.format || node.type;
        }

        return (
            <div className="detail-pane" style={{ minHeight : this.props.minHeight }}>
                <h5 className="text-700 node-type">
                    { type } <i className="icon icon-fw icon-angle-right"/> <span className="text-400">{ node.name }</span>
                </h5>
                <div className="detail-pane-body">
                    { this.body(type) }
                </div>
            </div>
        );
    }

}