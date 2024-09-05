'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import queryString from 'query-string';
import * as d3 from 'd3';
import { sub, add, startOfMonth, startOfDay, endOfMonth, endOfDay, toDate, format as formatDate } from 'date-fns';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';

import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Checkbox';
import { console, ajax, analytics, logger } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { navigate } from './../../util';
import {
    StatsViewController, GroupByDropdown, ColorScaleProvider,
    AreaChart, AreaChartContainer, LoadingIcon, ErrorIcon, HorizontalD3ScaleLegend,
    StatsChartViewAggregator, GroupByController
} from './../../viz/AreaChart';

/**
 * @module
 * We export out most things needed for /statistics/ page view out of here to
 * make code-splitting of this easier. Isn't a primary page of portal so we defer
 * its loading until if needed. Also deprioritized in terms of cleanup (of which much
 * could be done).
 */

export { StatsChartViewAggregator, GroupByController };


export const commonParsingFxn = {
    /**
     * MODIFIES OBJECTS IN PLACE
     */
    'countsToTotals' : function(parsedBuckets, cumulativeSum = false, excludeChildren = false){
        let total = 0;
        const subTotals = {};

        parsedBuckets.forEach(function(bkt, index){
            if (cumulativeSum) {
                total += bkt.count;
            } else {
                total = bkt.count;
            }
            bkt.total = total;
            if (excludeChildren || !Array.isArray(bkt.children)) return;

            bkt.children.forEach(function(c){
                if (cumulativeSum) {
                    c.total = subTotals[c.term] = (subTotals[c.term] || 0) + (c.count || 0);
                } else {
                    c.total = subTotals[c.term] = (c.count || 0);
                }
            });
        });

        return parsedBuckets;
    },
    /**
     * Doesn't add up totals, just renames 'count' property to 'total' property.
     * MODIFIES IN PLACE.
     */
    'countsToCountTotals' : function(parsedBuckets, excludeChildren = false){
        parsedBuckets.forEach(function(bkt){
            bkt.total = bkt.count;
            bkt.children.forEach(function(c){
                c.total = c.count;
            });
        });
        return parsedBuckets;
    },
    /**
     * MODIFIES OBJECTS IN PLACE
     */
    'fillMissingChildBuckets' : function(aggsList, subAggTerms = [], externalTermMap = {}){
        aggsList.forEach(function(datum){
            subAggTerms.forEach(function(term){
                if (externalTermMap && externalTermMap[term]) return;
                if (!_.findWhere(datum.children, { term })){
                    datum.children.push({ term, 'count' : 0, 'total' : 0, 'date' : datum.date });
                }
            });
        });

        const today = new Date();
        const lastDate = aggsList.length > 0 && new Date(aggsList[aggsList.length - 1].date);
        const todayAsString = today.toISOString().slice(0,10);

        if (lastDate && lastDate < today){
            aggsList.push({
                ...aggsList[aggsList.length - 1],
                'date' : todayAsString,
                'count' : 0,
                'children' : aggsList[aggsList.length - 1].children.map(function(c){
                    return _.extend({}, c, { 'date' : todayAsString, 'count' : 0 });
                })
            });
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
        const subBucketKeysToDate = new Set();
        const aggsList = intervalBuckets.map(function(bucket, index){
            const {
                doc_count,
                key_as_string,
                [groupByField] : { buckets: subBuckets = [] } = {}
            } = bucket;

            if (excludeChildren === true){
                return {
                    'date' : key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                    'count' : doc_count
                };
            } else {
                _.pluck(subBuckets, 'key').forEach(function(k){
                    subBucketKeysToDate.add(k);
                });

                const children = [ ...subBucketKeysToDate ].map(function(term){
                    // Create a parsed 'bucket' even if none returned from ElasticSearch agg but it has appeared earlier.
                    const subBucket = _.findWhere(subBuckets, { 'key' : term });
                    const count = ((subBucket && subBucket.doc_count) || 0);

                    return { term, count };
                });

                return {
                    'date' : key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                    'count' : doc_count,
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
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference([ ...subBucketKeysToDate ], (externalTermMap && _.keys(externalTermMap)) || [] ));

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
        const subBucketKeysToDate = new Set();
        const aggsList = intervalBuckets.map(function(bucket, index){
            const {
                key_as_string,
                total_files : { value: totalFiles = 0 } = {},
                [groupByField] : { buckets: subBuckets = [] } = {}
            } = bucket;

            _.pluck(subBuckets, 'key').forEach(function(k){
                subBucketKeysToDate.add(k);
            });

            const children = [ ...subBucketKeysToDate ].map(function(term){
                const subBucket = _.findWhere(subBuckets, { 'key' : term });
                const count = ((subBucket && subBucket.total_files && subBucket.total_files.value) || 0);

                return { term, count };
            });

            return {
                'date' : key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                'count' : totalFiles,
                'children' : groupExternalChildren(children, externalTermMap)
            };
        });

        // Ensure each datum has all child terms, even if blank.
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference([ ...subBucketKeysToDate ], (externalTermMap && _.keys(externalTermMap)) || [] ));

        return aggsList;
    },
    'bucketTotalFilesVolume' : function(intervalBuckets, groupByField, externalTermMap){
        const gigabyte = 1024 * 1024 * 1024;
        const subBucketKeysToDate = new Set();
        const aggsList = intervalBuckets.map(function(bucket, index){
            const {
                key_as_string,
                total_files_volume : { value: totalFilesVolume = 0 } = {},
                [groupByField] : { buckets: subBuckets = [] } = {}
            } = bucket;

            _.pluck(subBuckets, 'key').forEach(function(k){
                subBucketKeysToDate.add(k);
            });

            const fileSizeVol = totalFilesVolume / gigabyte;
            const children = [ ...subBucketKeysToDate ].map(function(term){
                const subBucket = _.findWhere(subBuckets, { 'key' : term });
                const subFileSizeVol = ((subBucket && subBucket.total_files_volume && subBucket.total_files_volume.value) || 0) / gigabyte;

                return { term, 'count' : subFileSizeVol };
            });

            return {
                'date'     : key_as_string.split('T')[0], // Sometimes we get a time back with date when 0 doc_count; correct it to date only.
                'count'    : fileSizeVol,
                'children' : groupExternalChildren(children, externalTermMap)
            };
        });

        // Ensure each datum has all child terms, even if blank.
        commonParsingFxn.fillMissingChildBuckets(aggsList, _.difference(Array.from(subBucketKeysToDate), (externalTermMap && _.keys(externalTermMap)) || [] ));

        return aggsList;
    },
    'analytics_to_buckets' : function(resp, reportName, termBucketField, countKey, cumulativeSum, topCount = 0){
        const termsInAllItems = new Set();

        // De-dupe -- not particularly necessary as D3 handles this, however nice to have well-formatted data.
        const trackingItems = _.uniq(resp['@graph'], true, function(trackingItem){
            return trackingItem.google_analytics.for_date;
        }).reverse(); // We get these in decrementing order from back-end

        let totalSessionsToDate = 0;
        const termTotals = {}; // e.g. { 'USA': { count: 5, total: 5 }, 'China': { count: 2, total: 2 } }

        // Notably, we do NOT sum up total here.
        const aggsList = trackingItems.map(function(trackingItem){
            const { google_analytics : {
                reports : {
                    [reportName] : currentReport = []
                }, // `currentReport` => List of JSON objects (report entries, 1 per unique dimension value) - Note: 1 per unique dimension may not be valid for post processing report items in smaht-foursight 
                for_date
            } } = trackingItem;

            const termsInCurrenItem = new Set();

            // Unique-fy
            // group terms by term since terms are repeated while ga4 to tracking-item conversion done
            // (note that aggregated values won't work if the aggregated field is already an avg, min, max may field)
            const { groupedTermsObj, totalSessions } = _.reduce(currentReport, function ({ groupedTermsObj, totalSessions }, trackingItemItem) {
                const term = typeof termBucketField === 'function' ? termBucketField(trackingItemItem) : trackingItemItem[termBucketField];
                if (groupedTermsObj[term]) {
                    groupedTermsObj[term].count += trackingItemItem[countKey];
                    groupedTermsObj[term].total += trackingItemItem[countKey];
                } else {
                    groupedTermsObj[term] = {
                        'term': term,
                        'count': trackingItemItem[countKey],
                        'total': trackingItemItem[countKey],
                        'date': for_date
                    };
                    termsInAllItems.add(term);
                    termsInCurrenItem.add(term);
                }
                totalSessions += trackingItemItem[countKey]
                return { groupedTermsObj, totalSessions };
            }, { groupedTermsObj: {}, totalSessions: 0 });

            totalSessionsToDate += totalSessions;

            const currentItem = {
                'date'      : for_date,
                'count'     : cumulativeSum ? totalSessionsToDate : totalSessions,
                'total'     : cumulativeSum ? totalSessionsToDate : totalSessions,
                'children': _.values(groupedTermsObj).map(function (termItem) {
                    const cloned = { ...termItem };
                    if (cumulativeSum) {
                        let { count = 0, total = 0 } = termTotals[termItem.term] || {};
                        total += (termItem.total || 0);
                        count += (termItem.count || 0);
                        termTotals[termItem.term] = { total, count };

                        cloned.count = count;
                        cloned.total = total;
                    }
                    return cloned;
                })
            };

            // add missing children for cumulative view
            if (cumulativeSum) {
                termsInAllItems.forEach((term) => {
                    if (!termsInCurrenItem.has(term)) {
                        currentItem.children.push({
                            'term': term,
                            'count': termTotals[term].count,
                            'total': termTotals[term].total,
                            'date': for_date
                        });
                    }
                });
            }

            if (typeof topCount === 'number' && topCount > 0) {
                currentItem.children = _.sortBy(currentItem.children, (item) => -1 * item.total).slice(0, topCount);
            }

            return currentItem;

        }); // We get these in decrementing order from back-end

        commonParsingFxn.fillMissingChildBuckets(aggsList, Array.from(termsInAllItems));

        return aggsList;
    }
};


const aggregationsToChartData = {
    'expsets_released' : {
        'requires'  : 'ExperimentSetReplicatePublic',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            const { aggregations : {
                weekly_interval_public_release : { buckets: publicBuckets = [] } = {}
            } } = resp;

            // if (publicBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketDocCounts(publicBuckets, props.currentGroupBy, props.externalTermMap),
                props.cumulativeSum
            );
        }
    },
    'expsets_released_internal' : {
        'requires'  : 'ExperimentSetReplicateInternal',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            const { aggregations : {
                weekly_interval_project_release : { buckets: internalBuckets = [] } = {}
            } } = resp;

            // if (internalBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketDocCounts(internalBuckets, props.currentGroupBy, props.externalTermMap),
                props.cumulativeSum
            );
        }
    },
    'expsets_released_vs_internal' : {
        'requires' : 'ExperimentSetReplicatePublicAndInternal',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;

            const { aggregations : {
                weekly_interval_project_release : { buckets: internalBuckets = [] } = {},
                weekly_interval_public_release : { buckets: publicBuckets = [] } = {}
            } } = resp;

            // if (internalBuckets.length < 2) return null;
            // if (publicBuckets.length < 2) return null;

            function makeDatePairFxn(bkt){ return [ bkt.date, bkt ]; }

            const internalList        = commonParsingFxn.bucketDocCounts(internalBuckets, props.externalTermMap, true);
            const publicList          = commonParsingFxn.bucketDocCounts(publicBuckets,   props.externalTermMap, true);
            const allDates            = _.uniq(_.pluck(internalList, 'date').concat(_.pluck(publicList, 'date'))).sort(); // Used as keys to zip up the non-index-aligned lists.
            const internalKeyedByDate = _.object(internalList.map(makeDatePairFxn));
            const publicKeyedByDate   = _.object(publicList.map(makeDatePairFxn));
            const combinedAggList     = allDates.map(function(dateString){
                const internalBucket = internalKeyedByDate[dateString] || null;
                const publicBucket = publicKeyedByDate[dateString] || null;
                const comboBucket = {
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

            commonParsingFxn.countsToTotals(combinedAggList, props.cumulativeSum);
            combinedAggList.forEach(function(comboBucket){ // Calculate diff from totals-to-date.
                if (comboBucket.total < comboBucket.children[1].total){
                    // TODO: Trigger an e-mail alert to wranglers from Sentry UI if below exception occurs.
                    logger.error("StatisticsPage: Public release total is higher than project release total at date " + comboBucket.date, comboBucket);
                }
                comboBucket.children[0].total -= comboBucket.children[1].total;
            });
            return combinedAggList;
        }
    },
    'files_released' : {
        'requires'  : 'ExperimentSetReplicatePublic',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            const { aggregations : {
                weekly_interval_public_release : { buckets: publicBuckets = [] } = {}
            } } = resp;

            // if (publicBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketTotalFilesCounts(publicBuckets, props.currentGroupBy, props.externalTermMap),
                props.cumulativeSum
            );
        }
    },
    'file_volume_released' : {
        'requires'  : 'ExperimentSetReplicatePublic',
        'function'  : function(resp, props){
            if (!resp || !resp.aggregations) return null;
            const { aggregations : {
                weekly_interval_public_release : { buckets: publicBuckets = [] } = {}
            } } = resp;

            // if (publicBuckets.length < 2) return null;

            return commonParsingFxn.countsToTotals(
                commonParsingFxn.bucketTotalFilesVolume(publicBuckets, props.currentGroupBy, props.externalTermMap),
                props.cumulativeSum
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

            return commonParsingFxn.analytics_to_buckets(resp, 'fields_faceted', groupingKey, countKey, props.cumulativeSum);
        }
    },
    'sessions_by_country' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;

            let useReport = 'sessions_by_device_category';
            let termBucketField = 'ga:deviceCategory';
            let countKey = 'ga:pageviews';

            if (props.countBy.sessions_by_country !== 'device_category') {
                useReport = 'sessions_by_country';
                termBucketField = 'ga:country';
                countKey = (props.countBy.sessions_by_country === 'sessions') ? 'ga:sessions' : 'ga:pageviews';
            }

            return commonParsingFxn.analytics_to_buckets(resp, useReport, termBucketField, countKey, props.cumulativeSum);
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
            const termBucketField = 'ga:productBrand';
            let countKey = 'ga:productDetailViews';

            if (props.countBy.experiment_set_views === 'expset_list_views') countKey = 'ga:productListViews';
            else if (props.countBy.experiment_set_views === 'expset_clicks') countKey = 'ga:productListClicks';

            return commonParsingFxn.analytics_to_buckets(resp, 'views_by_experiment_set', termBucketField, countKey, props.cumulativeSum);
        }
    },
    /**
     * For this function, props.currentGroupBy is the interval or time duration, not the actual 'group by' as it is for submissions.
     * Instead, `props.countBy.file_downloads` is used similar to the google analytics approach.
     */
    'file_downloads' : {
        'requires'  : "TrackingItem", //'TrackingItemDownload',
        'function'  : function(resp, props){
            if (!resp || !resp['@graph']) return null;
            const { countBy : { file_downloads : countBy } } = props;

            let useReport = 'file_downloads_by_filetype';
            let groupingKey = "ga:productVariant"; // File Type
            const countKey = 'ga:metric2'; // Download Count
            let topCount = 0; //all

            if (countBy === 'experiment_type'){
                useReport = 'file_downloads_by_experiment_type';
                groupingKey = 'ga:dimension5'; // Experiment Type
            } else if (countBy === 'top_files'){
                useReport = 'top_files_downloaded';
                groupingKey = 'ga:productSku'; // File
                topCount = 10;
            } else if (countBy === 'geo_country'){
                useReport = 'file_downloads_by_country';
                groupingKey = 'ga:country';
            }

            console.log("AGGR", resp, props, countBy, groupingKey, useReport);

            //if (props.file_downloads_by_experiment_type_group_by === 'term') groupingKey = 'ga:dimension4';
            //if (props.file_downloads_by_experiment_type_group_by === 'field+term') groupingKey = 'ga:eventLabel';

            return commonParsingFxn.analytics_to_buckets(resp, useReport, groupingKey, countKey, props.cumulativeSum, topCount);

            // if (!resp || !resp.aggregations || !props.countBy || !props.countBy.file_downloads) return null;
            // const dateAggBucket = props.currentGroupBy && (props.currentGroupBy + '_interval_date_created');
            // const dateIntervalBuckets = resp && resp.aggregations && resp.aggregations[dateAggBucket] && resp.aggregations[dateAggBucket].buckets;

            // if (!Array.isArray(dateIntervalBuckets) || dateIntervalBuckets.length < 2) return null;

            // return commonParsingFxn.countsToCountTotals(
            //     commonParsingFxn.bucketDocCounts(dateIntervalBuckets, props.countBy.file_downloads)
            // );
        }
    },
    'file_downloads_volume' : {
        'requires'  : "TrackingItem",
        'function'  : function(resp, props){
            if (!resp || !resp['@graph']) return null;
            const { countBy : { file_downloads_volume : countBy } } = props;

            let useReport = 'file_downloads_by_filetype';
            let groupingKey = "ga:productVariant"; // File Type
            const countKey = 'ga:metric1'; // Download Size
            let topCount = 0; // all

            switch (countBy) {
                case 'top_files':
                    useReport = 'top_files_downloaded';
                    groupingKey = 'ga:productSku'; // File
                    topCount = 10;
                    break;
                case 'geo_country':
                    useReport = 'file_downloads_by_country';
                    groupingKey = 'ga:country';
                    break;
                default:
                    // Handle unknown cases if needed
                    break;
            }

            //convert volume to GB
            const gigabyte = 1024 * 1024 * 1024;
            const result = commonParsingFxn.analytics_to_buckets(resp, useReport, groupingKey, countKey, props.cumulativeSum, topCount);
            if (result && Array.isArray(result) && result.length > 0) {
                _.forEach(result, (r) => {
                    r.total = r.total / gigabyte;
                    r.count = r.count / gigabyte;
                    if (r.children && Array.isArray(r.children) && r.children.length > 0) {
                        _.forEach(r.children, (c) => {
                            c.total = c.total / gigabyte;
                            c.count = c.count / gigabyte;
                        });
                    }
                });
            }
            return result;
        }
    },
    'file_views' : {
        'requires' : 'TrackingItem',
        'function' : function(resp, props){
            if (!resp || !resp['@graph']) return null;
            const { countBy : { file_views : countBy } } = props;

            let useReport = 'metadata_tsv_by_country';
            let termBucketField = 'ga:country';
            let countKey = 'ga:uniquePurchases';

            if (countBy !== 'metadata_tsv_by_country') {
                useReport = 'views_by_file';
                termBucketField = 'ga:productBrand';
                countKey = 'ga:productDetailViews';

                if (countBy === 'file_list_views') countKey = 'ga:productListViews';
                else if (countBy === 'file_clicks') countKey = 'ga:productListClicks';
            }

            return commonParsingFxn.analytics_to_buckets(resp, useReport, termBucketField, countKey, props.cumulativeSum);
        }
    },
};

