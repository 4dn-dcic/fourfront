'use strict';

import React from 'react';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import Matrix from './../lib/matrix-viz';
import { Fade } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Fade';
import { style as styleFxn } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { layout, console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

/**
 * This file and components are deprecated.
 * Maintained as might be needed in future for CSVs.
 *
 * @deprecated
 * @module
 */

export function genDefaultStyle(data, maxValue = 10) {
    var val = (data && data.numericValue) || data;
    return {
        'border' : val >= 1 ? 'none' : '1px dotted #eee'
    };
}


class Label extends React.PureComponent {

    constructor(props){
        super(props);
        this.heightIncrement = this.heightIncrement.bind(this);
    }

    static defaultProps = {
        'className' : 'y-axis-matrix-label',
        'label' : ['Label', 'Sub-Label', 'More Info...'],
        'style' : {}
    }

    heightIncrement(){
        if (this.props.height >= 64) return 64;
        if (this.props.height >= 45) return 45;
        if (this.props.height >= 30) return 30;
        return 0;
    }

    render(){
        const { label, height, width, style, className } = this.props;
        let displayLabel = label;
        const heightIncrClass = (' height-at-least-' + this.heightIncrement());
        if (Array.isArray(displayLabel)){
            displayLabel = (
                <div className={"label-container" + heightIncrClass}>
                    { _.map(displayLabel, function(labelPart, i){
                        return <div key={i} className={"part-" + (i + 1)}>{ labelPart }</div>;
                    }).reverse() }
                </div>
            );
        }
        return (
            <div className={className} style={_.extend({ height, width }, style)} >
                <div className="inner">{ displayLabel }</div>
            </div>
        );
    }

}

/**
 * Component for Y Axis of the Matrix.
 *
 * @class YAxis
 * @extends {React.Component}
 * @prop {number} width - Width in pixels of the X Axis / Labels section.
 */
function YAxis (props){
    const { width, labels, cellSize } = props;
    return (
        <div className="matrix-y-axis" style={{ width }}>
            { _.map(labels, function(label, i){
                return <Label label={label} key={label || i} className="y-axis-matrix-label" height={cellSize} />;
            }) }
        </div>
    );

}

function XAxis(props){
    const { cellSize, height, yAxisTitle, xAxisTitle, showXAxisTitle, prefixContent, labels, gridWidth, leftOffset, registerPostUpdateFxn } = props;
    const translateVector = Math.sqrt(cellSize * cellSize * 2) / 2.25;

    // These will be drawn at same dimension as Y Axis labels, and rotated (hence width=this.props.height on Label).
    return (
        <div className="matrix-x-axis clearfix" style={{
            height : Math.sqrt((height * height) / 2),
            width : gridWidth + leftOffset
        }}>
            <div className="prefix" style={{ width : leftOffset, height : '100%' }}>
                { prefixContent }
                { yAxisTitle ?
                    <div className="matrix-y-axis-title">
                        {/*<div><small className="text-300">Row<i className="icon icon-arrow-down fas"/></small></div>*/}
                        { yAxisTitle }
                    </div>
                    : null }
                { showXAxisTitle && xAxisTitle ?
                    <div className="matrix-x-axis-title text-right">
                        <div><small className="text-300">Column<i className="icon icon-arrow-right fas"/></small></div>
                        { xAxisTitle }
                    </div>
                    : null }
            </div>
            {_.map(labels, function(label, i){
                return (
                    <div className="x-axis-matrix-label-container" style={{ width : cellSize }} key={label || i}>
                        <Label label={label} className="x-axis-matrix-label"
                            height={cellSize} width={height} registerPostUpdateFxn={registerPostUpdateFxn}
                            style={{ 'transform' : styleFxn.rotate3d(-45) + ' ' + styleFxn.translate3d(translateVector, translateVector) }} />
                    </div>
                );
            }) }
        </div>
    );
}


export class MatrixContainer extends React.PureComponent {

    static YAxis = YAxis;
    static XAxis = XAxis;

    static defaultProps = {
        'grid' : [
            [0,0,0], [1,2,1], [1,2,3], [3,3,3], [3,2,1]
        ],
        'styleFxn' : genDefaultStyle,
        'fitTilesToWidth' : true,
        'cellSize' : 40,
        'yLabelsWidth' : 240,
        'xLabelsHeight' : 200,
        'maxCellSize' : 48,
        'minCellSize' : 20
    };

    constructor(props){
        super(props);
        this.maxGridWidth = this.maxGridWidth.bind(this);
        this.cellSize = this.cellSize.bind(this);
        this.cellStyle = this.cellStyle.bind(this);
        this.body = this.body.bind(this);
    }


    componentDidUpdate(pastProps, pastState){
        if (pastProps.mounted === false && this.props.mounted === true){
            ReactTooltip.rebuild();
        }
    }

    maxGridWidth(){
        const { width, yLabelsWidth } = this.props;
        return Math.floor((width || 0) - yLabelsWidth);
    }

    gridWidth(){
        return this.props.xAxisLabels.length * (this.cellSize() + 2);
    }

    cellSize(){
        const { cellSize, width, fitTilesToWidth, maxCellSize, grid } = this.props;
        if (typeof cellSize === 'number') return cellSize;
        if (!width || !fitTilesToWidth) return (maxCellSize + minCellSize) / 2;

        const numCols = grid[0].length;
        return Math.max(
            Math.min(
                Math.floor( this.maxGridWidth() / numCols ),
                maxCellSize
            ),
            minCellSize
        );
    }

    cellStyle(data){
        const { styleFxn, maxValue } = this.props;
        const cellSize = this.cellSize();
        return _.extend({ width: cellSize, height: cellSize }, styleFxn(data, maxValue));
    }

    body(){
        const { mounted, xAxisLabels, yAxisLabels, xLabelsHeight, yLabelsWidth, grid, cellStyle, title, xAxisTitle, yAxisTitle } = this.props;
        if (!mounted) return null;
        var gridWidth       = this.gridWidth(),
            maxGridWidth    = this.maxGridWidth(),
            cellSize        = this.cellSize();
        return (
            <div className="matrix-view-container clearfix">
                <XAxis labels={xAxisLabels} height={xLabelsHeight} cellSize={cellSize}
                    leftOffset={yLabelsWidth} yAxisTitle={yAxisTitle} xAxisTitle={xAxisTitle}
                    prefixContent={title ?
                        <h4 className={"matrix-title" + (!this.props.showXAxisTitle ? " no-x-axis-title" : "")}>{ title }</h4>
                        : null
                    }
                    gridWidth={gridWidth} maxGridWidth={maxGridWidth}
                    registerPostUpdateFxn={this.registerPostUpdateFxn}
                    showXAxisTitle={this.props.showXAxisTitle}
                />
                <YAxis labels={yAxisLabels} width={yLabelsWidth} cellSize={cellSize} registerPostUpdateFxn={this.registerPostUpdateFxn} />
                <div className="matrix-grid-container" style={{ width : Math.min(maxGridWidth, gridWidth) }}>
                    <Matrix data={_.zip.apply(_, grid)} setStyle={this.cellStyle} registerPostUpdateFxn={this.registerPostUpdateFxn} tooltipDataFor="matrix-tooltip" />
                </div>
            </div>
        );
    }

    render(){
        const { xLabelsHeight, grid } = this.props;
        var totalHeight = xLabelsHeight + (grid.length * this.cellSize());
        return (
            <Fade in appear>
                <div className="matrix-view-container-wrapper" style={{ minHeight : totalHeight }}>
                    { this.body() }
                </div>
            </Fade>
        );
    }

}


export default class MatrixView extends React.PureComponent {

    static findGreatestValueInGrid(grid, valueKey = 'numericValue'){
        return _.reduce(grid, function(mOuter, row){
            return Math.max(
                _.reduce(row, function(mInner, cell){
                    if (typeof cell[valueKey] !== 'number') return mInner;
                    return Math.max(mInner, cell[valueKey]);
                }, 0),
                mOuter
            );
        }, 0);
    }

    static defaultProps = {
        'styleFxn' : genDefaultStyle,
        'maxValue' : null,
        'showXAxisTitle' : true
    };

    constructor(props){
        super(props);
        this.getContainerWidth = this.getContainerWidth.bind(this);
        this.state = {
            mounted : false,
            containerWidth : null
        };
        this.wrapperRef = React.createRef();
    }

    getContainerWidth(){
        const { width, windowWidth } = this.props;
        if (width) return width;
        if (this.state.mounted && this.wrapperRef.current){
            return this.wrapperRef.current.clientWidth || this.wrapperRef.current.offsetWidth;
        } else {
            return (layout.gridContainerWidth(windowWidth) - 20);
        }
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    render() {
        const { grid, xAxisLabels, yAxisLabels, xAxisTitle, yAxisTitle, title, styleFxn, maxValue, showXAxisTitle, width } = this.props;
        const containerWidth = width || this.getContainerWidth();
        return (
            <div ref={this.wrapperRef}>
                <MatrixContainer
                    grid={grid}
                    styleFxn={styleFxn}
                    xAxisLabels={xAxisLabels}
                    xAxisTitle={xAxisTitle}
                    yAxisLabels={yAxisLabels}
                    yAxisTitle={yAxisTitle}
                    title={title}
                    mounted={this.state.mounted}
                    width={containerWidth}
                    maxValue={maxValue || MatrixView.findGreatestValueInGrid(grid)}
                    showXAxisTitle={showXAxisTitle}
                />
                <ReactTooltip id="matrix-tooltip" class="matrix-tooltip" delayHide={0} effect="solid" offset={{ 'top' : -15, 'left' : 0 }} globalEventOff="click"/>
            </div>
        );
    }

}