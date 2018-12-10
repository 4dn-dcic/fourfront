'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { stringify } from 'query-string';
import { Button, DropdownButton, MenuItem, Checkbox } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import url from 'url';
import { console, layout, navigate, ajax, isServerSide, analytics, DateUtility } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import { StatsViewController, StatsChartViewBase, GroupByController, GroupByDropdown, GroupOfCharts,
    AreaChart, AreaChartContainer, loadingIcon, errorIcon, HorizontalD3ScaleLegend } from './../viz/AreaChart';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import * as d3 from 'd3';
import moment from 'moment';


export default class StatisticsPageView extends StaticPage {

    static defaultProps = {
        'defaultTab' : 'submissions'
    };

    static viewOptions = [
        { 'id' : 'submissions', 'title' : "Submissions Statistics", 'icon' : 'upload', 'tip' : "View statistics related to submission and release of Experiment Set" },
        { 'id' : 'usage', 'title' : "Usage Statistics", 'icon' : 'users', 'tip' : "View statistics related to usage of the 4DN Data Portal" }
    ];

    constructor(props){
        super(props);
        this.maybeUpdateCurrentTabFromHref = this.maybeUpdateCurrentTabFromHref.bind(this);
        this.onDropdownChange = this.onDropdownChange.bind(this);
        this.renderSubmissionsSection = this.renderSubmissionsSection.bind(this);
        this.renderUsageSection = this.renderUsageSection.bind(this);
        this.renderDropdown = this.renderDropdown.bind(this);
        this.renderTopMenu = this.renderTopMenu.bind(this);
        this.state = { 'currentTab' : props.defaultTab };
    }

    componentDidMount(){
        this.maybeUpdateCurrentTabFromHref();
    }

    componentWillReceiveProps(nextProps){
        if (this.props.href !== nextProps.href){
            this.maybeUpdateCurrentTabFromHref(nextProps);
        }
    }

    maybeUpdateCurrentTabFromHref(props = this.props){
        var hrefParts = props.href && url.parse(props.href),
            hash = hrefParts && hrefParts.hash && hrefParts.hash.replace('#', '');

        if (hash && hash !== this.state.currentTab && hash.charAt(0) !== '!'){
            if (_.pluck(StatisticsPageView.viewOptions, 'id').indexOf(hash) > -1){
                this.setState({ 'currentTab' : hash });
            }
        }
    }

    onDropdownChange(currentTab){
        this.setState({ currentTab });
    }

    renderSubmissionsSection(){
        // GroupByController is on outside here because SubmissionStatsViewController detects if props.currentGroupBy has changed in orded to re-fetch aggs.
        var groupByOptions = {
                'award.project'                      : <span><i className="icon icon-fw icon-institution"/>&nbsp; Project</span>
            },
            initialGroupBy = 'award.project';

        if (this.props.browseBaseState !== 'all'){
            _.extend(groupByOptions, {
                'award.center_title'                 : <span><i className="icon icon-fw icon-institution"/>&nbsp; Center</span>,
                'lab.display_title'                  : <span><i className="icon icon-fw icon-users"/>&nbsp; Lab</span>,
                'experiments_in_set.experiment_type' : <span><i className="icon icon-fw icon-bar-chart"/>&nbsp; Experiment Type</span>
            }),
            initialGroupBy = 'award.center_title';
        }
        return (
            <GroupByController {...{ groupByOptions, initialGroupBy }}>
                <SubmissionStatsViewController {..._.pick(this.props, 'session', 'browseBaseState', 'windowWidth')}>
                    <SubmissionsStatsView />
                </SubmissionStatsViewController>
            </GroupByController>
        );
    }

    renderUsageSection(){
        var groupByOptions = {
            'monthly'   : <span>Previous 12 Months</span>,
            'daily'     : <span>Previous 30 Days</span>
        };
        return (
            <GroupByController groupByOptions={groupByOptions} initialGroupBy="daily">
                <UsageStatsViewController {..._.pick(this.props, 'session', 'windowWidth')}>
                    <UsageStatsView/>
                </UsageStatsViewController>
            </GroupByController>
        );
    }

