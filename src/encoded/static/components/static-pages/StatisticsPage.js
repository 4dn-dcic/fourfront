'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { stringify } from 'query-string';
import { console, layout, navigate, ajax } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import * as d3 from 'd3';


export default class StatisticsPageView extends StaticPage {

    render(){
        return (
            <StaticPage.Wrapper>
                <StatisticsViewController>
                    <layout.WindowResizeUpdateTrigger>
                        <StatisticsChartsView />
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
        'File'                      : '/search/?type=File&experiments.display_title!=No%20value&limit=0',
        'ExperimentSetReplicate'    : function(props) {
            return '/search/?' + stringify(navigate.getBrowseBaseParams()) + '&limit=0';
        }
    };

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

    loadingIcon(){
        return (
            <div className="mt-5 mb-5 text-center">
                <i className="icon icon-fw icon-spin icon-circle-o-notch icon-2x" style={{ opacity : 0.5 }}/>
                <h5 className="text-400">Loading Chart Data</h5>
            </div>
        );
    }

    errorIcon(){
        return (
            <div className="mt-5 mb-5 text-center">
                <i className="icon icon-fw icon-times icon-2x"/>
                <h5 className="text-400">Loading failed. Please try again later.</h5>
            </div>
        );
    }

    render(){
        var { loadingStatus, mounted, respFile, respExperimentSetReplicate } = this.props;
        if (!mounted || loadingStatus === 'loading')    return this.loadingIcon();
        if (loadingStatus === 'failed')                 return this.errorIcon();
        return (
            <div className="stats-charts-container">
                <div className="row">

                    <div className="col-xs-12 col-lg-6">
                        <h4 className="text-300">
                            <span className="text-500">Experiment Sets</span> released over time
                        </h4>
                        <AreaChart data={aggregationsToChartData[0].function(respExperimentSetReplicate)} />
                    </div>

                    <div className="col-xs-12 col-lg-6">
                        <h4 className="text-300">
                            <span className="text-500">Files</span> released over time
                        </h4>
                        <AreaChart data={aggregationsToChartData[1].function(respFile)} />
                    </div>

                </div>

                <div className="row mt-3">

                    <div className="col-xs-12 col-lg-6">
                        <h4 className="text-300">
                            <span className="text-500">Total File Size</span> released over time
                        </h4>
                        <AreaChart data={aggregationsToChartData[2].function(respFile)} yAxisScale="Pow" yAxisPower={2} yAxisLabel="MB" />
                    </div>

                </div>
            </div>
        );
    }

}

export const aggregationsToChartData = [
    {
        'requires'  : 'ExperimentSetReplicate',
        'title'     : 'Experiment Set Public Releases',
        'function'  : function(resp){
            if (!resp.aggregations) return null;
            var weeklyIntervalBuckets = resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            var total = 0;
            var subTotals = {};
            var aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){
                total += bucket.doc_count;
                return {
                    'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                    'count'    : bucket.doc_count,
                    'total'    : total,
                    'children' : _.map((bucket.group_by_award && bucket.group_by_award.buckets) || [], function(subBucket){
                        subTotals[subBucket.key] = (subTotals[subBucket.key] || 0) + subBucket.doc_count;
                        return {
                            'term'  : subBucket.key,
                            'count' : subBucket.doc_count,
                            'total' : subTotals[subBucket.key]
                        };
                    })
                };
            });

            return aggsList;
        }
    },
    {
        'requires'  : 'File',
        'title'     : 'File Public Releases',
        'function'  : function(resp){
            // Same as for ExpSets
            return aggregationsToChartData[0].function(resp);
        }
    },
    {
        'requires'  : 'File',
        'title'     : 'File Volume Released',
        'function'  : function(resp){
            if (!resp.aggregations) return null;
            var weeklyIntervalBuckets = resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            var gigabyte = 1024 * 1024 * 1024,
                total = 0,
                subTotals = {},
                aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){
                    var fileSizeVol = ((bucket.file_size_volume && bucket.file_size_volume.value) || 0) / gigabyte;
                    total += fileSizeVol;
                    return {
                        'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                        'count'    : fileSizeVol,
                        'total'    : total,
                        'children' : _.map((bucket.group_by_award && bucket.group_by_award.buckets) || [], function(subBucket){
                            var subFileSizeVol = ((subBucket.file_size_volume && subBucket.file_size_volume.value) || 0) / gigabyte;
                            subTotals[subBucket.key] = (subTotals[subBucket.key] || 0) + subFileSizeVol;
                            return {
                                'term'  : subBucket.key,
                                'count' : subFileSizeVol,
                                'total' : subTotals[subBucket.key]
                            };
                        })
                    };
                });

            return aggsList;
        }
    }
];


export class AreaChart extends React.PureComponent {

