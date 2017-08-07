'use strict';

var React = require('react');
var _ = require('underscore');
import MatrixView, {  } from './../../viz/MatrixView';
import * as d3 from 'd3';
var { console } = require('./../../util');


export const CSVParsingUtilities = {

    /**
     * @static
     * @function
     * @param {string} csvString - String representation of a CSV document.
     * @param {Object} options - Options for parsing CSV.
     * @returns {Object} A container object containing X Axis Labels, Y Axis Labels, and a 2D data object array.
     * @see CSVParsingUtilities.defaultCSVParseOptions().
     */
    CSVStringTo2DArraySet : function(csvString, options = {}){
        if (typeof csvString  !== 'string') throw new Error("csvString must be a string.");
        var data = d3.csvParseRows(csvString);

        options = _.extend(CSVParsingUtilities.defaultCSVParseOptions(), options, { 
            'endCell' : options.endCell || CSVParsingUtilities.findEndCellCoordsFromGrid(data, options)
        });

        // Grab title from CSV, if set.
        var title = null;
        if (Array.isArray(options.titleCell)){
            title = data[options.titleCell[1] - 1][options.titleCell[0] - 1];
        }
        var xAxisLabels = CSVParsingUtilities.xAxisLabelsFrom2DArray(data, options),
            yAxisLabels = CSVParsingUtilities.yAxisLabelsFrom2DArray(data, options),
            grid = CSVParsingUtilities.stringValuesToObjectsGrid(
                CSVParsingUtilities.filter2DArrayDownToRange(data, options),
                xAxisLabels,
                yAxisLabels,
                options
            );

        return {
            'title' : title,
            'xAxisLabels' : xAxisLabels,
            'yAxisLabels' : yAxisLabels,
            'grid' : grid
        };
    },

    findEndCellCoordsFromGrid : function(grid, options){
        var startCol = (options.startCell && options.startCell[0]) || 1;
        var endCol;
        var rowNumsToCheck;
        if (Array.isArray(options.xaxisRows) && options.xaxisRows.length > 0){
            rowNumsToCheck = options.xaxisRows;
        } else if (Array.isArray(options.startCell) && options.startCell.length > 1){
            rowNumsToCheck = [options.startCell[1]];
        }

        for (endCol = startCol; (endCol - 1) < grid[0].length; endCol++){
            if (_.every(rowNumsToCheck, function(rowNum){
                var cellToCheck = grid[rowNum - 1][endCol - 1];
                if (!cellToCheck || (typeof cellToCheck === 'string' && cellToCheck.trim().length === 0)) {
                    return true;
                }
                return false;
            })){
                // Break when endCol:allRowNums === blank
                break;
            }
        }
        endCol--;

        var startRow = (options.startCell && options.startCell[1]) || (options.xaxisRows && Math.max.apply(Math.max, options.xaxisRows) + 1) || 1;
        var endRow;
        var colNumsToCheck = d3.range(startCol, endCol + 1, 1);
        if (Array.isArray(options.yaxisCols) && options.yaxisCols.length > 0){
            colNumsToCheck = options.yaxisCols.concat(colNumsToCheck);
        }

        for (endRow = startRow; (endRow - 1) < grid.length; endRow++){
            if (_.every(colNumsToCheck, function(colNum){
                var cellToCheck = grid[endRow - 1][colNum - 1];
                if (!cellToCheck || (typeof cellToCheck === 'string' && cellToCheck.trim().length === 0)) {
                    return true;
                }
                return false;
            })){
                // Break when endCol:allRowNums === blank
                break;
            }
        }
        endRow--;

        return [endCol, endRow];
    },

    /**
     * @static
     * @memberof CSVParsingUtilities
     * @param {string[][]} stringGrid - 2D array of string values.
     */
    stringValuesToObjectsGrid : function(stringGrid, xAxisLabels, yAxisLabels, options){
        return stringGrid.map(function(row, rowIndex){
            return row.map(function(cellValue, columnIndex){

                var cellType;
                var numVal;

                if (typeof cellValue === 'number'){
                    numVal = cellValue;
                } else if (typeof cellValue === 'string'){
                    cellType = CSVParsingUtilities.determineCellType(cellValue);

                    if (!cellType || cellType === 'none') numVal = 0;
                    else if (cellType === 'planned') numVal = 2;
                    else if (cellType === 'in submission') numVal = 3;
                    else if (cellType === 'submitted') numVal = 4;
                }
                
                return {
                    'originalValue' : cellValue,
                    'numericValue'  : numVal,
                    'row'           : rowIndex,
                    'column'        : columnIndex,
                    'columnLabel'   : xAxisLabels[columnIndex],
                    'rowLabel'      : yAxisLabels[rowIndex],
                    'tooltip'       : CSVParsingUtilities.generateCellTooltipContent(cellValue, yAxisLabels, xAxisLabels, rowIndex, columnIndex, options),
                    'className'     : 'cellType-' + cellType.split(' ').join('-')
                };

            });
        });
    },

    determineCellType : function(origCellValue){
        var firstCharacter = origCellValue.charAt(0);

        if (firstCharacter === 'X' && origCellValue.charAt(1) === 'S') return 'in submission';
        if (firstCharacter === 'X') return 'planned';
        if (firstCharacter === 'S') return 'submitted';
        return 'none';
    },

    matrixCellStyle : function(data, maxValue = 10) {
        var numVal = (data && data.numericValue) || data;
        return {
            backgroundColor: 'rgba(65, 65, 138, '+ numVal/maxValue + ')',
            border: numVal >= 1 ? 'none' : '1px dotted #eee'
        };
    },

    // TODO: Use Bootstrap Popovers instead.
    generateCellTooltipContent : function(origCellValue, yAxisLabels, xAxisLabels, rowIndex, columnIndex, options){
        var extraStringShown = origCellValue;
        var optionalTitle = null;

        var cellType = CSVParsingUtilities.determineCellType(extraStringShown);
        if (cellType === 'planned'){
            extraStringShown = extraStringShown.slice(1).trim();
            optionalTitle = "Planned";
        } else if (cellType === 'submitted'){
            extraStringShown = extraStringShown.slice(1).trim();
            optionalTitle = "Submitted";
        } else if (cellType === 'in submission'){
            extraStringShown = extraStringShown.slice(2).trim();
            optionalTitle = "In Submission";
        } else if (cellType === 'none'){
            optionalTitle = "Not Yet Planned";
        }

        var plannedEstimate;
        if (extraStringShown){
            plannedEstimate = extraStringShown.match(/(Est: .+;)/g); // Grab substring that fits "Est: ...;"
            if (plannedEstimate){
                plannedEstimate = plannedEstimate[0];
                plannedEstimate = plannedEstimate.replace('Est:', '').replace(';', '').trim();
                extraStringShown = extraStringShown.replace(/(Est: .+;)/g, '').trim();
            }
        }

        if (extraStringShown.length === 0) extraStringShown = null;

        var tooltipContent = (
            '<div>' +
            (optionalTitle ? '<h4>' + optionalTitle + '</h4>' : '') +
            '<small style="opacity: 0.5">' +(options.yaxisTitle || 'X') +' :</small> ' +
            yAxisLabels[rowIndex].join(' - ') +
            '</div><div><small style="opacity: 0.5">' +
            (options.xaxisTitle || 'Y') + ' :</small> ' + (xAxisLabels[columnIndex]).join(' - ') +
            '</div>' +
            (plannedEstimate ? '<div><hr style="margin: 4px 0; opacity: 0.33;"/><small style="opacity: 0.5">Estimate :</small> ' + plannedEstimate + '</div>' : '' )
        );

        if (extraStringShown){
            tooltipContent += '<hr style="margin: 4px 0; opacity: 0.33;"/><div>' + extraStringShown + '</div>';
        }
        return tooltipContent;
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
            return setOfXLabels.map(function(xLabelPart){
                return xLabelPart.trim();
            });//.join(', ');
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
            return setOfYLabels.map(function(yLabelPart){
                return yLabelPart.trim();
            });//.join(', ');
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



/**
 * Extends MatrixView Component to accept a 'csv' {string} prop which can be parsed into Matrix data.
 * Component which takes in a CSV string as a prop, transforms it into a 2D array, and plots on a matrix.
 * See src/encoded/static/data/static_pages.json to see options which may be configured (pass as 'options' prop).
 * 
 * @export
 * @class CSVMatrixView
 * @extends {MatrixView}
 * @prop {string} csv - String representation of a CSV file.
 * @prop {Object} options - Options for parsing CSV. TODO: typedef
 */
export class CSVMatrixView extends MatrixView {

    static defaultProps = {
        'maxValue' : 4
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        var options = this.props.options || {};

        if (typeof this.props.csv !== 'string') {
            throw new Error("No valid CSV prop defined.");
        }

        var { grid, title, xAxisLabels, yAxisLabels } = CSVParsingUtilities.CSVStringTo2DArraySet(this.props.csv, options);

        return MatrixView.prototype.render.call(this, 
            grid,
            xAxisLabels,
            yAxisLabels,
            options.xaxisTitle || null,
            options.yaxisTitle || null,
            title,
            CSVParsingUtilities.matrixCellStyle,
            this.props.maxValue,
            false
        );

    }

}