// I forgot what purpose of all this was, kept because no time to refactor all now.
export const submissionsAggsToChartData = _.pick(aggregationsToChartData,
    'expsets_released', 'expsets_released_internal',
    'expsets_released_vs_internal', 'files_released',
    'file_volume_released'
);

export const usageAggsToChartData = _.pick(aggregationsToChartData,
    'sessions_by_country', 'fields_faceted', 'experiment_set_views',
    'file_downloads', 'file_downloads_volume', 'file_views'
);


export class UsageStatsViewController extends React.PureComponent {

    static getSearchReqMomentsForTimePeriod(currentGroupBy = "daily60"){
        let untilDate = new Date();
        let fromDate;
        if (currentGroupBy === 'monthly'){ // 1 yr (12 mths)
            untilDate = sub(startOfMonth(untilDate), { minutes: 1 }); // Last minute of previous month
            fromDate = toDate(untilDate);
            fromDate = sub(fromDate, { months: 12 }); // Go back 12 months
        } else if (currentGroupBy === 'daily30'){ // 30 days
            untilDate = sub(untilDate, { days: 1 });
            fromDate = toDate(untilDate);
            fromDate = sub(fromDate, { days: 30 }); // Go back 30 days
        }else if (currentGroupBy === 'daily60'){ // 60 days
            untilDate = sub(untilDate, { days: 1 });
            fromDate = toDate(untilDate);
            fromDate = sub(fromDate, { days: 60 }); // Go back 60 days
        }
        return { fromDate, untilDate };
    }

