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

        // REPLACED
        //'File' : function(props) {
        //    return (
        //        '/search/?type=File&' +
        //        stringify(_.pick(navigate.getBrowseBaseParams(props.browseBaseState || null), 'award.project')) +
        //        '&limit=0'
        //    );
        //},
        'ExperimentSetReplicate' : function(props) {
            var params = navigate.getBrowseBaseParams(props.browseBaseState || null);
            //if (props.browseBaseState === 'all') params['group_by'] = ['award.project'];
            return '/date_histogram_aggregations/?' + stringify(params) + '&limit=0';
        },
        // TEMP DISABLED
        //'TrackingItem' : function(props) {
        //    return '/search/?type=TrackingItem&tracking_type=google_analytics&sort=-google_analytics.for_date&limit=14';
        //}
    };

    static shouldRefetchAggregations(pastProps, nextProps){
        return (
            pastProps.session           !== nextProps.session ||
            pastProps.browseBaseState   !== nextProps.browseBaseState
        );
    }

    constructor(props){
        super(props);
        this.fetchAndGenerateExternalTermMap = this.fetchAndGenerateExternalTermMap.bind(this);
        this.performAggRequests  = this.performAggRequests.bind(this);
        this.stateToChildProps      = this.stateToChildProps.bind(this);
        this.state = _.extend(
            {
                'mounted'           : false,
                'loadingStatus'     : 'loading',
                'externalTermMap'   : {},
            },
            _.object(_.map(_.keys(StatisticsViewController.CHART_SEARCH_URIS), function(k){ return ['resp' + k,null]; }))
        );
    }

    componentDidMount(){
        var nextState = { 'mounted' : true };
        this.performAggRequests();
        this.fetchAndGenerateExternalTermMap();
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
            this.performAggRequests();
            this.fetchAndGenerateExternalTermMap();
        }
    }

    fetchAndGenerateExternalTermMap(){
        ajax.load('/search/?type=Award&limit=all', (resp)=>{
            this.setState({
                'externalTermMap' : _.object(_.map(resp['@graph'] || [], function(award){
                    return [ award.center_title, award.project !== '4DN' ];
                }))
            });
        });
    }

    performAggRequests(chartUris = StatisticsViewController.CHART_SEARCH_URIS){ // TODO: Perhaps make search uris a prop.

        var resultStateToSet = {};

        var chartUrisAsPairs = _.pairs(chartUris),
            failureCallback = function(){
                this.setState({ 'loadingStatus' : 'failed' });
            }.bind(this),
            uponAllRequestsCompleteCallback = function(state = resultStateToSet){
                this.setState(_.extend({ 'loadingStatus' : 'complete' }, state));
            }.bind(this),
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
            ajax.load(uri, uponSingleRequestsCompleteCallback.bind(this, key, uri), 'GET', failureCallback);
        });

    }

    stateToChildProps(state = this.state){
        return _.object(_.filter(_.pairs(state), ([key, value])=>{
            // Which key:value pairs to pass to children.
            if (key === 'mounted' || key === 'loadingStatus') return true;
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

    static xAxisGeneratorForDayInterval(x){
        return d3.axisBottom(x).ticks(d3.timeDay.every(1));
    }

    static xAxisGeneratorForWeekInterval(x){
        return d3.axisBottom(x).ticks(d3.timeMonth.every(2));
    }

    constructor(props){
        super(props);
        this.getRefWidth = this.getRefWidth.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
        this.generateAggsToState = this.generateAggsToState.bind(this);
        this.state = _.extend(this.generateAggsToState(props), {
            'chartToggles'      : {}
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
            this.currGridState = layout.responsiveGridState();
        }
    }

    generateAggsToState(props){
        return _.object(_.map(_.keys(aggregationsToChartData), (key) =>
            [
                key,
                aggregationsToChartData[key].function(
                    props['resp' + aggregationsToChartData[key].requires],
                    this.props.externalTermMap
                )
            ]
        ));
    }

    render(){
        var { loadingStatus, mounted, respFile, respExperimentSetReplicate, session, externalTermMap } = this.props,
            { expsets_released, expsets_released_internal, files_released, file_volume_released, sessions_by_country,
                expsets_created, chartToggles } = this.state,
            width = this.getRefWidth() || null;

        if (!mounted || loadingStatus === 'loading')    return <div className="stats-charts-container" ref="elem" children={ StatisticsChartsView.loadingIcon() }/>;
        if (loadingStatus === 'failed')                 return <div className="stats-charts-container" ref="elem" children={ StatisticsChartsView.errorIcon() }/>;

        var anyExpandedCharts = _.any(_.values(this.state.chartToggles)),
            commonContainerProps = {
                'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : chartToggles,
                'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
            };

        return (
            <div className="stats-charts-container" ref="elem">

                <GroupOfCharts width={width} resetScalesWhenChange={expsets_released}>

                    <HorizontalD3ScaleLegend />

                    <AreaChartContainer {...commonContainerProps} id="expsets_released" title={<span><span className="text-500">Experiment Sets</span> released over time</span>}>
                        <AreaChart data={expsets_released} />
                    </AreaChartContainer>

                    {/* expsets_created ?
                        <AreaChartContainer {...commonContainerProps} id="expsets_created" title={<span><span className="text-500">Experiment Sets</span> submitted over time</span>}>
                            <AreaChart data={expsets_created} />
                        </AreaChartContainer>
                    : null */}

                    { session && expsets_released_internal ?
                        <AreaChartContainer {...commonContainerProps} id="expsets_released_internal" title={<span><span className="text-500">Experiment Sets</span> released over time &mdash; Internal</span>}>
                            <AreaChart data={expsets_released_internal} />
                        </AreaChartContainer>
                    : null }

                    <AreaChartContainer {...commonContainerProps} id="files_released" title={<span><span className="text-500">Files</span> released over time</span>}>
                        <AreaChart data={files_released} />
                    </AreaChartContainer>

                    <AreaChartContainer {...commonContainerProps} id="file_volume_released" title={<span><span className="text-500">Total File Size</span> released over time</span>}>
                        <AreaChart data={file_volume_released} yAxisLabel="GB" />
                    </AreaChartContainer>

                </GroupOfCharts>

                { sessions_by_country ?
                    <GroupOfCharts>
                        <AreaChartContainer {...commonContainerProps} id="sessions_by_country" title={<span><span className="text-500">User Sessions</span> last 14 days</span>}>
                            <AreaChart data={sessions_by_country} xAxisGenerator={StatisticsChartsView.xAxisGeneratorForDayInterval}
                                xAxisGeneratorFull={StatisticsChartsView.xAxisGeneratorForDayInterval} />
                        </AreaChartContainer>
                    </GroupOfCharts>

                : null }

            </div>
        );
    }

}


/**
 * Wraps AreaCharts or AreaChartContainers in order to provide shared scales.
 */
export class GroupOfCharts extends React.Component {

    static defaultProps = {
        'className' : 'chart-group clearfix',
        //'xAxisData' : null,
        //'xAxisGenerator' : function(x){
        //    return d3.axisBottom(x).ticks(d3.timeMonth.every(2));
        //},
        'width' : null,
        'chartMargin' : { 'top': 30, 'right': 2, 'bottom': 30, 'left': 50 },
        'resetScalesWhenChange' : null
    }
    
    constructor(props){
        super(props);
        this.resetColorScale = this.resetColorScale.bind(this);
        this.updateColorStore = this.updateColorStore.bind(this);

        var colorScale = (
            props.colorScale ||
            d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemePastel1)) ||
            null
        );
            //xAxis, xScale, mergedXAxisData;
        /*
        if (props.xAxisData && props.xAxisGenerator && props.width){
            xScale = d3.scaleTime().rangeRound([0, props.width - props.chartMargin.right - props.chartMargin.left]);
            mergedXAxisData = AreaChart.mergeStackedDataForExtents(props.xAxisData);
            xScale.domain(d3.extent(mergedXAxisData, function(d){
                return d.date;
            }));
            xAxis = props.xAxisGenerator(xScale);
        }
        */
        this.state = { colorScale, 'colorScaleStore' : {} };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.resetScalesWhenChange !== nextProps.resetScalesWhenChange){
            this.resetColorScale();
        }
    }

    resetColorScale(){
        var colorScale      = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemePastel1)),
            colorScaleStore = {};
        this.setState({ colorScale, colorScaleStore });
    }

    updateColorStore(term, color){
        var nextColorScaleStore = _.clone(this.state.colorScaleStore);
        nextColorScaleStore[term] = color;
        this.setState({ 'colorScaleStore' : nextColorScaleStore });
    }

    render(){
        var { children, className, width, chartMargin } = this.props,
            //width = this.getRefWidth() || null,
            newChildren = React.Children.map(children, (child, childIndex) => {
                if (!child) return null;
                return React.cloneElement(child, _.extend({ width, chartMargin, 'updateColorStore' : this.updateColorStore }, this.state));
            });

        return <div ref="elem" className={className || null}>{ newChildren }</div>;
    }

}


