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
    AreaChart, AreaChartContainer, loadingIcon, errorIcon, HorizontalD3ScaleLegend } from './../viz/AreaChart';
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
        /*
        var groupByOptions = {
            'sessions' : <span><i className="icon icon-fw icon-users"/>&nbsp; Sessions</span>,
            'views' : <span><i className="icon icon-fw icon-eye"/>&nbsp; Views</span>
        };
        */
        var groupByOptions = {
            'monthly' : <span>By Month (last 12 months)</span>,
            'daily' : <span>By Day (last 2 weeks)</span>
        };
        return (
            <GroupByController groupByOptions={groupByOptions} initialGroupBy="daily">
                <UsageStatsViewController {..._.pick(this.props, 'session', 'windowWidth')}>
                    <UsageStatsView />
                </UsageStatsViewController>
            </GroupByController>
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
                                { icon ? <span><i className={"icon icon-fw icon-" + icon}/>&nbsp;&nbsp;</span> : '' }{ title }
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
                var uri = '/search/?type=TrackingItem&tracking_type=google_analytics&sort=-google_analytics.for_date&format=json';
                if (props.currentGroupBy === 'monthly'){
                    uri += '&google_analytics.date_increment=monthly&limit=12'; // 1 yr (12 mths)
                } else if (props.currentGroupBy === 'daily'){
                    uri += '&google_analytics.date_increment=daily&limit=14'; // 2 weeks (14 days)
                }
                return uri;
            }
        },
        'shouldRefetchAggs' : function(pastProps, nextProps){
            return StatsViewController.defaultProps.shouldRefetchAggs(pastProps, nextProps) || (
                pastProps.currentGroupBy  !== nextProps.currentGroupBy
            );
        }
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
                var uri = '/date_histogram_aggregations/?' + stringify(params) + '&limit=0&format=json';

                // For local dev/debugging; don't forget to comment out if using.
                //uri = 'https://data.4dnucleome.org' + uri;
                return uri;
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
        this.state.externalTermMap = null;
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
            if (pastProps.session !== this.props.session){ // Avoid triggering extra re-aggregation from new/unnecessary term map being loaded.
                this.fetchAndGenerateExternalTermMap(true);
            }
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
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), (externalTermMap && _.keys(externalTermMap)) || [] ));

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
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), (externalTermMap && _.keys(externalTermMap)) || [] ));

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
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), (externalTermMap && _.keys(externalTermMap)) || [] ));

        return aggsList;
    },
    'analytics_to_buckets' : function(resp, reportName, termBucketField, countKey){
        var subBucketKeysToDate = new Set();

        // Notably, we do NOT sum up total here.
        var aggsList =  _.map(resp['@graph'], function(trackingItem, index, allTrackingItems){

            var totalSessions = _.reduce(trackingItem.google_analytics.reports[reportName], function(sum, trackingItemItem){
                return sum + trackingItemItem[countKey];
            }, 0);

            var currItem = {
                'date'      : trackingItem.google_analytics.for_date,
                'count'     : totalSessions,
                'total'     : totalSessions,
                'children'  : _.map(trackingItem.google_analytics.reports[reportName], function(trackingItemItem){
                    var term = typeof termBucketField === 'function' ? termBucketField(trackingItemItem) : trackingItemItem[termBucketField];
                    subBucketKeysToDate.add(term);
                    return {
                        'term'      : term,
                        'count'     : trackingItemItem[countKey],
                        'total'     : trackingItemItem[countKey],
                        'date'      : trackingItem.google_analytics.for_date
                    };
                })
            };

            // Unique-fy
            currItem.children = _.values(_.reduce(currItem.children || [], function(memo, child){
                if (memo[child.term]) {
                    memo[child.term].count += child.count;
                    memo[child.term].total += child.total;
                } else {
                    memo[child.term] = child;
                }
                return memo;
            }, {}));

            return currItem;

        }).reverse(); // We get these in decrementing order from back-end

        commonParsingFxn.fillMissingChildBuckets(aggsList, Array.from(subBucketKeysToDate));

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
    'fields_faceted' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            var countKey = 'ga:totalEvents',
                groupingKey = "ga:dimension3"; // Field name, dot notation

            if (props.currentGroupBy === 'sessions') countKey = 'ga:sessions';
            if (props.fields_faceted_group_by === 'term') groupingKey = 'ga:dimension4';
            if (props.fields_faceted_group_by === 'field+term') groupingKey = 'ga:eventLabel';

            return commonParsingFxn.analytics_to_buckets(resp, 'fields_faceted', groupingKey, countKey);
        }
    },
    'sessions_by_country' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            var countKey = 'ga:pageviews';
            if (props.currentGroupBy === 'sessions') countKey = 'ga:sessions';

            return commonParsingFxn.analytics_to_buckets(resp, 'sessions_by_country', 'ga:country', countKey);
        }
    },
    /*
    'browse_search_queries' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            var countKey = 'ga:pageviews';
            if (props.currentGroupBy === 'sessions') countKey = 'ga:users'; // "Sessions" not saved in analytics for search queries.

            return commonParsingFxn.analytics_to_buckets(resp, 'browse_search_queries', 'ga:searchKeyword', countKey);
        }
    },
    'other_search_queries' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            var countKey = 'ga:pageviews';
            if (props.currentGroupBy === 'sessions') countKey = 'ga:users'; // "Sessions" not saved in analytics for search queries.

            return commonParsingFxn.analytics_to_buckets(resp, 'search_search_queries', 'ga:searchKeyword', countKey);
        }
    },
    */
    'experiment_set_views' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;
            
            //var termBucketField = function(subBucket){ return subBucket['ga:productBrand'] + ' - ' + subBucket['ga:productName']; };
            var termBucketField = 'ga:productBrand';
            var countKey = 'ga:productDetailViews';
            //if (props.currentGroupBy === 'sessions') countKey = 'ga:users'; // "Sessions" not saved in analytics for search queries.

            return commonParsingFxn.analytics_to_buckets(resp, 'views_by_experiment_set', termBucketField, countKey);
        }
    }
};



