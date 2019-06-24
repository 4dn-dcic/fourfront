'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import ReactTooltip from 'react-tooltip';
import Alerts from './../alerts';
import { console, object, Filters, Schemas, navigate, typedefs } from './../util';
import { SortController, SearchResultTable, SearchResultDetailPane,
    CustomColumnController, FacetList, onFilterHandlerMixin,
    AboveSearchTablePanel, defaultColumnExtensionMap, columnsToColumnDefinitions, defaultHiddenColumnMapFromColumns
} from './components';
import { AboveSearchViewTableControls } from './components/above-table-controls/AboveSearchViewTableControls';


// eslint-disable-next-line no-unused-vars
const { SearchResponse, Item, ColumnDefinition, URLParts } = typedefs;

/**
 * Provides callbacks for FacetList to filter on term click and check if a term is selected by interfacing with the
 * `href` prop and the `navigate` callback prop or fxn (usually utils/navigate.js).
 *
 * Manages and updates `state.defaultHiddenColumns`, which in turn resets CustomColumnController state with new columns,
 * if search type has changed.
 *
 * Passes other props down to ControlsAndResults.
 */
export class SearchControllersContainer extends React.PureComponent {

    static defaultProps = {
        'navigate' : navigate
    };

    constructor(props){
        super(props);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
    }

    isTermSelected(term, facet){
        return Filters.determineIfTermFacetSelected(term, facet, this.props);
    }

    render(){
        const { context } = this.props;
        const defaultHiddenColumns = defaultHiddenColumnMapFromColumns(context.columns);

        return (
            <CustomColumnController defaultHiddenColumns={defaultHiddenColumns}>
                <SortController {..._.pick(this.props, 'href', 'context', 'navigate')}>
                    <ControlsAndResults {...this.props} isTermSelected={this.isTermSelected} onFilter={this.onFilter} />
                </SortController>
            </CustomColumnController>
        );
    }

}



class ControlsAndResults extends React.PureComponent {

    /**
     * Parses out the specific item type from `props.href` and finds the abstract item type, if any.
     *
     * @param {Object} props Component props.
     * @returns {{ specificType: string, abstractType: string }} The leaf specific Item type and parent abstract type (before 'Item' in `@type` array) as strings in an object.
     * Ex: `{ abstractType: null, specificType: "Item" }`, `{ abstractType: "Experiment", specificType: "ExperimentHiC" }`
     */
    static searchItemTypesFromHref = memoize(function(href){
        let specificType = 'Item';    // Default
        let abstractType = null;      // Will be equal to specificType if no parent type.
        const urlParts = url.parse(href, true);

        // Non-zero chance of having array here - though shouldn't occur unless URL entered into browser manually
        // If we do get multiple Item types defined, we treat as if searching `type=Item` (== show `type` facet + column).
        if (typeof urlParts.query.type === 'string') {
            if (urlParts.query.type !== 'Item') {
                specificType = urlParts.query.type;
            }
        }

        abstractType = Schemas.getAbstractTypeForType(specificType) || null;
        return { specificType, abstractType };
    });

    constructor(props){
        super(props);
        this.forceUpdateOnSelf = this.forceUpdateOnSelf.bind(this);
        this.handleClearFilters = this.handleClearFilters.bind(this);
        this.columnExtensionMapWithSelectButton = this.columnExtensionMapWithSelectButton.bind(this);
        this.renderSearchDetailPane = this.renderSearchDetailPane.bind(this);

        this.searchResultTableRef = React.createRef();
    }

    /**
     * This is the callback for the "select" button shown in the
     * display_title column when `props.currentAction` is set to "selection".
     */
    handleSelectItemClick(result, evt){
        var eventJSON = { 'json' : result, 'id' : object.itemUtil.atId(result), 'eventType' : 'fourfrontselectionclick' };

        // Standard - postMessage
        try {
            window.opener.postMessage(eventJSON, '*');
        } catch (err){
            // Check for presence of parent window and alert if non-existent.
            if (!(typeof window !== 'undefined' && window.opener && window.opener.fourfront && window.opener !== window)){
                Alerts.queue({
                    'title' : 'Failed to send data to parent window.',
                    'message' : 'Please ensure there is a parent window to which this selection is being sent to. Alternatively, try to drag & drop the Item over instead.'
                });
            } else {
                console.err('Unexpecter error -- browser may not support postMessage', err);
            }
        }

        // Nonstandard - in case browser doesn't support postMessage but does support other cross-window events (unlikely).
        window.dispatchEvent(new CustomEvent('fourfrontselectionclick', { 'detail' : eventJSON }));
    }

