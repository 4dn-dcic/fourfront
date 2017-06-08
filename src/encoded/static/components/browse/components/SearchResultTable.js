'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import Draggable from 'react-draggable';
import queryString from 'querystring';
import { Collapse, Fade } from 'react-bootstrap';
import { getTitleStringFromContext } from './../../item-pages/item';
import { Detail } from './../../item-pages/components';
import { isServerSide, Filters, navigate, object, layout, Schemas, DateUtility, ajax } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { ColumnSorterIcon } from './LimitAndPageControls';
import ReactTooltip from 'react-tooltip';
import Infinite from 'react-infinite';


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


function extendColumnDefinitions(columnDefinitions, columnDefinitionOverrideMap){
    if (_.keys(columnDefinitionOverrideMap).length > 0){
        return columnDefinitions.map(function(colDef){
            if (columnDefinitionOverrideMap[colDef.field]){
                return _.extend({}, colDef, columnDefinitionOverrideMap[colDef.field]);
            } else return colDef;
        });
    }
    return columnDefinitions;
}

export const defaultColumnDefinitionMap = {
    'display_title' : {
        'title' : "Title",
        'widthMap' : {'lg' : 275, 'md' : 200, 'sm' : 180},
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
    '@type' : {
        'title' : "Type",
        'render' : function(result, columnDefinition, props, width){
            if (!Array.isArray(result['@type'])) return null;
            return Schemas.getBaseItemTypeTitle(result);
        }
    },
    'lab.display_title' : {
        'title' : "Lab",
        'render' : function(result, columnDefinition, props, width){
            var labItem = result.lab;
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
    'date_created' : {
        'title' : 'Created',
        'widthMap' : {'lg' : 150, 'md' : 120, 'sm' : 120},
        'render' : function(result, columnDefinition, props, width){
            return <DateUtility.LocalizedTime timestamp={defaultColumnBlockRenderFxn(result, columnDefinition, props, width)} formatType='date-sm' />;
        }
    }
};


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

    // Add defaults for any missing properties for all columnDefinitions. Sort by order field.
    return _.sortBy(constantDefinitions.concat(newColDefs).map(function(cd, cdIndex){
        if (!cd.widthMap && defaultWidthMap)    cd.widthMap = defaultWidthMap;
        if (!cd.render)                         cd.render   = defaultColumnBlockRenderFxn;
        if (typeof cd.order !== 'number')       cd.order    = cdIndex;
        return cd;
    }), 'order');

}

export function compareResultsByID(listA, listB){
    var listALen = listA.length;
    if (listALen !== listB.length) return false;
    for (let i = 0; i < listALen; i++){
        if (object.atIdFromObject(listA[i]) !== object.atIdFromObject(listB[i])) return false;
    }
    return true;
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
    static sanitizeOutputValue(value){
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
        var isDesktopClientside = SearchResultTable.isDesktopClientside();
        var blockWidth = (
            (isDesktopClientside && this.props.headerColumnWidths[this.props.columnNumber]) || // See if have a manually set width first (else is 0)
            searchResultTableColumnWidth(columnDefinition.widthMap, mounted)
        );

        var value = ResultRowColumnBlock.sanitizeOutputValue(
            columnDefinition.render(result, columnDefinition, _.omit(this.props, 'columnDefinition', 'result'), blockWidth)
        );

        var blockClassName = "search-result-column-block" + (!value ? ' no-value' : '');
        if (typeof value === 'string') value = <span className="value">{ value }</span>;
        else if   (value === null)     value = <small className="text-300">-</small>;

        return (
            <div className={blockClassName} style={{ width : blockWidth }} data-field={columnDefinition.field}>
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

class ResultDetailInner extends React.Component {

    shouldComponentUpdate(nextProps){
        if (nextProps.rowNumber !== this.props.rowNumber) return true;
        if (!_.isEqual(nextProps.result, this.props.result)) return true;
        return false;
    }

    render(){
        return React.cloneElement(this.props.detailPane, {
            'result'    : this.props.result,
            'rowNumber' : this.props.rowNumber
        });
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
        if (nextProps.open !== this.props.open){
            if (!nextProps.open){
                this.setState({ 'closing' : true }, ()=> {
                    setTimeout( () => this.setState({ 'closing' : false }), 400 );
                });
            }
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (pastProps.open !== this.props.open){
            if (this.props.open && typeof this.props.setDetailHeight === 'function'){
                setTimeout(()=>{
                    var detailHeight = parseInt(this.refs.detail.style.height) + 10;
                    if (isNaN(detailHeight)) detailHeight = 0;
                    this.props.setDetailHeight(detailHeight);
                }, 0);
            }
        }
    }

    render(){
        return (
            <div className={"result-table-detail-container" + (this.props.open || this.state.closing ? ' open' : ' closed')}>
            <Collapse in={this.props.open}>
                { this.props.open || this.state.closing ?
                
                    <div className="result-table-detail" ref="detail" style={{
                        'width' : this.props.tableContainerWidth,
                        'transform' : vizUtil.style.translate3d(this.props.tableContainerScrollLeft)
                    }}>
                        <ResultDetailInner result={this.props.result} rowNumber={this.props.rowNumber} detailPane={this.props.detailPane}/>
                        { this.props.tableContainerScrollLeft && this.props.tableContainerScrollLeft > 10 ?
                            <div className="close-button-container text-center" onClick={this.props.toggleDetailOpen}>
                                <i className="icon icon-angle-up"/>
                            </div>
                        : null }
                    </div>
                : <div/> }
            </Collapse>
            </div>
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
        this.isOpen = this.isOpen.bind(this);
        this.render = this.render.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState){
        if (
            this.isOpen(nextProps) !== this.isOpen(this.props) ||
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
        this.props.toggleDetailPaneOpen(this.props['data-key']);
    }

    isOpen(props = this.props){
        return props.openDetailPanes[props['data-key']] || false;
    }

    render(){
        var { result, rowNumber, mounted, headerColumnWidths, detailPane, columnDefinitions, schemas,
              tableContainerWidth, tableContainerScrollLeft, openDetailPanes, setDetailHeight, href } = this.props;
        var detailOpen = this.isOpen();
        return (
            <div className={"search-result-row " + (detailOpen ? 'open' : 'closed')} data-row-number={rowNumber}>
                <div className="columns clearfix">
                { columnDefinitions.map((colDef, i) =>
                    <ResultRowColumnBlock
                        columnNumber={i}
                        rowNumber={rowNumber}
                        key={colDef.field}
                        columnDefinition={colDef}
                        result={result}
                        toggleDetailOpen={this.toggleDetailOpen}
                        detailOpen={detailOpen}
                        mounted={mounted}
                        headerColumnWidths={headerColumnWidths}
                        schemas={schemas}
                        href={href}
                    />
                ) }
                </div>
                <ResultDetail
                    result={result}
                    open={!!(detailOpen)}
                    detailPane={detailPane}
                    rowNumber={rowNumber}
                    tableContainerWidth={tableContainerWidth}
                    tableContainerScrollLeft={tableContainerScrollLeft}
                    toggleDetailOpen={this.toggleDetailOpen}
                    setDetailHeight={setDetailHeight.bind(setDetailHeight, this.props['data-key'])}
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
            this.state.widths[idx] ||
            this.props.headerColumnWidths[idx] ||
            searchResultTableColumnWidth(this.props.columnDefinitions[idx].widthMap, this.props.mounted)
        );
    }

    onAdjusterDrag(idx, evt, r){
        var widths = this.state.widths.slice(0);
        widths[idx] = Math.max(this.props.columnDefinitions[idx].minColumnWidth || this.props.defaultMinColumnWidth || 55, r.x );
        this.setState({ 'widths' : widths });
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
                            sorterIcon = !colDef.noSort && (
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

class LoadMoreAsYouScroll extends React.Component {

    static propTypes = {
        'href' : PropTypes.string.isRequired,
        'limit' : PropTypes.number,
        'rowHeight' : PropTypes.number.isRequired
    }

    static defaultProps = {
        'limit' : 25,
        'rowHeight' : 47
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.isMounted = this.isMounted.bind(this);
        this.getInitialFrom = this.getInitialFrom.bind(this);
        this.rebuiltHref = this.rebuiltHref.bind(this);
        this.handleLoad = this.handleLoad.bind(this);
        var state = {
            'isLoading' : false,
            'canLoad' : true
        };
        if (typeof props.mounted === 'undefined'){
            state.mounted = false;
        }
        this.state = state;
    }

    componentDidMount(){
        if (typeof this.state.mounted === 'boolean') this.setState({ 'mounted' : true });
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href && !this.state.canLoad){
            this.setState({ 'canLoad' : true });
        }
    }
    
    isMounted(){
        if (typeof this.props.mounted === 'boolean') return this.props.mounted;
        return this.state.mounted;
    }

    getInitialFrom(){
        if (typeof this.props.page === 'number' && typeof this.props.limit === 'number'){
            return (this.props.page - 1) * this.props.limit;
        } else if (typeof this.props.href === 'string'){
            var parts = url.parse(this.props.href, true);
            if (parts.query.limit && !isNaN(parts.query.from)) return parseInt(parts.query.from);
        }
        return 0;
    }

    rebuiltHref(){
        var parts = url.parse(this.props.href, true);
        var q = parts.query;
        var initialFrom = this.getInitialFrom();
        q.from = initialFrom + this.props.results.length;
        parts.search = '?' + queryString.stringify(q);
        return url.format(parts);
    }

    handleLoad(e,p,t){
        var nextHref = this.rebuiltHref();
        this.setState({ 'isLoading' : true }, ()=>{
            ajax.load(nextHref, (r)=>{
                if (r && r['@graph'] && r['@graph'].length > 0){
                    this.props.setResults(this.props.results.concat(r['@graph']));
                    this.setState({ 'isLoading' : false });
                } else {
                    if (this.state.canLoad){
                        this.setState({
                            'isLoading' : false,
                            'canLoad' : false
                        }, () => this.props.setResults(this.props.results));
                    }
                }
            });
        });
    }

    render(){
        if (!this.isMounted()) return <div>{ this.props.children }</div>;
        return (
            <Infinite
                elementHeight={
                    this.props.children.map((c) => {
                        if (typeof this.props.openDetailPanes[c.props['data-key']] === 'number'){
                            return this.props.openDetailPanes[c.props['data-key']];
                        } 
                        return this.props.rowHeight;
                    })
                }
                useWindowAsScrollContainer
                onInfiniteLoad={this.handleLoad}
                isInfiniteLoading={this.state.isLoading}
                loadingSpinnerDelegate={(
                    <div className="search-result-row loading text-center" style={{
                        'maxWidth' : this.props.tableContainerWidth,
                        'transform' : vizUtil.style.translate3d(this.props.tableContainerScrollLeft)
                    }}>
                        <i className="icon icon-circle-o-notch icon-spin" />&nbsp; Loading...
                    </div>
                )}
                infiniteLoadBeginEdgeOffset={this.state.canLoad ? 200 : undefined}
                preloadAdditionalHeight={Infinite.containerHeightScaleFactor(2)}
            >
                { this.props.children }
            </Infinite>
        );
    }
}

class DimensioningContainer extends React.Component {

    static resetHeaderColumnWidths(length){
        return [].fill(0, 0, length);
    }

    static findLargestBlockWidth(columnField){
        if (isServerSide() || !document.querySelectorAll) return null;
        var elementsFound = document.querySelectorAll('div.search-result-column-block[data-field="' + columnField + '"] .value');
        if (elementsFound && elementsFound.length > 0){
            return _.reduce(elementsFound, function(m, elem){
                return Math.max(m, elem.offsetWidth);
            }, 0);
        }
        return null;
    }

    static findAndDecreaseColumnWidths(columnDefinitions, padding = 30){
        return columnDefinitions.map(function(colDef){
            var w = DimensioningContainer.findLargestBlockWidth(colDef.field);
            if (typeof w !== 'number') return 0;
            if (w < colDef.widthMap.lg) return w + padding;
            return 0; 
        });
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.throttledUpdate = _.debounce(this.forceUpdate.bind(this), 100);
        this.toggleDetailPaneOpen = this.toggleDetailPaneOpen.bind(this);
        this.setDetailHeight = this.setDetailHeight.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.setHeaderWidths = _.throttle(this.setHeaderWidths.bind(this), 300);
        this.setResults = this.setResults.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'mounted'   : false,
            'widths'    : DimensioningContainer.resetHeaderColumnWidths(
                            props.columnDefinitions.length
                        ),
            'results'   : props.results,
            'openDetailPanes' : {} // { row key : detail pane height } used for determining if detailPane is open + height for Infinite listview.
        };
    }

    componentDidMount(){
        var state = { 'mounted' : true };
        if (!isServerSide()){
            if (this.refs.innerContainer){
                this.refs.innerContainer.addEventListener('scroll', this.onScroll);
                var fullRowWidth = ResultRow.fullRowWidth(this.props.columnDefinitions, this.state.mounted, []);
                if (this.refs.innerContainer.offsetWidth < fullRowWidth){
                    state.widths = DimensioningContainer.findAndDecreaseColumnWidths(this.props.columnDefinitions);
                }
            } else {
                state.widths = DimensioningContainer.findAndDecreaseColumnWidths(this.props.columnDefinitions);
            }
            
        }
        this.setState(state);
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href || !compareResultsByID(nextProps.results, this.props.results)){ // <-- the important check, covers different filters, sort, etc.
            this.setState({ 'results' : nextProps.results, 'openDetailPanes' : {} }, ()=>{
                vizUtil.requestAnimationFrame(()=>{
                    this.setState({ widths : DimensioningContainer.findAndDecreaseColumnWidths(this.props.columnDefinitions) });
                });
            });
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (pastState.results.length !== this.state.results.length) ReactTooltip.rebuild();
    }

    componentWillUnmount(){
        if (!isServerSide()){
            this.refs.innerContainer.removeEventListener('scroll', this.onScroll);
        }
    }

    toggleDetailPaneOpen(rowKey, cb = null){
        var openDetailPanes = _.clone(this.state.openDetailPanes);
        if (openDetailPanes[rowKey]){
            delete openDetailPanes[rowKey];
        } else {
            openDetailPanes[rowKey] = true;
        }
        this.setState({ 'openDetailPanes' : openDetailPanes }, cb);
    }

    setDetailHeight(rowKey, height, cb){
        var openDetailPanes = _.clone(this.state.openDetailPanes);
        if (typeof openDetailPanes[rowKey] === 'undefined') return false;
        openDetailPanes[rowKey] = height;
        this.setState({ 'openDetailPanes' : openDetailPanes }, cb);
    }

    onScroll(e){
        this.throttledUpdate();
        return false;
    }

    getTableDims(){
        if (!SearchResultTable.isDesktopClientside()){
            return {
                'tableContainerWidth' : null,
                'tableContainerScrollLeft' : null
            };
        }
        return {
            'tableContainerWidth' : (this.refs && this.refs.innerContainer && this.refs.innerContainer.offsetWidth) || null,
            'tableContainerScrollLeft' : (this.refs && this.refs.innerContainer && typeof this.refs.innerContainer.scrollLeft === 'number') ? this.refs.innerContainer.scrollLeft : null
        };
    }

    setHeaderWidths(widths){
        if (!Array.isArray(widths)) throw new Error('widths is not an array');
        this.setState({ 'widths' : widths });
    }

    setResults(results, cb){
        this.setState({ 'results' : results }, cb);
    }

    renderResults(fullRowWidth, tableContainerWidth, tableContainerScrollLeft, props = this.props){
        var { columnDefinitions, results, detailPane, href } = props;
        return this.state.results.map((r, rowNumber)=>
            <ResultRow
                result={r}
                rowNumber={rowNumber}
                data-key={r['@id'] || r.link_id || rowNumber}
                key={r['@id'] || r.link_id || rowNumber}
                columnDefinitions={columnDefinitions}
                rowWidth={fullRowWidth}
                mounted={this.state.mounted || false}
                headerColumnWidths={this.state.widths}
                schemas={Schemas.get()}
                detailPane={detailPane}
                toggleDetailPaneOpen={this.toggleDetailPaneOpen}
                openDetailPanes={this.state.openDetailPanes}
                setDetailHeight={this.setDetailHeight}

                tableContainerWidth={tableContainerWidth}
                tableContainerScrollLeft={tableContainerScrollLeft}

                href={href}
            />
        );
    }

    render(){
        var { columnDefinitions, results, sortBy, sortColumn, sortReverse, detailPane, href, limit, defaultMinColumnWidth } = this.props;
        var fullRowWidth = ResultRow.fullRowWidth(columnDefinitions, this.state.mounted, this.state.widths);
        var responsiveGridSize = !isServerSide() && this.state.mounted && layout.responsiveGridState();

        var { tableContainerWidth, tableContainerScrollLeft } = this.getTableDims();

        var outerClassName = "search-results-container";
        if (fullRowWidth > tableContainerWidth){
            if (tableContainerScrollLeft > 5){
                outerClassName += ' shadow-left';
            }
            if (tableContainerScrollLeft + tableContainerWidth <= fullRowWidth - 5){
                outerClassName += ' shadow-right';
            }
        }

        var canLoadMore = (this.refs && this.refs.loadMoreAsYouScroll && this.refs.loadMoreAsYouScroll.state &&
            typeof this.refs.loadMoreAsYouScroll.state.canLoad === 'boolean') ? this.refs.loadMoreAsYouScroll.state.canLoad : null;

        return (
            <div className={outerClassName}>
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
                            defaultMinColumnWidth={defaultMinColumnWidth}
                        />
                        : null }
                        <LoadMoreAsYouScroll
                            results={this.state.results}
                            mounted={this.state.mounted}
                            href={href}
                            limit={limit}
                            setResults={this.setResults}
                            tableContainerWidth={tableContainerWidth}
                            tableContainerScrollLeft={tableContainerScrollLeft}
                            ref="loadMoreAsYouScroll"
                            openDetailPanes={this.state.openDetailPanes}
                        >
                        { this.renderResults(fullRowWidth, tableContainerWidth, tableContainerScrollLeft) }
                        </LoadMoreAsYouScroll>
                        { canLoadMore === false ?
                            <div className="fin search-result-row">
                                <div className="inner" style={{
                                    'maxWidth' : tableContainerWidth,
                                    'transform' : vizUtil.style.translate3d(tableContainerScrollLeft)
                                }}>
                                    - <span>fin</span> -
                                </div>
                            </div>
                        : <div className="search-result-row empty-block"/> }
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
 * @prop {Object}           [columnDefinitionOverrideMap]  - Extend constant and default column-derived column definitions, by column definition field key.
 * 
 * @prop {string}           sortColumn          Current sort column, as fed by PageLimitSortController.
 * @prop {boolean}          sortReverse         Whether current sort column is reversed, as fed by PageLimitSortController.
 * @prop {function}         sortBy              Callback function for performing a sort, acceping 'sortColumn' and 'sortReverse' as params. As fed by PageLimitSortController.
 */
export class SearchResultTable extends React.Component {

    static defaultColumnDefinitionMap = defaultColumnDefinitionMap

    static isDesktopClientside(){
        return !isServerSide() && layout.responsiveGridState() !== 'xs';
    }

    static propTypes = {
        'results' : PropTypes.arrayOf(ResultRow.propTypes.result).isRequired,
        'href'  : PropTypes.string.isRequired,
        'limit' : PropTypes.number,
        'columns' : PropTypes.object,
        'constantColumnDefinitions' : ResultRow.propTypes.columnDefinitions,
        'defaultWidthMap' : PropTypes.shape({ 'lg' : PropTypes.number.isRequired, 'md' : PropTypes.number.isRequired, 'sm' : PropTypes.number.isRequired }).isRequired,
        'hiddenColumns' : PropTypes.arrayOf(PropTypes.string),
        'detailPane' : PropTypes.element,
        'columnDefinitionOverrideMap' : PropTypes.object
    }

    static defaultProps = {
        'columns' : {},
        'detailPane' : <DefaultDetailPane/>,
        'defaultWidthMap' : { 'lg' : 180, 'md' : 160, 'sm' : 120 },
        'defaultMinColumnWidth' : 55,
        'constantColumnDefinitions' : extendColumnDefinitions([
            { 'field' : 'display_title', },
            { 'field' : '@type', },
            { 'field' : 'lab.display_title', },
            { 'field' : 'date_created', }
        ], defaultColumnDefinitionMap),
        'columnDefinitionOverrideMap' : null,
        'hiddenColumns' : null,
        'limit' : 25,
    }

    /**
     * Grab loaded results.
     * 
     * @returns {Object[]|null} JSON list of all loaded results.
     */
    getLoadedResults(){
        if (!this.refs || !this.refs.container || !this.refs.container.state || !Array.isArray(this.refs.container.state.results)) return null;
        return this.refs.container.state.results;
    }

    render(){
        var { columns, constantColumnDefinitions, defaultWidthMap, hiddenColumns, columnDefinitionOverrideMap } = this.props;
        var columnDefinitions = columnsToColumnDefinitions(columns, constantColumnDefinitions, defaultWidthMap);
        if (Array.isArray(hiddenColumns)){ // Remove hidden columns, if any defined
            columnDefinitions = columnDefinitions.filter(function(colDef){
                if (hiddenColumns.indexOf(colDef.field) > -1) return false;
                return true;
            });
        }
        if (columnDefinitionOverrideMap) columnDefinitions = extendColumnDefinitions(columnDefinitions, columnDefinitionOverrideMap);
        return (
            <layout.WindowResizeUpdateTrigger>
                <DimensioningContainer {...this.props} columnDefinitions={columnDefinitions} ref="container"/>
            </layout.WindowResizeUpdateTrigger>
        );
    }
}
