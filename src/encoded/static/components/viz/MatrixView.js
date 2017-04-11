'use strict';

var React = require('react');
var _ = require('underscore');
import Matrix from './../lib/matrix-viz';
var { Fade } = require('react-bootstrap');
var d3 = require('d3');
var { layout, console, isServerSide } = require('./../util');



function defaultStyle(data, maxValue = 10) {
    var val = (data && data.value) || data;
	return {
		backgroundColor: 'rgba(65, 65, 138, '+ val/maxValue + ')',
		border: val >= 1 ? 'none' : '1px solid #eee'
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
                this.props.labels.map((label, i)=>{
                    var displayLabel = label;
                    if (Array.isArray(displayLabel)){
                        displayLabel = (
                            <div className="label-container">
                                { displayLabel.map(function(labelPart, i){
                                    return <div key={i} className={"part-" + (i + 1)}>{ labelPart }</div>;
                                }) }
                            </div>
                        );
                    }
                    return (
                        <div className="y-axis-matrix-label" key={label || i} style={{ height : this.props.cellSize }}>
                            <div className="inner" ref={function(r){
                                if (!r) return null;
                                r.style.top = Math.max(layout.verticalCenterOffset(r) - 3, 0) + 'px';
                            }}>
                                { displayLabel }
                            </div>
                        </div>
                    );
                })
            }
            </div>
        );
    }

}


export class MatrixContainer extends React.Component {

    static YAxis = YAxis

    static defaultProps = {
        'grid' : [
            [0,0,0], [1,2,1], [1,2,3], [3,3,3], [3,2,1]
        ],
        'defaultStyleFxn' : defaultStyle,
        'fitTilesToWidth' : true,
        'cellSize' : null,
        'yLabelsWidth' : 200,
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
		this.state = {
            in : false
		}
    }

	componentDidUpdate(pastProps, pastState){
		if (pastProps.mounted === false && this.props.mounted === true){
            setTimeout(()=>{
                this.setState({ 'in' : true })
            }, 100);
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
    
    render(){
        if (!this.props.mounted) return null;
        return (
            <Fade in={this.state.in}>
				<div className="matrix-view-container-wrapper">
					{ this.props.title ? <h4 className="matrix-title">{ this.props.title }</h4> : null }
                    <div className="matrix-view-container clearfix">
                        <MatrixContainer.YAxis labels={this.props.yAxisLabels} width={this.props.yLabelsWidth} cellSize={this.cellSize()} />
                        <div className="matrix-grid-container" style={{ width : this.gridWidth() }}>
                            <Matrix data={_.zip.apply(_, this.props.grid)} setStyle={this.cellStyle} />
                        </div>
                    </div>
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

    render(grid, xAxisLabels, yAxisLabels, title, defaultStyle = defaultStyle) {
		return (
            <div ref="matrixWrapper">
                <MatrixContainer
                    grid={grid}
                    defaultStyleFxn={defaultStyle}
                    xAxisLabels={xAxisLabels}
                    yAxisLabels={yAxisLabels}
                    title={title}
                    mounted={this.state.mounted}
                    width={this.props.width || this.state.containerWidth}
                    maxValue={MatrixView.findGreatestValueInGrid(grid)}
                />
            </div>
		);
	}

}