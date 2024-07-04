'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import url from 'url';
import * as d3 from 'd3';
import ReactTooltip from 'react-tooltip';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';

import { console, layout, ajax, memoizedUrlParse, logger, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { format as formatDateTime } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';

/**
 * Various utilities for helping to draw area charts.
 *
 * @module
 */


/**
 * Requests URIs defined in `props.searchURIs`, saves responses to own state, then passes down responses into child component(s).
 * Can be extended.
 */
export class StatsViewController extends React.PureComponent {

    static defaultProps = {
        'searchURIs' : {},
        'shouldRefetchAggs' : function(pastProps, nextProps){
            return pastProps.session !== nextProps.session;
        }
    };

    constructor(props){
        super(props);
        this.performAggRequests  = this.performAggRequests.bind(this);
        this.stateToChildProps      = this.stateToChildProps.bind(this);
        this.state = {
            'mounted' : false,
            'loadingStatus' : 'loading',
            ..._.object(Object.keys(props.searchURIs).map(function(k){ return [ 'resp' + k, null ]; }))
        };
    }

    componentDidMount(){
        setTimeout(()=>{
            this.performAggRequests();
        }, 100);
        this.setState({ 'mounted' : true });
    }

    componentWillUnmount(){
        this.setState({ 'mounted' : false });
    }

    componentDidUpdate(pastProps){
        const { shouldRefetchAggs } = this.props;
        if (shouldRefetchAggs(pastProps, this.props)){
            this.setState({ 'loadingStatus' : 'loading' });
            this.performAggRequests();
        }
    }

    performAggRequests(){
        const { searchURIs, href } = this.props;
        const resultStateToSet = {};
        const hrefParts = href && memoizedUrlParse(href); // href may not be passed in.
        const ownHost = hrefParts && hrefParts.host;

        const chartUrisAsPairs = _.pairs(searchURIs);
        const chartUrisLen = chartUrisAsPairs.length;

        const failureCallback = () => this.setState({ 'loadingStatus' : 'failed' });

        let uponAllRequestsCompleteCallback = () => {
            this.setState(_.extend({ 'loadingStatus' : 'complete' }, resultStateToSet));
        };

        if (chartUrisLen > 1) {
            uponAllRequestsCompleteCallback = _.after(chartUrisLen, uponAllRequestsCompleteCallback);
        }

        const uponSingleRequestsCompleteCallback = function(key, uri, resp){
            if (resp && resp.code === 404){
                failureCallback();
                return;
            }
            resultStateToSet['resp' + key] = resp;
            uponAllRequestsCompleteCallback();
        };

        chartUrisAsPairs.forEach(([key, uri]) => {
            if (typeof uri === 'function') uri = uri(this.props);
            const uriHost = ownHost && url.parse(uri).host;
            ajax.load(
                uri, (r) => uponSingleRequestsCompleteCallback(key, uri, r), 'GET', failureCallback,
                // If testing from localhost and connecting to data.4dn (e.g. for testing), clear out some headers
                // to enable CORS
                null, {}, ownHost && uriHost !== ownHost ? ['Authorization', 'Content-Type'] : []
            );
        });

    }

    stateToChildProps(state = this.state){
        return _.object(_.pairs(state).filter(([key, value])=>{
            // Which key:value pairs to pass to children.
            if (key === 'mounted' || key === 'loadingStatus') return true;
            if (!state.mounted/* || state.loadingStatus !== 'complete'*/) return false; // Don't pass responses in until finished.
            return true;
        }));
    }

    render(){
        const { children } = this.props;
        const childProps = _.extend(_.omit(this.props, 'children'), this.stateToChildProps(this.state));

        return React.Children.map(children, function(c){ return React.cloneElement(c, childProps); });
    }

}


/** Extend & implement own render method. */
export class StatsChartViewAggregator extends React.PureComponent {

    static propTypes = {
        'aggregationsToChartData' : PropTypes.object.isRequired,
        'shouldReaggregate' : PropTypes.func,
        'cumulativeSum': PropTypes.bool,
        'children' : PropTypes.node.isRequired
    };

    constructor(props){
        super(props);
        const { cumulativeSum = false } = props;

        this.getRefWidth = this.getRefWidth.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
        this.handleToggleSmoothEdges = this.handleToggleSmoothEdges.bind(this);
        this.handleToggleCumulativeSum = this.handleToggleCumulativeSum.bind(this);
        this.generateAggsToState = this.generateAggsToState.bind(this);
        this.state = _.extend(this.generateAggsToState(props, {}), {
            'chartToggles' : {},
            'smoothEdges' : false,
            'cumulativeSum': cumulativeSum
        });

        this.elemRef = React.createRef();
    }

    componentDidUpdate(prevProps, prevState){
        const { shouldReaggregate } = this.props;
        var updateState = false,
            keys        = _.keys(this.props),
            i, k;

        for (i = 0; i < keys.length; i++){
            k = keys[i];
            // eslint-disable-next-line react/destructuring-assignment
            if (prevProps[k] !== this.props[k]){
                if (k !== 'aggregationsToChartData' && k !== 'externalTermMap'){
                    var k4 = k.slice(0,4);
                    if (k4 !== 'resp'){
                        continue;
                    }
                }
                // eslint-disable-next-line react/destructuring-assignment
                if (!this.props[k]) continue;
                console.warn('StatsChartViewBase > Will re-aggregate chart data based on change of ', k);
                updateState = true;
                break;
            }
        }

        if (typeof shouldReaggregate === 'function' && !updateState){
            updateState = shouldReaggregate(prevProps, this.props, prevState, this.state);
        }

        if (updateState){
            this.setState((currState) => this.generateAggsToState(this.props, currState));
        }
    }

    getRefWidth(){
        return this.elemRef && this.elemRef.current && this.elemRef.current.clientWidth;
    }

    handleToggle(key, cb){
        this.setState(function(currState){
            var nextTogglesState = _.extend({}, currState.chartToggles);
            nextTogglesState[key] = !(nextTogglesState[key]);
            return { 'chartToggles' : nextTogglesState };
        }, cb);
    }

    handleToggleSmoothEdges(smoothEdges, cb){
        this.setState(function(currState){
            if (typeof smoothEdges === 'boolean'){
                if (smoothEdges === currState.smoothEdges){
                    return null;
                }
                return { smoothEdges };
            } else {
                smoothEdges = !currState.smoothEdges;
                return { smoothEdges };
            }
        });
    }

    handleToggleCumulativeSum(cumulativeSum, cb){
        this.setState(function(currState){
            if (typeof cumulativeSum === 'boolean'){
                if (cumulativeSum === currState.cumulativeSum){
                    return null;
                }
                return { cumulativeSum };
            } else {
                cumulativeSum = !currState.cumulativeSum;
                return { cumulativeSum };
            }
        });
    }

    generateAggsToState(props, state){
        return _.object(_.map(_.keys(props.aggregationsToChartData), (key) =>
            [
                key,
                props.aggregationsToChartData[key].function(
                    props['resp' + props.aggregationsToChartData[key].requires],
                    _.extend({}, props, state)
                )
            ]
        ));
    }

    render(){
        const { children } = this.props;
        const width = this.getRefWidth() || null;
        const childProps = _.extend(
            {
                width,
                'onChartToggle': this.handleToggle,
                'onSmoothEdgeToggle': this.handleToggleSmoothEdges,
                'onCumulativeSumToggle': this.handleToggleCumulativeSum
            },
            this.props, this.state
        );
        let extendedChildren;
        if (Array.isArray(children)){
            extendedChildren = React.Children.map(children, (child) => React.cloneElement(child, childProps));
        } else {
            extendedChildren = React.cloneElement(children, childProps);
        }
        return <div className="stats-aggregation-container" ref={this.elemRef}>{ extendedChildren }</div>;
    }

}


/**
 * Optionally wrap a class or sub-class instance of StatsViewController (or ancestor which passes down props)
 * with this component and place a GroupByDropdown later in rendering tree to use/accept these props.
 * By default, change of 'groupBy' will cause StatsViewController to refetch aggregations/responses.
 */
export class GroupByController extends React.PureComponent {

    static getDerivedStateFromProps(props, state){
        const { groupByOptions, initialGroupBy, dateRangeOptions, initialDateRangePreset } = props;
        const { currentGroupBy, currentDateRangePreset } = state;

        const stateObj = {};
        if (typeof groupByOptions[currentGroupBy] === 'undefined') {
            if (typeof groupByOptions[initialGroupBy] === 'undefined') {
                logger.error('Changed props.groupByOptions but state.currentGroupBy and props.initialGroupBy are now both invalid.');
                throw new Error('Changed props.groupByOptions but state.currentGroupBy and props.initialGroupBy are now both invalid.');
            } else {
                _.extend(stateObj, { 'currentGroupBy': initialGroupBy });
            }
        }
        if (dateRangeOptions && typeof dateRangeOptions[currentDateRangePreset] === 'undefined') {
            if (typeof dateRangeOptions[initialDateRangePreset] === 'undefined') {
                logger.error('Changed props.dateRangeOptions but state.currentDateRangePreset and props.initialDateRangePreset are now both invalid.');
                throw new Error('Changed props.dateRangeOptions but state.currentDateRangePreset and props.initialDateRangePreset are now both invalid.');
            } else {
                _.extend(stateObj, { 'currentDateRangePreset': initialDateRangePreset });
            }
        }

        return _.isEmpty(stateObj) ? null : stateObj;
    }

    static defaultProps = {
        'groupByOptions' : {
            'award.center_title'                 : <span><i className="icon icon-fw fas icon-university"/>&nbsp; Center</span>,
            'award.project'                      : <span><i className="icon icon-fw fas icon-university"/>&nbsp; Project</span>,
            'lab.display_title'                  : <span><i className="icon icon-fw fas icon-users"/>&nbsp; Lab</span>,
            //'status'                             : <span><i className="icon icon-fw icon-circle"/>&nbsp; <span className="text-600">Current</span> Status</span>,
            'experiments_in_set.experiment_type.display_title' : <span><i className="icon fas icon-fw icon-chart-bar"/>&nbsp; Experiment Type</span>
        },
        'initialGroupBy' : 'award.center_title'
    };

    constructor(props){
        super(props);
        this.handleGroupByChange = this.handleGroupByChange.bind(this);
        this.handleDateRangeChange = this.handleDateRangeChange.bind(this);
        this.state = {
            'currentGroupBy': props.initialGroupBy,
            'currentDateRangePreset': props.initialDateRangePreset,
            'currentDateRangeFrom': props.initialDateRangeFrom || null,
            'currentDateRangeTo': props.initialDateRangeTo || null
        };
    }

    handleGroupByChange(field){
        this.setState(function(currState){
            if (currState.currentGroupBy === field){
                return null;
            }
            return { 'currentGroupBy' : field };
        });
    }

    handleDateRangeChange(field, from, to){
        this.setState(function(currState){
            if (currState.currentDateRangePreset === field &&
                currState.currentDateRangeFrom === from && currState.currentDateRangeTo === to) {
                return null;
            }

            return {
                'currentDateRangePreset': field,
                'currentDateRangeFrom': field !== 'custom' || from === '' ? null : from,
                'currentDateRangeTo': field !== 'custom' || to === '' ? null : to
            };
        });
    }

    render(){
        const { children } = this.props;
        const { currentGroupBy, currentDateRangePreset, currentDateRangeFrom, currentDateRangeTo } = this.state;
        const childProps = _.extend(
            _.omit(this.props, 'children', 'initialGroupBy', 'initialDateRangePreset', 'initialDateRangeFrom', 'initialDateRangeTo'),
            {
                currentGroupBy,
                'handleGroupByChange': this.handleGroupByChange,
                currentDateRangePreset, currentDateRangeFrom, currentDateRangeTo,
                'handleDateRangeChange': this.handleDateRangeChange
            });

        if (Array.isArray(children)){
            return <div>{ React.Children.map(children, (c) =>  React.cloneElement(c, childProps) ) }</div>;
        } else {
            return React.cloneElement(children, childProps);
        }
    }
}


export class GroupByDropdown extends React.PureComponent {

    static defaultProps = {
        'groupByTitle' : "Group By",
        'dateRangeTitle' : "Date",
        'buttonStyle' : {
            'marginLeft' : 12,
            'textAlign' : 'left'
        },
        'outerClassName' : "dropdown-container mb-15",
        'groupById' : "select_primary_charts_group_by",
        'dateRangeId' : "select_primary_charts_date_range"
    };

    constructor(props){
        super(props);
        this.onGroupBySelect = _.throttle(this.onGroupBySelect.bind(this), 1000);
        this.onDateRangeSelect = this.onDateRangeSelect.bind(this);
        //used as workaround to fix input type="date" unwanted reset bug
        this.state = {
            'tempDateRangeFrom': '',
            'tempDateRangeTo': ''
        };
    }

    componentDidUpdate(pastProps, pastState){
        const { currentDateRangeFrom, currentDateRangeTo } = this.props;
        // if current date range from/to changed, then force the temp values get reset
        if (pastProps.currentDateRangeFrom !== currentDateRangeFrom || pastProps.currentDateRangeTo !== currentDateRangeTo) {
            setTimeout(() => {
                this.setState({
                    'tempDateRangeFrom': currentDateRangeFrom,
                    'tempDateRangeTo': currentDateRangeTo
                });
            }, 750);
        }
    }

    onGroupBySelect(eventKey, evt){
        const { handleGroupByChange } = this.props;
        if (typeof handleGroupByChange !== 'function'){
            throw new Error("No handleGroupByChange function passed to GroupByDropdown.");
        }
        handleGroupByChange(eventKey);
    }

    onDateRangeSelect(presetField, from, to){
        const { handleDateRangeChange } = this.props;
        if (typeof handleDateRangeChange !== 'function'){
            throw new Error("No handleDateRangeChange function passed to DateRangeDropdown.");
        }
        handleDateRangeChange(presetField, from, to);
    }

    render(){
        const {
            groupByOptions, currentGroupBy, groupByTitle,
            dateRangeOptions, currentDateRangePreset, currentDateRangeFrom, currentDateRangeTo, dateRangeTitle,
            loadingStatus, buttonStyle, outerClassName, children,
            groupById, dateRangeId } = this.props;
        const { tempDateRangeFrom, tempDateRangeTo } = this.state;
        // group by
        const groupByOptionItems = _.map(_.pairs(groupByOptions), ([field, title]) =>
            <DropdownItem eventKey={field} key={field} active={field === currentGroupBy}>{ title }</DropdownItem>
        );
        const selectedGroupByValueTitle = loadingStatus === 'loading' ? <i className="icon icon-fw icon-spin fas icon-circle-notch"/> : groupByOptions[currentGroupBy];

        if (dateRangeOptions) {
            const dateRangeOptionItems = _.map(_.pairs(_.pick(dateRangeOptions, (value, key) => key !== 'custom')), ([field, title]) =>
                <DropdownItem eventKey={field} key={field} active={field === currentDateRangePreset}>{title}</DropdownItem>
            );
            const selectedDateRangeValueTitle = (loadingStatus === 'loading' ? <i className="icon icon-fw icon-spin fas icon-circle-notch" /> : dateRangeOptions[currentDateRangePreset]);
            const buttonStyleOverriden = buttonStyle && _.extend({}, buttonStyle, { 'marginLeft': 0 });
            return (
                <div className={outerClassName}>
                    <div className="dropdown-container-col col-12 col-lg-3 align-top">
                        <div className="text-500 d-block mb-1">{groupByTitle}</div>
                        <DropdownButton id={groupById} title={selectedGroupByValueTitle} onSelect={this.onGroupBySelect} style={buttonStyleOverriden} disabled={groupByOptionItems.length < 2}>
                            {groupByOptionItems}
                        </DropdownButton>
                    </div>
                    <div className="dropdown-container-col col-12 col-lg-6 align-top">
                        <div className="text-500 d-block mb-1">{dateRangeTitle}</div>
                        <div className="date-range">
                            {/* <span className="text-300 pt-05">Presets</span> */}
                            <DropdownButton id={dateRangeId} title={selectedDateRangeValueTitle} onSelect={(e) => this.onDateRangeSelect(e, null, null)} style={buttonStyleOverriden}>
                                {dateRangeOptionItems}
                            </DropdownButton>
                            <div className="d-flex custom-date-range">
                                <span className="text-300 pt-05 d-none d-md-inline-block mr-05">Custom:</span>
                                <input id="submission_data_range_from" type="date"
                                    className="form-control" value={tempDateRangeFrom || ''}
                                    onChange={(e) => { this.setState({ "tempDateRangeFrom": e.target.value }); }}
                                    onBlur={(e) => this.onDateRangeSelect('custom', tempDateRangeFrom, currentDateRangeTo)} />
                                <input id="submission_data_range_to" type="date"
                                    className="form-control" value={tempDateRangeTo || ''}
                                    onChange={(e) => { this.setState({ "tempDateRangeTo": e.target.value }); }}
                                    onBlur={(e) => this.onDateRangeSelect('custom', currentDateRangeFrom, tempDateRangeTo)} />
                            </div>
                        </div>
                    </div>
                    <div className="dropdown-container-col col-12 col-lg-3 align-top pl-2">
                        <div className="text-500 d-block mb-1">Settings</div>
                        {children}
                    </div>
                </div>
            );
        }

        return (
            <div className={outerClassName}>
                <span className="text-500">{groupByTitle}</span>
                <DropdownButton id={groupById} title={selectedGroupByValueTitle} onSelect={this.onGroupBySelect} style={buttonStyle} disabled={groupByOptionItems.length < 2}>
                    {groupByOptionItems}
                </DropdownButton>
                {children}
            </div>
        );
    }
}


/** Wraps AreaCharts or AreaChartContainers in order to provide shared color scales. */
export class ColorScaleProvider extends React.PureComponent {

    static defaultProps = {
        'className'             : 'chart-group clearfix',
        'width'                 : null,
        'chartMargin'           : { 'top': 30, 'right': 2, 'bottom': 30, 'left': 50 },
        // Only relevant if --not-- providing own colorScale and letting this component create/re-create one.
        'resetScalesWhenChange' : null,
        'resetScaleLegendWhenChange' : null,
        'colorScale'            : null
    };

    constructor(props){
        super(props);
        this.resetColorScale = this.resetColorScale.bind(this);
        this.updateColorStore = this.updateColorStore.bind(this);

        var colorScale = props.colorScale || d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemePastel1));
        this.state = { colorScale, 'colorScaleStore' : {} };
    }

    componentDidUpdate(pastProps){
        const { resetScalesWhenChange, resetScaleLegendWhenChange } = this.props;
        if (resetScalesWhenChange !== pastProps.resetScalesWhenChange){
            console.warn("Color scale reset");
            this.resetColorScale();
        } else if (resetScaleLegendWhenChange !== pastProps.resetScaleLegendWhenChange){
            console.warn("Color scale reset (LEGEND ONLY)");
            this.resetColorScale(true);
        }
    }

    resetColorScale(onlyResetLegend=false){
        if (onlyResetLegend){
            this.setState({ 'colorScaleStore' : {} });
            return;
        }

        const { colorScale : propColorScale } = this.props;
        let colorScale;
        const colorScaleStore = {};

        if (typeof propColorScale === 'function'){
            colorScale = propColorScale; // Does nothing.
        } else {
            colorScale = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemePastel1));
        }

        this.setState({ colorScale, colorScaleStore });
    }

    updateColorStore(term, color){
        this.setState(function({ colorScaleStore }){
            if (colorScaleStore && colorScaleStore[term] && colorScaleStore[term] === color){
                return null;
            }
            var nextColorScaleStore = _.clone(colorScaleStore);
            nextColorScaleStore[term] = color;
            return { 'colorScaleStore' : nextColorScaleStore };
        });
    }

    render(){
        const { children, className } = this.props;
        const newChildren = React.Children.map(children, (child, childIndex) => {
            if (!child) return null;
            if (typeof child.type === 'string') {
                return child; // Not component instance
            }
            return React.cloneElement(
                child,
                _.extend({}, _.omit(this.props, 'children'), { 'updateColorStore' : this.updateColorStore }, this.state)
            );
        });
        return <div className={className || null}>{ newChildren }</div>;
    }

}


