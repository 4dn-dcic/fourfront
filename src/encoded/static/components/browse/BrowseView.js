'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'querystring';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import * as globals from './../globals';
import { MenuItem, Modal, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } from 'react-bootstrap';
import * as store from './../../store';
import { isServerSide, expFxn, Filters, navigate, object, layout, typedefs } from './../util';
import { ChartDataController } from './../viz/chart-data-controller';
import {
    SearchResultTable, defaultColumnBlockRenderFxn, extendColumnDefinitions, defaultColumnDefinitionMap, columnsToColumnDefinitions,
    SortController, SelectedFilesController, CustomColumnController, CustomColumnSelector, AboveTableControls, ExperimentSetDetailPane,
    FacetList, onFilterHandlerMixin
} from './components';


var { SearchResponse, Item, ColumnDefinition, URLParts } = typedefs;



/**
 * Default column definitions for the browse view.
 *
 * @constant
 * @type {ColumnDefinition[]}
 */
export const browseTableConstantColumnDefinitions = extendColumnDefinitions([
    { 'field' : 'display_title', },
    { 'field' : 'experiments_in_set.experiment_type', },
    { 'field' : 'number_of_experiments', },
    { 'field' : 'number_of_files', },
    { 'field' : 'lab.display_title', },
    { 'field' : 'date_created',  },
    { 'field' : 'status',  },
    { 'field' : 'last_modified.date_modified', }
], defaultColumnDefinitionMap);


/**
 * Component for checkbox that is shown in display_title column (first), along with the expand/collapse toggle.
 * Handles/sets an 'intermediate' checked state if partial selection of files comprising the ExperimentSet.
 */
class ExperimentSetCheckBox extends React.PureComponent {

    static isDisabled(files){
        return files.length === 0;
    }

    static isAllFilesChecked(selectedFiles, allFiles){
        return selectedFiles.length === allFiles.length && !ExperimentSetCheckBox.isDisabled(allFiles);
    }

    static isIndeterminate(selectedFiles, allFiles){
        return selectedFiles.length > 0 && selectedFiles.length < allFiles.length;
    }

    render(){
        var { checked, disabled, onChange, indeterminate } = this.props;
        return(
            <input {...{ checked, disabled, onChange }} type="checkbox" className="expset-checkbox" ref={function(r){
                if (r) r.indeterminate = (checked ? false : indeterminate);
            }} />
        );
    }
}






/**
 * Handles state for Browse results, including page & limit.
 */
class ResultTableContainer extends React.PureComponent {

    static propTypes = {
        // Props' type validation based on contents of this.props during render.
        href            : PropTypes.string.isRequired,
        fileFormats     : PropTypes.array,
        fileStats       : PropTypes.object,
        targetFiles     : PropTypes.instanceOf(Set)
    }

    static defaultProps = {
        'href'      : '/browse/',
        'debug'     : false,
        'navigate'  : navigate,
        'columnDefinitionOverrides' : {
            // TODO: Extend defaultColumnDefinitionMap perhaps? Get rid of (most of) browseTableConstantColumnDefinitions and move to schema (?).
            // Also TODO: Add "description" property to be used for tooltips when hover over column title/label (?) (to be set in schemas or overrides).
            'experiments_in_set.biosample.biosource_summary' : {
                'widthMap' : { 'lg' : 140, 'md' : 120, 'sm' : 120 }
            },
            'experiments_in_set.experiment_type' : {
                'title' : "Exp Type"
            },
            'number_of_experiments' : {
                'title' : "Exps",
                'render' : function(expSet, columnDefinition, props, width){
                    var number_of_experiments = parseInt(expSet.number_of_experiments);

                    if (isNaN(number_of_experiments) || !number_of_experiments){
                        number_of_experiments = (Array.isArray(expSet.experiments_in_set) && expSet.experiments_in_set.length) || null;
                    }
                    if (!number_of_experiments){
                        number_of_experiments = 0;
                    }


                    return <span key="val">{ number_of_experiments }</span>;
                }
            },
            'number_of_files' : {
                'title' : "Files",
                'render' : function(expSet, columnDefinition, props, width){

                    var number_of_files = parseInt(expSet.number_of_files); // Doesn't exist yet at time of writing

                    if (isNaN(number_of_files) || !number_of_files){
                        number_of_files = expFxn.fileCountFromExperimentSet(expSet, true, false);
                    }
                    if (!number_of_files){
                        number_of_files = 0;
                    }

                    return <span key="val">{ number_of_files }</span>;
                }
            },
            'experiments_in_set.experiment_categorizer.combined' : defaultColumnDefinitionMap['experiments_in_set.experiment_categorizer.combined'],
            'public_release' : defaultColumnDefinitionMap['public_release'],
            'date_created' : defaultColumnDefinitionMap['date_created']
        },
        'constantHiddenColumns' : ['experimentset_type']
    }

