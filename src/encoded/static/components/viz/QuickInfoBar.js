'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var url = require('url');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide, layout, analytics, navigate } = require('../util');
import * as store from './../../store';
import { ActiveFiltersBar } from './components/ActiveFiltersBar';
var MosaicChart = require('./MosaicChart');
import { ChartDataController } from './chart-data-controller';
var ReactTooltip = require('react-tooltip');



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
        this.updateCurrentAndTotalCounts = this.updateCurrentAndTotalCounts.bind(this);
        this.updateCurrentCounts = this.updateCurrentCounts.bind(this);
        this.updateTotalCounts = this.updateTotalCounts.bind(this);
        this.isInvisible = this.isInvisible.bind(this);
        this.anyFiltersSet = this.anyFiltersSet.bind(this);
        this.className = this.className.bind(this);
        this.onIconMouseEnter = _.debounce(this.onIconMouseEnter.bind(this), 500, true);
        this.onPanelAreaMouseLeave = this.onPanelAreaMouseLeave.bind(this);
        this.renderStats = this.renderStats.bind(this);
        this.renderHoverBar = this.renderHoverBar.bind(this);
        this.state = {
            'count_experiments'     : null,
            'count_experiment_sets' : null,
            'count_files'           : null,
            'count_experiments_total'     : null,
            'count_experiment_sets_total' : null,
            'count_files_total'           : null,
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
     * Publically accessible when QuickInfoBar Component instance has a 'ref' prop set by parent component.
     * Use to update stats when expSetFilters change.
     *
     * Currently this is done through ChartDataController, to which an 'updateStats' callback,
     * itself defined in app Component, is provided on initialization.
     *
     * @public
     * @instance
     * @param {Object} current - Object containing current counts of 'experiments', 'experiment_sets', and 'files'.
     * @param {Object} total - Same as 'current' param, but containing total counts.
     * @param {function} [callback] Optional callback function.
     * @returns {boolean} true
     */
    updateCurrentAndTotalCounts(current, total, callback = null){
        this.setState({
            'count_experiments' : current.experiments,
            'count_experiment_sets' : current.experiment_sets,
            'count_files' : current.files,
            'count_experiments_total' : total.experiments,
            'count_experiment_sets_total' : total.experiment_sets,
            'count_files_total' : total.files
        }, typeof callback === 'function' ? callback() : null);
        return true;
    }

    /**
     * Same as updateCurrentAndTotalCounts(), but only for current counts.
     *
     * @public
     * @instance
     * @param {Object} newCounts - Object containing current counts of 'experiments', 'experiment_sets', and 'files'.
     * @param {function} [callback] Optional callback function.
     * @returns {boolean} true
     */
    updateCurrentCounts(newCounts, callback){
        this.setState({
            'count_experiments' : newCounts.experiments,
            'count_experiment_sets' : newCounts.experiment_sets,
            'count_files' : newCounts.files
        }, typeof callback === 'function' ? callback() : null);
        return true;
    }

    /**
     * Same as updateCurrentAndTotalCounts(), but only for total counts.
     *
     * @public
     * @instance
     * @param {Object} newCounts - Object containing current counts of 'experiments', 'experiment_sets', and 'files'.
     * @param {function} [callback] Optional callback function.
     * @returns {boolean} true
     */
    updateTotalCounts(newCounts, callback){
        this.setState({
            'count_experiments_total' : newCounts.experiments,
            'count_experiment_sets_total' : newCounts.experiment_sets,
            'count_files_total' : newCounts.files
        }, typeof callback === 'function' ? callback() : null);
        return true;
    }

    /**
     * Check if QuickInfoBar instance is currently invisible, i.e. according to props.href.
     *
     * @public
     * @instance
     * @returns {boolean} True if counts are null or on a 'href' is not of a page for which searching or summary is applicable.
     */
    isInvisible(props = this.props, state = this.state){
        if (
            !state.mounted ||
            props.invisible ||
            (
                (state.count_experiment_sets === null && state.count_experiment_sets_total === null) &&
                (state.count_experiments === null     && state.count_experiments_total === null) &&
                (state.count_files === null           && state.count_files_total === null)
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

    renderStats(){
        var areAnyFiltersSet = this.anyFiltersSet();
        var { count_experiment_sets, count_experiments, count_files, count_experiment_sets_total, count_experiments_total, count_files_total, show } = this.state;
        var stats;
        if (count_experiment_sets || count_experiments || count_files) {
            stats = {
                'experiment_sets'   : <span>{ count_experiment_sets }<small> / { count_experiment_sets_total || 0 }</small></span>,
                'experiments'       : <span>{ count_experiments }<small> / {count_experiments_total || 0}</small></span>,
                'files'             : <span>{ count_files }<small> / {count_files_total || 0}</small></span>
            };
        } else {
            stats = {
                'experiment_sets'   : count_experiment_sets_total || 0,
                'experiments'       : count_experiments_total || 0,
                'files'             : count_files_total || 0
            };
        }
        var statProps = { 'id' : this.props.id, 'expSetFilters' : this.props.expSetFilters, 'href' : this.props.href };
        var className = "inner container";
        if (show !== false) className += ' showing';
        if (show === 'activeFilters') className += ' showing-filters';
        if (show === 'mosaicCharts') className += ' showing-charts';
        return (
            <div className={className} onMouseLeave={this.onPanelAreaMouseLeave}>
                <div className="left-side clearfix">
                    <Stat {...statProps} shortLabel="Experiment Sets" longLabel="Experiment Sets" classNameID="expsets" value={stats.experiment_sets} key="expsets" />
                    <Stat {...statProps} shortLabel="Experiments" longLabel="Experiments" classNameID="experiments" value={stats.experiments} key="experiments" />
                    <Stat {...statProps} shortLabel="Files" longLabel="Files in Experiments" classNameID="files" value={stats.files} key="files" />
                    <div className="any-filters glance-label" data-tip={areAnyFiltersSet ? "Filtered" : "No Filters Set"} onMouseEnter={this.onIconMouseEnter}>
                        <i className="icon icon-filter" style={{ opacity : areAnyFiltersSet ? 1 : 0.25 }} />
                    </div>
                </div>
                { this.renderHoverBar() }
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
                    <div className="graph-icon" onMouseEnter={_.debounce(()=>{ this.setState({ show : 'mosaicCharts' }); },1000)}>
                        <i className="icon icon-pie-chart" style={{ opacity : 0.05 }} />
                    </div>
                </div>
            );
        } else if (this.state.show === 'mosaicCharts') {
            var chartDataState = ChartDataController.getState();
            return (
                <div className="bottom-side">
                    <div className="row">
                        <div className="col-xs-12 col-sm-6">
                            <ChartDataController.Provider id="mosaic1">
                                    <MosaicChart
                                        fields={chartDataState.chartFieldsHierarchyRight}
                                        maxFieldDepthIndex={chartDataState.chartFieldsHierarchyRight.length - 1}

                                        height={200}
                                        width={ layout.gridContainerWidth() }


                                        href={this.props.href}
                                        key="sunburst"
                                        schemas={this.props.schemas}
                                        debug
                                    />
                                </ChartDataController.Provider>
                        </div>
                    </div>
                </div>
            );
        } else return null;
    }

    render(){
        return <div id={this.props.id} className={this.className()}>{ this.renderStats() }</div>;
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

        var sep = filtersHrefChunk && filtersHrefChunk.length > 0 ? '&' : '';

        var href = Stat.typesPathMap['expsets'/*this.props.classNameID*/] + sep + (filtersHrefChunk || '');

        if (typeof this.props.href === 'string'){
            // Strip hostname/port from this.props.href and compare pathnames to check if we are already on this page.
            if (navigate.isBrowseHref(this.props.href)) return <span>{ this.props.shortLabel }</span>; 
            if (this.props.href.replace(/(http:|https:)(\/\/)[^\/]+(?=\/)/, '') === href) return <span>{ this.props.shortLabel }</span>;
        }
        
        return (
            <a href={href}>{ this.props.shortLabel }</a>
        );
    }

    render(){
        return (
            <div className={"stat stat-" + this.props.classNameID} title={this.props.longLabel}>
                <div id={this.props.id + '-stat-' + this.props.classNameID} className="stat-value">
                    { this.props.value }
                </div>
                <div className="stat-label">
                    { this.label() }
                </div>
            </div>
        );
    }

}

