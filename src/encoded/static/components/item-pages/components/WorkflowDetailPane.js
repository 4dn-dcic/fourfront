'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ItemDetailList, TooltipInfoIconContainer } from './ItemDetailList';
import { FlexibleDescriptionBox } from './FlexibleDescriptionBox';
import { getTitleStringFromContext } from './../item';
import { console, object, layout, ajax, fileUtil } from './../../util';


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


export class FileDownloadButton extends React.Component {

    static defaultProps = {
        'title' : 'Download',
        'disabled' : false
    }

    render(){
        var { href, className, disabled, title, filename } = this.props;
        return (
            <a href={ href } className={(className || '') + " btn btn-default btn-info download-button " + (disabled ? ' disabled' : '')} download data-tip={filename || null}>
                <i className="icon icon-fw icon-cloud-download"/>{ title ? <span>&nbsp; { title }</span> : null }
            </a>
        );
    }
}

export class FileDownloadButtonAuto extends React.Component {

    static propTypes = {
        'result' : PropTypes.shape({
            'href' : PropTypes.string.isRequired,
            'filename' : PropTypes.string.isRequired,
        })
    }

    static defaultProps = {
        'canDownloadStatuses' : [
            'uploaded',
            'released',
            'replaced',
            'in review by project',
            'released to project'
        ]
    }

    canDownload(){
        var file = this.props.result;
        if (!file || typeof file !== 'object'){
            console.error("Incorrect data type");
            return false;
        }
        if (typeof file.status !== 'string'){
            console.error("No 'status' property on file:", file);
            return false;
        }

        if (this.props.canDownloadStatuses.indexOf(file.status) > -1){
            return true;
        }
        return false;
    }

    render(){
        var file = this.props.result;
        var props = {
            'href' : file.href,
            'filename' : file.filename,
            'disabled' : !this.canDownload()
        };
        return <FileDownloadButton {...props} {...this.props} />;
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
        'canDownloadStatuses' : FileDownloadButtonAuto.defaultProps.canDownloadStatuses
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
        } else if (file && typeof file === 'object'){
            if (!fileUtil.isFileDataComplete(file)) hrefToRequest = object.atIdFromObject(file);
        }

        if (typeof hrefToRequest === 'string') { // Our file is not embedded. Is a UUID.
            ajax.load(hrefToRequest, (res)=>{
                if (res && typeof res === 'object'){
                    this.setState({ file : res });
                }
            }, 'GET', () => {
                this.setState({ file : null });
            });
        }
    }

    doesDescriptionOrNotesExist(){
        var file = this.props.file;
        return !!(file.description || file.notes || false);
    }

    canDownload(){
        if (this.state.file && typeof this.state.file !== 'string' && this.props.canDownloadStatuses.indexOf(this.state.file.status) > -1){
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
        if (typeof file === 'string' || !fileUtil.isFileDataComplete(file)) {
            fileTitle = null;
            fileTitleFormatted = <small><i className="icon icon-circle-o-notch icon-spin icon-fw"/></small>;
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
                    } File
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
        if ((!file.href && !file.url)) return <div className="col-sm-4 col-lg-4 box">&nbsp;</div>;

        var title = file.href ? <span>Download</span> : 'File Name';
        var disabled = !this.canDownload();
        var content = file.href ?
            <FileDownloadButton title={title} href={file.href} disabled={disabled} filename={file.filename} />
            :
            <span>{ file.filename || file.href }</span>;

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
        if (!this.doesDescriptionOrNotesExist()) return null;
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
        } else {
            body = (
                <ItemDetailList
                    context={this.state.file}
                    schemas={this.props.schemas}
                    minHeight={this.props.minHeight}
                    keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                />
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
            software : this.props.software
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
                <div className="col-sm-6 col-md-4 box">
                    <span className="text-600">Software Used</span>
                    <h5 className="text-400 text-ellipsis-container">
                        <em>N/A</em>
                    </h5>
                </div>
            );
        }
        if (typeof soft === 'string'){
            return (
                <div className="col-sm-6 col-md-4 box">
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
            <div className="col-sm-6 col-md-4 box">
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
            <div className="col-sm-6 col-md-8 box">
                <span className="text-600">Software Source</span>
                <h5 className="text-400 text-ellipsis-container">
                    <em>N/A</em>
                </h5>
            </div>
        );
        return (
            <div className="col-sm-6 col-md-8 box">
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

class AnalysisStepDetailBody extends React.Component {

    stepTitleBox(){
        var { step, context } = this.props;
        var stepHref = object.atIdFromObject(step) || '/' + step.uuid;
        console.log(object.atIdFromObject(step), object.atIdFromObject(context), step, context);
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
        return (
            <div className="col-sm-6 col-md-4 box">
                <span className="text-600">{ isStepWorkflow ? 'Workflow Process' : 'Step Name'}</span>
                { content }
            </div>
        );
    }

    purposesBox(){
        var step = this.props.step;
        var purposeList = step.analysis_step_types;
        if (!Array.isArray(purposeList)){
            return <div className="col-sm-6 col-md-8 box"/>;
        }
        var elementType = 'h5';
        if (purposeList.length  === 1) elementType = 'h4';
        return(
            <div className="col-sm-6 col-md-8 box">
                <span className="text-600">Purpose{ purposeList.length > 1 ? 's' : '' }</span>
                { React.createElement(elementType, { 'className' : 'text-400' }, purposeList.map(function(p, i){
                    return <span className="text-capitalize" key={p}>{ p }{ i !== purposeList.length - 1 ? ', ' : '' }</span>;
                })) }
            </div>
        );
    }

    render(){
        var node = this.props.node;
        //var isThereAssociatedSoftware = !!(this.props.step && this.props.step.software_used);
        return(
            <div style={{ minHeight : this.props.minHeight }}>
                <div className="information">
                    <div className="row">

                        { this.stepTitleBox() }
                        { this.purposesBox() }

                    </div>
                    <hr/>
                    <AnalysisStepSoftwareDetailRow software={this.props.step.software_used}/>
                </div>
                <hr/>
            </div>
        );
    }

}


export class WorkflowDetailPane extends React.Component {

    static propTypes = {
        'selectedNode' : PropTypes.oneOfType([ PropTypes.object, PropTypes.oneOf([null]) ])
    }

    static defaultProps = {
        'minHeight' : 500,
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

    body(){
        var node = this.props.selectedNode;
        
        if (node.meta && node.meta.run_data && node.meta.run_data.file && node.meta.run_data.file){
            // File
            return (
                <layout.WindowResizeUpdateTrigger>
                    <FileDetailBody
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
        if (node.type === 'step' && node.meta && node.meta.uuid){
            return (
                <AnalysisStepDetailBody
                    step={node.meta}
                    node={node}
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
            <div className="detail-pane">
                <h5 className="text-400 text-center" style={{ paddingTop : 7 }}>
                    <small>Select a node above for more detail.</small>
                </h5>
            </div>
        );

        var type;
        if (node.type === 'step'){
            type = 'Analysis Step';
        } else {
            type = node.format || node.type;
        }

        return (
            <div className="detail-pane">
                <h5 className="text-700 node-type">
                    { type } <i className="icon icon-fw icon-angle-right"/> <span className="text-400">{ node.name }</span>
                </h5>
                <div className="detail-pane-body">
                    { this.body() }
                </div>
            </div>
        );
    }

}