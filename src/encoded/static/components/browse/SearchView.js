'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import url from 'url';
import _ from 'underscore';
import * as globals from './../globals';
import ReactTooltip from 'react-tooltip';
import Alerts from './../alerts';
import { ajax, console, object, isServerSide, Filters, Schemas, layout, DateUtility, navigate, typedefs } from './../util';
import { Button, ButtonToolbar, ButtonGroup, Panel, Table, Collapse} from 'react-bootstrap';
import { SortController, LimitAndPageControls, SearchResultTable, SearchResultDetailPane,
    AboveTableControls, CustomColumnSelector, CustomColumnController, FacetList, onFilterHandlerMixin,
    AboveSearchTablePanel, defaultColumnDefinitionMap, columnsToColumnDefinitions, defaultHiddenColumnMapFromColumns } from './components';

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
        this.getColumnDefinitions = this.getColumnDefinitions.bind(this);
        this.renderSearchDetailPane = this.renderSearchDetailPane.bind(this);

        var itemTypes                   = this.searchItemTypes(props),
            columnDefinitionOverrides   = this.colDefOverrides(props, itemTypes),
            columnDefinitions           = this.getColumnDefinitions(props, columnDefinitionOverrides, itemTypes);

        this.state = { columnDefinitionOverrides, columnDefinitions };
    }

    componentWillReceiveProps(nextProps){
        var stateChange = {};
        if (this.props.href !== nextProps.href){
            // URL and likely filters, maybe @type, etc. have changed.
            _.extend(stateChange, this.searchItemTypes(nextProps));
        }
        if ((nextProps.columnDefinitionOverrides !== this.props.columnDefinitionOverrides) || (this.props.currentAction !== nextProps.currentAction) || stateChange.specificType){
            stateChange.colDefOverrides = this.colDefOverrides(
                nextProps,
                stateChange.specificType ? stateChange : this.state
            );
        }
        if (nextProps.context !== this.props.context || this.props.href !== nextProps.href){
            stateChange.columnDefinitions = this.getColumnDefinitions(
                nextProps,
                stateChange.colDefOverrides || this.state.colDefOverrides,
                stateChange.specificType ? stateChange : this.state
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
        var { currentAction, columnDefinitionOverrideMap } = props,
            inSelectionMode = currentAction === 'selection';

        if (!inSelectionMode && (!abstractType || abstractType !== specificType)){
            return columnDefinitionOverrideMap;
        }

        var columnDefinitionOverrides = _.clone(columnDefinitionOverrideMap);

        // Kept for reference in case we want to re-introduce constrain that for 'select' button(s) to be visible in search result rows, there must be parent window.
        //var isThereParentWindow = inSelectionMode && typeof window !== 'undefined' && window.opener && window.opener.fourfront && window.opener !== window;

        if (inSelectionMode) {
            // Render out button and add to title render output for "Select" if we have a 'selection' currentAction.
            // Also add the popLink/target=_blank functionality to links
            // Remove lab.display_title and type columns on selection
            columnDefinitionOverrides['display_title'] = _.extend({}, columnDefinitionOverrides['display_title'], {
                'minColumnWidth' : 120,
                'render' : (result, columnDefinition, props, width) => {
                    var currentTitleBlock = SearchResultTable.defaultColumnDefinitionMap.display_title.render(
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
            // remove while @type and lab from File selection columns
            //if (specificType === 'File'){
            //    hiddenColumnsFull.push('@type');
            //    hiddenColumnsFull.push('lab.display_title');
            //    delete columnDefinitionOverrides['lab.display_title'];
            //    delete columnDefinitionOverrides['@type'];
            //} else {
            //    columnDefinitionOverrides['lab.display_title'] = {
            //        'render' : function(result, columnDefinition, props, width){
            //            var newRender = SearchResultTable.defaultColumnDefinitionMap['lab.display_title'].render(result, columnDefinition, props, width, true);
            //            return newRender;
            //        }
            //    };
            //}
        }
        return columnDefinitionOverrides;
    }

    /**
     * Builds near-final form of column definitions to be rendered by table.
     *
     * @private
     * @param {Object} [props=this.props] Current or next props.
     * @returns {ColumnDefinition[]} Final column definitions.
     */
    getColumnDefinitions(props = this.props, colDefOverrides = this.state.colDefOverrides, { specificType, abstractType }){
        var columns = (props.context && props.context.columns) || {};
        // Ensure the type column is present for when are on an abstract item type search.
        if (((abstractType && abstractType === specificType) || specificType === 'Item') && typeof columns['@type'] === 'undefined'){
            columns = _.extend({}, columns, {
                '@type' : {} // Will inherit all values from colDefOverrides / defaultColumnDefinitionMap.
            });
        }
        return columnsToColumnDefinitions(columns, colDefOverrides);
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

    renderSearchDetailPane(result, rowNumber, containerWidth){
        return <SearchResultDetailPane {...{ result, rowNumber, containerWidth }} windowWidth={this.props.windowWidth} />;
    }

    render() {
        var { context, href, hiddenColumns, currentAction, columnDefinitionOverrideMap } = this.props,
            { columnDefinitions, abstractType, specificType } = this.state,
            results                     = context['@graph'],
            inSelectionMode             = currentAction === 'selection',
            facets                      = this.props.facets || context.facets,
            urlParts                    = url.parse(href, true);

        return (
            <div className="row">
                { facets.length ?
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <div className="above-results-table-row"/>{/* <-- temporary-ish */}
                        <FacetList {..._.pick(this.props, 'isTermSelected', 'schemas', 'session', 'onFilter', 'windowWidth',
                        'currentAction')}
                            className="with-header-bg" facets={facets} filters={context.filters}
                            onClearFilters={this.handleClearFilters} filterFacetsFxn={FacetList.filterFacetsForSearch}
                            itemTypeForSchemas={specificType} hideDataTypeFacet={inSelectionMode}
                            showClearFiltersButton={(()=>{
                                var clearFiltersURL = (typeof context.clear_filters === 'string' && context.clear_filters) || null;
                                var urlPartQueryCorrectedForType = _.clone(urlParts.query);
                                if (!urlPartQueryCorrectedForType.type || urlPartQueryCorrectedForType.type === '') urlPartQueryCorrectedForType.type = 'Item';
                                return !object.isEqual(url.parse(clearFiltersURL, true).query, urlPartQueryCorrectedForType);
                            })()} />
                        </div>
                : null }
                <div className={facets.length ? "col-sm-7 col-md-8 col-lg-9 expset-result-table-fix" : "col-sm-12 expset-result-table-fix"}>
                    <AboveTableControls {..._.pick(this.props, 'addHiddenColumn', 'removeHiddenColumn',
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
     * @property {Object.<ColumnDefinition>} columnDefinitionOverrideMap - Object keyed by field name with overrides for column definition.
     */
    static defaultProps = {
        'href'          : null,
        'currentAction' : null,
        'columnDefinitionOverrideMap' : defaultColumnDefinitionMap
    };

    constructor(props){
        super(props);
        this.filterFacets = this.filterFacets.bind(this);
        this.state = {
            'filteredFacets' : this.filterFacets(props)
        };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.context !== nextProps.context){
            this.setState({ 'filteredFacets' : this.filterFacets(nextProps) });
        }
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    /**
     * Filter the `@type` facet options down to abstract types only (if none selected) for Search.
     *
     * @param {Object} props Component props.
     */
    filterFacets(props = this.props){
        var href = props.href;

        // TODO: Change from a map to a _.findWhere/find ?
        return _.map(props.context.facets, (facet)=>{

            // For search page, filter out Item types which are subtypes of an abstract type. Unless are on an abstract type.
            if (facet.field === 'type'){
                facet = _.clone(facet);
                var queryParts = url.parse(href, true).query;
                if (typeof queryParts.type === 'string') queryParts.type = [queryParts.type];
                queryParts.type = _.without(queryParts.type, 'Item');

                var isParentTypeSet = queryParts.type.filter(function(t){
                    var pt = Schemas.getAbstractTypeForType(t);
                    if (pt){
                        return true;
                    }
                    return false;
                }).length > 0;

                if (!isParentTypeSet){
                    facet.terms = facet.terms.filter(function(itemType){
                        var parentType = Schemas.getAbstractTypeForType(itemType.key);
                        if (parentType && itemType.key !== parentType){
                            return false;
                        }
                        return true;
                    });
                }

            }

            return facet;
        });
    }

    render() {
        return (
            <div className="search-page-container" ref="container">
                <AboveSearchTablePanel {..._.pick(this.props, 'href', 'context')} />
                <SearchControllersContainer {...this.props} facets={this.state.filteredFacets} navigate={this.props.navigate || navigate} />
            </div>
        );
    }
}

globals.content_views.register(SearchView, 'Search');
globals.content_views.register(SearchView, 'Search', 'selection');
globals.content_views.register(SearchView, 'Browse', 'selection');