    constructor(props){
        super(props);
        this.colDefOverrides = this.colDefOverrides.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.handleClearFilters = this.handleClearFilters.bind(this);
        this.hiddenColumns = this.hiddenColumns.bind(this);
        this.filterSelectedFilesToOnesInExpSet = this.filterSelectedFilesToOnesInExpSet.bind(this);
        this.getColumnDefinitions = this.getColumnDefinitions.bind(this);
        this.browseExpSetDetailPane = this.browseExpSetDetailPane.bind(this);
        this.render = this.render.bind(this);
        this.forceUpdateOnSelf = this.forceUpdate.bind(this);

        // Primarily used here for caching some values re: PureComponents further down rendering tree.
        this.state = {
            'hiddenColumns' : this.hiddenColumns(),
            'columnDefinitions' : this.getColumnDefinitions(),
            'colDefOverrides' : this.colDefOverrides()
        };
    }

    componentWillReceiveProps(nextProps){
        var stateChange = {};
        if (nextProps.context !== this.props.context || this.props.constantHiddenColumns !== nextProps.constantHiddenColumns){
            stateChange.columnDefinitions = this.getColumnDefinitions(nextProps);
        }
        if (nextProps.constantHiddenColumns !== this.props.constantHiddenColumns || this.props.hiddenColumns !== nextProps.hiddenColumns){
            stateChange.hiddenColumns = this.hiddenColumns(nextProps);
        }
        if (nextProps.columnDefinitionOverrides !== this.props.columnDefinitionOverrides || !!(this.props.selectedFiles) !== !!(nextProps.selectedFiles) ){
            stateChange.colDefOverrides = this.colDefOverrides(nextProps);
        }
        if (_.keys(stateChange).length > 0){
            this.setState(stateChange);
        }
    }

    filterSelectedFilesToOnesInExpSet(allFilesForSet, selectedFiles = this.props.selectedFiles){
        var max = allFilesForSet.length;
        var selected = [];
        for (var i = 0; i < max; i++){
            if (typeof selectedFiles[allFilesForSet[i]] !== 'undefined'){
                selected.push(allFilesForSet[i]);
            }
        }
        return selected;
    }

    /**
     * Builds final form of column definitions to be rendered by table.
     *
     * @private
     * @param {Object} [props=this.props] Current or next props.
     * @returns {ColumnDefinition[]} Final column definitions.
     */
    getColumnDefinitions(props = this.props){
        return CustomColumnSelector.buildColumnDefinitions(
            browseTableConstantColumnDefinitions,
            props.context.columns || {},
            {},
            props.constantHiddenColumns
        );
    }

    isTermSelected(term, facet){
        return !!(Filters.getUnselectHrefIfSelectedFromResponseFilters(term, facet, this.props.context.filters));
    }

