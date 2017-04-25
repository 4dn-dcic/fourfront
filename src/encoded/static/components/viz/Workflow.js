'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
import { Fade } from 'react-bootstrap';
import { TrafficMap } from './../lib/react-network-diagrams';
var store = require('./../../store');
var vizUtil = require('./utilities');
import { console, object, isServerSide, expFxn, Filters, layout, navigate, ajax } from './../util';
var cwl_sbg_test_data = require('./../testdata/cwl_sbg');


export function cwlToGraphData(cwlJSON, spacing){

    // Outputs
    var nodes = [];
    var edges = [];

    // Functions
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
            stepInput = _.extend({}, stepInput, fullStepInput);
        }
        return stepInput;
    }

    function generateOutputNodes(step, column, stepNode){
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
                column      : column,
                id          : stepOutput.id || null,
                format      : stepOutput.type,
                name        : stepOutput.id + typeStr, 
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



export class Graph extends React.Component {

    static defaultProps = {
        'height' : null,
        'width' : null,
        'columnSpacing' : 60,
        'columnWidth' : 120,
        'pathArrows' : true,
        'innerMargin' : {
            'top' : 20,
            'bottom' : 48,
            'left' : 10,
            'right' : 10
        }
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.width = this.width.bind(this);
        this.height = this.height.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    width()  {
        var width = this.props.width;
        console.log(width, isNaN(width));
        if ((!width || isNaN(width)) && this.state.mounted && !isServerSide()){
            width = this.refs.outerContainer.offsetWidth;
        } else if (!width || isNaN(width)){
            return null;
        }
        return ((width - this.props.innerMargin.left) - this.props.innerMargin.right );
    }

    height() {
        var height = this.props.height;
        if ((!height || isNaN(height)) && this.state.mounted && !isServerSide()){
            // Use highest count of nodes in a column * 60.
            height = _.reduce(_.groupBy(this.props.nodes, 'column'), function(maxCount, nodeSet){
                return Math.max(nodeSet.length, maxCount);
            }, 0) * 60;
        } else if (isNaN(height)){
            return null;
        }
        return ((height - this.props.innerMargin.top) - this.props.innerMargin.bottom);
    }

    scrollableWidth(){
        return (_.reduce(this.props.nodes, function(highestCol, node){
            return Math.max(node.column, highestCol);
        }, 0) + 1) * (this.props.columnWidth + this.props.columnSpacing) + this.props.innerMargin.left + this.props.innerMargin.right - this.props.columnSpacing;
    }

    nodesWithCoordinates(){
        var nodes = _.sortBy(this.props.nodes.slice(0), 'column');

        // Set correct Y coordinate on each node depending on how many nodes are in each column.
        _.pairs(_.groupBy(nodes, 'column')).forEach((columnGroup) => {
            var countInCol = columnGroup[1].length;
            if (countInCol === 1){
                columnGroup[1][0].y = (this.height() / 2) + this.props.innerMargin.top;
                columnGroup[1][0].nodesInColumn = 1;
            } else {
                d3.range(countInCol).forEach((i) => {
                    columnGroup[1][i].y = ((i / Math.max(countInCol - 1, 1)) * this.height()) + this.props.innerMargin.top;
                    columnGroup[1][i].nodesInColumn = countInCol;
                });
            }
        });

        // Set correct X coordinate on each node depending on column and spacing prop.
        nodes.forEach((node, i) => {
            node.x = (node.column * (this.props.columnWidth + this.props.columnSpacing)) + this.props.innerMargin.left;
        });
        return nodes;
    }

    render(){

        var width = this.width();
        var height = this.height();
        var fullHeight = height + this.props.innerMargin.top + this.props.innerMargin.bottom;
        var contentWidth = this.scrollableWidth();

        var widthAndHeightSet = !isNaN(width) && width && !isNaN(height) && height;

        if (!widthAndHeightSet && !this.state.mounted){
            return <div ref="outerContainer">&nbsp;</div>;
        }

        var nodes = this.nodesWithCoordinates();
        var edges = this.props.edges;
        console.log(width, contentWidth);

        return (
            <div ref="outerContainer" className="worfklow-chart-outer-container" style={{ height : fullHeight }}>
                <Fade transitionAppear in>
                    <div className="workflow-chart-inner-container">
                        <div className="scroll-container" style={{ width : contentWidth, height: fullHeight }}>
                            <EdgesLayer
                                nodes={nodes}
                                edges={edges}
                                innerWidth={width}
                                innerHeight={height}
                                contentWidth={contentWidth}
                                innerMargin={this.props.innerMargin}
                                columnWidth={this.props.columnWidth}
                                columnSpacing={this.props.columnSpacing}
                                pathArrows={this.props.pathArrows}
                            />
                            <NodesLayer
                                nodes={nodes}
                                innerWidth={width}
                                innerHeight={height}
                                contentWidth={contentWidth}
                                innerMargin={this.props.innerMargin}
                                columnWidth={this.props.columnWidth}
                                columnSpacing={this.props.columnSpacing}
                            />
                        </div>
                    </div>
                </Fade>
            </div>
        );
    }

}


class Node extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    innerStyle(){
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            return {
                width : (this.props.columnWidth || 100) - 20
            };
        }
    }

    icon(){
        var iconClass;
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            var formats = this.props.node.format;
            if (typeof formats === 'undefined'){
                iconClass = 'question';
            } else if (Array.isArray(formats)) {
                if (formats[0] === 'File'){
                    iconClass = 'file-text-o';
                } else if (
                    (formats[0] === 'int' || formats[0] === 'string') ||
                    (formats[0] === 'null' && (formats[1] === 'int' || formats[1] === 'string'))
                ){
                    iconClass = 'cog';
                }
            }

        } else if (this.props.node.type === 'step'){
            iconClass = 'cogs';
        }
        if (!iconClass) return null;
        return <i className={"icon icon-fw icon-" + iconClass}/>;
    }

    render(){
        var node = this.props.node;
        var title = node.title || node.name;

        if (typeof title === 'string'){
            if (node.type === 'input'){
                if (typeof node.inputOf === 'object'){
                    title = title.replace(node.inputOf.id + '.', '');
                }
            } else if (node.type === 'output'){
                if (typeof node.outputOf === 'object'){
                    title = title.replace(node.outputOf.id + '.', '');
                }
            }
        }

        return (
            <div className={"node node-type-" + node.type} data-node-id={node.id} style={{
                'top' : node.y,
                'left' : node.x,
                'width' : this.props.columnWidth || 100
            }}>
                <div className="inner" style={this.innerStyle()} data-tip={node.description || null} data-place="top">
                    <span className="node-name">{ this.icon() }{ title }</span>
                </div>
            </div>
        );
    }

}