export class HorizontalD3ScaleLegend extends React.Component {

    constructor(props){
        super(props);
        this.renderColorItem = this.renderColorItem.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState){
        if (nextProps.colorScale !== this.props.colorScale){
            if (nextProps.colorScaleStore !== this.props.colorScaleStore){
                var currTerms = _.keys(this.props.colorScaleStore),
                    nextTerms = _.keys(nextProps.colorScaleStore);

                // Don't update if no terms in next props; most likely means colorScale[Store] has been reset and being repopulated.
                if (currTerms.length > 0 && nextTerms.length === 0){
                    return false;
                }
            }
        }

        // Emulates PureComponent
        var propKeys = _.keys(nextProps);
        for (var i = 0; i < propKeys.length; i++){
            if (nextProps[propKeys[i]] !== this.props[propKeys[i]]) {
                return true;
            }
        }
        return false;
        //return React.PureComponent.shouldComponentUpdate.apply(this, ...arguments);
    }

    renderColorItem([term, color], idx, all){
        return (
            <div className="col-sm-4 col-md-3 col-lg-2">
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


export class AreaChartContainer extends React.Component {

    static defaultProps = {
        'xAxisGenerator'        : function(x){ // One tick every 2 months
            return d3.axisBottom(x).ticks(d3.timeMonth.every(2));
        },
        'xAxisGeneratorExpanded': function(x){
            return d3.axisBottom(x).ticks(d3.timeMonth.every(1));
        },
        'colorScale' : null
    }

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

    expandButton(expanded, className){
        if (this.props.gridState && this.props.gridState !== 'lg') return null;
        return (
            <Button className={className} bsSize="sm" onClick={this.toggleExpanded} style={{ 'marginTop' : -6 }}>
                <i className={"icon icon-fw icon-search-" + (expanded ? 'minus' : 'plus')}/>
            </Button>
        );
    }

    render(){
        var { title, children, width, defaultHeight, colorScale, xAxisGenerator, xAxisGeneratorExpanded, chartMargin, updateColorStore } = this.props,
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
                'xAxisGenerator'    : expanded ? xAxisGeneratorExpanded || xAxisGenerator : xAxisGenerator,
                'margin'            : chartMargin || children.props.margin || null
            });
        } else { // If no width yet, just for stylistic purposes, don't render chart itself.
            visualToShow = StatisticsChartsView.loadingIcon("Initializing...");
        }

        return (
            <div className={className}>
                <h4 className="text-300">{ title } { this.expandButton(expanded, 'pull-right') }</h4>
                <div ref="elem" style={{ 'overflowX' : expanded ? 'scroll' : 'auto', 'overflowY' : 'hidden' }} children={visualToShow} />
            </div>
        );
    }
}



