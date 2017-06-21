'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ItemDetailList, TooltipInfoIconContainer } from './ItemDetailList';
import { FlexibleDescriptionBox } from './FlexibleDescriptionBox';
import { getTitleStringFromContext } from './../item';
import { console, object, layout } from './../../util';


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
    render(){
        var { href, className, disabled, title, filename } = this.props;
        return (
            <a href={ href } className={(className || '') + " btn btn-default btn-info download-button " + (disabled ? ' disabled' : '')} download data-tip={filename || null}>
                <i className="icon icon-fw icon-cloud-download"/>{ title ? <span>&nbsp; { title }</span> : null }
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
        'canDownloadStatuses' : [
            'uploaded',
            'released',
            'replaced',
            'in review by project',
            'released to project'
        ]
    }

    doesDescriptionOrNotesExist(){
        var file = this.props.file;
        return !!(file.description || file.notes || false);
    }

    canDownload(){
        if (this.props.canDownloadStatuses.indexOf(this.props.file.status) > -1){
            return true;
        }
        return false;
    }

    fileTitleBox(){
        var node = this.props.node;
        var file = this.props.file;
        var fileTitle = getTitleStringFromContext(file);
        var colClassName = "col-sm-6 col-lg-4";
        if (!this.doesDescriptionOrNotesExist()){
            colClassName = "col-sm-6 col-lg-6";
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
                    <a href={object.atIdFromObject(file) || '/' + file.uuid}>{ fileTitle }</a>
                </h3>
            </div>
        );
    }

    downloadLinkBox(){
        var gridSize = layout.responsiveGridState();
        //if (gridSize === 'sm' || gridSize === 'xs') return null;
        var file = this.props.file;
        if (!file.filename && !file.href && !file.url) return <div className="col-sm-4 col-lg-4 box">&nbsp;</div>;

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
        var file = this.props.file;
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
        var file = this.props.file;
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

        var node = this.props.node;
        var file = this.props.file;

        var body;
        if (FileDetailBody.isNodeQCMetric(node)){
            var metrics = object.listFromTips(object.tipsFromSchema(this.props.schemas, node.meta.run_data.file))
            .filter(function(m){
                if (m.key === 'status') return false;
                if (m.enum) return true;
                if (m.type === 'number') return true;
                return false;
            })
            .map(function(m){
                return _.extend(m, {
                    'result' : node.meta.run_data.file[m.key]
                });
            });
            body = <MetricsView metrics={metrics} />;
        } else {
            body = (
                <ItemDetailList
                    context={node.meta.run_data.file}
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

    softwareUsedBox(){
        var step = this.props.step;
        var soft = step.software_used;
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

    softwareBody(){
        var step = this.props.step;
        var soft = step.software_used;
        var link = object.atIdFromObject(soft);
        var title;
        if (soft.name && soft.version){
            title = soft.name + ' v' + soft.version;
        } else if (soft.title) {
            title = soft.title;
        } else {
            title = link;
        }

        return (
            <div>
                <span className="text-600">Software Used</span>
                <div>
                    <h4 className="text-400"><a href={link}>{ title }</a></h4>
                </div>
                <ItemDetailList
                    context={step.software_used}
                    schemas={this.props.schemas}
                    minHeight={this.props.minHeight}
                    keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                />
            </div>
        );
    }

    softwareLinkBox(){
        var step = this.props.step;
        var soft = step.software_used;
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
                    <div className="row">

                        { this.softwareUsedBox() }
                        { this.softwareLinkBox() }

                    </div>
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
        
        if (node.meta && node.meta.run_data && node.meta.run_data.file && node.meta.run_data.file['@id']){
            // File
            var file = node.meta.run_data.file;
            var fileTitle = getTitleStringFromContext(file);
            var className = null;
            if (fileTitle === file.accession){
                //className = 'mono-text';
            }
            return (
                <layout.WindowResizeUpdateTrigger>
                    <FileDetailBody
                        file={node.meta.run_data.file}
                        node={node}
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
        if (!node) return null;

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