    colDefOverrides(props = this.props){
        if (!props.selectedFiles) return props.columnDefinitionOverrides || null;

        var _this = this;

        // Add Checkboxes
        return _.extend({}, props.columnDefinitionOverrides, {
            'display_title' : _.extend({}, defaultColumnDefinitionMap.display_title, {
                'widthMap' : { 'lg' : 210, 'md' : 210, 'sm' : 200 },
                'render' : (expSet, columnDefinition, paneProps, width) => {
                    var origTitleBlock = defaultColumnDefinitionMap.display_title.render(expSet, columnDefinition, paneProps, width);
                    var newChildren = origTitleBlock.props.children.slice(0);
                    var allFiles = expFxn.allFilesFromExperimentSet(expSet, true);
                    var allFileAccessionTriples = expFxn.filesToAccessionTriples(allFiles, true, true);

                    var allFilesKeyedByTriples = _.object(_.zip(allFileAccessionTriples, allFiles));
                    allFileAccessionTriples = allFileAccessionTriples.sort();

                    var selectedFilesForSet = _this.filterSelectedFilesToOnesInExpSet(allFileAccessionTriples); //getSelectedFileForSet(allFileIDs);
                    newChildren[2] = newChildren[1];
                    newChildren[2] = React.cloneElement(newChildren[2], { 'className' : newChildren[2].props.className + ' mono-text' });
                    var isAllFilesChecked = ExperimentSetCheckBox.isAllFilesChecked(selectedFilesForSet, allFileAccessionTriples);
                    newChildren[1] = (
                        <ExperimentSetCheckBox
                            key="checkbox"
                            checked={isAllFilesChecked}
                            indeterminate={ExperimentSetCheckBox.isIndeterminate(selectedFilesForSet, allFileAccessionTriples)}
                            disabled={ExperimentSetCheckBox.isDisabled(allFileAccessionTriples)}
                            onChange={(evt)=>{
                                if (!isAllFilesChecked){
                                    var fileTriplesToSelect = _.difference(allFileAccessionTriples, selectedFilesForSet);
                                    props.selectFile(fileTriplesToSelect.map(function(triple){
                                        var fileAccession = (allFileAccessionTriples[triple] || {}).accession || null;
                                        //var experiment = null;
                                        //if (fileAccession){
                                        //    experiment = expFxn.findExperimentInSetWithFileAccession(expSet.experiments_in_set, fileAccession);
                                        //}
                                        return [ // [file accessionTriple, meta]
                                            triple,
                                            allFilesKeyedByTriples[triple]
                                        ];
                                    }));
                                } else if (isAllFilesChecked) {
                                    props.unselectFile(allFileAccessionTriples);
                                }
                            }}
                        />
                    );
                    return React.cloneElement(origTitleBlock, { 'children' : newChildren });
                }
            })
        });
    }

    hiddenColumns(props = this.props){
        var cols = [];
        if (Array.isArray(props.constantHiddenColumns)){
            cols = cols.concat(props.constantHiddenColumns);
        }
        if (Array.isArray(props.hiddenColumns)){
            cols = cols.concat(props.hiddenColumns);
        }
        return _.uniq(cols);
    }

    handleClearFilters(evt){
        evt.preventDefault();
        evt.stopPropagation();
        this.props.navigate(navigate.getBrowseBaseHref(), { 'inPlace' : true, 'dontScrollToTop' : true });
    }

    browseExpSetDetailPane(result, rowNumber, containerWidth, toggleExpandCallback){
        return (
            <ExperimentSetDetailPane
                {..._.pick(this.props, 'selectedFiles', 'selectFile', 'unselectFile', 'windowWidth')}
                {...{ result, containerWidth, toggleExpandCallback }}
                href={this.props.href || this.props.searchBase} paddingWidth={47}
            />
        );
    }

    render() {
        var { context, href, searchBase, countExternalSets, session, browseBaseState, schemas,
            totalExpected, selectedFiles, sortBy, sortColumn, sortReverse, windowWidth } = this.props;

        return (
            <div className="row">
                { context.facets.length > 0 ?
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <ExternaDataExpSetsCount countExternalSets={countExternalSets} browseBaseState={browseBaseState} href={href} />
                        <FacetList {...{ session, browseBaseState, schemas, windowWidth }}
                            orientation="vertical" className="with-header-bg"
                            facets={context.facets} filters={context.filters}
                            isTermSelected={this.isTermSelected} onFilter={this.onFilter}
                            itemTypeForSchemas="ExperimentSetReplicate" href={href || searchBase}
                            showClearFiltersButton={_.keys(Filters.currentExpSetFilters() || {}).length > 0}
                            onClearFilters={this.handleClearFilters} />
                    </div>
                    :
                    null
                }
                <div className="expset-result-table-fix col-sm-7 col-md-8 col-lg-9">
                    <AboveTableControls {..._.pick(this.props, 'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn',
                            'context', 'href', 'currentAction',
                            'columns', 'selectedFiles', 'constantHiddenColumns', 'selectFile', 'unselectFile', 'resetSelectedFiles',
                            'selectedFilesUniqueCount', 'windowHeight', 'windowWidth'
                        )}
                        parentForceUpdate={this.forceUpdateOnSelf} columnDefinitions={this.state.columnDefinitions}
                        showSelectedFileCount
                    />
                    <SearchResultTable
                        {...{ href, totalExpected, sortBy, sortColumn, sortReverse, selectedFiles, windowWidth }}
                        registerWindowOnScrollHandler={this.props.registerWindowOnScrollHandler}
                        results={context['@graph']} columns={context.columns || {}}
                        renderDetailPane={this.browseExpSetDetailPane}
                        constantColumnDefinitions={browseTableConstantColumnDefinitions} hiddenColumns={this.state.hiddenColumns}
                        columnDefinitionOverrideMap={this.state.colDefOverrides} stickyHeaderTopOffset={-78} />
                </div>
            </div>
        );
    }

}


