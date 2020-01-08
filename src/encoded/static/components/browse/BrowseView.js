'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';

import { IndeterminateCheckbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/IndeterminateCheckbox';
import { searchFilters, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ColumnCombiner } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';
import { CustomColumnController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/CustomColumnController';
import { SearchResultTable } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SearchResultTable';
import { FacetList } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/FacetList';
import { SortController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/SortController';
import { WindowNavigationController } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/WindowNavigationController';

// We use own extended navigate fxn (not from shared repo) b.c. need the extra project-specific browse-related functions
// We could probably also create different 'browseState' module for it, however.
import { navigate, typedefs, Schemas } from './../util';

import { store } from './../../store';
import { memoizedUrlParse } from './../globals';
import { allFilesFromExperimentSet, filesToAccessionTriples } from './../util/experiments-transforms';
import { ChartDataController } from './../viz/chart-data-controller';
import { columnExtensionMap as colExtensionMap4DN } from './columnExtensionMap';
import { SelectedFilesController } from './components/SelectedFilesController';
import { ExperimentSetDetailPane } from './components/ExperimentSetDetailPane';
import { AboveBrowseViewTableControls } from './components/above-table-controls/AboveBrowseViewTableControls';




//import { BROWSE } from './../testdata/browse/4DNESYUY-test';
//import { BROWSE } from './../testdata/browse/checkboxes';

// eslint-disable-next-line no-unused-vars
const { SearchResponse, Item, ColumnDefinition, URLParts, File } = typedefs;


/**
 * Component for checkbox that is shown in display_title column (first), along with the expand/collapse toggle.
 * Handles/sets an 'intermediate' checked state if partial selection of files comprising the ExperimentSet.
 *
 * Component will extract files from ExperimentSet and compare to `props.selectedFiles` to see if all are selected
 * or not.
 */
class ExperimentSetCheckBox extends React.PureComponent {

    static filterSelectedFilesToOnesInExpSet(allFileTriplesForSet, selectedFiles){
        return _.filter(allFileTriplesForSet, function(accessionTriple){
            return typeof selectedFiles[accessionTriple] !== 'undefined';
        });
    }

    static expSetFilesToObjectKeyedByAccessionTriples(expSet){
        const allFiles = allFilesFromExperimentSet(expSet, true);
        const allFileAccessionTriples = filesToAccessionTriples(allFiles, true, true);
        return _.object(_.zip(allFileAccessionTriples, allFiles));
    }

    static selectedFilesFromSet(allFilesKeyedByTriplesForSet, selectedFiles){
        return ExperimentSetCheckBox.filterSelectedFilesToOnesInExpSet(
            _.keys(allFilesKeyedByTriplesForSet),
            selectedFiles
        );
    }

    static allFilesLength(allFilesKeyedByTriplesForSet){
        return _.keys(allFilesKeyedByTriplesForSet).length;
    }

    constructor(props){
        super(props);
        this.onChange = this.onChange.bind(this);
        this.memoized = {
            expSetFilesToObjectKeyedByAccessionTriples: memoize(ExperimentSetCheckBox.expSetFilesToObjectKeyedByAccessionTriples),
            selectedFilesFromSet: memoize(ExperimentSetCheckBox.selectedFilesFromSet),
            allFilesLength: memoize(ExperimentSetCheckBox.allFilesLength)
        };
    }

    onChange(e){
        const { expSet, selectedFiles, selectFile, unselectFile } = this.props;
        const allFilesKeyedByTriples = this.memoized.expSetFilesToObjectKeyedByAccessionTriples(expSet);
        const allFileAccessionTriples = _.keys(allFilesKeyedByTriples);
        const allFilesLen = this.memoized.allFilesLength(allFilesKeyedByTriples);
        const selectedFilesFromSet = this.memoized.selectedFilesFromSet(allFilesKeyedByTriples, selectedFiles);
        const selectedFilesFromSetLen = selectedFilesFromSet.length;
        const checked = allFilesLen === selectedFilesFromSetLen;

        if (checked) { // If all files selected, unselect all
            unselectFile(allFileAccessionTriples);
        } else { // If none or some files selected, select all
            const fileTriplesToSelect = _.difference(allFileAccessionTriples, selectedFilesFromSet);
            const triplePlusFileObjs = _.map(fileTriplesToSelect, function(triple){
                return [ triple, allFilesKeyedByTriples[triple] ];
            });
            selectFile(triplePlusFileObjs);
        }
    }

    render(){
        const { expSet, selectedFiles } = this.props;

        const allFilesKeyedByTriples = this.memoized.expSetFilesToObjectKeyedByAccessionTriples(expSet);
        const allFilesLen = this.memoized.allFilesLength(allFilesKeyedByTriples);
        const selectedFilesFromSet = this.memoized.selectedFilesFromSet(allFilesKeyedByTriples, selectedFiles);
        const selectedFilesFromSetLen = selectedFilesFromSet.length;

        const disabled = allFilesLen === 0;
        const checked = !disabled && allFilesLen === selectedFilesFromSetLen;
        const indeterminate = !disabled && !checked && selectedFilesFromSetLen > 0;

        return <IndeterminateCheckbox {...{ checked, disabled, indeterminate }} onChange={this.onChange} className="expset-checkbox" />;
    }
}






class ControlsAndResults extends React.PureComponent {

    /**
     * Different than the functionality in search-portal-components / SearchView.
     * Accounts for browseBaseState.
     */
    static isClearFiltersBtnVisible(context, browseBaseState){
        const currExpSetFilters = searchFilters.contextFiltersToExpSetFilters(
            context && context.filters,
            navigate.getBrowseBaseParams(browseBaseState)
        );
        return _.keys(currExpSetFilters || {}).length > 0;
    }

    static defaultProps = {
        'href'      : '/browse/',
        'debug'     : false
    };

    constructor(props){
        super(props);
        this.onClearFiltersClick = this.onClearFiltersClick.bind(this);
        this.browseExpSetDetailPane = this.browseExpSetDetailPane.bind(this);
        this.forceUpdateOnSelf = this.forceUpdateOnSelf.bind(this);
        this.updateDetailPaneFileSectionStateCache = this.updateDetailPaneFileSectionStateCache.bind(this);

        this.searchResultTableRef = React.createRef();

        this.detailPaneFileSectionStateCache = {};

        this.memoized = {
            isClearFiltersBtnVisible: memoize(ControlsAndResults.isClearFiltersBtnVisible)
        };
    }

    forceUpdateOnSelf(){
        const searchResultTable = this.searchResultTableRef.current;
        const dimsContainer = searchResultTable && searchResultTable.getDimensionContainer();
        return dimsContainer && dimsContainer.resetWidths();
    }

    onClearFiltersClick(evt, callback = null){
        const { onClearFilters } = this.props;
        evt.preventDefault();
        evt.stopPropagation();
        onClearFilters(callback);
    }

    updateDetailPaneFileSectionStateCache(resultID, resultPaneState){
        // Purposely avoid changing reference to avoid re-renders/updates (except when new components initialize)
        if (resultPaneState === null){
            delete this.detailPaneFileSectionStateCache[resultID];
        } else {
            this.detailPaneFileSectionStateCache[resultID] = resultPaneState;
        }
    }

    browseExpSetDetailPane(result, rowNumber, containerWidth, propsFromTable){
        return (
            <ExperimentSetDetailPane
                {..._.pick(this.props, 'selectedFiles', 'selectFile', 'unselectFile', 'windowWidth', 'href')}
                {...{ ...propsFromTable, result, containerWidth }} paddingWidth={47}
                initialStateCache={this.detailPaneFileSectionStateCache} updateFileSectionStateCache={this.updateDetailPaneFileSectionStateCache} />
        );
    }

    render() {
        const {

            // From Redux store or App.js:
            context, schemas, currentAction, windowWidth, windowHeight, registerWindowOnScrollHandler, session,

            // 4DN-Specific from Redux Store or App.js:
            browseBaseState, isFullscreen, toggleFullScreen,

            // From BrowseView higher-order-component (extends facets, removes type facet, etc)
            facets, topLeftChildren, countExternalSets,

            // From WindowNavigationController (or similar) (possibly from Redux store re: href)
            href, onFilter, getTermStatus,

            // From CustomColumnController:
            hiddenColumns, addHiddenColumn, removeHiddenColumn,
            // From ColumnCombiner:
            columnDefinitions,
            // From SortController:
            sortBy, sortColumn, sortReverse,

            // From SelectedFilesController (NOT SelectedItemsController - which is for currentAction=selection|multiselect)
            selectedFiles, selectedFilesUniqueCount, selectFile, unselectFile, resetSelectedFiles

        } = this.props;
        const { filters, '@graph': results } = context; // Initial results; cloned, saved to SearchResultTable state, and appended to upon load-as-scroll.

        const showClearFiltersButton = this.memoized.isClearFiltersBtnVisible(context, browseBaseState);

        const facetListProps = {
            session, schemas, windowWidth, windowHeight, facets, showClearFiltersButton,
            filters, getTermStatus, onFilter, href
        };

        const aboveTableControlsProps = {
            context, href, currentAction, windowHeight, windowWidth, toggleFullScreen, isFullscreen,
            columnDefinitions, hiddenColumns, addHiddenColumn, removeHiddenColumn,
            selectedFiles, selectFile, unselectFile, resetSelectedFiles, selectedFilesUniqueCount
        };

        const tableProps = {
            results, href, context, sortBy, sortColumn, sortReverse, windowWidth, columnDefinitions,
            selectedFiles, registerWindowOnScrollHandler, hiddenColumns,
        };

        return (
            <div className="row">
                { facets && facets.length > 0 ?
                    <div className={"col-md-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3')}>
                        <ExternaDataExpSetsCount {...{ countExternalSets, browseBaseState, href }} />
                        <FacetList {...facetListProps} className="with-header-bg" itemTypeForSchemas="ExperimentSetReplicate"
                            termTransformFxn={Schemas.Term.toName} onClearFilters={this.onClearFiltersClick} separateSingleTermFacets />
                    </div>
                    : null }
                <div className={"expset-result-table-fix col-md-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9')}>
                    <AboveBrowseViewTableControls {...aboveTableControlsProps} parentForceUpdate={this.forceUpdateOnSelf} showSelectedFileCount />
                    <SearchResultTable {...tableProps} ref={this.searchResultTableRef} termTransformFxn={Schemas.Term.toName} renderDetailPane={this.browseExpSetDetailPane} />
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
        const { browseBaseState, href, context } = this.props;
        e.preventDefault();
        e.stopPropagation();
        navigate.setBrowseBaseStateAndRefresh(browseBaseState === 'only_4dn' ? 'all' : 'only_4dn', href, context);
    }

    render(){
        const { countExternalSets, browseBaseState } = this.props;
        if (countExternalSets < 1){
            return <div className="above-results-table-row" />;
        }
        const midString = (
            (browseBaseState === 'all' ? ' fewer' : ' more') + " set" + (countExternalSets > 1 ? 's' : '') +
            (browseBaseState === 'all' ? '' : ' available') + " in "
        );
        return (
            <div className="above-results-table-row text-right text-ellipsis-container">
                <span className="inline-block mt-08">
                    <span className="text-600 text-large">{ countExternalSets }</span>
                    { midString }
                    <a href="#" onClick={this.onBrowseStateToggle}>{ browseBaseState === 'all' ? '4DN-only Data' : 'External Data' }</a>.
                </span>
            </div>
        );
    }

}




/** View which renders the page located at `/browse/` */
export default class BrowseView extends React.PureComponent {

    /**
     * Calculates how many experiment sets are 'External' and do not have award.project===4DN from browse JSON result.
     *
     * @param {SearchResponse} context - Browse search result with at least 'facets'.
     * @returns {number} Count of external experiment sets.
     */
    static externalDataSetsCount = memoize(function(context){
        var projectFacetTerms = (
            Array.isArray(context.facets) ? _.uniq(_.flatten(_.pluck(_.filter(context.facets, { 'field' : 'award.project' }), 'terms')), 'key') : []
        );
        return _.reduce(projectFacetTerms, function(sum, projectTermObj){
            if (projectTermObj.key === '4DN') return sum; // continue.
            return sum + projectTermObj.doc_count;
        }, 0);
    });

    /**
     * Function which is passed into a `.filter()` call to
     * filter context.facets down in response to frontend-state.
     *
     * Currently is meant to filter out Award and Project facets if
     * we're _not_ showing any external data, as determined via the
     * prop `browseBaseState` (string).
     *
     * @param {{ field: string }} facet - Object representing a facet.
     * @returns {boolean} Whether to keep or discard facet.
     */
    static filterFacet(facet, browseBaseState, session){
        if (facet.hide_from_view) return false;

        // Exclude facets which are part of browse base state filters.
        if (browseBaseState){
            const browseBaseParams = navigate.getBrowseBaseParams(browseBaseState);
            if (typeof browseBaseParams[facet.field] !== 'undefined') return false;
        }

        return true;
    }

    /** The static func is memoized since assumed to only be 1 BrowseView ever per page/view. */
    static transformedFacets = memoize(function(context, browseBaseState, session){
        return _.filter(
            context.facets || [],
            function(facet, index, all){
                return BrowseView.filterFacet(facet, browseBaseState, session);
            }
        );
    });


    /**
     * If different count in Browse result total, refetch chart data.
     *
     * @private
     * @param {URLParts} hrefParts - Components of current URI.
     * @param {SearchResponse} context - Current search response.
     * @returns {void}
     */
    static checkResyncChartData(hrefParts, context){
        setTimeout(function(){
            if (context && context.total && ChartDataController.isInitialized() && navigate.isBaseBrowseQuery(hrefParts.query)){
                const cdcState = ChartDataController.getState();
                const cdcExpSetCount = (cdcState.barplot_data_unfiltered && cdcState.barplot_data_unfiltered.total && cdcState.barplot_data_unfiltered.total.experiment_sets);

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
        'href' : PropTypes.string.isRequired,
        'windowWidth' : PropTypes.number,
        'isFullscreen' : PropTypes.bool,
        'browseBaseState' : PropTypes.string,
        'navigate' : PropTypes.func
    };

    /**
     * Redirects to correct URI params if the current URI params are invalid.
     * Only matters if navigated to /browse/ page manually.
     *
     * @private
     * @returns {void}
     */
    componentDidMount(){
        const { href, context } = this.props;
        const hrefParts = memoizedUrlParse(href);
        const { query = {} } = hrefParts;

        if (query['award.project'] !== '4DN'){
            store.dispatch({
                'type' : {
                    'browseBaseState' : 'all'
                }
            });
        }

        BrowseView.checkResyncChartData(hrefParts, context);
    }

    /**
     * Same functionality as componentDidMount if `props.href` has changed.
     *
     * @private
     * @returns {void}
     */
    componentDidUpdate(pastProps){
        const { context, href } = this.props;
        const hrefParts = memoizedUrlParse(href);

        BrowseView.checkResyncChartData(hrefParts, context);
    }

    /**
     * Renders out components for managing state and view of Browse table in the following order:
     * `SelectedFilesController` -> `CustomColumnController` -> `SortController` -> `ControlsAndResults`.
     *
     * @private
     * @returns {JSX.Element} View for Browse page.
     */
    render() {
        const { context, href, session, browseBaseState } = this.props;
        const facets = BrowseView.transformedFacets(context, browseBaseState, session);

        return (
            <div className="browse-page-container search-page-container container" id="content">
                <SelectedFilesController href={href}>
                    <BrowseTableWithSelectedFilesCheckboxes {...this.props} facets={facets} />
                </SelectedFilesController>
            </div>
        );
    }

}

/**
 * Fallback view for no results found.
 * If no 4DN projects available in this query but there are External Items, let user know.
 * And, show list of suggested actions.
 */
const NoResultsView = React.memo(function NoResultsView({ context, href, browseBaseState, countExternalSets }){

    /** Function to reuse the search function but with External Data flag activated. */
    const browseExternalData = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        navigate.setBrowseBaseStateAndRefresh('all', href, context);
    };

    // If there are no External Sets found:
    // - Tell the user there is no data.

    // If there are External Sets that match the filter:
    // - Tell the user they exist, and how many.
    // - Instruct the user to click on the button to search for Experiment Sets in External Data.
    return (
        <div className="browse-page-container search-page-container container" id="content">
            <div className="error-page mt-4">
                <div className="clearfix">
                    <hr/>
                    {
                        countExternalSets > 0 ?
                            <h4 className="text-400 mb-18 mt-05">Only External Data results were found.</h4>
                            :
                            <h3 className="text-400 mb-05 mt-05">No results found.</h3>
                    }
                    { browseBaseState !== 'all' && countExternalSets > 0 ?
                        <div className="mb-10 mt-1">
                            <button type="button" className="btn btn-primary text-400 inline-block clickable in-stacked-table-button"
                                onClick={browseExternalData} data-tip="Keep current filters and browse External data">
                                Browse <span className="text-600">{ countExternalSets }</span> External Data { countExternalSets > 1 ? 'sets ' : 'set ' }
                            </button>
                        </div>
                        : null }
                    <hr/>
                </div>
            </div>
        </div>
    );
});


function BrowseTableWithSelectedFilesCheckboxes(props){
    const {

        // Common high-level props from Redux, or App.js, or App.js > BodyElement:
        context, href, browseBaseState, schemas, navigate: propNavigate,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        toggleFullScreen, isFullscreen, session,

        // Props from BrowseView:
        facets,

        // Props from SelectedFilesController (separate from SPC SearchView SelectedItemsController):
        selectedFiles, selectFile, unselectFile, resetSelectedFiles,

        // Default prop / hardcoded (may become customizable later)
        columnExtensionMap

    } = props;
    const { total = 0, notification = null } = context;

    const countExternalSets = BrowseView.externalDataSetsCount(context);

    /**
     * Extends or creates `columnExtensionMap.display_title` with a larger width as well as
     * a render method which will render out a checkbox for selecting files of an ExperimentSet,
     * if `selectedFiles` are passed in as well.
     * If no selected files data structure is being fed through props, this function returns `columnExtensionMap`.
     */
    const columnExtensionMapWithSelectedFilesCheckboxes = useMemo(function(){

        if (typeof selectedFiles === 'undefined'){
            // We don't need to add checkbox(es) for file selection.
            return columnExtensionMap;
        }

        // Add Checkboxes
        return _.extend({}, columnExtensionMap, {
            // We extend the display_title of global constant colExtensionMap4DN, not the columnExtensionMap,
            // incase the prop version's render fxn is different than what we expect.
            'display_title' : _.extend({}, colExtensionMap4DN.display_title, {
                'widthMap' : { 'lg' : 210, 'md' : 210, 'sm' : 200 },
                'render' : (expSet, columnDefinition, paneProps, width) => {
                    const origTitleBlock = colExtensionMap4DN.display_title.render(expSet, columnDefinition, paneProps, width);
                    const newChildren = origTitleBlock.props.children.slice(0);

                    newChildren[2] = newChildren[1];
                    newChildren[2] = React.cloneElement(newChildren[2], { 'className' : newChildren[2].props.className + ' mono-text' });
                    newChildren[1] = <ExperimentSetCheckBox key="checkbox" {...{ expSet, selectedFiles, selectFile, unselectFile }} />;
                    return React.cloneElement(origTitleBlock, { 'children' : newChildren });
                }
            })
        });

    }, [ columnExtensionMap, selectedFiles, selectFile, unselectFile ]);

    if (total === 0 && notification) {
        return <NoResultsView {...{ context, href, browseBaseState, countExternalSets }} />;
    }

    const bodyViewProps = {
        browseBaseState, session, schemas, countExternalSets, facets,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        toggleFullScreen, isFullscreen,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles,
        totalExpected: total
    };

    // All these controllers pass props down to their children.
    // So we don't need to be repetitive here; i.e. may assume 'context' is available
    // in each controller that's child of <WindowNavigationController {...{ context, href }}>.
    // As well as in ControlsAndResults.

    return (
        <WindowNavigationController {...{ href, context }} navigate={propNavigate}>
            <ColumnCombiner columnExtensionMap={columnExtensionMapWithSelectedFilesCheckboxes}>
                <CustomColumnController>
                    <SortController>
                        <ControlsAndResults {...bodyViewProps} />
                    </SortController>
                </CustomColumnController>
            </ColumnCombiner>
        </WindowNavigationController>
    );
}
BrowseTableWithSelectedFilesCheckboxes.propTypes = {
    // Props' type validation based on contents of this.props during render.
    'href'                      : PropTypes.string.isRequired,
    'columnExtensionMap'        : PropTypes.object.isRequired,
    'context'                   : PropTypes.shape({
        'columns'                   : PropTypes.objectOf(PropTypes.object).isRequired,
        'total'                     : PropTypes.number.isRequired,
        'notification'              : PropTypes.string
    }).isRequired,
    'facets'                    : PropTypes.objectOf(PropTypes.shape({
        'title'                     : PropTypes.string.isRequired
    })),
    'schemas'                   : PropTypes.object,
    'browseBaseState'           : PropTypes.string.isRequired,
    'selectFile'                : PropTypes.func,
    'unselectFile'              : PropTypes.func,
    'selectedFiles'             : PropTypes.objectOf(PropTypes.object),
};
BrowseTableWithSelectedFilesCheckboxes.defaultProps = {
    'navigate'  : navigate,
    'columnExtensionMap' : colExtensionMap4DN
};




