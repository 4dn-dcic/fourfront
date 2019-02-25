'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object } from './../../../util';


class AnalysisStepSoftwareDetailRow extends React.Component {

    softwareUsedBox(){
        var soft    = this.props.software,
            inner   = null;

        function renderLink(s, idx=0){
            var link = object.atIdFromObject(s),
                title;
            if (typeof s.name === 'string' && s.version){
                title = s.name + ' v' + s.version;
            } else if (s.title) {
                title = s.title;
            } else {
                title = link;
            }
            return <span key={link || idx}>{ idx > 0 ? ', ' : '' }<a href={link} key={idx}>{ title }</a></span>;
        }
        
        if (!soft){
            inner = <em>N/A</em>;
        } else if (typeof soft === 'string' || (Array.isArray(soft) && _.every(soft, function(s){ return typeof s === 'string'; }))){
            inner = <i className="icon icon-circle-o-notch icon-spin icon-fw"/>;
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

export class StepDetailBody extends React.Component {

    stepTitleBox(){
        var { step, context, node } = this.props,
            titleString = step.display_title || step.name || node.name,
            stepHref    = object.atIdFromObject(step) || null;

        return (
            <div className="col-sm-6 box">
                <span className="text-600">Step Name</span>
                { stepHref ?
                    <h3 className="text-400 text-ellipsis-container"><a href={stepHref}>{ titleString }</a></h3>
                    :
                    <h3 className="text-300 text-ellipsis-container">{ titleString }</h3>
                }
            </div>
        );
    }

    /**
     * This prints out the contents of `Step.meta.analysis_step_types` under the tile
     * of "Purposes". `analysis_step_types` is filled manually in Workflow inserts/data,
     * however for Provenance graphs, this property might be filled in from other places,
     * such as WorkflowRun/Workflow `category`, because in Provenance graphs, each Workflow
     * is analagous to an "Analysis Step".
     *
     * @returns {JSX.Element} Column box with 'Purposes'.
     */
    purposesBox(){
        var step        = this.props.step,
            purposeList = step.analysis_step_types,
            elementType = 'h5';

        if (!Array.isArray(purposeList)){
            return <div className="col-sm-6 box"/>;
        }

        if (purposeList.length === 1) elementType = 'h4';

        return(
            <div className="col-sm-6 box">
                <span className="text-600">Purpose{ purposeList.length > 1 ? 's' : '' }</span>
                { React.createElement(elementType, { 'className' : 'text-400' }, purposeList.map(function(p, i){
                    return <span className="text-capitalize" key={p}>{ p }{ i !== purposeList.length - 1 ? ', ' : '' }</span>;
                })) }
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
                        { this.stepTitleBox() }
                        { this.purposesBox() }
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
