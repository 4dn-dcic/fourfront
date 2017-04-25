'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
import { Fade } from 'react-bootstrap';
import { TrafficMap } from './../lib/react-network-diagrams';
var store = require('./../../store');
var vizUtil = require('./utilities');
import { console, object, isServerSide, expFxn, Filters, layout, navigate, ajax } from './../util';
var ReactTooltip = require('react-tooltip');


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
        this.icon = this.icon.bind(this);
        this.title = this.title.bind(this);
        this.tooltip = this.tooltip.bind(this);
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

    render(){
        var node = this.props.node;

        return (
            <div className={"node node-type-" + node.type} data-node-id={node.id} style={{
                'top' : node.y,
                'left' : node.x,
                'width' : this.props.columnWidth || 100
            }}>
                <div
                    className="inner"
                    style={this.innerStyle()}
                    onMouseEnter={this.props.onMouseEnter}
                    onMouseLeave={this.props.onMouseLeave}
                    data-tip={this.tooltip()}
                    data-place="top"
                    data-html
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

    static defaultProps = {
        onNodeMouseEnter : null,
        onNodeMouseLeave : null
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render(){
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        return (
            <div className="nodes-layer-wrapper" style={{ width : this.props.contentWidth, height : fullHeight }}>
                <div className="nodes-layer" style={{ width : this.props.contentWidth, height : fullHeight }}>
                    {
                        this.props.nodes.map((node, i) =>
                            <Node
                                {..._.omit(this.props, 'children', 'nodes')}
                                node={node}
                                onMouseEnter={this.props.onNodeMouseEnter && this.props.onNodeMouseEnter.bind(this.props.onNodeMouseEnter, node)}
                                onMouseLeave={this.props.onNodeMouseLeave && this.props.onNodeMouseLeave.bind(this.props.onNodeMouseLeave, node)}
                                key={node.id}
                            />
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

    pathArrows(){
        if (!this.props.pathArrows) return null;
        return (
            <defs>
                <marker
                    id="Triangle"
                    viewBox="0 0 15 15" refX="0" refY="5" 
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
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        var edges = this.props.edges;
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