class UsageStatsView extends StatsChartViewBase {

    static defaultProps = {
        'aggregationsToChartData' : _.pick(
            aggregationsToChartData,
            'sessions_by_country', 'fields_faceted', 'browse_search_queries', 'other_search_queries',
            'experiment_set_views'
        ),
        //'shouldReaggregate' : function(pastProps, nextProps, state){
        //    if (pastProps.currentGroupBy !== nextProps.currentGroupBy) return true;
        //    //if (pastProps.currentGroupBy !== nextProps.currentGroupBy) return true;
        //    return false;
        //}
    };

    
    constructor(props){
        super(props);
        //this.changeFieldFacetedByGrouping = this.changeFieldFacetedByGrouping.bind(this);
        this.changeCountByForChart = this.changeCountByForChart.bind(this);
        this.state.countBy = {};
        _.forEach(_.keys(this.state), (k)=>{
            if (k === 'countBy' || k === 'chartToggles') {
                return;
            }
            this.state.countBy[k] = 'views';
        });
    }

    changeCountByForChart(chartID, nextCountBy){
        setTimeout(()=>{
            // This might take some noticeable amount of time (not enough to justify a worker, tho) so we defer/deprioritize its execution to prevent blocking UI thread.
            this.setState((currState)=>{
                var countBy = _.clone(currState.countBy);
                countBy[chartID] = nextCountBy;
                var nextState = _.extend({}, currState, { countBy });
                _.extend(nextState, this.generateAggsToState(this.props, nextState));
                return nextState;
            });
        }, 0);
    }

    renderCountByDropdown(chartID){
        var currCountBy = this.state.countBy[chartID],
            titles      = {
                'views'     : <span><i className="icon icon-fw icon-eye"/>&nbsp; Views</span>,
                'sessions'  : <span><i className="icon icon-fw icon-users"/>&nbsp; Sessions</span>
            },
            ddtitle     = titles[currCountBy];
        
        return (
            <div className="mb-15">
                <div className="text-400 inline-block">Counting&nbsp;&nbsp;</div>
                <DropdownButton id={"select_count_for_" + chartID} onSelect={(ek, e) => this.changeCountByForChart(chartID, ek)} title={ddtitle}>
                    <MenuItem eventKey="views" key="views">{ titles.views }</MenuItem>
                    <MenuItem eventKey="sessions" key="sessions">{ titles.sessions }</MenuItem>
                </DropdownButton>
            </div>
        );
    }
    
    /*
    changeFieldFacetedByGrouping(toState){
        if (_.keys(UsageStatsView.fieldsFacetedByOptions).indexOf(toState) === -1){
            throw new Error('Must be one of allowable keys.');
        }
        setTimeout(()=>{ // This might take some noticeable amount of time (not enough to justify a worker, tho) so we defer/deprioritize its execution to prevent blocking UI thread.
            this.setState((currState)=>{
                var nextState = _.extend({}, currState, { 'fields_faceted_group_by' : toState });
                _.extend(nextState, this.generateAggsToState(this.props, nextState));
                return nextState;
            });
        }, 0);
    }
    */
    render(){
        var { loadingStatus, mounted, session, groupByOptions, handleGroupByChange, currentGroupBy, respTrackingItem } = this.props,
            { sessions_by_country, chartToggles, fields_faceted, fields_faceted_group_by, browse_search_queries,
                other_search_queries, experiment_set_views
            } = this.state,
            width = this.getRefWidth() || null;

        if (!mounted || !sessions_by_country){
            return <div className="stats-charts-container" ref="elem" children={ loadingIcon() }/>;
        }
        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" ref="elem" children={ errorIcon() }/>;
        }

