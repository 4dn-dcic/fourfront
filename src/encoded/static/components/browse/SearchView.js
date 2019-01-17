'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import url from 'url';
import _ from 'underscore';
import * as globals from './../globals';
import ReactTooltip from 'react-tooltip';
import Alerts from './../alerts';
import { ajax, console, object, isServerSide, Filters, Schemas, layout, DateUtility, navigate, JWT, typedefs } from './../util';
import { Button, ButtonToolbar, ButtonGroup, Panel, Table, Collapse} from 'react-bootstrap';
import { SortController, LimitAndPageControls, SearchResultTable, SearchResultDetailPane,
    AboveTableControls, CustomColumnSelector, CustomColumnController, FacetList, onFilterHandlerMixin,
    AboveSearchTablePanel, defaultColumnExtensionMap, columnsToColumnDefinitions, defaultHiddenColumnMapFromColumns } from './components';

var { SearchResponse, Item, ColumnDefinition, URLParts } = typedefs;

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

    /**
     * Should handle and fail cases where context and columns object reference values
     * have changed, but not contents. User-selected columns should be preserved upon faceting
     * or similar filtering, but be updated when search type changes.
     *
     * @param {{ columns: Object.<Object> }} pastContext Previous context, to be passed in from a lifecycle method.
     * @param {{ columns: Object.<Object> }} nextContext Next context, to be passed in from a lifecycle method.
     *
     * @returns {boolean} If context columns have changed, which should be about same as if type has changed.
     */
    static haveContextColumnsChanged(pastContext, nextContext){
        if (pastContext === nextContext) return false;
        if (pastContext.columns && !nextContext.columns) return true;
        if (!pastContext.columns && nextContext.columns) return true;
        var pKeys       = _.keys(pastContext.columns),
            pKeysLen    = pKeys.length,
            nKeys       = _.keys(nextContext.columns),
            i;

        if (pKeysLen !== nKeys.length) return true;
        for (i = 0; i < pKeysLen; i++){
            if (pKeys[i] !== nKeys[i]) return true;
        }
        return false;
    }

    static defaultProps = {
        'navigate' : navigate
    };

    constructor(props){
        super(props);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'defaultHiddenColumns' : defaultHiddenColumnMapFromColumns(props.context.columns)
        };
    }

    componentWillReceiveProps(nextProps){
        if (SearchControllersContainer.haveContextColumnsChanged(this.props.context, nextProps.context)) {
            this.setState({ 'defaultHiddenColumns' : defaultHiddenColumnMapFromColumns(nextProps.context.columns) });
        }
    }

    isTermSelected(term, facet){
        return Filters.determineIfTermFacetSelected(term, facet, this.props);
    }

    render(){
        return (
            <CustomColumnController defaultHiddenColumns={this.state.defaultHiddenColumns}>
                <SortController href={this.props.href} context={this.props.context} navigate={this.props.navigate}>
                    <ControlsAndResults {...this.props} isTermSelected={this.isTermSelected} onFilter={this.onFilter} />
                </SortController>
            </CustomColumnController>
        );
    }

}



class ControlsAndResults extends React.PureComponent {

    constructor(props){
        super(props);
        this.searchItemTypes = this.searchItemTypes.bind(this);
        this.forceUpdateOnSelf = this.forceUpdateOnSelf.bind(this);
        this.handleClearFilters = this.handleClearFilters.bind(this);
        this.colDefOverrides = this.colDefOverrides.bind(this);
        this.renderSearchDetailPane = this.renderSearchDetailPane.bind(this);

        var itemTypes                   = this.searchItemTypes(props),
            columnExtensionMap          = this.colDefOverrides(props, itemTypes),
            columnDefinitions           = columnsToColumnDefinitions(props.context.columns || {}, columnExtensionMap);

        this.state = { columnExtensionMap, columnDefinitions };
    }

    componentWillReceiveProps(nextProps){
        var stateChange = {};
        if (this.props.href !== nextProps.href){
            // URL and likely filters, maybe @type, etc. have changed.
            _.extend(stateChange, this.searchItemTypes(nextProps));
        }
        if ((nextProps.columnExtensionMap !== this.props.columnExtensionMap) || (this.props.currentAction !== nextProps.currentAction) || stateChange.specificType){
            stateChange.colDefOverrides = this.colDefOverrides(
                nextProps,
                stateChange.specificType ? stateChange : this.state
            );
        }
        if (nextProps.context !== this.props.context || this.props.href !== nextProps.href){
            stateChange.columnDefinitions = columnsToColumnDefinitions(
                nextProps.context.columns || {},
                stateChange.colDefOverrides || this.state.colDefOverrides
            );
        }
        if (_.keys(stateChange).length > 0){
            this.setState(stateChange);
        }
    }

