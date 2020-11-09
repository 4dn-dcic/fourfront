'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';

import { IndeterminateCheckbox } from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/components/IndeterminateCheckbox';
import { searchFilters, object, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { DisplayTitleColumnWrapper, DisplayTitleColumnDefault } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';
import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';

// We use own extended navigate fxn (not from shared repo) b.c. need the extra project-specific browse-related functions
// We could probably also create different 'browseState' module for it, however.
import { navigate as globalNavigate, typedefs, Schemas } from './../util';
import { PageTitleContainer, TitleAndSubtitleUnder, StaticPageBreadcrumbs, pageTitleViews } from './../PageTitle';

import { store } from './../../store';
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



class ExternaDataExpSetsCount extends React.PureComponent {

    constructor(props){
        super(props);
        this.onBrowseStateToggle = this.onBrowseStateToggle.bind(this);
    }

    onBrowseStateToggle(e){
        const { browseBaseState, href, context } = this.props;
        e.preventDefault();
        e.stopPropagation();
        globalNavigate.setBrowseBaseStateAndRefresh(browseBaseState === 'only_4dn' ? 'all' : 'only_4dn', href, context);
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
            <div className="above-results-table-row text-right text-truncate">
                <span className="d-inline-block mt-08">
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
     * If different count in Browse result total, refetch chart data.
     *
     * @private
     * @param {URLParts} hrefParts - Components of current URI.
     * @param {SearchResponse} context - Current search response.
     * @returns {void}
     */
    static checkResyncChartData(hrefParts, context){
        setTimeout(function(){
            const { total: resultCount = 0 } = context || {};
            const { query } = hrefParts;
            if (resultCount && ChartDataController.isInitialized() && globalNavigate.isBaseBrowseQuery(query)){
                const cdcState = ChartDataController.getState();
                const cdcExpSetCount = (cdcState.barplot_data_unfiltered && cdcState.barplot_data_unfiltered.total && cdcState.barplot_data_unfiltered.total.experiment_sets);

                if (cdcExpSetCount && cdcExpSetCount !== resultCount){
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
        const { context, href } = this.props;
        return (
            <div className="browse-page-container search-page-container container" id="content">
                <SelectedFilesController {...{ href, context }} analyticsAddFilesToCart>
                    <BrowseTableWithSelectedFilesCheckboxes {...this.props} />
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
        globalNavigate.setBrowseBaseStateAndRefresh('all', href, context);
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
                            <button type="button" className="btn btn-primary text-400 d-inline-block clickable in-stacked-table-button"
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

        // Props from SelectedFilesController (separate from SPC SearchView SelectedItemsController):
        selectedFiles, selectFile, unselectFile, resetSelectedFiles, selectedFilesUniqueCount,

        // Default prop / hardcoded (may become customizable later)
        columnExtensionMap,
    } = props;
    const { total = 0, notification = null } = context;

    /**
     * Extends or creates `columnExtensionMap.display_title` with a larger width as well as
     * a render method which will render out a checkbox for selecting files of an ExperimentSet,
     * if `selectedFiles` are passed in as well.
     * If no selected files data structure is being fed through props, this function returns `columnExtensionMap`.
     */
    const columnExtensionMapWithSelectedFilesCheckboxes = useMemo(function(){
        if (typeof selectedFiles === 'undefined'){
            // We don't need to add checkbox(es) for file selection. (This case shouldn't occur).
            return columnExtensionMap;
        }
        // Else, add Checkboxes
        return _.extend({}, columnExtensionMap, {
            // We extend the display_title of global constant colExtensionMap4DN, not the columnExtensionMap,
            // incase the prop version's render fxn is different than what we expect.
            'display_title' : _.extend({}, colExtensionMap4DN.display_title, {
                'widthMap' : { 'lg' : 210, 'md' : 210, 'sm' : 200 },
                'render' : (expSet, parentProps) => {
                    const { rowNumber, detailOpen, toggleDetailOpen } = parentProps;
                    return (
                        <DisplayTitleColumnWrapper {...{ href, context, rowNumber, detailOpen, toggleDetailOpen }} result={expSet}>
                            <ExperimentSetCheckBox key="checkbox" {...{ expSet, selectedFiles, selectFile, unselectFile }} />
                            <DisplayTitleColumnDefault />
                        </DisplayTitleColumnWrapper>
                    );
                }
            })
        });
    }, [ columnExtensionMap, selectedFiles, selectFile, unselectFile ]);

    /**
     * Plain object used for caching to helps to preserve open states of Processed & Raw files' sections to iron out jumping as that state is lost that would
     * otherwise be encountered during scrolling due to dismounting/destruction of ResultRow components. `detailPaneFileSectionStateCache` is read in constructor
     * or upon mount by these ResultRows.
     *
     * Runs/memoized only once on mount so that same instance of the `detailPaneFileSectionStateCache` object persists throughout lifeycle of
     * `BrowseTableWithSelectedFilesCheckboxes` component.
     */
    const { detailPaneFileSectionStateCache, updateDetailPaneFileSectionStateCache } = useMemo(function(){
        const detailPaneFileSectionStateCache = {};
        function updateDetailPaneFileSectionStateCache(resultID, resultPaneState){
            // Purposely avoid changing reference to avoid re-renders/updates (except when new components initialize)
            if (resultPaneState === null){
                delete detailPaneFileSectionStateCache[resultID];
            } else {
                detailPaneFileSectionStateCache[resultID] = resultPaneState;
            }
        }
        return { detailPaneFileSectionStateCache, updateDetailPaneFileSectionStateCache };
    }, []);

    /**
     * ExperimentSetDetailPane instance will receive props `result`, `containerWidth`, `propsFromTable`, & `rowNumber`
     * via React.cloneElement in SPC > SearchResultTable.js > ResultRowColumBlock.
     *
     * SearchResultTable (& rest of SPC) will soon no longer handle nor pass down selectedFiles so it is passed in (and memoized upon)
     * here instead.
     */
    const detailPane = useMemo(function(){
        return (
            <ExperimentSetDetailPane {...{ selectedFiles, selectFile, unselectFile, windowWidth, href, schemas }} paddingWidth={47}
                initialStateCache={detailPaneFileSectionStateCache} updateFileSectionStateCache={updateDetailPaneFileSectionStateCache} />
        );
    }, [ selectedFiles, windowWidth, href, schemas ]);

    /** Some data calculated/derived from search response / `context` for BrowseView UX specifically */
    const { showClearFiltersButton, countExternalSets, facets } = useMemo(function(){
        const { filters: contextFilters = null, facets: contextFacets = [] } = context;
        const currExpSetFilters = searchFilters.contextFiltersToExpSetFilters(
            contextFilters,
            globalNavigate.getBrowseBaseParams(browseBaseState)
        );
        const showClearFiltersButton = Object.keys(currExpSetFilters || {}).length > 0;

        const projectFacet = _.findWhere(contextFacets, { 'field' : 'award.project' }) || {};
        const projectFacetTerms = _.uniq(projectFacet.terms || [], 'key');
        const countExternalSets = projectFacetTerms.reduce(function(sum, projectTermObj){
            if (projectTermObj.key === '4DN') return sum; // continue.
            return sum + projectTermObj.doc_count;
        }, 0);

        // Filtered to exclude type + fields in browse base state.
        const facets = contextFacets.filter(function(facet, index, all){
            if (facet.hide_from_view) return false;
            if (browseBaseState){
                const browseBaseParams = globalNavigate.getBrowseBaseParams(browseBaseState);
                if (typeof browseBaseParams[facet.field] !== 'undefined') return false;
            }
            return true;
        });

        return { showClearFiltersButton, countExternalSets, facets };
    }, [ context ]);


    if (total === 0 && notification) {
        // We need to have order & presence of all hooks (such as `useMemo`) be consistent across each
        // re-render so we can't pre-emptively return this early (prior to definitions of all hooks).
        return <NoResultsView {...{ context, href, browseBaseState, countExternalSets }} />;
    }

    const aboveTableControlsProps = { // Some more generic props get passed in by SPC > ControlsAndResults.js
        href, session, toggleFullScreen, isFullscreen,
        selectedFiles, selectFile, unselectFile, resetSelectedFiles, selectedFilesUniqueCount
    };

    const aboveTableComponent = <AboveBrowseViewTableControls {...aboveTableControlsProps} showSelectedFileCount />;
    const aboveFacetListComponent = <ExternaDataExpSetsCount {...{ countExternalSets, browseBaseState, href }} />;

    const passProps = {
        href, context, facets,
        session, schemas,
        windowHeight, windowWidth, registerWindowOnScrollHandler,
        detailPane,
        showClearFiltersButton,
        aboveTableComponent, aboveFacetListComponent,
        columnExtensionMap: columnExtensionMapWithSelectedFilesCheckboxes,
        navigate: propNavigate,
        toggleFullScreen, isFullscreen, // todo: remove maybe, pass only to AboveTableControls
        // selectedFiles, selectFile, unselectFile, resetSelectedFiles, // todo: remove and pass only to AboveTableControls, detailPane, and colExtensionMap
        totalExpected: total // todo: remove, deprecated
    };

    return <CommonSearchView {...passProps} termTransformFxn={Schemas.Term.toName} />;
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
    'facets'                    : PropTypes.arrayOf(PropTypes.shape({
        'title'                     : PropTypes.string.isRequired
    })),
    'schemas'                   : PropTypes.object,
    'browseBaseState'           : PropTypes.string.isRequired,
    'selectFile'                : PropTypes.func,
    'unselectFile'              : PropTypes.func,
    'selectedFiles'             : PropTypes.objectOf(PropTypes.object),
};
BrowseTableWithSelectedFilesCheckboxes.defaultProps = {
    'navigate'  : globalNavigate,
    'columnExtensionMap' : colExtensionMap4DN
};





const BrowseViewPageTitle = React.memo(function BrowseViewPageTitle(props) {
    const { alerts, context, session, href } = props;

    return (
        <PageTitleContainer alerts={alerts}>
            <StaticPageBreadcrumbs {...{ context, session, href }} key="breadcrumbs" />
            <TitleAndSubtitleUnder subtitle="Filter & browse experiments" style={{ marginTop: '38px' }}>
                Data Browser
            </TitleAndSubtitleUnder>
        </PageTitleContainer>
    );

});

pageTitleViews.register(BrowseViewPageTitle, "Browse");
