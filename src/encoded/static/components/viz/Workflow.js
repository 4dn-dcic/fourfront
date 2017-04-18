'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
import { TrafficMap } from './../lib/react-network-diagrams';
var store = require('./../../store');
var vizUtil = require('./utilities');
import { console, object, isServerSide, expFxn, Filters, layout, navigate, ajax } from './../util';
var cwl_sbg_test_data = require('./../testdata/cwl_sbg');


export function cwlToGraphData(cwlJSON){

    // Outputs
    var nodes = [];
    var edges = [];

    // Functions
    function generateStepNode(step, x){
        return {
            id : step.id,
            type : 'step',
            name : (step.run && step.run.description) || step.id,
            x : x || step.x || step['sbg:x'] || 20,
            y : 50
        };
    }

    function getFullStepInput(stepInput, step){
        var inputID = stepInput.id.replace(step.id + '.', '');
        var fullStepInput = _.find(step.run.inputs, function(runInput){
            if (inputID === runInput.id.replace('#', '')) return true;
            return false;
        });
        if (fullStepInput){
            stepInput = _.extend({}, stepInput, fullStepInput);
        }
        return stepInput;
    }

    function generateOutputNodes(step, x){
        var outputNodes = [];
        step.outputs.forEach(function(stepOutput, j){
            var outputID = stepOutput.id.replace(step.id + '.');
            var fullStepOutput = _.find(step.run.outputs, function(runOutput){
                if (outputID === runOutput.id.replace('#', '')) return true;
                return false;
            });
            if (fullStepOutput){
                stepOutput = _.extend({}, stepOutput, fullStepOutput);
            }

            var typeStr = '';
            if (Array.isArray(stepOutput.type)) typeStr = ' {' + stepOutput.type.join('|')  + '}';

            outputNodes.push({
                x           : x,
                y           : (20 + ((60 / (step.outputs.length + 1)) * j)) + (step.outputs.length === 1 ? 20 : 0),
                id          : stepOutput.id || null,
                format      : stepOutput.type,
                name        : stepOutput.id + typeStr, 
                type        : 'output',
                required    : stepOutput.required || false,
                meta        : _.omit(stepOutput, 'type', 'required', 'id'),
                outputOf    : step.id
            });

        });

        outputNodes.forEach(function(n){
            edges.push({
                'source' : step.id,
                'target' : n.id,
                'capacity' : 'Output',
                'total_capacity' : 100
            });
        });

        nodes = nodes.concat(outputNodes);
    }

    cwlJSON.steps.forEach(function(step, i){ // Each step will be a node.

        var stepNode = generateStepNode(step, i * 30 + 55);

        // Each input on the first step will be a node.
        if (i === 0){
            step.inputs.forEach(function(stepInput, j){
                var inputID = stepInput.id.replace(step.id + '.', '');

                var fullStepInput = _.find(step.run.inputs, function(runInput){
                    if (inputID === runInput.id.replace('#', '')) return true;
                    return false;
                });

                if (fullStepInput){
                    fullStepInput = _.extend({}, fullStepInput, stepInput);
                } else {
                    fullStepInput = _.clone(stepInput);
                }
                nodes.push({
                    x           : 40,
                    y           : 20 + ((60 / step.inputs.length) * j),
                    id          : fullStepInput.id || null,
                    format      : fullStepInput.type,
                    name        : fullStepInput.id + ' {' + (fullStepInput.type && fullStepInput.type.join('|')) + '}', 
                    type        : 'input',
                    required    : fullStepInput.required || false,
                    meta        : _.omit(fullStepInput, 'type', 'required', 'id')
                });
            });

            nodes.forEach(function(inputNode){
                if (inputNode.type !== 'input') return;
                edges.push({
                    'source' : inputNode.id,
                    'target' : stepNode.id,
                    'capacity' : 'Original Input',
                    'total_capacity' : 100
                });
            });

            
            generateOutputNodes(step, 70);
            nodes.push(stepNode);

        } else if (i < cwlJSON.steps.length){
            var prevStepNodeIndex = _.findLastIndex(nodes, { type : 'step' });//nodes[nodes.length - 1];
            var prevStepNode = nodes[prevStepNodeIndex];
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
                        'source' : matchedInputNode.id,
                        'target' : stepNode.id,
                        'capacity' : 'Input',
                        'total_capacity' : 100
                    });
                }
            });

            generateOutputNodes(step, i * 30 + 70);
            nodes.push(stepNode);
        }





    });

    console.log(nodes, edges);

    var paths = [
    ];

    return {
        'nodes' : nodes,
        'edges' : edges,
        'paths' : paths
    };
}


export class CWLGraph extends React.Component {

    static defaultProps = {
        'CWLURI' : 'https://raw.githubusercontent.com/4dn-dcic/pipelines-cwl/master/cwl_sbg/hi-c-processing-parta.9.cwl',
    }

    static edgeColorMap = [
        {color: "#990000", label: ">=50 Gbps", range: [50, 100]},
        {color: "#bd0026", label: "20 - 50", range: [20, 50]},
        {color: "#cc4c02", label: "10 - 20", range: [10, 20]},
        {color: "#016c59", label: "5 - 10", range: [5, 10]},
        {color: "#238b45", label: "2 - 5", range: [2, 5]},
        {color: "#3690c0", label: "1 - 2", range: [1, 2]},
        {color: "#74a9cf", label: "0 - 1", range: [0, 1]}
    ]

    static edgeShapeMap = {
        "Original Input": {
            "shape": "curved",
            "direction": "right",
            "offset": 15
        },
        "Input": {
            "shape": "curved",
            "direction": "right",
            "offset": 15
        },
        "Output": {
            "shape": "curved",
            "direction": "right",
            "offset": 15
        }
    }

    static edgeThicknessMap = {
        "Original Input": 5,
        "Input": 3,
        "Output": 3
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = {
            'mounted' : false,
            'cwl_json' : cwl_sbg_test_data
        };
    }

    componentDidMount(){
        //ajax.load(this.props.CWLURI, (resp)=>{
        //    console.log(resp);
        //});
        this.setState({ 'mounted' : true });
    }

    render(){
        //console.log(cwlToGraphData(this.state.cwl_json));
        return (
            <TrafficMap
                width={1120}
                height={300}
                bounds={{x1: 18, y1: 15, x2: 180, y2: 85}}
                topology={cwlToGraphData(this.state.cwl_json)}
                edgeColorMap={CWLGraph.edgeColorMap}
                edgeDrawingMethod="bidirectionalArrow"
                showPaths
                autoSize={false}
                edgeThinknessMap={CWLGraph.edgeThicknessMap}
                edgeShapeMap={CWLGraph.edgeShapeMap}
            />
        );
    }

}