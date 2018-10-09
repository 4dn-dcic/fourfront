'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { stringify } from 'query-string';
import { Button, DropdownButton, MenuItem } from 'react-bootstrap';
import * as d3 from 'd3';
import ReactTooltip from 'react-tooltip';
import { console, layout, navigate, ajax, isServerSide, analytics, DateUtility } from'./../util';

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
        this.state = _.extend(
            { 'mounted' : false, 'loadingStatus' : 'loading' },
            _.object(_.map(_.keys(props.searchURIs), function(k){ return ['resp' + k,null]; }))
        );
    }

    componentDidMount(){
        var nextState = { 'mounted' : true };
        setTimeout(()=>{
            this.performAggRequests();
        }, 100);
        this.setState(nextState);
    }

    /* Enabling this would temporarily replace charts w loading icon. It's too big of a jumpy visual change to people to be good UI IMO.
    componentWillReceiveProps(nextProps){
        if (nextProps.shouldRefetchAggs((this.props, nextProps)){
            this.setState({ 'loadingStatus' : 'loading' });
        }
    }
    */

    componentDidUpdate(pastProps){
        if (this.props.shouldRefetchAggs(pastProps, this.props)){
            this.setState({ 'loadingStatus' : 'loading' });
            this.performAggRequests();
        }
    }

    performAggRequests(chartUris = this.props.searchURIs){ // TODO: Perhaps make search uris a prop.

        var resultStateToSet = {};

        var chartUrisAsPairs = _.pairs(chartUris),
            failureCallback = () => {
                this.setState({ 'loadingStatus' : 'failed' });
            },
            uponAllRequestsCompleteCallback = (state = resultStateToSet) => {
                this.setState(_.extend({ 'loadingStatus' : 'complete' }, state));
            },
            uponSingleRequestsCompleteCallback = function(key, uri, resp){
                if (resp && resp.code === 404){
                    failureCallback();
                    return;
                }
                resultStateToSet['resp' + key] = resp;
                uponAllRequestsCompleteCallback(resultStateToSet);
            };

        if (chartUrisAsPairs.length > 1) {
            uponAllRequestsCompleteCallback = _.after(chartUrisAsPairs.length, uponAllRequestsCompleteCallback);
        }

        _.forEach(_.pairs(chartUris), ([key, uri]) => {
            if (typeof uri === 'function') uri = uri(this.props);
            ajax.load(
                uri,
                uponSingleRequestsCompleteCallback.bind(this, key, uri),
                'GET',
                failureCallback,
                null, null, ['Content-Type']
            );
        });

    }

    stateToChildProps(state = this.state){
        return _.object(_.filter(_.pairs(state), ([key, value])=>{
            // Which key:value pairs to pass to children.
            if (key === 'mounted' || key === 'loadingStatus') return true;
            if (!state.mounted/* || state.loadingStatus !== 'complete'*/) return false; // Don't pass responses in until finished.
            return true;
        }));
    }

    render(){
        var { children } = this.props,
            childProps = _.extend(_.omit(this.props, 'children'), this.stateToChildProps(this.state));

        if (Array.isArray(children)){
            return React.Children.map(children, (c) => React.cloneElement(c, childProps));
        } else {
            return React.cloneElement(children, childProps);
        }
    }

}


/**
 * Extend & implement own render method.
 */
export class StatsChartViewBase extends React.Component {

    static propTypes = {
        'aggregationsToChartData' : PropTypes.object.isRequired,
        'shouldReaggregate' : PropTypes.function
    };

    constructor(props){
        super(props);
        this.getRefWidth = this.getRefWidth.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
        this.generateAggsToState = this.generateAggsToState.bind(this);
        this.state = _.extend(this.generateAggsToState(props, {}), {
            'chartToggles' : {}
        });
    }

