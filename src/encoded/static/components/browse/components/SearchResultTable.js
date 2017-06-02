'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { isServerSide, Filters, navigate, object, layout, Schemas } from './../../util';

/** Defaults used for columnDefinitions for columns which are returned from back-end */
export const defaultSearchResultTableColumnWidthMap = {'lg' : 250, 'md' : 200, 'sm' : 180};
export function defaultColumnBlockRenderFxn(result, columnDefinition){
    return <DefaultColumnValue result={result} columnDefinition={columnDefinition} />;
}

/**
 * Determine the typical column width, given current browser width. Defaults to large width if server-side.
 * @param {Object} [widthMap] - Map of integer sizes to use at 'lg', 'md', or 'sm' sizes.
 * @returns {string|number} - Width for div column block to be used at current screen/browser size.
 */
export function searchResultTableColumnWidth(widthMap = defaultSearchResultTableColumnWidthMap){
    var responsiveGridSize;
    if (isServerSide()) responsiveGridSize = 'lg';
    else responsiveGridSize = layout.responsiveGridState();
    
    if (responsiveGridSize === 'xs') return '100%'; // Mobile, stacking
    return widthMap[responsiveGridSize || 'lg'] || 250;
}

export const defaultItemColumns = { // In format as would be returned from back-end.
    'type'          : "Type",
    'display_title' : "Title",
    'lab.display_title' : "Lab"
};

/** List of non-changing column definitions to always be present. */
export const constantSearchResultColumns = [
    {
        'title' : 'Type',
        'field' : 'type',
        'widthMap' : {'lg' : 180, 'md' : 150, 'sm' : 100},
        'render' : function(result, columnDefinition){
            if (!Array.isArray(result['@type'])) return <em>N/A</em>;
            return Schemas.getItemTypeTitle(result);
        }
    },
    {
        'title' : 'Title',
        'field' : 'display_title',
        'widthMap' : {'lg' : 300, 'md' : 240, 'sm' : 200}
    }
];

/**
 * Convert a map of field:title to list of column definitions, setting defaults.
 * 
 * @param {Object.<string>} [columns={}] Map of field names to field/column titles, as returned from back-end.
 * @returns {Object[]} List of objects containing keys 'title', 'field', 'widthMap', and 'render'.
 */
export function columnsToColumnDefinitions(columns = {}){
    let newColDefs = _.pairs(columns).map(function(p){
        return {
            'title' : p[1],
            'field' : p[0]
        };
    }).filter(function(ncd){
        if (_.findWhere(constantSearchResultColumns, { 'field' : ncd.field })) return false;
        return true;
    });

    return constantSearchResultColumns.concat(newColDefs).map(function(cd){
        if (!cd.widthMap) cd.widthMap = defaultSearchResultTableColumnWidthMap;
        if (!cd.render) cd.render = defaultColumnBlockRenderFxn;
        return cd;
    });

}


class DefaultColumnValue extends React.Component {
    render(){
        var result = this.props.result;
        var colDef = this.props.columnDefinition;
        var value = object.getNestedProperty(result, colDef.field);
        if (!value) value = <em>N/A</em>;
        console.log(value);
        return <span>{ value }</span>;
    }
}


class ResultRowColumnBlock extends React.Component {
    render(){
        var result = this.props.result;
        var colDef = this.props.columnDefinition;
        var blockWidth = searchResultTableColumnWidth(colDef.widthMap || defaultSearchResultTableColumnWidthMap);
        return (
            <div className="search-result-column-block" style={{ width : blockWidth }}>
                { colDef.render(result, colDef) }
            </div>
        );
    }
}


class ResultRow extends React.Component {

    static fullRowWidth(columnDefinitions){
        return _.reduce(columnDefinitions, function(fw, colDef){
            return fw + searchResultTableColumnWidth(colDef.widthMap);
        }, 0);
    }

    static propTypes = {
        'result' : PropTypes.shape({
            '@type'         : PropTypes.arrayOf(PropTypes.string).isRequired,
            '@id'           : PropTypes.string,
            'link_id'       : PropTypes.string,
            'lab'           : PropTypes.object,
            'display_title' : PropTypes.string.isRequired,
            'status'        : PropTypes.string,
            'date_created' : PropTypes.string.isRequired
        }).isRequired,
        'rowNumber' : PropTypes.number.isRequired,
        'columnDefinitions' : PropTypes.array
    }

    render(){
        return (
            <div className="search-result-row">
                <div className="columns clearfix">
                { this.props.columnDefinitions.map((colDef, i) =>
                    <ResultRowColumnBlock
                        columnNumber={i}
                        rowNumber={this.props.rowNumber}
                        key={colDef.field}
                        columnDefinition={colDef}
                        result={this.props.result}
                    />
                ) }
                </div>
            </div>
        );
    }
}


export class SearchResultTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(ResultRow.propTypes.result).isRequired,
        'columns' : PropTypes.object
    }

    static defaultProps = {
        'columns' : {}
    }

    render(){
        var columnDefinitions = columnsToColumnDefinitions(defaultItemColumns);
        var fullRowWidth = ResultRow.fullRowWidth(columnDefinitions);
        return (
            <div className="search-results-container">
                <div className="inner-container">
                    <div className="scrollable-container" style={{ width : fullRowWidth }}>
                    { this.props.results.map((r, rowNumber)=>
                        <ResultRow
                            result={r}
                            rowNumber={rowNumber}
                            key={r['@id'] || r.link_id || rowNumber}
                            columnDefinitions={columnDefinitions}
                            rowWidth={fullRowWidth}
                        />
                    )}
                    </div>
                </div>
            </div>
        );
    }


}
