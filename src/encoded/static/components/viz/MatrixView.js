'use strict';

var React = require('react');
var _ = require('underscore');
import Matrix from './../lib/matrix-viz';
var { Fade } = require('react-bootstrap');
var d3 = require('d3');
var vizUtil = require('./../viz/utilities');
var { layout, console, isServerSide } = require('./../util');
var ReactTooltip = require('react-tooltip');



function defaultStyle(data, maxValue = 10) {
    var val = (data && data.value) || data;
	return {
		backgroundColor: 'rgba(65, 65, 138, '+ val/maxValue + ')',
		border: val >= 1 ? 'none' : '1px dotted #eee'
	}
}


class Label extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
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
        var displayLabel = this.props.label;
        var heightIncrClass = (' height-at-least-' + this.heightIncrement());
        if (Array.isArray(displayLabel)){
            displayLabel = (
                <div className={"label-container" + heightIncrClass}>
                    { displayLabel.map(function(labelPart, i){
                        return <div key={i} className={"part-" + (i + 1)}>{ labelPart }</div>;
                    }) }
                </div>
            );
        }
        return (
            <div
                className={this.props.className}
                style={_.extend({ height : this.props.height, width : this.props.width }, this.props.style)}
            >
                <div className="inner" ref={function(r){
                    if (!r) return null;
                    r.style.top = Math.max(layout.verticalCenterOffset(r, 2) - 3, 0) + 'px';
                }}>
                    { displayLabel }
                </div>
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
class YAxis extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        return (
            <div className="matrix-y-axis" style={{ width : this.props.width }}>
            {
                this.props.labels.map((label, i)=>
                    <Label
                        label={label}
                        key={label || i}
                        className="y-axis-matrix-label"
                        height={this.props.cellSize}
                    />
                )
            }
            </div>
        );
    }

}

class XAxis extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){

        var translateVector = Math.sqrt(this.props.cellSize * this.props.cellSize * 2) / 2;

        // These will be drawn at same dimension as Y Axis labels, and rotated (hence width=this.props.height on Label).
        return (
            <div className="matrix-x-axis clearfix" style={{
                height : Math.sqrt((this.props.height * this.props.height) / 2),
            }}>
                <div className="prefix" style={{ width : this.props.leftOffset, height : '100%' }}>
                    { this.props.prefixContent }
                    { this.props.yAxisTitle ?
                        <div className="matrix-y-axis-title">
                            <div><small className="text-300">Row<i className="icon icon-arrow-down"/></small></div>
                            { this.props.yAxisTitle }
                        </div>
                    : null }
                    { this.props.xAxisTitle ?
                        <div className="matrix-x-axis-title text-right">
                            <div><small className="text-300">Column<i className="icon icon-arrow-right"/></small></div>
                            { this.props.xAxisTitle }
                        </div>
                    : null }
                </div>
            {
                this.props.labels.map((label, i)=>
                    <div className="x-axis-matrix-label-container" style={{ width : this.props.cellSize }} key={label || i}>
                        <Label
                            label={label}
                            className="x-axis-matrix-label"
                            height={this.props.cellSize}
                            width={this.props.height}
                            style={{
                                transform : vizUtil.style.rotate3d(-45) + ' ' + vizUtil.style.translate3d(translateVector, translateVector)
                            }}
                        />
                    </div>
                )
            }
            </div>
        );
    }
}


export class MatrixContainer extends React.Component {

    static YAxis = YAxis
    static XAxis = XAxis

    static defaultProps = {
        'grid' : [
            [0,0,0], [1,2,1], [1,2,3], [3,3,3], [3,2,1]
        ],
        'defaultStyleFxn' : defaultStyle,
        'fitTilesToWidth' : true,
        'cellSize' : null,
        'yLabelsWidth' : 200,
        'xLabelsHeight' : 200,
        'maxCellSize' : 64,
        'minCellSize' : 20
    }

    constructor(props){
		super(props);
		this.render = this.render.bind(this);
		this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.gridWidth = this.gridWidth.bind(this);
        this.cellSize = this.cellSize.bind(this);
        this.cellStyle = this.cellStyle.bind(this);
        this.body = this.body.bind(this);
    }

	componentDidUpdate(pastProps, pastState){
		if (pastProps.mounted === false && this.props.mounted === true){
            ReactTooltip.rebuild();
        }
    }

