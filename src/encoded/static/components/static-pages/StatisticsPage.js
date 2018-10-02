'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { stringify } from 'query-string';
import { Button, DropdownButton, MenuItem } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, layout, navigate, ajax, isServerSide, analytics, DateUtility } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import { StatsViewController, StatsChartViewBase, GroupByController, GroupByDropdown, GroupOfCharts,
    AreaChart, AreaChartContainer, loadingIcon, errorIcon } from './../viz/AreaChart';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import * as d3 from 'd3';
import { map } from 'bluebird';


export default class StatisticsPageView extends StaticPage {

    static defaultProps = {
        'defaultTab' : 'submissions'
    };

    static viewOptions = [
        { 'id' : 'submissions', 'title' : "Submissions Statistics", 'icon' : 'upload' },
        { 'id' : 'usage', 'title' : "Usage Statistics", 'icon' : 'users' }
    ];

    constructor(props){
        super(props);
        this.onDropdownChange = this.onDropdownChange.bind(this);
        this.renderSubmissionsSection = this.renderSubmissionsSection.bind(this);
        this.renderUsageSection = this.renderUsageSection.bind(this);
        this.state = { 'currentTab' : props.defaultTab };
    }

    onDropdownChange(currentTab){
        this.setState({ currentTab });
    }

    renderSubmissionsSection(){
        // GroupByController is on outside here because SubmissionStatsViewController detects if props.currentGroupBy has changed in orded to re-fetch aggs.
        return (
            <GroupByController>
                <SubmissionStatsViewController {..._.pick(this.props, 'session', 'browseBaseState', 'windowWidth')}>
                    <SubmissionsStatsView />
                </SubmissionStatsViewController>
            </GroupByController>
        );
    }

    renderUsageSection(){
        var groupByOptions = {
            'sessions' : <span><i className="icon icon-fw icon-users"/>&nbsp; Sessions</span>,
            'views' : <span><i className="icon icon-fw icon-eye"/>&nbsp; Views</span>
        };
        // GroupByController is on inside here because grouping etc is done client-side.
        return (
            <UsageStatsViewController {..._.pick(this.props, 'session', 'windowWidth')}>
                <GroupByController groupByOptions={groupByOptions} initialGroupBy="sessions">
                    <UsageStatsView />
                </GroupByController>
            </UsageStatsViewController>
        );
    }

    render(){
        var currentTab          = this.state.currentTab,
            renderFxn           = currentTab === 'usage' ? this.renderUsageSection : this.renderSubmissionsSection,
            currSectionObj      = _.findWhere(StatisticsPageView.viewOptions, { 'id' : currentTab }),
            currSectionTitle    = (
                <h4 className="text-400 mb-07 mt-07">
                    { currSectionObj.icon ? <i className={"text-medium icon icon-fw icon-" + currSectionObj.icon}/> : '' }
                    { currSectionObj.icon ? <span>&nbsp;&nbsp;</span> : null }
                    { currSectionObj.title }&nbsp;
                </h4>
            );

        return (
            <StaticPage.Wrapper>
                <div className="chart-section-control-wrapper">
                    <h5 className="text-400 mb-08">Currently viewing</h5>
                    <DropdownButton id="section-select-dropdown" title={currSectionTitle} children={_.map(StatisticsPageView.viewOptions, function({ title, id, icon }){
                        return (
                            <MenuItem {...{ title, 'key': id, 'eventKey' : id }} active={id === currentTab}>
                                { icon ? [<i className={"icon icon-fw icon-" + icon}/>, ' '] : '' }{ title }
                            </MenuItem>
                        );
                    })} onSelect={this.onDropdownChange} />
                </div>
                <hr/>
                { renderFxn() }
            </StaticPage.Wrapper>
        );
    }
}

globals.content_views.register(StatisticsPageView, 'StatisticsPage');







class UsageStatsViewController extends StatsViewController {
    static defaultProps = {
        'searchURIs' : {
            'TrackingItem' : function(props) {
                return '/search/?type=TrackingItem&tracking_type=google_analytics&sort=-google_analytics.for_date&limit=14';
            }
        },
        'shouldRefetchAggs' : StatsViewController.defaultProps.shouldRefetchAggs
    };
}


class SubmissionStatsViewController extends StatsViewController {

