'use strict';

var React = require('react');
var _ = require('underscore');
import Matrix from './../lib/matrix-viz';
var { Fade } = require('react-bootstrap');
var d3 = require('d3');

function defaultStyle(data) {
	return {
		backgroundColor: 'rgba(200, 150, 200, '+ data.value/2 + ')',
		border: data.value >= 1 ? 'none' : '1px solid #ddd'
	}
}


export const MatrixUtilities = {

    /**
     * @static
     * @function
     * @param {string} csvString - String representation of a CSV document.
     * @param {Object} options - Options for parsing CSV.
     * @returns {Object} A container object containing X Axis Labels, Y Axis Labels, and a 2D data object array.
     * @see MatrixUtilities.defaultCSVParseOptions().
     */
    CSVStringTo2DArraySet : function(csvString, options = {}){
        if (typeof csvString  !== 'string') throw new Error("csvString must be a string.");
        options = _.extend(MatrixUtilities.defaultCSVParseOptions(), options);
        var data = d3.csvParseRows(csvString);

        // Grab title from CSV, if set.
        var title = null;
		if (Array.isArray(options.titleCell)){
            title = data[options.titleCell[1] - 1][options.titleCell[0] - 1];
        }

        var xAxisLabels = MatrixUtilities.xAxisLabelsFrom2DArray(data, options),
            yAxisLabels = MatrixUtilities.yAxisLabelsFrom2DArray(data, options),
            grid = MatrixUtilities.stringValuesToObjectsGrid(
                MatrixUtilities.filter2DArrayDownToRange(data, options),
                xAxisLabels,
                yAxisLabels
            );

        return {
            'title' : title,
            'xAxisLabels' : xAxisLabels,
            'yAxisLabels' : yAxisLabels,
            'grid' : grid
        };
    },

    /**
     * @static
     * @memberof MatrixUtilities
     * @param {string[][]} stringGrid - 2D array of string values.
     */
    stringValuesToObjectsGrid : function(stringGrid, xAxisLabels, yAxisLabels){
        return stringGrid.map(function(row, rowIndex){
            return row.map(function(cellValue, columnIndex){
                var numVal;
                if (typeof cellValue === 'number'){
                    numVal = cellValue;
                } else if (typeof cellValue === 'string'){
                    if (cellValue.length === 0) numVal = 0;
                    else {
                        numVal = parseFloat(cellValue);
                        if (isNaN(numVal)) numVal = 1;
                    }
                }
                
                return {
                    originalValue : cellValue,
                    value : numVal,
                    row : rowIndex,
                    column : columnIndex,
                    columnLabel : xAxisLabels[columnIndex],
                    rowLabel : yAxisLabels[rowIndex]
                }

            });
        })
    },

    defaultCSVParseOptions: function(){
        return {
            "titleCell" : [1,1],
            "yaxisCols" : [1,2],
            "xaxisRows" : [3],
            "skipRows"  : [22,23,24],
            "startCell" : [3,5],
            "endCell"   : [8,32]
        };
    },

    xAxisLabelsFrom2DArray : function(data, options){
       return _.zip.apply(_.zip, options.xaxisRows.map(function(xRow){ 
            return data[xRow - 1].filter(function(colLabel, colIdx){
	            if (colIdx < options.startCell[0] - 1) return false;
                if (colIdx > options.endCell[0] - 1) return false;
            	return true;
            });
        })).map(function(setOfXLabels){
            return setOfXLabels.join(' - ');
        });
    },

    yAxisLabelsFrom2DArray : function(data, options){
        return _.zip.apply(_.zip, options.yaxisCols.map(function(yCol){ 
            return _.pluck(data, yCol - 1).filter(function(rowLabel, rowIdx){
	            if (rowIdx < options.startCell[1] - 1) return false;
                if (rowIdx > options.endCell[1] - 1) return false;
                    if (options.skipRows.indexOf(rowIdx + 1) > -1){
                    return false;
                }
            	return true;
            });
        })).map(function(setOfYLabels){
            return setOfYLabels.join(' - ');
        });
    },

    filter2DArrayDownToRange : function(data, options){
        return data.filter(function(row, rowIndex){
			if (rowIndex < options.startCell[1] - 1) return false;
			if (rowIndex > options.endCell[1] - 1) return false;
            if (options.skipRows.indexOf(rowIndex + 1) > -1){
                return false;
            }
			return true;
		}).map(function(row, adjustedRowIndex){
            return row.filter(function(cell, colIndex){
                if (colIndex < options.startCell[0] - 1) return false;
                if (colIndex > options.endCell[0] - 1) return false;
                return true;
            });
        });
    }

};


export default class CSVMatrixView extends React.Component {

	constructor(props){
		super(props);
		this.render = this.render.bind(this);
		this.componentDidMount = this.componentDidMount.bind(this);
		this.componentDidUpdate = this.componentDidUpdate.bind(this);
		this.state = {
			mounted : false,
            in : false
		}
	}

	componentDidMount(){
		this.setState({ mounted : true });
	}

	componentDidUpdate(pastProps, pastState){
		if (pastState.mounted === false && this.state.mounted === true){
            setTimeout(()=>{
                this.setState({ 'in' : true })
            }, 100);
        }
    }

    render() {
        console.log(this.props);
        if (!this.state.mounted) return null;
        var options = this.props.options || {};

        if (typeof this.props.csv !== 'string') {
            throw new Error("No valid CSV prop defined.");
        }

        var { grid, title, xAxisLabels, yAxisLabels } = MatrixUtilities.CSVStringTo2DArraySet(this.props.csv, options);

		return (
			<Fade in={this.state.in}>
				<div>
					<h3>{ title }</h3>
					<div className="example example-one">
						<Matrix data={grid} setStyle={defaultStyle} />
					</div>
				</div>
			</Fade>
		);
	}

}
