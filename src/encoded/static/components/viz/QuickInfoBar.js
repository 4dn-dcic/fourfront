'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var url = require('url');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide, layout,  } = require('../util');
var ActiveFiltersBar = require('./components/ActiveFiltersBar');
var MosaicChart = require('./MosaicChart');
var ChartDataController = require('./chart-data-controller');

/**
 * Bar shown below header on home and browse pages.
 * Shows counts of selected experiment_sets, experiments, and files against those properties' total counts.
 * 
 * @module {Component} viz/QuickInfoBar
 */

/** @alias module:viz/QuickInfoBar  */
var QuickInfoBar = module.exports = React.createClass({
    /** @ignore */
    getDefaultProps : function(){
        return {
            'offset' : {},
            'id' : 'stats',
            'className' : null,
            'showCurrent' : true
        };
    },

    /**
     * @returns {Object.<number, boolean, string>} Initial State
     */
    getInitialState : function(){
        return {
            'count_experiments'     : null,
            'count_experiment_sets' : null,
            'count_files'           : null,
            'count_experiments_total'     : null,
            'count_experiment_sets_total' : null,
            'count_files_total'           : null,
            'mounted'               : false,
            'show'                  : false
        };
    },
    /** @ignore */
    componentDidMount : function(){
        this.setState({'mounted' : true});
    },

    /** @ignore */
    shouldComponentUpdate : function(newProps, newState){
        if (this.state.count_experiments !== newState.count_experiments) return true;
        if (this.state.count_experiment_sets !== newState.count_experiment_sets) return true;
        if (this.state.count_files !== newState.count_files) return true;
        
        if (!this.state.count_experiments_total     && this.state.count_experiments_total !== newState.count_experiments_total) return true;
        if (!this.state.count_experiment_sets_total && this.state.count_experiment_sets_total !== newState.count_experiment_sets_total) return true;
        if (!this.state.count_files_total           && this.state.count_files_total !== newState.count_files_total) return true;

        if (this.state.mounted !== newState.mounted) return true;
        if (this.state.show !== newState.show) return true;
        if (this.props.showCurrent !== newProps.showCurrent) return true;
        if (this.props.expSetFilters !== newProps.expSetFilters) return true;
        if (this.isInvisible(this.props, this.state) != this.isInvisible(newProps, newState)) return true;

        return false;
    },

    updateCurrentAndTotalCounts : function(current, total, callback){
        this.setState({
            'count_experiments' : current.experiments,
            'count_experiment_sets' : current.experiment_sets,
            'count_files' : current.files,
            'count_experiments_total' : total.experiments,
            'count_experiment_sets_total' : total.experiment_sets,
            'count_files_total' : total.files
        }, typeof callback === 'function' ? callback() : null);
        return true;
    },

    updateCurrentCounts : function(newCounts, callback){
        this.setState({
            'count_experiments' : newCounts.experiments,
            'count_experiment_sets' : newCounts.experiment_sets,
            'count_files' : newCounts.files
        }, typeof callback === 'function' ? callback() : null);
        return true;
    },

    updateTotalCounts : function(newCounts, callback){
        this.setState({
            'count_experiments_total' : newCounts.experiments,
            'count_experiment_sets_total' : newCounts.experiment_sets,
            'count_files_total' : newCounts.files
        }, typeof callback === 'function' ? callback() : null);
        return true;
    },

    /** Check if component is visible or not. */
    isInvisible : function(props = this.props, state = this.state){
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
            if (pathParts[0] === 'search') return false;
            if (pathParts[0] === 'home') return false;
            if (pathParts.length === 1 && pathParts[0] === "") return false;
            return true;
        }

        return false;
    },

    /**
     * Updates state.show if no filters are selected.
     * 
     * @param {Object} nextProps - Next props.
     * @returns {undefined}
     */
    componentWillReceiveProps : function(nextProps){
        if (!(nextProps.expSetFilters && _.keys(nextProps.expSetFilters).length > 0) && this.state.show){
            this.setState({ 'show' : false });
        }
    },

    /** @ignore */
    className: function(){
        var cn = "explanation";
        if (typeof this.props.className === 'string') cn += ' ' + this.props.className;
        if (this.isInvisible()) cn += ' invisible';
        return cn;
    },

    /** @ignore */
    renderStats : function(){
        var areAnyFiltersSet = (this.props.expSetFilters && _.keys(this.props.expSetFilters).length > 0);
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
            }}>
                <div className="left-side clearfix">
                    <QuickInfoBar.Stat
                        shortLabel="Experiment Sets"
                        longLabel="Experiment Sets"
                        id={this.props.id}
                        classNameID="expsets"
                        value={stats.experiment_sets}
                        key={0}
                    />
                    <QuickInfoBar.Stat
                        shortLabel="Experiments"
                        longLabel="Experiments"
                        id={this.props.id}
                        classNameID="experiments"
                        value={stats.experiments}
                        key={1}
                    />
                    <QuickInfoBar.Stat
                        shortLabel="Files"
                        longLabel="Files in Experiments"
                        id={this.props.id}
                        classNameID="files"
                        value={stats.files}
                        key={2}
                    />
                    <div
                        className="any-filters glance-label"
                        title={areAnyFiltersSet ? "Filtered" : "No filters set"}
                        onMouseEnter={_.debounce(()=>{
                            if (areAnyFiltersSet) this.setState({ show : 'activeFilters' });
                        },100)}
                    >
                        <i className="icon icon-filter" style={{ opacity : areAnyFiltersSet ? 1 : 0.25 }} />
                    </div>
                </div>
                { this.renderHoverBar() }
            </div>
        );
    },

    /** @ignore */
    renderHoverBar : function(){
        if (this.state.show === 'activeFilters') {
            return (
                <div className="bottom-side">
                    <div className="crumbs-label">
                        Filtered by
                    </div>
                    <ActiveFiltersBar
                        expSetFilters={this.props.expSetFilters}
                        invisible={!this.state.mounted}
                        orderedFieldNames={null}
                        href={this.props.href}
                        showTitle={false}
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
    },

    /** @ignore */
    render : function(){
        return(
            <div id={this.props.id} className={this.className()}>
                { this.renderStats() }
            </div>
        );
    },

    /** @ignore */
    statics : {

        /** @ignore */
        Stat : React.createClass({

            /** @ignore */
            getDefaultProps : function(){
                return {
                    'value' : 0,
                    'label' : 'Experiments',
                    'classNameID': 'experiments',
                    'id' : null
                };
            },

            /** @ignore */
            render : function(){
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
        })
    }

});