export class HorizontalD3ScaleLegend extends React.Component {

    constructor(props){
        super(props);
        this.renderColorItem = this.renderColorItem.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState){
        const { colorScaleStore } = this.props;
        //if (nextProps.colorScale !== this.props.colorScale){
        if (nextProps.colorScaleStore !== colorScaleStore){
            var currTerms = _.keys(colorScaleStore),
                nextTerms = _.keys(nextProps.colorScaleStore);

            // Don't update if no terms in next props; most likely means colorScale[Store] has been reset and being repopulated.
            if (currTerms.length > 0 && nextTerms.length === 0){
                return false;
            }
        }
        //}

        // Emulates PureComponent
        var propKeys = _.keys(nextProps);
        for (var i = 0; i < propKeys.length; i++){
            // eslint-disable-next-line react/destructuring-assignment
            if (nextProps[propKeys[i]] !== this.props[propKeys[i]]) {
                return true;
            }
        }
        return false;
    }

    componentDidUpdate(pastProps, pastState) {
        setTimeout(function () {
            ReactTooltip.rebuild();
        }, 1000);
    }

    renderColorItem([term, color], idx, all){
        return (
            <div className="col-sm-4 col-md-3 col-lg-2 mb-03 text-truncate" key={term} data-tip={term.length > 30 ? term : null}>
                <div className="color-patch" style={{ 'backgroundColor': color }} data-term={term} />
                { term }
            </div>
        );
    }

