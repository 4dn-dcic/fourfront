'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import queryString from 'query-string';
import * as d3 from 'd3';
import * as vizUtil from './utilities';
import { expFxn, Filters, console, object, isServerSide, layout, analytics, navigate } from '../util';
import { Toggle } from '../inputs';
import * as store from './../../store';
import { ActiveFiltersBar } from './components/ActiveFiltersBar';
import { ChartDataController } from './chart-data-controller';
import ReactTooltip from 'react-tooltip';



/**
 * Bar shown below header on home and browse pages.
 * Shows counts of selected experiment_sets, experiments, and files against those properties' total counts.
 * 
 * Possible todo: Remove functions for updating counts, instead wrap in ChartDataController.provider and aggregate, using shouldComponentUpdate
 * More likely todo: Do chart-stuff aggregation on back-end, display context.charts.aggregations.counts.files, ...experiments, ...experiment_sets, etc. here instead.
 *
 * @module {Component} viz/QuickInfoBar
 * @prop {string} href - Current location/href passed down from Redux store. Used for determining whether to display QuickInfoBar or not.
 */

export default class QuickInfoBar extends React.Component {

    static isInvisibleForHref(href){
        // If have href, only show for /browse/, /search/, and / & /home
        var urlParts = url.parse(href);
        if (urlParts.hash && urlParts.hash.indexOf('!impersonate-user') > -1) return true;
        // Doing replace twice should be faster than one time with /g regex flag (3 steps each or 15 steps combined w/ '/g')
        var pathParts = urlParts.pathname.replace(/^\//, "").replace(/\/$/, "").split('/');
        if (pathParts[0] === 'browse') return false;
        if (pathParts[0] === 'search') return true;
        if (pathParts[0] === 'home') return false;
        if (pathParts.length === 1 && pathParts[0] === "") return false;
        return true;
    }

    static getCountsFromProps(props){
        var defaultNullCounts = { 'experiment_sets' : null, 'experiments' : null, 'files' : null };
        var current = (props.barplot_data_filtered && props.barplot_data_filtered.total) || defaultNullCounts,
            total = (props.barplot_data_unfiltered && props.barplot_data_unfiltered.total) || defaultNullCounts;
        return { current, total };
    }

    static defaultProps = {
        'offset' : {},
        'id' : 'stats',
        'className' : null,
        'showCurrent' : true
    }

    /**
     * Sets this.state, containing counts for filtered & total experiments, experiment_sets, and files.
     * Counts are set to null by default, and instance's updateCurrentAndTotalCounts method must be called
     * each time stats are updated from some high-level component.
     *
     * Currently this is done by having refs...updateCurrentAndTotalCounts being accessible
     * through refs.navigation on app component/module, which makes an 'updateStats' instance function available,
     * which is provided to ChartDataController.
     *
     * Additionally holds {boolean|string} 'show' property, describing what is shown in bottom part; and a {boolean} 'mounted' property.
     *
     * @constructor
     */
    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.isInvisible = this.isInvisible.bind(this);
        this.anyFiltersSet = this.anyFiltersSet.bind(this);
        this.className = this.className.bind(this);
        this.onIconMouseEnter = _.debounce(this.onIconMouseEnter.bind(this), 500, true);
        this.onBrowseStateToggle = this.onBrowseStateToggle.bind(this);
        this.onPanelAreaMouseLeave = this.onPanelAreaMouseLeave.bind(this);
        this.renderStats = this.renderStats.bind(this);
        this.renderHoverBar = this.renderHoverBar.bind(this);
        this.state = {
            'mounted'               : false,
            'show'                  : false,
            'reallyShow'            : false
        };
    }

    /**
     * Updates state.show if no filters are selected.
     *
     * @private
     * @instance
     * @param {Object} nextProps - Next props.
     * @returns {undefined}
     */
    componentWillReceiveProps(nextProps){
        if (!(nextProps.expSetFilters && _.keys(nextProps.expSetFilters).length > 0) && this.state.show){
            this.setState({ 'show' : false });
        }
    }

    /** @private */
    componentDidMount(){
        this.setState({'mounted' : true});
    }

    componentDidUpdate(pastProps, pastState){
        if (this.anyFiltersSet() !== this.anyFiltersSet(pastProps)) ReactTooltip.rebuild();
    }