    gridWidth(){
        return (this.props.width || 0) - this.props.yLabelsWidth;
    }

    cellSize(){
        if (typeof this.props.cellSize === 'number') return this.props.cellSize;
        if (!this.props.width || !this.props.fitTilesToWidth) return (this.props.maxCellSize + this.props.minCellSize) / 2;

        var numCols = this.props.grid[0].length;
        var cellSize = Math.max(
            Math.min(
                Math.floor( this.gridWidth() / numCols ),
                this.props.maxCellSize
            ),
            this.props.minCellSize
        );

        return cellSize;
    }

    cellStyle(data){
        var cellSize = this.cellSize();
        return _.extend(
            {
                width: cellSize,
                height: cellSize
            },
            this.props.defaultStyleFxn(data, this.props.maxValue)
        );
    }

    body(){
        if (!this.props.mounted) return null;
        return (
            <div className="matrix-view-container clearfix">
                <MatrixContainer.XAxis
                    labels={this.props.xAxisLabels}
                    height={this.props.xLabelsHeight}
                    cellSize={this.cellSize()}
                    leftOffset={this.props.yLabelsWidth}
                    prefixContent={this.props.title ? <h4 className="matrix-title">{ this.props.title }</h4> : null}
                    yAxisTitle={this.props.yAxisTitle}
                    xAxisTitle={this.props.xAxisTitle}
                />
                <MatrixContainer.YAxis labels={this.props.yAxisLabels} width={this.props.yLabelsWidth} cellSize={this.cellSize()} />
                <div className="matrix-grid-container" style={{ width : this.gridWidth() }}>
                    <Matrix data={_.zip.apply(_, this.props.grid)} setStyle={this.cellStyle} />
                </div>
            </div>
        );
    }
    
    render(){
        var totalHeight = (
            this.props.xLabelsHeight + 
            (this.props.grid.length * this.cellSize())
        );
        return (
            <Fade in={true} transitionAppear={true}>
				<div className="matrix-view-container-wrapper" style={{ minHeight : totalHeight }}>
                    { this.body() }
                </div>
            </Fade>
        );
    }

}


export default class MatrixView extends React.Component {

    static findGreatestValueInGrid(grid, valueKey = 'value'){
        return _.reduce(grid, function(mOuter, row){
            return Math.max(
                _.reduce(row, function(mInner, cell){
                    if (typeof cell[valueKey] !== 'number') return m;
                    return Math.max(mInner, cell[valueKey]);
                }, 0),
                mOuter
            );
        }, 0);
    }

	constructor(props){
		super(props);
		this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.getContainerWidth = this.getContainerWidth.bind(this);
        this.handleResize = _.debounce(this.handleResize.bind(this), 300);
        this.state = {
    		mounted : false,
            containerWidth : null
		}
	}

    getContainerWidth(){
        if (this.props.width) return this.props.width;
        if (this.refs && this.refs.matrixWrapper){
            return this.refs.matrixWrapper.clientWidth || this.refs.matrixWrapper.offsetWidth;
        } else {
            return (layout.gridContainerWidth() - 20);
        }
    }

    handleResize(evt){
        this.setState({ containerWidth : this.getContainerWidth() });
    }

    componentDidMount(){
        var newState = {
            mounted : true
        };
        if (!isServerSide()){
            if (!this.props.width){
                newState.containerWidth = this.getContainerWidth();
                window.addEventListener('resize', this.handleResize);
            }
        }
		this.setState(newState);
	}

    componentWillUnmount(){
        if (!isServerSide() && !this.props.width){
            window.removeEventListener('resize', this.handleResize);
        }
    }

    render(grid, xAxisLabels, yAxisLabels, xAxisTitle, yAxisTitle, title, defaultStyle = defaultStyle) {
		return (
            <div ref="matrixWrapper">
                <MatrixContainer
                    grid={grid}
                    defaultStyleFxn={defaultStyle}
                    xAxisLabels={xAxisLabels}
                    xAxisTitle={xAxisTitle}
                    yAxisLabels={yAxisLabels}
                    yAxisTitle={yAxisTitle}
                    title={title}
                    mounted={this.state.mounted}
                    width={this.props.width || this.state.containerWidth}
                    maxValue={MatrixView.findGreatestValueInGrid(grid)}
                />
            </div>
		);
	}

}