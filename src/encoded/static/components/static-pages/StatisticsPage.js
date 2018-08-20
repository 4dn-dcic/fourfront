'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { stringify } from 'query-string';
import { Button } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, layout, navigate, ajax, isServerSide } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import * as d3 from 'd3';


export default class StatisticsPageView extends StaticPage {

    render(){
        return (
            <StaticPage.Wrapper>
                <StatisticsViewController {..._.pick(this.props, 'session', 'browseBaseState')}>
                    <layout.WindowResizeUpdateTrigger>
                        <StatisticsChartsView {..._.pick(this.props, 'session')} />
                    </layout.WindowResizeUpdateTrigger>
                </StatisticsViewController>
            </StaticPage.Wrapper>
        );
    }

}



/**
 * Requests URIs defined in CHART_SEARCH_URIS, saves responses to own state, then passes down responses into child component(s).
 */
export class StatisticsViewController extends React.PureComponent {

    static CHART_SEARCH_URIS = {
        //'File' : '/search/?type=File&experiments.display_title!=No%20value&limit=0',
        'File' : function(props) {
            return (
                '/search/?type=File&' +
                stringify(_.pick(navigate.getBrowseBaseParams(props.browseBaseState || null), 'award.project')) +
                '&limit=0'
            );
        },
        'ExperimentSetReplicate' : function(props) {
            return '/search/?' + stringify(navigate.getBrowseBaseParams(props.browseBaseState || null)) + '&limit=0';
        }
    };

    static shouldRefetchAggregations(pastProps, nextProps){
        return (
            pastProps.session           !== nextProps.session ||
            pastProps.browseBaseState   !== nextProps.browseBaseState
        );
    }

    constructor(props){
        super(props);
        this.performSearchRequests  = this.performSearchRequests.bind(this);
        this.stateToChildProps      = this.stateToChildProps.bind(this);
        this.state = _.extend(
            { 'mounted' : false, 'loadingStatus' : 'loading' },
            _.object(_.map(_.keys(StatisticsViewController.CHART_SEARCH_URIS), function(k){ return ['resp' + k,null]; }))
        );
    }

    componentDidMount(){
        var nextState = { 'mounted' : true };
        this.performSearchRequests();
        this.setState(nextState);
    }

    /* Enabling this would temporarily replace charts w loading icon. It's too big of a jumpy visual change to people to be good UI IMO.
    componentWillReceiveProps(nextProps){
        if (StatisticsViewController.shouldRefetchAggregations(this.props, nextProps)){
            this.setState({ 'loadingStatus' : 'loading' });
        }
    }
    */

    componentDidUpdate(pastProps){
        if (StatisticsViewController.shouldRefetchAggregations(pastProps, this.props)){
            this.performSearchRequests();
        }
    }

    performSearchRequests(chartUris = StatisticsViewController.CHART_SEARCH_URIS){ // TODO: Perhaps make search uris a prop.

        var resultStateToSet = {};

        var chartUrisAsPairs = _.pairs(chartUris),
            failureCallback = function(){
                this.setState({ 'loadingStatus' : 'failed' });
            }.bind(this),
            uponAllRequestsCompleteCallback = function(state = resultStateToSet){
                this.setState(_.extend({ 'loadingStatus' : 'complete' }, state));
            }.bind(this),
            uponSingleRequestsCompleteCallback = function(key, uri, resp){
                if ((resp && resp.code === 404) || _.keys(resp.aggregations).length === 0){
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
            ajax.load(uri, uponSingleRequestsCompleteCallback.bind(this, key, uri), 'GET', failureCallback);
        });

    }

    stateToChildProps(state = this.state){
        return _.object(_.filter(_.pairs(state), (pair)=>{
            // Which key:value pairs to pass to children.
            if (pair[0] === 'mounted' || pair[0] === 'loadingStatus') return true;
            if (!state.mounted || state.loadingStatus !== 'complete') return false; // Don't pass responses in until finished.
            return true;
        }));
    }

