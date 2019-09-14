'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, layout, schemaTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFileAttachment } from './../ItemFileAttachment';
import { isNodeFile, isNodeGroup, isNodeParameter, isNodeQCMetric } from './WorkflowNodeElement';

export function getFile(node){
    if (!isNodeFile(node)) return null;
    const { meta : { run_data = null } = {} } = node;
    return (run_data && run_data.file) || null;
}

export const WorkflowDetailPane = React.memo(function WorkflowDetailPane(props){
    const { node, minHeight } = props;
    if (!node){
        return <div className="detail-pane-container no-contents"/>;
    }

    console.log('SELECTED NODE', node, minHeight);

    const { nodeType } = node;

    let body;

    if (getFile(node)){
        body = <FileDetailBody {...props} />;
    } else if (nodeType === "step"){
        body = <StepDetailBody {...props} />;
    }

    return (
        <div className="detail-pane-container has-selected-node" style={{ minHeight }}>
            <div className="detail-pane-inner">{ body }</div>
        </div>
    );
});

function FileDetailBody(props){
    const { node, deselectNode, context, schemas } = props;
    const file = getFile(node);
    const { display_title, accession, '@id' : atId, quality_metric = {} } = file;
    const fileType = schemaTransforms.getItemTypeTitle(file, schemas) || "File";
    let title;
    if (context && context['@id'] === atId){
        title = accession || display_title;
    } else {
        title = <a href={atId}>{ accession || display_title }</a>;
    }

    return (
        <React.Fragment>
            <div className="title-box row">
                <div className="col-11">
                    <label>{ fileType }</label>
                    <h3>{ title }</h3>
                </div>
                <div className="col-auto">
                    <i className="icon icon-times fas clickable" onClick={deselectNode} />
                </div>
            </div>
            <div className="details">
                <QualityMetricBtn { ...quality_metric } />
            </div>
        </React.Fragment>
    );
}

function QualityMetricBtn(props){
    const { '@id' : qmID, url: qmURL, overall_quality_status = null } = props;
    if (!qmID || !qmURL) return null;
    return (
        <div className="detail-row">
            <a href={qmURL} target="_blank" rel="noreferrer noopener" className="btn btn-outline-dark">
                Quality Metric
            </a>
        </div>
    );
}

function StepDetailBody(props){
    const { node, deselectNode, context, schemas } = props;
    const { meta = {}, name: stepNodeName } = node;
    const { '@id' : stepID, workflow = null, display_title } = meta;
    const { '@id' : workflowID, display_title: workflowTitle } = workflow || {};
    let typeTitle = "Workflow Step";
    if (workflowID && workflowTitle){
        typeTitle = "Workflow Run";
    }
    let title;
    if (stepID && display_title){
        title = <a href={stepID}>{ display_title }</a>;
    } else {
        title = display_title || stepNodeName;
    }
    return (
        <React.Fragment>
            <div className="title-box row">
                <div className="col-11">
                    <label>{ typeTitle }</label>
                    <h3>{ title }</h3>
                </div>
                <div className="col-auto">
                    <i className="icon icon-times fas clickable" onClick={deselectNode} />
                </div>
            </div>
        </React.Fragment>
    );
}