    static defaultProps = {
        'searchURIs' : {
            'TrackingItem' : function(props) {
                const { currentGroupBy, href } = props;
                const { fromDate, untilDate } = UsageStatsViewController.getSearchReqMomentsForTimePeriod(currentGroupBy);


                const report_names = [
                    // Reduce size of response a little bit (dl'd size is in range of 2-3 mb)
                    "fields_faceted",
                    "sessions_by_country",
                    "sessions_by_device_category",
                    "file_downloads_by_experiment_type",
                    "file_downloads_by_filetype",
                    "file_downloads_by_country",
                    "top_files_downloaded",
                    "metadata_tsv_by_country",
                    "views_by_file",
                    "views_by_experiment_set",
                    "for_date"
                ];

                const date_increment = currentGroupBy === 'monthly' ? 'monthly' : 'daily';

                let uri = '/search/?type=TrackingItem&tracking_type=google_analytics&sort=-google_analytics.for_date&format=json';

                uri += '&limit=all&google_analytics.date_increment=' + date_increment;
                uri += '&google_analytics.for_date.from=' + formatDate(fromDate, 'yyyy-MM-dd') + '&google_analytics.for_date.to=' + formatDate(untilDate, 'yyyy-MM-dd');
                uri += "&" + report_names.map(function(n){ return "field=google_analytics.reports." + encodeURIComponent(n); }).join("&");
                uri += "&field=google_analytics.for_date";

                // For simpler testing & debugging -- if on localhost, connects to data.4dn by default.
                // if (href && href.indexOf('http://localhost') > -1){
                //     uri = 'https://data.4dnucleome.org' + uri;
                // }
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
            );
        }
    };

