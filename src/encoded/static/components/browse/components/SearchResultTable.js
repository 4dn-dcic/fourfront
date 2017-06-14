'use strict';

/* @flow */

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import Draggable from 'react-draggable';
import queryString from 'querystring';
import { Collapse, Fade } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import Infinite from './../../lib/react-infinite/src/react-infinite';
import { Sticky, StickyContainer } from 'react-sticky';
import { getTitleStringFromContext } from './../../item-pages/item';
import { Detail } from './../../item-pages/components';
import { isServerSide, Filters, navigate, object, layout, Schemas, DateUtility, ajax } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { ColumnSorterIcon } from './LimitAndPageControls';

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

export const defaultColumnDefinitionMap = {
    'display_title' : {
        'title' : "Title",
        'widthMap' : {'lg' : 280, 'md' : 250, 'sm' : 200},
        'minColumnWidth' : 90,
        'render' : function(result: Object, columnDefinition: Object, props: Object, width: number){
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
        'widthMap' : {'lg' : 220, 'md' : 200, 'sm' : 180},
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
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function(result, columnDefinition, props, width){
            return <DateUtility.LocalizedTime timestamp={defaultColumnBlockRenderFxn(result, columnDefinition, props, width)} formatType='date-sm' />;
        }
    },
    'experiments_in_set' : {
        'title' : '# of Experiments',
        'widthMap' : {'lg' : 60, 'md' : 60, 'sm' : 50},
        'noSort' : true,
        'render' : function(result, columnDefinition, props, width){
            if (!Array.isArray(result.experiments_in_set)) return null;
            return result.experiments_in_set.length;
        }
    },
    'experiments_in_set.experiment_type' : {
        'title' : 'Experiment Type',
        'widthMap' : {'lg' : 140, 'md' : 140, 'sm' : 120}
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

class ResultRowColumnBlockValue extends React.Component {

    shouldComponentUpdate(nextProps, nextState){
        if (
            nextProps.columnDefinition.field !== this.props.columnDefinition.field ||
            nextProps.schemas !== this.props.schemas ||
            object.atIdFromObject(nextProps.result) !== object.atIdFromObject(this.props.result)
        ){
            return true;
        }
        return false;
    }

    render(){
        var { result, columnDefinition, mounted } = this.props;
        var value = SearchResultTable.sanitizeOutputValue(
            columnDefinition.render(result, columnDefinition, _.omit(this.props, 'columnDefinition', 'result'))
        );
        if (typeof value === 'string') value = <span className="value">{ value }</span>;
        else if   (value === null)     value = <small className="text-300">-</small>;
        return (
            <div className="inner">{ value }</div>
        );
    }
}


class ResultRowColumnBlock extends React.Component {

    render(){
        var { result, columnDefinition, mounted } = this.props;
        var isDesktopClientside = SearchResultTable.isDesktopClientside();
        var blockWidth;

        if (mounted &&!isDesktopClientside){
            blockWidth = '100%';
        } else if (mounted && isDesktopClientside){
            blockWidth = this.props.headerColumnWidths[this.props.columnNumber] || searchResultTableColumnWidth(columnDefinition.widthMap, mounted);
        } else {
            blockWidth = searchResultTableColumnWidth(columnDefinition.widthMap, mounted);
        }

        return (
            <div className="search-result-column-block" style={{ width : blockWidth }} data-field={columnDefinition.field}>
                <ResultRowColumnBlockValue
                    width={blockWidth} result={result} columnDefinition={columnDefinition}
                    mounted={mounted} schemas={this.props.schemas} toggleDetailOpen={this.props.toggleDetailOpen}
                />
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

    render(){
        return this.props.renderDetailPane(this.props.result, this.props.rowNumber, this.props.tableContainerWidth, this.forceUpdate.bind(this));

    }
}


class ResultDetail extends React.Component{

    static propTypes = {
        'result'    : PropTypes.object.isRequired,
        'open'      : PropTypes.bool.isRequired,
        'renderDetailPane': PropTypes.func.isRequired,
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
                        <ResultDetailInner
                            result={this.props.result} rowNumber={this.props.rowNumber}
                            renderDetailPane={this.props.renderDetailPane} tableContainerWidth={this.props.tableContainerWidth}
                        />
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

    static areWidthsEqual(arr1, arr2){
        if (arr1.length !== arr2.length) return false;
        for (var i = 0; i < arr1.length; i++){
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
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
            'render'            : PropTypes.func,
            'widthMap'          : PropTypes.shape({
                'lg'                : PropTypes.number.isRequired,
                'md'                : PropTypes.number.isRequired,
                'sm'                : PropTypes.number.isRequired
            })
        })).isRequired,
        'headerColumnWidths' : PropTypes.array,
        'renderDetailPane'  : PropTypes.func.isRequired
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.toggleDetailOpen = _.throttle(this.toggleDetailOpen.bind(this), 250);
        this.isOpen = this.isOpen.bind(this);
        this.render = this.render.bind(this);
    }
    
    shouldComponentUpdate(nextProps, nextState){
        var isOpen = this.isOpen(nextProps);
        if (
            isOpen || isOpen !== this.isOpen(this.props) ||
            nextProps.rowNumber !== this.props.rowNumber ||
            object.atIdFromObject(nextProps.result) !== object.atIdFromObject(this.props.result) ||
            nextProps.schemas !== this.props.schemas ||
            nextProps.columnDefinitions.length !== this.props.columnDefinitions.length ||
            !ResultRow.areWidthsEqual(nextProps.headerColumnWidths, this.props.headerColumnWidths)
            //nextProps.tableContainerScrollLeft !== this.props.tableContainerScrollLeft ||
            //nextProps.tableContainerWidth !== this.props.tableContainerWidth
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
        var { result, rowNumber, mounted, headerColumnWidths, renderDetailPane, columnDefinitions, schemas,
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
                    renderDetailPane={renderDetailPane}
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
/*
    shouldComponentUpdate(nextProps, nextState){
        if (
            this.props.mounted !== nextProps.mounted ||
            this.state !== nextState ||
            this.props.columnDefinitions !== nextProps.columnDefinitions ||
            this.props.isSticky !== nextProps.isSticky ||
            this.props.stickyStyle.width !== nextProps.stickyStyle.width ||
            this.props.stickyStyle.left !== nextProps.stickyStyle.left
        ) return true;
        return false;
    }
*/

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
        var { isSticky, stickyStyle, tableLeftOffset, tableContainerWidth, columnDefinitions, stickyHeaderTopOffset } = this.props;
        return (
            <div className={"search-headers-row hidden-xs" + (isSticky ? ' stickied' : '')} style={
                isSticky ? _.extend({}, stickyStyle, { 'top' : -stickyHeaderTopOffset, 'left' : tableLeftOffset, 'width' : tableContainerWidth })
                : null}
            >
                <div className="columns clearfix" style={{ 
                    'left'  : isSticky ? stickyStyle.left - tableLeftOffset : null,
                    'width' : stickyStyle.width
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
        'debouncePointerEvents' : 150
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.isMounted = this.isMounted.bind(this);
        this.getInitialFrom = this.getInitialFrom.bind(this);
        this.rebuiltHref = this.rebuiltHref.bind(this);
        this.handleLoad = this.handleLoad.bind(this);
        this.handleScrollingStateChange = this.handleScrollingStateChange.bind(this);
        var state = {
            'isLoading' : false,
            'canLoad' : true
        };
        this.lastIsScrolling = false;
        if (typeof props.mounted === 'undefined'){
            state.mounted = false;
        }
        this.state = state;
    }

    componentDidMount(){
        if (typeof this.state.mounted === 'boolean') this.setState({ 'mounted' : true });
        window.addEventListener('scroll', this.handleScrollExt);
    }

    componentWillUnmount(){
        window.removeEventListener('scroll', this.handleScrollExt);
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

    handleScrollingStateChange(isScrolling){
        vizUtil.requestAnimationFrame(()=>{
            if (isScrolling && !this.lastIsScrolling){
                this.props.innerContainerElem.style.pointerEvents = 'none';
            } else if (this.lastIsScrolling) {
                this.props.innerContainerElem.style.pointerEvents = '';
                this.props.innerContainerElem.focus();
            }
            this.lastIsScrolling = !!(isScrolling);
        });
    }

    render(){
        if (!this.isMounted()) return <div>{ this.props.children }</div>;
        var elementHeight = _.keys(this.props.openDetailPanes).length === 0 ? this.props.rowHeight : this.props.children.map((c) => {
            if (typeof this.props.openDetailPanes[c.props['data-key']] === 'number'){
                return this.props.openDetailPanes[c.props['data-key']];
            }
            return this.props.rowHeight;
        });
        return (
            <Infinite
                elementHeight={elementHeight}
                useWindowAsScrollContainer
                onInfiniteLoad={this.handleLoad}
                isInfiniteLoading={this.state.isLoading}
                timeScrollStateLastsForAfterUserScrolls={250}
                onChangeScrollState={this.handleScrollingStateChange}
                loadingSpinnerDelegate={(
                    <div className="search-result-row loading text-center" style={{
                        'maxWidth' : this.props.tableContainerWidth,
                        'transform' : vizUtil.style.translate3d(this.props.tableContainerScrollLeft)
                    }}>
                        <i className="icon icon-circle-o-notch icon-spin" />&nbsp; Loading...
                    </div>
                )}
                onChangeScrollState={this.handleScrollingStateChange}
                infiniteLoadBeginEdgeOffset={this.state.canLoad ? 200 : undefined}
                preloadAdditionalHeight={Infinite.containerHeightScaleFactor(1.5)}
                preloadBatchSize={Infinite.containerHeightScaleFactor(1.5)}
            >
                { this.props.children }
            </Infinite>
        );
    }
}

class ShadowBorderLayer extends React.Component {

    shouldComponentUpdate(nextProps){
        if (this.shadowStateClass(nextProps) !== this.shadowStateClass(this.props)) return true;
        return false;
    }

    shadowStateClass(props = this.props){
        var { fullRowWidth, tableContainerScrollLeft, tableContainerWidth } = props;
        var shadowBorderClassName = "";
        if (fullRowWidth > tableContainerWidth){
            if (tableContainerScrollLeft > 5){
                shadowBorderClassName += ' shadow-left';
            }
            if (tableContainerScrollLeft + tableContainerWidth <= fullRowWidth - 5){
                shadowBorderClassName += ' shadow-right';
            }
        }
        return shadowBorderClassName;
    }

    render(){
        return <div className={"shadow-border-layer hidden-xs" + this.shadowStateClass()} />;
    }
}

class DimensioningContainer extends React.Component {

    static resetHeaderColumnWidths(length){
        return [].fill(0, 0, length);
    }

    static findLargestBlockWidth(columnField){
        if (isServerSide() || !document.querySelectorAll) return null;
        var elementsFound = document.querySelectorAll('div.search-result-column-block[data-field="' + columnField + '"] .value');
        if (elementsFound){
            elementsFound = [...elementsFound];
        }

        var maxColWidth = null;

        if (elementsFound && elementsFound.length > 0){

            var headerElement = document.querySelector('div.search-headers-column-block[data-field="' + columnField + '"] .column-title');

            maxColWidth = Math.max(
                _.reduce(elementsFound, function(m, elem){
                    return Math.max(m, elem.offsetWidth);
                }, 0),
                (headerElement && (headerElement.offsetWidth + 12)) || 0
            );

        }


        return maxColWidth;
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
        this.throttledUpdate = _.debounce(this.forceUpdate.bind(this), 500);
        this.toggleDetailPaneOpen = _.throttle(this.toggleDetailPaneOpen.bind(this), 500);
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
            'openDetailPanes' : {} // { row key : detail pane height } used for determining if detail pane is open + height for Infinite listview.
        };
        
    }

    componentDidMount(){
        var state = { 'mounted' : true };
        if (!isServerSide()){
            if (this.refs.innerContainer){
                var fullRowWidth = ResultRow.fullRowWidth(this.props.columnDefinitions, this.state.mounted, []);
                if (this.refs.innerContainer.offsetWidth < fullRowWidth){
                    state.widths = DimensioningContainer.findAndDecreaseColumnWidths(this.props.columnDefinitions);
                }
            } else {
                state.widths = DimensioningContainer.findAndDecreaseColumnWidths(this.props.columnDefinitions);
            }
            
        }
        this.lastResponsiveGridSize = layout.responsiveGridState();
        this.setState(state);
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href || !compareResultsByID(nextProps.results, this.props.results)){ // <-- the important check, covers different filters, sort, etc.
            this.setState({ 'results' : nextProps.results, 'openDetailPanes' : {} }, ()=>{
                vizUtil.requestAnimationFrame(()=>{
                    this.setState({ widths : DimensioningContainer.findAndDecreaseColumnWidths(nextProps.columnDefinitions) });
                });
            });
        } else {
            var responsiveGridSize = layout.responsiveGridState();
            if (nextProps.columnDefinitions.length !== this.props.columnDefinitions.length || this.lastResponsiveGridSize !== responsiveGridSize){
                this.lastResponsiveGridSize = responsiveGridSize;
                vizUtil.requestAnimationFrame(()=>{
                    this.setState({ widths : DimensioningContainer.findAndDecreaseColumnWidths(nextProps.columnDefinitions) });
                });
            }
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (pastState.results.length !== this.state.results.length) ReactTooltip.rebuild();
    }

    toggleDetailPaneOpen(rowKey, cb = null){
        setTimeout(() => {
            var openDetailPanes = _.clone(this.state.openDetailPanes);
            if (openDetailPanes[rowKey]){
                delete openDetailPanes[rowKey];
            } else {
                openDetailPanes[rowKey] = true;
            }
            this.setState({ 'openDetailPanes' : openDetailPanes }, cb);
        }, 0);
    }

    setDetailHeight(rowKey, height, cb){
        var openDetailPanes = _.clone(this.state.openDetailPanes);
        if (typeof openDetailPanes[rowKey] === 'undefined') return false;
        openDetailPanes[rowKey] = height;
        this.setState({ 'openDetailPanes' : openDetailPanes }, cb);
    }

    onScroll(e){
        if (document && document.querySelectorAll && this.refs && this.refs.innerContainer && this.refs.innerContainer.childNodes[0]){
            var detailPanes = document.querySelectorAll('.result-table-detail.collapse.in');
            if (detailPanes && detailPanes.length > 0){
                var transformStyle = vizUtil.style.translate3d(this.refs.innerContainer.scrollLeft);
                vizUtil.requestAnimationFrame(function(){
                    detailPanes.forEach(function(d){
                        d.style.transform = transformStyle;
                    });
                });
            }
        }
        this.throttledUpdate();
        return false;
    }

    getTableLeftOffset(){
        return (this.refs && this.refs.innerContainer && layout.getElementOffset(this.refs.innerContainer).left) || null;
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
            'tableContainerScrollLeft' : (this.refs && this.refs.innerContainer && typeof this.refs.innerContainer.scrollLeft === 'number') ? this.refs.innerContainer.scrollLeft : null,
            'tableLeftOffset' : this.getTableLeftOffset()
        };
    }

    setHeaderWidths(widths){
        if (!Array.isArray(widths)) throw new Error('widths is not an array');
        this.setState({ 'widths' : widths });
    }

    setResults(results, cb){
        this.setState({ 'results' : results }, cb);
    }

    renderResults(fullRowWidth, tableContainerWidth, tableContainerScrollLeft, headerColumnWidthsFilled, props = this.props){
        var { columnDefinitions, results, href, renderDetailPane } = props;
        return this.state.results.map((r, rowNumber)=>
            <ResultRow
                result={r}
                rowNumber={rowNumber}
                data-key={r['@id'] || r.link_id || rowNumber}
                key={r['@id'] || r.link_id || rowNumber}
                columnDefinitions={columnDefinitions}
                rowWidth={fullRowWidth}
                mounted={this.state.mounted || false}
                headerColumnWidths={headerColumnWidthsFilled}
                schemas={Schemas.get()}
                renderDetailPane={renderDetailPane}
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
        var { columnDefinitions, results, sortBy, sortColumn, sortReverse, href, limit, defaultMinColumnWidth } = this.props;
        var fullRowWidth = ResultRow.fullRowWidth(columnDefinitions, this.state.mounted, this.state.widths);
        var responsiveGridSize = !isServerSide() && this.state.mounted && layout.responsiveGridState();

        var { tableContainerWidth, tableContainerScrollLeft, tableLeftOffset } = this.getTableDims();

        var canLoadMore = (this.refs && this.refs.loadMoreAsYouScroll && this.refs.loadMoreAsYouScroll.state &&
            typeof this.refs.loadMoreAsYouScroll.state.canLoad === 'boolean') ? this.refs.loadMoreAsYouScroll.state.canLoad : null;

        var headerColumnWidthsFilled = this.state.widths.map((w, i)=>{
            if (typeof w === 'number' && w > 0) return w;
            return searchResultTableColumnWidth(columnDefinitions[i].widthMap, this.state.mounted);
        });

        return (
            <div className="search-results-outer-container">
                <StickyContainer>
                    <div className="search-results-container">
                        <div className="inner-container" ref="innerContainer" onScroll={this.onScroll}>
                            <div className="scrollable-container" style={{ minWidth : fullRowWidth + 6 }}>
                                
                                { !responsiveGridSize || responsiveGridSize !== 'xs' ? 
                                    <Sticky topOffset={this.props.stickyHeaderTopOffset} >{
                                        ({style, isSticky, wasSticky, distanceFromTop, distanceFromBottom, calculatedHeight}) =>
                                        <HeadersRow
                                            columnDefinitions={columnDefinitions}
                                            mounted={this.state.mounted}
                                            headerColumnWidths={headerColumnWidthsFilled}
                                            setHeaderWidths={this.setHeaderWidths}
                                            sortBy={sortBy}
                                            sortColumn={sortColumn}
                                            sortReverse={sortReverse}
                                            defaultMinColumnWidth={defaultMinColumnWidth}
                                            tableLeftOffset={tableLeftOffset}
                                            tableContainerWidth={tableContainerWidth}
                                            rowHeight={this.props.rowHeight}
                                            results={this.state.results}
                                            stickyHeaderTopOffset={this.props.stickyHeaderTopOffset}

                                            stickyStyle={style}
                                            isSticky={isSticky}
                                        />
                                    }</Sticky>
                                
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
                                    rowHeight={this.props.rowHeight}
                                    innerContainerElem={this.refs && this.refs.innerContainer}
                                >
                                { this.renderResults(fullRowWidth, tableContainerWidth, tableContainerScrollLeft, headerColumnWidthsFilled) }
                                </LoadMoreAsYouScroll>
                            </div>
                        </div>
                        <ShadowBorderLayer tableContainerScrollLeft={tableContainerScrollLeft} tableContainerWidth={tableContainerWidth} fullRowWidth={fullRowWidth} />
                    </div>
                </StickyContainer>
                { canLoadMore === false ?
                    <div className="fin search-result-row">
                        <div className="inner">
                            - <span>fin</span> -
                        </div>
                    </div>
                : <div className="search-result-row empty-block"/> }
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
 * @prop {function}         [renderDetailPane]  An instance of a React component which will receive prop 'result'.
 * @prop {Object}           [columnDefinitionOverrideMap]  - Extend constant and default column-derived column definitions, by column definition field key.
 * 
 * @prop {string}           sortColumn          Current sort column, as fed by SortController.
 * @prop {boolean}          sortReverse         Whether current sort column is reversed, as fed by SortController.
 * @prop {function}         sortBy              Callback function for performing a sort, acceping 'sortColumn' and 'sortReverse' as params. As fed by SortController.
 */
export class SearchResultTable extends React.Component {

    static defaultColumnDefinitionMap = defaultColumnDefinitionMap

    static isDesktopClientside(){
        return !isServerSide() && layout.responsiveGridState() !== 'xs';
    }

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

    static propTypes = {
        'results' : PropTypes.arrayOf(ResultRow.propTypes.result).isRequired,
        'href'  : PropTypes.string.isRequired,
        'limit' : PropTypes.number,
        'columns' : PropTypes.object,
        'constantColumnDefinitions' : ResultRow.propTypes.columnDefinitions,
        'defaultWidthMap' : PropTypes.shape({ 'lg' : PropTypes.number.isRequired, 'md' : PropTypes.number.isRequired, 'sm' : PropTypes.number.isRequired }).isRequired,
        'hiddenColumns' : PropTypes.arrayOf(PropTypes.string),
        'renderDetailPane' : PropTypes.func,
        'columnDefinitionOverrideMap' : PropTypes.object
    }

    static defaultProps = {
        'columns' : {},
        'renderDetailPane' : function(result){ return <DefaultDetailPane result={result} />; },
        'defaultWidthMap' : { 'lg' : 200, 'md' : 180, 'sm' : 120 },
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
        'rowHeight' : 47,
        'stickyHeaderTopOffset' : -40
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
