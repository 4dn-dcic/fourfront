'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import Draggable from 'react-draggable';
import { Collapse, Fade } from 'react-bootstrap';
import { getTitleStringFromContext } from './../../item-pages/item';
import { Detail } from './../../item-pages/components';
import { isServerSide, Filters, navigate, object, layout, Schemas, DateUtility } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { ColumnSorterIcon } from './LimitAndPageControls';
import ReactTooltip from 'react-tooltip';


/**
 * Default value rendering function.
 * Uses columnDefinition field (column key) to get nested property value from result and display it.
 * 
 * @param {Object} result - JSON object representing row data.
 * @param {any} columnDefinition - Object with column definition data - field, title, widthMap, render function (self)
 * @param {any} props - Props passed down from SearchResultTable/ResultRowColumnBlock instance
 * @returns {string|null} String value or null. Your function may return a React element, as well.
 */
export function defaultColumnBlockRenderFxn(result, columnDefinition, props, width){
    var value = object.getNestedProperty(result, columnDefinition.field);
    if (!value) value = null;
    if (Array.isArray(value)){
        value = _.uniq(value).map(function(v){ return Schemas.Term.toName(columnDefinition.field, v); }).join(', ');
    } else {
        value = Schemas.Term.toName(columnDefinition.field, value);
    }
    return value;
}

/**
 * Determine the typical column width, given current browser width. Defaults to large width if server-side.
 * 
 * @param {Object}  widthMap        Map of integer sizes to use at 'lg', 'md', or 'sm' sizes.
 * @param {boolean} [mounted=true]  Whether component calling this function is mounted. If false, uses 'lg' to align with server-side render.
 * @returns {string|number} - Width for div column block to be used at current screen/browser size.
 */
export function searchResultTableColumnWidth(widthMap, mounted=true){
    var responsiveGridSize;
    if (!mounted || isServerSide()) responsiveGridSize = 'lg';
    else responsiveGridSize = layout.responsiveGridState();
    
    if (responsiveGridSize === 'xs') return '100%'; // Mobile, stacking
    return widthMap[responsiveGridSize || 'lg'] || 250;
}

export const defaultItemColumns = { // In format as would be returned from back-end.
    'display_title' : "Title",
    'lab.display_title' : "Lab"
};


/**
 * Convert a map of field:title to list of column definitions, setting defaults.
 * 
 * @param {Object.<string>} columns         Map of field names to field/column titles, as returned from back-end.
 * @param {Object[]} constantDefinitions    Preset list of column definitions, each containing at least 'field' and 'title'.
 * @param {Object} defaultWidthMap          Map of responsive grid states (lg, md, sm) to pixel number sizes.
 * @returns {Object[]}                      List of objects containing keys 'title', 'field', 'widthMap', and 'render'.
 */
export function columnsToColumnDefinitions(columns, constantDefinitions, defaultWidthMap){
    let newColDefs = _.pairs(columns).map(function(p){
        return {
            'title' : p[1],
            'field' : p[0]
        };
    }).filter(function(ncd){
        if (_.findWhere(constantDefinitions, { 'field' : ncd.field })) return false;
        return true;
    });

    return constantDefinitions.concat(newColDefs).map(function(cd){
        if (!cd.widthMap && defaultWidthMap)   cd.widthMap = defaultWidthMap;
        if (!cd.render)     cd.render = defaultColumnBlockRenderFxn;
        return cd;
    });

}


class ResultRowColumnBlock extends React.Component {

    /**
     * Ensure we have a valid React element to render.
     * If not, try to detect if Item object, and generate link.
     * Else, let exception bubble up.
     * 
     * @static
     * @param {any} value 
     * 
     * @memberof ResultRowColumnBlock
     */
    static finalizeOutputValue(value){
        if (typeof value !== 'string' && !React.isValidElement(value)){
            if (value && typeof value === 'object'){
                if (typeof value.display_title !== 'undefined'){
                    if (typeof value.link_id !== 'undefined' || typeof value['@id'] !== 'undefined'){
                        return <a href={object.atIdFromObject(value)}>{ value.display_title }</a>;
                    } else {
                        return value.display_title;
                    }
                }
            } else if (!value) { return <span className="text-300">-</span>; }
        }
        return value;
    }

