'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import StaticPage from './StaticPage';


const dynamicImports = {};


export default class StatisticsPageView extends React.PureComponent {

    static defaultProps = {
        'defaultTab' : 'submissions'
    };

    static viewOptions = {
        'submissions' : {
            'title' : "Submissions Statistics",
            'icon' : 'upload fas',
            'tip' : "View statistics related to submission and release of Experiment Set",
            'shouldReaggregate' : function(pastProps, nextProps, pastState, nextState){
                if(!pastState || !nextState) return false;
                // Compare object references
                if (pastState.cumulativeSum !== nextState.cumulativeSum) return true;
            }
            // Now set upon load:
            // 'aggregationsToChartData' : _.pick(aggregationsToChartData,
            //     'expsets_released', 'expsets_released_internal',
            //     'expsets_released_vs_internal', 'files_released',
            //     'file_volume_released'
            // )
        },
        'usage' : {
            'title' : "Usage Statistics",
            'icon' : 'users fas',
            'tip' : "View statistics related to usage of the 4DN Data Portal",
            // Now set upon load:
            // 'aggregationsToChartData' : _.pick(aggregationsToChartData,
            //     'sessions_by_country', 'fields_faceted', /* 'browse_search_queries', 'other_search_queries', */
            //     'experiment_set_views', 'file_downloads'
            // ),
            'shouldReaggregate' : function(pastProps, nextProps, pastState, nextState){
                // Compare object references
                if ((pastProps.countBy !== nextProps.countBy) || (pastState.cumulativeSum !== nextState.cumulativeSum)) return true;
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
        const { onComplete } = this.props;

        this.maybeUpdateCurrentTabFromHref();

        if (!dynamicImports.UsageStatsView) {
            setTimeout(()=>{
                // Load in stats page components/code separately (code-splitting)

                // FOR DEVELOPMENT:
                // include `/* webpackMode: "eager" */`, since `npm run dev-quick` won't re-compile dynamic imports correctly.
                // "statistics-page-components" is aliased to './components/StatisticsPageViewBody' in webpack.config.js
                import(
                    /* webpackChunkName: "statistics-page-components" */
                    "statistics-page-components"
                ).then((loadedModule) => {
                    _.extend(dynamicImports, loadedModule);
                    this.setState({ mounted: true });
                });

            });
        } else if (onComplete && typeof onComplete === 'function') {
            onComplete();
        }
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
            const hrefParts = href && memoizedUrlParse(href);
            const hash = hrefParts && hrefParts.hash && hrefParts.hash.replace('#', '');
            if (hash && hash !== currentTab && hash.charAt(0) !== '!'){
                if (typeof StatisticsPageView.viewOptions[hash] !== 'undefined'){
                    return { 'currentTab' : hash };
                }
            }
        });
    }

