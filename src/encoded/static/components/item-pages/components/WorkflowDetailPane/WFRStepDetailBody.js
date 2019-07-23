'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { Fade } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Fade';
import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/ItemDetailList';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { WorkflowStepDetailPurposesBox, WorkflowStepTitleBox } from './StepDetailBody';

function tipIfLongString(tip){
    if (typeof tip !== 'string' || tip.length < 35){
        return null;
    }
    return tip;
}

const WorkflowDetailsForWorkflowNodeRow = React.memo(function WorkflowDetailsForWorkflowNodeRow({ workflow, workflow_run }){
    let title;
    let innerContent;

    if (workflow) {
        var link = object.atIdFromObject(workflow);
        title = workflow.display_title || workflow.title || workflow.name;
        innerContent = <a href={link}>{ title }</a>;
    } else {
        innerContent = <em>N/A</em>;
    }

    console.log('WORKFLOW', workflow);

    var workflowSteps = workflow.steps || workflow_run.steps || workflow.workflow_steps;
    if (Array.isArray(workflowSteps) && workflowSteps.length > 0){
        workflowSteps = _.uniq(_.map(workflowSteps, function(step){
            return step.name;
        })).join(', ');
    } else {
        workflowSteps = <em>N/A</em>;
    }

    return (
        <div className="row">

            <div className="col col-sm-6 box">
                <span className="text-600">Workflow</span>
                <h4 className="text-400 text-ellipsis-container" data-tip={tipIfLongString(title)}>
                    { innerContent }
                </h4>
            </div>

            <div className="col col-sm-6 box steps-in-workflow">
                <span className="text-600">Steps in Workflow</span>
                <h5 className="text-400 text-ellipsis-container">
                    { workflowSteps }
                </h5>
            </div>

        </div>
    );
});


const SoftwareDetailsForWorkflowNodeRow = React.memo(function SoftwareDetailsForWorkflowNodeRow({ software: softwareList = [] }){
    let softwareElements;
    if (Array.isArray(softwareList) && softwareList.length > 0){
        softwareElements = _.map(softwareList, function(sw){
            var atId = object.atIdFromObject(sw);
            return <a href={atId} key={atId}>{ sw.display_title }</a>;
        });
    } else {
        softwareElements = <em>N/A</em>;
    }

    return (
        <div className="row">
            <div className="col col-sm-12 box steps-in-workflow">
                <span className="text-600">Software Used in Workflow</span>
                <h5 className="text-400 text-ellipsis-container">
                    { softwareElements }
                </h5>
            </div>
        </div>
    );
});

/** @todo: cleanup re: linting */
export class WFRStepDetailBody extends React.PureComponent {
    constructor(props){
        super(props);
        this.maybeLoadWFR = this.maybeLoadWFR.bind(this);
        this.state = {
            "wfr" : (this.props.step && this.props.step['@id']) || null
        };
    }

    componentDidMount(){
        this.maybeLoadWFR();
    }

    componentDidUpdate(pastProps){
        if ((pastProps.step && pastProps.step['@id']) !== (this.props.step && this.props.step['@id'])) {
            this.setState({ "wfr" : this.props.step['@id'] }, this.maybeLoadWFR.bind(this, this.props.step['@id']));
        }
    }

    maybeLoadWFR(wfr = this.state.wfr){
        var hrefToRequest = null;

        if (typeof wfr === 'string') {
            hrefToRequest = wfr;
        } /*else if (wfr && typeof wfr === 'object' && !Array.isArray(wfr)){
            if (!fileUtil.isFileDataComplete(file)) hrefToRequest = object.atIdFromObject(file);
        }else if (Array.isArray(file) && this.props.node && this.props.node.meta && this.props.node.meta.workflow){
            hrefToRequest = this.props.node.meta.workflow;
        }*/

        if (typeof hrefToRequest === 'string') { // Our file is not embedded. Is a UUID.
            ajax.load(hrefToRequest, (res)=>{
                if (res && typeof res === 'object'){
                    this.setState({ wfr : res });
                }
            }, 'GET', () => {
                this.setState({ wfr : null });
            });
            return true;
        }
        return false;
    }

    stepTitleBox(){
        var { step, context, node } = this.props;
        var stepHref = object.atIdFromObject(step);
        var titleString = step.display_title || step.name;

        return (
            <div className="col-sm-6 box">
                <span className="text-600">Workflow Run</span>
                { stepHref ?
                    <h3 className="text-500 text-ellipsis-container" data-tip={tipIfLongString(titleString)}><a href={stepHref}>{ titleString }</a></h3>
                    :
                    <h3 className="text-300 text-ellipsis-container">{ titleString }</h3>
                }
            </div>
        );
    }

    render(){
        var { node, step } = this.props; // this.props.step === this.props.node.meta
        var workflow = (step && step.workflow) || null;
        var wfr = (this.state.wfr && typeof this.state.wfr !== 'string' && this.state.wfr) || false; // If step ===  wfr, not step === analysis_step

        // Still need to test this .workflow_steps.step.software_used -> .steps.meta.software_used :
        var listOfSoftwareInWorkflow = (wfr && wfr.workflow && Array.isArray(wfr.workflow.steps) &&
            _.any(wfr.workflow.steps, function(workflowStep){ return workflowStep.meta && workflowStep.meta.software_used; }) &&
            _.uniq(_.flatten(_.filter(
                _.map(wfr.workflow.steps, function(workflowStep){ return (workflowStep.meta && workflowStep.meta.software_used) || null; }),
                function(s) { return Array.isArray(s) && s.length > 0; }
            )), false, object.itemUtil.atId)
        ) || null;

        return(
            <div style={{ minHeight : this.props.minHeight }}>
                <div className="information">
                    <div className="row">
                        <WorkflowStepTitleBox step={step} label="Workflow Run" />
                        <WorkflowStepDetailPurposesBox step={step} />
                    </div>
                    { workflow ? <hr/> : null }
                    { workflow ? <WorkflowDetailsForWorkflowNodeRow workflow_run={wfr} step={step} workflow={workflow}/> : null }
                    { listOfSoftwareInWorkflow ? <hr/> : null }
                    { listOfSoftwareInWorkflow ? <SoftwareDetailsForWorkflowNodeRow software={listOfSoftwareInWorkflow}/> : null }

                </div>
                <hr/>


                <Fade in={!!(wfr)} key="wfr-detail-container">
                    <div>
                        <h3 className="tab-section-title">
                            <span>Details of Run</span>
                        </h3>
                        <hr className="tab-section-title-horiz-divider"/>
                        { wfr ?
                            <ItemDetailList
                                context={wfr}
                                schemas={this.props.schemas}
                                minHeight={this.props.minHeight}
                                keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                            />
                            : null }
                    </div>
                </Fade>
                { typeof this.state.wfr === 'string' ?
                    <div className="text-center"><br/><i className="icon icon-spin icon-circle-o-notch"/></div>
                    : null }
            </div>
        );
    }
}