class ExternaDataExpSetsCount extends React.PureComponent {

    constructor(props){
        super(props);
        this.onBrowseStateToggle = this.onBrowseStateToggle.bind(this);
    }

    onBrowseStateToggle(e){
        e.preventDefault();
        e.stopPropagation();
        navigate.setBrowseBaseStateAndRefresh(this.props.browseBaseState === 'only_4dn' ? 'all' : 'only_4dn', this.props.href, this.props.context);
    }

    render(){
        var { countExternalSets, browseBaseState } = this.props;
        if (countExternalSets < 1) return <div className="above-results-table-row" />;
        return (
            <div className="above-results-table-row text-right">
                <small className="inline-block mt-18">
                    <span className="text-500">{ countExternalSets }</span> { browseBaseState === 'all' ? 'fewer' : 'more' } { "set" + (countExternalSets > 1 ? 's' : '') }{ browseBaseState === 'all' ? '' : ' available' } in <a href="#" onClick={this.onBrowseStateToggle}>{ browseBaseState === 'all' ? '4DN-only Data' : 'External Data' }</a>.
                </small>
            </div>
        );
    }

}




/**
 * View which renders the page located at `/browse/`.
 */
export default class BrowseView extends React.Component {

    /**
     * Calculates how many experiment sets are 'External' and do not have award.project===4DN from browse JSON result.
     *
     * @param {SearchResponse} context - Browse search result with at least 'facets'.
     * @returns {number} Count of external experiment sets.
     */
    static externalDataSetsCount(context){
        var projectFacetTerms = (
            Array.isArray(context.facets) ? _.uniq(_.flatten(_.pluck(_.filter(context.facets, { 'field' : 'award.project' }), 'terms')), 'key') : []
        );
        return _.reduce(projectFacetTerms, function(sum, projectTermObj){
            if (projectTermObj.key === '4DN') return sum; // continue.
            return sum + projectTermObj.doc_count;
        }, 0);
    }

    /**
     * Combines props.defaultHiddenColumns with list of facets/columns which have `"default_hidden" : true` in schema.
     *
     * @param {{ context: SearchResponse }} props - Current or next props of component with a 'context' field.
     * @returns {string[]}
     */
    static fullDefaultHiddenColumns(props){
        if (props.context && props.context.columns){
            return (props.defaultHiddenColumns || []).concat(_.map(
                _.filter(_.pairs(props.context.columns), function([facet, columnInfo]){ return columnInfo.default_hidden; }),
                function([facet, columnInfo]){ return facet; }
            ));
        } else {
            return props.defaultHiddenColumns || [];
        }
    }

    /**
     * Default prop values for BrowseView. Namely contains `defaultHiddenColumns`.
     *
     * @static
     * @public
     * @type {Object}
     * @property {string[]} defaultHiddenColumns - List of column fields which are hidden by default.
     */
    static defaultProps = {
        'defaultHiddenColumns' : ['lab.display_title', 'date_created', 'last_modified.date_modified', 'status', 'number_of_files']
    };