    columnExtensionMapWithSelectButton(columnExtensionMap, currentAction, specificType, abstractType){
        const inSelectionMode = currentAction === 'selection';
        if (!inSelectionMode && (!abstractType || abstractType !== specificType)){
            return columnExtensionMap;
        }

        columnExtensionMap = _.clone(columnExtensionMap); // Avoid modifying in place

        // Kept for reference in case we want to re-introduce constrain that for 'select' button(s) to be visible in search result rows, there must be parent window.
        //var isThereParentWindow = inSelectionMode && typeof window !== 'undefined' && window.opener && window.opener.fourfront && window.opener !== window;

        if (inSelectionMode) {
            // Render out button and add to title render output for "Select" if we have a 'selection' currentAction.
            // Also add the popLink/target=_blank functionality to links
            // Remove lab.display_title and type columns on selection
            columnExtensionMap['display_title'] = _.extend({}, columnExtensionMap['display_title'], {
                'minColumnWidth' : 120,
                'render' : (result, columnDefinition, props, width) => {
                    var currentTitleBlock = SearchResultTable.defaultColumnExtensionMap.display_title.render(
                            result, columnDefinition, _.extend({}, props, { currentAction }), width, true
                        ),
                        newChildren = currentTitleBlock.props.children.slice(0);
                    newChildren.unshift(
                        <div className="select-button-container">
                            <button type="button" className="select-button" onClick={this.handleSelectItemClick.bind(this, result)}>
                                <i className="icon icon-fw icon-check"/>
                            </button>
                        </div>
                    );
                    return React.cloneElement(currentTitleBlock, { 'children' : newChildren });
                }
            });
        }
        return columnExtensionMap;
    }

    forceUpdateOnSelf(){
        var searchResultTable   = this.searchResultTableRef.current,
            dimContainer        = searchResultTable && searchResultTable.getDimensionContainer();
        return dimContainer && dimContainer.resetWidths();
    }

    handleClearFilters(evt){
        evt.preventDefault();
        evt.stopPropagation();
        const { href, context, navigate: propNavigate } = this.props;
        let clearFiltersURL = (typeof context.clear_filters === 'string' && context.clear_filters) || null;
        if (!clearFiltersURL) {
            console.error("No Clear Filters URL");
            return;
        }

        // If we have a '#' in URL, add to target URL as well.
        const hashFragmentIdx = href.indexOf('#');
        if (hashFragmentIdx > -1 && clearFiltersURL.indexOf('#') === -1){
            clearFiltersURL += href.slice(hashFragmentIdx);
        }

        propNavigate(clearFiltersURL, {});
    }

    isClearFiltersBtnVisible(){
        const { href, context } = this.props;
        const urlPartsQuery = url.parse(href, true).query;
        const clearFiltersURL = (typeof context.clear_filters === 'string' && context.clear_filters) || null;
        const clearFiltersURLQuery = clearFiltersURL && url.parse(clearFiltersURL, true).query;

        return !!(clearFiltersURLQuery && !_.isEqual(clearFiltersURLQuery, urlPartsQuery));
    }

    renderSearchDetailPane(result, rowNumber, containerWidth){
        const { windowWidth } = this.props;
        return <SearchResultDetailPane {...{ result, rowNumber, containerWidth }} windowWidth={windowWidth} />;
    }

    render() {
        const { context, hiddenColumns, columnExtensionMap, currentAction, isFullscreen, href, facets: propFacets } = this.props;
        const results                         = context['@graph'];
        // Facets are transformed by the SearchView component to make adjustments to the @type facet re: currentAction.
        const facets                          = propFacets || context.facets;
        const { specificType, abstractType }  = ControlsAndResults.searchItemTypesFromHref(href);
        const selfExtendedColumnExtensionMap  = this.columnExtensionMapWithSelectButton(columnExtensionMap, currentAction, specificType, abstractType);
        const columnDefinitions               = columnsToColumnDefinitions(context.columns || {}, selfExtendedColumnExtensionMap);

        return (
            <div className="row">
                { facets.length ?
                    <div className={"col-sm-5 col-md-4 col-lg-" + (isFullscreen ? '2' : '3')}>
                        <div className="above-results-table-row"/>{/* <-- temporary-ish */}
                        <FacetList className="with-header-bg" facets={facets} filters={context.filters}
                            onClearFilters={this.handleClearFilters} itemTypeForSchemas={specificType}
                            showClearFiltersButton={this.isClearFiltersBtnVisible()}
                            {..._.pick(this.props, 'isTermSelected', 'schemas', 'session', 'onFilter',
                                'currentAction', 'windowWidth', 'windowHeight')} />
                    </div>
                    : null }
                <div className={!facets.length ? "col-sm-12 expset-result-table-fix" : ("expset-result-table-fix col-sm-7 col-md-8 col-lg-" + (isFullscreen ? '10' : '9'))}>
                    <AboveSearchViewTableControls showTotalResults={context.total} parentForceUpdate={this.forceUpdateOnSelf}
                        {..._.pick(this.props, 'addHiddenColumn', 'removeHiddenColumn', 'isFullscreen', 'context', 'columns',
                            'currentAction', 'windowWidth', 'windowHeight', 'toggleFullScreen')}
                        {...{ hiddenColumns, columnDefinitions }}/>
                    <SearchResultTable ref={this.searchResultTableRef} renderDetailPane={this.renderSearchDetailPane} totalExpected={context.total}
                        {..._.pick(this.props, 'href', 'sortBy', 'sortColumn', 'sortReverse',
                            'currentAction', 'windowWidth', 'registerWindowOnScrollHandler', 'schemas')}
                        {...{ hiddenColumns, results, columnDefinitions }} />
                </div>
            </div>
        );
    }

}

