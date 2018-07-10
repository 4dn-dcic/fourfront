'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import url from 'url';
import _ from 'underscore';
import * as globals from './../globals';
import ReactTooltip from 'react-tooltip';
import { ajax, console, object, isServerSide, Filters, Schemas, layout, DateUtility, navigate } from './../util';
import { Button, ButtonToolbar, ButtonGroup, Panel, Table, Collapse} from 'react-bootstrap';
import { SortController, LimitAndPageControls, SearchResultTable, SearchResultDetailPane, AboveTableControls, CustomColumnSelector, CustomColumnController, FacetList, onFilterHandlerMixin, AboveSearchTablePanel } from './components';



export function getSearchType(facets){
    var specificSearchType;
    // Check to see if we are searching among multiple data types
    // If only one type, use that as the search title
    for (var i = 0; i < facets.length; i++){
        if (facets[i]['field'] && facets[i]['field'] == 'type'){
            if (facets[i]['terms'][0]['doc_count'] === facets[i]['total']
                && facets[i]['total'] > 0 && facets[i]['terms'][0]['key'] !== 'Item'){
                // it's a single data type, so grab it
                specificSearchType = facets[i]['terms'][0]['key'];
            }else{
                specificSearchType = 'Multiple type';
            }
        }
        return specificSearchType;
    }
}


/**
 * Provides callbacks for FacetList to filter on term click and check if a term is selected by interfacing with the
 * 'searchBase' or 'href' prop (treated the same) and the 'navigate' callback prop (usually utils/navigate.js).
 *
 * Passes other props down to ControlsAndResults.
 *
 * @export
 * @class ResultTableHandlersContainer
 * @extends {React.Component}
 */
export class ResultTableHandlersContainer extends React.PureComponent {

    static defaultProps = {
        'restrictions'  : {},
        'navigate'      : navigate
    }