        var anyExpandedCharts       = _.any(_.values(this.state.chartToggles)),
            commonXDomain           = [ null, null ],
            lastDateStr             = respTrackingItem && respTrackingItem['@graph'] && respTrackingItem['@graph'][0] && respTrackingItem['@graph'][0].google_analytics && respTrackingItem['@graph'][0].google_analytics.for_date,
            firstReportIdx          = respTrackingItem && respTrackingItem['@graph'] && (respTrackingItem['@graph'].length - 1),
            firstDateStr            = respTrackingItem && respTrackingItem['@graph'] && respTrackingItem['@graph'][firstReportIdx] && respTrackingItem['@graph'][firstReportIdx].google_analytics && respTrackingItem['@graph'][firstReportIdx].google_analytics.for_date,
            commonContainerProps    = {
                'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : chartToggles,
                'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
            };

        // Prevent needing to calculate for each chart
        //if (firstDateStr) commonXDomain[0] = new Date(firstDateStr.slice(0,10));
        if (lastDateStr){
            var timeShift = currentGroupBy === 'daily' ? (24*60*60*1000) : (30*24*60*60*1000); // 24 hrs -v- 30 days
            commonXDomain[1] = new Date(lastDateStr + "T00:00:00.000");
            commonXDomain[1].setTime(commonXDomain[1].getTime() + timeShift);
        }
        if (firstDateStr){
            commonXDomain[0] = new Date(firstDateStr + "T00:00:00.000");
        }

        console.log('DD', currentGroupBy, sessions_by_country);

        return (
            <div className="stats-charts-container" ref="elem">

                <GroupByDropdown {...{ groupByOptions, loadingStatus, handleGroupByChange, currentGroupBy }}
                    title="Aggregate" outerClassName="dropdown-container mb-0" />

                { sessions_by_country ?

                    <GroupOfCharts width={width} resetScaleLegendWhenChange={sessions_by_country}>

                        <hr/>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                        <AreaChartContainer {...commonContainerProps} id="sessions_by_country"
                            title={<span className="text-500">{ currentGroupBy === 'sessions' ? 'User Sessions' : 'Page Views' }</span>}>
                            <AreaChart data={sessions_by_country} xDomain={commonXDomain} />
                        </AreaChartContainer>

                    </GroupOfCharts>

                : null }

                {/* browse_search_queries || other_search_queries ?

                    <GroupOfCharts width={width} resetScalesWhenChange={browse_search_queries}>

                        <hr className="mt-3"/>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                        { browse_search_queries ?
                            <AreaChartContainer {...commonContainerProps} id="browse_search_queries"
                                title={<span><span className="text-500">Experiment Set Search Queries</span> { currentGroupBy === 'sessions' ? '- Sessions' : '- Views' }</span>}>
                                <AreaChart data={browse_search_queries} xDomain={commonXDomain} />
                            </AreaChartContainer>
                        : null }

                        { other_search_queries ?
                            <AreaChartContainer {...commonContainerProps} id="other_search_queries"
                                title={<span><span className="text-500">Other Search Queries</span> { currentGroupBy === 'sessions' ? '- Sessions' : '- Views' }</span>}>
                                <AreaChart data={other_search_queries} xDomain={commonXDomain} />
                            </AreaChartContainer>
                        : null }

                    </GroupOfCharts>


                : null */}

                { experiment_set_views ?

                    <GroupOfCharts width={width} resetScalesWhenChange={experiment_set_views}>

                        <hr className="mt-3"/>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                        <AreaChartContainer {...commonContainerProps} id="experiment_set_views"
                            title={<span><span className="text-500">Experiment Set Detail Views</span></span>}>
                            <AreaChart data={experiment_set_views} xDomain={commonXDomain} />
                        </AreaChartContainer>


                    </GroupOfCharts>

                : null }

                { fields_faceted ?

                    <GroupOfCharts width={width} resetScalesWhenChange={browse_search_queries}>

                        <hr className="mt-3"/>
                        {/*
                        <div className="mb-15">
                            <div className="text-400 inline-block">Grouping by&nbsp;&nbsp;</div>
                            <DropdownButton id="select_fields_faceted_group_by" onSelect={this.changeFieldFacetedByGrouping}
                                title={<span className="text-500">{ UsageStatsView.fieldsFacetedByOptions[fields_faceted_group_by] }</span>}>
                                { _.map(_.pairs(UsageStatsView.fieldsFacetedByOptions), ([ key, title ]) => 
                                    <MenuItem eventKey={key} key={key}>{ title }</MenuItem>
                                ) }
                            </DropdownButton>
                        </div>
                        */}
                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                        <AreaChartContainer {...commonContainerProps} id="field_faceted"
                            title={<span><span className="text-500">Fields Faceted</span> { currentGroupBy === 'sessions' ? '- Sessions' : '- Views' }</span>}>
                            <AreaChart data={fields_faceted} xDomain={commonXDomain} />
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