    render(){
        var { colorScale, colorScaleStore } = this.props;
        if (!colorScale || !colorScaleStore) return null;
        //do not render if legend has too many items
        const pairs = _.pairs(colorScaleStore);
        if(pairs.length > 100) { return null; }

        return (
            <div className="legend mb-27">
                <div className="row">{ _.map(_.sortBy(pairs, function([term, color]){ return term.toLowerCase(); }), this.renderColorItem) }</div>
            </div>
        );
    }

}


export class ChartTooltip extends React.PureComponent {

    constructor(props){
        super(props);
        this.state = _.extend({
            'leftPosition'  : 0,
            'visible'       : false,
            'mounted'       : false,
            'contentFxn'    : null,
            'topPosition'   : 0
        }, props.initialState || {});
    }

    render(){
        const { margin, showTooltipOnHover = true } = this.props;
        const { leftPosition, visible, contentFxn, topPosition, chartWidth, chartHeight } = this.state;
        return (
            <div className={"chart-tooltip" + (!showTooltipOnHover ? " requires-click" : "")} style={_.extend(_.pick(margin, 'left', 'top'), {
                'transform' : 'translate(' + Math.min(leftPosition, chartWidth - 5) + 'px, 0px)',
                'display' : visible ? 'block' : 'none',
                'bottom' : margin.bottom + 5
            })}>
                <div className="line"/>
                <div className="line-notch" style={{ 'top' : topPosition }}>
                    { chartWidth && topPosition < chartHeight ? [
                        <div key="before" className="horiz-line-before" style={{ 'width' : (leftPosition - 5), 'left' : -(leftPosition - 5) }}/>,
                        <div key="after" className="horiz-line-after" style={{ 'right' : - ((chartWidth - leftPosition) - 4) }}/>
                    ] : null }
                </div>
                { contentFxn && contentFxn(this.props, this.state) }
            </div>
        );
    }

}