    constructor(props){
        super(props);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.defaultHiddenColumns = this.defaultHiddenColumns.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'defaultHiddenColumns' : this.defaultHiddenColumns(props)
        };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.context !== nextProps.context){
            this.setState({ 'defaultHiddenColumns' : this.defaultHiddenColumns(nextProps) });
        }
    }

    /** Check in schemas for columns which are to be hidden by default. */
    defaultHiddenColumns(props = this.props){
        var defaultHiddenColumnsFromSchemas = [];
        if (props.context.columns){
            defaultHiddenColumnsFromSchemas = _.map(_.filter(_.pairs(props.context.columns), function(p){ return p[1].default_hidden; }), function(p){ return p[0]; });
        }
        return ['status'].concat(defaultHiddenColumnsFromSchemas);
    }

    isTermSelected(term, facet){
        return !!(Filters.getUnselectHrefIfSelectedFromResponseFilters(term, facet, this.props.context.filters));
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

    static defaultProps = {
        'restrictions' : {}
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.forceUpdateOnSelf = this.forceUpdate.bind(this);
        this.handleClearFilters = this.handleClearFilters.bind(this);
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

    render() {
        var { context, href, hiddenColumns, currentAction } = this.props;
        var results = context['@graph'],
            inSelectionMode = currentAction === 'selection',
            facets = this.props.facets || context.facets,
            thisType = 'Item',
            thisTypeTitle = Schemas.getTitleForType(thisType),
            itemTypeForSchemas,
            schemaForType,
            abstractType,
            urlParts = url.parse(href, true),
            hiddenColumnsFull = (hiddenColumns || []).slice(0);

        // get type of this object for getSchemaProperty (if type="Item", no tooltips)

        if (typeof urlParts.query.type === 'string') { // Can also be array
            if (urlParts.query.type !== 'Item') {
                thisType = itemTypeForSchemas = urlParts.query.type;
            }
        }

        abstractType = Schemas.getAbstractTypeForType(thisType);
        if ((abstractType && abstractType !== thisType) || (!abstractType && thisType !== 'Item')) {
            hiddenColumnsFull.push('@type');
        }

        // Excluded columns from schema.
        schemaForType = Schemas.getSchemaForItemType(thisType);
        if (schemaForType && Array.isArray(schemaForType.excludedColumns) && _.every(schemaForType.excludedColumns, function(c){ return typeof c === 'string'; }) ){
            hiddenColumnsFull = hiddenColumnsFull.concat(schemaForType.excludedColumns);
        }

        var columnDefinitionOverrides = {};

        // Render out button and add to title render output for "Select" if we have a props.selectCallback from submission view
        // Also add the popLink/target=_blank functionality to links
        if (typeof this.props.selectCallback === 'function'){
            columnDefinitionOverrides['display_title'] = {
                'minColumnWidth' : 120,
                'render' : (result, columnDefinition, props, width) => {
                    var currentTitleBlock = SearchResultTable.defaultColumnDefinitionMap.display_title.render(result, columnDefinition, props, width, true);
                    var newChildren = currentTitleBlock.props.children.slice(0);
                    newChildren.unshift(
                        <div className="select-button-container" onClick={(e)=>{
                            e.preventDefault();
                            this.props.selectCallback(object.atIdFromObject(result));
                        }}>
                            <button className="select-button" onClick={props.toggleDetailOpen}>
                                <i className="icon icon-fw icon-check"/>
                            </button>
                        </div>
                    );
                    return React.cloneElement(currentTitleBlock, { 'children' : newChildren });
                }
            };
            columnDefinitionOverrides['lab.display_title'] = {
                'render' : function(result, columnDefinition, props, width){
                    var newRender = SearchResultTable.defaultColumnDefinitionMap['lab.display_title'].render(result, columnDefinition, props, width, true);
                    return newRender;
                }
            };
        }

        // We're on an abstract type; show detailType in type column.
        if (abstractType && abstractType === thisType){
            columnDefinitionOverrides['@type'] = {
                'noSort' : true,
                'render' : (result, columnDefinition, props, width) => {
                    if (!Array.isArray(result['@type'])) return null;
                    var itemType = Schemas.getItemType(result);
                    if (itemType === thisType) return null;
                    return Schemas.getTitleForType(itemType);
                }
            };
        }

        return (
            <div>
            {/*
                {this.props.submissionBase ?
                    <h1 className="page-title">{thisTypeTitle + ' Selection'}</h1>
                    : <h1 className="page-title">{thisTypeTitle + ' Search'}</h1>
                }
                <h4 className="page-subtitle">Filter & sort results</h4>
            */}

                <div className="row">
                    {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                        <div className="above-results-table-row"/>{/* <-- temporary-ish */}
                        <FacetList
                            className="with-header-bg"
                            facets={facets}
                            filters={context.filters}
                            onFilter={this.props.onFilter}
                            filterFacetsFxn={FacetList.filterFacetsForSearch}
                            isTermSelected={this.props.isTermSelected}
                            itemTypeForSchemas={itemTypeForSchemas}
                            session={this.props.session}
                            showClearFiltersButton={(()=>{
                                var clearFiltersURL = (typeof context.clear_filters === 'string' && context.clear_filters) || null;
                                var urlPartQueryCorrectedForType = _.clone(urlParts.query);
                                if (!urlPartQueryCorrectedForType.type || urlPartQueryCorrectedForType.type === '') urlPartQueryCorrectedForType.type = 'Item';
                                return !object.isEqual(url.parse(clearFiltersURL, true).query, urlPartQueryCorrectedForType);
                            })()}
                            onClearFilters={this.handleClearFilters}
                            hideDataTypeFacet={inSelectionMode}
                        />
                </div> : null}
                    <div className={facets.length ? "col-sm-7 col-md-8 col-lg-9 expset-result-table-fix" : "col-sm-12 expset-result-table-fix"}>
                        <AboveTableControls {..._.pick(this.props,
                                'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn', 'context',
                                'columns', 'selectedFiles', 'constantHiddenColumns', 'currentAction'
                            )}
                            parentForceUpdate={this.forceUpdateOnSelf} columnDefinitions={CustomColumnSelector.buildColumnDefinitions(
                                SearchResultTable.defaultProps.constantColumnDefinitions,
                                context.columns || {},
                                columnDefinitionOverrides,
                                ['@type']
                            )}
                            showTotalResults={context.total} />
                        <SearchResultTable {..._.pick(this.props, 'href', 'sortBy', 'sortColumn', 'sortReverse', 'currentAction')}
                            results={results} columns={context.columns || {}} totalExpected={context.total}
                            renderDetailPane={(result, rowNumber, containerWidth)=>
                                <SearchResultDetailPane popLink={this.props.selectCallback ? true : false} result={result} />
                            }
                            hiddenColumns={hiddenColumnsFull} columnDefinitionOverrideMap={columnDefinitionOverrides} />
                    </div>
                </div>
            </div>
        );
    }

}

export default class SearchView extends React.PureComponent {

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'currentAction' : PropTypes.string
    }

    static defaultProps = {
        'href'          : null,
        'currentAction' : null,
        'restrictions'  : {} // ???? what/how is this to be used? remove? use context.restrictions (if any)?
    }

    constructor(props){
        super(props);
        this.filterFacets = this.filterFacets.bind(this);
        this.state = {
            'filteredFacets' : this.filterFacets()
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

    filterFacets(props = this.props){ // Filter Facets down to abstract types only (if none selected) for Search. Do something about restrictions(?)
        var href = props.href;
        return props.context.facets.map((facet)=>{

            if (props.restrictions[facet.field] !== undefined) {
                facet = _.clone(facet);
                facet.restrictions = props.restrictions[facet.field];
                facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
            }

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
        var context = this.props.context,
            results = context['@graph'],
            notification = context['notification'],
            facets = this.state.filteredFacets;

        // submissionBase is supplied when using Search through frontend
        // submission. this switch controls several things, including
        // pagination, clear filter, and types filter.

        return (
            <div className="search-page-container" ref="container">
                <AboveSearchTablePanel {..._.pick(this.props, 'href', 'context')} />
                <ResultTableHandlersContainer {...this.props} facets={facets} navigate={this.props.navigate || navigate} />
            </div>
        );
    }
}

globals.content_views.register(SearchView, 'Search');
