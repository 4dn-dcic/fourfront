'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Fade } from 'react-bootstrap';
import { console, object, layout, ajax, fileUtil, expFxn } from './../../../util';
import { FlexibleDescriptionBox } from './../FlexibleDescriptionBox';
import { SimpleFilesTable } from './../SimpleFilesTable';
import { ItemDetailList } from './../ItemDetailList';
import { ExperimentSetTablesLoaded } from './../ExperimentSetTables';
import { ViewMetricButton, MetricsView } from './FileDetailBodyMetricsView';




export class FileDetailBody extends React.PureComponent {

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'file' : PropTypes.object.isRequired,
        'schemas' : PropTypes.object.isRequired,
        'minHeight' : PropTypes.number,
        'keyTitleDescriptionMap' : PropTypes.object,
        'windowWidth' : PropTypes.number.isRequired
    };

    static defaultProps = {
        'canDownloadStatuses' : fileUtil.FileDownloadButtonAuto.defaultProps.canDownloadStatuses
    };

    doesDescriptionOrNotesExist(){
        var file = this.props.file;
        return !!(file.description || file.notes || false);
    }

    canDownload(){
        var { file, canDownloadStatuses } = this.props;
        if (file && !Array.isArray(file) && typeof file !== 'string' && canDownloadStatuses.indexOf(file.status) > -1){
            return true;
        }
        return false;
    }

    fileTitleBox(){
        var { node, file } = this.props,
            colClassName = "col-sm-6 col-lg-4",
            fileTitle, fileTitleFormatted;

        //if (typeof file === 'object' && file && !fileUtil.isFileDataComplete(file) && !Array.isArray(file)) {}
        if (Array.isArray(file)) { // Some sort of group
            fileTitle = 'Workflow';
            if (typeof file !== 'string' && file && file.display_title){
                fileTitle = file.display_title;
            }
            if (typeof node.meta.workflow === 'string'){
                fileTitleFormatted = <a href={node.meta.workflow}>{ fileTitle }</a>;
            } else {
                fileTitleFormatted = fileTitle;
            }
        } else {
            fileTitle = object.itemUtil.getTitleStringFromContext(file);
            if (!this.doesDescriptionOrNotesExist()){
                colClassName = "col-sm-6 col-lg-6";
            }
            fileTitleFormatted = <a href={object.atIdFromObject(file) || '/' + file.uuid} className="inline-block">{ fileTitle }</a>;
        }
        if (typeof fileTitle !== 'string' || fileTitle.length < (this.doesDescriptionOrNotesExist() ? 25 : 35)){
            fileTitle = null;
        }
        return (
            <div className={colClassName + " file-title box"}>
                <div className="text-600">
                    {
                        node.nodeType === 'output' ? 'Generated' :
                            node.nodeType === 'input' ? 'Used' :
                                null
                    } {
                        Array.isArray(file) ?
                            file.length + ' total files from' + (file && file.display_title ? ' Workflow' : '')
                            :
                            'File'
                    }
                </div>
                <h3 className="text-400 node-file-title text-ellipsis-container" data-tip={fileTitle}>{ fileTitleFormatted }</h3>
            </div>
        );
    }

    downloadLinkBox(){
        var { node, windowWidth, file } = this.props,
            gridSize     = layout.responsiveGridState(windowWidth),
            title        = <span>Download</span>,
            disabled     = (!file.href && !file.url) || !this.canDownload(),
            content      = <fileUtil.FileDownloadButton {...{ title, disabled }} href={file.href || file.url} filename={file.filename} />,
            colClassName = this.doesDescriptionOrNotesExist() ? "col-sm-6 col-lg-4" : "col-sm-6 col-lg-6";
    
        //if (gridSize === 'sm' || gridSize === 'xs') return null;

        //if ((!file.href && !file.url)) return <div className="col-sm-4 col-lg-4 box">&nbsp;</div>;

        return (
            <div className={colClassName + " right box buttons-container"}>
                <ViewMetricButton {...{ node, file }}/> { content }
            </div>
        );
    }

    descriptionBox(){
        var { file, windowWidth } = this.props,
            gridSize = layout.responsiveGridState(windowWidth);

        if (!this.doesDescriptionOrNotesExist()) return null;

        return (
            <div className="col-xs-12 col-lg-4 box">
                <span className="text-600">{ file.description ? 'Description' : (file.notes ? 'Notes' : 'Description') }</span>
                <div className="description-box-container">
                    <FlexibleDescriptionBox
                        windowWidth={windowWidth}
                        description={file.description || file.notes || <em>No description.</em>}
                        fitTo="self"
                        textClassName="text-medium"
                        expanded={gridSize === 'xs' || gridSize === 'sm' || gridSize === 'md'}
                        dimensions={null}
                    />
                </div>
            </div>
        );
    }

    iframeBox(){
        var { file, node } = this.props;
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

    /**
     * @todo Figure out if can use state.file always in place of props.file here.
     */
    render(){
        var { file, node, schemas, windowWidth, minHeight, keyTitleDescriptionMap } = this.props,
            body;

        if (!file){
            return null;
        }

        if (Array.isArray(file) && typeof file[0] === 'object' && object.atIdFromObject(file[0])) {
            // Case: Group of Files
            var columns = _.clone(SimpleFilesTable.defaultProps.columns);
            delete columns.file_type;
            columns.status = { 'title' : 'Status' };
            body = <SimpleFilesTable results={file} columns={columns} hideTypeTitle />;
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
            var metrics = object.listFromTips(object.tipsFromSchema(schemas, file))
                .filter(function(m){
                    if (m.key === 'status') return false;
                    if (m.enum) return true;
                    if (m.type === 'number') return true;
                    return false;
                })
                .map((m)=>{
                    return _.extend(m, {
                        'result' : file[m.key]
                    });
                });

            body = <MetricsView metrics={metrics} />;
        } else {
            // Default Case: Single (Pre-)Loaded File
            var table = null;
            if ( file && (Array.isArray(file.experiments) || Array.isArray(file.experiment_sets)) ){
                var setUrls = expFxn.experimentSetsFromFile(file, 'ids');
                if (setUrls && setUrls.length > 0){
                    table = <ExperimentSetTablesLoaded experimentSetUrls={setUrls} windowWidth={windowWidth} />;
                }
            }
            body = (
                <div>
                    { table }
                    { table ? <br/> : null }
                    <h3 className="tab-section-title">
                        <span>Details</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <ItemDetailList context={file} schemas={schemas}
                        minHeight={minHeight} keyTitleDescriptionMap={keyTitleDescriptionMap} />
                </div>
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
