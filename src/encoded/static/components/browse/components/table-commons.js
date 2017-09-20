'use strict';

/* @flow */

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import queryString from 'querystring';
import { Collapse, Fade } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import Draggable from 'react-draggable';
import { Sticky, StickyContainer } from 'react-sticky';
import { getTitleStringFromContext } from './../../item-pages/item';
import { Detail } from './../../item-pages/components';
import { isServerSide, Filters, navigate, object, layout, Schemas, DateUtility, ajax } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { ColumnSorterIcon } from './LimitAndPageControls';


export const DEFAULT_WIDTH_MAP = { 'lg' : 200, 'md' : 180, 'sm' : 120 };

/**
 * Default value rendering function.
 * Uses columnDefinition field (column key) to get nested property value from result and display it.
 *
 * @param {Object} result - JSON object representing row data.
 * @param {any} columnDefinition - Object with column definition data - field, title, widthMap, render function (self)
 * @param {any} props - Props passed down from SearchResultTable/ResultRowColumnBlock instance
 * @returns {string|null} String value or null. Your function may return a React element, as well.
 */
export function defaultColumnBlockRenderFxn(result: Object, columnDefinition: Object, props: Object, width: number){
    var value = object.getNestedProperty(result, columnDefinition.field);
    if (!value) value = null;
    if (Array.isArray(value)){ // getNestedProperty may return a multidimensional array, # of dimennsions depending on how many child arrays were encountered in original result obj.
        value = _.uniq(value.map(function(v){
            if (Array.isArray(v)){
                v = _.uniq(v);
                if (v.length === 1) v = v[0];
            }
            return Schemas.Term.toName(columnDefinition.field, v);
        })).join(', ');
    } else {
        value = Schemas.Term.toName(columnDefinition.field, value);
    }
    return value;
}



/**
 * Ensure we have a valid React element to render.
 * If not, try to detect if Item object, and generate link.
 * Else, let exception bubble up.
 *
 * @static
 * @param {any} value
 */
export function sanitizeOutputValue(value){
    if (typeof value !== 'string' && !React.isValidElement(value)){
        if (value && typeof value === 'object'){
            if (typeof value.display_title !== 'undefined'){
                if (typeof value.link_id !== 'undefined' || typeof value['@id'] !== 'undefined'){
                    return <a href={object.atIdFromObject(value)}>{ value.display_title }</a>;
                } else {
                    return value.display_title;
                }
            }
        } else if (!value) value = null;
    }
    if (value === "None") value = null;
    return value;
}



export function extendColumnDefinitions(columnDefinitions: Array<Object>, columnDefinitionOverrideMap: Object){
    if (_.keys(columnDefinitionOverrideMap).length > 0){
        return columnDefinitions.map(function(colDef){
            if (columnDefinitionOverrideMap[colDef.field]){
                return _.extend({}, colDef, columnDefinitionOverrideMap[colDef.field]);
            } else return colDef;
        });
    }
    return columnDefinitions;
}


export class TableRowToggleOpenButton extends React.Component {
    render(){
        return (
            <div className="inline-block toggle-detail-button-container">
                <button className="toggle-detail-button" onClick={this.props.onClick || this.props.toggleDetailOpen}>
                    <div className="icon-container">
                        <i className={"icon icon-fw icon-" + (this.props.open ? 'minus' : 'plus') }/>
                    </div>
                </button>
            </div>
        );
    }
}



export const defaultColumnDefinitionMap = {
    'display_title' : {
        'title' : "Title",
        'widthMap' : {'lg' : 280, 'md' : 250, 'sm' : 200},
        'minColumnWidth' : 90,
        'render' : function(result: Object, columnDefinition: Object, props: Object, width: number, popLink = false){
            var title = getTitleStringFromContext(result);
            var link = object.atIdFromObject(result);
            var tooltip;
            if (title && (title.length > 20 || width < 100)) tooltip = title;
            if (link){
                if (popLink){
                    title = <a href={link || '#'} target="_blank">{ title }</a>;
                }else{
                    title = <a href={link || '#'}>{ title }</a>;
                }
            }

            return (
                <span>
                    <TableRowToggleOpenButton open={props.detailOpen} onClick={props.toggleDetailOpen} />
                    <div className="title-block text-ellipsis-container" data-tip={tooltip}>{ title }</div>
                </span>
            );
        }
    },
    '@type' : {
        'title' : "Type",
        'render' : function(result, columnDefinition, props, width){
            if (!Array.isArray(result['@type'])) return null;
            return Schemas.getBaseItemTypeTitle(result);
        }
    },
    'lab.display_title' : {
        'title' : "Lab",
        'widthMap' : {'lg' : 220, 'md' : 200, 'sm' : 180},
        'render' : function(result, columnDefinition, props, width, popLink = false){
            var labItem = result.lab;
            if (!labItem) return null;
            var labLink;
            if (popLink){
                labLink = <a href={object.atIdFromObject(labItem)} target='_blank'>{ labItem.display_title }</a>;
            }else{
                labLink = <a href={object.atIdFromObject(labItem)}>{ labItem.display_title }</a>;
            }

            if (!result.submitted_by || !result.submitted_by.display_title){
                return labLink;
            }
            return (
                <span>
                    <i
                        className="icon icon-fw icon-user-o user-icon"
                        data-tip={'<small>Submitted by</small> ' + result.submitted_by.display_title}
                        data-html
                    />
                    { labLink }
                </span>
            );
        }
    },
    'date_created' : {
        'title' : 'Created',
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function(result, columnDefinition, props, width){
            return <DateUtility.LocalizedTime timestamp={defaultColumnBlockRenderFxn(result, columnDefinition, props, width)} formatType='date-sm' />;
        }
    },
    'number_of_experiments' : {
        'title' : '# of Experiments',
        'widthMap' : {'lg' : 68, 'md' : 68, 'sm' : 50},
        //'render' : function(result, columnDefinition, props, width){
        //    if (!Array.isArray(result.experiments_in_set)) return null;
        //    return result.experiments_in_set.length;
        //}
    },
    'number_of_files' : {
        'title' : '# of Files',
        'widthMap' : {'lg' : 60, 'md' : 50, 'sm' : 50},
        'noSort' : true

    },
    'experiments_in_set.experiment_type' : {
        'title' : 'Experiment Type',
        'widthMap' : {'lg' : 140, 'md' : 140, 'sm' : 120}
    },
    'status' : {
        'title' : 'Status',
        'widthMap' : {'lg' : 140, 'md' : 140, 'sm' : 120},
        'order' : 500
    }
};


