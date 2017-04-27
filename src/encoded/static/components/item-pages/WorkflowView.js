'use strict';

var React = require('react');
var globals = require('./../globals');
var _ = require('underscore');
var { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, AttributionTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } = require('./components');
import { ItemBaseView } from './DefaultItemView';
import { getTabForAudits } from './item';
var { console, object, DateUtility, Filters } = require('./../util');
import { Graph, parseAnalysisSteps } from './../viz/Workflow';
var { DropdownButton, MenuItem } = require('react-bootstrap');



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
    }

    getTabViewContents(){
        return [
            {
                tab : <span><i className="icon icon-code-fork icon-fw"/> Graph</span>,
                key : 'graph',
                content : <GraphSection {...this.props} />
            },
            AttributionTabView.getTabObject(this.props.context),
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ];
    }

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container');

        return (
            <div className={itemClass}>

                <ItemPageTitle context={context} />
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

class GraphSection extends React.Component {

    static parseCWLToAnalysisSteps(cwlJSON){

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

            if (Array.isArray(stepInput.source) && typeof stepInput.source[0] === 'string'){
                stepInput.source = stepInput.source.map(function(s){
                    var splitID = s.replace('#','').split('.');
                    console.log(stepInput.type);
                    return {
                        'name' : splitID[1] || splitID[0],
                        'type' : stepInput.type && stepInput.type.indexOf('File') > -1 ? 'Input File' : stepInput.type.join(' | '),
                        'step' : splitID.length > 0 ? splitID[0] : null
                    };
                });
            } else if (!Array.isArray(stepInput.source)) {
                var splitID = step.id.replace('#','').split('.');
                stepInput.source = [{
                    'name' : splitID[1] || splitID[0],
                    'type' : (stepInput.type && stepInput.type.indexOf('File') > -1 ? 'Input File' : stepInput.type.join(' | ')),
                    'step' : splitID.length > 0 ? splitID[0] : null
                }];
            }
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
                        }),
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
                                    }]
                                }
                            }
                            console.log(stepOutput);
                            return stepOutput;
                        })
                    }
                );


        });
    }

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

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : 'detail'
        }
    }

    cwlDataExists(props = this.props){
        return props.context && props.context.cwl_data && GraphSection.isCwlDataValid(props.context.cwl_data);
    }

    cwlGraph(){
        if (!this.cwlDataExists()) return (
            <div>
                <h4 className="text-400"><em>No graphable data.</em></h4>
            </div>
        );
        var graphData = parseAnalysisSteps(
            GraphSection.parseCWLToAnalysisSteps(this.props.context.cwl_data)
        );
        return (
            <Graph
                nodes={graphData.nodes}
                edges={graphData.edges}
            />
        );
    }

    basicGraph(){

    }

    detailGraph(){
        var graphData = parseAnalysisSteps(this.props.context.analysis_steps);
        return (
            <Graph
                nodes={graphData.nodes}
                edges={graphData.edges}
            />
        );
    }

    body(){
        if (this.state.showChart === 'cwl') return this.cwlGraph();
        if (this.state.showChart === 'detail') return this.detailGraph();

        return (
            null
        );
    }

    static keyTitleMap = {
        'detail' : 'Analysis Steps',
        'basic' : 'Basic Graph',
        'cwl' : 'CWL Graph'
    }

    render(){

        return (
            <div>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <span className="pull-right">
                        <DropdownButton
                            pullRight
                            onSelect={(eventKey, evt)=>{
                                if (eventKey === this.state.showChart) return;
                                this.setState({ showChart : eventKey });
                            }}
                            title={
                                "Viewing " + 
                                GraphSection.keyTitleMap[this.state.showChart]
                            }
                        >
                            <MenuItem eventKey='detail' active={this.state.showChart === 'detail'}>
                                Analysis Steps
                            </MenuItem>
                            <MenuItem eventKey='cwl' active={this.state.showChart === 'cwl'}>
                                Common Workflow Language (CWL)
                            </MenuItem>
                            <MenuItem eventKey='basic' active={this.state.showChart === 'basic'}>
                                Basic Inputs & Outputs
                            </MenuItem>
                        </DropdownButton>
                    </span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { this.body() }
            </div>
        );

    }

}


globals.panel_views.register(WorkflowView, 'Workflow');
