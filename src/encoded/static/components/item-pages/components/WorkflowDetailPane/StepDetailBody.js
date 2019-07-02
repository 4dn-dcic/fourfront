'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';


/** @todo this can be functional components */


const SoftwareUsedBox = React.memo(function SoftwareUsedBox({ software: soft }){
    let inner = null;

    if (!soft || (Array.isArray(soft) && soft.length === 0)){
        inner = <em>N/A</em>;
    } else {
        inner = Array.isArray(soft) ? _.map(soft, SoftwareUsedBox.renderLink) : SoftwareUsedBox.renderLink(soft);
    }

    return (
        <div className="col col-sm-12 box">
            <span className="text-600">Software Used</span>
            <h4 className="text-400 text-ellipsis-container">
                { inner }
            </h4>
        </div>
    );
});
SoftwareUsedBox.renderLink = function(s, idx=0){
    const link = object.atIdFromObject(s);
    let title;

    if (typeof s.name === 'string' && s.version){
        title = s.name + ' v' + s.version;
    } else if (s.display_title) {
        title = s.display_title;
    } else {
        title = link;
    }
    return <span key={link || idx}>{ idx > 0 ? ', ' : '' }<a href={link} key={idx}>{ title }</a></span>;
};

/* Currently not used */
const SoftwareSourceLinkBox = React.memo(function SoftwareSourceLinkBox({ software: soft }){
    let inner = null;

    // TODO: MAKE THIS HANDLE ARRAYS!! Hidden for now.
    if (!soft || !soft.source_url){
        inner = <em>N/A</em>;
    } else {
        inner = <a href={soft.source_url} title={soft.source_url}>{ soft.source_url }</a>;
    }
    return (
        <div className="col-sm-6 box">
            <span className="text-600">Software Source</span>
            <h5 className="text-400 text-ellipsis-container">
                { inner }
            </h5>
        </div>
    );
});

const AnalysisStepSoftwareDetailRow = React.memo(function AnalysisStepSoftwareDetailRow({ software: soft }){
    return (
        <div className="row">
            <SoftwareUsedBox software={soft} />
            {/* <SoftwareSourceLinkBox software={soft}/> */}
        </div>
    );
});



/**
 * This prints out the contents of `Step.meta.analysis_step_types` under the tile
 * of "Purposes". `analysis_step_types` is filled manually in Workflow inserts/data,
 * however for Provenance graphs, this property might be filled in from other places,
 * such as WorkflowRun/Workflow `category`, because in Provenance graphs, each Workflow
 * is analagous to an "Analysis Step".
 *
 * This is meant to be put within a `<div className="row">...</div>` block along with a
 * `WorkflowStepTitleBox` instance right before it, both being fed the same step.
 *
 * @returns {JSX.Element} Column box with 'Purposes'.
 */
export const WorkflowStepDetailPurposesBox = React.memo(function WorkflowStepDetailPurposesBox({ step }){
    if (!WorkflowStepDetailPurposesBox.analysisStepTypesExist(step)){
        return null;
    }

    const purposeList = step.analysis_step_types;
    let elementType = 'h5';

    if (purposeList.length === 1) elementType = 'h4';

    return(
        <div className="col-sm-6 box">
            <span className="text-600">Purpose{ purposeList.length > 1 ? 's' : '' }</span>
            { React.createElement(elementType, { 'className' : 'text-400' }, _.map(purposeList, function(p, i){
                return <span className="text-capitalize" key={p}>{ p }{ i !== purposeList.length - 1 ? ', ' : '' }</span>;
            })) }
        </div>
    );
});
WorkflowStepDetailPurposesBox.analysisStepTypesExist = memoize(function(step){
    if (!step || !Array.isArray(step.analysis_step_types) || step.analysis_step_types.length === 0){
        return false;
    }
    return true;
});



export const WorkflowStepTitleBox = React.memo(function WorkflowStepTitleBox({ step, node, isFullRow, label }){
    const shouldBeFullRow = (typeof isFullRow === 'function' && isFullRow(step)) || (typeof isFullRow === 'boolean' && isFullRow) || false;
    const titleString     = step.display_title || step.name || node.name;
    const stepHref        = object.atIdFromObject(step) || null;

    return (
        <div className={"box col col-sm-" + (shouldBeFullRow ? '12' : '6')}>
            <span className="text-600">{ label }</span>
            { stepHref ?
                <h3 className="text-400 text-ellipsis-container"><a href={stepHref}>{ titleString }</a></h3>
                :
                <h3 className="text-300 text-ellipsis-container">{ titleString }</h3>
            }
        </div>
    );
});
WorkflowStepTitleBox.defaultProps = {
    'isFullRow' : function(step){
        return !WorkflowStepDetailPurposesBox.analysisStepTypesExist(step);
    },
    'label' : "Step Name"
};


export const StepDetailBody = React.memo(function StepDetailBody({ step, node, minHeight }){
    // props.step === props.node.meta
    const softwareUsed = step.software_used || null;

    return(
        <div style={{ minHeight }}>
            <div className="information">
                <div className="row">
                    <WorkflowStepTitleBox step={step} />
                    <WorkflowStepDetailPurposesBox step={step} />
                </div>
                { softwareUsed ?
                    <React.Fragment>
                        <hr/>
                        <AnalysisStepSoftwareDetailRow software={softwareUsed}/>
                    </React.Fragment>
                    : null }
            </div>
            <hr/>
        </div>
    );
});
