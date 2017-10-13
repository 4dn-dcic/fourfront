'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Fade } from 'react-bootstrap';
import { console, object, layout, ajax, fileUtil, expFxn } from './../../../util';
import { getTitleStringFromContext } from './../../item';
import { FlexibleDescriptionBox } from './../FlexibleDescriptionBox';
import { SimpleFilesTable } from './../SimpleFilesTable';
import { ItemDetailList } from './../ItemDetailList';
import { ExperimentSetTablesLoaded } from './../ExperimentSetTables';
import { ViewMetricButton, MetricsView } from './FileDetailBodyMetricsView';



export class FileDetailBody extends React.Component {

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

        if (typeof file === 'string') { // If we have a UUID instead of a complete file object.
            if (file === 'Forbidden') {
                return false;
            }
            hrefToRequest = '/files/' + file + '/';
        } else if (file && typeof file === 'object' && !Array.isArray(file)){ // If we have file object but has little info. TODO: REMOVE
            if (!fileUtil.isFileDataComplete(file)) hrefToRequest = object.atIdFromObject(file);
        } else if (Array.isArray(file) && this.props.node && this.props.node.meta && this.props.node.meta.workflow){ // If we have a group of files
            hrefToRequest = this.props.node.meta.workflow;
        }

        if (typeof hrefToRequest === 'string') { // Our file is not embedded. Is a UUID.
            ajax.load(hrefToRequest, (res)=>{
                if (res && typeof res === 'object'){
                    this.setState({ file : res });
                }
            }, 'GET', (r) => {
                if (r && r.code && r.code === 403){ // No view permissions
                    this.setState({ file : 'Forbidden' });
                } else {
                    this.setState({ file : null });
                }
                
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
        if (Array.isArray(this.props.file)) { // Some sort of group
            fileTitle = 'Workflow';
            if (typeof file !== 'string' && file && file.display_title) fileTitle = file.display_title;
            if (typeof node.meta.workflow === 'string'){
                fileTitleFormatted = <a href={node.meta.workflow}>{ fileTitle }</a>;
            } else {
                fileTitleFormatted = fileTitle;
            }
        } else if (typeof file === 'string') {
            if (file === 'Forbidden'){
                if (this.props.file && typeof this.props.file !== 'string'){
                    fileTitle = getTitleStringFromContext(this.props.file);
                    var fileAtID = object.atIdFromObject(this.props.file);
                    fileTitleFormatted = fileAtID ? <a href={fileAtID}>{ fileTitle }</a> : fileTitle;
                } else {
                    fileTitleFormatted = <span className="text-300">Not Available</span>;
                }
            } else {
                fileTitle = null;
                fileTitleFormatted = <small><i className="icon icon-circle-o-notch icon-spin icon-fw"/></small>;
            }
        } else {
            fileTitle = getTitleStringFromContext(file);
            if (!this.doesDescriptionOrNotesExist()){
                colClassName = "col-sm-6 col-lg-6";
            }
            fileTitleFormatted = <a href={object.atIdFromObject(file) || '/' + file.uuid} className="inline-block">{ fileTitle }</a>;
        }
        return (
            <div className={colClassName + " file-title box"}>
                <div className="text-600">
                    {
                        node.type === 'output' ? 'Generated' :
                            node.type === 'input' ? 'Used' :
                                null
                    } {
                        Array.isArray(this.props.file) ?
                            this.props.file.length + ' total files from' + (file && file.display_title ? ' Workflow' : '')
                            :
                            'File'
                    }
                </div>
                <h3 className="text-400 node-file-title text-ellipsis-container">
                    <span className="inline-block" data-tip={fileTitle}>{ fileTitleFormatted }</span>
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
        var node = this.props.node;
        var file = this.state.file;
        var body;

        if (!file){
            return null;
        }

        if (Array.isArray(this.props.file) && typeof this.props.file[0] === 'object' && object.atIdFromObject(this.props.file[0])) {
            // Case: Group of Files
            var columns = _.clone(SimpleFilesTable.defaultProps.columns);
            delete columns.file_type;
            columns.status = 'Status';
            body = <SimpleFilesTable results={this.props.file} columns={columns} hideTypeTitle />;
        } else if (typeof file === 'string'/* || !fileUtil.isFileDataComplete(this.state.file)*/){
            // Case: Loading or Forbidden
            if (file === 'Forbidden'){
                body = (
                    <div>
                        <h4 className="text-400" style={{ color : '#777' }}>
                            <i className="icon icon-times" style={{ color : '#8e0000' }}/>&nbsp; No View Permissions
                        </h4>
                        <hr/>
                    </div>
                );
            } else {
                body = null;
            }
        } else if (MetricsView.isNodeQCMetric(node)){
            // Case: QC Metric
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
            // Default Case: Single (Pre-)Loaded File
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
