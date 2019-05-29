'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Fade, Button } from 'react-bootstrap';
import { console, object, layout, ajax, fileUtil, expFxn } from './../../../util';
import { FlexibleDescriptionBox } from './../FlexibleDescriptionBox';
import { SimpleFilesTable } from './../tables';
import { ItemDetailList } from './../ItemDetailList';
import { ExperimentSetTablesLoaded } from './../tables/ExperimentSetTables';
import { ViewMetricButton, MetricsView } from './FileDetailBodyMetricsView';
import { WorkflowNodeElement } from './../WorkflowNodeElement';




export class FileDetailBody extends React.PureComponent {

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'file' : PropTypes.object.isRequired,
        'schemas' : PropTypes.object.isRequired,
        'minHeight' : PropTypes.number,
        'keyTitleDescriptionMap' : PropTypes.object,
        'windowWidth' : PropTypes.number.isRequired
    };

    doesDescriptionOrNotesExist(){
        var file = this.props.file;
        return !!(file.description || file.notes || false);
    }

    fileTitleBox(){
        var { node, file } = this.props,
            fileTitle, fileTitleFormatted, statusIndicator;

        if (Array.isArray(file)) { // Some sort of group (of files)
            fileTitle = 'Workflow';
            if (typeof file !== 'string' && file && file.display_title){
                fileTitle = file.display_title;
            }
            if (typeof node.meta.workflow === 'string'){
                fileTitleFormatted = <a href={node.meta.workflow}>{ fileTitle }</a>;
            } else {
                fileTitleFormatted = fileTitle;
            }
        } else { // Single File
            fileTitle = object.itemUtil.getTitleStringFromContext(file);
            fileTitleFormatted = <a href={object.atIdFromObject(file) || '/' + file.uuid} className="inline-block">{ fileTitle }</a>;
            statusIndicator = file.status && (
                <i className="item-status-indicator-dot mr-07" data-status={ file.status && file.status.toLowerCase() }
                    data-tip={"Status - " + file.status} />
            );
        }
        if (typeof fileTitle !== 'string' || fileTitle.length < 35){
            fileTitle = null;
        }
        return (
            <div className="col-sm-6 col-lg-8 file-title box">
                <div className="text-600">
                    {
                        node.nodeType === 'output' ? 'Generated' :
                            node.nodeType === 'input' ? 'Used' :
                                null
                    } {
                        Array.isArray(file) ?
                            file.length + ' total files from' + (file && file.display_title ? ' Workflow' : '')
                            :
                            WorkflowNodeElement.isNodeQCMetric(node) ? 'Report' : 'File'
                    }
                </div>
                <h3 className="text-400 node-file-title text-ellipsis-container" data-tip={fileTitle}>
                    { statusIndicator } { fileTitleFormatted }
                </h3>
            </div>
        );
    }

    downloadLinkBox(){
        var { node, file } = this.props, content;

        if (WorkflowNodeElement.isNodeQCMetric(node)){
            content = <ViewMetricButton {...{ node, file }}/>;
        } else {
            content = <fileUtil.FileDownloadButtonAuto result={file} />;
        }

        return (
            <div className="col-sm-6 col-lg-4 right box buttons-container">
                { content }
            </div>
        );
    }

    descriptionBox(){
        var { file, windowWidth } = this.props,
            gridSize = layout.responsiveGridState(windowWidth),
            lgColSize = (file && file.quality_metric && file.quality_metric.display_title && '8') || '12';

        if (!this.doesDescriptionOrNotesExist()) return null;

        return (
            <div className={"col-xs-12 col-lg-" + lgColSize + " box"}>
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

    qcBox(){
        var { file, node } = this.props,
            qc, qcLink;

        if (!file || Array.isArray(file)){
            return null;
        }

        qc = file && file.quality_metric;
        qcLink = qc && (qc.url || object.itemUtil.atId(qc));

        if (!qcLink) return null;

        return (
            <div className="col-sm-6 col-lg-4 right box buttons-container">
                <ViewMetricButton file={qc} defaultBtnClassName="btn-secondary" data-tip="View the Quality Control Metrics for this File" />
            </div>
        );

    }

    /**
     * @todo Figure out if can use state.file always in place of props.file here.
     */
    render(){
        const { file, node, schemas, windowWidth, minHeight, keyTitleDescriptionMap } = this.props;
        let body, description, attachedQCBtn;

        if (!file){
            return null;
        }

        if (Array.isArray(file) && typeof file[0] === 'object' && object.atIdFromObject(file[0])) {
            // Case: Group of Files
            const columns = _.clone(SimpleFilesTable.defaultProps.columns);
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
        } else if (WorkflowNodeElement.isNodeQCMetric(node)){
            // Case: QC Metric
            const metrics = object.listFromTips(object.tipsFromSchema(schemas, file))
                .filter(function(m){
                    if (m.key === 'status') return false;
                    if (m.enum) return true;
                    if (m.type === 'number') return true;
                    return false;
                })
                .map(function(m){
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
                    table = <ExperimentSetTablesLoaded experimentSetUrls={setUrls} windowWidth={windowWidth} id={object.itemUtil.atId(file)} />;
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

        description = this.descriptionBox(),
        attachedQCBtn = this.qcBox();

        return (
            <div>
                <div className="information">
                    <div className="row">
                        { this.fileTitleBox() }
                        { this.downloadLinkBox() }
                    </div>
                    { (description || attachedQCBtn) && (
                        <React.Fragment>
                            <hr/>
                            <div className="row">
                                { description }
                                { attachedQCBtn }
                            </div>
                        </React.Fragment>
                    ) }
                </div>
                <hr/>
                { body }
            </div>
        );
    }
}