    render(){
        if (Array.isArray(this.props.children)){
            return React.Children.map(this.props.children, (c)=>{
                return React.cloneElement(c, this.stateToChildProps(this.state));
            });
        } else {
            return React.cloneElement(this.props.children, this.stateToChildProps(this.state));
        }
    }

}



export class StatisticsChartsView extends React.Component {

    static loadingIcon(label = "Loading Chart Data"){
        return (
            <div className="mt-5 mb-5 text-center">
                <i className="icon icon-fw icon-spin icon-circle-o-notch icon-2x" style={{ opacity : 0.5 }}/>
                <h5 className="text-400">{ label }</h5>
            </div>
        );
    }

    static errorIcon(label = "Loading failed. Please try again later."){
        return (
            <div className="mt-5 mb-5 text-center">
                <i className="icon icon-fw icon-times icon-2x"/>
                <h5 className="text-400">{ label }</h5>
            </div>
        );
    }

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.generateAggsToState = this.generateAggsToState.bind(this);
        this.state = _.extend(this.generateAggsToState(props), {
            'chartToggles'      : {},
            // Passed down to & shared by multiple charts in order to have same color per key
            'colorScale'  : d3.scaleOrdinal(d3.schemeCategory10)
        });
    }

    componentWillReceiveProps(nextProps){
        var updateState = false;
        _.forEach(_.keys(nextProps), (k) => {
            if (updateState) return;
            if (k.slice(0,4) === 'resp'){
                if (nextProps[k] !== this.props[k]){
                    updateState = true;
                    return;
                }
            }
        });

        if (updateState){
            this.setState(this.generateAggsToState(nextProps));
        }
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
            this.currGridState = layout.responsiveGridState();
        }
    }

    generateAggsToState(props){
        return _.object(_.map(_.keys(aggregationsToChartData), function(k){
            return [k, aggregationsToChartData[k].function(props['resp' + aggregationsToChartData[k].requires])];
        }));
    }

    render(){
        var { loadingStatus, mounted, respFile, respExperimentSetReplicate, session } = this.props;
        if (!mounted || loadingStatus === 'loading')    return StatisticsChartsView.loadingIcon();
        if (loadingStatus === 'failed')                 return StatisticsChartsView.errorIcon();
        var anyExpandedCharts = _.any(_.values(this.state.chartToggles));
        var commonContainerProps = {
            'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : this.state.chartToggles,
            'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250, 'colorScale' : this.state.colorScale
        };

        return (
            <div className="stats-charts-container">

                <AreaChartContainer {...commonContainerProps} id="expsets_released" title={<span><span className="text-500">Experiment Sets</span> released over time</span>}>
                    <AreaChart data={this.state.expsets_released} />
                </AreaChartContainer>

                { session && this.state.expsets_released_internal ?

                    <AreaChartContainer {...commonContainerProps} id="expsets_released_internal" title={<span><span className="text-500">Experiment Sets</span> released over time &mdash; Internal</span>}>
                        <AreaChart data={this.state.expsets_released_internal} />
                    </AreaChartContainer>

                : null }

                <AreaChartContainer {...commonContainerProps} id="files_released" title={<span><span className="text-500">Files</span> released over time</span>}>
                    <AreaChart data={this.state.files_released} />
                </AreaChartContainer>

                <AreaChartContainer {...commonContainerProps} id="file_volume_released" title={<span><span className="text-500">Total File Size</span> released over time</span>}>
                    <AreaChart data={this.state.file_volume_released} yAxisLabel="GB" />
                </AreaChartContainer>

            </div>
        );
    }

}


export class AreaChartContainer extends React.Component {