    componentWillReceiveProps(nextProps){
        var updateState = false,
            keys        = _.keys(nextProps),
            i, k;
        
        for (i = 0; i < keys.length; i++){
            k = keys[i];
            if (nextProps[k] !== this.props[k]){
                if (k !== 'aggregationsToChartData' && k !== 'externalTermMap'){
                    var k4 = k.slice(0,4);
                    if (k4 !== 'resp'){
                        continue;
                    }
                }
                if (!nextProps[k]) continue;
                console.warn('StatsChartViewBase > Will re-aggregate chart data based on change of ', k);
                updateState = true;
                break;
            }
        }

        if (typeof nextProps.shouldReaggregate === 'function' && !updateState){
            updateState = nextProps.shouldReaggregate(this.props, nextProps);
        }

        if (updateState){
            this.setState((currState) => this.generateAggsToState(nextProps, currState));
        }
    }

    getRefWidth(){
        return this.refs && this.refs.elem && this.refs.elem.clientWidth;
    }

    handleToggle(key, cb){
        this.setState(function(currState){
            var nextTogglesState = _.extend({}, currState.chartToggles);
            nextTogglesState[key] = !(nextTogglesState[key]);
            return { 'chartToggles' : nextTogglesState };
        }, cb);
    }

    componentWillUpdate(nextProps, nextState){
        if (!isServerSide()){
            this.currGridState = layout.responsiveGridState(nextProps.windowWidth);
        }
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

}



/**
 * Optionally wrap a class or sub-class instance of StatsViewController (or ancestor which passes down props)
 * with this component and place a GroupByDropdown later in rendering tree to use/accept these props.
 * By default, change of 'groupBy' will cause StatsViewController to refetch aggregations/responses.
 */
export class GroupByController extends React.PureComponent {

    static defaultProps = {
        'groupByOptions' : {
            'award.center_title'                 : <span><i className="icon icon-fw icon-institution"/>&nbsp; Center</span>,
            'award.project'                      : <span><i className="icon icon-fw icon-institution"/>&nbsp; Project</span>,
            'lab.display_title'                  : <span><i className="icon icon-fw icon-users"/>&nbsp; Lab</span>,
            //'status'                             : <span><i className="icon icon-fw icon-circle"/>&nbsp; <span className="text-600">Current</span> Status</span>,
            'experiments_in_set.experiment_type' : <span><i className="icon icon-fw icon-bar-chart"/>&nbsp; Experiment Type</span>
        },
        'initialGroupBy' : 'award.center_title'
    }

    constructor(props){
        super(props);
        this.handleGroupByChange = this.handleGroupByChange.bind(this);
        this.state = {
            'currentGroupBy' : props.initialGroupBy
        };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.groupByOptions !== nextProps.groupByOptions && this.props.initialGroupBy !== nextProps.initialGroupBy){
            this.setState({ 'currentGroupBy' : nextProps.initialGroupBy });
        }
    }

    handleGroupByChange(field){
        this.setState(function(currState){
            if (currState.currentGroupBy === field){
                return;
            }
            return { 'currentGroupBy' : field };
        });
    }

    render(){
        var { children, groupByOptions } = this.props,
            { currentGroupBy } = this.state,
            childProps = _.extend(_.omit(this.props, 'children', 'initialGroupBy'),{ currentGroupBy, 'handleGroupByChange' : this.handleGroupByChange });

        if (Array.isArray(children)){
            return <div>{ React.Children.map(children, (c) =>  React.cloneElement(c, childProps) ) }</div>;
        } else {
            return React.cloneElement(children, childProps);
        }
    }
}


export class GroupByDropdown extends React.PureComponent {

    static defaultProps = {
        'title' : "Group By",
        'buttonStyle' : {
            'minWidth' : 120,
            'marginLeft' : 12,
            'textAlign' : 'left'
        },
        'outerClassName' : "dropdown-container mb-15",
        'valueTitleTransform' : function(jsx){
            // Use this prop to optionally prepend or append an icon or something.
            return jsx;
        }
    }

    constructor(props){
        super(props);
        this.onSelect = _.throttle(this.onSelect.bind(this), 1000);
    }

