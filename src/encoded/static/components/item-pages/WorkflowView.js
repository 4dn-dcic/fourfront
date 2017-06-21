'use strict';

import React from 'react';
import { itemClass, panel_views } from './../globals';
import _ from 'underscore';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, AttributionTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow, WorkflowDetailPane } from './components';
import { ItemBaseView } from './DefaultItemView';
import { getTabForAudits } from './item';
import { console, object, DateUtility, Schemas, isServerSide, navigate } from './../util';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { DropdownButton, MenuItem } from 'react-bootstrap';


/**
 * Pass this to props.onNodeClick for Graph.
 * 
 * @export
 * @param {Object} node - Node clicked on.
 * @param {Object|null} selectedNode - Node currently selected, if any.
 * @param {MouseEvent} evt - onClick MouseEvent.
 */
export function onItemPageNodeClick(node, selectedNode, evt){
    if (node !== selectedNode){
        navigate('#' + (node.id || node.name), { inPlace: true, skipRequest : true });
    } else {
        navigate('#', { inPlace: true, skipRequest : true });
    }
}

export function commonGraphPropsFromProps(props){
    return {
        'href'        : props.href,
        'onNodeClick' : onItemPageNodeClick,
        'detailPane'  : <WorkflowDetailPane schemas={props.schemas} context={props.context} />,
        'nodeTitle'   : function(node, canBeJSX = false){
            if (
                node.type === 'step' && node.meta.uuid &&
                Array.isArray(node.meta.analysis_step_types) &&
                node.meta.analysis_step_types.length > 0
            ){
                var purposes = node.meta.analysis_step_types.map(Schemas.Term.capitalize).join(', ');
                if (canBeJSX){
                    return (
                        <div className="pull-right">
                            <div className="text-ellipsis-container above-node-title" style={{ maxWidth : Graph.defaultProps.columnWidth }}>
                                { purposes }
                            </div>
                            <div className="text-ellipsis-container" style={{ width : Graph.defaultProps.columnWidth - 40 }}>
                                { node.title || node.name }
                            </div>
                        </div>
                    );
                }
            }
            return node.title || node.name;
        }
    };
}


/**
 * @export
 * @class WorkflowView
 * @memberof module:item-pages
 * @extends module:item-pages/DefaultItemView.ItemBaseView
 */
export class WorkflowView extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.state = {
            mounted : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    getTabViewContents(){

        var listWithGraph = /* !Array.isArray(this.props.context.analysis_steps) || this.props.context.analysis_steps.length === 0 ? [] : */[
            {
                tab : <span><i className="icon icon-code-fork icon-fw"/> Graph</span>,
                key : 'graph',
                content : <GraphSection {...this.props} mounted={this.state.mounted} />
            }
        ];

        return listWithGraph.concat([
            AttributionTabView.getTabObject(this.props.context),
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ]).map((tabObj)=>{ // Common properties
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 650 }
            });
        });
    }

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var ic = itemClass(this.props.context, 'view-detail item-page-container');

        return (
            <div className={ic}>

                <ItemPageTitle context={context} schemas={schemas} />
                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                    <ItemHeader.TopRow typeInfo={{ title : context.workflow_type, description : 'Workflow Type' }} />
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>

                <br/>

                <div className="row">

                    <div className="col-xs-12 col-md-12 tab-view-container">

                        <TabbedView contents={this.getTabViewContents()} />

                    </div>

                </div>

                <ItemFooterRow context={context} schemas={schemas} />

            </div>
        );
    }

}