export default class SearchView extends React.PureComponent {

    static propTypes = {
        'context'       : PropTypes.object.isRequired,
        'currentAction' : PropTypes.string,
        'href'          : PropTypes.string.isRequired,
        'session'       : PropTypes.bool.isRequired,
        'navigate'      : PropTypes.func
    };

    /**
     * @public
     * @type {Object}
     * @property {string} href - Current URI.
     * @property {string} [currentAction=null] - Current action, if any.
     * @property {Object.<ColumnDefinition>} columnExtensionMap - Object keyed by field name with overrides for column definition.
     */
    static defaultProps = {
        'href'          : null,
        'currentAction' : null,
        'columnExtensionMap' : defaultColumnExtensionMap
    };

    /**
     * Function which is passed into a `.filter()` call to
     * filter context.facets down, usually in response to frontend-state.
     *
     * Currently is meant to filter out type facet if we're in selection mode,
     * as well as some fields from embedded 'experiment_set' which might
     * give unexpected results.
     *
     * @todo Potentially get rid of this and do on backend.
     *
     * @param {{ field: string }} facet - Object representing a facet.
     * @returns {boolean} Whether to keep or discard facet.
     */
    static filterFacet(facet, currentAction, session){
        // Set in backend or schema for facets which are under development or similar.
        if (facet.hide_from_view) return false;

        // Remove the @type facet while in selection mode.
        if (facet.field === 'type' && currentAction === 'selection') return false;

        // Most of these would only appear if manually entered into browser URL.
        if (facet.field.indexOf('experiments.experiment_sets.') > -1) return false;
        if (facet.field === 'experiment_sets.@type') return false;
        if (facet.field === 'experiment_sets.experimentset_type') return false;

        return true;
    }

    static transformedFacets = memoize(function(href, context, currentAction, session){
        var facets,
            typeFacetIndex,
            hrefQuery,
            itemTypesInSearch;

        // Clone/filter list of facets.
        // We may filter out type facet completely at this step,
        // in which case we can return out of func early.
        facets = _.filter(
            context.facets,
            function(facet){ return SearchView.filterFacet(facet, currentAction, session); }
        );

        // Find facet for '@type'
        typeFacetIndex = _.findIndex(facets, { 'field' : 'type' });

        if (typeFacetIndex === -1) {
            return facets; // Facet not present, return.
        }

        hrefQuery = url.parse(href, true).query;
        if (typeof hrefQuery.type === 'string') hrefQuery.type = [hrefQuery.type];
        itemTypesInSearch = _.without(hrefQuery.type, 'Item');

        if (itemTypesInSearch.length > 0){
            // Keep all terms/leaf-types - backend should already filter down to only valid sub-types through
            // nature of search itself.
            return facets;
        }

        // Avoid modifying in place.
        facets[typeFacetIndex] = _.clone(facets[typeFacetIndex]);

        // Show only base types for when itemTypesInSearch.length === 0 (aka 'type=Item').
        facets[typeFacetIndex].terms = _.filter(facets[typeFacetIndex].terms, function(itemType){
            var parentType = Schemas.getAbstractTypeForType(itemType.key);
            return !parentType || parentType === itemType.key;
        });

        return facets;
    });

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    /**
     * Filter the `@type` facet options down to abstract types only (if none selected) for Search.
     */
    transformedFacets(){
        var { href, context, currentAction, session } = this.props;
        return SearchView.transformedFacets(href, context, currentAction, session);
    }

    render() {
        return (
            <div className="container" id="content">
                <div className="search-page-container">
                    <AboveSearchTablePanel {..._.pick(this.props, 'href', 'context')} />
                    <SearchControllersContainer {...this.props} facets={this.transformedFacets()} navigate={this.props.navigate || navigate} />
                </div>
            </div>
        );
    }
}