    /**
     * Old dropdown for selecting 'Usage' or 'Submissions' view. May be removed after design iteration.
     *
     * @deprecated
     */
    renderDropdown(){
        var currentTab          = this.state.currentTab,
            currSectionObj      = _.findWhere(StatisticsPageView.viewOptions, { 'id' : currentTab }),
            currSectionTitle    = (
                <h4 className="text-400 mb-07 mt-07">
                    { currSectionObj.icon ? <i className={"text-medium icon icon-fw icon-" + currSectionObj.icon}/> : '' }
                    { currSectionObj.icon ? <span>&nbsp;&nbsp;</span> : null }
                    { currSectionObj.title }&nbsp;
                </h4>
            );

        return (
            <div className="chart-section-control-wrapper">
                <h5 className="text-400 mb-08">Currently viewing</h5>
                <DropdownButton id="section-select-dropdown" title={currSectionTitle} children={_.map(StatisticsPageView.viewOptions, function({ title, id, icon }){
                    return (
                        <MenuItem {...{ title, 'key': id, 'eventKey' : id }} active={id === currentTab}>
                            { icon ? <React.Fragment><i className={"icon icon-fw icon-" + icon}/>&nbsp;&nbsp;</React.Fragment> : '' }{ title }
                        </MenuItem>
                    );
                })} onSelect={this.onDropdownChange} />
            </div>
        );
    }

    renderTopMenu(){
        var currentTab          = this.state.currentTab,
            submissionsObj      = _.findWhere(StatisticsPageView.viewOptions, { 'id' : 'submissions' }),
            usageObj            = _.findWhere(StatisticsPageView.viewOptions, { 'id' : 'usage' });

        return (
            <div className="chart-section-control-wrapper row">
                <div className="col-sm-6">
                    <a className={"select-section-btn" + (currentTab === 'submissions' ? ' active' : '')}
                        href="#submissions" data-tip={currentTab === 'submissions' ? null : submissionsObj.tip} data-target-offset={110}>
                        { submissionsObj.icon ? <React.Fragment><i className={"text-medium icon icon-fw icon-" + submissionsObj.icon}/>&nbsp;&nbsp;</React.Fragment> : '' }
                        { submissionsObj.title }
                    </a>
                </div>
                <div className="col-sm-6">
                    <a className={"select-section-btn" + (currentTab === 'usage' ? ' active' : '')}
                        href="#usage" data-tip={currentTab === 'usage' ? null : usageObj.tip} data-target-offset={100}>
                        { usageObj.icon ? <React.Fragment><i className={"text-medium icon icon-fw icon-" + usageObj.icon}/>&nbsp;&nbsp;</React.Fragment> : '' }
                        { usageObj.title }
                    </a>
                </div>
            </div>
        );
    }