/**
 * Convert a map of field:title to list of column definitions, setting defaults.
 *
 * @param {Object.<string>} columns         Map of field names to field/column titles, as returned from back-end.
 * @param {Object[]} constantDefinitions    Preset list of column definitions, each containing at least 'field' and 'title'.
 * @param {Object} defaultWidthMap          Map of responsive grid states (lg, md, sm) to pixel number sizes.
 * @returns {Object[]}                      List of objects containing keys 'title', 'field', 'widthMap', and 'render'.
 */
export function columnsToColumnDefinitions(columns, constantDefinitions, defaultWidthMap = DEFAULT_WIDTH_MAP){
    let newColDefs = _.pairs(columns).map(function(p){
        return {
            'title' : p[1],
            'field' : p[0]
        };
    }).filter(function(ncd){
        if (_.findWhere(constantDefinitions, { 'field' : ncd.field })) return false;
        return true;
    });

    // Add defaults for any missing properties for all columnDefinitions. Sort by order field.
    return _.sortBy(constantDefinitions.concat(newColDefs).map(function(cd, cdIndex){
        if (!cd.widthMap && defaultWidthMap)    cd.widthMap = defaultWidthMap;
        if (!cd.render)                         cd.render   = defaultColumnBlockRenderFxn;
        if (typeof cd.order !== 'number')       cd.order    = cdIndex;
        return cd;
    }), 'order');

}

export function columnDefinitionsToScaledColumnDefinitions(columnDefinitions){
    return _.map(columnDefinitions, function(colDef){
        var colDef2 = _.clone(colDef);
        colDef2.baseWidth = colDef.widthMap.sm || colDef.widthMap.md || colDef.widthMap.lg || 100;
        if (typeof colDef.render !== 'function'){
            colDef2.render = defaultColumnBlockRenderFxn;
        }
        return colDef2;
    });
}


/**
 * Determine the typical column width, given current browser width. Defaults to large width if server-side.
 *
 * @param {Object} columnDefinition - JSON of column definition, should have widthMap or width or baseWidth.
 * @param {Object} columnDefinition.widthMap - Map of integer sizes to use at 'lg', 'md', or 'sm' sizes.
 * @param {boolean} [mounted=true]  - Whether component calling this function is mounted. If false, uses 'lg' to align with server-side render.
 * @returns {string|number}         - Width for div column block to be used at current screen/browser size.
 */
export function getColumnWidthFromDefinition(columnDefinition, mounted=true){

    var w = columnDefinition.width || columnDefinition.baseWidth || null;
    if (typeof w === 'number'){
        return w;
    }
    var widthMap = columnDefinition.widthMap || null;
    if (widthMap){
        var responsiveGridSize;
        if (!mounted || isServerSide()) responsiveGridSize = 'lg';
        else responsiveGridSize = layout.responsiveGridState();
        if (responsiveGridSize === 'xs') responsiveGridSize = 'sm';
        return widthMap[responsiveGridSize || 'lg'];
    }
    return 250; // Fallback.
}


export class ResultRowColumnBlockValue extends React.Component {

    static defaultProps = {
        'mounted' : false,
        'toggleDetailOpen' : function(evt){ console.warn('Triggered props.toggleDetailOpen() but no toggleDetailOpen prop passed to ResultRowColumnValue Component.'); },
        'shouldComponentUpdateExt' : null
    }

