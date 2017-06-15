'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import url from 'url';
import _ from 'underscore';
import * as globals from './globals';
import ReactTooltip from 'react-tooltip';
import { ajax, console, object, isServerSide, Filters, Schemas, layout, DateUtility, navigate } from './util';
import { Button, ButtonToolbar, ButtonGroup, Panel, Table, Collapse} from 'react-bootstrap';
import { Detail } from './item-pages/components';
import FacetList from './facetlist';
import { SortController, LimitAndPageControls, SearchResultTable } from './browse/components';


var Listing = function (result, schemas, selectCallback) {
    var props;
    if (result['@id']) {
        props = {'context': result,  'key': result['@id'], 'schemas': schemas, 'selectCallback': selectCallback};
    }
    if(props){
        return(<ResultTableEntry {...props} />);
    }else{
        return null;
    }

};

class ResultTableEntry extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            'open': false
        };
    }

    handleToggle = (e) => {
        e.preventDefault();
        this.setState({'open': !this.state.open});
    }

    handleSelect = (e) => {
        e.preventDefault();
        if(!this.props.selectCallback){
            return;
        }
        var processed_link = object.atIdFromObject(this.props.context);
        this.props.selectCallback(processed_link);
    }

    render() {
        var result = this.props.context || null;
        var item_type = result['@type'][0];
        var processed_link = object.atIdFromObject(result);
        var detailPop = false;
        if(this.props.selectCallback){
            detailPop = true;
        }
        return (
            <div className="result-table-result">
                <div className="row">
                    <div className="col-xs-9 col-md-4 col-lg-4 result-table-entry-div">
                        <Button bsSize="xsmall" className="icon-container pull-left" onClick={this.handleToggle}>
                            <i className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                        </Button>
                        {this.props.selectCallback ?
                            <Button bsSize="xsmall" bsStyle="success" className="icon-container pull-left" onClick={this.handleSelect}>
                                <i className={"icon icon-check"}></i>
                            </Button>
                            : null
                        }
                        {detailPop ?
                            <a href={processed_link} target="_blank">{result.display_title}</a>
                            : <a href={processed_link}>{result.display_title}</a>
                        }
                    </div>
                    <div className="col-xs-12 col-md-3 col-lg-3 result-table-entry-div">
                        {result.lab ? result.lab.display_title : ""}
                    </div>
                    <div className="col-xs-12 col-md-2 col-lg-2 result-table-entry-div">
                        {result.submitted_by ? result.submitted_by.display_title : ""}
                    </div>
                    <div className="col-xs-12 col-md-3 col-lg-3 result-table-entry-div">
                        {result.date_created ?
                            <DateUtility.LocalizedTime timestamp={result.date_created} formatType='date-time-md' dateTimeSeparator=" at " />
                        : null}
                    </div>
                </div>
                <Collapse in={this.state.open}>
                    <div>
                        <ResultDetail result={result} schemas={this.props.schemas} popLink={detailPop}/>
                    </div>
                </Collapse>
            </div>
        );
    }
}

// If the given term is selected, return the href for the term
export function getUnselectHrefIfSelectedFromResponseFilters(term, field, filters) {
    for (var filter in filters) {
        if (filters[filter]['field'] == field && filters[filter]['term'] == term) {
            return url.parse(filters[filter]['remove']).search;
        }
    }
    return null;
}

function buildSearchHref(unselectHref, field, term, searchBase){
    var href;
    if (unselectHref) {
        href = unselectHref;
    } else {
        var parts = url.parse(searchBase, true);
        var query = _.clone(parts.query);
        // format multiple filters on the same field
        if(field in query){
            if(Array.isArray(query[field])){
                query[field] = query[field].concat(term);
            }else{
                query[field] = [query[field]].concat(term);
            }
        }else{
            query[field] = term;
        }
        query = queryString.stringify(query);
        parts.search = query && query.length > 0 ? ('?' + query) : '';
        href = url.format(parts);
    }
    return href;
}

// Determine whether any of the given terms are selected
function countSelectedTerms(terms, field, filters) {
    var count = 0;
    for(var oneTerm in terms) {
        if(getUnselectHrefIfSelectedFromResponseFilters(terms[oneTerm].key, field, filters)) {
            count++;
        }
    }
    return count;
}


class TypeTerm extends React.Component {
    render() {
        var term = this.props.term['key'];
        var filters = this.props.filters;
        var total = this.props.total;
        return <Term {...this.props} title={term} filters={filters} total={total} />;
    }
}

class InfoIcon extends React.Component{
    render() {
        if (!this.props.children) return null;
        return (
            <i className="icon icon-info-circle" data-tip={this.props.children}/>
        );
    }
}