export const commonParsingFxn = {
    'bucketDocCounts' : function(weeklyIntervalBuckets, externalTermMap){
        var total       = 0,
            subTotals   = {},
            aggsList;

        aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){
            total += bucket.doc_count;
            var subBucketKeysToDate = _.uniq(_.keys(subTotals).concat(
                _.pluck((bucket.group_by && bucket.group_by.buckets) || [], 'key')
            )),
                children = _.map(subBucketKeysToDate, function(term){
                    var subBucket = bucket.group_by && bucket.group_by.buckets && _.findWhere(bucket.group_by.buckets, { 'key' : term }),
                        count     = ((subBucket && subBucket.doc_count) || 0),
                        subTotal  = (subTotals[term] || 0) + count; // == Accumulated count to date.

                    subTotals[term] = subTotal;
                    return { term, count, 'total' : subTotal };
                });

            return {
                'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                'count'    : bucket.doc_count,
                'total'    : total,
                'children' : groupExternalChildren(children, externalTermMap)
            };
        });

        // Ensure each datum has all child terms, even if blank.
        fillMissingChildBuckets(aggsList, _.difference(_.keys(subTotals), _.keys(externalTermMap)));

        return aggsList;
    },
    'bucketTotalFilesCounts' : function(weeklyIntervalBuckets, externalTermMap){
        var total       = 0,
            subTotals   = {},
            aggsList;

        aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){

            var subBucketKeysToDate = _.uniq(_.keys(subTotals).concat(
                _.pluck((bucket.group_by && bucket.group_by.buckets) || [], 'key')
            )),
                children = _.map(subBucketKeysToDate, function(term){
                    var subBucket = bucket.group_by && bucket.group_by.buckets && _.findWhere(bucket.group_by.buckets, { 'key' : term }),
                        count     = ((subBucket && subBucket.total_files && subBucket.total_files.value) || 0),
                        subTotal  = (subTotals[term] || 0) + count;

                    subTotals[term] = subTotal;
                    total += count;

                    return { term, count, 'total' : subTotal };
                });

            return {
                'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                'count'    : bucket.doc_count,
                'total'    : total,
                'children' : groupExternalChildren(children, externalTermMap)
            };
        });

        // Ensure each datum has all child terms, even if blank.
        fillMissingChildBuckets(aggsList, _.difference(_.keys(subTotals), _.keys(externalTermMap))  );

        return aggsList;
    },
    'bucketTotalFilesVolume' : function(weeklyIntervalBuckets, externalTermMap){
        var gigabyte = 1024 * 1024 * 1024,
            total = 0,
            subTotals = {},
            aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){

                var fileSizeVol = ((bucket.total_files_volume && bucket.total_files_volume.value) || 0) / gigabyte,
                    subBucketKeysToDate = _.uniq(_.keys(subTotals).concat(
                        _.pluck((bucket.group_by && bucket.group_by.buckets) || [], 'key')
                    )),
                    children = _.map(subBucketKeysToDate, function(term){
                        var subBucket      = bucket.group_by && bucket.group_by.buckets && _.findWhere(bucket.group_by.buckets, { 'key' : term }),
                            subFileSizeVol = ((subBucket && subBucket.total_files_volume && subBucket.total_files_volume.value) || 0) / gigabyte,
                            subTotal       = (subTotals[term] || 0) + subFileSizeVol;

                        subTotals[term] = subTotal;
                        return { term, 'count' : subFileSizeVol, 'total' : subTotal };
                    });

                total += fileSizeVol;

                return {
                    'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                    'count'    : fileSizeVol,
                    'total'    : total,
                    'children' : groupExternalChildren(children, externalTermMap)
                };
            });

        // Ensure each datum has all child terms, even if blank.
        fillMissingChildBuckets(aggsList, _.difference(_.keys(subTotals), _.keys(externalTermMap)));

        return aggsList;
    }
};



