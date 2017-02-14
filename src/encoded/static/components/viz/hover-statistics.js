'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { expFxn, Filters, console, object, isServerSide } = require('../util');
var ChartBreadcrumbs = require('./components/ChartBreadcrumbs');


var HoverStatistics = module.exports = React.createClass({

    getDefaultProps : function(){
        return {
            'offset' : {},
            'id' : 'stats',
            'className' : null,
            'showCurrent' : true
        };
    },

    getInitialState : function(){
        return {
            'count_experiments'     : null,
            'count_experiment_sets' : null,
            'count_files'           : null,
            'count_experiments_total'     : null,
            'count_experiment_sets_total' : null,
            'count_files_total'           : null,
            'mounted' : false,
            'showFilters' : false
        };
    },

    componentDidMount : function(){
        this.setState({'mounted' : true});
    },

    shouldComponentUpdate : function(newProps, newState){
        if (this.state.count_experiments !== newState.count_experiments) return true;
        if (this.state.count_experiment_sets !== newState.count_experiment_sets) return true;
        if (this.state.count_files !== newState.count_files) return true;
        
        if (!this.state.count_experiments_total     && this.state.count_experiments_total !== newState.count_experiments_total) return true;
        if (!this.state.count_experiment_sets_total && this.state.count_experiment_sets_total !== newState.count_experiment_sets_total) return true;
        if (!this.state.count_files_total           && this.state.count_files_total !== newState.count_files_total) return true;

        if (this.state.mounted !== newState.mounted) return true;
        if (this.state.showFilters !== newState.showFilters) return true;
        if (this.props.showCurrent !== newProps.showCurrent) return true;
        if (this.props.expSetFilters !== newProps.expSetFilters) return true;
        if (this.isInvisible(this.props, this.state) != this.isInvisible(newProps, newState)) return true;

        return false;
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
            // Doing replace twice should be faster than one time with /g regex flag (3 steps each or 15 steps combined w/ '/g')
            var pathParts = url.parse(props.href).pathname.replace(/^\//, "").replace(/\/$/, "").split('/');
            if (pathParts[0] === 'browse') return false;
            if (pathParts[0] === 'search') return false;
            if (pathParts[0] === 'home') return false;
            if (pathParts.length === 1 && pathParts[0] === "") return false;
            return true;
        }

        return false;
    },

    componentWillReceiveProps : function(nextProps){
        if (!(nextProps.expSetFilters && _.keys(nextProps.expSetFilters).length > 0) && this.state.showFilters){
            this.setState({ 'showFilters' : false });
        }
    },

    className: function(){
        var cn = "explanation";
        if (typeof this.props.className === 'string') cn += ' ' + this.props.className;
        if (this.isInvisible()) cn += ' invisible';
        return cn;
    },

    renderStats : function(){
        var areAnyFiltersSet = (this.props.expSetFilters && _.keys(this.props.expSetFilters).length > 0);
        var stats;
        if (this.props.showCurrent || this.state.showCurrent){
            stats = {
                'experiment_sets' : this.state.count_experiment_sets,
                'experiments' : this.state.count_experiments,
                'files' : this.state.count_files
            };
        } else {
            stats = {
                'experiment_sets' : this.state.count_experiment_sets_total,
                'experiments' : this.state.count_experiments_total,
                'files' : this.state.count_files_total
            };
        }
        return (
            <div className={"inner container" + (this.state.showFilters ? ' showing-filters' : '')} onMouseLeave={()=>{
                this.setState({ showFilters : false });
            }}>
                <div className="left-side clearfix" onMouseEnter={()=>{
                    if (areAnyFiltersSet) this.setState({ showFilters : true });
                }}>
                    <HoverStatistics.Stat
                        shortLabel="Exp. Sets"
                        longLabel="Experiment Sets"
                        id={this.props.id}
                        classNameID="expsets"
                        value={stats.experiment_sets}
                        key={0}
                    />
                    <HoverStatistics.Stat
                        shortLabel="Exps"
                        longLabel="Experiments"
                        id={this.props.id}
                        classNameID="experiments"
                        value={stats.experiments}
                        key={1}
                    />
                    <HoverStatistics.Stat
                        shortLabel="Files"
                        longLabel="Files in Experiments"
                        id={this.props.id}
                        classNameID="files"
                        value={stats.files}
                        key={2}
                    />
                    <div className="any-filters-glance-label" title={areAnyFiltersSet ? "Filtered" : "No filters set"}>
                        <i className="icon icon-filter" style={{ opacity : areAnyFiltersSet ? 1 : 0.25 }} />
                    </div>
                </div>
                <div className="bottom-side" style={{ opacity : this.state.showFilters ? 1 : 0 }}>
                    <div className="crumbs-label">
                        Filtered by
                    </div>
                    <ChartBreadcrumbs
                        ref="breadcrumbs"
                        expSetFilters={this.props.expSetFilters}
                        invisible={!this.state.mounted}
                        orderedFieldNames={null}
                        href={this.props.href}
                        showTitle={false}
                    />
                </div>
            </div>
        );
    },

    render : function(){
        return(
            <div id={this.props.id} className={this.className()}>
                { this.renderStats() }
            </div>
        );
    },

    statics : {
        Stat : React.createClass({

            getDefaultProps : function(){
                return {
                    'value' : 0,
                    'label' : 'Experiments',
                    'classNameID': 'experiments',
                    'id' : null
                };
            },

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