    renderSubmissionsSection(){
        const { shouldReaggregate } = StatisticsPageView.viewOptions.submissions;
        // GroupByController is on outside here because SubmissionStatsViewController detects if props.currentGroupBy has changed in orded to re-fetch aggs.
        const { browseBaseState } = this.props;

        const groupByOptions = {
            'award.project' : <span><i className="icon icon-fw fas icon-university me-1"/>Project</span>,
            'experiments_in_set.processed_files.track_and_facet_info.experimental_lab' : <span><i className="icon icon-fw fas icon-university me-1"/>Lab</span>,
            'experiments_in_set.processed_files.track_and_facet_info.experiment_type' : <span><i className="icon icon-fw fas icon-university me-1"/>Experiment Type</span>,
        };

        let initialGroupBy = 'award.project';

        const dateRangeOptions = {
            'all'           : <span>All</span>,
            'thismonth'     : <span>This Month</span>,
            'previousmonth' : <span>Previous Month</span>,
            'last3months'   : <span>Last 3 Months</span>,
            'last6months'   : <span>Last 6 Months</span>,
            'last12months'  : <span>Last 12 Months</span>,
            'thisyear'      : <span>This Year</span>,
            'previousyear'  : <span>Previous Year</span>,
            'custom'        : <span>Custom</span>
        };
        const initialDateRangePreset = 'all';

        if (browseBaseState !== 'all'){
            _.extend(groupByOptions, {
                'award.center_title'                 : <span><i className="icon icon-fw fas icon-university me-1"/>Center</span>,
                'lab.display_title'                  : <span><i className="icon icon-fw fas icon-users me-1"/>Lab</span>,
                'experiments_in_set.experiment_type.display_title' : <span><i className="icon icon-fw fas icon-chart-bar me-1"/>Experiment Type</span>
            });
            initialGroupBy = 'award.center_title';
        }
        return (
            <dynamicImports.GroupByController {...{ groupByOptions, initialGroupBy, dateRangeOptions, initialDateRangePreset }}>
                <dynamicImports.SubmissionStatsViewController {..._.pick(this.props, 'session', 'browseBaseState', 'windowWidth')}>
                    <dynamicImports.StatsChartViewAggregator {...{ shouldReaggregate }} aggregationsToChartData={dynamicImports.submissionsAggsToChartData} cumulativeSum={true}>
                        <dynamicImports.SubmissionsStatsView />
                    </dynamicImports.StatsChartViewAggregator>
                </dynamicImports.SubmissionStatsViewController>
            </dynamicImports.GroupByController>
        );
    }

    renderUsageSection(){
        const { shouldReaggregate } = StatisticsPageView.viewOptions.usage;
        const groupByOptions = {
            'daily:30': <span>Previous 30 Days</span>,
            'daily:60': <span>Previous 60 Days</span>,
            'monthly:6': <span>Previous 6 Months</span>,
            'monthly:12': <span>Previous 12 Months</span>,
            'monthly:18': <span>Previous 18 Months</span>,
            'monthly:All': <span>All</span>
        };
        const dataKeys = _.keys(dynamicImports.usageAggsToChartData || {});
        const initialChartToggles = {
            'chart': dataKeys.reduce((acc, key) => { acc[key] = true; return acc; }, {}),
            'table': dataKeys.reduce((acc, key) => { acc[key] = true; return acc; }, {}),
            'expanded': dataKeys.reduce((acc, key) => { acc[key] = false; return acc; }, {})
        };
        // override
        initialChartToggles.table['fields_faceted'] = false;
        return (
            <dynamicImports.GroupByController groupByOptions={groupByOptions} initialGroupBy="daily:60">
                <dynamicImports.UsageStatsViewController {..._.pick(this.props, 'session', 'windowWidth', 'href')}>
                    <dynamicImports.StatsChartViewAggregator {...{ shouldReaggregate }} aggregationsToChartData={dynamicImports.usageAggsToChartData} initialChartToggles={initialChartToggles}>
                        <dynamicImports.UsageStatsView />
                    </dynamicImports.StatsChartViewAggregator>
                </dynamicImports.UsageStatsViewController>
            </dynamicImports.GroupByController>
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
                        { submissionsObj.icon ? <i className={"me-07 text-medium icon icon-fw icon-" + submissionsObj.icon}/> : null }
                        { submissionsObj.title }
                    </a>
                </div>
                <div className="col-sm-6">
                    <a className={"select-section-btn" + (currentTab === 'usage' ? ' active' : '')}
                        href="#usage" data-tip={currentTab === 'usage' ? null : usageObj.tip} data-target-offset={100}>
                        { usageObj.icon ? <i className={"me-07 text-medium icon icon-fw icon-" + usageObj.icon}/> : null }
                        { usageObj.title }
                    </a>
                </div>
            </div>
        );
    }

    render(){
        const { currentTab, mounted = false } = this.state;
        let body = null;
        if (mounted) {
            body = currentTab === 'usage' ? this.renderUsageSection() : this.renderSubmissionsSection();
        }
        return (
            <StaticPage.Wrapper>
                { this.renderTopMenu() }
                <hr/>
                { body }
            </StaticPage.Wrapper>
        );
    }
}