export const aggregationsToChartData = {
    'expsets_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, externalTermMap){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, externalTermMap);
        }
    },
    'expsets_released_internal' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, externalTermMap){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_project_release && resp.aggregations.weekly_interval_project_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, externalTermMap);
        }
    },
    /*
    'expsets_created' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, externalTermMap){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_date_created && resp.aggregations.weekly_interval_date_created.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, externalTermMap);
        }
    },
    */
    'expsets_submitted' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, externalTermMap){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, externalTermMap);
        }
    },
    'files_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, externalTermMap){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketTotalFilesCounts(weeklyIntervalBuckets, externalTermMap);
        }
    },
    'file_volume_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, externalTermMap){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketTotalFilesVolume(weeklyIntervalBuckets, externalTermMap);
        }
    },
    'sessions_by_country' : {
        'requires' : 'TrackingItem',
        'function' : function(resp){
            if (!resp || !resp['@graph']) return null;
            // Notably, we do NOT sum up total here.
            return _.map(resp['@graph'], function(trackingItem, index, allTrackingItems){

                var totalSessions = _.reduce(trackingItem.google_analytics.reports.sessions_by_country, function(sum, trackingItemItem){
                    return sum + trackingItemItem['ga:sessions'];
                }, 0);

                return {
                    'date'      : trackingItem.google_analytics.for_date,
                    'count'     : totalSessions,
                    'total'     : totalSessions,
                    'children'  : _.map(trackingItem.google_analytics.reports.sessions_by_country, function(trackingItemItem){
                        return {
                            'term'      : trackingItemItem['ga:country'],
                            'count'     : trackingItemItem['ga:sessions'],
                            'total'     : trackingItemItem['ga:sessions']
                        };
                    })
                };

            });

        }
    }
};

