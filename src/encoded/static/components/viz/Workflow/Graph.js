'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import { Fade } from 'react-bootstrap';
import { console, isServerSide } from './../../util';

import StateContainer from './StateContainer';
import ScrollContainer from './ScrollContainer';
import NodesLayer from './NodesLayer';
import EdgesLayer from './EdgesLayer';
import DefaultDetailPane from './DefaultDetailPane';
import { DefaultNodeElement } from './Node';

/**
 * Primary/entry component for the Workflow graph.
 * 
 * @class Graph
 * @prop {Object[]}     nodes                   Array of node objects to plot. Both nodes and edges can be generated from a CWL-like structure using static functions, including the provided 'parseAnalysisSteps'. See propTypes in class def below for object structure.
 * @prop {Object[]}     edges                   Array of edge objects to plot. See propTypes in class def below for object structure.
 * @prop {function}     renderNodeElement       Function to render out own custom Node Element. Accepts two params - 'node' and 'props' (of graph).
 * @prop {function?}    renderDetailPane        Function to render out own custom Detail Pane. Accepts two params - 'selectedNode' and 'props' (of graph). Pass in null to perform your own logic in onNodeClick.
 * @prop {function}     [onNodeClick]           A function to be executed each time a node is clicked. 'this' will refer to internal statecontainer. Should accept params: {Object} 'node', {Object|null} 'selectedNode', and {MouseEvent} 'evt'. By default, it changes internal state's selectedNode. You should either disable props.checkHrefForSelectedNode -or- change href in this function.
 * @prop {function}     [isNodeDisabled]        Function which accepts a 'node' object and returns a boolean.
 * @prop {boolean}      [checkHrefForSelectedNode=true] - If true, will check props.href or window.location.href on updates as well as mounting and update selectedNode if '#' + node.name is in URL. Recommended to leave as true and in props.onNodeClick, to change href to contain '#' + node.name.
 * @prop {boolean}      [checkWindowLocationHref=true] - If true, checks window.location.href on updates instead of props.href. Must still trigger component update on page or href changes.
 * @prop {string}       [href]                  Must provide current HREF of page, if setting props.checkHrefForSelectedNode to true and turning off props.checkWindowLocationHref.
 * @prop {Object}       [innerMargin={top : 20, bottom: 48, left: 15, right: 15}]     Provide this object, containing numbers for 'top', 'bottom', 'left', and 'right', if want to adjust chart margins.
 * @prop {boolean}      [pathArrows=true]       Whether to display arrows at the end side of edges.
 * @prop {number}       [columnSpacing=56]      Adjust default spacing between columns, where edges are drawn.
 * @prop {number}       [columnWidth=150]       Adjust width of columns, where nodes are drawn.
 * @prop {number}       [rowSpacing=56]         Adjust vertical spacing between node centers (NOT between their bottom/top).
 * @prop {function}     [nodeTitle]             Optional function to supply to get node title, before is passed to visible Node element. Useful if want to display some meta sub-property rather than technical title.
 */
export default class Graph extends React.Component {

    static propTypes = {
        'isNodeDisabled'    : PropTypes.func,
        'innerMargin'       : PropTypes.shape({
            'top'               : PropTypes.number.isRequired,
            'bottom'            : PropTypes.number.isRequired,
            'left'              : PropTypes.number.isRequired,
            'right'             : PropTypes.number.isRequired
        }).isRequired,
        'renderNodeElement' : PropTypes.func.isRequired,
        'renderDetailPane'  : PropTypes.func.isRequired,
        'nodes'             : PropTypes.arrayOf(PropTypes.shape({
            'column'            : PropTypes.number.isRequired,
            'name'              : PropTypes.string.isRequired,
            'nodeType'          : PropTypes.string.isRequired,
            'ioType'            : PropTypes.string,
            'id'                : PropTypes.string,  // Optional unique ID if node names might be same.
            'outputOf'          : PropTypes.object,  // Unused currently
            'inputOf'           : PropTypes.arrayOf(PropTypes.object),  // Unused currently
            'description'       : PropTypes.string,
            'meta'              : PropTypes.oneOfType([
                PropTypes.object,
                PropTypes.shape({
                    'target' : PropTypes.arrayOf(PropTypes.shape({
                        'name' : PropTypes.string.isRequired,
                        'type' : PropTypes.string.isRequired,
                        'step' : PropTypes.string
                    }))
                })
            ])
        })).isRequired,
        'edges'             : PropTypes.arrayOf(PropTypes.shape({
            'source'            : PropTypes.object.isRequired,
            'target'            : PropTypes.object.isRequired,
            'capacity'          : PropTypes.string
        })).isRequired,
        'nodeTitle'         : PropTypes.func,
        'rowSpacingType'    : PropTypes.oneOf([ 'compact', 'wide', 'stacked' ])
    }