    render(){
        var currentTab          = this.state.currentTab,
            renderFxn           = currentTab === 'usage' ? this.renderUsageSection : this.renderSubmissionsSection;

        return (
            <StaticPage.Wrapper>
                { this.renderTopMenu() }
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
                    uri += '&google_analytics.date_increment=daily&limit=30'; // 30 days
                }
                return uri;
            },
            'TrackingItemDownload' : function(props) {
                var untilDate   = moment.utc(),
                    fromDate,
                    uri         = '/date_histogram_aggregations/?date_histogram=date_created&type=TrackingItem&tracking_type=download_tracking';
                uri += '&group_by=download_tracking.experiment_type&group_by=download_tracking.geo_country&group_by=download_tracking.is_visualization&group_by=download_tracking.file_format';
                if (props.currentGroupBy === 'monthly'){
                    untilDate.startOf('month').subtract(1, 'minute'); // Last minute of previous month
                    fromDate = untilDate.clone();
                    fromDate.subtract(12, 'month'); // Go back 12 months
                    uri += '&date_histogram_interval=monthly&date_created.from=' + fromDate.format('YYYY-MM-DD') + '&date_created.to=' + untilDate.format('YYYY-MM-DD'); // '&google_analytics.date_increment=monthly&limit=12'; // 1 yr (12 mths)
                } else if (props.currentGroupBy === 'daily'){
                    fromDate = untilDate.clone();
                    untilDate.subtract(1, 'day');
                    fromDate.subtract(30, 'day'); // Go back 30 days
                    uri += '&date_histogram_interval=daily&date_created.from=' + fromDate.format('YYYY-MM-DD') + '&date_created.to=' + untilDate.format('YYYY-MM-DD');
                }
                return uri;
            }
        },
        /**
         * Return a boolean to refetch all, or list of strings to refetch specific searchURIs.
         *
         * @returns {boolean|string[]}
         */
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
            }
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
            if (this && this.state.mounted){
                this.setState({
                    'externalTermMap' : _.object(_.map(resp['@graph'] || [], function(award){
                        return [ award.center_title, award.project !== '4DN' ];
                    }))
                });
            }
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
     * Doesn't add up totals, just renames 'count' property to 'total' property.
     * MODIFIES IN PLACE.
     */
    'countsToCountTotals' : function(parsedBuckets, excludeChildren = false){
        _.forEach(parsedBuckets, function(bkt){
            bkt.total = bkt.count;
            _.forEach(bkt.children, function(c){
                c.total = c.count;
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
    /**
     * Converts date_histogram, histogram, or range aggregations from ElasticSearch result into similar but simpler bucket structure.
     * Sets 'count' to be 'doc_count' value from histogram.
     *
     * @param {{ key_as_string: string, doc_count: number, group_by?: { buckets: { doc_count: number, key: string  }[] } }[]} intervalBuckets - Raw aggregation results returned from ElasticSearch
     * @param {Object.<string>} [externalTermMap] - Object which maps external terms to true (external data) or false (internal data).
     * @param {boolean} [excludeChildren=false] - If true, skips aggregating up children to increase performance very slightly.
     */
    'bucketDocCounts' : function(intervalBuckets, groupByField, externalTermMap, excludeChildren = false){
        var subBucketKeysToDate = new Set(),
            aggsList = _.map(intervalBuckets, function(bucket, index){
                if (excludeChildren === true){
                    return {
                        'date'     : bucket.key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                        'count'    : bucket.doc_count
                    };
                } else {

                    _.forEach(_.pluck((bucket[groupByField] && bucket[groupByField].buckets) || [], 'key'), subBucketKeysToDate.add.bind(subBucketKeysToDate));

                    var children = _.map(Array.from(subBucketKeysToDate), function(term){
                        // Create a parsed 'bucket' even if none returned from ElasticSearch agg but it has appeared earlier.
                        var subBucket = bucket[groupByField] && bucket[groupByField].buckets && _.findWhere(bucket[groupByField].buckets, { 'key' : term }),
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

        if (subBucketKeysToDate.size === 0){ // No group by defined, fill with dummy child for each.
            _.forEach(aggsList, function(dateBucket){
                dateBucket.children = [{ term : null, count : dateBucket.count }];
            });
            subBucketKeysToDate.add(null);
        }

        // Ensure each datum has all child terms, even if blank.
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), (externalTermMap && _.keys(externalTermMap)) || [] ));

        return aggsList;
    },
    /**
     * Converts date_histogram, histogram, or range aggregations from ElasticSearch result into similar but simpler bucket structure.
     * Sets 'count' to be 'bucket.total_files.value' value from histogram.
     *
     * @param {{ key_as_string: string, doc_count: number, group_by?: { buckets: { doc_count: number, key: string  }[] } }[]} intervalBuckets - Raw aggregation results returned from ElasticSearch
     * @param {Object.<string>} [externalTermMap] - Object which maps external terms to true (external data) or false (internal data).
     */
    'bucketTotalFilesCounts' : function(intervalBuckets, groupByField, externalTermMap){
        var subBucketKeysToDate = new Set(),
            aggsList = _.map(intervalBuckets, function(bucket, index){

                _.forEach(_.pluck((bucket[groupByField] && bucket[groupByField].buckets) || [], 'key'), subBucketKeysToDate.add.bind(subBucketKeysToDate));

                var children = _.map(Array.from(subBucketKeysToDate), function(term){
                    var subBucket = bucket[groupByField] && bucket[groupByField].buckets && _.findWhere(bucket[groupByField].buckets, { 'key' : term }),
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
    'bucketTotalFilesVolume' : function(intervalBuckets, groupByField, externalTermMap){
        var gigabyte = 1024 * 1024 * 1024,
            subBucketKeysToDate = new Set(),
            aggsList = _.map(intervalBuckets, function(bucket, index){

                _.forEach(_.pluck((bucket[groupByField] && bucket[groupByField].buckets) || [], 'key'), subBucketKeysToDate.add.bind(subBucketKeysToDate));

                var fileSizeVol = ((bucket.total_files_volume && bucket.total_files_volume.value) || 0) / gigabyte,
                    children = _.map(Array.from(subBucketKeysToDate), function(term){
                        var subBucket      = bucket[groupByField] && bucket[groupByField].buckets && _.findWhere(bucket[groupByField].buckets, { 'key' : term }),
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
                commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, props.currentGroupBy, props.externalTermMap)
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
                commonParsingFxn.bucketDocCounts(weeklyIntervalBuckets, props.currentGroupBy, props.externalTermMap)
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
                                { 'term' : 'Publicly Released', 'count' : 0 }
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
                commonParsingFxn.bucketTotalFilesCounts(weeklyIntervalBuckets, props.currentGroupBy, props.externalTermMap)
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
                commonParsingFxn.bucketTotalFilesVolume(weeklyIntervalBuckets, props.currentGroupBy, props.externalTermMap)
            );
        }
    },
    'fields_faceted' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            var countKey    = 'ga:totalEvents',
                groupingKey = "ga:dimension3"; // Field name, dot notation

            if (props.countBy.fields_faceted === 'sessions') countKey = 'ga:sessions';
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
            if (props.countBy.sessions_by_country === 'sessions') countKey = 'ga:sessions';

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
            var termBucketField = 'ga:productBrand',
                countKey        = 'ga:productDetailViews';

            if (props.countBy.experiment_set_views === 'list_views') countKey = 'ga:productListViews';
            else if (props.countBy.experiment_set_views === 'clicks') countKey = 'ga:productListClicks';

            return commonParsingFxn.analytics_to_buckets(resp, 'views_by_experiment_set', termBucketField, countKey);
        }
    },
    /**
     * For this function, props.currentGroupBy is the interval or time duration, not the actual 'group by' as it is for submissions.
     * Instead, `props.countBy.file_downloads` is used similar to the google analytics approach.
     */
    'file_downloads' : {
        'requires'  : 'TrackingItemDownload',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations || !props.countBy || !props.countBy.file_downloads) return null;
            var dateAggBucket = props.currentGroupBy && props.currentGroupBy + '_interval_date_created',
                dateIntervalBuckets = resp && resp.aggregations && resp.aggregations[dateAggBucket] && resp.aggregations[dateAggBucket].buckets;

            if (!Array.isArray(dateIntervalBuckets) || dateIntervalBuckets.length < 2) return null;

            return commonParsingFxn.countsToCountTotals(
                commonParsingFxn.bucketDocCounts(dateIntervalBuckets, props.countBy.file_downloads)
            );
        }
    },
};



class UsageStatsView extends StatsChartViewBase {

    static defaultProps = {
        'aggregationsToChartData' : _.pick(
            aggregationsToChartData,
            'sessions_by_country', 'fields_faceted', /* 'browse_search_queries', 'other_search_queries', */
            'experiment_set_views', 'file_downloads'
        ),
        //'shouldReaggregate' : function(pastProps, nextProps, state){
        //    if (pastProps.currentGroupBy !== nextProps.currentGroupBy) return true;
        //    //if (pastProps.currentGroupBy !== nextProps.currentGroupBy) return true;
        //    return false;
        //}
    };


    constructor(props){
        super(props);
        this.changeCountByForChart = this.changeCountByForChart.bind(this);
        this.state.countBy = {};
        _.forEach(_.keys(this.state), (k)=>{
            if (k === 'countBy' || k === 'chartToggles' || k === 'smoothEdges') {
                return;
            }
            if (k === 'file_downloads'){
                this.state.countBy[k] = 'download_tracking.experiment_type';
            } else {
                this.state.countBy[k] = 'views';
            }
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

    renderCountByDropdown(chartID, tooltip=null){
        var currCountBy = this.state.countBy[chartID],
            titles      = {
                'views'     : <React.Fragment><i className="icon icon-fw icon-eye"/>&nbsp; View</React.Fragment>,
                'sessions'  : <React.Fragment><i className="icon icon-fw icon-user"/>&nbsp; User Session</React.Fragment>
            },
            ddtitle     = titles[currCountBy];

        if (chartID === 'experiment_set_views' || chartID === 'file_views'){
            titles = {
                'views'         : <React.Fragment><i className="icon icon-fw icon-eye"/>&nbsp; Detail View</React.Fragment>,
                'list_views'    : <React.Fragment><i className="icon icon-fw icon-list"/>&nbsp; Appearance within first 25 Search Results</React.Fragment>,
                'clicks'        : <React.Fragment><i className="icon icon-fw icon-hand-o-up"/>&nbsp; Search Result Click</React.Fragment>
            };
            ddtitle = titles[currCountBy];
        } else if (chartID === 'file_downloads'){
            '&group_by=download_tracking.experiment_type&group_by=download_tracking.geo_country&group_by=download_tracking.is_visualization&group_by=download_tracking.file_format';
            titles = {
                'download_tracking.experiment_type'     : <React.Fragment><i className="icon icon-fw icon-folder-o"/>&nbsp; Experiment Type</React.Fragment>,
                'download_tracking.geo_country'         : <React.Fragment><i className="icon icon-fw icon-globe"/>&nbsp; Country</React.Fragment>,
                'download_tracking.is_visualization'    : <React.Fragment><i className="icon icon-fw icon-television"/>&nbsp; Downloads as part of visualization</React.Fragment>,
                'download_tracking.file_format'         : <React.Fragment><i className="icon icon-fw icon-file-text-o"/>&nbsp; File Format</React.Fragment>,
            };
            ddtitle = titles[currCountBy];
        }

        return (
            <div className="inline-block" style={{ 'marginRight' : 5 }}>
                <DropdownButton data-tip="Count By" bsSize="sm" id={"select_count_for_" + chartID} onSelect={(ek, e) => this.changeCountByForChart(chartID, ek)} title={ddtitle}>
                    {_.map(_.keys(titles), function(k){ return <MenuItem eventKey={k} key={k} children={titles[k]} />; })}
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
                other_search_queries, experiment_set_views, file_downloads, countBy, smoothEdges
            } = this.state,
            width = this.getRefWidth() || null;

        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" key="charts" ref="elem" id="usage" children={ errorIcon() }/>;
        }
        if (!mounted || (loadingStatus === 'loading' && (!file_downloads && !sessions_by_country))){
            return <div className="stats-charts-container" key="charts" ref="elem" id="usage" children={ loadingIcon() }/>;
        }

        var anyExpandedCharts       = _.any(_.values(this.state.chartToggles)),
            commonXDomain           = [ null, null ],
            lastDateStr             = respTrackingItem && respTrackingItem['@graph'] && respTrackingItem['@graph'][0] && respTrackingItem['@graph'][0].google_analytics && respTrackingItem['@graph'][0].google_analytics.for_date,
            firstReportIdx          = respTrackingItem && respTrackingItem['@graph'] && (respTrackingItem['@graph'].length - 1),
            firstDateStr            = respTrackingItem && respTrackingItem['@graph'] && respTrackingItem['@graph'][firstReportIdx] && respTrackingItem['@graph'][firstReportIdx].google_analytics && respTrackingItem['@graph'][firstReportIdx].google_analytics.for_date,
            commonContainerProps    = {
                'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : chartToggles,
                'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
            },
            dateRoundInterval       = 'day';

        // Prevent needing to calculate for each chart
        if (lastDateStr){
            var lastDateMoment = moment.utc(lastDateStr, 'YYYY-MM-DD');
            if (currentGroupBy === 'daily'){
                lastDateMoment.endOf('day').subtract(45, 'minute');
            } else if (currentGroupBy === 'monthly') {
                lastDateMoment.endOf('month').subtract(1, 'day');
            }
            commonXDomain[1] = lastDateMoment.toDate();
        }

        if (firstDateStr){
            var firstDateMoment = moment.utc(firstDateStr, 'YYYY-MM-DD');
            if (currentGroupBy === 'daily'){
                firstDateMoment.startOf('day').add(15, 'minute');
            } else if (currentGroupBy === 'monthly') {
                firstDateMoment.startOf('month').add(1, 'hour');
            }
            commonXDomain[0] = firstDateMoment.toDate();
        }

        if (currentGroupBy === 'monthly'){
            dateRoundInterval = 'month';
        } else if (currentGroupBy === 'yearly'){ // Not yet implemented
            dateRoundInterval = 'year';
        }

        var commonChartProps = { dateRoundInterval, 'xDomain' : commonXDomain, 'curveFxn' : smoothEdges ? d3.curveMonotoneX : d3.curveStepAfter };

        return (
            <div className="stats-charts-container" key="charts" ref="elem" id="usage">

                <GroupByDropdown {...{ groupByOptions, loadingStatus, handleGroupByChange, currentGroupBy }}
                    title="Show" outerClassName="dropdown-container mb-0">
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <div className="inline-block">
                        <Checkbox value={smoothEdges} onChange={this.handleToggleSmoothEdges}>Smooth Edges</Checkbox>
                    </div>
                </GroupByDropdown>

                { file_downloads ?

                    <GroupOfCharts width={width} resetScalesWhenChange={file_downloads}>

                        <hr/>

                        <AreaChartContainer {...commonContainerProps} id="file_downloads"
                            title={
                                <React.Fragment>
                                    <span className="text-500">File Downloads</span>
                                    <br/>
                                    <small><em>Download tracking started in August 2018</em></small>
                                </React.Fragment>
                            }
                            extraButtons={this.renderCountByDropdown('file_downloads')}>
                            <AreaChart {...commonChartProps} data={file_downloads} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    </GroupOfCharts>

                : null }

                { sessions_by_country ?

                    <GroupOfCharts width={width} resetScaleLegendWhenChange={sessions_by_country}>

                        <hr/>

                        <AreaChartContainer {...commonContainerProps} id="sessions_by_country"
                            title={<span><span className="text-500">{ countBy.sessions_by_country === 'sessions' ? 'User Sessions' : 'Page Views' }</span> - by country</span>}
                            extraButtons={this.renderCountByDropdown('sessions_by_country')}>
                            <AreaChart {...commonChartProps} data={sessions_by_country} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

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

                { session && experiment_set_views ?

                    <GroupOfCharts width={width} resetScaleLegendWhenChange={experiment_set_views}>

                        <hr className="mt-3"/>

                        <AreaChartContainer {...commonContainerProps} id="experiment_set_views"
                            title={
                                <span>
                                    <span className="text-500">Experiment Set Detail Views</span>{' '}
                                    { countBy.experiment_set_views === 'list_views' ? '- appearances within initial 25 browse results' :
                                        countBy.experiment_set_views === 'clicks' ? '- clicks from browse results' : '- page detail views' }
                                </span>
                            }
                            extraButtons={this.renderCountByDropdown('experiment_set_views')}>
                            <AreaChart {...commonChartProps} data={experiment_set_views} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    </GroupOfCharts>

                : null }

                { session && fields_faceted ?

                    <GroupOfCharts width={width} resetScaleLegendWhenChange={fields_faceted}>

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

                        <AreaChartContainer {...commonContainerProps} id="fields_faceted"
                            title={<span><span className="text-500">Fields Faceted</span> { countBy.fields_faceted === 'sessions' ? '- by user session' : '- by search result instance' }</span>}
                            extraButtons={this.renderCountByDropdown('fields_faceted')}>
                            <AreaChart {...commonChartProps} data={fields_faceted} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

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
                expsets_created, chartToggles, smoothEdges } = this.state,
            width = this.getRefWidth() || null;

        if (!mounted || (!expsets_released)){
            return <div className="stats-charts-container" key="charts" ref="elem" id="submissions" children={ loadingIcon() }/>;
        }
        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" key="charts" ref="elem" id="submissions" children={ errorIcon() }/>;
        }

        var anyExpandedCharts = _.any(_.values(this.state.chartToggles)),
            commonContainerProps = {
                'onToggle' : this.handleToggle, 'gridState' : this.currGridState, 'chartToggles' : chartToggles,
                'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
            },
            showInternalReleaseCharts = session && expsets_released_internal && expsets_released_vs_internal,
            commonChartProps = { 'curveFxn' : smoothEdges ? d3.curveMonotoneX : d3.curveStepAfter };

        return (
            <div className="stats-charts-container" key="charts" ref="elem" id="submissions">

                { showInternalReleaseCharts ?

                    <GroupOfCharts width={width} colorScale={SubmissionsStatsView.colorScaleForPublicVsInternal}>

                        <AreaChartContainer {...commonContainerProps} id="expsets_released_vs_internal" title={<span><span className="text-500">Experiment Sets</span> - internal vs public release</span>}>
                            <AreaChart {...commonChartProps} data={expsets_released_vs_internal} />
                        </AreaChartContainer>

                        <hr/>

                    </GroupOfCharts>

                : null }

                <GroupOfCharts width={width} resetScalesWhenChange={expsets_released}>

                    <GroupByDropdown {...{ currentGroupBy, groupByOptions, handleGroupByChange, loadingStatus }} title="Group Charts Below By">
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <div className="inline-block">
                            <Checkbox value={smoothEdges} onChange={this.handleToggleSmoothEdges}>Smooth Edges</Checkbox>
                        </div>
                    </GroupByDropdown>

                    <hr/>

                    <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    <AreaChartContainer {...commonContainerProps} id="expsets_released" title={
                            <React.Fragment>
                                <span className="text-500">Experiment Sets</span> - { session ? 'publicly released' : 'released' }
                            </React.Fragment>
                        }>
                        <AreaChart {...commonChartProps} data={expsets_released} />
                    </AreaChartContainer>

                    {/* expsets_created ?           // ~=== 'Experiment Sets Submitted'
                        <AreaChartContainer {...commonContainerProps} id="expsets_created" title={<span><span className="text-500">Experiment Sets</span> submitted over time</span>}>
                            <AreaChart data={expsets_created} />
                        </AreaChartContainer>
                    : null */}

                    { showInternalReleaseCharts ?
                        <AreaChartContainer {...commonContainerProps} id="expsets_released_internal" title={
                                <React.Fragment>
                                    <span className="text-500">Experiment Sets</span> - released (public or within 4DN)
                                </React.Fragment>
                            }>
                            <AreaChart {...commonChartProps} data={expsets_released_internal} />
                        </AreaChartContainer>
                    : null }

                    <AreaChartContainer {...commonContainerProps} id="files_released" title={
                            <React.Fragment>
                                <span className="text-500">Files</span> - { session ? 'publicly released' : 'released' }
                            </React.Fragment>
                        }>
                        <AreaChart {...commonChartProps} data={files_released} />
                    </AreaChartContainer>

                    <AreaChartContainer {...commonContainerProps} id="file_volume_released" title={
                            <React.Fragment>
                                <span className="text-500">Total File Size</span> - { session ? 'publicly released' : 'released' }
                            </React.Fragment>
                        }>
                        <AreaChart {...commonChartProps} data={file_volume_released} yAxisLabel="GB" />
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