    onSelect(eventKey, evt){
        if (typeof this.props.handleGroupByChange !== 'function'){
            throw new Error("No handleGroupByChange function passed to GroupByDropdown.");
        }
        this.props.handleGroupByChange(eventKey);
    }

    render(){
        var { groupByOptions, currentGroupBy, title, loadingStatus, buttonStyle, outerClassName, valueTitleTransform } = this.props,
            optionItems = _.map(_.pairs(groupByOptions), ([field, title]) =>
                <MenuItem eventKey={field} key={field} children={title} active={field === currentGroupBy} />
            ),
            selectedValueTitle = loadingStatus === 'loading' ? <i className="icon icon-fw icon-spin icon-circle-o-notch"/> : valueTitleTransform(groupByOptions[currentGroupBy]);

        return (
            <div className={outerClassName}>
                <span className="text-500">{ title }</span>
                <DropdownButton id="select_primary_charts_group_by" title={selectedValueTitle} onSelect={this.onSelect} children={optionItems} style={buttonStyle} />
            </div>
        );
    }
}



/**
 * Wraps AreaCharts or AreaChartContainers in order to provide shared scales.
 */
export class GroupOfCharts extends React.Component {

    static defaultProps = {
        'className'             : 'chart-group clearfix',
        'width'                 : null,
        'chartMargin'           : { 'top': 30, 'right': 2, 'bottom': 30, 'left': 50 },
        // Only relevant if --not-- providing own colorScale and letting this component create/re-create one.
        'resetScalesWhenChange' : null,
        'resetScaleLegendWhenChange' : null,
        'colorScale'            : null
    }

    constructor(props){
        super(props);
        this.resetColorScale = this.resetColorScale.bind(this);
        this.updateColorStore = this.updateColorStore.bind(this);

        var colorScale = props.colorScale || d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemePastel1));
        this.state = { colorScale, 'colorScaleStore' : {} };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.resetScalesWhenChange !== nextProps.resetScalesWhenChange){
            console.warn("Color scale reset");
            this.resetColorScale();
        } else if (this.props.resetScaleLegendWhenChange !== nextProps.resetScaleLegendWhenChange){
            console.warn("Color scale reset (LEGEND ONLY)");
            this.resetColorScale(true);
        }
    }

    resetColorScale(onlyResetLegend=false){

        if (onlyResetLegend){
            this.setState({ 'colorScaleStore' : {} });
            return;
        }

        var colorScale, colorScaleStore = {};

        if (typeof this.props.colorScale === 'function'){
            colorScale = this.props.colorScale; // Does nothing.
        } else {
            colorScale = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemePastel1));
        }

        this.setState({ colorScale, colorScaleStore });
    }

    updateColorStore(term, color){
        var nextColorScaleStore = _.clone(this.state.colorScaleStore);
        nextColorScaleStore[term] = color;
        this.setState({ 'colorScaleStore' : nextColorScaleStore });
    }

    render(){
        var { children, className, width, chartMargin, xDomain } = this.props,
            newChildren = React.Children.map(children, (child, childIndex) => {
                if (!child) return null;
                if (typeof child.type === 'string') {
                    return child; // Not component instance
                }
                return React.cloneElement(child, _.extend({}, _.omit(this.props, 'children'), { width, chartMargin, xDomain, 'updateColorStore' : this.updateColorStore }, this.state));
            });

        return <div className={className || null} children={newChildren}/>;
    }

}



export class HorizontalD3ScaleLegend extends React.Component {

    constructor(props){
        super(props);
        this.renderColorItem = this.renderColorItem.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState){
        //if (nextProps.colorScale !== this.props.colorScale){
        if (nextProps.colorScaleStore !== this.props.colorScaleStore){
            var currTerms = _.keys(this.props.colorScaleStore),
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
            if (nextProps[propKeys[i]] !== this.props[propKeys[i]]) {
                return true;
            }
        }
        return false;
    }