    /**
     * Parses out the specific item type from `props.href` and finds the abstract item type, if any.
     *
     * @param {Object} props Component props.
     * @returns {{ specificType: string, abstractType: string }} The leaf specific Item type and parent abstract type (before 'Item' in `@type` array) as strings in an object.
     * Ex: `{ abstractType: null, specificType: "Item" }`, `{ abstractType: "Experiment", specificType: "ExperimentHiC" }`
     */
    searchItemTypes(props){
        var href                = props.href,
            specificType        = 'Item', // Default
            abstractType        = null,   // Will be equal to specificType if no parent type.
            itemTypeForSchemas  = null,
            urlParts            = url.parse(href, true);

        // Non-zero chance of having array here - though shouldn't occur unless URL entered into browser manually
        // If we do get multiple Item types defined, we treat as if searching `type=Item` (== show `type` facet + column).
        if (typeof urlParts.query.type === 'string') {
            if (urlParts.query.type !== 'Item') {
                specificType = itemTypeForSchemas = urlParts.query.type;
            }
        }

        abstractType = Schemas.getAbstractTypeForType(specificType) || null;
        return { specificType, abstractType };
    }

    colDefOverrides(props = this.props, { specificType, abstractType }){
        var { currentAction, columnExtensionMap } = props,
            inSelectionMode = currentAction === 'selection';

        if (!inSelectionMode && (!abstractType || abstractType !== specificType)){
            return columnExtensionMap;
        }

        var columnDefinitionOverrides = _.clone(columnExtensionMap);

        // Kept for reference in case we want to re-introduce constrain that for 'select' button(s) to be visible in search result rows, there must be parent window.
        //var isThereParentWindow = inSelectionMode && typeof window !== 'undefined' && window.opener && window.opener.fourfront && window.opener !== window;

        if (inSelectionMode) {
            // Render out button and add to title render output for "Select" if we have a 'selection' currentAction.
            // Also add the popLink/target=_blank functionality to links
            // Remove lab.display_title and type columns on selection
            columnDefinitionOverrides['display_title'] = _.extend({}, columnDefinitionOverrides['display_title'], {
                'minColumnWidth' : 120,
                'render' : (result, columnDefinition, props, width) => {
                    var currentTitleBlock = SearchResultTable.defaultColumnExtensionMap.display_title.render(
                        result, columnDefinition, _.extend({}, props, { currentAction }), width, true
                    );
                    var newChildren = currentTitleBlock.props.children.slice(0);
                    newChildren.unshift(
                        <div className="select-button-container">
                            <button className="select-button" onClick={function(e){
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

                            }}>
                                <i className="icon icon-fw icon-check"/>
                            </button>
                        </div>
                    );
                    return React.cloneElement(currentTitleBlock, { 'children' : newChildren });
                }
            });
        }
        return columnDefinitionOverrides;
    }

    forceUpdateOnSelf(){
        var searchResultTable   = this.refs.searchResultTable,
            dimContainer        = searchResultTable && searchResultTable.getDimensionContainer();
        return dimContainer && dimContainer.resetWidths();
    }

    handleClearFilters(evt){
        evt.preventDefault();
        evt.stopPropagation();
        var { href, context } = this.props;
        var clearFiltersURL = (typeof context.clear_filters === 'string' && context.clear_filters) || null;
        if (!clearFiltersURL) {
            console.error("No Clear Filters URL");
            return;
        }

        // If we have a '#' in URL, add to target URL as well.
        var hashFragmentIdx = href.indexOf('#');
        if (hashFragmentIdx > -1 && clearFiltersURL.indexOf('#') === -1){
            clearFiltersURL += href.slice(hashFragmentIdx);
        }

        this.props.navigate(clearFiltersURL, {});
    }

    isClearFiltersBtnVisible(){
        var { href, context } = this.props,
            urlPartsQuery                   = url.parse(href, true).query,
            clearFiltersURL                 = (typeof context.clear_filters === 'string' && context.clear_filters) || null,
            clearFiltersURLQuery            = clearFiltersURL && url.parse(clearFiltersURL, true).query;

        return !!(clearFiltersURLQuery && !_.isEqual(clearFiltersURLQuery, urlPartsQuery));
    }

    renderSearchDetailPane(result, rowNumber, containerWidth){
        return <SearchResultDetailPane {...{ result, rowNumber, containerWidth }} windowWidth={this.props.windowWidth} />;
    }

