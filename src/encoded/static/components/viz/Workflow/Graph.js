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
 * @export
 * @class Graph
 * @extends {React.Component}
 * @prop {Object[]}     nodes                   Array of node objects to plot. Both nodes and edges can be generated from a CWL-like structure using static functions, including the provided 'parseAnalysisSteps'. See propTypes in class def below for object structure.
 * @prop {Object[]}     edges                   Array of edge objects to plot. See propTypes in class def below for object structure.
 * @prop {React.Component} [detailPane]         Provide a React Component instance (e.g. as JSX) to use to display node metadata at bottom of graph. A default pane applicable to 4DN is used if not provided. Pass in null to perform your own logic in onNodeClick.
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
        'nodeElement'       : PropTypes.element, // !!TODO!! Allow to pass in a Node element in place of default Node component and extend its props. For making reusable.
        'edgeElement'       : PropTypes.element, // !!TODO!!
        'detailPane'        : PropTypes.element,
        'nodes'             : PropTypes.arrayOf(PropTypes.shape({
            'column'            : PropTypes.number.isRequired,
            'name'              : PropTypes.string.isRequired,
            'type'              : PropTypes.string.isRequired,
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
        'detailPane'    : <DefaultDetailPane />,
        'nodeElement'   : <DefaultNodeElement />,
        'onNodeClick'   : null, // Use StateContainer.defaultOnNodeClick
        'nodeTitle'     : function(node, canBeJSX = false){ return node.title || node.name; },
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
        'nodesPreSortFxn' : function(nodes){
            // For any 'global input files', put them in first column (index 0).
            // MODIFIES IN-PLACE! Because it's a fine & performant side-effect if column assignment changes in-place. We may change this later.
            _.forEach(nodes, function(node){
                if (node.type === 'input' && node.format === 'Workflow Input File' && !node.outputOf && node.column !== 0){
                    node.column = 0;
                }
            });
            return nodes;
        },
        'nodesInColumnSortFxn' : function(node1, node2){

            function isNodeFileReference(n){
                return n.meta.run_data && n.meta.run_data.file && Array.isArray(n.meta.run_data.file['@type']) && n.meta.run_data.file['@type'].indexOf('FileReference') > -1;
            }

            function compareNodeInputOf(n1, n2){
                var n1InputOf = n1.type === 'step' ? n1.outputNodes : n1.inputOf;
                var n2InputOf = n2.type === 'step' ? n2.outputNodes : n2.inputOf;
                if (Array.isArray(n1InputOf) && Array.isArray(n2InputOf) && (n1InputOf[0] && n1InputOf[0].name && n2InputOf[0] && n2InputOf[0].name)){

                    if (n1InputOf[0].name === n2InputOf[0].name){
                        if (n1InputOf[0].id === n2InputOf[0].id){
                            if (n1.name === n2.name){
                                return (n1.id < n2.id) ? -2 : 2;
                            }
                            return (n1.name < n2.name) ? -2 : 2;
                        }
                        return n1InputOf[0].id < n2InputOf[0].id ? -3 : 3;
                    }
                    return n1InputOf[0].name < n2InputOf[0].name ? -1 : 1;
                }
                return 0;
            }

            function compareNodeOutputOf(n1, n2){
                var n1OutputOf = n1.type === 'step' ? (n1.inputNodes && n1.inputNodes.length > 0 && _.find(n1.inputNodes, function(n){ return typeof n.indexInColumn === 'number'; })) || null : n1.outputOf;
                var n2OutputOf = n2.type === 'step' ? (n2.inputNodes && n2.inputNodes.length > 0 && _.find(n2.inputNodes, function(n){ return typeof n.indexInColumn === 'number'; })) || null : n2.outputOf;

                if ((n1OutputOf && typeof n1OutputOf.indexInColumn === 'number' && n2OutputOf && typeof n2OutputOf.indexInColumn === 'number')){
                    if (n1OutputOf.column === n2OutputOf.column){
                        if (n1OutputOf.indexInColumn < n2OutputOf.indexInColumn) return -1;
                        if (n1OutputOf.indexInColumn > n2OutputOf.indexInColumn) return 1;
                    }
                }
                if ((n1OutputOf && n1OutputOf.name && n2OutputOf && n2OutputOf.name)){
                    if (n1OutputOf.name === n2OutputOf.name){
                        if (n1OutputOf.id === n2OutputOf.id){

                            if (typeof n1.inputOf !== 'undefined' && typeof n2.inputOf === 'undefined'){
                                return -3;
                            } else if (typeof n1.inputOf === 'undefined' && typeof n2.inputOf !== 'undefined'){
                                return 3;
                            }
                            if (n1.name < n2.name) return -1;
                            if (n1.name > n2.name) return 1;
                            return 0;//compareNodeInputOf(n1, n2);
                            
                        }
                        return n1OutputOf.id < n2OutputOf.id ? -3 : 3;
                    }
                    return n1OutputOf.name < n2OutputOf.name ? -3 : 3;
                }
                return 0;
            }

            var ioResult;

            if (node1.type === 'step' && node2.type === 'step'){
                if (node1.inputNodes && !node2.inputNodes) return -1;
                if (!node1.inputNodes && node2.inputNodes) return 1;
                if (node1.inputNodes && node2.inputNodes){
                    var n1input = _.find(node1.inputNodes, function(n){ return typeof n.indexInColumn === 'number'; }) || null;
                    var n2input = _.find(node2.inputNodes, function(n){ return typeof n.indexInColumn === 'number'; }) || null;
                    if (n1input && !n2input) return -1;
                    if (!n1input && n2input) return 1;
                    if (n1input && n2input){
                        if (n1input.column === n2input.column){
                            if (n1input.indexInColumn < n2input.indexInColumn) return -1;
                            if (n1input.indexInColumn > n2input.indexInColumn) return 1;
                        }
                    }
                }
                if (node1.name === node2.name){
                    if (node1.id === node2.id) return 0;
                    return (node1.id < node2.id) ? -2 : 2;
                }
                return (node1.name < node2.name) ? -2 : 2;
            }
            if (node1.type === 'output' && node2.type === 'input'){
                if (typeof node1.inputOf !== 'undefined'){
                    return -4;
                }
                return -1;
            } else if (node1.type === 'input' && node2.type === 'output'){
                if (typeof node2.inputOf !== 'undefined'){
                    return 4;
                }
                return 1;
            }

            // Groups go to bottom always. For now.
            if (node1.type === 'input-group' && node2.type !== 'input-group'){
                return 1;
            } else if (node1.type !== 'input-group' && node2.type === 'input-group'){
                return -1;
            }

            if (node1.type === node2.type){

                if (node1.type === 'output'){
                    ioResult = compareNodeOutputOf(node1, node2);
                    return ioResult;
                }

                

                if (node1.type === 'input'){

                    if (isNodeFileReference(node1)){
                        if (isNodeFileReference(node2)) {
                            //return 0;
                            //...continue
                        } else {
                            return 7;
                        }
                    } else if (isNodeFileReference(node2)) {
                        return -1;
                    }

                    ioResult = compareNodeInputOf(node1, node2);
                    if (ioResult !== 0) return ioResult;
                }
            }
        },
        'nodesInColumnPostSortFxn' : function(nodesInColumn, columnNumber){
            var groupNodes = _.filter(nodesInColumn, { 'type' : 'input-group' });
            if (groupNodes.length > 0){
                _.forEach(groupNodes, function(gN){
                    var relatedFileSource = _.find(gN.meta.source, function(s){ var typeToCheck = s.type.toLowerCase(); return typeToCheck === 'input file' || typeToCheck === 'output file'; });
                    var relatedFileNode = relatedFileSource && _.find(nodesInColumn, function(n){
                        if (n && n.meta && n.meta.run_data && n.meta.run_data.file && (n.meta.run_data.file.uuid || n.meta.run_data.file) === (relatedFileSource.for_file || 'x') ){
                            return true;
                        }
                        return false;
                    });
                    if (relatedFileNode){
                        // Re-arrange group node to be closer to its relation.
                        var oldIdx = nodesInColumn.indexOf(gN);
                        nodesInColumn.splice(oldIdx, 1);
                        var afterThisIdx = nodesInColumn.indexOf(relatedFileNode);
                        nodesInColumn.splice(afterThisIdx + 1, 0, gN);
                    }
                });
                // Update own indices (not used for anything currently xcept debugging)
                _.forEach(nodesInColumn, function(n, index){
                    n.indexInColumn = index;
                });
            }
            
            return nodesInColumn;
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
        nodes = _.sortBy(nodes, 'column');
        var nodesByColumnPairs = _.pairs(_.groupBy(nodes, 'column'));

        // Sort nodes within columns.
        if (typeof this.props.nodesInColumnSortFxn === 'function'){
            nodesByColumnPairs = _.map(nodesByColumnPairs, (columnGroup)=>{
                return [
                    columnGroup[0],
                    _.map(columnGroup[1].slice(0).sort(this.props.nodesInColumnSortFxn), function(n, i){
                        n.indexInColumn = i;
                        return n;
                    })
                ];
            });
        }

        // Run post-sort fxn, e.g. to manually re-arrange nodes within columns.
        if (typeof this.props.nodesInColumnPostSortFxn === 'function'){
            nodesByColumnPairs = _.map(nodesByColumnPairs, (columnGroup)=>{
                return [columnGroup[0], this.props.nodesInColumnPostSortFxn(columnGroup[1], columnGroup[0])];
            });
        }


        /****** Step 2: ***** ****** ****** ****** ****** ****** ****** ****** ****** ****** ******
         ****** Convert column placement and position within columns, along with other chart dimension settings, into X & Y coordinates.
         ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ****** ******/

        // Set correct Y coordinate on each node depending on how many nodes are in each column.
        nodesByColumnPairs.forEach((columnGroup) => {

            var nodesInColumn = columnGroup[1];
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

        var fullHeight = Math.max(
            (typeof this.props.minimumHeight === 'number' && this.props.minimumHeight) || 0,
            height + this.props.innerMargin.top + this.props.innerMargin.bottom
        );

        var nodes = this.props.nodes.slice(0);

        // Run pre-sort fxn, if any, to manually pre-arrange nodes into different columns.
        if (typeof this.props.nodesPreSortFxn === 'function') nodes = this.props.nodesPreSortFxn(nodes);

        nodes = this.nodesWithCoordinates(
            nodes,
            width,
            contentWidth,
            height
        );

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
                            href={this.props.href}
                            onNodeClick={this.props.onNodeClick}
                        >
                            <ScrollContainer outerHeight={fullHeight}>
                                <EdgesLayer {..._.pick(this.props, 'edgeElement', 'isNodeDisabled', 'isNodeCurrentContext', 'isNodeSelected', 'edgeStyle', 'rowSpacing', 'columnWidth', 'columnSpacing')} />
                                <NodesLayer {..._.pick(this.props, 'nodeElement', 'isNodeDisabled', 'isNodeCurrentContext', 'nodeClassName')} title={this.props.nodeTitle} />
                            </ScrollContainer>
                            { this.props.detailPane }
                        </StateContainer>
                    </div>
                </Fade>
            </div>
        );
    }

}
