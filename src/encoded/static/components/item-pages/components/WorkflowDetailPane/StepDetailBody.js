'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { console, object } from './../../../util';


class AnalysisStepSoftwareDetailRow extends React.PureComponent {

    softwareUsedBox(){
        var soft    = this.props.software,
            inner   = null;

        function renderLink(s, idx=0){
            var link = object.atIdFromObject(s),
                title;

            if (typeof s.name === 'string' && s.version){
                title = s.name + ' v' + s.version;
            } else if (s.display_title) {
                title = s.display_title;
            } else {
                title = link;
            }
            return <span key={link || idx}>{ idx > 0 ? ', ' : '' }<a href={link} key={idx}>{ title }</a></span>;
        }

        if (!soft || (Array.isArray(soft) && soft.length === 0)){
            inner = <em>N/A</em>;
        } else {
            inner = Array.isArray(soft) ? _.map(soft, renderLink) : renderLink(soft);
        }

        return (
            <div className="col-sm-12 box">
                <span className="text-600">Software Used</span>
                <h4 className="text-400 text-ellipsis-container">
                    { inner }
                </h4>
            </div>
        );
    }

    softwareLinkBox(){
        var soft = this.props.software;
        var inner = null;
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
    }

    render(){
        return (
            <div className="row">
                { this.softwareUsedBox() }
                {/* this.softwareLinkBox() */}
            </div>
        );
    }

}


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
export class WorkflowStepDetailPurposesBox extends React.PureComponent {

    static analysisStepTypesExist = memoize(function(step){
        if (!step || !Array.isArray(step.analysis_step_types) || step.analysis_step_types.length === 0){
            return false;
        }
        return true;
    });

    render(){
        if (!WorkflowStepDetailPurposesBox.analysisStepTypesExist(this.props.step)){
            return null;
        }
        var step = this.props.step,
            purposeList = step.analysis_step_types,
            elementType = 'h5';

        if (purposeList.length === 1) elementType = 'h4';

        return(
            <div className="col-sm-6 box">
                <span className="text-600">Purpose{ purposeList.length > 1 ? 's' : '' }</span>
                { React.createElement(elementType, { 'className' : 'text-400' }, _.map(purposeList, function(p, i){
                    return <span className="text-capitalize" key={p}>{ p }{ i !== purposeList.length - 1 ? ', ' : '' }</span>;
                })) }
            </div>
        );
    }
}

export class WorkflowStepTitleBox extends React.PureComponent {

    static defaultProps = {
        'isFullRow' : function(step){
            return !WorkflowStepDetailPurposesBox.analysisStepTypesExist(step);
        },
        'label' : "Step Name"
    };

    render(){
        var { step, node, isFullRow, label } = this.props,
            shouldBeFullRow = (typeof isFullRow === 'function' && isFullRow(step)) || (typeof isFullRow === 'boolean' && isFullRow) || false,
            titleString     = step.display_title || step.name || node.name,
            stepHref        = object.atIdFromObject(step) || null;

        return (
            <div className={"box col-sm-" + (shouldBeFullRow ? '12' : '6')}>
                <span className="text-600">{ label }</span>
                { stepHref ?
                    <h3 className="text-400 text-ellipsis-container"><a href={stepHref}>{ titleString }</a></h3>
                    :
                    <h3 className="text-300 text-ellipsis-container">{ titleString }</h3>
                }
            </div>
        );
    }

}



export class StepDetailBody extends React.PureComponent {

    stepTitleBox(){
        var { step, node } = this.props,
            stepPurposesVisible = WorkflowStepDetailPurposesBox.analysisStepTypesExist(step),
            titleString = step.display_title || step.name || node.name,
            stepHref    = object.atIdFromObject(step) || null;

        return (
            <div className={"box col-sm-" + (stepPurposesVisible ? '6' : '12')}>
                <span className="text-600">Step Name</span>
                { stepHref ?
                    <h3 className="text-400 text-ellipsis-container"><a href={stepHref}>{ titleString }</a></h3>
                    :
                    <h3 className="text-300 text-ellipsis-container">{ titleString }</h3>
                }
            </div>
        );
    }

    render(){
        var { node, step } = this.props, // this.props.step === this.props.node.meta
            softwareUsed = step.software_used || null;

        return(
            <div style={{ minHeight : this.props.minHeight }}>
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
    }

}