    constructor(props){
        super(props);
        this.changeCountByForChart = this.changeCountByForChart.bind(this);

        const countBy = {};

        Object.keys(usageAggsToChartData).forEach(function(k){
            if (k === 'file_downloads'){
                countBy[k] = 'filetype'; // For file_downloads, countBy is treated as 'groupBy'.
                // Not high enough priority to spend much time improving this file, albeit much straightforward room for it exists.
            } else if (k === 'file_views'){
                countBy[k] = 'file_detail_views';
            } else if (k === 'experiment_set_views'){
                countBy[k] = 'expset_detail_views';
            } else {
                countBy[k] = 'views';
            }
        });

        this.state = { countBy }; // aka include range queries for download tracking
    }

    changeCountByForChart(chartID, nextCountBy){
        setTimeout(()=>{
            // This might take some noticeable amount of time (not enough to justify a worker, tho) so we defer/deprioritize its execution to prevent blocking UI thread.
            this.setState(({ countBy: prevCountBy })=>{
                const countBy = _.clone(prevCountBy);
                countBy[chartID] = nextCountBy;
                return { countBy };
            });
        }, 0);
    }

    render(){
        return <StatsViewController {...this.props} {...this.state} changeCountByForChart={this.changeCountByForChart}/>;
    }
}




export class SubmissionStatsViewController extends React.PureComponent {