// the old Search tabular-style result display
class TabularTableResults extends React.Component{

    static propTypes = {
        results: PropTypes.array.isRequired,
        schemas: PropTypes.object,
    }

    constructor(props){
        super(props);
    }

    render(){
        var results = this.props.results;
        var schemas = this.props.schemas || {};
        // Buttons are included in title bar for correct spacing
        return(
            <div>
                <div className="result-table-header-row-container">
                    <div className="row hidden-xs hidden-sm result-table-header-row">
                        <div className="col-xs-9 col-md-4 col-lg-4 result-table-entry-div">
                            <Button style={{'visibility':'hidden','marginRight':'4px'}} bsSize="xsmall" className="icon-container pull-left" disabled={true}>
                                <i className="icon icon-plus"></i>
                            </Button>
                            {this.props.selectCallback ?
                                <Button style={{'visibility':'hidden','marginRight':'4px'}} bsSize="xsmall" className="icon-container pull-left" disabled={true}>
                                    <i className={"icon icon-check"}></i>
                                </Button>
                                : null
                            }
                            <div>Title</div>
                        </div>
                        <div className="col-xs-12 col-md-3 col-lg-3 result-table-entry-div">
                            <div>Lab</div>
                        </div>
                        <div className="col-xs-12 col-md-2 col-lg-2 result-table-entry-div">
                            <div>Submitter</div>
                        </div>
                        <div className="col-xs-12 col-md-3 col-lg-3 result-table-entry-div">
                            <div>Date Created</div>
                        </div>
                        <div className="col-xs-12 col-md-12 divider-column">
                            <div className="divider"/>
                        </div>
                    </div>
                </div>
                <div className="nav result-table row" id="result-table">
                    {results.length ?
                        results.map(function (result) {
                            if(this.props.selectCallback){
                                return Listing(result, schemas, this.props.selectCallback);
                            }else{
                                return Listing(result, schemas, null);
                            }
                        }.bind(this))
                    : null}
                </div>
            </div>
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

class ResultTableHandlersContainer extends React.Component {

    static defaultProps = {
        restrictions : {},
        searchBase : ''
    }

    constructor(props){
        super(props);
        this.onFilter = this.onFilter.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.render = this.render.bind(this);
    }

    onFilter(field, term, callback) {
        var unselectHrefIfSelected = getUnselectHrefIfSelectedFromResponseFilters(term, field, this.props.context.filters);

        var targetSearchHref = buildSearchHref(
            unselectHrefIfSelected,
            field, term, this.props.searchBase,
        );

        // Ensure only 1 type filter is selected at once. Unselect any other type= filters if setting new one.
        if (field === 'type'){
            if (!(unselectHrefIfSelected)){
                var parts = url.parse(targetSearchHref, true);
                if (Array.isArray(parts.query.type)){
                    var types = parts.query.type;
                    if (types.length > 1){
                        var queryParts = _.clone(parts.query);
                        delete queryParts[""]; // Safety
                        queryParts.type = encodeURIComponent(term); // Only 1 Item type selected at once.
                        var searchString = queryString.stringify(queryParts);
                        parts.search = searchString && searchString.length > 0 ? ('?' + searchString) : '';
                        targetSearchHref = url.format(parts);
                    }
                }
            }
        }

        this.props.navigate(targetSearchHref, {});
        setTimeout(callback, 100);
    }

    isTermSelected(term, facet){
        return !!(getUnselectHrefIfSelectedFromResponseFilters(term, facet, this.props.context.filters));
    }

    render(){

        // Preprocess Facets for Search
        var facets = this.props.context.facets.map((facet)=>{

            if (this.props.restrictions[facet.field] !== undefined) {
                facet = _.clone(facet);
                facet.restrictions = this.props.restrictions[facet.field];
                facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
            }

            if (facet.field === 'type'){ // For search page, filter out Item types which are subtypes of an abstract type. Unless are on an abstract type.
                facet = _.clone(facet);
                var queryParts = url.parse((this.props.searchBase || ''), true).query;
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
            <SortController href={this.props.searchBase || this.props.href} context={this.props.context} navigate={this.props.navigate}>
                <ControlsAndResults
                    {...this.props}
                    isTermSelected={this.isTermSelected}
                    onFilter={this.onFilter}
                    facets={facets}
                />
            </SortController>
        );
    }

}

class ResultDetailPane extends React.Component {

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(pastProps, pastState){
        if (this.props.open && !pastProps.open) ReactTooltip.rebuild();
    }

    render (){
        var { result, popLink } = this.props;
        return (
            <div>
                {result.description ?
                        <div className="data-row flexible-description-box result-table-result-heading">
                            {result.description}
                        </div>
                        : null}
                    { <div className="item-page-detail">
                        <h4 className="text-300">Details</h4>
                        <Detail context={result} open={false} popLink={popLink}/>
                    </div> }
            </div>
        );
    }
}

class ControlsAndResults extends React.Component {

    static defaultProps = {
        restrictions : {},
        searchBase : ''
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        const batchHubLimit = 100;
        var context = this.props.context;
        var results = context['@graph'];
        var total = context['total'];
        var batch_hub_disabled = total > batchHubLimit;
        var filters = context['filters'];
        var show_link;

        var facets = this.props.facets;

        // get type of this object for getSchemaProperty (if type="Item", no tooltips)
        var thisType = 'Item';
        var searchBits = this.props.searchBase.split(/[\?&]+/);
        var filteredBits = searchBits.filter(bit => bit.slice(0,5) === 'type=' && bit.slice(5,9) !== 'Item');
        if (filteredBits.length == 1){ // if multiple types, don't use any tooltips
            thisType = filteredBits[0].slice(5);
        }
        var urlParts = url.parse(this.props.searchBase, true);
        var itemTypeForSchemas = null;
        if (typeof urlParts.query.type === 'string') { // Can also be array
            if (urlParts.query.type !== 'Item') {
                itemTypeForSchemas = urlParts.query.type;
            }
        }

        var thisTypeTitle = Schemas.getTitleForType(thisType);
        var abstractType = Schemas.getAbstractTypeForType(thisType);
        var hiddenColumns = null;
        if ((abstractType && abstractType !== thisType) || (!abstractType && thisType !== 'Item')) {
            hiddenColumns = ['@type'];
        }

        var columnDefinitionOverrides = {};

        // Render out button and add to title render output for "Select" if we have a props.selectCallback from submission view
        if (typeof this.props.selectCallback === 'function'){
            columnDefinitionOverrides['display_title'] = {
                'minColumnWidth' : 120,
                'render' : (result, columnDefinition, props, width) => {
                    var currentTitleBlock = SearchResultTable.defaultColumnDefinitionMap.display_title.render(result, columnDefinition, props, width);
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

                {this.props.submissionBase ?
                    <h1 className="page-title">{thisTypeTitle + ' Selection'}</h1>
                    : <h1 className="page-title">{thisTypeTitle + ' Search'}</h1>
                }
                <h4 className="page-subtitle">Filter & sort results</h4>

                <div className="row">
                    {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList
                            className="with-header-bg"
                            facets={facets}
                            filters={filters}
                            onFilter={this.props.onFilter}
                            filterFacetsFxn={FacetList.filterFacetsForSearch}
                            isTermSelected={this.props.isTermSelected}
                            itemTypeForSchemas={itemTypeForSchemas}
                        />
                </div> : null}
                    <div className={facets.length ? "col-sm-7 col-md-8 col-lg-9 expset-result-table-fix" : "col-sm-12 expset-result-table-fix"}>
                        {/*
                        <div className="row above-chart-row clearfix">
                            <div className="col-sm-5 col-xs-12">
                                <h5 className='browse-title'>{results.length} of {total} results</h5>
                            </div>
                            <div className="col-sm-7 col-xs-12">
                                <LimitAndPageControls
                                    limit={this.props.limit}
                                    page={this.props.page}
                                    maxPage={this.props.maxPage}
                                    changingPage={this.props.changingPage}
                                    changePage={this.props.changePage}
                                    changeLimit={this.props.changeLimit}
                                />
                            </div>
                        </div>
                        */}
                        <SearchResultTable
                            results={results}
                            columns={context.columns || {}}
                            renderDetailPane={(result, rowNumber, containerWidth)=>
                                <ResultDetailPane popLink={this.props.selectCallback ? true : false} result={result} />
                            }
                            hiddenColumns={hiddenColumns}
                            columnDefinitionOverrideMap={columnDefinitionOverrides}
                            href={this.props.href}

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

export class Search extends React.Component {

    fullWidthStyle(){
        if (!this.refs || !this.refs.container) return null;
        //var marginLeft =

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
            searchBase = this.props.submissionBase;
        }else{
            searchBase = url.parse(this.props.href).search || '';
        }
        return (
            <div>
                <div className="browse-page-container" ref="container">
                    <ResultTableHandlersContainer {...this.props} searchBase={searchBase} navigate={this.props.navigate || navigate} />
                </div>
            </div>
        );
    }
}

globals.content_views.register(Search, 'Search');