    render() {
        var { context, hiddenColumns, currentAction, isFullscreen } = this.props,
            { columnDefinitions, abstractType, specificType } = this.state,
            results                     = context['@graph'],
            inSelectionMode             = currentAction === 'selection',
            // Facets are transformed by the SearchView component to make adjustments to the @type facet re: currentAction.
            facets                      = this.props.facets || context.facets;

        return (
            <div className="row">
                { facets.length ?
                    <div className={"col-sm-5 col-md-4 col-lg-" + (isFullscreen ? '2' : '3')}>
                        <div className="above-results-table-row"/>{/* <-- temporary-ish */}
                        <FacetList {..._.pick(this.props, 'isTermSelected', 'schemas', 'session', 'onFilter', 'windowWidth',
                        'currentAction', 'windowHeight')}
                            className="with-header-bg" facets={facets} filters={context.filters}
                            onClearFilters={this.handleClearFilters} itemTypeForSchemas={specificType}
                            showClearFiltersButton={this.isClearFiltersBtnVisible()} />
                        </div>
                : null }
                <div className={!facets.length ? "col-sm-12 expset-result-table-fix" : ("expset-result-table-fix col-sm-7 col-md-8 col-lg-" + (isFullscreen ? '10' : '9'))}>
                    <AboveTableControls {..._.pick(this.props, 'addHiddenColumn', 'removeHiddenColumn', 'isFullscreen',
                        'context', 'columns', 'selectedFiles', 'currentAction', 'windowWidth', 'windowHeight', 'toggleFullScreen')}
                        {...{ hiddenColumns, columnDefinitions }} showTotalResults={context.total} parentForceUpdate={this.forceUpdateOnSelf} />
                    <SearchResultTable {..._.pick(this.props, 'href', 'sortBy', 'sortColumn', 'sortReverse',
                        'currentAction', 'windowWidth', 'registerWindowOnScrollHandler', 'schemas')}
                        {...{ hiddenColumns, results, columnDefinitions }}
                        ref="searchResultTable" renderDetailPane={this.renderSearchDetailPane} totalExpected={context.total} />
                </div>
            </div>
        );
    }

}

export default class SearchView extends React.PureComponent {

    /**
     * @ignore
     */
    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'currentAction' : PropTypes.string
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

    constructor(props){
        super(props);
        this.filterFacet = this.filterFacet.bind(this);
        this.transformedFacets = this.transformedFacets.bind(this);
        this.state = {
            'transformedFacets' : this.transformedFacets(props)
        };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.context !== nextProps.context){
            this.setState({ 'transformedFacets' : this.transformedFacets(nextProps) });
        }
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

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
     * @param {number} facetIdx - Index of current facet being iterated on.
     * @param {Object[]} all - All facets.
     * @returns {boolean} Whether to keep or discard facet.
     */
    filterFacet(facet, facetIdx, all){
        var { currentAction, session } = this.props;

        // Set in backend or schema for facets which are under development or similar.
        if (facet.hide_from_view) return false;

        // Hide audit facets unless are admin.
        if (facet.field.substring(0, 6) === 'audit.'){
            if (session && JWT.isLoggedInAsAdmin()) return true;
            return false;
        }

        // Remove the @type facet while in selection mode.
        if (facet.field === 'type' && currentAction === 'selection') return false;

        // Most of these would only appear if manually entered into browser URL.
        if (facet.field.indexOf('experiments.experiment_sets.') > -1) return false;
        if (facet.field === 'experiment_sets.@type') return false;
        if (facet.field === 'experiment_sets.experimentset_type') return false;

        return true;
    }

    /**
     * Filter the `@type` facet options down to abstract types only (if none selected) for Search.
     *
     * @param {Object} props Component props.
     */
    transformedFacets(props = this.props){
        var { href, context } = props,
            facets,
            typeFacetIndex,
            hrefQuery,
            itemTypesInSearch;

        // Clone/filter list of facets.
        // We may filter out type facet completely at this step,
        // in which case we can return out of func early.
        facets = _.filter(context.facets, this.filterFacet);

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
    }

    render() {
        return (
            <div className="search-page-container" ref="container">
                <AboveSearchTablePanel {..._.pick(this.props, 'href', 'context')} />
                <SearchControllersContainer {...this.props} facets={this.state.transformedFacets} navigate={this.props.navigate || navigate} />
            </div>
        );
    }
}

globals.content_views.register(SearchView, 'Search');
globals.content_views.register(SearchView, 'Search', 'selection');
globals.content_views.register(SearchView, 'Browse', 'selection');