export class AreaChart extends React.PureComponent {

    static mergeStackedDataForExtents(d3Data){
        return d3.merge(_.map(d3Data, function(d2){
            return _.map(d2, function(d){
                return d.data;
            });
        }));
    }

    static calculateXAxisExtents(mergedData, xDomain){
        var xExtents = [null, null];

        if (xDomain && xDomain[0]){
            xExtents[0] = xDomain[0];
        } else {
            xExtents[0] = d3.min(mergedData, function(d){ return d.date; });
        }

        if (xDomain && xDomain[1]){
            xExtents[1] = xDomain[1];
        } else {
            xExtents[1] = d3.max(mergedData, function(d){ return d.date; });
        }

        return xExtents;
    }

    static calculateYAxisExtents(mergedData, yDomain){
        var yExtents = [null, null];

        if (yDomain && typeof yDomain[0] === 'number'){
            yExtents[0] = yDomain[0];
        } else {
            yExtents[0] = d3.min(mergedData, function(d){ return d.total; });
        }

        if (yDomain && typeof yDomain[1] === 'number'){
            yExtents[1] = yDomain[1];
        } else {
            yExtents[1] = d3.max(mergedData, function(d){ return d.total; });
        }

        return yExtents;
    }

    static childKeysFromData(data){
        return Array.from(_.reduce(data, function(m,d){
            _.forEach(d.children || [], function(child){ m.add(child.term); });
            return m;
        }, new Set()));
    }