    renderColorItem([term, color], idx, all){
        return (
            <div className="col-sm-4 col-md-3 col-lg-2 mb-03 text-ellipsis-container">
                <div className="color-patch" style={{ 'backgroundColor' : color }} data-term={term} />
                { term }
            </div>
        );
    }

    render(){
        var { colorScale, colorScaleStore } = this.props;
        if (!colorScale || !colorScaleStore) return null;
        return (
            <div className="legend mb-27">
                <div className="row" children={_.map(_.pairs(colorScaleStore), this.renderColorItem)}/>
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

    componentDidMount(){
        this.tooltip = d3.select(this.refs.tooltipContainer);
        this.setState({ 'mounted': true });
    }

    componentWillUnmount(){
        delete this.tooltip;
    }

    render(){
        var { margin } = this.props,
            { leftPosition, visible, contentFxn, topPosition, chartWidth, chartHeight } = this.state;
        return (
            <div className="chart-tooltip" ref="tooltipContainer" style={_.extend(_.pick(margin, 'left', 'top'), {
                'transform' : 'translate(' + Math.min(leftPosition, chartWidth - 5) + 'px, 0px)',
                'display' : visible ? 'block' : 'none',
                'bottom' : margin.bottom + 5
            })}>
                <div className="line"/>
                <div className="line-notch" style={{ 'top' : topPosition }}>
                    { chartWidth && topPosition < chartHeight ? [
                        <div key="before" className="horiz-line-before" style={{ 'width' : leftPosition, 'left' : -leftPosition }}/>,
                        <div key="after" className="horiz-line-after" style={{ 'width' : chartWidth - leftPosition }}/>
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

    static defaultProps = {
        'chartMargin'           : { 'top': 30, 'right': 2, 'bottom': 30, 'left': 50 },
        'data'                  : null,
        'd3TimeFormat'          : '%Y-%m-%d',
        'stackChildren'         : true,
        'height'                : 300,
        'yAxisLabel'            : 'Count',
        'yAxisScale'            : 'Linear', // Must be one of 'Linear', 'Log', 'Pow'
        'yAxisPower'            : null,
        'xDomain'               : [ new Date('2017-03-01'), null ],
        'yDomain'               : [ 0, null ],
        'transitionDuration'    : 1500,
        'colorScale'            : null, // d3.scaleOrdinal(d3.schemeCategory10)
        'tooltipDataProperty'   : 'total',
        'shouldDrawNewChart'    : function(pastProps, nextProps, pastState, nextState){
            var shouldDrawNewChart = false;

            if (pastProps.data !== nextProps.data) shouldDrawNewChart = true;
            if (shouldDrawNewChart) console.info('Will redraw chart');

            return shouldDrawNewChart;
        }
    };

    constructor(props){
        super(props);
        this.correctDatesInData = this.correctDatesInData.bind(this);
        this.childKeysFromData = this.childKeysFromData.bind(this);
        this.updateDataInState = this.updateDataInState.bind(this);
        this.getInnerChartWidth = this.getInnerChartWidth.bind(this);
        this.getInnerChartHeight = this.getInnerChartHeight.bind(this);
        this.calculateXAxisExtents = this.calculateXAxisExtents.bind(this);
        this.calculateYAxisExtents = this.calculateYAxisExtents.bind(this);
        this.xScale = this.xScale.bind(this);
        this.yScale = this.yScale.bind(this);
        this.commonDrawingSetup = this.commonDrawingSetup.bind(this);
        this.drawNewChart = this.drawNewChart.bind(this);
        this.updateTooltip = this.updateTooltip.bind(this);
        this.removeTooltip = this.removeTooltip.bind(this);
        this.updateExistingChart = _.debounce(this.updateExistingChart.bind(this), 300);

        // D3 things
        this.parseTime = d3.timeParse(props.d3TimeFormat);
        this.stack = d3.stack().value(function(d, key){
            var currChild = _.findWhere(d.children || [], { 'term' : key });
            if (currChild) return currChild.total;
            return 0;
        });
        this.stack.keys(this.childKeysFromData(props.data));
        if (!this.props.colorScale){
            this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        }

        // Will be cached here later from d3.select(this.refs..)
        this.svg     = null;
        this.tooltip = null;

        var stackedData             = this.stack(this.correctDatesInData(props.data)),
            mergedDataForExtents    = AreaChart.mergeStackedDataForExtents(stackedData),
            xExtents                = this.calculateXAxisExtents(mergedDataForExtents, props.xDomain),
            yExtents                = this.calculateYAxisExtents(mergedDataForExtents, props.yDomain);

        this.state = {
            'drawingError'  : false,
            'drawn'         : false,
            stackedData, mergedDataForExtents,
            xExtents, yExtents
        };

    }

    componentDidMount(){
        requestAnimationFrame(this.drawNewChart);
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.d3TimeFormat !== this.props.d3TimeFormat){
            this.parseTime = d3.timeParse(nextProps.d3TimeFormat);
        }
        if (this.props.colorScale && !nextProps.colorScale){
            this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        }
    }

    componentDidUpdate(pastProps, pastState){
        var shouldDrawNewChart = this.props.shouldDrawNewChart(pastProps, this.props);

        if (shouldDrawNewChart){
            setTimeout(()=>{ // Wait for other UI stuff to finish updating, e.g. element widths.
                this.updateDataInState(this.props, ()=>{
                    requestAnimationFrame(()=>{
                        this.destroyExistingChart();
                        this.drawNewChart();
                    });
                });
            }, 300);
        } else {
            setTimeout(this.updateExistingChart, 300);
        }
    }

    getXAxisGenerator(useChartWidth = null){
        var { width } = this.props,
            chartWidth = useChartWidth || this.innerWidth || this.getInnerChartWidth(),
            xExtents  = this.calculateXAxisExtents(),
            yearDiff  = (xExtents[1] - xExtents[0]) / (60 * 1000 * 60 * 24 * 365),
            widthPerYear = chartWidth / yearDiff;


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
                return d3.axisBottom(x).ticks(d3.timeMonth.every(monthsTick));
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
                return d3.axisBottom(x).ticks(d3.timeDay.every(daysTick));
            };
        }
    }

    /**
     * Convert timestamps to D3 date objects.
     */
    correctDatesInData(data = this.props.data){
        return _.map(data, (d) => {
            var formattedDate = (new Date(d.date.slice(0,10))).toISOString().slice(0,10);
            return _.extend({}, d, {
                'date' : this.parseTime(formattedDate),
                'origDate' : formattedDate
            });
        });
    }

    childKeysFromData(data = this.props.data){
        return Array.from(_.reduce(data, function(m,d){
            _.forEach(d.children || [], function(child){ m.add(child.term); });
            return m;
        }, new Set()));
    }

    updateDataInState(props = this.props, callback = null){
        var data = this.correctDatesInData(props.data);
        this.stack.keys(this.childKeysFromData(data));

        var stackedData          = this.stack(data),
            mergedDataForExtents = AreaChart.mergeStackedDataForExtents(stackedData),
            xExtents             = this.calculateXAxisExtents(mergedDataForExtents, props.xDomain),
            yExtents             = this.calculateYAxisExtents(mergedDataForExtents, props.yDomain);

        this.setState({ stackedData, mergedDataForExtents, xExtents, yExtents }, callback);
    }

    getInnerChartWidth(){
        var { width, margin } = this.props;
        this.svg = this.svg || d3.select(this.refs.svg);
        this.innerWidth = (  width || parseInt( this.refs.svg.clientWidth || this.svg.style('width') )  ) - margin.left - margin.right;
        return this.innerWidth;
    }

    getInnerChartHeight(){
        var { height, margin } = this.props;
        this.svg = this.svg || d3.select(this.refs.svg);
        this.innerHeight = (  height || parseInt( this.refs.svg.clientHeight || this.svg.style('height') )  ) - margin.top - margin.bottom;
        return this.innerHeight;
    }

    calculateXAxisExtents(mergedData = this.state.mergedDataForExtents, xDomain = this.props.xDomain){
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

    calculateYAxisExtents(mergedData = this.state.mergedDataForExtents, yDomain = this.props.yDomain){
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

    xScale(width, xExtents = this.state.xExtents){
        return d3.scaleTime().rangeRound([0, width]).domain(xExtents);
    }

    yScale(height, yExtents = this.state.yExtents){
        var { yAxisScale, yAxisPower } = this.props;
        var scale = d3['scale' + yAxisScale]().rangeRound([height, 0]).domain(yExtents);
        if (yAxisScale === 'Pow' && yAxisPower !== null){
            scale.exponent(yAxisPower);
        }
        return scale;
    }

    commonDrawingSetup(){
        var { margin, yAxisScale, yAxisPower, xDomain, yDomain } = this.props,
            { stackedData, mergedDataForExtents } = this.state,
            svg         = this.svg || d3.select(this.refs.svg),
            width       = this.getInnerChartWidth(),
            height      = this.getInnerChartHeight(),
            x           = this.xScale(width),
            y           = this.yScale(height),
            bottomAxisGenerator = this.getXAxisGenerator(width)(x),
            area        = d3.area()
                .x ( function(d){ return x(d.date || d.data.date);  } )
                .curve(d3.curveStepAfter)
                //.x0 ( function(d){ return x(d.date || d.data.date);  } )
                //.x1 ( function(d){ return x(d.date || d.data.date) + 10;  } )
                .y0( function(d){ return Array.isArray(d) ? y(d[0]) : y(0); } )
                .y1( function(d){ return Array.isArray(d) ? y(d[1]) : y(d.total || d.data.total); } );

        var leftAxisGenerator   = d3.axisLeft(y),
            rightAxisGenerator  = d3.axisRight(y).tickSize(width),
            rightAxisFxn        = function(g){
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

        return { svg, x, y, width, height, area, leftAxisGenerator, bottomAxisGenerator, rightAxisFxn, 'data' : stackedData };
    }

    /**
     * Draws D3 area chart using the DOM a la https://bl.ocks.org/mbostock/3883195 in the rendered <svg> element.
     *
     * TODO: We should try to instead render out <path>, <g>, etc. SVG elements directly out of React to be more Reactful and performant.
     * But this can probably wait (?).
     */
    drawNewChart(){
        if (!this.refs || !this.refs.svg) {
            this.setState({ 'drawingError' : true });
            return;
        }
        if (this.drawnD3Elements) {
            console.error('Drawn chart already exists. Exiting.');
            this.setState({ 'drawingError' : true });
            return;
        }

        var { yAxisLabel, margin, updateColorStore } = this.props,
            { data, svg, x, y, width, height, area, leftAxisGenerator, bottomAxisGenerator, rightAxisFxn } = this.commonDrawingSetup(),
            drawn = { svg },
            colorScale = this.props.colorScale || this.colorScale;


        drawn.root = svg.append("g").attr('transform', "translate(" + margin.left + "," + margin.top + ")");

        drawn.layers = drawn.root.selectAll('.layer')
            .data(data)
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
        var svg         = this.svg      || d3.select(this.refs.svg), // SHOULD be same as evt.target.
            tooltip     = this.refs.tooltip,
            //tooltip     = this.tooltip  || d3.select(this.refs.tooltipContainer),
            chartMargin = this.props.chartMargin,
            mouseCoords = d3.clientPoint(svg.node(), evt), // [x: number, y: number]
            stackedData = this.state.stackedData,
            colorScale  = this.props.colorScale || this.colorScale,
            chartWidth  = this.innerWidth || this.getInnerChartWidth(),
            chartHeight = this.innerHeight || this.getInnerChartHeight(),
            currentTerm = (evt && evt.target.getAttribute('data-term')) || null,
            yAxisLabel  = this.props.yAxisLabel,
            tdp         = this.props.tooltipDataProperty || 'total';

        if (!mouseCoords) {
            throw new Error("Could not get mouse coordinates.");
        }

        mouseCoords[0] -= (chartMargin.left || 0);
        mouseCoords[1] -= (chartMargin.top  || 0);

        // console.log(evt.target);

        if (mouseCoords[0] < 0 || mouseCoords[1] < 0 || mouseCoords[0] > chartWidth + 1 || mouseCoords[1] > chartHeight + 1){
            return this.removeTooltip();
        }

        requestAnimationFrame(()=>{

            var xScale              = this.xScale(chartWidth),
                yScale              = this.yScale(chartHeight),
                hovDate             = xScale.invert(mouseCoords[0]),
                dateString          = DateUtility.format(hovDate, 'date-sm'),
                leftPosition        = xScale(hovDate),
                isToLeft            = leftPosition > (chartWidth / 2),
                maxTermsVisible     = Math.floor((chartHeight - 60) / 18),
                stackedLegendItems  = _.filter(_.map(stackedData, function(sD){
                    return _.find(sD, function(stackedDatum, i, all){
                        var curr = stackedDatum.data,
                            next = (all[i + 1] && all[i + 1].data) || null;

                        if (hovDate > curr.date && (!next || next.date >= hovDate)){
                            return true;
                        }
                        return false;
                    });
                })),
                total               = parseInt(((stackedLegendItems.length > 0 && stackedLegendItems[0].data && stackedLegendItems[0].data[tdp]) || 0) * 100) / 100,
                termChildren        = _.sortBy(_.filter((stackedLegendItems.length > 0 && stackedLegendItems[0].data && stackedLegendItems[0].data.children) || [], function(c){
                    return c && c[tdp] > 0;
                }), function(c){ return -c[tdp]; }),
                topPosition         = yScale(total);

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

                    return (
                        <div className={"label-bg" + (isToLeft ? ' to-left' : '')}>
                            <h5 className="text-500 mt-0 mb-11 clearfix">
                                { dateString }{ total ? <span className="text-700 text-large pull-right" style={{ marginTop: -2 }}>&nbsp;&nbsp; { total }</span> : null }
                            </h5>
                            <table className="current-legend">
                                <tbody>
                                    { _.map(termChildren, function(c, i){
                                        return (
                                            <tr key={c.term || i} className={currentTerm === c.term ? 'active' : null}>
                                                <td className="patch-cell">
                                                    <div className="color-patch" style={{ 'backgroundColor' : c.noColor ? 'transparent' : colorScale(c.term) }}/>
                                                </td>
                                                <td className="term-name-cell">{ c.term }</td>
                                                <td className="term-name-total">
                                                    { c[tdp] % 1 > 0 ?  Math.round(c[tdp] * 100) / 100 : c[tdp] }
                                                    { yAxisLabel && yAxisLabel !== 'Count' ? ' ' + yAxisLabel : null }
                                                </td>
                                            </tr>
                                        );
                                    }) }
                                </tbody>
                            </table>
                        </div>
                    );
                }
            });

        });

    }

    removeTooltip(){
        var tooltip     = this.refs.tooltip;
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
            throw new Error('No existing elements to transition.');
        }

        var { yAxisLabel, margin, transitionDuration } = this.props;
        var { data, svg, x, y, width, height, area, leftAxisGenerator, bottomAxisGenerator, rightAxisFxn } = this.commonDrawingSetup();

        var drawn = this.drawnD3Elements;

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

            var allLayers = drawn.root.selectAll('.layer')
                .data(data)
                .selectAll('path.area')
                .transition()
                .duration(transitionDuration)
                .attr('d', area);

        });

    }