    static defaultProps = {
        'searchURIs' : {
            'ExperimentSetReplicate' : function(props) {
                var params = navigate.getBrowseBaseParams(props.browseBaseState || null);
                if (props.currentGroupBy){
                    params['group_by'] = props.currentGroupBy;
                }
                //if (props.browseBaseState === 'all') params['group_by'] = ['award.project'];
                return '/date_histogram_aggregations/?' + stringify(params) + '&limit=0';
            },
            //'TrackingItem' : function(props) {
            //    return '/search/?type=TrackingItem&tracking_type=google_analytics&sort=-google_analytics.for_date&limit=14';
            //}
        },
        'shouldRefetchAggs' : function(pastProps, nextProps){
            return StatsViewController.defaultProps.shouldRefetchAggs(pastProps, nextProps) || (
                pastProps.browseBaseState !== nextProps.browseBaseState ||
                pastProps.currentGroupBy  !== nextProps.currentGroupBy
            );
        }
    };

    constructor(props){
        super(props);
        this.fetchAndGenerateExternalTermMap = this.fetchAndGenerateExternalTermMap.bind(this);
        this.state.externalTermMap = {};
    }

    componentDidMount(){
        var nextState = { 'mounted' : true };
        setTimeout(()=>{
            this.fetchAndGenerateExternalTermMap();
            this.performAggRequests();
        }, 100);
        this.setState(nextState);
    }

    componentDidUpdate(pastProps){
        if (this.props.shouldRefetchAggs(pastProps, this.props)){
            this.setState({ 'loadingStatus' : 'loading' });
            this.performAggRequests();
            this.fetchAndGenerateExternalTermMap(true);
        }
    }

    fetchAndGenerateExternalTermMap(refresh = false){
        if (!refresh && this.state.externalTermMap && _.keys(this.state.externalTermMap).length > 0) return;

        ajax.load('/search/?type=Award&limit=all', (resp)=>{
            this.setState({
                'externalTermMap' : _.object(_.map(resp['@graph'] || [], function(award){
                    return [ award.center_title, award.project !== '4DN' ];
                }))
            });
        });
    }

}