    /** Convert timestamps to D3 date objects.  */
    static correctDatesInData(origData, d3TimeFormat = '%Y-%m-%d'){
        const parseTime = d3.utcParse(d3TimeFormat);
        return _.map(origData, (d) => {
            var formattedDate = (new Date(d.date.slice(0,10))).toISOString().slice(0,10);
            return _.extend({}, d, {
                'date' : parseTime(formattedDate),
                'origDate' : formattedDate
            });
        });
    }

    static stackData(origData, d3TimeFormat = '%Y-%m-%d'){
        const stackGen = d3.stack().value(function(d, key){
            var currChild = _.findWhere(d.children || [], { 'term' : key });
            if (currChild) return currChild.total;
            return 0;
        });

        stackGen.keys(AreaChart.childKeysFromData(origData));

        const formattedDateData = AreaChart.correctDatesInData(origData, d3TimeFormat);
        return stackGen(formattedDateData);
    }

    static getDerivedStateFromProps(props, state){
        return {
            'colorScale' : props.colorScale || state.colorScale || d3.scaleOrdinal(d3.schemeCategory10)
        };
    }

    static defaultProps = {
        'chartMargin'           : { 'top': 30, 'right': 2, 'bottom': 30, 'left': 50 },
        'data'                  : null,
        'd3TimeFormat'          : '%Y-%m-%d', // TODO: Remove prop?
        'stackChildren'         : true,
        'height'                : 300,
        'yAxisLabel'            : 'Count',
        'yAxisScale'            : 'Linear', // Must be one of 'Linear', 'Log', 'Pow'
        'yAxisPower'            : null,
        'xDomain'               : [ new Date('2017-03-01'), null ],
        'yDomain'               : [ 0, null ],
        'curveFxn'              : d3.curveStepAfter,
        'transitionDuration'    : 1500,
        'colorScale'            : null, // d3.scaleOrdinal(d3.schemeCategory10)
        'tooltipDataProperty'   : 'total',
        'showTooltipOnHover'    : true,
        'shouldDrawNewChart'    : function(pastProps, nextProps, pastState, nextState){
            var shouldDrawNewChart = false;

            if (pastProps.data !== nextProps.data) shouldDrawNewChart = true;
            if (pastProps.curveFxn !== nextProps.curveFxn) shouldDrawNewChart = true;
            if (pastProps.colorScale !== nextProps.colorScale) shouldDrawNewChart = true;
            if (shouldDrawNewChart) console.info('Will redraw chart');

            return shouldDrawNewChart;
        }
    };

    constructor(props){
        super(props);
        _.bindAll(this, 'getInnerChartWidth', 'getInnerChartHeight', 'xScale', 'yScale',
            'commonDrawingSetup', 'drawNewChart', 'updateTooltip', 'removeTooltip', 'updateExistingChart'
        );

        this.updateExistingChart = _.debounce(this.updateExistingChart, 500);

        // Tiny performance boost via memoizing
        this.mergeStackedDataForExtents = memoize(AreaChart.mergeStackedDataForExtents);
        this.calculateXAxisExtents      = memoize(AreaChart.calculateXAxisExtents);
        this.calculateYAxisExtents      = memoize(AreaChart.calculateYAxisExtents);
        this.childKeysFromData          = memoize(AreaChart.childKeysFromData);
        this.stackData                  = memoize(AreaChart.stackData);

        // Will be cached here later from d3.select(this.refs..)
        this.svg = null;

        this.state = {
            'drawingError'  : false,
            'drawn'         : false
        };

        this.svgRef = React.createRef();
        this.tooltipRef = React.createRef();
    }

    componentDidMount(){
        requestAnimationFrame(this.drawNewChart);
    }

    componentDidUpdate(pastProps, pastState){
        const { shouldDrawNewChart : shouldDrawNewChartFxn } = this.props;
        const shouldDrawNewChart = shouldDrawNewChartFxn(pastProps, this.props);

        if (shouldDrawNewChart){
            setTimeout(()=>{ // Wait for other UI stuff to finish updating, e.g. element widths.
                requestAnimationFrame(()=>{
                    this.destroyExistingChart();
                    this.drawNewChart();
                });
            }, 300);
        } else {
            setTimeout(this.updateExistingChart, 300);
        }
    }

    getXAxisGenerator(useChartWidth = null){
        const { xDomain, data, d3TimeFormat } = this.props;
        const stackedData = this.stackData(data, d3TimeFormat);
        const mergedDataForExtents = this.mergeStackedDataForExtents(stackedData);
        const xExtents = this.calculateXAxisExtents(mergedDataForExtents, xDomain);

        const chartWidth = useChartWidth || this.innerWidth || this.getInnerChartWidth();
        const yearDiff  = (xExtents[1] - xExtents[0]) / (60 * 1000 * 60 * 24 * 365);
        const widthPerYear = chartWidth / yearDiff;


        if (widthPerYear < 3600){
            var monthsTick;
            if (widthPerYear < 50) monthsTick = 24;
            else if (widthPerYear >= 50 && widthPerYear < 200) monthsTick = 12;
            else if (widthPerYear >= 200 && widthPerYear < 300) monthsTick = 6;
            else if (widthPerYear >= 300 && widthPerYear < 400) monthsTick = 4;
            else if (widthPerYear >= 400 && widthPerYear < 500) monthsTick = 3;
            else if (widthPerYear >= 500 && widthPerYear < 750) monthsTick = 2;
            else if (widthPerYear >= 750) monthsTick = 1;

            return function(x){
                return d3.axisBottom(x).ticks(d3.utcMonth.every(monthsTick));
            };
        } else if (widthPerYear >= 3600){
            var widthPerMonth = widthPerYear / 12, daysTick;
            if (widthPerMonth > 1500){
                daysTick = 1;
            } else if (widthPerMonth > 1000){
                daysTick = 3;
            } else if (widthPerMonth > 600){
                daysTick = 7;
            } else {
                daysTick = 14;
            }

            return function(x){
                return d3.axisBottom(x).ticks(d3.utcDay.every(daysTick));
            };
        }
    }

    getInnerChartWidth(){
        var { width, margin } = this.props;
        this.svg = this.svg || d3.select(this.svgRef.current);
        this.innerWidth = (  width || parseInt( this.svg.style('width') )  ) - margin.left - margin.right;
        return this.innerWidth;
    }