    /**
     * Check if QuickInfoBar instance is currently invisible, i.e. according to props.href.
     *
     * @public
     * @instance
     * @returns {boolean} True if counts are null or on a 'href' is not of a page for which searching or summary is applicable.
     */
    isInvisible(props = this.props, state = this.state){
        var { total, current } = QuickInfoBar.getCountsFromProps(props);
        if (
            !state.mounted ||
            props.invisible ||
            total === null ||
            (
                (current.experiment_sets === null && total.experiment_sets === null) &&
                (current.experiments === null     && total.experiments === null) &&
                (current.files === null           && total.files === null)
            )
        ) return true;

        if (typeof props.href === 'string'){
            return QuickInfoBar.isInvisibleForHref(props.href);
        }

        return false;
    }

    anyFiltersSet(props = this.props){
        return (props.expSetFilters && _.keys(props.expSetFilters).length > 0);
    }

    className(){
        var cn = "explanation";
        if (typeof this.props.className === 'string') cn += ' ' + this.props.className;
        if (this.isInvisible()) cn += ' invisible';
        return cn;
    }

    onIconMouseEnter(e){
        var areAnyFiltersSet = this.anyFiltersSet();
        if (this.timeout) clearTimeout(this.timeout);
        if (areAnyFiltersSet) this.setState({ 'show' : 'activeFilters', 'reallyShow' : true });
        analytics.event('QuickInfoBar', 'Hover over Filters Icon', {
            'eventLabel' : ( areAnyFiltersSet ? "Some filters are set" : "No filters set" ),
            'dimension1' : analytics.getStringifiedCurrentFilters(this.props.expSetFilters)
        });
    }

    onPanelAreaMouseLeave(e){
        e.preventDefault();
        this.setState({ 'show' : false }, ()=>{
            this.timeout = setTimeout(this.setState.bind(this), 500, { 'reallyShow' : false });
        });
    }

    renderStats(extraClassName = null){
        var areAnyFiltersSet = this.anyFiltersSet();
        var { total, current } = QuickInfoBar.getCountsFromProps(this.props);

        var stats;
        if (current && (current.experiment_sets || current.experiments || current.files)) {
            stats = {
                'experiment_sets'   : <span>{ current.experiment_sets }<small> / { total.experiment_sets || 0 }</small></span>,
                'experiments'       : <span>{ current.experiments }<small> / {total.experiments || 0}</small></span>,
                'files'             : <span>{ current.files }<small> / {total.files || 0}</small></span>
            };
        } else {
            stats = {
                'experiment_sets'   : total.experiment_sets || 0,
                'experiments'       : total.experiments || 0,
                'files'             : total.files || 0
            };
        }
        var statProps = _.pick(this.props, 'id', 'expSetFilters', 'href', 'isLoadingChartData');
        return (
            <div className={"left-side clearfix" + (extraClassName ? ' ' + extraClassName : '')}>
                <Stat {...statProps} shortLabel="Experiment Sets" longLabel="Experiment Sets" classNameID="expsets" value={stats.experiment_sets} key="expsets" />
                <Stat {...statProps} shortLabel="Experiments" longLabel="Experiments" classNameID="experiments" value={stats.experiments} key="experiments" />
                <Stat {...statProps} shortLabel="Files" longLabel="Files in Experiments" classNameID="files" value={stats.files} key="files" />
                <div className="any-filters glance-label" data-tip={areAnyFiltersSet ? "Filtered" : "No Filters Set"} onMouseEnter={this.onIconMouseEnter}>
                    <i className="icon icon-filter" style={{ opacity : areAnyFiltersSet ? 1 : 0.25 }} />
                </div>
            </div>
        );
    }

    onBrowseStateToggle(){
        navigate.setBrowseBaseStateAndRefresh(this.props.browseBaseState === 'only_4dn' ? 'all' : 'only_4dn', this.props.href, this.props.context);
    }

    renderBrowseStateToggle(){
        var checked = this.props.browseBaseState === 'all';
        return (
            <div className="col-xs-4 text-right browse-base-state-toggle-container">
                <div className="inner-more">
                    <Toggle checked={checked} onChange={this.onBrowseStateToggle} />
                    <small>Include External Data</small>
                </div>
            </div>
        );
    }