    constructor(props){
        super(props);
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

    xAxisGeneratorFull(x){
        return d3.axisBottom(x).ticks(d3.timeMonth.every(1)); // Every 1 month
    }

    expandButton(expanded, className){
        if (this.props.gridState && this.props.gridState !== 'lg') return null;
        return (
            <Button className={className} bsSize="sm" onClick={this.toggleExpanded} style={{ 'marginTop' : -6 }}>
                <i className={"icon icon-fw icon-search-" + (expanded ? 'minus' : 'plus')}/>
            </Button>
        );
    }

    render(){
        var { title, children, width, defaultColSize, defaultHeight, colorScale } = this.props,
            expanded = this.isExpanded(),
            useWidth = width || this.getRefWidth(),
            chartInnerWidth = expanded ? useWidth * 3 : useWidth,
            className = 'mt-2 col-xs-12 col-lg-' + (expanded ? '12' : (defaultColSize || '6')),
            useHeight = expanded ? 500 : (defaultHeight || AreaChart.defaultProps.height);

        var visualToShow;
        if (typeof useWidth === 'number' && useWidth){
            visualToShow = React.cloneElement(children, {
                'width'             : chartInnerWidth,
                'height'            : useHeight,
                'xAxisGenerator'    : (expanded ? this.xAxisGeneratorFull : (children.props && children.props.xAxisGenerator) ),
                'colorScale'        : colorScale || null
            });
        } else { // If no width yet, just for stylistic purposes, don't render chart itself.
            visualToShow = StatisticsChartsView.loadingIcon("Initializing...");
        }

        return (
            <div className={className}>
                <div className="row">
                    <div className="col-xs-12 col-lg-1">
                        <h4 className="text-300">{ title }</h4>
                        { this.expandButton(expanded) }
                    </div>
                    <div className={"col-xs-12 col-lg-11"}>
                        <div ref="elem" style={{ 'overflowX' : expanded ? 'scroll' : 'auto', 'overflowY' : 'hidden' }}>
                            { visualToShow }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export function dateHistogramToD3Data(dateIntervalBuckets){
    var total = 0;
    var subTotals = {};
    var aggsList = _.map(dateIntervalBuckets, function(bucket, index){
        total += bucket.doc_count;
        var subBucketKeysToDate = _.uniq(_.keys(subTotals).concat(
            _.pluck((bucket.group_by_award && bucket.group_by_award.buckets) || [], 'key')
        ));
        return {
            'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
            'count'    : bucket.doc_count,
            'total'    : total,
            'children' : _.map(subBucketKeysToDate, function(termKey){
                var subBucket = bucket.group_by_award && bucket.group_by_award.buckets && _.findWhere(bucket.group_by_award.buckets, { 'key' : termKey });
                var subCount = ((subBucket && subBucket.doc_count) || 0);
                subTotals[termKey] = (subTotals[termKey] || 0) + subCount;
                return {
                    'term'  : termKey,
                    'count' : subCount,
                    'total' : subTotals[termKey]
                };
            })
        };
    });

    // Ensure each datum has all child terms, even if blank.
    fillMissingChildBuckets(aggsList, _.keys(subTotals));

    return aggsList;
}


export const aggregationsToChartData = {
    'expsets_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return dateHistogramToD3Data(weeklyIntervalBuckets);
        }
    },
    'expsets_released_internal' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_internal_release && resp.aggregations.weekly_interval_internal_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return dateHistogramToD3Data(weeklyIntervalBuckets);
        }
    },
    'files_released' : {
        'requires'  : 'File',
        'function'  : function(resp){
            // Same as for ExpSets
            return aggregationsToChartData.expsets_released.function(resp);
        }
    },
    'file_volume_released' : {
        'requires'  : 'File',
        'function'  : function(resp){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            var gigabyte = 1024 * 1024 * 1024,
                total = 0,
                subTotals = {},
                aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){
                    var fileSizeVol = ((bucket.file_size_volume && bucket.file_size_volume.value) || 0) / gigabyte;
                    total += fileSizeVol;
                    var subBucketKeysToDate = _.uniq(_.keys(subTotals).concat(
                        _.pluck((bucket.group_by_award && bucket.group_by_award.buckets) || [], 'key')
                    ));
                    return {
                        'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                        'count'    : fileSizeVol,
                        'total'    : total,
                        'children' : _.map(subBucketKeysToDate, function(termKey){
                            var subBucket = bucket.group_by_award && bucket.group_by_award.buckets && _.findWhere(bucket.group_by_award.buckets, { 'key' : termKey });
                            var subFileSizeVol = ((subBucket && subBucket.file_size_volume && subBucket.file_size_volume.value) || 0) / gigabyte;
                            subTotals[termKey] = (subTotals[termKey] || 0) + subFileSizeVol;
                            return {
                                'term'  : termKey,
                                'count' : subFileSizeVol,
                                'total' : subTotals[termKey]
                            };
                        })
                    };
                });