    getInnerChartHeight(){
        var { height, margin } = this.props;
        this.svg = this.svg || d3.select(this.svgRef.current);
        this.innerHeight = (  height || parseInt( this.svg.style('height') )  ) - margin.top - margin.bottom;
        return this.innerHeight;
    }

    xScale(width){
        const { xDomain, data, d3TimeFormat } = this.props;
        //const { stackedData } = this.state;
        const stackedData = this.stackData(data, d3TimeFormat);
        const mergedDataForExtents = this.mergeStackedDataForExtents(stackedData);
        const xExtents = this.calculateXAxisExtents(mergedDataForExtents, xDomain);
        return d3.scaleUtc().rangeRound([0, width]).domain(xExtents);
    }

    yScale(height){
        const { yAxisScale, yAxisPower, yDomain, data, d3TimeFormat } = this.props;
        //const { stackedData } = this.state;
        const stackedData = this.stackData(data, d3TimeFormat);
        const mergedDataForExtents = this.mergeStackedDataForExtents(stackedData);
        const yExtents = this.calculateYAxisExtents(mergedDataForExtents, yDomain);
        const scale = d3['scale' + yAxisScale]().rangeRound([height, 0]).domain(yExtents);
        if (yAxisScale === 'Pow' && yAxisPower !== null){
            scale.exponent(yAxisPower);
        }
        return scale;
    }

    commonDrawingSetup(){
        const { curveFxn, data, d3TimeFormat } = this.props;
        const stackedData = this.stackData(data, d3TimeFormat);
        const svg         = this.svg || d3.select(this.svgRef.current);
        const width       = this.getInnerChartWidth();
        const height      = this.getInnerChartHeight();
        const x           = this.xScale(width);
        const y           = this.yScale(height);
        const bottomAxisGenerator = this.getXAxisGenerator(width)(x);
        const area        = d3.area()
            .x ( function(d){ return x(d.date || d.data.date);  } )
            .curve(curveFxn)
            //.x0 ( function(d){ return x(d.date || d.data.date);  } )
            //.x1 ( function(d){ return x(d.date || d.data.date) + 10;  } )
            .y0( function(d){ return Array.isArray(d) ? y(d[0]) : y(0); } )
            .y1( function(d){ return Array.isArray(d) ? y(d[1]) : y(d.total || d.data.total); } );

        const rightAxisGenerator  = d3.axisRight(y).tickSize(width);
        const rightAxisFxn        = function(g){
            g.call(rightAxisGenerator);
            g.select('.domain').remove();
            g.selectAll('.tick > text').remove();
            g.selectAll('.tick > line')
                .attr("class", "right-axis-tick-line")
                .attr('opacity', 0.2)
                .attr("stroke", "#777")
                .attr("stroke-dasharray", "2,2");
        };

        this.svg = svg;

        return { svg, x, y, width, height, area, bottomAxisGenerator, rightAxisFxn, stackedData };
    }

    /**
     * Draws D3 area chart using the DOM a la https://bl.ocks.org/mbostock/3883195 in the rendered <svg> element.
     *
     * TODO: We should try to instead render out <path>, <g>, etc. SVG elements directly out of React to be more Reactful and performant.
     * But this can probably wait (?).
     */
    drawNewChart(){
        if (!this.svgRef.current) {
            this.setState({ 'drawingError' : true });
            return;
        }
        if (this.drawnD3Elements) {
            logger.error('Drawn chart already exists. Exiting.');;
            this.setState({ 'drawingError' : true });
            return;
        }

        const { yAxisLabel, margin, updateColorStore } = this.props;
        const { stackedData, svg, y, height, area, bottomAxisGenerator, rightAxisFxn } = this.commonDrawingSetup();
        const drawn = { svg };
        const { colorScale } = this.state;

        drawn.root = svg.append("g").attr('transform', "translate(" + margin.left + "," + margin.top + ")");

        drawn.layers = drawn.root.selectAll('.layer')
            .data(stackedData)
            .enter()
            .append('g')
            .attr('class', 'layer');

        drawn.path = drawn.layers.append('path')
            .attr('class', 'area')
            .attr('data-term', function(d){
                return (d.data || d).key;
            })
            .style('fill', function(d){
                var term = (d.data || d).key,
                    color = colorScale(term);
                if (typeof updateColorStore === 'function'){
                    updateColorStore(term, color);
                }
                return color;
            })
            .attr('d', area);

        this.drawAxes(drawn, { height, bottomAxisGenerator, y, yAxisLabel, rightAxisFxn });
        this.drawnD3Elements = drawn;

        setTimeout(function(){
            ReactTooltip.rebuild();
        }, 10);

    }