    renderHoverBar(){
        if (this.state.show === 'activeFilters' || (this.state.show === false && this.state.reallyShow)) {
            return (
                <div className="bottom-side">
                    <div className="crumbs-label">
                        Filtered by
                    </div>
                    <ActiveFiltersBar
                        expSetFilters={this.props.expSetFilters}
                        orderedFieldNames={null}
                        href={this.props.href}
                        showTitle={false}
                        schemas={this.props.schemas}
                        context={this.props.context}
                    />
                    <div className="graph-icon" onMouseEnter={null /*_.debounce(()=>{ this.setState({ show : 'mosaicCharts' }); },1000)*/}>
                        <i className="icon icon-pie-chart" style={{ opacity : 0.05 }} />
                    </div>
                </div>
            );
        } else return null;
    }

    renderBar(){
        var { show, mounted } = this.state;
        if (!mounted) return null;

        var className = "inner container";
        if (show !== false) className += ' showing';
        if (show === 'activeFilters') className += ' showing-filters';
        if (show === 'mosaicCharts') className += ' showing-charts';

        return (
            <div className={className} onMouseLeave={this.onPanelAreaMouseLeave}>
                <div className="row">
                    { this.renderStats('col-xs-8') }
                    { this.renderBrowseStateToggle() }
                </div>
                { this.renderHoverBar() }
            </div>
        );
    }

    render(){
        return <div id={this.props.id} className={this.className()}>{ this.renderBar() }</div>;
    }

}

class Stat extends React.Component {

    static defaultProps = {
        'value' : 0,
        'longLabel' : 'Experiments',
        'classNameID': 'experiments',
        'id' : null
    }

    /**
     * { classNameID : @type }
     */
    static typesPathMap = {
        'experiments' : "/search/?type=Experiment&experiment_sets.experimentset_type=replicate&experiment_sets.@type=ExperimentSetReplicate",
        'expsets' : "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate",
        'files' : "/search/?type=File&experiments.experiment_sets.@type=ExperimentSetReplicate&experiments.experiment_sets.experimentset_type=replicate"
    }

    filtersHrefChunk(){
        if (this.props.classNameID === 'experiments'){
            return Filters.expSetFiltersToURLQuery(Filters.transformExpSetFiltersToExpFilters(this.props.expSetFilters));
        } else if (this.props.classNameID === 'expsets') {
            return Filters.expSetFiltersToURLQuery(this.props.expSetFilters);
        } else if (this.props.classNameID === 'files') {
            return Filters.expSetFiltersToURLQuery(Filters.transformExpSetFiltersToFileFilters(this.props.expSetFilters));
        }
    }

    label(){
        if (!this.props.value) {
            return this.props.shortLabel;
        }

        // Always goto Browse page for now
        var filtersHrefChunk = Filters.expSetFiltersToURLQuery(this.props.expSetFilters); //this.filtersHrefChunk();
        var targetHref = navigate.getBrowseBaseHref();
        targetHref += (filtersHrefChunk ? navigate.determineSeparatorChar(targetHref) + filtersHrefChunk : '');

        if (typeof this.props.href === 'string'){
            // Strip hostname/port from this.props.href and compare pathnames to check if we are already on this page.
            if (navigate.isBrowseHref(this.props.href)) return <span>{ this.props.shortLabel }</span>; 
            if (this.props.href.replace(/(http:|https:)(\/\/)[^\/]+(?=\/)/, '') === targetHref) return <span>{ this.props.shortLabel }</span>;
        }
        
        return (
            <a href={targetHref}>{ this.props.shortLabel }</a>
        );
    }

    render(){
        var { classNameID, longLabel, value, id, isLoadingChartData } = this.props;
        return (
            <div className={"stat stat-" + classNameID} title={longLabel}>
                <div id={id + '-stat-' + classNameID} className="stat-value">
                    { isLoadingChartData ? <i className="icon icon-fw icon-spin icon-circle-o-notch" style={{ opacity : 0.25 }}/> : value }
                </div>
                <div className="stat-label">
                    { this.label() }
                </div>
            </div>
        );
    }

}