    static createFileSearchUri(props, date_histogram) {
        const params = navigate.getBrowseBaseParams(props.browseBaseState || null);
        if (props.currentGroupBy) { params.group_by = props.currentGroupBy; }
        if (props.currentDateRangePreset) {
            if (props.currentDateRangePreset !== 'custom')
                params.date_range = props.currentDateRangePreset;
            else
                params.date_range = `custom|${props.currentDateRangeFrom || ''}|${props.currentDateRangeTo || ''}`;
        }
        if (date_histogram) {
            params.date_histogram = Array.isArray(date_histogram) ? date_histogram : [date_histogram];
        }
        const uri = '/date_histogram_aggregations/?' + queryString.stringify(params) + '&limit=0&format=json';

        // For local dev/debugging; don't forget to comment out if using.
        //uri = 'https://data.4dnucleome.org' + uri;
        return uri;
    }

    static defaultProps = {
        'searchURIs' : {
            'ExperimentSetReplicatePublicAndInternal' : function(props) {
                return SubmissionStatsViewController.createFileSearchUri(props, ['public_release', 'project_release']);
            },
            'ExperimentSetReplicatePublic' : function(props) {
                return SubmissionStatsViewController.createFileSearchUri(props, ['public_release']);
            },
            'ExperimentSetReplicateInternal' : function(props) {
                return SubmissionStatsViewController.createFileSearchUri(props, ['project_release']);
            }
        },
        'shouldRefetchAggs' : function(pastProps, nextProps){
            return StatsViewController.defaultProps.shouldRefetchAggs(pastProps, nextProps) || (
                pastProps.currentGroupBy !== nextProps.currentGroupBy ||
                pastProps.currentDateRangePreset !== nextProps.currentDateRangePreset ||
                pastProps.currentDateRangeFrom !== nextProps.currentDateRangeFrom ||
                pastProps.currentDateRangeTo !== nextProps.currentDateRangeTo
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
        if (chartID == 'file_downloads') {
            changeCountByForChart('file_downloads_volume', evtKey);
        }
    }

    render(){
        const { countBy, chartID } = this.props;
        const currCountBy = countBy[chartID];

        const menuOptions = new Map();

        if (chartID === 'experiment_set_views'){
            menuOptions.set('expset_detail_views', <React.Fragment><i className="icon fas icon-fw icon-eye me-1"/>Detail View</React.Fragment>);
            menuOptions.set('expset_list_views',   <React.Fragment><i className="icon fas icon-fw icon-list me-1"/>Appearance in Search Results</React.Fragment>);
            menuOptions.set('expset_clicks',       <React.Fragment><i className="icon far icon-fw icon-hand-point-up me-1"/>Search Result Click</React.Fragment>);
        } else if (chartID === 'file_downloads'){
            menuOptions.set('filetype',         <React.Fragment><i className="icon far icon-fw icon-file-alt me-1"/>File Type</React.Fragment>);
            menuOptions.set('experiment_type',  <React.Fragment><i className="icon far icon-fw icon-folder me-1"/>Experiment Type</React.Fragment>);
            menuOptions.set('top_files',        <React.Fragment><i className="icon far icon-fw icon-folder me-1"/>Top 10 Files</React.Fragment>);
            // menuOptions.set('geo_country',     <React.Fragment><i className="icon fas icon-fw icon-globe me-1"/>Country</React.Fragment>);
        } else if (chartID === 'file_views'){
            menuOptions.set('file_detail_views',        <React.Fragment><i className="icon fas icon-fw icon-globe me-1"/>Detail View</React.Fragment>);
            menuOptions.set('file_list_views',          <React.Fragment><i className="icon fas icon-fw icon-globe me-1"/>Appearance in Search Results</React.Fragment>);
            menuOptions.set('file_clicks',              <React.Fragment><i className="icon far icon-fw icon-hand-point-up me-1"/>Search Result Click</React.Fragment>);
            menuOptions.set('metadata_tsv_by_country',  <React.Fragment><i className="icon fas icon-fw icon-globe me-1"/>Metadata.tsv Files Count by Country</React.Fragment>);
        } else {
            menuOptions.set('views',            <React.Fragment><i className="icon icon-fw fas icon-eye me-1"/>View</React.Fragment>);
            menuOptions.set('sessions',         <React.Fragment><i className="icon icon-fw fas icon-user me-1"/>User Session</React.Fragment>);
            if(chartID === 'sessions_by_country') {
                menuOptions.set('device_category',  <React.Fragment><i className="icon icon-fw fas icon-user me-1"/>Device Category</React.Fragment>);
            }
        }

        const dropdownTitle = menuOptions.get(currCountBy);

        return (
            <div className="d-inline-block me-05">
                <DropdownButton size="sm" id={"select_count_for_" + chartID}
                    onSelect={this.handleSelection} title={dropdownTitle}>
                    {_.map([ ...menuOptions.entries() ], function([ k, title ]){
                        return <DropdownItem eventKey={k} key={k}>{ title }</DropdownItem>;
                    })}
                </DropdownButton>
            </div>
        );
    }
}


export function UsageStatsView(props){
    const {
        loadingStatus, mounted, session, groupByOptions, handleGroupByChange, currentGroupBy, windowWidth,
        changeCountByForChart, countBy,
        // Passed in from StatsChartViewAggregator:
        sessions_by_country, chartToggles, fields_faceted, /* fields_faceted_group_by, browse_search_queries, other_search_queries, */
        experiment_set_views, file_downloads, file_downloads_volume, file_views,
        smoothEdges, onChartToggle, onSmoothEdgeToggle, cumulativeSum, onCumulativeSumToggle
    } = props;

    if (loadingStatus === 'failed'){
        return <div className="stats-charts-container" key="charts" id="usage"><ErrorIcon/></div>;
    }

    if (!mounted || (loadingStatus === 'loading' && (!file_downloads && !sessions_by_country))){
        return <div className="stats-charts-container" key="charts" id="usage"><LoadingIcon/></div>;
    }

    const { anyExpandedCharts, commonXDomain, dateRoundInterval } = useMemo(function(){
        const { fromDate: propFromDate, untilDate: propUntilDate } = UsageStatsViewController.getSearchReqMomentsForTimePeriod(currentGroupBy);
        let fromDate, untilDate, dateRoundInterval;
        // We want all charts to share the same x axis. Here we round to date boundary.
        // Minor issue is that file downloads are stored in UTC/GMT while analytics are in EST timezone..
        // TODO improve on this somehow, maybe pass prop to FileDownload chart re: timezone parsing of some sort.
        if (currentGroupBy === 'daily30' || currentGroupBy === 'daily60') {
            fromDate = add(startOfDay(propFromDate), { minutes: 15 });
            untilDate = add(endOfDay(propUntilDate), { minutes: 45 });
            dateRoundInterval = 'day';
        } else if (currentGroupBy === 'monthly') {
            fromDate = endOfMonth(propFromDate); // Not rly needed.
            untilDate = sub(endOfMonth(propUntilDate), { days: 1 });
            dateRoundInterval = 'month';
        } else if (currentGroupBy === 'yearly') { // Not yet implemented
            dateRoundInterval = 'year';
        }
        return {
            anyExpandedCharts: _.any(_.values(chartToggles)),
            commonXDomain: [fromDate, untilDate],
            dateRoundInterval
        };
    }, [ currentGroupBy, anyExpandedCharts ]);

    const commonContainerProps = { 'onToggle' : onChartToggle, chartToggles, windowWidth, 'defaultColSize' : '12', 'defaultHeight' : anyExpandedCharts ? 200 : 250 };
    const commonChartProps = {
        dateRoundInterval,
        'xDomain': commonXDomain,
        'curveFxn': smoothEdges ? d3.curveMonotoneX : d3.curveStepAfter,
        cumulativeSum: cumulativeSum
    };
    const countByDropdownProps = { countBy, changeCountByForChart };

    const enableFileDownloadsChartTooltipItemClick = (countBy.file_downloads === 'top_files');
    const fileDownloadsChartHeight = enableFileDownloadsChartTooltipItemClick ? 350 : commonContainerProps.defaultHeight;

    return (
        <div className="stats-charts-container" key="charts" id="usage">

            <GroupByDropdown {...{ groupByOptions, loadingStatus, handleGroupByChange, currentGroupBy }}
                title="Show" outerClassName="dropdown-container mb-0 sticky-top">
                <div className="d-inline-block ms-15 me-15">
                    <Checkbox checked={smoothEdges} onChange={onSmoothEdgeToggle}>Smooth Edges</Checkbox>
                </div>
                <div className="d-inline-block">
                    <Checkbox checked={cumulativeSum} onChange={onCumulativeSumToggle}>Show as cumulative sum</Checkbox>
                </div>
            </GroupByDropdown>

            { session && file_downloads ?

                <ColorScaleProvider resetScalesWhenChange={file_downloads}>

                    <div className="clearfix">
                        <div className="pull-right mt-07">
                            <UsageChartsCountByDropdown {...countByDropdownProps} chartID="file_downloads" />
                        </div>
                        <h3 className="charts-group-title">
                            <span className="d-block d-sm-inline">File Downloads<sup>*</sup></span>
                            <span className="text-300 d-none d-sm-inline"> - </span>
                            <span className="text-300">{UsageStatsView.titleExtensions['file_downloads'][countBy.file_downloads]}</span>
                        </h3>
                    </div>

                    <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                    <AreaChartContainer {...commonContainerProps} id="file_downloads" defaultHeight={fileDownloadsChartHeight}
                        title={<h5 className="text-400 mt-0">Total File Count</h5>}
                        subTitle={enableFileDownloadsChartTooltipItemClick && <h4 className="fw-normal text-secondary">Click bar to view details</h4>}>
                        <AreaChart {...commonChartProps} data={file_downloads} showTooltipOnHover={!enableFileDownloadsChartTooltipItemClick} />
                    </AreaChartContainer>

                    <AreaChartContainer {...commonContainerProps} id="file_downloads_volume" defaultHeight={fileDownloadsChartHeight}
                        title={<h5 className="text-400 mt-0">Total File Size (GB)</h5>}
                        subTitle={enableFileDownloadsChartTooltipItemClick && <h4 className="fw-normal text-secondary">Click bar to view details</h4>}>
                        <AreaChart {...commonChartProps} data={file_downloads_volume} showTooltipOnHover={!enableFileDownloadsChartTooltipItemClick} yAxisLabel="GB" />
                    </AreaChartContainer>

                    <p className="fst-italic mt-2">Download tracking started in August 2018 | Re-Implemented in Feb 2020 and August 2023</p>

                </ColorScaleProvider>

                : null }

            {session && file_views ?

                <ColorScaleProvider resetScalesWhenChange={file_views}>

                    <hr />

                    <AreaChartContainer {...commonContainerProps} id="file_views"
                        title={
                            <h3 className="charts-group-title">
                                <span className="d-block d-sm-inline">File Views</span><span className="text-300 d-none d-sm-inline"> - </span>
                                <span className="text-300">{UsageStatsView.titleExtensions['file_views'][countBy.file_views]}</span>
                            </h3>
                        }
                        extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="file_views" />}
                        legend={<HorizontalD3ScaleLegend {...{ loadingStatus }} />}>
                        <AreaChart {...commonChartProps} data={file_views} />
                    </AreaChartContainer>

                </ColorScaleProvider>

                : null}

            { sessions_by_country ?

                <ColorScaleProvider resetScaleLegendWhenChange={sessions_by_country}>

                    <AreaChartContainer {...commonContainerProps} id="sessions_by_country"
                        title={
                            <h3 className="charts-group-title">
                                <span className="d-block d-sm-inline">{countBy.sessions_by_country === 'sessions' ? 'User Sessions' : 'Page Views'}</span>
                                <span className="text-300 d-none d-sm-inline"> - </span>
                                <span className="text-300">{UsageStatsView.titleExtensions['sessions_by_country'][countBy.sessions_by_country]}</span>
                            </h3>
                        }
                        extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="sessions_by_country" />}
                        legend={<HorizontalD3ScaleLegend {...{ loadingStatus }} />}>
                        <AreaChart {...commonChartProps} data={sessions_by_country} />
                    </AreaChartContainer>


                </ColorScaleProvider>

                : null }

            {/*
                Disabled for now until/if we want to bring this back:

                browse_search_queries || other_search_queries ?

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

                    <AreaChartContainer {...commonContainerProps} id="experiment_set_views"
                        title={
                            <h3 className="charts-group-title">
                                <span className="d-block d-sm-inline">Experiment Set Detail Views</span>
                                <span className="text-300 d-none d-sm-inline"> - </span>
                                <span className="text-300">{ UsageStatsView.titleExtensions['experiment_set_views'][countBy.experiment_set_views] }</span>
                            </h3>
                        }
                        extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="experiment_set_views" />}
                        legend={<HorizontalD3ScaleLegend {...{ loadingStatus }} />}>
                        <AreaChart {...commonChartProps} data={experiment_set_views} />
                    </AreaChartContainer>

                </ColorScaleProvider>

                : null }

            { session && fields_faceted ?

                <ColorScaleProvider resetScaleLegendWhenChange={fields_faceted}>

                    <AreaChartContainer {...commonContainerProps} id="fields_faceted"
                        title={
                            <h3 className="charts-group-title">
                                <span className="d-block d-sm-inline">Top Fields Faceted</span>
                                <span className="text-300 d-none d-sm-inline"> - </span>
                                <span className="text-300">{ UsageStatsView.titleExtensions['fields_faceted'][countBy.fields_faceted] }</span>
                            </h3>
                        }
                        extraButtons={<UsageChartsCountByDropdown {...countByDropdownProps} chartID="fields_faceted" />}
                        legend={<HorizontalD3ScaleLegend {...{ loadingStatus }} />}>
                        <AreaChart {...commonChartProps} data={fields_faceted} />
                    </AreaChartContainer>

                </ColorScaleProvider>

                : null }

        </div>
    );
}
UsageStatsView.titleExtensions = {
    'experiment_set_views': {
        'expset_list_views': 'appearances in results',
        'expset_clicks': 'clicks from browse results',
        'expset_detail_views': 'detail views by lab',
    },
    'sessions_by_country': {
        'views': 'by country',
        'sessions': 'by country',
        'device_category': 'by device category'
    },
    'file_views': {
        'metadata_tsv_by_country': 'metadata.tsv files',
        'file_list_views': 'appearances in results',
        'file_clicks': 'clicks from browse results',
        'file_detail_views': 'detail views by file type',
    },
    'file_downloads': {
        'filetype': 'by file type',
        'experiment_type': 'by experiment type',
        'top_files': 'top 10 files'
    },
    'fields_faceted': {
        'views': 'by search result instance',
        'sessions': 'by unique users'
    }
};


export function SubmissionsStatsView(props) {
    const {
        loadingStatus, mounted, session, currentGroupBy, groupByOptions, handleGroupByChange, windowWidth,
        currentDateRangePreset, currentDateRangeFrom, currentDateRangeTo, dateRangeOptions, handleDateRangeChange,
        // Passed in from StatsChartViewAggregator:
        expsets_released, expsets_released_internal, files_released, file_volume_released,
        expsets_released_vs_internal, chartToggles, smoothEdges, width, onChartToggle, onSmoothEdgeToggle,
        cumulativeSum, onCumulativeSumToggle
    } = props;

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
    const xDomain = convertDataRangeToXDomain(currentDateRangePreset, currentDateRangeFrom, currentDateRangeTo);
    const commonChartProps = { 'curveFxn' : smoothEdges ? d3.curveMonotoneX : d3.curveStepAfter, cumulativeSum: cumulativeSum, xDomain };
    const groupByProps = {
        currentGroupBy, groupByOptions, handleGroupByChange,
        currentDateRangePreset, currentDateRangeFrom, currentDateRangeTo, dateRangeOptions, handleDateRangeChange, loadingStatus
    };
    const invalidDateRange = currentDateRangeFrom && currentDateRangeTo && currentDateRangeFrom > currentDateRangeTo;

    return (
        <div className="stats-charts-container" key="charts" id="submissions">

            <GroupByDropdown {...groupByProps} groupByTitle="Group Charts Below By" dateRangeTitle="Date" outerClassName="dropdown-container mb-15 sticky-top">
                <div className="d-inline-block me-15">
                    <Checkbox checked={smoothEdges} onChange={onSmoothEdgeToggle}>Smooth Edges</Checkbox>
                </div>
                <div className="d-inline-block">
                    <Checkbox checked={cumulativeSum} onChange={onCumulativeSumToggle}>Show as cumulative sum</Checkbox>
                </div>
            </GroupByDropdown>

            { showInternalReleaseCharts ?

                <ColorScaleProvider width={width} colorScale={SubmissionsStatsView.colorScaleForPublicVsInternal}>

                    <AreaChartContainer {...commonContainerProps} id="expsets_released_vs_internal"
                        title={
                            <h3 className="charts-group-title">
                                <span className="d-block d-sm-inline">Experiment Sets</span>
                                <span className="text-300 d-none d-sm-inline"> - </span>
                                <span className="text-300">internal vs public release</span>
                            </h3>
                        }
                        subTitle={<ChartSubTitle invalidDateRange={invalidDateRange} data={expsets_released_vs_internal} />}>
                        <AreaChart {...commonChartProps} data={expsets_released_vs_internal} />
                    </AreaChartContainer>

                    <hr/>

                </ColorScaleProvider>

                : null }

            <ColorScaleProvider width={width} resetScalesWhenChange={expsets_released}>

                {/* <GroupByDropdown {...{ currentGroupBy, groupByOptions, handleGroupByChange, loadingStatus }} title="Group Charts Below By">
                    <div className="d-inline-block ms-15">
                        <Checkbox checked={smoothEdges} onChange={onSmoothEdgeToggle}>Smooth Edges</Checkbox>
                    </div>
                </GroupByDropdown>

                <hr/> */}

                <HorizontalD3ScaleLegend {...{ loadingStatus }} />

                <AreaChartContainer {...commonContainerProps} id="expsets_released"
                    title={
                        <h3 className="charts-group-title">
                            <span className="d-block d-sm-inline">Experiment Sets</span>
                            <span className="text-300 d-none d-sm-inline"> - </span>
                            <span className="text-300">{session ? 'publicly released' : 'released'}</span>
                        </h3>}
                    subTitle={<ChartSubTitle invalidDateRange={invalidDateRange} data={expsets_released} />}>
                    <AreaChart {...commonChartProps} data={expsets_released} />
                </AreaChartContainer>

                { showInternalReleaseCharts ?
                    <AreaChartContainer {...commonContainerProps} id="expsets_released_internal"
                        title={
                            <h3 className="charts-group-title">
                                <span className="d-block d-sm-inline">Experiment Sets</span>
                                <span className="text-300 d-none d-sm-inline"> - </span>
                                <span className="text-300">released (public or within 4DN)</span>
                            </h3>
                        }
                        subTitle={<ChartSubTitle invalidDateRange={invalidDateRange} data={expsets_released_internal} />}>
                        <AreaChart {...commonChartProps} data={expsets_released_internal} />
                    </AreaChartContainer>
                    : null }

                <AreaChartContainer {...commonContainerProps} id="files_released"
                    title={
                        <h3 className="charts-group-title">
                            <span className="d-block d-sm-inline">Files</span>
                            <span className="text-300 d-none d-sm-inline"> - </span>
                            <span className="text-300">{session ? 'publicly released' : 'released'}</span>
                        </h3>
                    }
                    subTitle={<ChartSubTitle invalidDateRange={invalidDateRange} data={files_released} />}>
                    <AreaChart {...commonChartProps} data={files_released} />
                </AreaChartContainer>

                <AreaChartContainer {...commonContainerProps} id="file_volume_released"
                    title={
                        <h3 className="charts-group-title">
                            <span className="d-block d-sm-inline">Total File Size</span>
                            <span className="text-300 d-none d-sm-inline"> - </span>
                            <span className="text-300">{session ? 'publicly released' : 'released'}</span>
                        </h3>
                    }
                    subTitle={<ChartSubTitle invalidDateRange={invalidDateRange} data={file_volume_released} />}>
                    <AreaChart {...commonChartProps} data={file_volume_released} yAxisLabel="GB" />
                </AreaChartContainer>

            </ColorScaleProvider>

        </div>
    );
}