    updateTooltip(evt){
        const { chartMargin, yAxisLabel, dateRoundInterval, tooltipDataProperty, data, d3TimeFormat } = this.props;
        const { colorScale } = this.state;
        const stackedData   = this.stackData(data, d3TimeFormat);
        const svg           = this.svg || d3.select(this.svgRef.current); // SHOULD be same as evt.target.
        const tooltip       = this.tooltipRef.current;
        let [ mX, mY ]      = d3.pointer(evt); // [x: number, y: number]
        const chartWidth    = this.innerWidth || this.getInnerChartWidth();
        const chartHeight   = this.innerHeight || this.getInnerChartHeight();
        const currentTerm   = (evt && evt.target.getAttribute('data-term')) || null;
        const tdp           = tooltipDataProperty || 'total';

        let dateFormatFxn = function(aDate){
            const isoStr = aDate.toISOString();
            return formatDateTime(isoStr, 'date-sm');
        };

        if (dateRoundInterval === 'month'){
            dateFormatFxn = function(aDate){
                const isoStr = aDate.toISOString();
                return formatDateTime(isoStr, 'date-month');
            };
        } else if (dateRoundInterval === 'week'){
            // TODO maybe. Currently just keeps day format.
        } else if (dateRoundInterval === 'year'){
            dateFormatFxn = function(aDate){
                return aDate.getFullYear();
            };
        }

        mX -= (chartMargin.left || 0);
        mY -= (chartMargin.top  || 0);

        if (mX < 0 || mY < 0 || mX > chartWidth + 1 || mY > chartHeight + 1){
            return this.removeTooltip();
        }

        const xScale = this.xScale(chartWidth);
        const yScale = this.yScale(chartHeight);
        const hovDate = xScale.invert(mX);
        const dateString = dateFormatFxn(hovDate);
        const leftPosition = xScale(hovDate);
        const isToLeft = leftPosition > (chartWidth / 2);
        const maxTermsVisible = Math.floor((chartHeight - 60) / 18);
        const stackedLegendItems = _.filter(_.map(stackedData, function (sD) {
            return _.find(sD, function (stackedDatum, i, all) {
                var curr = stackedDatum.data,
                    next = (all[i + 1] && all[i + 1].data) || null;

                if (hovDate > curr.date && (!next || next.date >= hovDate)) {
                    return true;
                }
                return false;
            });
        }));
        const total = parseInt(((stackedLegendItems.length > 0 && stackedLegendItems[0].data && stackedLegendItems[0].data[tdp]) || 0) * 100) / 100;
        let termChildren = _.sortBy(_.filter((stackedLegendItems.length > 0 && stackedLegendItems[0].data && stackedLegendItems[0].data.children) || [], function (c) {
            if (c.term === null) return false;
            return c && c[tdp] > 0;
        }), function(c){ return -c[tdp]; });
        const isEmpty = termChildren.length === 0;
        const topPosition = yScale(total);

        // It's anti-pattern for component to update its children using setState instead of passing props as done here.
        // However _this_ component is a PureComponent which redraws or at least transitions D3 chart upon any update,
        // so performance/clarity-wise this approach seems more desirable.
        tooltip.setState({
            leftPosition, topPosition, chartWidth, chartHeight,
            'visible'       : true,
            'contentFxn'    : function(tProps, tState){

                if (termChildren.length > maxTermsVisible){
                    var lastTermIdx             = maxTermsVisible - 1,
                        currentActiveItemIndex  = _.findIndex(termChildren, function(c){ return c.term === currentTerm; });

                    if (currentActiveItemIndex && currentActiveItemIndex > lastTermIdx){
                        var temp = termChildren[lastTermIdx];
                        termChildren[lastTermIdx] = termChildren[currentActiveItemIndex];
                        termChildren[currentActiveItemIndex] = temp;
                    }
                    var termChildrenRemainder = termChildren.slice(maxTermsVisible),
                        totalForRemainder = 0;

                    _.forEach(termChildrenRemainder, function(r){
                        totalForRemainder += r[tdp];
                    });
                    termChildren = termChildren.slice(0, maxTermsVisible);
                    var newChild = { 'term' : termChildrenRemainder.length + " More...", "noColor" : true };
                    newChild[tdp] = totalForRemainder;
                    termChildren.push(newChild);
                }
                const hasCloseButton = (tProps.showTooltipOnHover === false && typeof tProps.removeTooltip === 'function');

                return (
                    <div className={"label-bg" + (isToLeft ? ' to-left' : '') + (hasCloseButton ? ' has-close-button' : '')}>
                        {hasCloseButton &&
                            <button className="close float-left" type="button" onClick={(e) => { e.stopPropagation(); tProps.removeTooltip(); }}>
                                <span>×</span>
                            </button>
                        }
                        <h5 className={"text-500 mt-0 clearfix" + (isEmpty ? ' mb-0' : ' mb-11')}>
                            { dateString }{ total ? <span className="text-700 text-large pull-right" style={{ marginTop: -2 }}>&nbsp;&nbsp; { total }</span> : null }
                        </h5>
                        { !isEmpty ?
                            <table className="current-legend">
                                <tbody>
                                    { _.map(termChildren, function(c, i){
                                        const handleOnClick = (e) => { e.stopPropagation(); tProps.removeTooltip(); };
                                        const term =
                                            object.isValidAtIDFormat(c.term) ?
                                                <a key={c.term} href={c.term} target="_blank" rel="noreferrer" onClick={handleOnClick}>{c.term}</a> : c.term;
                                        return (
                                            <tr key={c.term || i} className={currentTerm === c.term ? 'active' : null}>
                                                <td className="patch-cell">
                                                    <div className="color-patch" style={{ 'backgroundColor' : c.noColor ? 'transparent' : colorScale(c.term) }}/>
                                                </td>
                                                <td className="term-name-cell">{ term }</td>
                                                <td className="term-name-total">
                                                    { c[tdp] % 1 > 0 ?  Math.round(c[tdp] * 100) / 100 : c[tdp] }
                                                    { yAxisLabel && yAxisLabel !== 'Count' ? ' ' + yAxisLabel : null }
                                                </td>
                                            </tr>
                                        );
                                    }) }
                                </tbody>
                            </table>
                            : null }
                    </div>
                );
            }
        });


    }

    removeTooltip(){
        const tooltip = this.tooltipRef.current;
        tooltip.setState({ 'visible' : false });
    }

    drawAxes(drawn, reqdFields){
        var { height, bottomAxisGenerator, y, yAxisLabel, rightAxisFxn } = reqdFields;
        if (!drawn){
            drawn = this.drawnD3Elements || {};
        }

        drawn.xAxis = drawn.root.append('g')
            .attr("transform", "translate(0," + height + ")")
            .call(bottomAxisGenerator);

        drawn.yAxis = drawn.root.append('g')
            .call(d3.axisLeft(y));

        drawn.yAxis.append('text')
            .attr("fill", "#000")
            .attr("x", 0)
            .attr("y", -20)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text(yAxisLabel);

        drawn.rightAxis = drawn.root.append('g').call(rightAxisFxn);

        return drawn;
    }

    /**
     * Use to delete SVG before drawing a new one,
     * e.g. in response to a _big_ change that can't easily 'update'.
     */
    destroyExistingChart(){
        var drawn = this.drawnD3Elements;
        if (!drawn || !drawn.svg) {
            console.error('No D3 SVG to clear.');
            return;
        }
        drawn.svg.selectAll('*').remove();
        delete this.drawnD3Elements;
    }