    shouldComponentUpdate(nextProps, nextState){
        if (
            nextProps.columnNumber === 0 ||
            nextProps.columnDefinition.field !== this.props.columnDefinition.field ||
            nextProps.schemas !== this.props.schemas ||
            object.atIdFromObject(nextProps.result) !== object.atIdFromObject(this.props.result) ||
            nextProps.className !== this.props.className ||
            (typeof nextProps.shouldComponentUpdateExt === 'function' && nextProps.shouldComponentUpdateExt(nextProps, nextState, this.props, this.state))
        ){
            return true;
        }
        return false;
    }

    render(){
        var { result, columnDefinition, mounted } = this.props;
        var renderFxn = columnDefinition.render || defaultColumnBlockRenderFxn;
        var value = sanitizeOutputValue(
            renderFxn(result, columnDefinition, _.omit(this.props, 'columnDefinition', 'result'))
        );

        var tooltip;
        if (typeof value === 'string') {
            if (this.props.tooltip === true && value.length > 25) tooltip = value;
            value = <span className="value">{ value }</span>;
        } else if (value === null){
            value = <small className="text-300">-</small>;
        }

        var className = "inner";
        if (typeof this.props.className === 'string'){
            className += ' ' + this.props.className;
        }
        return (
            <div className={className} data-tip={tooltip}>{ value }</div>
        );
    }
}



export class HeadersRow extends React.Component {

    static propTypes = {
        'columnDefinitions' : PropTypes.array.isRequired,//ResultRow.propTypes.columnDefinitions,
        'mounted' : PropTypes.bool.isRequired
    }

    constructor(props){
        super(props);
        this.throttledSetHeaderWidths = _.debounce(_.throttle(this.setHeaderWidths.bind(this), 1000), 350);
        this.setHeaderWidths = this.setHeaderWidths.bind(this);
        this.onAdjusterDrag = this.onAdjusterDrag.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            widths : (props.headerColumnWidths && props.headerColumnWidths.slice(0)) || null
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.headerColumnWidths !== this.props.headerColumnWidths){
            this.setState({ 'widths' : nextProps.headerColumnWidths });
        }
    }

    setHeaderWidths(idx, evt, r){
        if (typeof this.props.setHeaderWidths !== 'function') throw new Error('props.setHeaderWidths not a function');
        setTimeout(()=> this.props.setHeaderWidths(this.state.widths.slice(0)), 0);
    }

    getWidthFor(idx){
        return (
            (Array.isArray(this.state.widths) && this.state.widths[idx]) ||
            (Array.isArray(this.props.headerColumnWidths) && this.props.headerColumnWidths[idx]) ||
            getColumnWidthFromDefinition(this.props.columnDefinitions[idx], this.props.mounted)
        );
    }

    onAdjusterDrag(idx, evt, r){
        var widths = this.state.widths.slice(0);
        widths[idx] = Math.max(this.props.columnDefinitions[idx].minColumnWidth || this.props.defaultMinColumnWidth || 55, r.x );
        this.setState({ 'widths' : widths });
    }

    render(){
        var { isSticky, stickyStyle, tableLeftOffset, tableContainerWidth, columnDefinitions, stickyHeaderTopOffset, renderDetailPane } = this.props;
        var isAdjustable = this.props.headerColumnWidths && this.state.widths;
        return (
            <div className={"search-headers-row" + (isAdjustable ? '' : ' non-adjustable') + (isSticky ? ' stickied' : '') + (typeof renderDetailPane !== 'function' ? ' no-detail-pane' : '')} style={
                isSticky ? _.extend({}, stickyStyle, { 'top' : -stickyHeaderTopOffset, 'left' : tableLeftOffset, 'width' : tableContainerWidth })
                : null}
            >
                <div className="columns clearfix" style={{
                    'left'  : isSticky ? (stickyStyle.left || 0) - (tableLeftOffset || 0) : null,
                    'width' : (stickyStyle && stickyStyle.width) || null
                }}>
                {
                    columnDefinitions.map((colDef, i)=>{
                        var w = this.getWidthFor(i);
                        var sorterIcon;
                        if (!colDef.noSort && typeof this.props.sortBy === 'function' && w >= 50){
                            var { sortColumn, sortBy, sortReverse } = this.props;
                            sorterIcon = <ColumnSorterIcon sortByFxn={sortBy} currentSortColumn={sortColumn} descend={sortReverse} value={colDef.field} />;
                        }
                        return (
                            <div
                                data-field={colDef.field}
                                key={colDef.field}
                                className={"search-headers-column-block" + (colDef.noSort ? " no-sort" : '')}
                                style={{ width : w }}
                            >
                                <div className="inner">
                                    <span className="column-title">{ colDef.title }</span>
                                    { sorterIcon }
                                </div>
                                { Array.isArray(this.props.headerColumnWidths) ?
                                <Draggable position={{x:w,y:0}} axis="x" onDrag={this.onAdjusterDrag.bind(this, i)} onStop={this.setHeaderWidths.bind(this, i)}>
                                    <div className="width-adjuster"/>
                                </Draggable>
                                : null }
                            </div>
                        );
                    })
                }
                </div>
            </div>
        );
    }
}
