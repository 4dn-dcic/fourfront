'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var url = require('url');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide, layout, analytics } = require('../util');
import { ActiveFiltersBar } from './components/ActiveFiltersBar';
var MosaicChart = require('./MosaicChart');
import { ChartDataController } from './chart-data-controller';
var ReactTooltip = require('react-tooltip');

/**
 * Bar shown below header on home and browse pages.
 * Shows counts of selected experiment_sets, experiments, and files against those properties' total counts.
 *
 * @module {Component} viz/QuickInfoBar
 * @prop {string} href - Current location/href passed down from Redux store. Used for determining whether to display QuickInfoBar or not.
 */

export default class QuickInfoBar extends React.Component {

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

        // If have href, only show for /browse/, /search/, and / & /home
        if (typeof props.href === 'string'){
            var urlParts = url.parse(props.href);
            if (urlParts.hash && urlParts.hash.indexOf('!impersonate-user') > -1) return true;
            // Doing replace twice should be faster than one time with /g regex flag (3 steps each or 15 steps combined w/ '/g')
            var pathParts = urlParts.pathname.replace(/^\//, "").replace(/\/$/, "").split('/');
            if (pathParts[0] === 'browse') return false;
            if (pathParts[0] === 'search') return true;
            if (pathParts[0] === 'home') return false;
            if (pathParts.length === 1 && pathParts[0] === "") return false;
            return true;
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
        if (areAnyFiltersSet) this.setState({ show : 'activeFilters', reallyShow : true });
        analytics.event('QuickInfoBar', 'Hover over Filters Icon', {
            'eventLabel' : ( areAnyFiltersSet ? "Some filters are set" : "No filters set" ),
            'dimension1' : analytics.getStringifiedCurrentFilters(this.props.expSetFilters)
        });
    }

    renderStats(){
        var areAnyFiltersSet = this.anyFiltersSet();
        var stats;
        //if (this.props.showCurrent || this.state.showCurrent){
        if (this.state.count_experiment_sets || this.state.count_experiments || this.state.count_files) {
            stats = {
                'experiment_sets' : (
                    <span>
                        { this.state.count_experiment_sets }<small> / { (this.state.count_experiment_sets_total || 0) }</small>
                    </span>
                ),
                'experiments' : (
                    <span>
                        { this.state.count_experiments }<small> / {this.state.count_experiments_total || 0}</small>
                    </span>
                ),
                'files' : (
                    <span>
                        { this.state.count_files }<small> / {this.state.count_files_total || 0}</small>
                    </span>
                ),
            };
        } else {
            stats = {
                'experiment_sets' : this.state.count_experiment_sets_total || 0,
                'experiments' : this.state.count_experiments_total || 0,
                'files' : this.state.count_files_total || 0
            };
        }
        var className = "inner container";
        if (this.state.show !== false) className += ' showing';
        if (this.state.show === 'activeFilters') className += ' showing-filters';
        if (this.state.show === 'mosaicCharts') className += ' showing-charts';
        return (
            <div className={className} onMouseLeave={()=>{
                this.setState({ show : false });
                this.timeout = setTimeout(this.setState.bind(this), 500, { 'reallyShow' : false });
            }}>
                <div className="left-side clearfix">
                    <Stat
                        shortLabel="Experiment Sets"
                        longLabel="Experiment Sets"
                        id={this.props.id}
                        classNameID="expsets"
                        value={stats.experiment_sets}
                        key={0}
                    />
                    <Stat
                        shortLabel="Experiments"
                        longLabel="Experiments"
                        id={this.props.id}
                        classNameID="experiments"
                        value={stats.experiments}
                        key={1}
                    />
                    <Stat
                        shortLabel="Files"
                        longLabel="Files in Experiments"
                        id={this.props.id}
                        classNameID="files"
                        value={stats.files}
                        key={2}
                    />
                    <div
                        className="any-filters glance-label"
                        data-tip={areAnyFiltersSet ? "Filtered" : "No Filters Set"}
                        onMouseEnter={this.onIconMouseEnter}
                    >
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
        } else {
            return (
                <div className="bottom-side">
                </div>
            );
        }
    }

    render(){
        return(
            <div id={this.props.id} className={this.className()}>
                { this.renderStats() }
            </div>
        );
    }

}

class Stat extends React.Component {

    static defaultProps = {
        'value' : 0,
        'label' : 'Experiments',
        'classNameID': 'experiments',
        'id' : null
    }

    render(){
        return (
            <div className={"stat stat-" + this.props.classNameID} title={this.props.longLabel}>
                <div id={this.props.id + '-stat-' + this.props.classNameID} className="stat-value">
                    { this.props.value }
                </div>
                <div className="stat-label">
                    { this.props.shortLabel }
                </div>
            </div>
        );
    }

}