    /**
     * PropTypes for component.
     *
     * @static
     * @public
     * @type {Object}
     * @ignore
     */
    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'session' : PropTypes.bool,
        'schemas' : PropTypes.object,
        'href' : PropTypes.string.isRequired
    };

    /**
     * Creates an instance of BrowseView.
     *
     * @public
     * @constructor
     * @param {Object} props - Initial props.
     */
    constructor(props){
        super(props);

        /**
         * Internal state for root-level BrowseView component.
         * Contains list of default hidden columns, as calculated by merging `props.defaultHiddenColumns` with contents
         * of SearchResponse.columns which have `"default_hidden" : true`.
         *
         * @private
         * @type {Object}
         * @property {string[]} state.defaultHiddenColumns - List of column fields which are hidden by default, until user interaction.
         */
        this.state = {
            'defaultHiddenColumns' : BrowseView.fullDefaultHiddenColumns(props)
        };
    }

    /**
     * Rules for when to update/re-render this view, according to change in state or props.
     * Attempts to minimize re-renders because the BrowseView can become quite big especially after
     * load-as-you-scroll into a hundred or more results.
     *
     * @private
     * @member
     * @param {Object} nextProps - Next props, to be compared against this.props.
     * @param {Object} nextState - Next state, to be compared against this.state.
     */
    shouldComponentUpdate(nextProps, nextState){
        if (this.props.context !== nextProps.context) return true;
        if (this.props.session !== nextProps.session) return true;
        if (this.props.href !== nextProps.href) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        if (this.props.windowWidth !== nextProps.windowWidth) return true;
        return false; // We don't care about props.expIncomplete props (other views might), so we can skip re-render.
    }

    /**
     * Redirects to correct URI params if the current URI params are invalid.
     * Only matters if navigated to /browse/ page manually.
     *
     * @private
     * @returns {void}
     */
    componentDidMount(){
        var { href, context } = this.props;
        var hrefParts = url.parse(href, true);
        if (!navigate.isValidBrowseQuery(hrefParts.query)){
            this.redirectToCorrectBrowseView(hrefParts);
            return;
        }

        this.checkResyncChartData(hrefParts, context);
    }

    /**
     * Updates internal state if initial search response (`props.context`) or `props.defaultHiddenColumns` have changed.
     *
     * @private
     * @returns {void}
     */
    componentWillReceiveProps(nextProps){
        if (this.props.context !== nextProps.context || this.props.defaultHiddenColumns !== nextProps.defaultHiddenColumns){
            this.setState({ 'defaultHiddenColumns' : BrowseView.fullDefaultHiddenColumns(nextProps) });
        }
    }

    /**
     * Same functionality as componentDidMount if `props.href` has changed.
     *
     * @private
     * @returns {void}
     */
    componentDidUpdate(pastProps){
        var { context, href } = this.props;
        var hrefParts = url.parse(href, true);
        if (pastProps.href !== href){
            if (!navigate.isValidBrowseQuery(hrefParts.query)){
                this.redirectToCorrectBrowseView(hrefParts);
                return;
            }
        }

        this.checkResyncChartData(hrefParts, context);
    }

    /**
     * If we get different count in Browse result total, then refetch chart data.
     *
     * @private
     * @param {URLParts} hrefParts - Components of current URI.
     * @param {SearchResponse} context - Current search response.
     * @returns {void}
     */
    checkResyncChartData(hrefParts, context = this.props.context){
        setTimeout(()=>{
            if (context && context.total && ChartDataController.isInitialized() && navigate.isBaseBrowseQuery(hrefParts.query)){
                var cdcState = ChartDataController.getState();
                var cdcExpSetCount = cdcState.barplot_data_unfiltered && cdcState.barplot_data_unfiltered && cdcState.barplot_data_unfiltered.total && cdcState.barplot_data_unfiltered.total.experiment_sets;
                if (cdcExpSetCount && cdcExpSetCount !== context.total && !cdcState.fetching){
                    ChartDataController.sync();
                }
            }
        });
    }


    /**
     * Called by `componentDidMount` and/or `componentDidUpdate` to redirect to correct Browse page URI params, if needed.
     *
     * @private
     * @param {URLParts} [hrefParts=null] If not passed, is obtained by parsing `this.props.href`.
     * @returns {void}
     */
    redirectToCorrectBrowseView(hrefParts = null){
        if (!hrefParts) hrefParts = url.parse(this.props.href, true);

        var context = this.props.context,
            nextBrowseHref = navigate.getBrowseBaseHref(),
            expSetFilters = Filters.contextFiltersToExpSetFilters((context && context.filters) || null);

        // If no 4DN projects available in this query but there are External Items, redirect to external view instead.
        //var availableProjectsInResults = Array.isArray(context.facets) ? _.uniq(_.pluck(_.flatten(_.pluck(_.filter(context.facets, { 'field' : 'award.project' }), 'terms')), 'key')) : [];
        //if (this.props.browseBaseState === 'only_4dn' && availableProjectsInResults.indexOf('External') > -1 && availableProjectsInResults.indexOf('4DN') === -1){
        //    navigate.setBrowseBaseStateAndRefresh('all', this.props.href, context);
        //    return;
        //}

        if (_.keys(expSetFilters).length > 0){
            nextBrowseHref += navigate.determineSeparatorChar(nextBrowseHref) + Filters.expSetFiltersToURLQuery(expSetFilters);
        }
        if (typeof hrefParts.query.q === 'string'){
            nextBrowseHref += navigate.determineSeparatorChar(nextBrowseHref) + 'q=' + encodeURIComponent(hrefParts.query.q);
        }
        navigate(nextBrowseHref, { 'inPlace' : true, 'dontScrollToTop' : true, 'replace' : true });
    }

    /**
     * Fallback view for no results found.
     * If no 4DN projects available in this query but there are External Items, let user know.
     * And, show list of suggested actions.
     *
     * @private
     * @param {URLParts} hrefParts - Parsed props.href, including parsed query.
     * @param {number} countExternalSets - Count of ExpSets available in External Data, as determined via `BrowseView.externalDataSetsCount(context)`.
     * @returns {JSX.Element} Elements and content for fallback view, including some suggested actions.
     */
    renderNoResultsView(hrefParts, countExternalSets){
        var context = this.props.context,
            browseBaseHref = navigate.getBrowseBaseHref(),
            queryForSearchAllItems = _.extend( _.omit(hrefParts.query, ..._.keys(navigate.getBrowseBaseParams()) ), { 'type' : 'Item' } );

        return (
            <div className="error-page mt-4">
                <div className="clearfix">
                    <hr/>
                    { React.createElement(countExternalSets > 0 ? 'h4' : 'h3', { 'className' : "text-400 mb-05 mt-42" }, 'No results found for current filter selection.') }
                    { countExternalSets > 0 ?
                        <h3 className="text-500 mt-05 mb-05">
                            However, there { countExternalSets > 1 ? 'are ' + countExternalSets + ' Experiment Sets' : 'is one Experiment Set' } available in External Data.
                        </h3>
                    : null}
                    <h4 className="mt-2 mb-05 text-400">Suggestions:</h4>
                    <ul className="mb-45 mt-1">
                        { this.props.browseBaseState !== 'all' && countExternalSets > 0 ?
                            <li>
                                Keep current filters and <a href="#" onClick={(e)=>{
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate.setBrowseBaseStateAndRefresh('all', this.props.href, context);
                                }}>browse <strong>all Experiment Sets</strong></a>, including External data.
                            </li>
                        : null }
                        { hrefParts.path !== browseBaseHref ? <li>Unset filters and <a href={browseBaseHref}>browse <strong>all 4DN Experiment Sets</strong></a>.</li> : null }
                        <li><a href={'/search/?' + queryString.stringify(queryForSearchAllItems)}>Search <strong>all Items</strong></a> (advanced).</li>
                    </ul>
                    <hr/>
                </div>
            </div>
        );
    }

    /**
     * Renders out components for managing state and view of Browse table in the following order:
     * `SelectedFilesController` -> `CustomColumnController` -> `SortController` -> `ResultTableContainer`.
     *
     * @private
     * @returns {JSX.Element} View for Browse page.
     */
    render() {
        var { context, href, session, defaultHiddenColumns, browseBaseState, schemas } = this.props,
            results             = context['@graph'],
            hrefParts           = url.parse(href, true),
            countExternalSets   = BrowseView.externalDataSetsCount(context);

        // No results found!
        if(context.total === 0 && context.notification) return this.renderNoResultsView(hrefParts, countExternalSets);

        // Browse is only for experiment sets w. award.project=4DN and experimentset_type=replicates
        if (!navigate.isValidBrowseQuery(hrefParts.query)){
            return(
                <div className="error-page text-center">
                    <h3 className="text-300">
                        Redirecting
                    </h3>
                    <h4 className="text-400">
                        Please wait...
                    </h4>
                </div>
            );
        }

        return (
            <div className="browse-page-container search-page-container" id="browsePageContainer">
                {/*
                <ControlsAndResults
                    {...this.props}
                    //fileFormats={fileFormats}
                    href={this.props.href}
                    schemas={this.props.schemas}
                />
                */}
                <SelectedFilesController href={href}>
                    <CustomColumnController defaultHiddenColumns={this.state.defaultHiddenColumns}>
                        <SortController href={href} context={context} navigate={this.props.navigate || navigate}>
                            <ResultTableContainer {...{ browseBaseState, session, schemas, countExternalSets }}
                                {..._.pick(this.props, 'windowHeight', 'windowWidth', 'registerWindowOnScrollHandler')}
                                totalExpected={context && context.total} />
                        </SortController>
                    </CustomColumnController>
                </SelectedFilesController>
            </div>
        );
    }

}

globals.content_views.register(BrowseView, 'Browse');
globals.content_views.register(BrowseView, 'Browse', 'selection'); // Not yet fully supported but might be eventually.