function fillMissingChildBuckets(aggsList, subAggKeys, externalTermMap){
    _.forEach(aggsList, function(datum){

        _.forEach(subAggKeys, function(k){
            if (externalTermMap && externalTermMap[k]) return;
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

function groupExternalChildren(children, externalTermMap){

    if (!externalTermMap){
        return children;
    }

    var filteredOut = [];
    children = _.filter(children, function(c){
        if (externalTermMap[c.term]) {
            filteredOut.push(c);
            return false;
        }
        return true;
    });
    if (filteredOut.length > 0){
        var externalChild = {
            'term' : 'External',
            'count': 0,
            'total': 0
        };
        _.forEach(filteredOut, function(c){
            externalChild.total += c.total;
            externalChild.count += c.count;
        });
        children.push(externalChild);
    }
    return children;
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
        //'xAxisGenerator'        : function(x){ // One tick every 2 months
        //    return d3.axisBottom(x).ticks(d3.timeMonth.every(2));
        //},
        //'xAxisGeneratorExpanded': function(x){
        //    return d3.axisBottom(x).ticks(d3.timeMonth.every(1));
        //},
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
        var { margin, /*data,*/ yAxisScale, yAxisPower, xAxisGenerator, xAxis, xScale } = this.props;
        var data = this.state.stackedData;
        var svg         = d3.select(this.refs.svg),
            width       = (  this.props.width  || parseInt( this.refs.svg.clientWidth || svg.style('width' ) )  ) - margin.left - margin.right,
            height      = (  this.props.height || parseInt( this.refs.svg.clientHeight || svg.style('height') )  ) - margin.top - margin.bottom,
            x           = xScale || d3.scaleTime().rangeRound([0, width]),
            y           = d3['scale' + yAxisScale]().rangeRound([height, 0]),
            area        = d3.area()
                .x ( function(d){ return x(d.date || d.data.date);  } )
                .y0( function(d){ return Array.isArray(d) ? y(d[0]) : y(0); } )
                .y1( function(d){ return Array.isArray(d) ? y(d[1]) : y(d.total || d.data.total); } );

        if (yAxisScale === 'Pow' && yAxisPower !== null){
            y.exponent(yAxisPower);
        }

        var mergedDataForExtents = AreaChart.mergeStackedDataForExtents(data);

        if (!xScale){
            x.domain(d3.extent(mergedDataForExtents, function(d){ return d.date; }));
        }
        y.domain([ 0, d3.max(mergedDataForExtents, function(d) { return d.total; }) ]);

        var bottomAxisGenerator = xAxis || xAxisGenerator(x);

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

        var { yAxisLabel, margin, updateColorStore } = this.props,
            { data, svg, x, y, width, height, area, leftAxisGenerator, bottomAxisGenerator, rightAxisFxn } = this.commonDrawingSetup(),
            drawn = { svg },
            colorScale = this.props.colorScale || this.colorScale;

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
