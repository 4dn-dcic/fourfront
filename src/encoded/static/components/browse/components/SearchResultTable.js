'use strict';

/* @flow */

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import queryString from 'querystring';
import { Collapse, Fade } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import Infinite from 'react-infinite';
import { Sticky, StickyContainer } from 'react-sticky';
import { Detail } from './../../item-pages/components';
import { console, isServerSide, Filters, navigate, object, layout, Schemas, DateUtility, ajax } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { ChartDataController } from './../../viz/chart-data-controller';
import Alerts from './../../alerts';
import {
    defaultColumnBlockRenderFxn, extendColumnDefinitions, defaultColumnDefinitionMap,
    columnsToColumnDefinitions, ResultRowColumnBlockValue, DEFAULT_WIDTH_MAP,
    getColumnWidthFromDefinition, HeadersRow
} from './table-commons';



class ResultRowColumnBlock extends React.PureComponent {

    render(){
        var { result, columnDefinition, mounted } = this.props;
        var isDesktopClientside = SearchResultTable.isDesktopClientside();
        var blockWidth;

        if (mounted){
            blockWidth = this.props.headerColumnWidths[this.props.columnNumber] || getColumnWidthFromDefinition(columnDefinition, mounted);
        } else {
            blockWidth = getColumnWidthFromDefinition(columnDefinition, mounted);
        }

        return (
            <div className="search-result-column-block" style={{ width : blockWidth }} data-field={columnDefinition.field}>
                <ResultRowColumnBlockValue
                    width={blockWidth} result={result} columnDefinition={columnDefinition} columnNumber={this.props.columnNumber}
                    mounted={mounted} schemas={Schemas.get()} toggleDetailOpen={this.props.toggleDetailOpen} detailOpen={this.props.detailOpen}
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


class ResultDetail extends React.PureComponent{

    static propTypes = {
        'result'    : PropTypes.object.isRequired,
        'open'      : PropTypes.bool.isRequired,
        'renderDetailPane': PropTypes.func.isRequired,
        'rowNumber' : PropTypes.number,
        'toggleDetailOpen' : PropTypes.func.isRequired
    }

    constructor(props){
        super(props);
        this.setDetailHeightFromPane = this.setDetailHeightFromPane.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        //this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.render = this.render.bind(this);
        this.state = { 'closing' : false };
    }

    setDetailHeightFromPane(height = null){
        if (typeof height !== 'number'){
            height = this.refs.detail && parseInt(this.refs.detail.offsetHeight);
            if (!this.firstFoundHeight && height && !isNaN(height)) this.firstFoundHeight = height;
        }
        if (isNaN(height) || typeof height !== 'number') height = this.firstFoundHeight || 1;
        this.props.setDetailHeight(height);
    }

    componentDidUpdate(pastProps, pastState){
        if (pastProps.open !== this.props.open){
            if (this.props.open && typeof this.props.setDetailHeight === 'function'){
                setTimeout(this.setDetailHeightFromPane, 10);
            }
        }
    }

    render(){
        return (
            <div className={"result-table-detail-container" + (this.props.open || this.state.closing ? ' open' : ' closed')}>
                { this.props.open ?

                    <div className="result-table-detail" ref="detail" style={{
                        'width' : this.props.tableContainerWidth,
                        'transform' : vizUtil.style.translate3d(this.props.tableContainerScrollLeft)
                    }}>
                        { this.props.renderDetailPane(this.props.result, this.props.rowNumber, this.props.tableContainerWidth, this.setDetailHeightFromPane) }
                        { this.props.tableContainerScrollLeft && this.props.tableContainerScrollLeft > 10 ?
                            <div className="close-button-container text-center" onClick={this.props.toggleDetailOpen}>
                                <i className="icon icon-angle-up"/>
                            </div>
                        : null }
                    </div>
                : <div/> }
            </div>
        );
    }
}


class ResultRow extends React.PureComponent {

    static fullRowWidth(columnDefinitions, mounted=true, dynamicWidths=null){
        return _.reduce(columnDefinitions, function(fw, colDef, i){
            var w;
            if (typeof colDef === 'number') w = colDef;
            else {
                if (Array.isArray(dynamicWidths) && dynamicWidths[i]) w = dynamicWidths[i];
                else w = getColumnWidthFromDefinition(colDef, mounted);
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
        //this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.toggleDetailOpen = _.throttle(this.toggleDetailOpen.bind(this), 250);
        this.isOpen = this.isOpen.bind(this);
        this.setDetailHeight = props.setDetailHeight.bind(props.setDetailHeight, props['data-key']);
        this.render = this.render.bind(this);
    }

    componentWillReceiveProps(nextProps){
        //_.keys(nextProps).map((k)=>{
        //    if (nextProps[k] !== this.props[k]) console.log('CHANGED:' + k, nextProps[k], this.props[k]);
        //});
        if (nextProps['data-key'] !== this.props['data-key']){
            this.setDetailHeight = nextProps.setDetailHeight.bind(nextProps.setDetailHeight, nextProps['data-key']);
        }
    }
    /*
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
    */

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
            <div className={"search-result-row " + (detailOpen ? 'open' : 'closed')} data-row-number={rowNumber} /* ref={(r)=>{
                // TODO POTENTIALLY: Use to set height on open/close icon & sticky title column.
                var height = (r && r.offsetHeight) || null;
                if (height && height !== this.rowFullHeight){
                    this.rowFullHeight = height;
                }
            }}*/>
                <div className="columns clearfix">
                    { _.map(columnDefinitions, (colDef, i) =>
                        <ResultRowColumnBlock
                            columnNumber={i} rowNumber={rowNumber} key={colDef.field}
                            columnDefinition={colDef} result={result}
                            toggleDetailOpen={this.toggleDetailOpen} detailOpen={detailOpen}
                            mounted={mounted} headerColumnWidths={headerColumnWidths} href={href}
                            selectedFiles={i === 0 ? this.props.selectedFiles : null} // Passed to trigger update/re-render on PureComponent
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
                    setDetailHeight={this.setDetailHeight}
                    selectedFiles={this.props.selectedFiles}
                />
            </div>
        );
    }
}


class LoadMoreAsYouScroll extends React.PureComponent {

    static propTypes = {
        'href' : PropTypes.string.isRequired,
        'limit' : PropTypes.number,
        'rowHeight' : PropTypes.number.isRequired
    }

    static defaultProps = {
        'limit' : 25,
        'debouncePointerEvents' : 150,
        'openRowHeight' : 56
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.isMounted = this.isMounted.bind(this);
        this.getInitialFrom = this.getInitialFrom.bind(this);
        this.rebuiltHref = this.rebuiltHref.bind(this);
        this.handleLoad = _.throttle(this.handleLoad.bind(this), 3000);
        //this.handleScrollingStateChange = this.handleScrollingStateChange.bind(this);
        //this.handleScrollExt = this.handleScrollExt.bind(this);
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
        //window.addEventListener('scroll', this.handleScrollExt);
    }
    /*
    componentWillUnmount(){
        window.removeEventListener('scroll', this.handleScrollExt);
    }
    */
    /*
    handleScrollExt(){
        if (typeof this.props.onVerticalScroll === 'function'){
            return this.props.onVerticalScroll.apply(this.props.onVerticalScroll, arguments);
        }
    }
    */
    componentWillReceiveProps(nextProps){
        if (!this.state.canLoad && (nextProps.href !== this.props.href || (typeof nextProps.totalExpected === 'number' && this.props.totalExpected !== nextProps.totalExpected))){
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
        var loadCallback = (function(resp){
            if (resp && resp['@graph'] && resp['@graph'].length > 0){
                // Check if have same result, if so, refresh all results (something has changed on back-end)
                var oldKeys = _.map(this.props.results, DimensioningContainer.getKeyForGraphResult);
                var newKeys = _.map(resp['@graph'], DimensioningContainer.getKeyForGraphResult);
                var keyIntersection = _.intersection(oldKeys.sort(), newKeys.sort());
                if (keyIntersection.length > 0){
                    console.error('FOUND ALREADY-PRESENT RESULT IN NEW RESULTS', keyIntersection, newKeys);
                    this.setState({ 'isLoading' : false }, ()=>{
                        navigate('', { 'inPlace' : true }, ()=>{
                            ChartDataController.isInitializaed() && ChartDataController.sync();
                            Alerts.queue({ 'title' : 'Results Refreshed', 'message' : 'Results have changed while loading and have been refreshed.', 'navigateDisappearThreshold' : 1 });
                        });
                    });
                } else {
                    var canLoadMore = !!(this.props.totalExpected && (this.props.results.length + resp['@graph'].length) < this.props.totalExpected);
                    this.setState({ 'isLoading' : false, 'canLoad' : canLoadMore }, ()=>{
                        this.props.setResults(this.props.results.slice(0).concat(resp['@graph']));
                    });
                }
            } else {
                if (this.state.canLoad){
                    this.setState({
                        'isLoading' : false,
                        'canLoad' : false
                    }, () => this.props.setResults(this.props.results));
                }
            }
        }).bind(this);

        this.setState({ 'isLoading' : true }, ()=>{
            ajax.load(nextHref, loadCallback, 'GET', loadCallback);
        });
    }
    /*
    handleScrollingStateChange(isScrolling){
        //vizUtil.requestAnimationFrame(()=>{
            //if (isScrolling && !this.lastIsScrolling){
            //    this.props.innerContainerElem.style.pointerEvents = 'none';
            //} else if (this.lastIsScrolling) {
                this.props.innerContainerElem.style.pointerEvents = '';
                this.props.innerContainerElem.childNodes[0].focus();
                //console.log(this.props.innerContainerElem.childNodes[0]);
            //}
            //this.lastIsScrolling = !!(isScrolling);
        //});
    }
    */
    render(){
        if (!this.isMounted()) return <div>{ this.props.children }</div>;
        var { children, rowHeight, openDetailPanes, openRowHeight, tableContainerWidth, tableContainerScrollLeft } = this.props;
        var elementHeight = _.keys(openDetailPanes).length === 0 ? rowHeight : React.Children.map(children, function(c){
            if (typeof openDetailPanes[c.props['data-key']] === 'number'){
                //console.log('height', openDetailPanes[c.props['data-key']], rowHeight, 2 + openDetailPanes[c.props['data-key']] + openRowHeight);
                return openDetailPanes[c.props['data-key']] + openRowHeight + 2;
            }
            return rowHeight;
        });
        return (
            <Infinite
                elementHeight={elementHeight}
                useWindowAsScrollContainer
                onInfiniteLoad={this.handleLoad}
                isInfiniteLoading={this.state.isLoading}
                timeScrollStateLastsForAfterUserScrolls={250}
                //onChangeScrollState={this.handleScrollingStateChange}
                loadingSpinnerDelegate={(
                    <div className="search-result-row loading text-center" style={{
                        'maxWidth' : tableContainerWidth,
                        'transform' : vizUtil.style.translate3d(tableContainerScrollLeft)
                    }}>
                        <i className="icon icon-circle-o-notch icon-spin" />&nbsp; Loading...
                    </div>
                )}
                infiniteLoadBeginEdgeOffset={this.state.canLoad ? 200 : undefined}
                preloadAdditionalHeight={Infinite.containerHeightScaleFactor(1.5)}
                preloadBatchSize={Infinite.containerHeightScaleFactor(1.5)}
                children={children}
            />
        );
    }
}

class ShadowBorderLayer extends React.Component {

    static shadowStateClass(hiddenLeftEdgeContentWidth = 0, hiddenRightEdgeContentWidth = 0){
        var shadowBorderClassName = "";
        if (hiddenLeftEdgeContentWidth > 0) shadowBorderClassName += ' shadow-left';
        if (hiddenRightEdgeContentWidth > 0) shadowBorderClassName += ' shadow-right';
        return shadowBorderClassName;
    }

    static defaultProps = {
        'horizontalScrollRateOnEdgeButton' : 10
    }

    static isWindowPastTableTop(tableContainerElement, windowHeight = null, scrollTop = null, tableTopOffset = null){
        if (isServerSide()) return false;
        if (!windowHeight)      windowHeight    = window.innerHeight;
        if (!scrollTop)         scrollTop       = layout.getPageVerticalScrollPosition();
        if (!tableTopOffset)    tableTopOffset  = layout.getElementOffset(tableContainerElement).top;
        if (windowHeight / 2 + scrollTop > tableTopOffset){
            return true;
        }
        return false;
    }

    constructor(props){
        super(props);
        this.scrolling = false;
        this.performScrollAction = this.performScrollAction.bind(this);
        this.handleScrollButtonClick = this.handleScrollButtonClick.bind(this);
        this.handleScrollButtonUp = this.handleScrollButtonUp.bind(this);
        this.lastDimClassName = null;
    }

    shouldComponentUpdate(nextProps){
        if (this.props.isWindowPastTableTop !== nextProps.isWindowPastTableTop) return true;
        var pastEdges = this.edgeHiddenContentWidths(this.props);
        var newEdges = this.edgeHiddenContentWidths(nextProps);
        if (newEdges.left !== pastEdges.left || newEdges.right !== pastEdges.right) return true;
        var dimClassName = this.tallDimensionClass(nextProps);
        if (this.lastDimClassName !== dimClassName){
            this.lastDimClassName = dimClassName;
            return true;
        }
        return false;
    }

    edgeHiddenContentWidths(props = this.props){
        var edges = { 'left' : 0, 'right' : 0 };
        var { fullRowWidth, tableContainerScrollLeft, tableContainerWidth } = props;
        if (fullRowWidth > tableContainerWidth){
            if (tableContainerScrollLeft > 5){
                //shadowBorderClassName += ' shadow-left';
                edges.left = tableContainerScrollLeft;
            }
            if (tableContainerScrollLeft + tableContainerWidth <= fullRowWidth - 5){
                edges.right = ((fullRowWidth - tableContainerWidth) - tableContainerScrollLeft);
                //shadowBorderClassName += ' shadow-right';
            }
        }
        return edges;
    }

    shadowStateClass(edges, props = this.props){
        if (!edges) edges = this.edgeHiddenContentWidths();
        return ShadowBorderLayer.shadowStateClass(edges.left, edges.right);
    }

    tallDimensionClass(props = this.props){
        var cls;
        var tableHeight = (props.innerContainerElem && props.innerContainerElem.offsetHeight) || 0;
        if (tableHeight > 800){
            cls = ' tall';
            /*
            if (!isServerSide()){
                var windowHeight = window.innerHeight;
                var scrollTop = document && document.body && document.body.scrollTop;
                var tableTopOffset = layout.getElementOffset(props.innerContainerElem).top;
                if (windowHeight / 2 + scrollTop > tableTopOffset){
                    cls += ' fixed-position-arrows';
                }
            }
            */
        } else {
            cls = ' short';
        }
        return cls;
        //return this.lastDimClassName;
    }

    edgeScrollButtonLeft(leftEdgeContentWidth){
        if (!this.props.innerContainerElem) return null;
        var className = "edge-scroll-button left-edge";
        if (typeof leftEdgeContentWidth !== 'number' || leftEdgeContentWidth === 0) {
            className += ' faded-out';
        }
        return (
            <div className={className} onMouseDown={this.handleScrollButtonClick.bind(this, 'left')} onMouseUp={this.handleScrollButtonUp} onMouseOut={this.handleScrollButtonUp}>
                <i className="icon icon-caret-left"/>
            </div>
        );
    }

    edgeScrollButtonRight(rightEdgeContentWidth){
        if (!this.props.innerContainerElem) return null;
        var className = "edge-scroll-button right-edge";
        if (typeof rightEdgeContentWidth !== 'number' || rightEdgeContentWidth === 0) {
            className += ' faded-out';
        }
        return (
            <div className={className} onMouseDown={this.handleScrollButtonClick.bind(this, 'right')} onMouseUp={this.handleScrollButtonUp} onMouseOut={this.handleScrollButtonUp}>
                <i className="icon icon-caret-right"/>
            </div>
        );
    }

    performScrollAction(direction = "right", depth = 0){
        vizUtil.requestAnimationFrame(()=>{
            var change = (direction === 'right' ? 1 : -1) * this.props.horizontalScrollRateOnEdgeButton;
            var maxScrollLeft = this.props.fullRowWidth - this.props.tableContainerWidth;
            var leftOffset = this.props.innerContainerElem.scrollLeft = Math.max(0, Math.min(maxScrollLeft, this.props.innerContainerElem.scrollLeft + change));
            var detailPanes = DimensioningContainer.findDetailPaneElements();
            if (detailPanes) DimensioningContainer.setDetailPanesLeftOffset(detailPanes, leftOffset);
            if (depth >= 10000){
                console.error("Reached depth 10k on a recursive function 'performScrollAction.'");
                return;
            }
            if (this.scrolling) {
                this.performScrollAction(direction, depth + 1);
            }
        });
    }

    handleScrollButtonClick(direction = "right", evt){
        if (evt.button === 0) { // Left click
            this.scrolling = true;
            this.performScrollAction(direction);
        }
    }

    handleScrollButtonUp(){
        this.scrolling = false;
    }

    render(){
        if (this.props.fullRowWidth <= this.props.tableContainerWidth) return null;
        var edges = this.edgeHiddenContentWidths();
        return (
            <div className={"shadow-border-layer hidden-xs" + this.shadowStateClass(edges) + this.tallDimensionClass() + (this.props.isWindowPastTableTop ? ' fixed-position-arrows' : '')}>
                { this.edgeScrollButtonLeft(edges.left) }{ this.edgeScrollButtonRight(edges.right) }
            </div>
        );
    }
}

class DimensioningContainer extends React.PureComponent {

    static resetHeaderColumnWidths(columnDefinitions, mounted = false){
        //const listOfZeroes = [].fill(0, 0, columnDefinitions.length);
        return _.map(columnDefinitions, function(colDef, i){
            return getColumnWidthFromDefinition(colDef, mounted);
        });
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
            if (typeof w === 'number' && w < colDef.widthMap.lg) return w + padding;
            return getColumnWidthFromDefinition(colDef, true);
        });
    }

    static setDetailPanesLeftOffset(detailPanes, leftOffset = 0, cb = null){
        if (detailPanes && detailPanes.length > 0){
            var transformStyle = vizUtil.style.translate3d(leftOffset);
            detailPanes.forEach(function(d){
                if (d.style.transform !== transformStyle) d.style.transform = transformStyle;
            });
        }
        if (typeof cb === 'function') cb();
    }

    static findDetailPaneElements(){
        if (document && document.querySelectorAll){
            return Array.from(document.querySelectorAll('.result-table-detail'));
        }
        return null;
    }

    static getKeyForGraphResult(graphItem, rowNumber = 0){
        return object.itemUtil.atId(graphItem);
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.throttledUpdate = _.debounce(this.forceUpdate.bind(this), 500);
        this.toggleDetailPaneOpen = _.throttle(this.toggleDetailPaneOpen.bind(this), 500);
        this.setDetailHeight = this.setDetailHeight.bind(this);
        this.onHorizontalScroll = this.onHorizontalScroll.bind(this);
        this.onVerticalScroll = _.throttle(this.onVerticalScroll.bind(this), 200);
        this.setHeaderWidths = _.throttle(this.setHeaderWidths.bind(this), 300);
        this.setResults = this.setResults.bind(this);
        this.renderHeadersRow = this.renderHeadersRow.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'mounted'   : false,
            'widths'    : DimensioningContainer.resetHeaderColumnWidths(props.columnDefinitions),
            'results'   : props.results.slice(0),
            'isWindowPastTableTop' : false,
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
                    state.isWindowPastTableTop = ShadowBorderLayer.isWindowPastTableTop(this.refs.innerContainer);
                }
            } else {
                state.widths = DimensioningContainer.findAndDecreaseColumnWidths(this.props.columnDefinitions);
            }

            window.addEventListener('scroll', this.onVerticalScroll);

        }

        this.lastResponsiveGridSize = layout.responsiveGridState();
        this.setState(state);
    }

    componentWillUnmount(){
        window.removeEventListener('scroll', this.onVerticalScroll);
    }

    componentWillReceiveProps(nextProps){
        // Reset results on change in results, total, or href.
        if ( nextProps.href !== this.props.href || !object.itemUtil.compareResultsByID(nextProps.results, this.props.results) ){
            this.setState({
                'results' : nextProps.results.slice(0),
                'openDetailPanes' : {},
                'widths' : DimensioningContainer.resetHeaderColumnWidths(nextProps.columnDefinitions, this.state.mounted)
            }, ()=>{
                vizUtil.requestAnimationFrame(()=>{
                    this.setState({ widths : DimensioningContainer.findAndDecreaseColumnWidths(nextProps.columnDefinitions) });
                });
            });
        // Or, reset widths on change in columns
        } else {
            var responsiveGridSize = layout.responsiveGridState();
            if (nextProps.columnDefinitions.length !== this.props.columnDefinitions.length || this.lastResponsiveGridSize !== responsiveGridSize){
                this.lastResponsiveGridSize = responsiveGridSize;
                // 1. Reset state.widths to be [0,0,0,0, ...newColumnDefinitionsLength], forcing them to widthMap sizes.
                this.setState({
                    'widths' : DimensioningContainer.resetHeaderColumnWidths(nextProps.columnDefinitions, this.state.mounted)
                }, ()=>{
                    vizUtil.requestAnimationFrame(()=>{
                        // 2. Upon render into DOM, decrease col sizes.
                        this.setState({ widths : DimensioningContainer.findAndDecreaseColumnWidths(nextProps.columnDefinitions) });
                    });
                });

            }
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (pastState.results.length !== this.state.results.length){
            ReactTooltip.rebuild();
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

    onHorizontalScroll(e){
        if (document && document.querySelectorAll && this.refs && this.refs.innerContainer && this.refs.innerContainer.childNodes[0]){
            var detailPanes = DimensioningContainer.findDetailPaneElements();
            if (detailPanes) DimensioningContainer.setDetailPanesLeftOffset(detailPanes, this.refs.innerContainer.scrollLeft, this.throttledUpdate);
        }
        return false;
    }

    onVerticalScroll(e){
        if (!document || !window || !this.refs.innerContainer) return null;



        //vizUtil.requestAnimationFrame(()=>{

        var windowHeight    = window.innerHeight;
        var scrollTop       = layout.getPageVerticalScrollPosition();
        var tableTopOffset  = layout.getElementOffset(this.refs.innerContainer).top;

            //var isWindowPastTableTop = ShadowBorderLayer.isWindowPastTableTop(this.refs.innerContainer, windowHeight, scrollTop, tableTopOffset);


        var done = false;

            // Resize to full width.
            /*
            if (typeof this.props.fullWidthInitOffset === 'number' && typeof this.props.fullWidthContainerSelectorString === 'string'
                && !isServerSide() && document && document.body && document.querySelector
            ){
                var bodyWidth = document.body.offsetWidth || window.innerWidth;
                if (bodyWidth > 1200) {
                    var extraWidth = bodyWidth - 1180;
                    var distanceToTopOfTable = tableTopOffset - scrollTop + this.props.stickyHeaderTopOffset;
                    var pageTableContainer = document.querySelector(this.props.fullWidthContainerSelectorString);
                    if (pageTableContainer){
                        if (distanceToTopOfTable <= 5){
                            pageTableContainer.style.transition = "none";
                            pageTableContainer.style.marginLeft = pageTableContainer.style.marginRight = -(extraWidth / 2) + 'px';
                            if (this.lastDistanceToTopOfTable !== distanceToTopOfTable || !this.state.isWindowPastTableTop){
                                vizUtil.requestAnimationFrame(()=>{
                                    this.setState({ 'isWindowPastTableTop' : true });
                                });
                            }
                            done = true;
                        } else if (distanceToTopOfTable > 5 && distanceToTopOfTable <= this.props.fullWidthInitOffset){

                            //var fullWidthInitOffset = Math.min(this.props.fullWidthInitOffset, tableTopOffset + this.props.stickyHeaderTopOffset);
                            //var difScale = (fullWidthInitOffset - distanceToTopOfTable) / fullWidthInitOffset;
                            //pageTableContainer.style.transition = "margin-left .33s, margin-right .33s";
                            //pageTableContainer.style.marginLeft = pageTableContainer.style.marginRight = -((extraWidth * difScale) / 2) + 'px';
                            //if (this.lastDistanceToTopOfTable !== distanceToTopOfTable || !this.state.isWindowPastTableTop){
                            //    this.setState({ 'isWindowPastTableTop' : true });
                            //}

                        } else if (distanceToTopOfTable > this.props.fullWidthInitOffset){
                            pageTableContainer.style.transition = "margin-left .6s, margin-right .6s";
                            pageTableContainer.style.marginLeft = pageTableContainer.style.marginRight = '0px';
                            if ((this.lastDistanceToTopOfTable <= this.props.fullWidthInitOffset) || this.state.isWindowPastTableTop){
                                vizUtil.requestAnimationFrame(()=>{
                                    this.setState({ 'isWindowPastTableTop' : false });
                                });
                            }
                            done = true;
                        }
                        this.lastDistanceToTopOfTable = distanceToTopOfTable;

                    }
                    //console.log('V',scrollTop, tableTopOffset, distanceToTopOfTable);
                }
            }
            */

        if (!done){
            var isWindowPastTableTop = ShadowBorderLayer.isWindowPastTableTop(this.refs.innerContainer, windowHeight, scrollTop, tableTopOffset);
            if (isWindowPastTableTop !== this.state.isWindowPastTableTop){
                this.setState({ 'isWindowPastTableTop' : isWindowPastTableTop });
            }
        }


        //});


    }

    getTableLeftOffset(){
        return (this.refs && this.refs.innerContainer && layout.getElementOffset(this.refs.innerContainer).left) || null;
    }

    getTableContainerWidth(){
        return (this.refs && this.refs.innerContainer && this.refs.innerContainer.offsetWidth) || null;
    }

    getTableDims(){
        if (!SearchResultTable.isDesktopClientside()){
            return {
                'tableContainerWidth' : this.getTableContainerWidth(),
                'tableContainerScrollLeft' : null
            };
        }
        return {
            'tableContainerWidth' : this.getTableContainerWidth(),
            'tableContainerScrollLeft' : (this.refs && this.refs.innerContainer && typeof this.refs.innerContainer.scrollLeft === 'number') ? this.refs.innerContainer.scrollLeft : null,
            'tableLeftOffset' : this.getTableLeftOffset()
        };
    }

    setHeaderWidths(widths){
        if (!Array.isArray(widths)) throw new Error('widths is not an array');
        this.setState({ 'widths' : widths });
    }

    setResults(results, cb){
        this.setState({
            'results' : _.uniq(results, false, DimensioningContainer.getKeyForGraphResult)
        }, cb);
    }

    renderHeadersRow({style, isSticky, wasSticky, distanceFromTop, distanceFromBottom, calculatedHeight}){
        var { tableContainerWidth, tableContainerScrollLeft, tableLeftOffset } = this.cachedTableDims || this.getTableDims();
        return (
            <HeadersRow
                {..._.pick(this.props, 'columnDefinitions', 'sortBy', 'sortColumn', 'sortReverse', 'defaultMinColumnWidth', 'rowHeight', 'stickyHeaderTopOffset', 'renderDetailPane')}
                {..._.pick(this.state, 'mounted', 'results')}
                headerColumnWidths={this.state.widths} setHeaderWidths={this.setHeaderWidths}
                tableLeftOffset={tableLeftOffset} tableContainerWidth={tableContainerWidth}
                stickyStyle={style} isSticky={isSticky} />
        );
    }

    renderResults(fullRowWidth, tableContainerWidth, tableContainerScrollLeft, props = this.props){
        return _.map(this.state.results, (r, idx)=>{
            var key = DimensioningContainer.getKeyForGraphResult(r, idx);
            return (
                <ResultRow
                    {..._.pick(props, 'columnDefinitions', 'renderDetailPane', 'href', 'selectedFiles')} // selectedFiles passed to trigger re-render on PureComponent further down tree (DetailPane).
                    result={r} rowNumber={idx} data-key={key} key={key} mounted={this.state.mounted || false}
                    rowWidth={fullRowWidth} headerColumnWidths={this.state.widths}
                    toggleDetailPaneOpen={this.toggleDetailPaneOpen} openDetailPanes={this.state.openDetailPanes} setDetailHeight={this.setDetailHeight}
                    tableContainerWidth={tableContainerWidth} tableContainerScrollLeft={tableContainerScrollLeft} />
            );
        });
    }

    render(){
        var { columnDefinitions, stickyHeaderTopOffset } = this.props;
        var fullRowWidth = ResultRow.fullRowWidth(columnDefinitions, this.state.mounted, this.state.widths);
        var responsiveGridSize = !isServerSide() && this.state.mounted && layout.responsiveGridState();

        var { tableContainerWidth, tableContainerScrollLeft, tableLeftOffset } = this.cachedTableDims = this.getTableDims();

        var canLoadMore = (this.refs && this.refs.loadMoreAsYouScroll && this.refs.loadMoreAsYouScroll.state &&
            typeof this.refs.loadMoreAsYouScroll.state.canLoad === 'boolean') ? this.refs.loadMoreAsYouScroll.state.canLoad : null;

        if (responsiveGridSize === 'xs' || responsiveGridSize === 'sm') stickyHeaderTopOffset = 0;

        return (
            <div className="search-results-outer-container">
                <StickyContainer>
                    <div className={"search-results-container" + (canLoadMore === false ? ' fully-loaded' : '')}>
                        <div className="inner-container" ref="innerContainer" onScroll={this.onHorizontalScroll}>
                            <div className="scrollable-container" style={{ minWidth : fullRowWidth + 6 }}>
                                <Sticky topOffset={stickyHeaderTopOffset} children={this.renderHeadersRow} />
                                <LoadMoreAsYouScroll
                                    {..._.pick(this.props, 'href', 'limit', 'rowHeight', 'totalExpected')}
                                    {..._.pick(this.state, 'results', 'mounted', 'openDetailPanes')}
                                    setResults={this.setResults}
                                    tableContainerWidth={tableContainerWidth}
                                    tableContainerScrollLeft={tableContainerScrollLeft}
                                    ref="loadMoreAsYouScroll"
                                    innerContainerElem={this.refs && this.refs.innerContainer}
                                    //onVerticalScroll={this.onVerticalScroll}
                                    children={this.renderResults(fullRowWidth, tableContainerWidth, tableContainerScrollLeft)}
                                />
                            </div>
                        </div>
                        <ShadowBorderLayer tableContainerScrollLeft={tableContainerScrollLeft} tableContainerWidth={tableContainerWidth} fullRowWidth={fullRowWidth} innerContainerElem={this.refs && this.refs.innerContainer} isWindowPastTableTop={this.state.isWindowPastTableTop} />
                    </div>
                </StickyContainer>
                { canLoadMore === false ?
                    <div key="can-load-more" className="fin search-result-row">
                        <div className="inner">- <span>fin</span> -</div>
                    </div>
                : <div key="can-load-more" className="search-result-row empty-block"/> }
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
export class SearchResultTable extends React.PureComponent {

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
        'renderDetailPane' : PropTypes.func,
        'columnDefinitionOverrideMap' : PropTypes.object,
        'totalExpected' : PropTypes.number,
    }

    static defaultProps = {
        'columns' : {},
        'renderDetailPane' : function(result, rowNumber, width){ return <DefaultDetailPane result={result} />; },
        'defaultWidthMap' : DEFAULT_WIDTH_MAP,
        'defaultMinColumnWidth' : 55,
        'constantColumnDefinitions' : extendColumnDefinitions([
            { 'field' : 'display_title', },
            { 'field' : '@type', },
            { 'field' : 'lab.display_title', },
            { 'field' : 'date_created', },
            { 'field' : 'status', }
        ], defaultColumnDefinitionMap),
        'columnDefinitionOverrideMap' : null,
        'hiddenColumns' : null,
        'limit' : 25,
        'rowHeight' : 47,
        'stickyHeaderTopOffset' : -40,
        'fullWidthInitOffset' : 60,
        'fullWidthContainerSelectorString' : '.browse-page-container'
    }

    constructor(props){
        super(props);
        this.fullColumnDefinitions = this.fullColumnDefinitions.bind(this);
        this.state = {
            'columnDefinitions' : this.fullColumnDefinitions(props)
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.columns !== this.props.columns || nextProps.columnDefinitionOverrideMap !== this.props.columnDefinitionOverrideMap || nextProps.defaultWidthMap !== this.props.defaultWidthMap ||
            nextProps.hiddenColumns !== this.props.hiddenColumns || nextProps.constantColumnDefinitions !== this.props.constantColumnDefinitions) {
            this.setState({ 'columnDefinitions' : this.fullColumnDefinitions(nextProps) });
        }
    }

    fullColumnDefinitions(props = this.props){
        var columnDefinitions = columnsToColumnDefinitions(props.columns, props.constantColumnDefinitions, props.defaultWidthMap);

        _.forEach(columnDefinitions, function(colDef){
            if (colDef.widthMap && colDef.widthMap.sm && typeof colDef.widthMap.xs !== 'number'){
                colDef.widthMap.xs = colDef.widthMap.sm;
            }
        });

        if (Array.isArray(props.hiddenColumns)){ // Remove hidden columns, if any defined
            columnDefinitions = _.filter(columnDefinitions, function(colDef){
                if (props.hiddenColumns.indexOf(colDef.field) > -1) return false;
                return true;
            });
        }

        if (props.columnDefinitionOverrideMap) columnDefinitions = extendColumnDefinitions(columnDefinitions, props.columnDefinitionOverrideMap);
        return columnDefinitions;
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
        return (
            <layout.WindowResizeUpdateTrigger>
                <DimensioningContainer
                    {..._.omit(this.props, 'hiddenColumns', 'columnDefinitionOverrideMap', 'constantColumnDefinitions', 'defaultWidthMap')}
                    columnDefinitions={this.state.columnDefinitions} ref="container" />
            </layout.WindowResizeUpdateTrigger>
        );
    }
}