export function dropDownMenuMixin(){
    var detail = GraphSection.analysisStepsSet(this.props.context) ? (
        <MenuItem eventKey='detail' active={this.state.showChart === 'detail'}>
            Analysis Steps
        </MenuItem>
    ) : null;
    
    /*
    var cwl = GraphSection.cwlDataExists(this.props) ? (
        <MenuItem eventKey='cwl' active={this.state.showChart === 'cwl'}>
            Common Workflow Language (CWL)
        </MenuItem>
    ) : null;
    */

    var basic = (
        <MenuItem eventKey='basic' active={this.state.showChart === 'basic'}>
            Basic Inputs & Outputs
        </MenuItem>
    );


    return (
        <DropdownButton
            pullRight
            onSelect={(eventKey, evt)=>{
                if (eventKey === this.state.showChart) return;
                this.setState({ showChart : eventKey });
            }}
            title={GraphSection.keyTitleMap[this.state.showChart]}
        >
            { basic }{ detail }
        </DropdownButton>
    );
}

export function graphBodyMixin(){
    if (this.state.showChart === 'cwl') return this.cwlGraph();
    if (this.state.showChart === 'detail') return this.detailGraph();
    if (this.state.showChart === 'basic') return this.basicGraph();
    return null;
}

class GraphSection extends React.Component {
/*
    static parseCWLToAnalysisSteps(cwlJSON){

        var stepInputNamesEncountered = {};

        function getFullStepInput(stepInput, step){
            var inputID = stepInput.id.replace(step.id + '.', '');
            var fullStepInput = _.find(step.run.inputs, function(runInput){
                if (inputID === runInput.id.replace('#', '')) return true;
                return false;
            });
            if (fullStepInput){
                stepInput = _.extend({}, stepInput, _.omit(fullStepInput, 'id'));
            } else {
                stepInput = _.clone(stepInput);
            }
            if (!stepInput.name) stepInput.name = inputID;
            if (stepInputNamesEncountered[stepInput.name]){
                return null;
                stepInput.name += '-' + stepInputNamesEncountered[stepInput.name]++;
            }
            if (Array.isArray(stepInput.source) && typeof stepInput.source[0] === 'string'){
                stepInput.source = stepInput.source.map(function(s){
                    var splitID = s.replace('#','').split('.');
                    return {
                        'name' : splitID[1] || splitID[0],
                        'type' : stepInput.type && stepInput.type.indexOf('File') > -1 ? 'Input File' : stepInput.type.join(' | '),
                        'step' : splitID.length > 0 ? splitID[0] : null
                    };
                });
            } else if (!Array.isArray(stepInput.source)) {
                return null;
                var splitID = step.id.replace('#','').split('.');
                stepInput.source = [{
                    'name' : splitID[1] || splitID[0],
                    'type' : (stepInput.type && stepInput.type.indexOf('File') > -1 ? 'Input File' : stepInput.type.join(' | ')),
                    'step' : splitID.length > 0 ? splitID[0] : null
                }];
            }
            stepInputNamesEncountered[inputID] = 1;
            return stepInput;
        }


        return cwlJSON.steps.map(function(step, i){ // Each step will be a node.

            return _.extend(
                    step, 
                {
                    'display_title' : step.id.replace('#',''),
                    'uuid' : step.id,
                    'inputs' : step.inputs.map(function(stepInput){
                        return getFullStepInput(stepInput, step);
                    }).filter(function(x){ return !!x; }),
                    'outputs' : step.outputs.map(function(stepOutput){
                        var outputID = stepOutput.id.replace(step.id + '.', '');
                        var fullStepOutput = _.find(step.run.outputs, function(runOutput){
                            if (outputID === runOutput.id.replace('#', '')) return true;
                            return false;
                        });
                        if (fullStepOutput){
                            stepOutput = _.extend({}, stepOutput, _.omit(fullStepOutput, 'id'));
                        }

                        var finalOutput = _.find(cwlJSON.outputs, function(cwlOutput){
                            if (outputID === cwlOutput.id.replace('#', '')) return true;
                            return false;
                        });

                        if (finalOutput){
                            stepOutput = _.extend(stepOutput, _.omit(finalOutput, 'id'));
                        }
                        if (!stepOutput.name) stepOutput.name = outputID;
                        if (!stepOutput.target){
                            if (stepOutput.source) {
                                stepOutput.target = stepOutput.source.map(function(s){
                                    return {
                                        'name' : s,
                                        'type' : stepOutput.type && stepOutput.type.indexOf('File') > -1 ? 'Output File' : stepOutput.type.join(' | ')
                                    };
                                });
                            } else {
                                stepOutput.target = [{
                                    'name' : stepOutput.id,
                                    'type' : stepOutput.type && stepOutput.type.indexOf('File') > -1 ? 'Output File' : stepOutput.type.join(' | ')
                                }];
                            }
                        }
                        console.log(stepOutput);
                        return stepOutput;
                    })
                }
                );


        });
    }
*/
    static isCwlDataValid(cwlJSON){
        if (!Array.isArray(cwlJSON.steps)) return false;
        if (cwlJSON.steps.length === 0) return false;
        if (!Array.isArray(cwlJSON.steps[0].inputs)) return false;
        if (!Array.isArray(cwlJSON.steps[0].outputs)) return false;
        if (cwlJSON.steps[0].inputs.length === 0) return false;
        if (typeof cwlJSON.steps[0].inputs[0].id !== 'string') return false;
        if (typeof cwlJSON.steps[0].outputs[0].id !== 'string') return false;
        return true;
    }

