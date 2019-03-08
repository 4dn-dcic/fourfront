'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { MenuItem, Modal, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } from 'react-bootstrap';
import { allFilesFromExperimentSet, filesToAccessionTriples } from './../util/experiments-transforms';
import { Filters, navigate, typedefs, JWT } from './../util';
import { ChartDataController } from './../viz/chart-data-controller';
import {
    SearchResultTable, defaultColumnBlockRenderFxn, defaultColumnExtensionMap, columnsToColumnDefinitions,
    SortController, SelectedFilesController, CustomColumnController, CustomColumnSelector, AboveTableControls, ExperimentSetDetailPane,
    FacetList, onFilterHandlerMixin, defaultHiddenColumnMapFromColumns
} from './components';


var { SearchResponse, Item, ColumnDefinition, URLParts } = typedefs;



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
        'href'                      : PropTypes.string.isRequired,
        'columnExtensionMap' : PropTypes.object,
        'context'                   : PropTypes.shape({
            'columns' : PropTypes.objectOf(PropTypes.object).isRequired
        }),
        'selectFile'                : PropTypes.func,
        'unselectFile'              : PropTypes.func,
        'selectedFiles'             : PropTypes.objectOf(PropTypes.string)
    };

    static defaultProps = {
        'href'      : '/browse/',
        'debug'     : false,
        'navigate'  : navigate,
        'columnExtensionMap' : defaultColumnExtensionMap
    };

    constructor(props){
        super(props);
        this.colDefOverrides = this.colDefOverrides.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.handleClearFilters = this.handleClearFilters.bind(this);
        this.filterSelectedFilesToOnesInExpSet = this.filterSelectedFilesToOnesInExpSet.bind(this);
        this.getColumnDefinitions = this.getColumnDefinitions.bind(this);
        this.browseExpSetDetailPane = this.browseExpSetDetailPane.bind(this);
        this.forceUpdateOnSelf = this.forceUpdateOnSelf.bind(this);

        // Primarily used here for caching some values re: PureComponents further down rendering tree.
        var colDefOverrides   = this.colDefOverrides(props),
            columnDefinitions = this.getColumnDefinitions(props, colDefOverrides);

        this.state = { colDefOverrides, columnDefinitions };

        this.searchResultTableRef = React.createRef();
    }

    forceUpdateOnSelf(){
        var searchResultTable   = this.searchResultTableRef.current,
            dimContainer        = searchResultTable && searchResultTable.getDimensionContainer();

        return dimContainer && dimContainer.resetWidths();
    }

    /**
     * @todo Refactor into memoized functions.
     */
    UNSAFE_componentWillReceiveProps(nextProps){
        var stateChange = {};
        if (nextProps.columnExtensionMap !== this.props.columnExtensionMap || !!(this.props.selectedFiles) !== !!(nextProps.selectedFiles) ){
            stateChange.colDefOverrides = this.colDefOverrides(nextProps);
        }
        if (nextProps.context !== this.props.context){
            stateChange.columnDefinitions = this.getColumnDefinitions(nextProps, stateChange.colDefOverrides || this.state.colDefOverrides);
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
    getColumnDefinitions(props = this.props, colDefOverrides = this.state.colDefOverrides){
        return columnsToColumnDefinitions(props.context.columns, colDefOverrides);
    }

    isTermSelected(term, facet){
        return Filters.determineIfTermFacetSelected(term, facet, this.props);
    }

    /**
     * Extends or creates `props.columnExtensionMap.display_title` with a larger width as well as
     * a render method which will render out a checkbox for selecting files of an ExperimentSet,
     * if `props.selectedFiles` are passed in as well.
     * If no selected files data structure is being fed through props, this function returns `props.columnExtensionMap`.
     *
     * Return value gets cached to state.colDefOverrides.
     *
     * @param {{ selectedFiles?: Object, columnExtensionMap : ColumnDefinition }} props - Current component props.
     * @returns {Object.<Object>} Column definition override map with checkbox handling in display_title column.
     */
    colDefOverrides(props = this.props){
        if (typeof props.selectedFiles === 'undefined'){
            // We don't need to add checkbox(es) for file selection.
            return props.columnExtensionMap || null;
        }

        var _this = this;

        // Add Checkboxes
        return _.extend({}, props.columnExtensionMap, {
            'display_title' : _.extend({}, defaultColumnExtensionMap.display_title, {
                'widthMap' : { 'lg' : 210, 'md' : 210, 'sm' : 200 },
                'render' : (expSet, columnDefinition, paneProps, width) => {
                    var origTitleBlock          = defaultColumnExtensionMap.display_title.render(expSet, columnDefinition, paneProps, width),
                        newChildren             = origTitleBlock.props.children.slice(0),
                        allFiles                = allFilesFromExperimentSet(expSet, true),
                        allFileAccessionTriples = filesToAccessionTriples(allFiles, true, true),
                        allFilesKeyedByTriples  = _.object(_.zip(allFileAccessionTriples, allFiles));

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
        var { context, href, searchBase, countExternalSets, session, browseBaseState, schemas, windowHeight,
            totalExpected, selectedFiles, sortBy, sortColumn, sortReverse, windowWidth, isFullscreen, facets } = this.props,
            showClearFiltersButton  = _.keys(Filters.currentExpSetFilters() || {}).length > 0;

        return (
            <div className="row">
                { facets && facets.length > 0 ?
                    <div className={"col-sm-5 col-md-4 col-lg-" + (isFullscreen ? '2' : '3')}>
                        <ExternaDataExpSetsCount {...{ countExternalSets, browseBaseState, href }} />
                        <FacetList {...{ session, browseBaseState, schemas, windowWidth, windowHeight, facets, showClearFiltersButton }}
                            orientation="vertical" className="with-header-bg" filters={context.filters}
                            isTermSelected={this.isTermSelected} onFilter={this.onFilter}
                            itemTypeForSchemas="ExperimentSetReplicate" href={href || searchBase}
                            onClearFilters={this.handleClearFilters} />
                    </div>
                    :
                    null
                }
                <div className={"expset-result-table-fix col-sm-7 col-md-8 col-lg-" + (isFullscreen ? '10' : '9')}>
                    <AboveTableControls {..._.pick(this.props, 'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn',
                            'context', 'href', 'currentAction',
                            'columns', 'selectedFiles', 'selectFile', 'unselectFile', 'resetSelectedFiles',
                            'selectedFilesUniqueCount', 'windowHeight', 'windowWidth', 'toggleFullScreen', 'isFullscreen'
                        )}
                        parentForceUpdate={this.forceUpdateOnSelf} columnDefinitions={this.state.columnDefinitions}
                        showSelectedFileCount />
                    <SearchResultTable {..._.pick(this.props, 'hiddenColumns', 'registerWindowOnScrollHandler')}
                        {...{ href, totalExpected, sortBy, sortColumn, sortReverse, selectedFiles, windowWidth }}
                        ref={this.searchResultTableRef}
                        results={context['@graph']}
                        columnDefinitions={this.state.columnDefinitions}
                        renderDetailPane={this.browseExpSetDetailPane}
                        stickyHeaderTopOffset={-78} />
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
                <span className="inline-block mt-1">
                    <span className="text-600 text-large">{ countExternalSets }</span> { browseBaseState === 'all' ? 'fewer' : 'more' } { "set" + (countExternalSets > 1 ? 's' : '') }{ browseBaseState === 'all' ? '' : ' available' } in <a href="#" onClick={this.onBrowseStateToggle}>{ browseBaseState === 'all' ? '4DN-only Data' : 'External Data' }</a>.
                </span>
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
        this.filterFacet = this.filterFacet.bind(this);
        this.transformedFacets = this.transformedFacets.bind(this);

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
            'defaultHiddenColumns' : defaultHiddenColumnMapFromColumns(props.context.columns)
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
        if (this.props.isFullscreen !== nextProps.isFullscreen) return true;
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

    // /**
    //  * This is left here explicitly to show absence of function, as compared to SearchView.
    //  *
    //  * SearchView updates/resets hidden columns on CustomColumnController (React.PureComponent) by
    //  * updating state.defaultHiddenColumns if the type has changed. For BrowseView, we have only one
    //  * possible type (ExperimentSetReplicate), so we may skip this step/check for slight performance gain.
    //  *
    //  * @private
    //  * @returns {void}
    //  */
    // componentWillReceiveProps(nextProps){
    //     if (SearchControllersContainer.haveContextColumnsChanged(this.props.context, nextProps.context)){
    //         this.setState({
    //             'defaultHiddenColumns' : defaultHiddenColumnMapFromColumns(nextProps.context.columns)
    //         });
    //     }
    // }

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
        setTimeout(function(){
            if (context && context.total && ChartDataController.isInitialized() && navigate.isBaseBrowseQuery(hrefParts.query)){
                var cdcState = ChartDataController.getState(),
                    cdcExpSetCount = (cdcState.barplot_data_unfiltered && cdcState.barplot_data_unfiltered.total && cdcState.barplot_data_unfiltered.total.experiment_sets);

                if (cdcExpSetCount && cdcExpSetCount !== context.total){
                    if (cdcState.isLoadingChartData){
                        console.info('Already loading chart data, canceling.');
                    } else {
                        ChartDataController.sync();
                    }
                }
            }
        }, 10);
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

        // Function to reuse the search function but with External Data flag activated.
        var browseExternalData = (e)=>{
            e.preventDefault();
            e.stopPropagation();
            navigate.setBrowseBaseStateAndRefresh('all', this.props.href, context);
        };

        // If there are no External Sets found:
        // - Tell the user there is no data.

        // If there are External Sets that match the filter:
        // - Tell the user they exist, and how many.
        // - Instruct the user to click on the button to search for Experiment Sets in External Data.
        return (
            <div className="error-page mt-4">
                <div className="clearfix">
                    <hr/>
                    {
                        countExternalSets > 0 ?
                            <h4 className="text-400 mb-18 mt-05">Only External Data results were found.</h4>
                            :
                            <h3 className="text-400 mb-05 mt-05">No results found.</h3>
                    }
                    { this.props.browseBaseState !== 'all' && countExternalSets > 0 ?
                        <div className="mb-10 mt-1">
                            <Button bsSize="large" bsStyle="primary" className="text-400 inline-block clickable in-stacked-table-button" data-tip="Keep current filters and browse External data" onClick={browseExternalData}>
                                Browse <span className="text-600">{ countExternalSets }</span> External Data { countExternalSets > 1 ? 'sets ' : 'set ' }
                            </Button>
                        </div>
                    : null }
                    <hr/>
                </div>
            </div>
        );
    }

    /**
     * Function which is passed into a `.filter()` call to
     * filter context.facets down in response to frontend-state.
     *
     * Currently is meant to filter out Award and Project facets if
     * we're _not_ showing any external data, as determined via the
     * prop `browseBaseState` (string).
     *
     * @param {{ field: string }} facet - Object representing a facet.
     * @param {number} facetIdx - Index of current facet being iterated on.
     * @param {Object[]} all - All facets.
     * @returns {boolean} Whether to keep or discard facet.
     */
    filterFacet(facet, facetIdx, all){
        if (facet.hide_from_view) return false;

        var { browseBaseState, session } = this.props;

        // Exclude facets which are part of browse base state filters.
        if (browseBaseState){
            var browseBaseParams = navigate.getBrowseBaseParams(browseBaseState);
            if (typeof browseBaseParams[facet.field] !== 'undefined') return false;
        }

        if (facet.field.substring(0, 6) === 'audit.'){
            if (session && JWT.isLoggedInAsAdmin()) return true;
            return false; // Exclude audit facets temporarily, if not logged in as admin.
        }

        return true;
    }

    transformedFacets(){
        return _.filter(this.props.context.facets || [], this.filterFacet);
    }

    /**
     * Renders out components for managing state and view of Browse table in the following order:
     * `SelectedFilesController` -> `CustomColumnController` -> `SortController` -> `ResultTableContainer`.
     *
     * @private
     * @returns {JSX.Element} View for Browse page.
     */
    render() {
        var { context, href, session, browseBaseState, schemas } = this.props,
            results             = context['@graph'],
            hrefParts           = url.parse(href, true),
            countExternalSets   = BrowseView.externalDataSetsCount(context),
            facets              = this.transformedFacets();

        // No results found!
        if (context.total === 0 && context.notification){
            return this.renderNoResultsView(hrefParts, countExternalSets);
        }

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
            <div className="container" id="content">
                <div className="browse-page-container search-page-container" id="browsePageContainer">
                    <SelectedFilesController href={href}>
                        <CustomColumnController defaultHiddenColumns={this.state.defaultHiddenColumns}>
                            <SortController href={href} context={context} navigate={this.props.navigate || navigate}>
                                <ResultTableContainer {...{ browseBaseState, session, schemas, countExternalSets, facets }}
                                    {..._.pick(this.props, 'windowHeight', 'windowWidth', 'registerWindowOnScrollHandler', 'toggleFullScreen', 'isFullscreen')}
                                    totalExpected={context && context.total} />
                            </SortController>
                        </CustomColumnController>
                    </SelectedFilesController>
                </div>
            </div>
        );
    }

}