    updateExistingChart(){

        // TODO:
        // If width or height has changed, transition existing DOM elements to larger dimensions
        // If data has changed.... decide whether to re-draw graph or try to transition it.

        if (!this.drawnD3Elements) {
            console.error('No existing elements to transition.');
            // throw new Error('No existing elements to transition.');
            return;
        }

        const { transitionDuration } = this.props;
        const { stackedData, y, height, area, bottomAxisGenerator, rightAxisFxn } = this.commonDrawingSetup();

        const drawn = this.drawnD3Elements;

        requestAnimationFrame(()=>{

            drawn.xAxis
                .transition().duration(transitionDuration)
                .attr("transform", "translate(0," + height + ")")
                .call(bottomAxisGenerator);

            drawn.yAxis
                .transition().duration(transitionDuration)
                .call(d3.axisLeft(y));

            drawn.rightAxis.remove();
            drawn.rightAxis = drawn.root.append('g').call(rightAxisFxn);

            drawn.root.selectAll('.layer')
                .data(stackedData)
                .selectAll('path.area')
                .transition()
                .duration(transitionDuration)
                .attr('d', area);

        });

    }

    render(){
        const { data, width, height, transitionDuration, margin, showTooltipOnHover = true } = this.props;
        if (!data || this.state.drawingError) {
            return <div>Error</div>;
        }
        const passProps = { margin, showTooltipOnHover, removeTooltip: this.removeTooltip };
        let containerEvents = null;
        if (showTooltipOnHover) {
            containerEvents = { onMouseMove: this.updateTooltip, onMouseOut: this.removeTooltip };
        } else {
            containerEvents = { onClick: this.updateTooltip };
        }
        return (
            <div className="area-chart-inner-container" {...containerEvents}>
                <svg ref={this.svgRef} className="area-chart" width={width || "100%"} height={height || null} style={{
                    height, 'width' : width || '100%',
                    'transition' : 'height ' + (transitionDuration / 1000) + 's' + (height >= 500 ? ' .75s' : ' 1.025s')
                }} />
                <ChartTooltip {...passProps} ref={this.tooltipRef} />
            </div>
        );
    }

}


export function LoadingIcon(props){
    const { children } = props;
    return (
        <div className="mt-5 mb-5 text-center">
            <i className="icon icon-fw icon-spin icon-circle-notch icon-2x fas" style={{ opacity : 0.5 }}/>
            <h5 className="text-400">{ children }</h5>
        </div>
    );
}
LoadingIcon.defaultProps = { 'children' : "Loading Chart Data" };

export function ErrorIcon(props){
    const { children } = props;
    return (
        <div className="mt-5 mb-5 text-center">
            <i className="icon icon-fw icon-times icon-2x fas"/>
            <h5 className="text-400">{ children }</h5>
        </div>
    );
}
ErrorIcon.defaultProps = { 'children' : "Loading failed. Please try again later." };


export class AreaChartContainer extends React.Component {

    static isExpanded(props){
        const { windowWidth, chartToggles, id } = props;
        const gridState = layout.responsiveGridState(windowWidth);
        if (gridState && gridState !== 'xl') return false;
        return !!((chartToggles || {})[id]);
    }

    static defaultProps = {
        'colorScale' : null,
        'extraButtons' : [],
        'legend': null
    };

    constructor(props){
        super(props);
        this.buttonSection = this.buttonSection.bind(this);
        this.toggleExpanded = _.throttle(this.toggleExpanded.bind(this), 1000);
        this.expandButton = this.expandButton.bind(this);

        this.elemRef = React.createRef();
    }

    componentDidMount(){
        const { width } = this.props;
        if (typeof width === 'number' && width) return;
        setTimeout(()=>{ // Update w. new width.
            this.forceUpdate();
        }, 0);
    }

    componentDidUpdate(pastProps){
        const { defaultColSize, width } = this.props;
        if (
            !(typeof width === 'number' && width) &&
            (pastProps.defaultColSize !== defaultColSize || AreaChartContainer.isExpanded(pastProps) !== AreaChartContainer.isExpanded(this.props))
        ){
            setTimeout(()=>{ // Update w. new width.
                this.forceUpdate();
            }, 0);
        }
    }

    toggleExpanded(e){
        const { onToggle, id } = this.props;
        return typeof onToggle === 'function' && id && onToggle(id);
    }

    getRefWidth(){
        return this.elemRef && this.elemRef.current && this.elemRef.current.clientWidth;
    }

    expandButton(){
        const { windowWidth } = this.props;
        const gridState = layout.responsiveGridState(windowWidth);
        if (['xs', 'sm'].indexOf(gridState) > -1) return null;
        const expanded = AreaChartContainer.isExpanded(this.props);
        return (
            <button type="button" className="btn btn-outline-dark btn-sm" onClick={this.toggleExpanded}>
                <i className={"icon icon-fw fas icon-search-" + (expanded ? 'minus' : 'plus')}/>
            </button>
        );
    }

    buttonSection(){
        const { extraButtons } = this.props;
        return (
            <div className="pull-right mt-07">
                { extraButtons }
                { this.expandButton() }
            </div>
        );
    }

    render(){
        const { title, subTitle, children, width, defaultHeight, colorScale, chartMargin, updateColorStore, legend } = this.props;

        const expanded = AreaChartContainer.isExpanded(this.props);
        const useWidth = width || this.getRefWidth();
        const chartInnerWidth = expanded ? useWidth * 3 : useWidth;
        const useHeight = expanded ? 500 : (defaultHeight || AreaChart.defaultProps.height);

        let visualToShow;

        if (typeof useWidth === 'number' && useWidth){
            visualToShow = React.cloneElement(children, {
                colorScale, updateColorStore,
                'width'             : chartInnerWidth,
                'height'            : useHeight,
                'margin'            : chartMargin || children.props.margin || null
            });
        } else {
            // If no width yet, just for stylistic purposes, don't render chart itself.
            visualToShow = <LoadingIcon>Initializing...</LoadingIcon>;
        }

        let legendToShow;
        if (legend) {
            const childProps = {
                ..._.pick(this.props,
                    'chartMargin', 'className', 'colorScale', 'colorScaleStore', 'resetScaleLegendWhenChange',
                    'resetScalesWhenChange', 'updateColorStore'), width: useWidth
            };
            legendToShow = React.cloneElement(legend, childProps);
        }

        return (
            <div className="mt-2">
                <div className="text-300 clearfix">
                    { this.buttonSection() }
                    { title }
                </div>
                {subTitle ? <div className="text-center">{subTitle}</div> : null}
                { legendToShow }
                <div ref={this.elemRef} style={{ 'overflowX' : expanded ? 'scroll' : 'auto', 'overflowY' : 'hidden' }}>
                    { visualToShow }
                </div>
            </div>
        );
    }
}
