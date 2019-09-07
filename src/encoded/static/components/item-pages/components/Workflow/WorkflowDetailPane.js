'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, layout, schemaTransforms } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';


function getFile(node){
    const { meta : { run_data = null } = {} } = node;
    return (run_data && run_data.file) || null;
}

export const WorkflowDetailPane = React.memo(function WorkflowDetailPane(props){
    const { node, minHeight } = props;
    console.log('SELECTED NODE', node, minHeight);

    if (!node){
        return <div className="detail-pane-container no-contents"/>;
    }

    let body;

    if (getFile(node)){
        body = <FileDetailBody {...props} />;
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
    const { display_title, accession, '@id' : atId } = file;
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
                <div className="col">
                    <label>{ fileType }</label>
                    <h3>{ title }</h3>
                </div>
                <div className="col-auto">
                    <i className="icon icon-times fas clickable" onClick={deselectNode} />
                </div>
            </div>
        </React.Fragment>
    );
}
