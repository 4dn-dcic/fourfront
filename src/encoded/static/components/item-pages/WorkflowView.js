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

    static cwlToGraphData(cwlJSON, spacing){


        /**** Outputs ****/

        var nodes = [];
        var edges = [];


        /**** Functions ****/

        function generateStepNode(step, column){
            return {
                id : step.id,
                type : 'step',
                name : step.id && step.id.charAt(0) === '#' ? step.id.slice(1) : step.id,
                description : (step.run && step.run.description),
                column : column
            };
        }

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
            return stepInput;
        }

        function generateOutputNodes(step, column, stepNode){
            var outputNodes = [];
            step.outputs.forEach(function(stepOutput, j){
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

                var typeStr = '';
                if (Array.isArray(stepOutput.type)) typeStr = ' {' + stepOutput.type.join('|')  + '}';

                outputNodes.push({
                    column      : column,
                    id          : stepOutput.id || null,
                    format      : stepOutput.type,
                    name        : stepOutput.id, 
                    type        : 'output',
                    required    : stepOutput.required || false,
                    meta        : _.omit(stepOutput, 'type', 'required', 'id'),
                    outputOf    : stepNode
                });

            });

            outputNodes.forEach(function(n){
                edges.push({
                    'source' : stepNode,
                    'target' : n,
                    'capacity' : 'Output',
                });
            });

            nodes = nodes.concat(outputNodes);
        }

        cwlJSON.steps.forEach(function(step, i){ // Each step will be a node.

            var stepNode = generateStepNode(step, (i + 1) * 2 - 1);

            // Each input on the first step will be a node.
            if (i === 0){
                step.inputs.forEach(function(stepInput, j){

                    var fullStepInput = getFullStepInput(stepInput, step);
                    
                    nodes.push({
                        column      : (i + 1) * 2 - 2,
                        id          : fullStepInput.id || null,
                        format      : fullStepInput.type,
                        name        : fullStepInput.id, 
                        type        : 'input',
                        inputOf     : stepNode,
                        required    : fullStepInput.required || false,
                        meta        : _.omit(fullStepInput, 'type', 'required', 'id')
                    });
                });

                nodes.forEach(function(inputNode){
                    if (inputNode.type !== 'input') return;
                    edges.push({
                        'source' : inputNode,
                        'target' : stepNode,
                        'capacity' : 'Original Input'
                    });
                });

                
                generateOutputNodes(step, (i + 1) * 2, stepNode);
                nodes.push(stepNode);

            } else if (i < cwlJSON.steps.length){

                var allInputOutputNodes = _.filter(nodes, function(n){
                    if (n.type === 'output' || n.type === 'input') return true;
                    return false;
                });

                step.inputs.forEach(function(stepInput){
                    var fullStepInput = getFullStepInput(stepInput, step);
                    if (!Array.isArray(fullStepInput.source)) return;
                    var matchedInputNode = _.find(allInputOutputNodes, function(n){
                        if (fullStepInput.source.indexOf(n.id) > -1){
                            return true;
                        }
                        return false;
                    });
                    if (matchedInputNode){
                        console.log('MATCHEDINPUTNODE', matchedInputNode);
                        edges.push({
                            'source' : matchedInputNode,
                            'target' : stepNode,
                            'capacity' : 'Input'
                        });
                    }
                });

                generateOutputNodes(step, (i + 1) * 2, stepNode);
                nodes.push(stepNode);
            }

        });

        console.log(nodes, edges);

        return {
            'nodes' : nodes,
            'edges' : edges
        };
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
            // Should be one of 'cwl', 'basic'
            'showChart' : this.cwlDataExists(props) ? 'cwl' : 'basic'
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
        var graphData = GraphSection.cwlToGraphData(this.props.context.cwl_data);
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