    render(){
        var { data, width, height, transitionDuration, margin } = this.props;
        if (!data || this.state.drawingError) {
            return <div>Error</div>;
        }
        return (
            <div className="area-chart-inner-container" onMouseMove={this.updateTooltip} onMouseOut={this.removeTooltip}>
                <svg ref="svg" className="area-chart" width={width || "100%"} height={height || null} style={{
                    height, 'width' : width || '100%',
                    'transition' : 'height ' + (transitionDuration / 1000) + 's' + (height >= 500 ? ' .75s' : ' 1.025s')
                }} />
                <ChartTooltip margin={margin} ref="tooltip" />
            </div>
        );
    }

}


export function loadingIcon(label = "Loading Chart Data"){
    return (
        <div className="mt-5 mb-5 text-center">
            <i className="icon icon-fw icon-spin icon-circle-o-notch icon-2x" style={{ opacity : 0.5 }}/>
            <h5 className="text-400">{ label }</h5>
        </div>
    );
}

export function errorIcon(label = "Loading failed. Please try again later."){
    return (
        <div className="mt-5 mb-5 text-center">
            <i className="icon icon-fw icon-times icon-2x"/>
            <h5 className="text-400">{ label }</h5>
        </div>
    );
}



export class AreaChartContainer extends React.Component {

