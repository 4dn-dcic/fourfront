'use strict';

import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, searchFilters, analytics, memoizedUrlParse,  } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ActiveFiltersBar } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/ActiveFiltersBar';
import { Filters, navigate, Schemas } from './../util';
import { Toggle } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/Toggle';




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

export default class QuickInfoBar extends React.PureComponent {

    static isInvisibleForHref(href){
        // If have href, only show for /browse/, /search/, and / & /home
        const urlParts = memoizedUrlParse(href);
        // Doing replace twice should be faster than one time with /g regex flag (3 steps each or 15 steps combined w/ '/g')
        const pathParts = urlParts.pathname.replace(/^\//, "").replace(/\/$/, "").split('/');
        if (pathParts[0] === 'browse') return false;
        if (pathParts.length === 1 && pathParts[0] === 'statistics') {
            if (!urlParts.hash || urlParts.hash === '#submissions'){
                return false;
            }
        }
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

    /** We memoize the static method because we don't anticipate there to be more than instance of this per page ever. */
    static expSetFilters = memoize(function(contextFilters, browseBaseParams){
        return searchFilters.contextFiltersToExpSetFilters(contextFilters, browseBaseParams);
    });

    /** We memoize the static method because we don't anticipate there to be more than instance of this per page ever. */
    static contextFiltersToInclude = memoize(function(contextFilters, browseBaseParams = {}){
        return (contextFilters|| []).filter(function({ field, term }){
            // Exclude some.
            if (browseBaseParams[field] && browseBaseParams[field].indexOf(term) > -1) {
                return false;
            }
            return true;
        });
    });

    static defaultProps = {
        'offset' : {},
        'id' : 'stats',
        'className' : null,
        'showCurrent' : true
    };

    static getDerivedStateFromProps(props, state){
        const expSetFilters = QuickInfoBar.expSetFilters((props.context && props.context.filters) || null, navigate.getBrowseBaseParams());
        const show = state.show && expSetFilters && _.keys(expSetFilters).length > 0 && state.show;
        return { show };
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
        this.isInvisible = this.isInvisible.bind(this);
        this.anyFiltersSet = this.anyFiltersSet.bind(this);
        this.className = this.className.bind(this);
        this.onIconMouseEnter = _.debounce(this.onIconMouseEnter.bind(this), 500, true);
        this.onBrowseStateToggle = _.throttle(this.onBrowseStateToggle.bind(this), 1000, { trailing: false });
        this.onPanelAreaMouseLeave = this.onPanelAreaMouseLeave.bind(this);
        this.handleActiveFilterTermClick = this.handleActiveFilterTermClick.bind(this);
        this.state = {
            'mounted'               : false,
            'show'                  : false,
            'reallyShow'            : false,
            'togglingBrowseState'   : false
        };
    }

    /** @private */
    componentDidMount(){
        this.setState({ 'mounted' : true });
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

    anyFiltersSet(){
        const { context, browseBaseState } = this.props;
        const browseBaseParams = navigate.getBrowseBaseParams(browseBaseState);
        const expSetFilters = QuickInfoBar.expSetFilters((context && context.filters) || null, browseBaseParams);
        return (expSetFilters && _.keys(expSetFilters).length > 0);
    }

    className(){
        var cn = "explanation";
        if (typeof this.props.className === 'string') cn += ' ' + this.props.className;
        if (this.isInvisible()) cn += ' invisible';
        return cn;
    }

    onIconMouseEnter(e){
        const { context, browseBaseState } = this.props;
        const browseBaseParams = navigate.getBrowseBaseParams(browseBaseState);
        const areAnyFiltersSet = this.anyFiltersSet();
        if (this.timeout) clearTimeout(this.timeout);
        if (areAnyFiltersSet) {
            this.setState({ 'show' : 'activeFilters', 'reallyShow' : true });
        }

        //analytics
        const expSetFilters = QuickInfoBar.expSetFilters((context && context.filters) || null, browseBaseParams);
        const strFilters = expSetFilters ? JSON.stringify(searchFilters.expSetFiltersToJSON(expSetFilters), _.keys(expSetFilters).sort()) : "{}";
        analytics.event('navigation_bar', 'QuickInfoBar', 'Hover over Filters Icon', null, {
            'name' : ( areAnyFiltersSet ? "Some filters are set" : "No filters set" ),
            'filters' : strFilters
        });
    }

    onPanelAreaMouseLeave(e){
        e.preventDefault();
        this.setState({ 'show' : false }, ()=>{
            this.timeout = setTimeout(this.setState.bind(this), 500, { 'reallyShow' : false });
        });
    }

    onBrowseStateToggle(){
        const { context, browseBaseState, href } = this.props;
        this.setState({ 'togglingBrowseState' : true }, () => {
            navigate.setBrowseBaseStateAndRefresh(browseBaseState === 'only_4dn' ? 'all' : 'only_4dn', href, context, null, () => {
                this.setState({ 'togglingBrowseState' : false });
            });
        });
    }

    handleActiveFilterTermClick(evt, field, term){
        const { context } = this.props;
        const browseBaseParams = navigate.getBrowseBaseParams();
        const expSetFilters = QuickInfoBar.expSetFilters((context && context.filters) || null, browseBaseParams);
        searchFilters.changeFilter(field, term, expSetFilters, null, false, null, browseBaseParams);

        //analytics
        const strFilters = expSetFilters ? JSON.stringify(searchFilters.expSetFiltersToJSON(expSetFilters), _.keys(expSetFilters).sort()) : "{}";
        analytics.event('navigation_bar', 'QuickInfoBar', 'Unset Filter', null, {
            'name' : `Field: ${field}, Term: ${term}`,
            'filters' : strFilters
        });
    }

    renderHoverBar(){
        const { context, schemas } = this.props;
        const { show, reallyShow } = this.state;
        const browseBaseParams = navigate.getBrowseBaseParams();
        const filters = QuickInfoBar.contextFiltersToInclude(context.filters, browseBaseParams);

        if (show === 'activeFilters' || (show === false && reallyShow)) {
            return (
                <div className="bottom-side">
                    <div className="crumbs-label">
                        Filtered by
                    </div>
                    <ActiveFiltersBar {...{ filters, context, schemas }}
                        onTermClick={this.handleActiveFilterTermClick}
                        termTransformFxn={Schemas.Term.toName} fieldTransformFxn={Schemas.Field.toName} />
                    <div className="graph-icon" onMouseEnter={null /*_.debounce(()=>{ this.setState({ show : 'mosaicCharts' }); },1000)*/}>
                        <i className="icon icon-pie-chart fas" style={{ opacity : 0.05 }} />
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }

    render(){
        const { id, isLoadingChartData, browseBaseState } = this.props;
        const { show, mounted, togglingBrowseState } = this.state;
        const anyFiltersSet = this.anyFiltersSet();
        if (!mounted) return null;

        let className = "inner container";
        if (show !== false) className += ' showing';
        if (show === 'activeFilters') className += ' showing-filters';
        if (show === 'mosaicCharts') className += ' showing-charts';

        return (
            <div id={id} className={this.className()}>
                <div className={className} onMouseLeave={this.onPanelAreaMouseLeave}>
                    <div className="row">
                        <StatsCol {...this.props} anyFiltersSet={anyFiltersSet} onIconMouseEnter={this.onIconMouseEnter} show={show} />
                        <BrowseBaseStateToggleCol browseBaseState={browseBaseState} onToggle={this.onBrowseStateToggle}
                            isLoading={togglingBrowseState || isLoadingChartData} />
                    </div>
                    { this.renderHoverBar() }
                </div>
            </div>
        );
    }
}

const BrowseBaseStateToggleCol = React.memo(function({ browseBaseState, isLoading, onToggle }){
    const checked = browseBaseState === 'all';
    return (
        <div className="col-4 text-end browse-base-state-toggle-container">
            <div className="inner-more">
                <Toggle disabled={isLoading} id="toggle-external-data-switch" checked={checked} onChange={onToggle} />
                <small>Include External Data</small>
            </div>
        </div>
    );
});

const StatsCol = React.memo(function StatsCol(props){
    const { context, browseBaseState, onIconMouseEnter, anyFiltersSet, show } = props;
    const { total, current } = QuickInfoBar.getCountsFromProps(props);
    const expSetFilters = QuickInfoBar.expSetFilters((context && context.filters) || null, navigate.getBrowseBaseParams(browseBaseState));

    let stats, filesLongLabel;
    if (current && (typeof current.experiment_sets === 'number' || typeof current.experiments === 'number' || typeof current.files === 'number')) {
        stats = {
            'experiment_sets'   : <span>{ current.experiment_sets }<small> / { total.experiment_sets || 0 }</small></span>,
            'experiments'       : <span>{ current.experiments }<small> / {total.experiments || 0}</small></span>,
            'files'             : <span>{ current.files }<small> / {total.files || 0}</small></span>
        };
        filesLongLabel = `Raw Files: (${current.files_raw || 0}/${total.files_raw || 0}), Processed Files: (${current.files_processed || 0}/${total.files_processed || 0}), Supplementary Files: (${current.files_opf || 0}/${total.files_opf || 0})`;
    } else {
        stats = {
            'experiment_sets'   : total.experiment_sets || 0,
            'experiments'       : total.experiments || 0,
            'files'             : total.files || 0
        };
        filesLongLabel = `Raw Files: ${total.files_raw || 0}, Processed Files: ${total.files_processed || 0}, Supplementary Files: ${total.files_opf || 0}`;
    }
    // OPF extra stats are for Cypress 03d_browse_views_files_selection, we pass them as attributes like data-total_opf, data-current_opf
    const files_extra = { 'total_opf': (total.files_opf || 0), 'current_opf': current && typeof current.files_opf === 'number' ? current.files_opf || 0 : null };
    const statProps = _.extend(_.pick(props, 'id', 'href', 'isLoadingChartData', 'browseBaseState'), { 'expSetFilters' : expSetFilters });
    return (
        <div className="col-8 left-side clearfix">
            <Stat {...statProps} shortLabel="Experiment Sets" longLabel="Experiment Sets" classNameID="expsets" value={stats.experiment_sets} key="expsets" />
            <Stat {...statProps} shortLabel="Experiments" longLabel="Experiments" classNameID="experiments" value={stats.experiments} key="experiments" />
            <Stat {...statProps} shortLabel="Files" longLabel={filesLongLabel} classNameID="files" value={stats.files} extra={files_extra} key="files" />
            <div className={"any-filters glance-label" + (show ? " showing" : "")} data-tip={anyFiltersSet ? "Filtered" : "No Filters Set"}
                onMouseEnter={onIconMouseEnter}>
                <i className="icon icon-filter fas" style={{ 'opacity' : anyFiltersSet ? 1 : 0.25 }} />
            </div>
        </div>
    );
});

class Stat extends React.PureComponent {

    static defaultProps = {
        'value' : 0,
        'longLabel' : 'Experiments',
        'classNameID': 'experiments',
        'id' : null
    };

    /**
     * { classNameID : @type }
     */
    static typesPathMap = {
        'experiments' : "/search/?type=Experiment&experiment_sets.experimentset_type=replicate&experiment_sets.@type=ExperimentSetReplicate",
        'expsets' : "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate",
        'files' : "/search/?type=File&track_and_facet_info.replicate_info!=No+value"
        // 'files' : "/search/?type=File&experiments.experiment_sets.@type=ExperimentSetReplicate&experiments.experiment_sets.experimentset_type=replicate"
    };

    filtersHrefChunk(){
        const { expSetFilters, classNameID } = this.props;
        if (classNameID === 'experiments'){
            return searchFilters.expSetFiltersToURLQuery(Filters.transformExpSetFiltersToExpFilters(expSetFilters));
        } else if (classNameID === 'expsets') {
            return searchFilters.expSetFiltersToURLQuery(expSetFilters);
        } else if (classNameID === 'files') {
            return searchFilters.expSetFiltersToURLQuery(Filters.transformExpSetFiltersToFileFilters(expSetFilters));
        }
    }

    // Version 1: Always goto Browse page for now
    // label(){
    //     const { value, shortLabel, expSetFilters, href } = this.props;
    //     if (!value) {
    //         return shortLabel;
    //     }

    //     // Always goto Browse page for now
    //     var filtersHrefChunk = searchFilters.expSetFiltersToURLQuery(expSetFilters); //this.filtersHrefChunk();
    //     var targetHref = navigate.getBrowseBaseHref();
    //     targetHref += (filtersHrefChunk ? navigate.determineSeparatorChar(targetHref) + filtersHrefChunk : '');

    //     if (typeof href === 'string'){
    //         // Strip hostname/port from this.props.href and compare pathnames to check if we are already on this page.
    //         if (navigate.isBrowseHref(href)) return <span>{ shortLabel }</span>;
    //         // eslint-disable-next-line no-useless-escape
    //         if (href.replace(/(http:|https:)(\/\/)[^\/]+(?=\/)/, '') === targetHref) return <span>{ shortLabel }</span>;
    //     }

    //     return (
    //         <a href={targetHref}>{ shortLabel }</a>
    //     );
    // }

    // Version 2: Goto ExpSet, Exp, File
    label(){
        const { value, shortLabel, href, classNameID, browseBaseState } = this.props;
        if (!value) {
            return shortLabel;
        }

        const filtersHrefChunk = (browseBaseState === 'only_4dn' ? 'award.project=4DN' : '');
        const sep = filtersHrefChunk && filtersHrefChunk.length > 0 ? '&' : '';
        const targetHref = Stat.typesPathMap[classNameID] + sep + (filtersHrefChunk || '');

        if (typeof href === 'string'){
            // Strip hostname/port from this.props.href and compare pathnames to check if we are already on this page.
            if (navigate.isBrowseHref(href)) return <span>{ shortLabel }</span>;
            // eslint-disable-next-line no-useless-escape
            if (href.replace(/(http:|https:)(\/\/)[^\/]+(?=\/)/, '') === targetHref) return <span>{ shortLabel }</span>;
        }

        return (
            <a href={targetHref}>{shortLabel}</a>
        );
    }

    convertToDataAttributes(obj) {
        const dataAttributes = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] !== 'undefined' && obj[key] !== null) {
                dataAttributes[`data-${key}`] = obj[key];
            }
        }
        return dataAttributes;
    }

    render(){
        var { classNameID, longLabel, value, id, isLoadingChartData, extra } = this.props;

        const extraAttr = extra ? this.convertToDataAttributes(extra) : {};

        return (
            <div className={"stat stat-" + classNameID} title={longLabel}>
                <div id={id + '-stat-' + classNameID} className={"stat-value" + (isLoadingChartData ? ' loading' : '')} {...extraAttr}>
                    { isLoadingChartData ? <i className="icon icon-fw icon-spin icon-circle-notch fas" style={{ opacity : 0.25 }}/> : value }
                </div>
                <div className="stat-label">
                    { this.label() }
                </div>
            </div>
        );
    }

}