    static defaultProps = {
        'margin'        : { 'top': 30, 'right': 20, 'bottom': 30, 'left': 50 },
        'data'          : null,
        'd3TimeFormat'  : '%Y-%m-%d',
        'stackChildren' : true,
        'height'        : 300,
        'yAxisLabel'    : 'Count',
        'yAxisScale'    : 'Linear', // Must be one of 'Linear', 'Log', 'Pow'
        'yAxisPower'    : null
    };

    constructor(props){
        super(props);
        this.drawNewChart = this.drawNewChart.bind(this);
        this.parseTime = d3.timeParse(props.d3TimeFormat);
        this.state = {
            'drawingError' : false,
            'drawn' : false
        };
    }

    componentDidMount(){
        this.drawNewChart();
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.d3TimeFormat !== this.props.d3TimeFormat){
            this.parseTime = d3.timeParse(nextProps.d3TimeFormat);
        }
    }

    componentDidUpdate(pastProps, pastState){
        // TODO: this.updateExistingChart();
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

        requestAnimationFrame(()=>{

            var { margin, data, stackChildren, yAxisLabel, yAxisScale, yAxisPower } = this.props;
            var svg         = d3.select(this.refs.svg),
                width       = (this.props.width  || parseInt(svg.style('width' ))) - margin.left - margin.right,
                height      = (this.props.height || parseInt(svg.style('height'))) - margin.top - margin.bottom,
                drawn       = { svg };

            var x       = d3.scaleTime().rangeRound([0, width]),
                y       = d3['scale' + yAxisScale]().rangeRound([height, 0]),
                area    = d3.area()
                    .x ( function(d){ return x(d.date || d.data.data);  } )
                    .y1( function(d){ return Array.isArray(d) ? y(d[1]) : y(d.total || d.data.total); } )
                    .y0( function(d){ return Array.isArray(d) ? y(d[0]) : y(0); } ),
                stack   = d3.stack().value(function(d){ return d.total; }),
                childKeys;

            if (yAxisScale === 'Pow' && yAxisPower !== null){
                y.exponent(yAxisPower);
            }

            // Convert timestamps to D3 date objects.
            data = _.map(data, (d) => {
                var formattedDate = (new Date(d.date.slice(0,10))).toISOString().slice(0,10);
                return _.extend({}, d, {
                    'date' : this.parseTime(formattedDate),
                    'origDate' : formattedDate
                });
            });

            // Get child keys if needed.
            childKeys = Array.from(_.reduce(data, function(m,d){
                _.forEach(d.children || [], function(child){ m.add(child.term); });
                return m;
            }, new Set()));

            x.domain(d3.extent(data, function(d){ return d.date; }));
            y.domain([ 0, d3.max(data, function(d) { return d.total; }) ]);
            if (childKeys.length > 0){
                stack.keys(childKeys);
                console.log('CXCCC', childKeys, stack(data));
            }

            var bottomAxisGenerator = d3.axisBottom(x)
                .ticks(d3.timeMonth.every(2)); // One tick every 2 months

            var rightAxisGenerator = d3.axisRight(y).tickSize(width),
                rightAxisFxn = function(g){
                    g.call(rightAxisGenerator);
                    g.select('.domain').remove();
                    g.selectAll('.tick > text').remove();
                    g.selectAll('.tick > line')
                        .attr('opacity', 0.2)
                        .attr("stroke", "#777")
                        .attr("stroke-dasharray", "2,2");
                };

            drawn.g = svg.append("g").attr('transform', "translate(" + margin.left + "," + margin.top + ")");

            console.log('CXCCC', stack(data));
        
            //drawn.layer = drawn.g.selectAll('.layer')
            //    .data(data)
            //    .enter().append('g').attr('class', 'layer');

            drawn.path = drawn.g.append('path')
                .datum(data)
                .attr('fill', 'steelblue')
                .attr('d', area);

            drawn.xAxis = drawn.g.append('g')
                .attr("transform", "translate(0," + height + ")")
                .call(bottomAxisGenerator);

            drawn.yAxis = drawn.g.append('g')
                .call(d3.axisLeft(y))
                .append('text')
                .attr("fill", "#000")
                .attr("x", 0)
                //.attr("y", -12)
                //.attr('transform', 'rotate(-45)')
                .attr("y", -20)
                .attr("dy", "0.71em")
                //.attr("text-anchor", "start")
                .attr("text-anchor", "end")
                .text(yAxisLabel);

            drawn.rightAxis = drawn.g.append('g').call(rightAxisFxn);

            this.drawnD3Elements = drawn;

        });
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

    }

    render(){
        var { data, width, height } = this.props;
        if (!this.props.data || this.state.drawingError) {
            return <div>Error</div>;
        }
        return <svg ref="svg" className="area-chart" width={this.props.width || "100%"} height={this.props.height || null} />;
    }

}


globals.content_views.register(StatisticsPageView, 'StatisticsPage');
