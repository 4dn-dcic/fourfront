'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import memoize from 'memoize-one';
import { Fade } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Fade';
import { console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';

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
    };

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
        'innerMargin'   : {
            'top' : 60,
            'bottom' : 60,
            'left' : 30,
            'right' : 20
        },
        'minimumHeight' : 75,
        'edgeStyle' : 'bezier',
        'isNodeCurrentContext' : function(node){
            return false;
        },
        'nodeClassName' : function(node){ return ''; },
        'nodeEdgeLedgeWidths' : [3,5]
    };

    static getHeightFromNodes = memoize(function(nodes, nodesPreSortFxn, rowSpacing, minimumHeight){
        // Run pre-sort fxn, e.g. to manually pre-arrange nodes into different columns.
        if (typeof nodesPreSortFxn === 'function'){
            nodes = nodesPreSortFxn(nodes.slice(0));
        }
        return Math.max(
            _(nodes).chain()
                .groupBy('column')
                .pairs()
                .reduce(function(maxCount, nodeSet){
                    return Math.max(nodeSet[1].length, maxCount);
                }, 0)
                .value() * (rowSpacing) - rowSpacing,
            minimumHeight
        );
    });

    static getScrollableWidthFromNodes = memoize(function(nodes, columnWidth, columnSpacing, innerMargin){
        return (_.reduce(nodes, function(highestCol, node){
            return Math.max(node.column, highestCol);
        }, 0) + 1) * (columnWidth + columnSpacing) + (innerMargin.left || 0) + (innerMargin.right || 0) - columnSpacing;
    });

    /**
     * Extends each node with X & Y coordinates.
     *
     * Converts column placement and position within columns,
     * along with other chart dimension settings, into X & Y coordinates.
     *
     * IMPORTANT:
     * Returns a new array but _modifies array items in place_.
     * If need fresh nodes, deep-clone before supplying `props.nodes`.
     *
     * @static
     * @memberof Graph
     */
    static getNodesWithCoordinates = memoize(function(
        nodes                = null,
        viewportWidth        = null,
        contentWidth         = null,
        contentHeight        = null,
        innerMargin          = { top: 0, right: 0, bottom: 0, left: 0 },
        rowSpacingType       = 'compact',
        rowSpacing           = 75,
        columnWidth          = 150,
        columnSpacing        = 56,
        isNodeCurrentContext = false
    ){

        /** Vertically centers a single node within a column */
        function centerNode(n){
            n.y = (contentHeight / 2) + innerMargin.top;
            n.nodesInColumn = 1;
            n.indexInColumn = 0;
        }

        var nodesByColumnPairs, leftOffset, nodesWithCoords;

        // Arrange into lists of columns
        // Ensure we're sorted, using column _numbers_ (JS objs keyed by str).
        nodesByColumnPairs = _.sortBy(_.map(
            _.pairs(_.groupBy(nodes, 'column')),
            function([ columnNumStr, nodesInColumn ]){
                return [ parseInt(columnNumStr), nodesInColumn ];
            }
        ), 0);

        // Set correct Y coordinate on each node depending on how many nodes are in each column.
        _.forEach(nodesByColumnPairs, ([ columnNumber, nodesInColumn ]) => {

            var countInCol = nodesInColumn.length;

            nodesInColumn = _.sortBy(nodesInColumn, 'indexInColumn');

            if (rowSpacingType === 'compact') {
                if (countInCol === 1) centerNode(nodesInColumn[0]);
                else {
                    var padding = Math.max(0, contentHeight - ((countInCol - 1) * rowSpacing)) / 2;
                    _.forEach(nodesInColumn, function(nodeInCol, idx){
                        nodeInCol.y = ((idx + 0) * rowSpacing) + (innerMargin.top) + padding;
                        nodeInCol.nodesInColumn = countInCol;
                    });
                }
            } else if (rowSpacingType === 'stacked') {
                _.forEach(nodesInColumn, function(nodeInCol, idx){
                    if (!nodeInCol) return;
                    nodeInCol.y = (rowSpacing * idx) + innerMargin.top; //num + (this.props.innerMargin.top + verticalMargin);
                    nodeInCol.nodesInColumn = countInCol;
                });
            } else if (rowSpacingType === 'wide') {
                if (countInCol === 1) centerNode(nodesInColumn[0]);
                else {
                    _.forEach(
                        d3.range(0, contentHeight, contentHeight / (countInCol - 1)).concat([contentHeight]),
                        function(yCoordinate, idx){
                            var nodeInCol = nodesInColumn[idx];
                            if (!nodeInCol) return;
                            nodeInCol.y = yCoordinate + innerMargin.top;
                            nodeInCol.nodesInColumn = countInCol;
                        }
                    );
                }
            } else {
                console.error("Prop 'rowSpacingType' not valid. Must be ", Graph.propTypes.rowSpacingType);
                throw new Error("Prop 'rowSpacingType' not valid.");
            }
        });

        nodesWithCoords = _.reduce(nodesByColumnPairs, function(m, [ columnNumber, nodesInColumn ]){
            return m.concat(nodesInColumn);
        }, []);

        leftOffset = innerMargin.left;

        // Center graph contents horizontally if needed.
        if (contentWidth && viewportWidth && contentWidth < viewportWidth){
            leftOffset += (viewportWidth - contentWidth) / 2;
        }

        // Set correct X coordinate on each node depending on column and spacing prop.
        _.forEach(nodesWithCoords, (node, i) => {
            node.x = (node.column * (columnWidth + columnSpacing)) + leftOffset;
        });

        // Finally, add boolean `isCurrentContext` flag to each node object if needed.
        if (typeof isNodeCurrentContext === 'function'){
            _.forEach(nodesWithCoords, function(node){
                node.isCurrentContext = isNodeCurrentContext(node);
            });
        }

        return nodesWithCoords;
    });

    constructor(props){
        super(props);
        this.height = this.height.bind(this);
        this.nodesWithCoordinates = this.nodesWithCoordinates.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    height() {
        var { nodes, nodesPreSortFxn, rowSpacing, minimumHeight } = this.props;
        return Graph.getHeightFromNodes(nodes, nodesPreSortFxn, rowSpacing, minimumHeight);
    }

    scrollableWidth(){
        var { nodes, columnWidth, columnSpacing, innerMargin } = this.props;
        return Graph.getScrollableWidthFromNodes(nodes, columnWidth, columnSpacing, innerMargin);
    }

    nodesWithCoordinates(viewportWidth, contentWidth, contentHeight){
        var { nodes, innerMargin, rowSpacingType, rowSpacing, columnWidth, columnSpacing, isNodeCurrentContext } = this.props;
        return Graph.getNodesWithCoordinates(
            nodes, viewportWidth, contentWidth, contentHeight, innerMargin,
            rowSpacingType, rowSpacing, columnWidth, columnSpacing, isNodeCurrentContext
        );
    }

    render(){
        var { width, innerMargin, edges, minimumHeight } = this.props,
            innerHeight     = this.height(),
            contentWidth    = this.scrollableWidth(),
            innerWidth      = width;

        if (!this.state.mounted){
            return (
                <div key="outer">
                    <Fade appear in>
                        <div>&nbsp;</div>
                    </Fade>
                </div>
            );
        }

        if (innerMargin && (innerMargin.left || innerMargin.right)){
            innerWidth -= (innerMargin.left || 0);
            innerWidth -= (innerMargin.right || 0);
        }

        var nodes       = this.nodesWithCoordinates(innerWidth, contentWidth, innerHeight),
            fullHeight  = Math.max(
                (typeof minimumHeight === 'number' && minimumHeight) || 0,
                innerHeight + (innerMargin.top || 0) + (innerMargin.bottom || 0)
            );

        /* TODO: later
        var spacerCount = _.reduce(nodes, function(m,n){ if (n.nodeType === 'spacer'){ return m + 1; } else { return m; }}, 0);
        if (spacerCount){
            height += (spacerCount * this.props.columnSpacing);
            fullHeight += (spacerCount * this.props.columnSpacing);
        }
        */

        return (
            <div className="worfklow-chart-outer-container" key="outer">
                <Fade in appear>
                    <div className="workflow-chart-inner-container">
                        <StateContainer {...{ nodes, edges, innerWidth, innerHeight, contentWidth, width }}
                            {..._.pick(this.props, 'innerMargin', 'columnWidth', 'columnSpacing', 'pathArrows', 'href', 'onNodeClick', 'renderDetailPane')}>
                            <ScrollContainer outerHeight={fullHeight}>
                                <EdgesLayer {..._.pick(this.props, 'isNodeDisabled', 'isNodeCurrentContext', 'isNodeSelected', 'edgeStyle', 'rowSpacing', 'columnWidth', 'columnSpacing', 'nodeEdgeLedgeWidths')} />
                                <NodesLayer {..._.pick(this.props, 'renderNodeElement', 'isNodeDisabled', 'isNodeCurrentContext', 'nodeClassName')} />
                            </ScrollContainer>
                        </StateContainer>
                    </div>
                </Fade>
            </div>
        );
    }

}
