'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object } from './../../../util';


class AnalysisStepSoftwareDetailRow extends React.Component {

    softwareUsedBox(){
        var soft = this.props.software;
        if (!soft){
            return (
                <div className="col-sm-6 box">
                    <span className="text-600">Software Used</span>
                    <h5 className="text-400 text-ellipsis-container">
                        <em>N/A</em>
                    </h5>
                </div>
            );
        }
        if (typeof soft === 'string' || (Array.isArray(soft) && _.every(soft, function(s){ return typeof s === 'string'; }))){
            return (
                <div className="col-sm-6 box">
                    <span className="text-600">Software Used</span>
                    <h5 className="text-400 text-ellipsis-container">
                        <i className="icon icon-circle-o-notch icon-spin icon-fw"/>
                    </h5>
                </div>
            );
        }

        var renderLink = function(s, idx=0){
            var link = object.atIdFromObject(s);
            var title;
            if (typeof s.name === 'string' && s.version){
                title = s.name + ' v' + s.version;
            } else if (s.title) {
                title = s.title;
            } else {
                title = link;
            }
            return <span>{ idx > 0 ? ', ' : '' }<a href={link} key={idx}>{ title }</a></span>;
        };

        return (
            <div className="col-sm-6 box">
                <span className="text-600">Software Used</span>
                <h4 className="text-400 text-ellipsis-container">
                    { Array.isArray(soft) ? _.map(soft, renderLink) : renderLink(soft) }
                </h4>
            </div>
        );
    }

    softwareLinkBox(){
        var soft = this.props.software;
        // TODO: MAKE THIS HANDLE ARRAYS!!
        if (!soft || !soft.source_url) return (
            <div className="col-sm-6 box">
                <span className="text-600">Software Source</span>
                <h5 className="text-400 text-ellipsis-container">
                    <em>N/A</em>
                </h5>
            </div>
        );
        return (
            <div className="col-sm-6 box">
                <span className="text-600">Software Source</span>
                <h5 className="text-400 text-ellipsis-container">
                    <a href={soft.source_url} title={soft.source_url}>{ soft.source_url }</a>
                </h5>
            </div>
        );
    }

    render(){

        return (
            <div className="row">

                { this.softwareUsedBox() }
                { this.softwareLinkBox() }

            </div>
        );
    }

}

export class StepDetailBody extends React.Component {

    stepTitleBox(){
        var { step, context, node } = this.props;
        var titleString = step.display_title || step.name || node.name;
        var stepHref = object.atIdFromObject(step) || null;

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

    purposesBox(){
        var step = this.props.step;
        var purposeList = step.analysis_step_types;
        if (!Array.isArray(purposeList)){
            return <div className="col-sm-6 box"/>;
        }
        var elementType = 'h5';
        if (purposeList.length  === 1) elementType = 'h4';
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
        var { node, step } = this.props; // this.props.step === this.props.node.meta

        var self_software_used = step.software_used || null;
        if (typeof self_software_used === 'string' && self_software_used.charAt(0) !== '/' && object.isUUID(self_software_used)){
            self_software_used = '/software/' + self_software_used;
        }

        return(
            <div style={{ minHeight : this.props.minHeight }}>
                <div className="information">
                    <div className="row">

                        { this.stepTitleBox() }
                        { this.purposesBox() }

                    </div>
                    { self_software_used ? <hr/> : null }
                    { self_software_used ? <AnalysisStepSoftwareDetailRow software={self_software_used}/> : null }
                    
                </div>
                <hr/>
            </div>
        );
    }

}
