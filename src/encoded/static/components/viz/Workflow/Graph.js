'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
var d3 = require('d3');
import { Fade } from 'react-bootstrap';
import { console, isServerSide, navigate } from './../../util';

import StateContainer from './StateContainer';
import ScrollContainer from './ScrollContainer';
import NodesLayer from './NodesLayer';
import EdgesLayer from './EdgesLayer';
import DetailPane from './DetailPane';


export default class Graph extends React.Component {

    static propTypes = {
        'isNodeDisabled' : PropTypes.func,
        'innerMargin' : PropTypes.shape({
            'top' : PropTypes.number.isRequired,
            'bottom' : PropTypes.number.isRequired,
            'left' : PropTypes.number.isRequired,
            'right' : PropTypes.number.isRequired
        }).isRequired,
    }

    static defaultProps = {
        'height'        : null,
        'width'         : null,
        'columnSpacing' : 56,
        'columnWidth'   : 150,
        'rowSpacing'    : 56,
        'pathArrows'    : true,
        'detailPane'    : true,
        'rowSpacingType': 'wide',
        'onNodeClick'   : function(node, selectedNode, evt){
            console.log(node, selectedNode, evt);
            if (node !== selectedNode){
                navigate('#' + node.name, { inPlace: true, skipRequest : true });
            } else {
                navigate('#', { inPlace: true, skipRequest : true });
            }
        },
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
            }, 0) * this.props.rowSpacing;
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
                columnGroup[1][0].nodesInColumn = countInCol;
            } else if (this.props.rowSpacingType === 'compact') {
                var padding = Math.max(0,this.height() - ((countInCol - 1) * this.props.rowSpacing)) / 2;
                d3.range(countInCol).forEach((i) => {
                    columnGroup[1][i].y = ((i + 0) * this.props.rowSpacing) + (this.props.innerMargin.top) + padding;
                    columnGroup[1][i].nodesInColumn = countInCol;
                });
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
                            schemas={this.props.schemas}
                            isNodeDisabled={this.props.isNodeDisabled}
                            href={this.props.href}
                            onNodeClick={this.props.onNodeClick}
                        >
                            <ScrollContainer>
                                <EdgesLayer />
                                <NodesLayer />
                            </ScrollContainer>
                            { this.props.detailPane ?
                                <DetailPane />
                            : null }
                        </StateContainer>
                    </div>
                </Fade>
            </div>
        );
    }

}