/**
 * Use this only for charts with child terms 'Internal Release' and 'Public Release', which are
 * meant to have a separate color scale and child terms from other charts.
 *
 * @param {string} term - One of 'Internal Release' or 'Public Release'.
 * @returns {string} A CSS-valid color string.
 */
SubmissionsStatsView.colorScaleForPublicVsInternal = function(term){
    if (term === 'Internal Release' || term === 'Internally Released'){
        return '#ff7f0e'; // Orange
    } else if (term === 'Public Release' || term === 'Publicly Released'){
        return '#1f77b4'; // Blue
    } else {
        logger.error("Term supplied is not one of 'Internal Release' or 'Public Release': '" + term + "'.");
        throw new Error("Term supplied is not one of 'Internal Release' or 'Public Release': '" + term + "'.");
    }
};

const convertDataRangeToXDomain = memoize(function (rangePreset = 'all', rangeFrom, rangeTo) {
    const rangeLower = (rangePreset || '').toLowerCase();

    const defaultFromDate = '2017-03-01';
    const today = new Date();
    const month = today.getMonth();
    let from = new Date(today.getFullYear(), month, 1);
    let to = null;

    switch (rangeLower) {
        case 'thismonth':
            //do nothing
            break;
        case 'previousmonth':
            //override
            from.setMonth(month - 1);
            to = new Date(today.getFullYear(), month, 1);
            break;
        case 'last3months':
            from.setMonth(month - 2);
            break;
        case 'last6months':
            from.setMonth(month - 5);
            break;
        case 'last12months':
            from.setMonth(month - 11);
            break;
        case 'thisyear':
            from = new Date(today.getFullYear(), 0, 1);
            break;
        case 'previousyear':
            //override
            from = new Date(today.getFullYear() - 1, 0, 1);
            to = new Date(today.getFullYear(), 1, 1);
            break;
        case 'custom':
            from = new Date(rangeFrom || defaultFromDate);
            to = rangeTo ? new Date(rangeTo) : null;
            if (from && to && (from > to)) {
                from = new Date(defaultFromDate);
                to = null;
            }
            break;
        case 'all':
        default:
            from = new Date(defaultFromDate);
            break;
    }
    // get first day of date's week
    const dayOfWeek = from.getDay(); // Sunday: 0, Monday: 1, ..., Saturday: 6
    const daysDifference = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday being 1
    const firstWeekdayFrom = new Date(from.getTime() - daysDifference * 24 * 60 * 60 * 1000);

    return [firstWeekdayFrom, to];
});

function groupExternalChildren(children, externalTermMap){

    if (!externalTermMap){
        return children;
    }

    const filteredOut = [];
    const newChildren = children.filter(function(c){
        if (externalTermMap[c.term]) {
            filteredOut.push(c);
            return false;
        }
        return true;
    });
    if (filteredOut.length > 0){
        const externalChild = {
            'term' : 'External',
            'count': 0,
            'total': 0
        };
        filteredOut.forEach(function(c){
            externalChild.total += c.total;
            externalChild.count += c.count;
        });
        newChildren.push(externalChild);
    }
    return newChildren;
}

const ChartSubTitle = memoize(function ({ data, invalidDateRange }) {
    if (invalidDateRange === true) {
        return <h4 className="fw-normal text-secondary">Invalid date range</h4>;
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return <h4 className="fw-normal text-secondary">No data to display</h4>;
    }
    return null;
});