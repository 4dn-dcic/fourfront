'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { console, object, layout, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { fileUtil, expFxn } from './../../../util';

import { FlexibleDescriptionBox } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FlexibleDescriptionBox';
import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemDetailList';

import { SimpleFilesTable } from './../tables/SimpleFilesTable';
import { ExperimentSetTablesLoaded } from './../tables/ExperimentSetTables';
import { ViewMetricButton, MetricsView } from './FileDetailBodyMetricsView';
import { WorkflowNodeElement } from './../WorkflowNodeElement';



export class FileDetailBody extends React.PureComponent {

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'file' : PropTypes.object.isRequired,
        'schemas' : PropTypes.object.isRequired,
        'session' : PropTypes.bool.isRequired,
        'minHeight' : PropTypes.number,
        'keyTitleDescriptionMap' : PropTypes.object,
        'windowWidth' : PropTypes.number.isRequired,
        'canShowMetricURL' : PropTypes.bool
    };

    doesDescriptionOrNotesExist(){
        const { file } = this.props;
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
            fileTitleFormatted = <a href={object.atIdFromObject(file) || '/' + file.uuid} className="link-underline-hover d-inline-block">{ fileTitle }</a>;
            statusIndicator = file.status && (
                <i className="item-status-indicator-dot me-07" data-status={ file.status && file.status.toLowerCase() }
                    data-tip={"Status - " + file.status} />
            );
        }
        if (typeof fileTitle !== 'string' || fileTitle.length < 35){
            fileTitle = null;
        }
        return (
            <div className="col-12 col-sm-6 col-lg-8 file-title box">
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
                <h3 className="text-400 node-file-title text-truncate" data-tip={fileTitle}>
                    { statusIndicator } { fileTitleFormatted }
                </h3>
            </div>
        );
    }

    downloadLinkBox(){
        var { node, file, session, canShowMetricURL = false } = this.props, content;

        if (WorkflowNodeElement.isNodeQCMetric(node)) {
            if (canShowMetricURL !== true) {
                return null;
            }
            content = <ViewMetricButton {...{ node, file }} />;
        } else {
            content = <fileUtil.FileDownloadButtonAuto result={file} session={session} />;
        }

        return (
            <div className="col-12 col-sm-6 col-lg-4 right box buttons-container">
                { content }
            </div>
        );
    }

    descriptionBox(){
        const { file, windowWidth } = this.props;
        const gridSize = layout.responsiveGridState(windowWidth);
        const lgColSize = (file && file.quality_metric && file.quality_metric.display_title && '8') || '12';

        if (!this.doesDescriptionOrNotesExist()) return null;

        return (
            <div className={"col-12 col-lg-" + lgColSize + " box"}>
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
        const { file, node, canShowMetricURL = false } = this.props;
        let qc = null, qcLink = null;

        if (!file || Array.isArray(file)){
            return null;
        }

        qc = file && file.quality_metric;
        qcLink = qc && (qc.url || object.itemUtil.atId(qc));

        if (!qcLink || !canShowMetricURL) return null;

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
                            <i className="icon icon-times fas" style={{ color : '#8e0000' }}/>&nbsp; No View Permissions
                        </h4>
                        <hr/>
                    </div>
                );
            } else {
                body = null;
            }
        } else if (WorkflowNodeElement.isNodeQCMetric(node)){
            body = <NodeQCMetricsTable {...{ file, schemas }} />;
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

class NodeQCMetricsTable extends React.PureComponent {

    static propTypes = {
        'file' : PropTypes.object.isRequired,
        'schemas' : PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            'mounted': false,
        };
    }

    componentDidMount() {
        const { file } = this.props;
        const qcAtId = file && object.atIdFromObject(file);

        if (qcAtId) {
            this.setState({ 'mounted': true, 'loading': true }, () => {
                ajax.load(qcAtId, (res) => {
                    if (res && typeof res === 'object') {
                        this.setState({ 'qcItem': res, 'loading': false });
                    }
                }, 'GET', () => {
                    this.setState({ 'qcItem': file, 'loading': false });
                });
            });
        } else {
            this.setState({ 'qcItem': file, 'loading': false });
        }
    }

    render() {
        const { schemas } = this.props;
        const { mounted, loading, qcItem } = this.state;

        if (!mounted) {
            return null;
        }
        if (loading) {
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw fas icon-spin icon-circle-notch" />
                </div>
            );
        }
        if (!qcItem) {
            return (
                <div className="text-center text-300 mt-1" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    Quality Metrics not found
                </div>
            );
        }
        // Case: QC Metric
        const metrics = object.listFromTips(object.tipsFromSchema(schemas, qcItem))
            .filter(function (m) {
                if (m.key === 'status') return false;
                if (m.enum) return true;
                if (m.type === 'number') return true;
                return false;
            })
            .map(function (m) {
                return _.extend(m, {
                    'result': qcItem[m.key]
                });
            });

        return <MetricsView metrics={metrics} />;
    }
}