class NodesLayer extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        return (
            <div className="nodes-layer-wrapper" style={{ width : this.props.contentWidth, height : fullHeight }}>
                <div className="nodes-layer" style={{ width : this.props.contentWidth, height : fullHeight }}>
                    {
                        this.props.nodes.map((node, i) =>
                            <Node node={node} {..._.omit(this.props, 'children', 'nodes')} key={node.id} />
                        )
                    }
                </div>
            </div>
        );
    }

}


class EdgesLayer extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.generatePathDimension = this.generatePathDimension.bind(this);
    }

    generatePathDimension(edge, edgeStyle = 'curve', radius = 12){
        var startOffset = (edge.source.type === 'input' || edge.source.type === 'output') ? 0 : 5;
        var endOffset = (edge.target.type === 'input' || edge.target.type === 'output') ? 0 : -5;
        if (this.props.pathArrows){
            endOffset -= 8;
        }
        
        var startPt = {
            x : edge.source.x + this.props.columnWidth + startOffset,
            y : edge.source.y
        };

        var endPt = {
            x : edge.target.x + endOffset,
            y : edge.target.y
        };

        if (edgeStyle === 'straight'){
            var path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(endPt.x, endPt.y);
            path.closePath();
            return path.toString();
        }
        if (edgeStyle === 'curve'){
            var path = d3.path();
            path.moveTo(startPt.x, startPt.y);
            path.lineTo(
                startPt.x + ((endPt.x - startPt.x) / 2) - radius,
                startPt.y
            );

            var arcYOffset = Math.min(Math.max(endPt.y - startPt.y, -radius), radius)

            path.arcTo(
                startPt.x + ((endPt.x - startPt.x) / 2),
                startPt.y,
                startPt.x + ((endPt.x - startPt.x) / 2),
                startPt.y + arcYOffset,
                radius
            );

            path.lineTo(
                startPt.x + ((endPt.x - startPt.x) / 2),
                endPt.y - arcYOffset
            );

            path.arcTo(
                startPt.x + ((endPt.x - startPt.x) / 2),
                endPt.y,
                startPt.x + ((endPt.x - startPt.x) / 2) + radius,
                endPt.y,
                radius
            );

            path.lineTo(
                endPt.x,
                endPt.y
            );
            
            //path.closePath();
            return path.toString();
        }
    }

    pathArrows(){
        if (!this.props.pathArrows) return null;
        return (
            <defs>
                <marker
                    id="Triangle"
                    viewBox="0 0 10 10" refX="0" refY="5" 
                    markerUnits="strokeWidth"
                    markerWidth="6" markerHeight="5"
                    orient="auto"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
                </marker>
            </defs>
        );
    }

    render(){
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        var edges = this.props.edges;
        console.log(edges);
        return (
            <div className="edges-layer-wrapper" style={{ width : this.props.contentWidth, height : fullHeight }}>
                <svg className="edges-layer" width={ this.props.contentWidth } height={ fullHeight }>
                    { this.pathArrows() }
                    {
                        edges.map((edge)=>
                            <path
                                d={this.generatePathDimension(edge)}
                                className="edge-path"
                                key={edge.source.id + "----" + edge.target.id}
                                data-source={edge.source.id}
                                data-target={edge.target.id}
                                markerEnd={this.props.pathArrows ? "url(#Triangle)" : null}
                            />
                        )
                    }
                </svg>
            </div>
        );
    }

}


export class CWLGraph extends React.Component {

    static defaultProps = {
        'CWLURI' : 'https://raw.githubusercontent.com/4dn-dcic/pipelines-cwl/master/cwl_sbg/hi-c-processing-parta.9.cwl',
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
        var graphData = cwlToGraphData(this.state.cwl_json);
        return (
            <Graph
                nodes={graphData.nodes}
                edges={graphData.edges}
            />
        );
    }

}