    shouldComponentUpdate(nextProps, nextState){
        if (nextProps.headerColumnWidths[nextProps.columnNumber] !== this.props.headerColumnWidths[this.props.columnNumber]){
            return true;
        }
        if (!_.isEqual(nextProps.result, this.props.result)){
            return true;
        }
        if (!_.isEqual(nextProps.columnDefinition, this.props.columnDefinition)){
            return true;
        }
        if (!_.isEqual(nextProps.schemas, this.props.schemas)){
            return true;
        }
        if (nextProps.detailOpen !== this.props.detailOpen) return true;
        return false;
    }

    render(){
        var { result, columnDefinition, mounted } = this.props;
        var isDesktopClientside = !isServerSide() && layout.responsiveGridState() !== 'xs';
        var blockWidth = (
            (isDesktopClientside && this.props.headerColumnWidths[this.props.columnNumber]) || // See if have a manually set width first (else is 0)
            searchResultTableColumnWidth(columnDefinition.widthMap, mounted)
        );

        var value = ResultRowColumnBlock.finalizeOutputValue(
            columnDefinition.render(result, columnDefinition, _.omit(this.props, 'columnDefinition', 'result'), blockWidth)
        );

        return (
            <div className="search-result-column-block" style={{ width : blockWidth }} data-field={columnDefinition.field}>
                <div className="inner">{ value }</div>
            </div>
        );
    }
}


class DefaultDetailPane extends React.Component {
    render (){
        var { result } = this.props;
        return (
            <div>
                {result.description ?
                        <div className="data-row flexible-description-box result-table-result-heading">
                            {result.description}
                        </div>
                        : null}
                    { <div className="item-page-detail">
                        <h4 className="text-300">Details</h4>
                        <Detail context={result} open={false}/>
                    </div> }
            </div>
        );
    }
}


class ResultDetail extends React.Component{

    static propTypes = {
        'result'    : PropTypes.object.isRequired,
        'open'      : PropTypes.bool.isRequired,
        'detailPane': PropTypes.element.isRequired,
        'rowNumber' : PropTypes.number,
        'toggleDetailOpen' : PropTypes.func.isRequired
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.render = this.render.bind(this);
        this.state = { 'closing' : false };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.open !== this.props.open && !nextProps.open){
            this.setState({ 'closing' : true }, ()=> {
                setTimeout( () => this.setState({ 'closing' : false }), 400 );
            });
        }
    }

    render(){
        var { result, open, detailPane, rowNumber, tableContainerWidth, tableContainerScrollLeft, toggleDetailOpen } = this.props;
        return (
            <Collapse in={open}>
                { open || this.state.closing ?
                <div className="result-table-detail" style={{
                    'width' : tableContainerWidth,
                    'transform' : vizUtil.style.translate3d(tableContainerScrollLeft)
                }}>
                    { React.cloneElement(detailPane, { 'result' : result, 'rowNumber' : rowNumber, 'open' : open }) }
                    { tableContainerScrollLeft && tableContainerScrollLeft > 10 ?
                        <div className="close-button-container text-center" onClick={toggleDetailOpen}>
                            <i className="icon icon-angle-up"/>
                        </div>
                    : null }
                </div>
                : <div/> }
            </Collapse>
        );
    }
}


class ResultRow extends React.Component {

    static fullRowWidth(columnDefinitions, mounted=true, dynamicWidths=null){
        return _.reduce(columnDefinitions, function(fw, colDef, i){
            var w;
            if (typeof colDef === 'number') w = colDef;
            else {
                if (Array.isArray(dynamicWidths) && dynamicWidths[i]) w = dynamicWidths[i];
                else w = searchResultTableColumnWidth(colDef.widthMap, mounted);
            }
            if (typeof w !== 'number') w = 0;
            return fw + w;
        }, 0);
    }