            // Ensure each datum has all child terms, even if blank.
            fillMissingChildBuckets(aggsList, _.keys(subTotals));

            return aggsList;
        }
    }
};

function fillMissingChildBuckets(aggsList, subAggKeys){
    _.forEach(aggsList, function(datum){

        _.forEach(subAggKeys, function(k){
            var foundChild = _.findWhere(datum.children, { 'term' : k });
            if (!foundChild){
                datum.children.push({
                    'term' : k,
                    'count' : 0,
                    'total' : 0
                });
            }
        });

    });
}


export class AreaChart extends React.PureComponent {

    static defaultProps = {
        'margin'                : { 'top': 30, 'right': 20, 'bottom': 30, 'left': 50 },
        'data'                  : null,
        'd3TimeFormat'          : '%Y-%m-%d',
        'stackChildren'         : true,
        'height'                : 300,
        'yAxisLabel'            : 'Count',
        'yAxisScale'            : 'Linear', // Must be one of 'Linear', 'Log', 'Pow'
        'yAxisPower'            : null,
        'xAxisGenerator'        : function(x){ // One tick every 2 months
            return d3.axisBottom(x).ticks(d3.timeMonth.every(2));
        },
        'transitionDuration'    : 1500,
        'colorScale'            : null // d3.scaleOrdinal(d3.schemeCategory10)
    };

    constructor(props){
        super(props);
        this.correctDatesInData = this.correctDatesInData.bind(this);
        this.childKeysFromData = this.childKeysFromData.bind(this);
        this.updateDataInState = this.updateDataInState.bind(this);
        this.commonDrawingSetup = this.commonDrawingSetup.bind(this);
        this.drawNewChart = this.drawNewChart.bind(this);
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

        this.state = {
            'drawingError'  : false,
            'drawn'         : false,
            'stackedData'   : this.stack(this.correctDatesInData(props.data))
        };

    }

