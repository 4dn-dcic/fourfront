'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
import { Fade } from 'react-bootstrap';
var store = require('./../../store');
var vizUtil = require('./utilities');
import { console, object, isServerSide, expFxn, Filters, layout, navigate, ajax } from './../util';
var ReactTooltip = require('react-tooltip');


export function parseAnalysisSteps(analysis_steps){

    /**** Outputs ****/

    var nodes = [];
    var edges = [];


    /**** Functions ****/

    function generateStepNode(step, column){
        return {
            id : step.uuid,
            type : 'step',
            name : step.display_title || step.title || step['@id'],
            description : step.description,
            column : column
        };
    }

    function generateOutputNodes(step, column, stepNode){
        var outputNodes = [];
        step.outputs.forEach(function(stepOutput, j){
            outputNodes.push({
                column      : column,
                format      : stepOutput.target && stepOutput.target[0].type,
                name        : stepOutput.name, 
                type        : 'output',
                meta        : _.omit(stepOutput, 'required', 'name'),
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

    analysis_steps.forEach(function(step, i){ // Each step will be a node.

        var stepNode = generateStepNode(step, (i + 1) * 2 - 1);

        // Each input on the first step will be a node.
        if (i === 0){
            step.inputs.forEach(function(fullStepInput, j){
                nodes.push({
                    column      : (i + 1) * 2 - 2,
                    format      : fullStepInput.source && fullStepInput.source[0].type, // First source type takes priority
                    name        : fullStepInput.name, 
                    type        : 'input',
                    inputOf     : stepNode,
                    required    : fullStepInput.required || false,
                    meta        : _.omit(fullStepInput, 'required', 'name')
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

        } else if (i < analysis_steps.length){

            var allInputOutputNodes = _.filter(nodes, function(n){
                if (n.type === 'output' || n.type === 'input') return true;
                return false;
            });

            step.inputs.forEach(function(fullStepInput){
                if (!Array.isArray(fullStepInput.source)) return;

                var matchedInputNode = _.find(allInputOutputNodes, function(n){
                    if (n.name === (fullStepInput.source[1] || fullStepInput.source[0]).name){
                        return true;
                    }
                    return false;
                });

                if (!matchedInputNode){
                    // Whooooah we gots an input that hasn't been defined previously. Probably add this to the first column.
                    matchedInputNode = {
                        column : (i + 1) * 2 - 2,
                        format : fullStepInput.source && fullStepInput.source[0].type,
                        name : fullStepInput.name,
                        type : 'input',
                        inputOf : stepNode,
                        required : fullStepInput.required || false,
                        meta : _.omit(fullStepInput, 'required', 'name')
                    }
                    nodes.push(matchedInputNode);
                }

                if (matchedInputNode){
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

    return {
        'nodes' : nodes,
        'edges' : edges
    };

}

export function parseBasicIOAnalysisSteps(analysis_steps, workflowItem){

    var allWorkflowInputs = _.filter(
        _.flatten(
            _.pluck(analysis_steps, 'inputs'), true
        ),
        function(input){
            if (!Array.isArray(input.source)) return false;
            if (
                _.find(input.source, function(s){
                    if (s.type.indexOf('Workflow') > -1) return true;
                    return false;
                })
            ){
                return true;
            }
            return false;
        }
    );

    var allWorkflowOutputs = _.filter(
        _.flatten(
            _.pluck(analysis_steps, 'outputs'), true
        ),
        function(output){
            if (!Array.isArray(output.target)) return false;
            if (
                _.find(output.target, function(t){
                    if (t.type.indexOf('Workflow') > -1) return true;
                    return false;
                })
            ){
                return true;
            }
            return false;
        }
    );

    return parseAnalysisSteps([
        _.extend(
            _.omit(workflowItem, 'arguments', 'analysis_steps', 'link_id', '@context', 'cwl_data'), // Use workflowItem as if it were AnalysisStep
            {
                'inputs' : allWorkflowInputs,
                'outputs' : allWorkflowOutputs
            }
        )
    ]);

}

export function addRunDataToAnalysisSteps(analysis_steps, workflow_run){
    
}

export class Graph extends React.Component {

    static defaultProps = {
        'height'        : null,
        'width'         : null,
        'columnSpacing' : 60,
        'columnWidth'   : 150,
        'pathArrows'    : true,
        'detailPane'    : true,
        'innerMargin'   : {
            'top' : 20,
            'bottom' : 48,
            'left' : 15,
            'right' : 15
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

    nodesWithCoordinates(viewportWidth = null, contentWidth = null){
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

        var leftOffset = this.props.innerMargin.left;
        if (contentWidth && viewportWidth && contentWidth < viewportWidth){
            leftOffset += (viewportWidth - contentWidth) / 2;
        }

        // Set correct X coordinate on each node depending on column and spacing prop.
        nodes.forEach((node, i) => {
            node.x = (node.column * (this.props.columnWidth + this.props.columnSpacing)) + leftOffset;
        });

        return nodes;
    }

    render(){

        var width = this.width();
        var height = this.height();
        var contentWidth = this.scrollableWidth();

        var widthAndHeightSet = !isNaN(width) && width && !isNaN(height) && height;

        if (!widthAndHeightSet && !this.state.mounted){
            return (
                <div ref="outerContainer">
                    <Fade transitionAppear in>
                        <div>&nbsp;</div>
                    </Fade>
                </div>
            );
        }

        var nodes = this.nodesWithCoordinates(width, contentWidth);
        var edges = this.props.edges;

        return (
            <div ref="outerContainer" className="worfklow-chart-outer-container">
                <Fade transitionAppear in>
                    <div className="workflow-chart-inner-container">
                        <StateContainer
                            nodes={nodes}
                            edges={edges}
                            innerWidth={width}
                            innerHeight={height}
                            contentWidth={contentWidth}
                            innerMargin={this.props.innerMargin}
                            columnWidth={this.props.columnWidth}
                            columnSpacing={this.props.columnSpacing}
                            pathArrows={this.props.pathArrows}
                        >
                            <ScrollContainer>
                                <EdgesLayer />
                                <NodesLayer />
                            </ScrollContainer>
                            { this.props.detailPane ? <DetailPane /> : null }
                        </StateContainer>
                    </div>
                </Fade>
            </div>
        );
    }

}

class DetailPane extends React.Component {

    body(){
        
    }

    render(){
        var node = this.props.selectedNode;
        if (!node) return null;

        var type;
        if (node.type === 'step'){
            type = 'Analysis Step';
        } else {
            type = node.format || node.type;
        }

        return (
            <div className="detail-pane">
                <h4 className="text-300">
                    <small>{ type }</small><br />
                    <span>{ node.name }</span>
                </h4>
                <div className="detail-pane-body">

                </div>
            </div>
        );
    }

}

class ScrollContainer extends React.Component {

    render(){
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        return (
            <div className="scroll-container-wrapper">
                <div className="scroll-container" style={{ width : this.props.contentWidth, height: fullHeight }}>
                {
                    React.Children.map(this.props.children, (child)=>{
                        return React.cloneElement(child, _.omit(this.props, 'children'))
                    })
                }
                </div>
            </div>
        );
    }

}

class StateContainer extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.state = {
            'selectedNode' : null
        };
    }

    componentWillReceiveProps(nextProps){
        if (
            nextProps.nodes.length !== this.props.nodes.length ||
            nextProps.edges.length !== this.props.edges.length
        ){
            this.setState({ 'selectedNode' : null });
        }
    }

    handleNodeClick(node, evt){
        console.log(node);
        this.setState({ 'selectedNode' : node });
    }

    render(){
        return (
            <div className="state-container">
            {
                React.Children.map(this.props.children, (child)=>{
                    return React.cloneElement(child, _.extend(
                        { onNodeClick : this.handleNodeClick }, _.omit(this.props, 'children'), this.state
                    ))
                })
            }
            </div>
        );
    }

}


class Node extends React.Component {

    static isSelected(currentNode, selectedNode){
        if (!selectedNode) return false;
        if (selectedNode === currentNode) return true;
        if (
            _.isEqual(
                _.omit(selectedNode, 'nodesInColumn', 'x', 'y', 'column'),
                _.omit(currentNode, 'nodesInColumn', 'x', 'y', 'column')
            )
        ) return true;
        return false;
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.icon = this.icon.bind(this);
        this.title = this.title.bind(this);
        this.tooltip = this.tooltip.bind(this);
        this.isSelected = this.isSelected.bind(this);
    }

    innerStyle(){
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            return {
                width : (this.props.columnWidth || 100)
            };
        }
    }

    icon(){
        var iconClass;
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            var formats = this.props.node.format;
            if (typeof formats === 'undefined'){
                iconClass = 'question';
            } else if (typeof formats === 'string') {
                formats = formats.toLowerCase();
                if (formats.indexOf('file') > -1){
                    iconClass = 'file-text-o';
                } else if (
                    formats.indexOf('parameter') > -1 || formats.indexOf('int') > -1 || formats.indexOf('string') > -1
                ){
                    iconClass = 'cog';
                } else {
                    iconClass = 'question';
                }
            } else if (Array.isArray(formats)) {
                if (
                    formats[0] === 'File' ||
                    (formats[0] === 'null' && formats[1] === 'File')
                ){
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

    title(){
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
        return title;
    }

    tooltip(){
        var node = this.props.node;
        var output = '';

        // Node Type
        if (node.type === 'step'){
            output += '<small>Step ' + ((node.column - 1) / 2 + 1) + '</small>';
        } else {
            var nodeType = node.type;
            nodeType = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
            output += '<small>' + nodeType + '</small>';
        }

        // Required
        if (node.required){
            output+= ' <small style="opacity: 0.66;"> - <em>Required</em></small>';
        }

        

        // Title
        output += '<h5 class="text-600 tooltip-title">' +
            this.title() +
            '</h5>';

        // Argument Type
        if (node.type === 'input' || node.type === 'output'){
            output += '<div><small>';
            
            if (Array.isArray(node.format) && node.format.length > 0){
                var formats = node.format.map(function(f){
                    if (f === 'File'){
                        if (node.meta && node.meta['sbg:fileTypes']){
                            var fileTypes = node.meta['sbg:fileTypes'].split(',').map(function(fType){
                                return '.' + fType.trim();
                            }).join(' | ');
                            return fileTypes;
                        }
                    }
                    return f;
                });
                output += 'Type: ' + formats.join(' | ') + '';
            } else if (typeof node.format === 'string') {
                output += 'Type: ' + node.format;
            } else {
                output += '<em>Unknown Type</em>';
            }
            output += '</small></div>';
        }

        if (node.type === 'input'){
            if (node.meta && node.meta['sbg:toolDefaultValue']){
                output += '<div><small>Default: "' + node.meta['sbg:toolDefaultValue'] + '"</small></div>';
            }
        }

        // Description
        if (typeof node.description === 'string'){
            output += '<div>' + node.description + '</div>';
        }

        return output; 
    }

    isSelected(){
        return Node.isSelected(this.props.node, this.props.selectedNode);
    }

    render(){
        var node = this.props.node;
        return (
            <div 
                className={"node node-type-" + node.type}
                data-node-key={node.id || node.name}
                data-node-type={node.type}
                data-node-global={node.isGlobal || null}
                data-node-selected={this.isSelected() || null}
                style={{
                    'top' : node.y,
                    'left' : node.x,
                    'width' : this.props.columnWidth || 100
                }}
            >
                <div
                    className="inner"
                    style={this.innerStyle()}
                    onMouseEnter={this.props.onMouseEnter}
                    onMouseLeave={this.props.onMouseLeave}
                    data-tip={this.tooltip()}
                    data-place="top"
                    data-html
                    onClick={this.props.onClick}
                >
                    <span className="node-name">{ this.icon() }{ this.title() }</span>
                </div>
            </div>
        );
    }

}

/*
class NodesLayerChartCursorController extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.updateDetailCursorFromNode = this.updateDetailCursorFromNode.bind(this);
        this.state = {
            'hoverNode' : null,
            'selectedNode' : null
        };
    }

    updateDetailCursorFromNode(node, overrideSticky = false, cursorId = 'default'){
        var newCursorDetailState = {
            'path' : [node],
            'includeTitleDescendentPrefix' : false,
            //'actions' : this.props.actions || this.cursorDetailActions() || null,
        };
        
        ChartDetailCursor.update(newCursorDetailState, cursorId, null, overrideSticky);
    }
    
    handleMouseEnter(node, evt){
        // Cancel if same node as selected.
        if (this.state.selectedNode === node.id){
            return false;
        }


        if (this.state.selectedNode === null){
            this.updateDetailCursorFromNode(node, false);
        }

        var newOwnState = {};

        // Update hover state
        _.extend(newOwnState, {
            'hoverNode' : node.id || null,
        });

        if (_.keys(newOwnState).length > 0){
            this.setState(newOwnState);
        }
    }

    handleMouseLeave(node, evt){
        this.setState({
            'hoverNode' : null
        });
    }

    render(){
        return (
            <NodesLayer
                {..._.extend({}, this.props, {
                    'onNodeMouseEnter' : this.handleMouseEnter,
                    'onNodeMouseLeave' : this.handleMouseLeave,
                    'selectedNode' : this.state.selectedNode,
                    'hoverNode' : this.state.hoverNode
                })}
            />
        );
    }

}
*/


class NodesLayer extends React.Component {

    static processNodes(nodes){
        return _.map(
                _.sortBy(_.sortBy(nodes, 'name'), 'type'),  // Sort nodes so on updates, they stay in same(-ish) order and can transition.
                function(n){                                // Calculate extra properties
                    n.isGlobal = false;
                    if (typeof n.format === 'string'){
                        if (n.format.toLowerCase().indexOf('workflow') > -1){
                            n.isGlobal = true;
                        }
                    }
                    return n;
                }
            );
    }

    static defaultProps = {
        onNodeMouseEnter : null,
        onNodeMouseLeave : null,
        onNodeClick : null
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(){
        ReactTooltip.rebuild();
    }

    render(){
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        return (
            <div className="nodes-layer-wrapper" style={{ width : this.props.contentWidth, height : fullHeight }}>
                <div className="nodes-layer" style={{ width : this.props.contentWidth, height : fullHeight }}>
                    {
                        NodesLayer.processNodes(this.props.nodes).map((node, i) =>
                            <Node
                                {..._.omit(this.props, 'children', 'nodes')}
                                node={node}
                                onMouseEnter={this.props.onNodeMouseEnter && this.props.onNodeMouseEnter.bind(this.props.onNodeMouseEnter, node)}
                                onMouseLeave={this.props.onNodeMouseLeave && this.props.onNodeMouseLeave.bind(this.props.onNodeMouseLeave, node)}
                                onClick={typeof this.props.onNodeClick === 'function' && this.props.onNodeClick.bind(this.props.onNodeClick, node)}
                                key={node.id || node.name}
                            />
                        )
                    }
                </div>
            </div>
        );
    }

}

class Edge extends React.Component {

    static isSelected(edge, selectedNode){
        return (
            Node.isSelected(edge.source, selectedNode) ||
            Node.isSelected(edge.target, selectedNode)
        );
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.generatePathDimension = this.generatePathDimension.bind(this);
    }

    generatePathDimension(edge, edgeStyle = 'curve', radius = 12){
        var startOffset = 5;//(edge.source.type === 'input' || edge.source.type === 'output') ? 0 : 5;
        var endOffset = -5; //(edge.target.type === 'input' || edge.target.type === 'output') ? 0 : -5;
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

    render(){
        var edge = this.props.edge;

        return (
            <path
                d={this.generatePathDimension(edge)}
                className="edge-path"
                data-edge-selected={Edge.isSelected(edge, this.props.selectedNode)}
                data-source={edge.source.name}
                data-target={edge.target.name}
                markerEnd={this.props.pathArrows ? "url(#pathArrow)" : null}
            />
        );
    }
}


class EdgesLayer extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    pathArrows(){
        if (!this.props.pathArrows) return null;
        return (
            <defs>
                <marker
                    id="pathArrow"
                    viewBox="0 0 15 15" refX="0" refY="5" 
                    markerUnits="strokeWidth"
                    markerWidth="6" markerHeight="5"
                    orient="auto"
                >
                    <path d="M 0 0 L 10 5 L 0 10 Z" className="pathArrow-marker" />
                </marker>
            </defs>
        );
    }

    render(){
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        var divWidth = Math.max(fullWidth, this.props.contentWidth);
        var edges = this.props.edges;
        return (
            <div className="edges-layer-wrapper" style={{ width : divWidth, height : fullHeight }}>
                <svg className="edges-layer" width={ divWidth } height={ fullHeight }>
                    { this.pathArrows() }
                    {
                        edges.map((edge)=>
                            <Edge {...this.props} edge={edge} key={(edge.source.id || edge.source.name) + "----" + (edge.target.id || edge.target.name)} />
                        )
                    }
                </svg>
            </div>
        );
    }

}