export const commonParsingFxn = {
    /**
     * MODIFIES OBJECTS IN PLACE
     */
    'countsToTotals' : function(parsedBuckets, excludeChildren = false){
        var total = 0, subTotals = {};

        _.forEach(parsedBuckets, function(bkt, index){
            total += bkt.count;
            bkt.total = total;
            if (excludeChildren || !Array.isArray(bkt.children)) return;

            _.forEach(bkt.children, function(c){
                c.total = subTotals[c.term] = (subTotals[c.term] || 0) + (c.count || 0);
            });
        });

        return parsedBuckets;
    },
    /**
     * MODIFIES OBJECTS IN PLACE
     */
    'fillMissingChildBuckets' : function(aggsList, subAggTerms = [], externalTermMap = {}){
        _.forEach(aggsList, function(datum){
            _.forEach(subAggTerms, function(term){
                if (externalTermMap && externalTermMap[term]) return;
                if (!_.findWhere(datum.children, { term })){
                    datum.children.push({ term, 'count' : 0, 'total' : 0, 'date' : datum.date });
                }
            });
        });

        var today = new Date(),
            lastDate = aggsList.length > 0 && new Date(aggsList[aggsList.length - 1].date),
            todayAsString = today.toISOString().slice(0,10);

        if (lastDate && lastDate < today){
            aggsList.push(_.extend({}, aggsList[aggsList.length - 1], {
                'date' : todayAsString,
                'count' : 0,
                'children' : _.map(aggsList[aggsList.length - 1].children, function(c){
                    return _.extend({}, c, { 'date' : todayAsString, 'count' : 0 });
                })
            }));
        }
    },
    'bucketDocCounts' : function(weeklyIntervalBuckets, externalTermMap, excludeChildren = false){
        var subBucketKeysToDate = new Set(),
            aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){
                if (excludeChildren){
                    return {
                        'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                        'count'    : bucket.doc_count
                    };
                } else {
                    _.forEach(_.pluck((bucket.group_by && bucket.group_by.buckets) || [], 'key'), subBucketKeysToDate.add.bind(subBucketKeysToDate));
                    var children = _.map(Array.from(subBucketKeysToDate), function(term){
                        // Create a parsed 'bucket' even if none returned from ElasticSearch agg but it has appeared earlier.
                        var subBucket = bucket.group_by && bucket.group_by.buckets && _.findWhere(bucket.group_by.buckets, { 'key' : term }),
                            count     = ((subBucket && subBucket.doc_count) || 0);

                        return { term, count };
                    });

                    return {
                        'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                        'count'    : bucket.doc_count,
                        'children' : groupExternalChildren(children, externalTermMap)
                    };
                }
            });

        // Ensure each datum has all child terms, even if blank.
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), _.keys(externalTermMap)));

        return aggsList;
    },
    'bucketTotalFilesCounts' : function(weeklyIntervalBuckets, externalTermMap){
        var subBucketKeysToDate = new Set(),
            aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){

                _.forEach(_.pluck((bucket.group_by && bucket.group_by.buckets) || [], 'key'), subBucketKeysToDate.add.bind(subBucketKeysToDate));

                var children = _.map(Array.from(subBucketKeysToDate), function(term){
                    var subBucket = bucket.group_by && bucket.group_by.buckets && _.findWhere(bucket.group_by.buckets, { 'key' : term }),
                        count     = ((subBucket && subBucket.total_files && subBucket.total_files.value) || 0);

                    return { term, count };
                });

                return {
                    'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                    'count'    : (bucket && bucket.total_files && bucket.total_files.value) || 0,
                    'children' : groupExternalChildren(children, externalTermMap)
                };
            });

        // Ensure each datum has all child terms, even if blank.
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), _.keys(externalTermMap))  );

        return aggsList;
    },
    'bucketTotalFilesVolume' : function(weeklyIntervalBuckets, externalTermMap){
        var gigabyte = 1024 * 1024 * 1024,
            subBucketKeysToDate = new Set(),
            aggsList = _.map(weeklyIntervalBuckets, function(bucket, index){

                _.forEach(_.pluck((bucket.group_by && bucket.group_by.buckets) || [], 'key'), subBucketKeysToDate.add.bind(subBucketKeysToDate));

                var fileSizeVol = ((bucket.total_files_volume && bucket.total_files_volume.value) || 0) / gigabyte,
                    children = _.map(Array.from(subBucketKeysToDate), function(term){
                        var subBucket      = bucket.group_by && bucket.group_by.buckets && _.findWhere(bucket.group_by.buckets, { 'key' : term }),
                            subFileSizeVol = ((subBucket && subBucket.total_files_volume && subBucket.total_files_volume.value) || 0) / gigabyte;

                        return { term, 'count' : subFileSizeVol };
                    });

                return {
                    'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                    'count'    : fileSizeVol,
                    'children' : groupExternalChildren(children, externalTermMap)
                };
            });

        // Ensure each datum has all child terms, even if blank.
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), _.keys(externalTermMap)));

        return aggsList;
    }
};

