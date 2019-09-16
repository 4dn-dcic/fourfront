'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { stringify } from 'query-string';
import url from 'url';
import * as d3 from 'd3';
import moment from 'moment';

import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Checkbox';
import { DropdownButton, DropdownItem } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/DropdownButton';
import { console, ajax, analytics } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../util';
import {
    StatsViewController, GroupByController, GroupByDropdown, ColorScaleProvider,
    AreaChart, AreaChartContainer, LoadingIcon, ErrorIcon, HorizontalD3ScaleLegend, StatsChartViewAggregator
} from './../viz/AreaChart';
import StaticPage from './StaticPage';






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

        // De-dupe -- not particularly necessary as D3 handles this, however nice to have well-formatted data.
        const trackingItems = _.uniq(resp['@graph'], true, function(trackingItem){
            return trackingItem.google_analytics.for_date;
        });

        // Notably, we do NOT sum up total here.
        const aggsList =  _.map(trackingItems, function(trackingItem, index, allTrackingItems){

            const totalSessions = _.reduce(trackingItem.google_analytics.reports[reportName], function(sum, trackingItemItem){
                return sum + trackingItemItem[countKey];
            }, 0);

            const currItem = {
                'date'      : trackingItem.google_analytics.for_date,
                'count'     : totalSessions,
                'total'     : totalSessions,
                'children'  : _.map(trackingItem.google_analytics.reports[reportName], function(trackingItemItem){
                    const term = typeof termBucketField === 'function' ? termBucketField(trackingItemItem) : trackingItemItem[termBucketField];
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



export default class StatisticsPageView extends React.PureComponent {

    static defaultProps = {
        'defaultTab' : 'submissions'
    };

    static viewOptions = {
        'submissions' : {
            'title' : "Submissions Statistics",
            'icon' : 'upload fas',
            'tip' : "View statistics related to submission and release of Experiment Set",
            'aggregationsToChartData' : _.pick(aggregationsToChartData,
                'expsets_released', 'expsets_released_internal',
                'expsets_released_vs_internal', 'files_released',
                'file_volume_released'
            )
        },
        'usage' : {
            'title' : "Usage Statistics",
            'icon' : 'users fas',
            'tip' : "View statistics related to usage of the 4DN Data Portal",
            'aggregationsToChartData' : _.pick(aggregationsToChartData,
                'sessions_by_country', 'fields_faceted', /* 'browse_search_queries', 'other_search_queries', */
                'experiment_set_views', 'file_downloads'
            ),
            'shouldReaggregate' : function(pastProps, nextProps){
                // Compare object references
                if (pastProps.countBy !== nextProps.countBy) return true;
            }
        }
    };

    constructor(props){
        super(props);
        this.maybeUpdateCurrentTabFromHref = this.maybeUpdateCurrentTabFromHref.bind(this);
        this.renderSubmissionsSection = this.renderSubmissionsSection.bind(this);
        this.renderUsageSection = this.renderUsageSection.bind(this);
        this.renderTopMenu = this.renderTopMenu.bind(this);
        this.state = { 'currentTab' : props.defaultTab };
    }

    componentDidMount(){
        this.maybeUpdateCurrentTabFromHref();
    }

    componentDidUpdate(pastProps){
        const { href } = this.props;
        if (href !== pastProps.href){
            this.maybeUpdateCurrentTabFromHref();
        }
    }

    maybeUpdateCurrentTabFromHref(){
        const { href } = this.props;
        this.setState(function({ currentTab }){
            const hrefParts = href && url.parse(href);
            const hash = hrefParts && hrefParts.hash && hrefParts.hash.replace('#', '');
            if (hash && hash !== currentTab && hash.charAt(0) !== '!'){
                if (typeof StatisticsPageView.viewOptions[hash] !== 'undefined'){
                    return { 'currentTab' : hash };
                }
            }
        });
    }

    renderSubmissionsSection(){
        // GroupByController is on outside here because SubmissionStatsViewController detects if props.currentGroupBy has changed in orded to re-fetch aggs.
        const { browseBaseState } = this.props;
        const { aggregationsToChartData } = StatisticsPageView.viewOptions.submissions;

        const groupByOptions = { 'award.project' : <span><i className="icon icon-fw fas icon-university mr-05"/>Project</span> };

        let initialGroupBy = 'award.project';

        if (browseBaseState !== 'all'){
            _.extend(groupByOptions, {
                'award.center_title'                 : <span><i className="icon icon-fw fas icon-university mr-05"/>Center</span>,
                'lab.display_title'                  : <span><i className="icon icon-fw fas icon-users mr-05"/>Lab</span>,
                'experiments_in_set.experiment_type.display_title' : <span><i className="icon icon-fw fas icon-chart-bar mr-05"/>Experiment Type</span>
            });
            initialGroupBy = 'award.center_title';
        }
        return (
            <GroupByController {...{ groupByOptions, initialGroupBy }}>
                <SubmissionStatsViewController {..._.pick(this.props, 'session', 'browseBaseState', 'windowWidth')}>
                    <StatsChartViewAggregator {...{ aggregationsToChartData }}>
                        <SubmissionsStatsView />
                    </StatsChartViewAggregator>
                </SubmissionStatsViewController>
            </GroupByController>
        );
    }

    renderUsageSection(){
        const { aggregationsToChartData, shouldReaggregate } = StatisticsPageView.viewOptions.usage;
        const groupByOptions = {
            'monthly'   : <span>Previous 12 Months</span>,
            'daily'     : <span>Previous 30 Days</span>
        };
        return (
            <GroupByController groupByOptions={groupByOptions} initialGroupBy="daily">
                <UsageStatsViewController {..._.pick(this.props, 'session', 'windowWidth', 'href')}>
                    <StatsChartViewAggregator {...{ aggregationsToChartData, shouldReaggregate }}>
                        <UsageStatsView/>
                    </StatsChartViewAggregator>
                </UsageStatsViewController>
            </GroupByController>
        );
    }

    renderTopMenu(){
        const { currentTab } = this.state;
        const submissionsObj = StatisticsPageView.viewOptions.submissions;
        const usageObj = StatisticsPageView.viewOptions.usage;

        return (
            <div className="chart-section-control-wrapper row">
                <div className="col-sm-6">
                    <a className={"select-section-btn" + (currentTab === 'submissions' ? ' active' : '')}
                        href="#submissions" data-tip={currentTab === 'submissions' ? null : submissionsObj.tip} data-target-offset={110}>
                        { submissionsObj.icon ? <i className={"mr-07 text-medium icon icon-fw icon-" + submissionsObj.icon}/> : null }
                        { submissionsObj.title }
                    </a>
                </div>
                <div className="col-sm-6">
                    <a className={"select-section-btn" + (currentTab === 'usage' ? ' active' : '')}
                        href="#usage" data-tip={currentTab === 'usage' ? null : usageObj.tip} data-target-offset={100}>
                        { usageObj.icon ? <i className={"mr-07 text-medium icon icon-fw icon-" + usageObj.icon}/> : null }
                        { usageObj.title }
                    </a>
                </div>
            </div>
        );
    }

    render(){
        const { currentTab } = this.state;
        return (
            <StaticPage.Wrapper>
                { this.renderTopMenu() }
                <hr/>
                { currentTab === 'usage' ? this.renderUsageSection() : this.renderSubmissionsSection() }
            </StaticPage.Wrapper>
        );
    }
}


class UsageStatsViewController extends React.PureComponent {

    static getSearchReqMomentsForTimePeriod(currentGroupBy = "daily"){
        const untilDate = moment.utc();
        let fromDate;
        if (currentGroupBy === 'monthly'){ // 1 yr (12 mths)
            untilDate.startOf('month').subtract(1, 'minute'); // Last minute of previous month
            fromDate = untilDate.clone();
            fromDate.subtract(12, 'month'); // Go back 12 months
        } else if (currentGroupBy === 'daily'){ // 30 days
            untilDate.subtract(1, 'day');
            fromDate = untilDate.clone();
            fromDate.subtract(30, 'day'); // Go back 30 days
        }
        return { fromDate, untilDate };
    }

    static defaultProps = {
        'searchURIs' : {
            'TrackingItem' : function(props) {
                const { currentGroupBy, href } = props;
                const { fromDate, untilDate } = UsageStatsViewController.getSearchReqMomentsForTimePeriod(currentGroupBy);
                let uri = '/search/?type=TrackingItem&tracking_type=google_analytics&sort=-google_analytics.for_date&format=json';

                uri += '&limit=all&google_analytics.date_increment=' + currentGroupBy;
                uri += '&google_analytics.for_date.from=' + fromDate.format('YYYY-MM-DD') + '&google_analytics.for_date.to=' + untilDate.format('YYYY-MM-DD');

                // For simpler testing & debugging -- if on localhost, connects to data.4dn by default.
                if (href && href.indexOf('http://localhost') > -1){
                    uri = 'https://data.4dnucleome.org' + uri;
                }
                return uri;
            },
            'TrackingItemDownload' : function(props) {
                const { currentGroupBy, href, includePartialRequests } = props;
                const { fromDate, untilDate } = UsageStatsViewController.getSearchReqMomentsForTimePeriod(currentGroupBy);

                let uri = '/date_histogram_aggregations/?date_histogram=date_created&type=TrackingItem&tracking_type=download_tracking';
                uri += '&group_by=download_tracking.experiment_type&group_by=download_tracking.geo_country&group_by=download_tracking.file_format';

                if (includePartialRequests){ // Include download_tracking.range_query w/ any val and do a group-by agg for it.
                    uri += '&group_by=download_tracking.range_query';
                } else { // Filter out download_tracking.range_query = true items.
                    uri += '&download_tracking.range_query!=true';
                }

                uri += '&date_histogram_interval=' + currentGroupBy;
                uri += '&date_created.from=' + fromDate.format('YYYY-MM-DD') + '&date_created.to=' + untilDate.format('YYYY-MM-DD');

                // For simpler testing & debugging -- if on localhost, connects to data.4dn by default.
                if (href && href.indexOf('http://localhost') > -1){
                    uri = 'https://data.4dnucleome.org' + uri;
                }
                return uri;
            }
        },

        /**
         * Return a boolean to determine whether to refetch (all) aggs from ES.
         *
         * @returns {boolean}
         */
        'shouldRefetchAggs' : function(pastProps, nextProps){
            return StatsViewController.defaultProps.shouldRefetchAggs(pastProps, nextProps) || (
                pastProps.currentGroupBy !== nextProps.currentGroupBy
            ) || (
                pastProps.includePartialRequests !== nextProps.includePartialRequests
            );
        }
    };

    static getDerivedStateFromProps(props, state){
        const { countBy, includePartialRequests } = state;
        const fileDownloadsCountBy = countBy.file_downloads;
        if (!includePartialRequests && fileDownloadsCountBy === "download_tracking.range_query"){
            // Reset to some other option
            const nextCountBy = _.clone(countBy);
            nextCountBy.file_downloads = "download_tracking.experiment_type";
            return { 'countBy' : nextCountBy };
        }
        return null;
    }

    constructor(props){
        super(props);
        this.handleTogglePartialReqs = this.handleTogglePartialReqs.bind(this);
        this.changeCountByForChart = this.changeCountByForChart.bind(this);

        const countBy = {};

        _.forEach(_.keys(StatisticsPageView.viewOptions.usage.aggregationsToChartData), (k)=>{
            if (k === 'file_downloads'){
                countBy[k] = 'download_tracking.experiment_type';
            } else {
                countBy[k] = 'views';
            }
        });

        this.state = { countBy, 'includePartialRequests' : false }; // aka include range queries for download tracking
    }

    componentDidUpdate(pastProps, pastState){
        const { includePartialRequests } = this.state;
        if (includePartialRequests && !pastState.includePartialRequests){
            this.setState(function({ countBy: pastCountBy }){
                const countBy = _.clone(pastCountBy);
                countBy.file_downloads = "download_tracking.range_query";
                return { countBy };
            });
        }
    }

    handleTogglePartialReqs(nextIncludePartialRequests){
        this.setState(function({ includePartialRequests }){
            if (typeof nextIncludePartialRequests !== 'boolean'){
                return { 'includePartialRequests' : !includePartialRequests };
            } else if (nextIncludePartialRequests !== includePartialRequests) {
                return { 'includePartialRequests' : nextIncludePartialRequests };
            } else {
                return null;
            }
        });
    }

    changeCountByForChart(chartID, nextCountBy){
        setTimeout(()=>{
            // This might take some noticeable amount of time (not enough to justify a worker, tho) so we defer/deprioritize its execution to prevent blocking UI thread.
            this.setState((currState)=>{
                var nextCountByObj = _.clone(currState.countBy);
                nextCountByObj[chartID] = nextCountBy;
                return { 'countBy' : nextCountByObj };
            });
        }, 0);
    }

    render(){
        return (
            <StatsViewController {...this.props} {...this.state} onTogglePartialReqs={this.handleTogglePartialReqs}
                changeCountByForChart={this.changeCountByForChart}/>
        );
    }
}




class SubmissionStatsViewController extends React.PureComponent {

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
        this.state = { "externalTermMap" : null };
    }

    componentDidMount(){
        this.fetchAndGenerateExternalTermMap();
    }

    componentDidUpdate(pastProps){
        const { shouldRefetchAggs, session } = this.props;
        if (shouldRefetchAggs(pastProps, this.props)){
            if (pastProps.session !== session){
                // Avoid triggering extra re-aggregation from new/unnecessary term map being loaded.
                this.fetchAndGenerateExternalTermMap(true);
            }
        }
    }

    fetchAndGenerateExternalTermMap(refresh = false){
        const { externalTermMap } = this.state;
        if (!refresh && externalTermMap && _.keys(externalTermMap).length > 0) return;

        ajax.load('/search/?type=Award&limit=all', (resp)=>{
            this.setState({
                'externalTermMap' : _.object(_.map(resp['@graph'] || [], function(award){
                    return [ award.center_title, award.project !== '4DN' ];
                }))
            });
        });
    }

    render(){ return <StatsViewController {...this.props} {...this.state} />; }

}



class UsageChartsCountByDropdown extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleSelection = this.handleSelection.bind(this);
    }

    handleSelection(evtKey, evt){
        const { changeCountByForChart, chartID } = this.props;
        changeCountByForChart(chartID, evtKey);
    }

    render(){
        const { includePartialRequests, countBy, chartID } = this.props;
        const currCountBy = countBy[chartID];

        const menuOptions = new Map();

        if (chartID === 'experiment_set_views' || chartID === 'file_views'){
            menuOptions.set('views',        <React.Fragment><i className="icon fas icon-fw icon-eye mr-05"/>Detail View</React.Fragment>);
            menuOptions.set('list_views',   <React.Fragment><i className="icon fas icon-fw icon-list mr-05"/>Appearance within first 25 Search Results</React.Fragment>);
            menuOptions.set('clicks',       <React.Fragment><i className="icon far icon-fw icon-hand-point-up mr-05"/>Search Result Click</React.Fragment>);
        } else if (chartID === 'file_downloads'){
            menuOptions.set('download_tracking.experiment_type', <React.Fragment><i className="icon far icon-fw icon-folder mr-05"/>Experiment Type</React.Fragment>);
            menuOptions.set('download_tracking.geo_country',     <React.Fragment><i className="icon fas icon-fw icon-globe mr-05"/>Country</React.Fragment>);
            if (includePartialRequests){
                // No point showing if not included. @see getDerivedStateFromProps which unsets this value if set previously.
                menuOptions.set('download_tracking.range_query', <React.Fragment><i className="icon fas icon-fw icon-tv mr-05"/>Downloads as part of visualization</React.Fragment>);
            }
            menuOptions.set('download_tracking.file_format',     <React.Fragment><i className="icon far icon-fw icon-file-alt mr-05"/>File Format</React.Fragment>);
        } else {
            menuOptions.set('views',    <React.Fragment><i className="icon icon-fw fas icon-eye mr-05"/>View</React.Fragment>);
            menuOptions.set('sessions', <React.Fragment><i className="icon icon-fw fas icon-user mr-05"/>User Session</React.Fragment>);
        }

        const dropdownTitle = menuOptions.get(currCountBy);

        return (
            <div className="inline-block mr-05">
                <DropdownButton data-tip="Count By" size="sm" id={"select_count_for_" + chartID}
                    onSelect={this.handleSelection} title={dropdownTitle}>
                    {_.map([ ...menuOptions.entries() ], function([ k, title ]){
                        return <DropdownItem eventKey={k} key={k}>{ title }</DropdownItem>;
                    })}
                </DropdownButton>
            </div>
        );
    }
}


class UsageStatsView extends React.PureComponent {

    render(){
        const {
            loadingStatus, mounted, session, groupByOptions, handleGroupByChange, currentGroupBy, respTrackingItem, windowWidth,
            includePartialRequests, onTogglePartialReqs, changeCountByForChart, countBy,
            // Passed in from StatsChartViewAggregator:
            sessions_by_country, chartToggles, fields_faceted, /* fields_faceted_group_by, browse_search_queries, other_search_queries, */
            experiment_set_views, file_downloads, smoothEdges, width, onChartToggle, onSmoothEdgeToggle
        } = this.props;

        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" key="charts" id="usage"><ErrorIcon/></div>;
        }

        if (!mounted || (loadingStatus === 'loading' && (!file_downloads && !sessions_by_country))){
            return <div className="stats-charts-container" key="charts" id="usage"><LoadingIcon/></div>;
        }

        const anyExpandedCharts = _.any(_.values(chartToggles));
        const { fromDate, untilDate } = UsageStatsViewController.getSearchReqMomentsForTimePeriod(currentGroupBy);
        let dateRoundInterval;

        // We want all charts to share the same x axis. Here we round to date boundary.
        // Minor issue is that file downloads are stored in UTC/GMT while analytics are in EST timezone..
        // TODO improve on this somehow, maybe pass prop to FileDownload chart re: timezone parsing of some sort.
        if (currentGroupBy === 'daily'){
            fromDate.startOf('day').add(15, 'minute');
            untilDate.endOf('day').subtract(45, 'minute');
            dateRoundInterval = 'day';
        } else if (currentGroupBy === 'monthly') {
            fromDate.endOf('month'); // Not rly needed.
            untilDate.endOf('month').subtract(1, 'day');
            dateRoundInterval = 'month';
        } else if (currentGroupBy === 'yearly'){ // Not yet implemented
            dateRoundInterval = 'year';
        }

        const commonXDomain = [ fromDate.toDate(), untilDate.toDate() ];

        const commonContainerProps = { 'onToggle' : onChartToggle, chartToggles, windowWidth, 'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250 };
        const commonChartProps = { dateRoundInterval, 'xDomain' : commonXDomain, 'curveFxn' : smoothEdges ? d3.curveMonotoneX : d3.curveStepAfter };
        const countByDropdownProps = { countBy, changeCountByForChart };

        return (
            <div className="stats-charts-container" key="charts" id="usage">

                <GroupByDropdown {...{ groupByOptions, loadingStatus, handleGroupByChange, currentGroupBy }}
                    title="Show" outerClassName="dropdown-container mb-0">
                    <div className="inline-block ml-15">
                        <Checkbox checked={smoothEdges} onChange={onSmoothEdgeToggle}>Smooth Edges</Checkbox>
                    </div>
                </GroupByDropdown>

                { file_downloads ?

                    <ColorScaleProvider resetScalesWhenChange={file_downloads}>

                        <hr/>

                        <AreaChartContainer {...commonContainerProps} id="file_downloads"
                            title={
                                <div>
                                    <h4 className="text-500 mt-0 mb-0">File Downloads</h4>
                                    <div className="mb-1">
                                        <small>
                                            <em>Download tracking started in August 2018</em>
                                            <label className="inline-block ml-15 text-400 clickable">
                                                <input type="checkbox" className="mr-07" checked={includePartialRequests} onChange={onTogglePartialReqs} />
                                                Include Partial Requests
                                                { width > 500 ? ' (e.g. IGV, JuiceBox)' : null }
                                            </label>
                                        </small>
                                    </div>
                                </div>
                            }
                            extraButtons={
                                <UsageChartsCountByDropdown {...countByDropdownProps} chartID="file_downloads" includePartialRequests={includePartialRequests} />
                            }>
                            <AreaChart {...commonChartProps} data={file_downloads} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    </ColorScaleProvider>

                    : null }

                { sessions_by_country ?

                    <ColorScaleProvider resetScaleLegendWhenChange={sessions_by_country}>

                        <hr/>

                        <AreaChartContainer {...commonContainerProps} id="sessions_by_country"
                            title={
                                <h4 className="text-300 mt-0">
                                    <span className="text-500">{ countBy.sessions_by_country === 'sessions' ? 'User Sessions' : 'Page Views' }</span> - by country
                                </h4>
                            }
                            extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="sessions_by_country" />}>
                            <AreaChart {...commonChartProps} data={sessions_by_country} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    </ColorScaleProvider>

                    : null }

                {/* browse_search_queries || other_search_queries ?

                    <ColorScaleProvider resetScalesWhenChange={browse_search_queries}>

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

                    </ColorScaleProvider>


                : null */}

                { session && experiment_set_views ?

                    <ColorScaleProvider resetScaleLegendWhenChange={experiment_set_views}>

                        <hr className="mt-3"/>

                        <AreaChartContainer {...commonContainerProps} id="experiment_set_views"
                            title={
                                <h4 className="text-300 mt-0">
                                    <span className="text-500">Experiment Set Detail Views</span>{' '}
                                    { countBy.experiment_set_views === 'list_views' ? '- appearances within initial 25 browse results' :
                                        countBy.experiment_set_views === 'clicks' ? '- clicks from browse results' : '- page detail views' }
                                </h4>
                            }
                            extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="experiment_set_views" />}>
                            <AreaChart {...commonChartProps} data={experiment_set_views} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    </ColorScaleProvider>

                    : null }

                { session && fields_faceted ?

                    <ColorScaleProvider resetScaleLegendWhenChange={fields_faceted}>

                        <hr className="mt-3"/>
                        {/*
                        <div className="mb-15">
                            <div className="text-400 inline-block">Grouping by&nbsp;&nbsp;</div>
                            <DropdownButton id="select_fields_faceted_group_by" onSelect={this.changeFieldFacetedByGrouping}
                                title={<span className="text-500">{ UsageStatsView.fieldsFacetedByOptions[fields_faceted_group_by] }</span>}>
                                { _.map(_.pairs(UsageStatsView.fieldsFacetedByOptions), ([ key, title ]) =>
                                    <DropdownItem eventKey={key} key={key}>{ title }</DropdownItem>
                                ) }
                            </DropdownButton>
                        </div>
                        */}

                        <AreaChartContainer {...commonContainerProps} id="fields_faceted"
                            title={
                                <h4 className="text-300 mt-0">
                                    <span className="text-500">Fields Faceted</span> { countBy.fields_faceted === 'sessions' ? '- by user session' : '- by search result instance' }
                                </h4>
                            }
                            extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="fields_faceted" />}>
                            <AreaChart {...commonChartProps} data={fields_faceted} />
                        </AreaChartContainer>

                        <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    </ColorScaleProvider>

                    : null }

            </div>
        );
    }



}