    static defaultProps = {
        'colorScale' : null,
        'extraButtons' : []
    }

    constructor(props){
        super(props);
        this.buttonSection = this.buttonSection.bind(this);
        this.isExpanded = this.isExpanded.bind(this);
        this.toggleExpanded = _.throttle(this.toggleExpanded.bind(this), 1000);
        this.expandButton = this.expandButton.bind(this);
    }

    isExpanded(props = this.props){
        if (this.props.gridState && this.props.gridState !== 'lg') return false;
        return !!((props.chartToggles || {})[props.id]);
    }

    componentDidMount(){
        setTimeout(()=>{ // Update w. new width.
            this.forceUpdate();
        }, 0);
    }

    componentDidUpdate(pastProps){
        if (pastProps.defaultColSize !== this.props.defaultColSize || this.isExpanded(pastProps) !== this.isExpanded(this.props)){
            setTimeout(()=>{ // Update w. new width.
                this.forceUpdate();
            }, 0);
        }
    }

    toggleExpanded(e){
        return typeof this.props.onToggle === 'function' && this.props.id && this.props.onToggle(this.props.id);
    }

    getRefWidth(){
        return this.refs && this.refs.elem && this.refs.elem.clientWidth;
    }

    expandButton(expanded, className){
        if (this.props.gridState && this.props.gridState !== 'lg') return null;
        return (
            <Button className={className} bsSize="sm" onClick={this.toggleExpanded}>
                <i className={"icon icon-fw icon-search-" + (expanded ? 'minus' : 'plus')}/>
            </Button>
        );
    }