export const aggregationsToChartData = {
    'expsets_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, props.externalTermMap)
            );
        }
    },
    'expsets_released_internal' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_project_release && resp.aggregations.weekly_interval_project_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, props.externalTermMap)
            );
        }
    },
    'expsets_released_vs_internal' : {
        'requires' : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;

            var internalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_project_release && resp.aggregations.weekly_interval_project_release.buckets,
                publicBuckets   = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;


            if (!Array.isArray(internalBuckets) || internalBuckets.length < 2) return null;
            if (!Array.isArray(publicBuckets)   || publicBuckets.length < 2) return null;

            var internalList        = commonParsingFxn.bucketDocCounts(internalBuckets, props.externalTermMap, true),
                publicList          = commonParsingFxn.bucketDocCounts(publicBuckets,   props.externalTermMap, true),
                allDates            = _.uniq(_.pluck(internalList, 'date').concat(_.pluck(publicList, 'date'))).sort(), // Used as keys to zip up the non-index-aligned lists.
                makeDatePairFxn     = function(bkt){ return [ bkt.date, bkt ]; },
                internalKeyedByDate = _.object(_.map(internalList, makeDatePairFxn)),
                publicKeyedByDate   = _.object(_.map(publicList,   makeDatePairFxn)),
                combinedAggList     = _.map(allDates, function(dateString){
                    var internalBucket  = internalKeyedByDate[dateString] || null,
                        publicBucket    = publicKeyedByDate[dateString]   || null,
                        comboBucket     = {
                            'date' : dateString,
                            'count' : 0,
                            'children' : [
                                { 'term' : 'Internally Released', 'count' : 0 }, // We'll fill these counts up shortly
                                { 'term' : 'Publically Released', 'count' : 0 }
                            ]
                        };

                    if (internalBucket){
                        comboBucket.children[0].count = comboBucket.count = internalBucket.count; // Use as outer bucket count/bound, also
                    }
                    if (publicBucket){
                        comboBucket.children[1].count = publicBucket.count;
                    }
                    return comboBucket;
                });

            commonParsingFxn.countsToTotals(combinedAggList);
            _.forEach(combinedAggList, function(comboBucket){ // Calculate diff from totals-to-date.
                if (comboBucket.total < comboBucket.children[1].total){
                    console.error('Public release count be higher than project release count!!!!', comboBucket.date, comboBucket);
                    // TODO: Trigger an e-mail alert to wranglers from Google Analytics UI if below exception occurs.
                    analytics.exception("StatisticsPage: Public release total is higher than project release total at date " + comboBucket.date);
                }
                comboBucket.children[0].total -= comboBucket.children[1].total;
            });
            return combinedAggList;
        }
    },
    /*
    'expsets_created' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_date_created && resp.aggregations.weekly_interval_date_created.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, props.externalTermMap);
        }
    },
    */
    /*
    'expsets_submitted' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, props.externalTermMap);
        }
    },
    */
    'files_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp && resp.aggregations && resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketTotalFilesCounts(weeklyIntervalBuckets, props.externalTermMap)
            );
        }
    },
    'file_volume_released' : {
        'requires'  : 'ExperimentSetReplicate',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            var weeklyIntervalBuckets = resp.aggregations.weekly_interval_public_release && resp.aggregations.weekly_interval_public_release.buckets;
            if (!Array.isArray(weeklyIntervalBuckets) || weeklyIntervalBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketTotalFilesVolume(weeklyIntervalBuckets, props.externalTermMap)
            );
        }
    },
    'sessions_by_country' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            var countKey = 'ga:sessions';
            if (props.currentGroupBy === 'views') countKey = 'ga:pageviews';

            var subBucketKeysToDate = new Set();

            // Notably, we do NOT sum up total here.
            var aggsList =  _.map(resp['@graph'], function(trackingItem, index, allTrackingItems){

                var totalSessions = _.reduce(trackingItem.google_analytics.reports.sessions_by_country, function(sum, trackingItemItem){
                    return sum + trackingItemItem[countKey];
                }, 0);

                return {
                    'date'      : trackingItem.google_analytics.for_date,
                    'count'     : totalSessions,
                    'total'     : totalSessions,
                    'children'  : _.map(trackingItem.google_analytics.reports.sessions_by_country, function(trackingItemItem){
                        subBucketKeysToDate.add(trackingItemItem['ga:country']);
                        return {
                            'term'      : trackingItemItem['ga:country'],
                            'count'     : trackingItemItem[countKey],
                            'total'     : trackingItemItem[countKey],
                            'date'      : trackingItem.google_analytics.for_date
                        };
                    })
                };

            }).reverse();

            commonParsingFxn.fillMissingChildBuckets(aggsList, Array.from(subBucketKeysToDate));

            return aggsList;

        }
    }
};





class UsageStatsView extends StatsChartViewBase {

    static defaultProps = {
        'aggregationsToChartData' : aggregationsToChartData,
        'shouldReaggregate' : function(pastProps, nextProps){
            if (pastProps.currentGroupBy !== nextProps.currentGroupBy) {
                return true;
            }
            return false;
        }
    };

    render(){
        var { loadingStatus, mounted, session, groupByOptions, handleGroupByChange, currentGroupBy } = this.props,
            { sessions_by_country, chartToggles } = this.state,
            width = this.getRefWidth() || null;

        if (!mounted || (loadingStatus === 'loading')){
            return <div className="stats-charts-container" ref="elem" children={ loadingIcon() }/>;
        }
        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" ref="elem" children={ errorIcon() }/>;
        }

        var anyExpandedCharts = _.any(_.values(this.state.chartToggles)),
            commonContainerProps = {
                'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : chartToggles,
                'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
            };

        return (
            <div className="stats-charts-container" ref="elem">

                <GroupByDropdown {...{ groupByOptions, loadingStatus, handleGroupByChange, currentGroupBy }} title="Counting" />

                { sessions_by_country ?

                    <GroupOfCharts width={width} resetScalesWhenChange={sessions_by_country}>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                        <AreaChartContainer {...commonContainerProps} id="sessions_by_country"
                            title={<span className="text-500">{ currentGroupBy === 'sessions' ? 'User Sessions' : 'Page Views' }</span>}>
                            <AreaChart data={sessions_by_country} xDomain={[ null, null ]} />
                        </AreaChartContainer>

                    </GroupOfCharts>

                : null }

            </div>
        );
    }



}