    static defaultProps = {
        'height'        : null, // Unused, should be set to nodes count in highest column * rowSpacing + innerMargins.
        'width'         : null,
        'columnSpacing' : 56,
        'columnWidth'   : 150,
        'rowSpacing'    : 75,
        'rowSpacingType': 'wide',
        'pathArrows'    : true,
        'renderDetailPane' : function(selectedNode, props){
            return <DefaultDetailPane {...props} selectedNode={selectedNode} />;
        },
        'renderNodeElement' : function(node, props){
            return <DefaultNodeElement {...props} node={node} />;
        },
        'onNodeClick'   : null, // Use StateContainer.defaultOnNodeClick
        'checkHrefForSelectedNode' : true,
        'checkWindowLocationHref' : true,
        'innerMargin'   : {
            'top' : 60,
            'bottom' : 60,
            'left' : 20,
            'right' : 20
        },
        'minimumHeight' : 75,
        'edgeStyle' : 'bezier',
        'isNodeCurrentContext' : function(node){
            return false;
        },
        'nodeClassName' : function(node){ return ''; },
        'nodeEdgeLedgeWidths' : [3,5]
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
        if ((!width || isNaN(width)) && this.state.mounted && !isServerSide()){
            width = this.refs.outerContainer.offsetWidth;
        } else if (!width || isNaN(width)){
            return null;
        }
        return ((width - this.props.innerMargin.left) - this.props.innerMargin.right );
    }

    height() {
        var nodes = this.props.nodes;
        // Run pre-sort fxn, e.g. to manually pre-arrange nodes into different columns.
        if (typeof this.props.nodesPreSortFxn === 'function'){
            nodes = this.props.nodesPreSortFxn(nodes.slice(0));
        }
        return Math.max(
            _(nodes).chain()
            .groupBy('column')
            .pairs()
            .reduce(function(maxCount, nodeSet){
                return Math.max(nodeSet[1].length, maxCount);
            }, 0)
            .value() * (this.props.rowSpacing) - this.props.rowSpacing,
            this.props.minimumHeight
        );
    }

    scrollableWidth(){
        return (_.reduce(this.props.nodes, function(highestCol, node){
            return Math.max(node.column, highestCol);
        }, 0) + 1) * (this.props.columnWidth + this.props.columnSpacing) + this.props.innerMargin.left + this.props.innerMargin.right - this.props.columnSpacing;
    }