    componentDidMount(){
        this.drawNewChart();
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.d3TimeFormat !== this.props.d3TimeFormat){
            this.parseTime = d3.timeParse(nextProps.d3TimeFormat);
        }
        if (nextProps.data !== this.props.data){
            this.updateDataInState(nextProps.data);
        }
        if (this.props.colorScale && !nextProps.colorScale){
            this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        }
    }

    componentDidUpdate(pastProps, pastState){
        // TODO: this.updateExistingChart();
        var shouldDrawNewChart = false;

        _.forEach(_.keys(this.props), (k) => {
            if (this.props[k] !== pastProps[k]){
                if (['data', 'd3TimeFormat'].indexOf(k) > -1){
                    shouldDrawNewChart = true;
                    console.log('CHANGED', k);
                }
            }
        });

        setTimeout(()=>{
            // Wait for other UI stuff to finish updating, e.g. element widths.
            if (!shouldDrawNewChart) {
                this.updateExistingChart();
            } else {
                this.destroyExistingChart();
                this.drawNewChart();
            }
        }, 300);
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

    updateDataInState(data = this.props.data){
        data = this.correctDatesInData(data);
        this.stack.keys(this.childKeysFromData(data));
        this.setState({ 'stackedData' : this.stack(data) });
    }

    commonDrawingSetup(){
        var { margin, /*data,*/ yAxisScale, yAxisPower, xAxisGenerator } = this.props;
        var data = this.state.stackedData;
        var svg         = d3.select(this.refs.svg),
            width       = (  this.props.width  || parseInt( this.refs.svg.clientWidth || svg.style('width' ) )  ) - margin.left - margin.right,
            height      = (  this.props.height || parseInt( this.refs.svg.clientHeight || svg.style('height') )  ) - margin.top - margin.bottom,
            x           = d3.scaleTime().rangeRound([0, width]),
            y           = d3['scale' + yAxisScale]().rangeRound([height, 0]),
            area        = d3.area()
                .x ( function(d){ return x(d.date || d.data.date);  } )
                .y0( function(d){ return Array.isArray(d) ? y(d[0]) : y(0); } )
                .y1( function(d){ return Array.isArray(d) ? y(d[1]) : y(d.total || d.data.total); } );

        if (yAxisScale === 'Pow' && yAxisPower !== null){
            y.exponent(yAxisPower);
        }

        var mergedDataForExtents = d3.merge(_.map(data, function(d2){
            return _.map(d2, function(d){
                return d.data;
            });
        }));

        x.domain(d3.extent(mergedDataForExtents, function(d){ return d.date; }));
        y.domain([ 0, d3.max(mergedDataForExtents, function(d) { return d.total; }) ]);

        var bottomAxisGenerator = xAxisGenerator(x);

        var leftAxisGenerator   = d3.axisLeft(y),
            rightAxisGenerator  = d3.axisRight(y).tickSize(width),
            rightAxisFxn        = function(g){
                g.call(rightAxisGenerator);
                g.select('.domain').remove();
                g.selectAll('.tick > text').remove();
                g.selectAll('.tick > line')
                    .attr('opacity', 0.2)
                    .attr("stroke", "#777")
                    .attr("stroke-dasharray", "2,2");
            };

        return { data, svg, x, y, width, height, area, leftAxisGenerator, bottomAxisGenerator, rightAxisFxn };
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

        var { yAxisLabel, margin } = this.props;
        var { data, svg, x, y, width, height, area, leftAxisGenerator, bottomAxisGenerator, rightAxisFxn } = this.commonDrawingSetup();
        var drawn = { svg };
        var colorScale = this.props.colorScale || this.colorScale;

        requestAnimationFrame(()=>{

            drawn.root = svg.append("g").attr('transform', "translate(" + margin.left + "," + margin.top + ")");

            drawn.layers = drawn.root.selectAll('.layer')
                .data(data)
                .enter()
                .append('g')
                .attr('class', 'layer')
                .attr('data-effect', 'float')
                .attr('data-tip', function(d){ return (d.data || d).key; });

            drawn.path = drawn.layers.append('path')
                .attr('class', 'area')
                .style('fill', function(d){ return colorScale((d.data || d).key); })
                .attr('d', area);

            this.drawAxes(drawn, { height, bottomAxisGenerator, y, yAxisLabel, rightAxisFxn });
            this.drawnD3Elements = drawn;

            setTimeout(function(){
                ReactTooltip.rebuild();
            }, 10);
        });
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
        var { data, width, height, transitionDuration } = this.props;
        if (!data || this.state.drawingError) {
            return <div>Error</div>;
        }
        return <svg ref="svg" className="area-chart" width={width || "100%"} height={height || null}
            style={{ height, 'width' : width || '100%', 'transition' : 'height ' + (transitionDuration / 1000) + 's' + (height >= 500 ? ' .75s' : ' 1.025s') }} />;
    }

}


globals.content_views.register(StatisticsPageView, 'StatisticsPage');