class SubmissionsStatsView extends React.PureComponent {

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
        } else if (term === 'Public Release' || term === 'Publicly Released'){
            return '#1f77b4'; // Blue
        } else {
            throw new Error("Term supplied is not one of 'Internal Release' or 'Public Release': '" + term + "'.");
        }
    }

    render(){
        const {
            loadingStatus, mounted, session, currentGroupBy, groupByOptions, handleGroupByChange, windowWidth,
            // Passed in from StatsChartViewAggregator:
            expsets_released, expsets_released_internal, files_released, file_volume_released,
            expsets_released_vs_internal, /* expsets_created, */ chartToggles, smoothEdges, width, onChartToggle, onSmoothEdgeToggle
        } = this.props;

        if (!mounted || (!expsets_released)){
            return <div className="stats-charts-container" key="charts" id="submissions"><LoadingIcon/></div>;
        }

        if (loadingStatus === 'failed'){
            return <div className="stats-charts-container" key="charts" id="submissions"><ErrorIcon/></div>;
        }

        const anyExpandedCharts = _.any(_.values(chartToggles));
        const commonContainerProps = {
            'onToggle' : onChartToggle, chartToggles, windowWidth,
            'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250
        };
        const showInternalReleaseCharts = session && expsets_released_internal && expsets_released_vs_internal;
        const commonChartProps = { 'curveFxn' : smoothEdges ? d3.curveMonotoneX : d3.curveStepAfter };

        return (
            <div className="stats-charts-container" key="charts" id="submissions">

                { showInternalReleaseCharts ?

                    <ColorScaleProvider width={width} colorScale={SubmissionsStatsView.colorScaleForPublicVsInternal}>

                        <AreaChartContainer {...commonContainerProps} id="expsets_released_vs_internal"
                            title={<h4 className="text-300 mt-0"><span className="text-500">Experiment Sets</span> - internal vs public release</h4>}>
                            <AreaChart {...commonChartProps} data={expsets_released_vs_internal} />
                        </AreaChartContainer>

                        <hr/>

                    </ColorScaleProvider>

                    : null }

                <ColorScaleProvider width={width} resetScalesWhenChange={expsets_released}>

                    <GroupByDropdown {...{ currentGroupBy, groupByOptions, handleGroupByChange, loadingStatus }} title="Group Charts Below By">
                        <div className="inline-block ml-15">
                            <Checkbox checked={smoothEdges} onChange={onSmoothEdgeToggle}>Smooth Edges</Checkbox>
                        </div>
                    </GroupByDropdown>

                    <hr/>

                    <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    <AreaChartContainer {...commonContainerProps} id="expsets_released" title={
                        <h4 className="text-300 mt-0">
                            <span className="text-500">Experiment Sets</span> - { session ? 'publicly released' : 'released' }
                        </h4>
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
                            <h4 className="text-300 mt-0">
                                <span className="text-500">Experiment Sets</span> - released (public or within 4DN)
                            </h4>
                        }>
                            <AreaChart {...commonChartProps} data={expsets_released_internal} />
                        </AreaChartContainer>
                        : null }

                    <AreaChartContainer {...commonContainerProps} id="files_released" title={
                        <h4 className="text-300 mt-0">
                            <span className="text-500">Files</span> - { session ? 'publicly released' : 'released' }
                        </h4>
                    }>
                        <AreaChart {...commonChartProps} data={files_released} />
                    </AreaChartContainer>

                    <AreaChartContainer {...commonContainerProps} id="file_volume_released" title={
                        <h4 className="text-300 mt-0">
                            <span className="text-500">Total File Size</span> - { session ? 'publicly released' : 'released' }
                        </h4>
                    }>
                        <AreaChart {...commonChartProps} data={file_volume_released} yAxisLabel="GB" />
                    </AreaChartContainer>

                </ColorScaleProvider>

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
