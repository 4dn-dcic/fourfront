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
            'inputOf'           : PropTypes.object,  // Unused currently
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
        'rowSpacingType'    : PropTypes.oneOf([ 'compact', 'wide' ])
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
        'minimumHeight' : 120,
        'edgeStyle' : 'bezier'
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
        return Math.max(
            _(this.props.nodes).chain()
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

    nodesWithCoordinates(viewportWidth = null, contentWidth = null, contentHeight = null, verticalMargin = 0){

        if (!contentHeight) contentHeight = this.height();

        var nodes = _.sortBy(this.props.nodes.slice(0), 'column');

        // Set correct Y coordinate on each node depending on how many nodes are in each column.
        _.pairs(_.groupBy(nodes, 'column')).forEach((columnGroup) => {
            var countInCol = columnGroup[1].length;
            if (countInCol === 1){
                columnGroup[1][0].y = (contentHeight / 2) + this.props.innerMargin.top + verticalMargin;
                columnGroup[1][0].nodesInColumn = countInCol;
            } else if (this.props.rowSpacingType === 'compact') {
                var padding = Math.max(0, contentHeight - ((countInCol - 1) * this.props.rowSpacing)) / 2;
                d3.range(countInCol).forEach((i) => {
                    columnGroup[1][i].y = ((i + 0) * this.props.rowSpacing) + (this.props.innerMargin.top) + padding + verticalMargin;
                    columnGroup[1][i].nodesInColumn = countInCol;
                });
            } else {
                _.forEach(d3.range(0, contentHeight, contentHeight / (countInCol - 1) ).concat([contentHeight]), (num, idx)=>{
                    columnGroup[1][idx].y = num + (this.props.innerMargin.top + verticalMargin);
                    columnGroup[1][idx].nodesInColumn = countInCol;
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

        var fullHeight = Math.max(
            (typeof this.props.minimumHeight === 'number' && this.props.minimumHeight) || 0,
            height + this.props.innerMargin.top + this.props.innerMargin.bottom
        );

        var nodes = this.nodesWithCoordinates(
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
                                <EdgesLayer edgeElement={this.props.edgeElement} isNodeDisabled={this.props.isNodeDisabled} edgeStyle={this.props.edgeStyle} />
                                <NodesLayer nodeElement={this.props.nodeElement} isNodeDisabled={this.props.isNodeDisabled} title={this.props.nodeTitle} />
                            </ScrollContainer>
                            { this.props.detailPane }
                        </StateContainer>
                    </div>
                </Fade>
            </div>
        );
    }

}
