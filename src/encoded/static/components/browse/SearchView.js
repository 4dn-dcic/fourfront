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

class InfoIcon extends React.Component{
    render() {
        if (!this.props.children) return null;
        return (
            <i className="icon icon-info-circle" data-tip={this.props.children}/>
        );
    }
}

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
export class ResultTableHandlersContainer extends React.Component {

    static defaultProps = {
        restrictions : {},
        searchBase : '',
        navigate : navigate
    }

    constructor(props){
        super(props);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.render = this.render.bind(this);
    }

    isTermSelected(term, facet){
        return !!(Filters.getUnselectHrefIfSelectedFromResponseFilters(term, facet, this.props.context.filters));
    }

    render(){
        return (
            <CustomColumnController defaultHiddenColumns={['status']}>
                <SortController href={this.props.searchBase || this.props.href} context={this.props.context} navigate={this.props.navigate}>
                    <ControlsAndResults {...this.props} isTermSelected={this.isTermSelected} onFilter={this.onFilter} />
                </SortController>
            </CustomColumnController>
        );
    }

}



class ControlsAndResults extends React.Component {

    static defaultProps = {
        restrictions : {}
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var context = this.props.context;
        var results = context['@graph'];
        var submission_facet_list = false;
        var facets = this.props.facets || context.facets;

        // get type of this object for getSchemaProperty (if type="Item", no tooltips)
        var thisType = 'Item', itemTypeForSchemas;
        var urlParts = url.parse(this.props.searchBase, true);
        if (typeof urlParts.query.type === 'string') { // Can also be array
            if (urlParts.query.type !== 'Item') {
                thisType = itemTypeForSchemas = urlParts.query.type;
            }
        }

        var thisTypeTitle = Schemas.getTitleForType(thisType);
        var abstractType = Schemas.getAbstractTypeForType(thisType);
        var hiddenColumns = (this.props.hiddenColumns || []).slice(0);
        if ((abstractType && abstractType !== thisType) || (!abstractType && thisType !== 'Item')) {
            hiddenColumns.push('@type');
        }
        // Excluded columns from schema.
        var schemaForType = Schemas.getSchemaForItemType(thisType);
        if (schemaForType && Array.isArray(schemaForType.excludedColumns) && _.every(schemaForType.excludedColumns, function(c){ return typeof c === 'string'; }) ){
            hiddenColumns = hiddenColumns.concat(schemaForType.excludedColumns);
        }
        
        var columnDefinitionOverrides = {};

        // Render out button and add to title render output for "Select" if we have a props.selectCallback from submission view
        // Also add the popLink/target=_blank functionality to links
        if (typeof this.props.selectCallback === 'function'){
            // this will hide data type facet for submissions view
            submission_facet_list = true;
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
                            onClearFilters={(evt)=>{
                                evt.preventDefault();
                                evt.stopPropagation();
                                var clearFiltersURL = (typeof context.clear_filters === 'string' && context.clear_filters) || null;
                                if (!clearFiltersURL) {
                                    console.error("No Clear Filters URL");
                                    return;
                                }
                                this.props.navigate(clearFiltersURL, {});
                            }}
                            submissionFacetList={submission_facet_list}
                        />
                </div> : null}
                    <div className={facets.length ? "col-sm-7 col-md-8 col-lg-9 expset-result-table-fix" : "col-sm-12 expset-result-table-fix"}>
                        <AboveTableControls
                            {..._.pick(this.props,
                                'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn', 'context',
                                'columns', 'selectedFiles', 'constantHiddenColumns', 'submissionBase'
                            )}
                            parentForceUpdate={this.forceUpdate.bind(this)}
                            columnDefinitions={CustomColumnSelector.buildColumnDefinitions(
                                SearchResultTable.defaultProps.constantColumnDefinitions,
                                context.columns || {},
                                columnDefinitionOverrides,
                                ['@type']
                            )}
                            showTotalResults={context.total}
                        />
                        <SearchResultTable
                            results={results}
                            columns={context.columns || {}}
                            renderDetailPane={(result, rowNumber, containerWidth)=>
                                <SearchResultDetailPane popLink={this.props.selectCallback ? true : false} result={result} />
                            }
                            hiddenColumns={hiddenColumns}
                            columnDefinitionOverrideMap={columnDefinitionOverrides}
                            href={this.props.href}
                            totalExpected={context.total}

                            sortBy={this.props.sortBy}
                            sortColumn={this.props.sortColumn}
                            sortReverse={this.props.sortReverse}

                        />
                    </div>
                </div>
            </div>
        );
    }

}

export default class SearchView extends React.Component {

    static defaultProps = {
        restrictions : {} // ???? what/how is this to be used? remove? use context.restrictions (if any)?
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render() {
        var context = this.props.context;
        var results = context['@graph'];
        var notification = context['notification'];
        var searchBase;
        // submissionBase is supplied when using Search through frontend
        // submission. this switch controls several things, including
        // pagination, clear filter, and types filter.
        if(this.props.submissionBase){
            searchBase = this.props.submissionBase || '';
        }else{
            searchBase = url.parse(this.props.href).search || '';
        }

        // Filter Facets down to abstract types only (if none selected) for Search. Do something about restrictions(?)
        var facets = context.facets.map((facet)=>{

            if (this.props.restrictions[facet.field] !== undefined) {
                facet = _.clone(facet);
                facet.restrictions = this.props.restrictions[facet.field];
                facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
            }

            // For search page, filter out Item types which are subtypes of an abstract type. Unless are on an abstract type.
            if (facet.field === 'type'){
                facet = _.clone(facet);
                var queryParts = url.parse(searchBase, true).query;
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

        return (
            <div className="search-page-container" ref="container">
                <AboveSearchTablePanel href={searchBase} context={context} />
                <ResultTableHandlersContainer {...this.props} facets={facets} searchBase={searchBase} navigate={this.props.navigate || navigate} />
            </div>
        );
    }
}

globals.content_views.register(SearchView, 'Search');