class SubmissionsStatsView extends StatsChartViewBase {

     /**
     * Use this only for charts with child terms 'Internal Release' and 'Public Release', which are
     * meant to have a separate color scale and child terms from other charts.
     *
     * @param {string} term - One of 'Internal Release' or 'Public Release'.
     * @returns {string} A CSS-valid color string.
     */
    static colorScaleForPublicVsInternal(term){
        if (term === 'Internal Release' || term === 'Internally Released'){
            return '#ff7f0e'; // Orange
        } else if (term === 'Public Release' || term === 'Publically Released'){
            return '#1f77b4'; // Blue
        } else {
            throw new Error("Term supplied is not one of 'Internal Release' or 'Public Release': '" + term + "'.");
        }
    }

    static defaultProps = {
        'aggregationsToChartData' : aggregationsToChartData
    };

    render(){
        var { loadingStatus, mounted, session, currentGroupBy, groupByOptions, handleGroupByChange } = this.props,
            { expsets_released, expsets_released_internal, files_released, file_volume_released, sessions_by_country, expsets_released_vs_internal,
                expsets_created, chartToggles } = this.state,
            width = this.getRefWidth() || null;

        if (!mounted || (!expsets_released)){
            return <div className="stats-charts-container" ref="elem" children={ loadingIcon() }/>;
        }
        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" ref="elem" children={ errorIcon() }/>;
        }

        var anyExpandedCharts = _.any(_.values(this.state.chartToggles)),
            commonContainerProps = {
                'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : chartToggles,
                'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
            },
            showInternalReleaseCharts = session && expsets_released_internal && expsets_released_vs_internal;

        return (
            <div className="stats-charts-container" ref="elem">

                { showInternalReleaseCharts ?

                    <GroupOfCharts width={width} colorScale={SubmissionsStatsView.colorScaleForPublicVsInternal}>

                        <AreaChartContainer {...commonContainerProps} id="expsets_released_vs_internal" title={<span><span className="text-500">Experiment Sets</span> - internal vs public release</span>}>
                            <AreaChart data={expsets_released_vs_internal} />
                        </AreaChartContainer>

                        <hr/>

                    </GroupOfCharts>

                : null }

                <GroupOfCharts width={width} resetScalesWhenChange={expsets_released}>

                    <GroupByDropdown {...{ currentGroupBy, groupByOptions, handleGroupByChange, loadingStatus }}/>

                    <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    <AreaChartContainer {...commonContainerProps} id="expsets_released" title={<span><span className="text-500">Experiment Sets</span> - publicly released</span>}>
                        <AreaChart data={expsets_released} />
                    </AreaChartContainer>

                    {/* expsets_created ?           // ~=== 'Experiment Sets Submitted'
                        <AreaChartContainer {...commonContainerProps} id="expsets_created" title={<span><span className="text-500">Experiment Sets</span> submitted over time</span>}>
                            <AreaChart data={expsets_created} />
                        </AreaChartContainer>
                    : null */}

                    { showInternalReleaseCharts ?
                        <AreaChartContainer {...commonContainerProps} id="expsets_released_internal" title={<span><span className="text-500">Experiment Sets</span> - internally released</span>}>
                            <AreaChart data={expsets_released_internal} />
                        </AreaChartContainer>
                    : null }

                    <AreaChartContainer {...commonContainerProps} id="files_released" title={<span><span className="text-500">Files</span> - publicly released</span>}>
                        <AreaChart data={files_released} />
                    </AreaChartContainer>

                    <AreaChartContainer {...commonContainerProps} id="file_volume_released" title={<span><span className="text-500">Total File Size</span> - publicly released</span>}>
                        <AreaChart data={file_volume_released} yAxisLabel="GB" />
                    </AreaChartContainer>

                </GroupOfCharts>

                { sessions_by_country ?
                    <GroupOfCharts>
                        <AreaChartContainer {...commonContainerProps} id="sessions_by_country" title={<span><span className="text-500">User Sessions</span> last month</span>}>
                            <AreaChart data={sessions_by_country} xDomain={[ null, null ]} />
                        </AreaChartContainer>
                    </GroupOfCharts>
                : null }

            </div>
        );
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