    static cwlDataExists(props){
        return props.context && props.context.cwl_data && GraphSection.isCwlDataValid(props.context.cwl_data);
    }

    static analysisStepsSet(context){
        if (!Array.isArray(context.analysis_steps)) return false;
        if (context.analysis_steps.length === 0) return false;
        return true;
    }

    constructor(props){
        super(props);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.cwlGraph = this.cwlGraph.bind(this);
        this.basicGraph = this.basicGraph.bind(this);
        this.detailGraph = this.detailGraph.bind(this);
        this.dropDownMenu = dropDownMenuMixin.bind(this);
        this.body = graphBodyMixin.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : GraphSection.analysisStepsSet(props.context) ? 'detail' : 'basic'
        };
    }

    commonGraphProps(){
        return commonGraphPropsFromProps(this.props);
    }

    cwlGraph(){
        if (!GraphSection.cwlDataExists(this.props)) return (
            <div>
                <h4 className="text-400"><em>No graphable data.</em></h4>
            </div>
        );
        var graphData = parseAnalysisSteps(
            GraphSection.parseCWLToAnalysisSteps(this.props.context.cwl_data)
        );
        return (
            <Graph
                { ...this.commonGraphProps() }
                nodes={graphData.nodes}
                edges={graphData.edges}
            />
        );
    }

    basicGraph(){
        if (!Array.isArray(this.props.context.analysis_steps)) return null;
        var graphData = parseBasicIOAnalysisSteps(this.props.context.analysis_steps, this.props.context);
        return (
            <Graph
                { ...this.commonGraphProps() }
                nodes={graphData.nodes}
                edges={graphData.edges}
                columnWidth={this.props.mounted && this.refs.container ?
                    (this.refs.container.offsetWidth - 180) / 3
                : 180}
            />
        );
    }

    detailGraph(){
        if (!Array.isArray(this.props.context.analysis_steps)) return null;
        var graphData = parseAnalysisSteps(this.props.context.analysis_steps);
        return (
            <Graph
                { ...this.commonGraphProps() }
                nodes={graphData.nodes}
                edges={graphData.edges}
            />
        );
    }

    static keyTitleMap = {
        'detail' : 'Analysis Steps',
        'basic' : 'Basic Inputs & Outputs',
        'cwl' : 'CWL Graph'
    }

    render(){

        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart)}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <span className="pull-right workflow-view-dropdown-container">
                        { this.dropDownMenu() }
                    </span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { this.body() }
            </div>
        );

    }

}


panel_views.register(WorkflowView, 'Workflow');