    buttonSection(expanded){
        return (
            <div className="pull-right">
                { this.props.extraButtons }
                { this.expandButton(expanded) }
            </div>
        );
    }

    render(){
        var { title, children, width, defaultHeight, colorScale, chartMargin, updateColorStore } = this.props,
            expanded            = this.isExpanded(),
            useWidth            = width || this.getRefWidth(),
            chartInnerWidth     = expanded ? useWidth * 3 : useWidth,
            className           = 'mt-2',
            useHeight           = expanded ? 500 : (defaultHeight || AreaChart.defaultProps.height),
            visualToShow;

        if (typeof useWidth === 'number' && useWidth){
            visualToShow = React.cloneElement(children, {
                colorScale, updateColorStore,
                'width'             : chartInnerWidth,
                'height'            : useHeight,
                'margin'            : chartMargin || children.props.margin || null
            });
        } else { // If no width yet, just for stylistic purposes, don't render chart itself.
            visualToShow = loadingIcon("Initializing...");
        }

        return (
            <div className={className}>
                <h4 className="text-300 clearfix">{ title } { this.buttonSection(expanded) }</h4>
                <div ref="elem" style={{ 'overflowX' : expanded ? 'scroll' : 'auto', 'overflowY' : 'hidden' }} children={visualToShow} />
            </div>
        );
    }
}