    nodesWithCoordinates(nodes = null, viewportWidth = null, contentWidth = null, contentHeight = null, verticalMargin = 0){

        if (!contentHeight) contentHeight = this.height();

        if (!nodes) nodes = this.props.nodes.slice(0);

        /****** Step 1: ***** ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
         ****** Run optional post/pre-process functions to re-sort or arrange nodes in/within columns.
         ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ******/

        // Arrange into lists of columns
        var nodesByColumnPairs = _.pairs(_.groupBy(nodes, 'column'));

        /****** Step 2: ***** ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
         ****** Convert column placement and position within columns, along with other chart dimension settings, into X & Y coordinates.
         ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ******/

        // Set correct Y coordinate on each node depending on how many nodes are in each column.
        nodesByColumnPairs.forEach((columnGroup) => {

            var nodesInColumn = _.sortBy(columnGroup[1], 'indexInColumn');
            var countInCol = nodesInColumn.length;

            var centerNode = function(n){
                n.y = (contentHeight / 2) + this.props.innerMargin.top + verticalMargin;
                n.nodesInColumn = countInCol;
                n.indexInColumn = 0;
            }.bind(this);

            if (this.props.rowSpacingType === 'compact') {
                if (countInCol === 1) centerNode(nodesInColumn[0]);
                else {
                    var padding = Math.max(0, contentHeight - ((countInCol - 1) * this.props.rowSpacing)) / 2;
                    d3.range(countInCol).forEach((i) => {
                        nodesInColumn[i].y = ((i + 0) * this.props.rowSpacing) + (this.props.innerMargin.top) + padding + verticalMargin;
                        nodesInColumn[i].nodesInColumn = countInCol;
                    });
                }
            } else if (this.props.rowSpacingType === 'stacked') {
                _.forEach(nodesInColumn, (nodeInCol, idx)=>{
                    if (!nodeInCol) return;
                    nodeInCol.y = (this.props.rowSpacing * idx) + (this.props.innerMargin.top + verticalMargin);//num + (this.props.innerMargin.top + verticalMargin);
                    nodeInCol.nodesInColumn = countInCol;
                });

            } else if (this.props.rowSpacingType === 'wide') {
                if (countInCol === 1) centerNode(nodesInColumn[0]);
                else {
                    _.forEach(d3.range(0, contentHeight, contentHeight / (countInCol - 1) ).concat([contentHeight]), (num, idx)=>{
                        var nodeInCol = nodesInColumn[idx];
                        if (!nodeInCol) return;
                        nodeInCol.y = num + (this.props.innerMargin.top + verticalMargin);
                        nodeInCol.nodesInColumn = countInCol;
                    });
                }
            } else {
                console.error("Prop 'rowSpacingType' not valid. Must be ", Graph.propTypes.rowSpacingType);
                throw new Error("Prop 'rowSpacingType' not valid.");
            }
        });

        var leftOffset = this.props.innerMargin.left;
        if (contentWidth && viewportWidth && contentWidth < viewportWidth){
            leftOffset += (viewportWidth - contentWidth) / 2;
        }

        nodes = _.reduce(nodesByColumnPairs, function(m,colPair){
            return m.concat(colPair[1]);
        }, []);

        // Set correct X coordinate on each node depending on column and spacing prop.
        _.forEach(nodes, (node, i) => {
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
                    <Fade appear in>
                        <div>&nbsp;</div>
                    </Fade>
                </div>
            );
        }

        var fullHeight = Math.max(
            (typeof this.props.minimumHeight === 'number' && this.props.minimumHeight) || 0,
            height + this.props.innerMargin.top + this.props.innerMargin.bottom
        );

        var nodes = this.nodesWithCoordinates(
            this.props.nodes.slice(0),
            width,
            contentWidth,
            height
        );

        var edges = this.props.edges;

        /* TODO: later
        var spacerCount = _.reduce(nodes, function(m,n){ if (n.nodeType === 'spacer'){ return m + 1; } else { return m; }}, 0);
        if (spacerCount){
            height += (spacerCount * this.props.columnSpacing);
            fullHeight += (spacerCount * this.props.columnSpacing);
        }
        */

        return (
            <div ref="outerContainer" className="worfklow-chart-outer-container">
                <Fade appear in>
                    <div className="workflow-chart-inner-container">
                        <StateContainer
                            nodes={nodes}
                            edges={edges}
                            innerWidth={width}
                            innerHeight={height}
                            contentWidth={contentWidth}
                            {..._.pick(this.props, 'innerMargin', 'columnWidth', 'columnSpacing', 'pathArrows', 'href', 'onNodeClick', 'renderDetailPane', 'checkHrefForSelectedNode', 'checkWindowLocationHref')}
                        >
                            <ScrollContainer outerHeight={fullHeight}>
                                <EdgesLayer {..._.pick(this.props, 'edgeElement', 'isNodeDisabled', 'isNodeCurrentContext', 'isNodeSelected', 'edgeStyle', 'rowSpacing', 'columnWidth', 'columnSpacing', 'nodeEdgeLedgeWidths')} />
                                <NodesLayer {..._.pick(this.props, 'nodeElement', 'renderNodeElement', 'isNodeDisabled', 'isNodeCurrentContext', 'nodeClassName')} />
                            </ScrollContainer>
                        </StateContainer>
                    </div>
                </Fade>
            </div>
        );
    }

}