    static propTypes = {
        'result'            : PropTypes.shape({
            '@type'             : PropTypes.arrayOf(PropTypes.string).isRequired,
            '@id'               : PropTypes.string,
            'link_id'           : PropTypes.string,
            'lab'               : PropTypes.object,
            'display_title'     : PropTypes.string.isRequired,
            'status'            : PropTypes.string,
            'date_created'      : PropTypes.string.isRequired
        }).isRequired,
        'rowNumber'         : PropTypes.number.isRequired,
        'mounted'           : PropTypes.bool.isRequired,
        'columnDefinitions'     : PropTypes.arrayOf(PropTypes.shape({
            'title'             : PropTypes.string.isRequired,
            'field'             : PropTypes.string.isRequired,
            'render'            : PropTypes.func.isRequired,
            'widthMap'          : PropTypes.shape({
                'lg'                : PropTypes.number.isRequired,
                'md'                : PropTypes.number.isRequired,
                'sm'                : PropTypes.number.isRequired
            }).isRequired
        })).isRequired,
        'headerColumnWidths' : PropTypes.array,
        'detailPane'        : PropTypes.element.isRequired
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.toggleDetailOpen = _.throttle(this.toggleDetailOpen.bind(this), 250);
        this.render = this.render.bind(this);
        this.state = {
            detailOpen : false
        };
    }

    shouldComponentUpdate(nextProps, nextState){
        if (
            nextState.detailOpen !== this.state.detailOpen ||
            !_.isEqual(nextProps.result, this.props.result) ||
            nextProps.rowNumber !== this.props.rowNumber ||
            nextProps.headerColumnWidths !== this.props.headerColumnWidths ||
            nextProps.schemas !== this.props.schemas ||
            nextProps.columnDefinitions !== this.props.columnDefinitions ||
            nextProps.columnDefinitions.length !== this.props.columnDefinitions.length ||
            nextProps.tableContainerScrollLeft !== this.props.tableContainerScrollLeft ||
            nextProps.tableContainerWidth !== this.props.tableContainerWidth
        ) {
            return true;
        } else {
            return false;
        }
    }

    toggleDetailOpen(){
        this.setState({ 'detailOpen' : !this.state.detailOpen });
    }

    render(){
        var { result, rowNumber, mounted, headerColumnWidths, detailPane, columnDefinitions, schemas, tableContainerWidth, tableContainerScrollLeft } = this.props;
        return (
            <div className={"search-result-row " + (this.state.detailOpen ? 'open' : 'closed')} data-row-number={rowNumber}>
                <div className="columns clearfix">
                { columnDefinitions.map((colDef, i) =>
                    <ResultRowColumnBlock
                        columnNumber={i}
                        rowNumber={rowNumber}
                        key={colDef.field}
                        columnDefinition={colDef}
                        result={result}
                        toggleDetailOpen={this.toggleDetailOpen}
                        detailOpen={this.state.detailOpen}
                        mounted={mounted}
                        headerColumnWidths={headerColumnWidths}
                        schemas={schemas}
                    />
                ) }
                </div>
                <ResultDetail
                    result={result}
                    open={this.state.detailOpen}
                    detailPane={detailPane}
                    rowNumber={rowNumber}
                    tableContainerWidth={tableContainerWidth}
                    tableContainerScrollLeft={tableContainerScrollLeft}
                    toggleDetailOpen={this.toggleDetailOpen}
                />
            </div>
        );
    }
}


class HeadersRow extends React.Component {

    static propTypes = {
        'columnDefinitions' : ResultRow.propTypes.columnDefinitions,
        'mounted' : PropTypes.bool.isRequired
    }

    constructor(props){
        super(props);
        this.throttledSetHeaderWidths = _.debounce(_.throttle(this.setHeaderWidths.bind(this), 1000), 350);
        this.setHeaderWidths = this.setHeaderWidths.bind(this);
        this.onAdjusterDrag = this.onAdjusterDrag.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            widths : props.headerColumnWidths.slice(0)
        };
    }

    setHeaderWidths(idx, evt, r){
        if (typeof this.props.setHeaderWidths !== 'function') throw new Error('props.setHeaderWidths not a function');
        setTimeout(()=> this.props.setHeaderWidths(this.state.widths.slice(0)), 0);
    }

    getWidthFor(idx){
        return (
            this.state.widths[idx] ||
            this.props.headerColumnWidths[idx] ||
            searchResultTableColumnWidth(this.props.columnDefinitions[idx].widthMap, this.props.mounted)
        );
    }

    onAdjusterDrag(idx, evt, r){
        var widths = this.state.widths.slice(0);
        widths[idx] = Math.max(this.props.columnDefinitions[idx].minColumnWidth || 30, r.x );
        this.setState({ 'widths' : widths }/*, this.throttledSetHeaderWidths*/);
    }

    render(){
        return (
            <div className="search-headers-row hidden-xs">
                <div className="columns clearfix">
                {
                    this.props.columnDefinitions.map((colDef, i)=>{
                        var w = this.getWidthFor(i);
                        var sorterIcon;
                        if (typeof this.props.sortBy === 'function' && w >= 50){
                            var { sortColumn, sortBy, sortReverse } = this.props;
                            sorterIcon = (
                                <ColumnSorterIcon sortByFxn={sortBy} currentSortColumn={sortColumn} descend={sortReverse} value={colDef.field} />
                            );
                        }
                        return (
                            <div
                                data-field={colDef.field}
                                key={colDef.field}
                                className="search-headers-column-block"
                                style={{ width : w }}
                            >
                                <div className="inner">
                                    { colDef.title }
                                    { sorterIcon }
                                </div>
                                <Draggable position={{x:w,y:0}} axis="x" onDrag={this.onAdjusterDrag.bind(this, i)} onStop={this.setHeaderWidths.bind(this, i)}>
                                    <div className="width-adjuster"/>
                                </Draggable>
                            </div>
                        );
                    })
                }
                </div>
            </div>
        );
    }
}

class DimensioningContainer extends React.Component {

    static resetHeaderColumnWidths(length){
        return [].fill(0, 0, length);
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.onScroll = _.debounce(_.throttle(this.onScroll.bind(this), 250), 50);
        this.setHeaderWidths = _.throttle(this.setHeaderWidths.bind(this), 300);
        this.render = this.render.bind(this);
        this.state = {
            'mounted' : false,
            'widths' : DimensioningContainer.resetHeaderColumnWidths(
                props.columnDefinitions.length
            )
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
        if (!isServerSide()){
            if (this.refs.innerContainer){
                this.refs.innerContainer.addEventListener('scroll', this.onScroll);
            }
        }
    }

    componentWillUnmount(){
        if (!isServerSide()){
            this.refs.innerContainer.removeEventListener('scroll', this.onScroll);
        }
    }

    onScroll(e){
        this.forceUpdate();
    }

    setHeaderWidths(widths){
        if (!Array.isArray(widths)) throw new Error('widths is not an array');
        this.setState({ 'widths' : widths });
    }

    render(){
        var { columnDefinitions, results, sortBy, sortColumn, sortReverse, detailPane } = this.props;
        var fullRowWidth = ResultRow.fullRowWidth(columnDefinitions, this.state.mounted, this.state.widths);
        var responsiveGridSize = !isServerSide() && this.state.mounted && layout.responsiveGridState();

        var tableContainerWidth = (this.refs && this.refs.innerContainer && this.refs.innerContainer.offsetWidth) || null;
        var tableContainerScrollLeft = (this.refs && this.refs.innerContainer && typeof this.refs.innerContainer.scrollLeft === 'number') ? this.refs.innerContainer.scrollLeft : null;

        if (!isServerSide()) window.EG = this.refs.innerContainer;

        return (
            <div className="search-results-container">
                <div className="inner-container" ref="innerContainer">
                    <div className="scrollable-container" style={{ minWidth : fullRowWidth + 6 }}>
                        { !responsiveGridSize || responsiveGridSize !== 'xs' ? 
                        <HeadersRow
                            columnDefinitions={columnDefinitions}
                            mounted={this.state.mounted}
                            headerColumnWidths={this.state.widths}
                            setHeaderWidths={this.setHeaderWidths}
                            sortBy={sortBy}
                            sortColumn={sortColumn}
                            sortReverse={sortReverse}
                        />
                        : null }
                        { results.map((r, rowNumber)=>
                            <ResultRow
                                result={r}
                                rowNumber={rowNumber}
                                key={r['@id'] || r.link_id || rowNumber}
                                columnDefinitions={columnDefinitions}
                                rowWidth={fullRowWidth}
                                mounted={this.state.mounted}
                                headerColumnWidths={this.state.widths}
                                schemas={Schemas.get()}
                                detailPane={detailPane}

                                tableContainerWidth={tableContainerWidth}
                                tableContainerScrollLeft={tableContainerScrollLeft}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

}

/**
 * Reusable table for displaying search results according to column definitions.
 * 
 * @export
 * @class SearchResultTable
 * @prop {Object[]}         results             Results as returned from back-end, e.g. props.context['@graph'].
 * @prop {Object.<string>}  columns             Object containing field 'key' as key and field 'title' as value.
 * @prop {Object[]}         [constantColumnDefinitions]  - Definitions for constant non-changing columns, such as title.
 * @prop {Object}           [defaultWidthMap]   Default column widths per responsive grid state. Applied to all non-constant columns.
 * @prop {string[]}         [hiddenColumns]     Keys of columns to remove from final columnDefinitions before rendering. Useful for hiding constantColumnDefinitions in response to some state.
 * @prop {React.Element}    [detailPane]        An instance of a React component which will receive prop 'result'.
 * 
 * @prop {string}           sortColumn          Current sort column, as fed by PageLimitSortController.
 * @prop {boolean}          sortReverse         Whether current sort column is reversed, as fed by PageLimitSortController.
 * @prop {function}         sortBy              Callback function for performing a sort, acceping 'sortColumn' and 'sortReverse' as params. As fed by PageLimitSortController.
 */
export class SearchResultTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(ResultRow.propTypes.result).isRequired,
        'columns' : PropTypes.object,
        'constantColumnDefinitions' : ResultRow.propTypes.columnDefinitions,
        'defaultWidthMap' : PropTypes.shape({ 'lg' : PropTypes.number.isRequired, 'md' : PropTypes.number.isRequired, 'sm' : PropTypes.number.isRequired }).isRequired,
        'hiddenColumns' : PropTypes.arrayOf(PropTypes.string),
        'detailPane' : PropTypes.element,
        'selectCallback' : PropTypes.func
    }

    static defaultProps = {
        'columns' : {},
        'detailPane' : <DefaultDetailPane/>,
        'defaultWidthMap' : { 'lg' : 180, 'md' : 160, 'sm' : 120 },
        'constantColumnDefinitions' : [
            {
                'title' : 'Title',
                'field' : 'display_title',
                'widthMap' : {'lg' : 250, 'md' : 200, 'sm' : 180},
                'minColumnWidth' : 90,
                'render' : function(result, columnDefinition, props, width){
                    var title = getTitleStringFromContext(result);
                    var link = object.atIdFromObject(result);
                    var tooltip;
                    if (title && (title.length > 20 || width < 100)) tooltip = title;
                    if (link){
                        title = <a href={link || '#'}>{ title }</a>;
                    }
                    
                    return (
                        <span>
                            <div className="inline-block toggle-detail-button-container">
                                <button className="toggle-detail-button" onClick={props.toggleDetailOpen}>
                                    <i className={"icon icon-fw icon-" + (props.detailOpen ? 'minus' : 'plus') }/>
                                </button>
                            </div>
                            <div className="title-block text-ellipsis-container" data-tip={tooltip}>{ title }</div>
                        </span>
                    );
                }
            },
            {
                'title' : 'Type',
                'field' : '@type',
                'render' : function(result, columnDefinition, props, width){
                    if (!Array.isArray(result['@type'])) return null;
                    return Schemas.getItemTypeTitle(result);
                }
            },
            {
                'title' : 'Lab',
                'field' : 'lab',
                'render' : function(result, columnDefinition, props, width){
                    var labItem = defaultColumnBlockRenderFxn(result, columnDefinition, props, width);
                    if (!labItem) return null;
                    var labLink = <a href={object.atIdFromObject(labItem)}>{ labItem.display_title }</a>;

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
            {
                'title' : 'Created',
                'field' : 'date_created',
                'widthMap' : {'lg' : 120, 'md' : 120, 'sm' : 120},
                'render' : function(result, columnDefinition, props, width){
                    var dateCreated = defaultColumnBlockRenderFxn(result, columnDefinition, props, width);
                    return (
                        <DateUtility.LocalizedTime timestamp={dateCreated} formatType='date-sm' />
                    );
                }
            }
        ]
    }

    render(){
        var { columns, constantColumnDefinitions, defaultWidthMap, hiddenColumns } = this.props;
        var columnDefinitions = columnsToColumnDefinitions(columns, constantColumnDefinitions, defaultWidthMap);
        if (Array.isArray(hiddenColumns)){ // Remove hidden columns, if any defined
            columnDefinitions = columnDefinitions.filter(function(colDef){
                if (hiddenColumns.indexOf(colDef.field) > -1) return false;
                return true;
            });
        }
        return (
            <layout.WindowResizeUpdateTrigger>
                <DimensioningContainer {...this.props} columnDefinitions={columnDefinitions}/>
            </layout.WindowResizeUpdateTrigger>
        );
    }
}
