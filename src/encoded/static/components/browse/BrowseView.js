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
import { isServerSide, expFxn, Filters, navigate, object, layout } from './../util';
import {
    SearchResultTable, defaultColumnBlockRenderFxn, extendColumnDefinitions, defaultColumnDefinitionMap, columnsToColumnDefinitions,
    SortController, SelectedFilesController, CustomColumnController, CustomColumnSelector, AboveTableControls, ExperimentSetDetailPane,
    FacetList, onFilterHandlerMixin
} from './components';




export const browseTableConstantColumnDefinitions = extendColumnDefinitions([
    { 'field' : 'display_title', },
    { 'field' : 'experiments_in_set.experiment_type', },
    { 'field' : 'number_of_experiments', },
    { 'field' : 'number_of_files', },
    { 'field' : 'lab.display_title', },
    { 'field' : 'date_created',  },
    { 'field' : 'status',  }
], defaultColumnDefinitionMap);


export class ExperimentSetCheckBox extends React.Component {

    static isDisabled(files: Array){ return files.length === 0; }

    static isAllFilesChecked(selectedFiles: Array, allFiles: Array){ return selectedFiles.length === allFiles.length && !ExperimentSetCheckBox.isDisabled(allFiles); }

    static isIndeterminate(selectedFiles: Array, allFiles){ return selectedFiles.length > 0 && selectedFiles.length < allFiles.length; }

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
 * 
 * @export
 * @class ResultTableContainer
 * @extends {React.Component}
 */
class ResultTableContainer extends React.Component {

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
        'columnDefinitionOverrides' : {
            'experiments_in_set.biosample.biosource_summary' : {
                'title' : "Biosource"
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

                    
                    return <span>{ number_of_experiments }</span>;
                }
            },
            'number_of_files' : {
                'title' : "Files",
                'render' : function(expSet, columnDefinition, props, width){

                    var number_of_files = parseInt(expSet.number_of_files); // Doesn't exist yet at time of writing
                    
                    if (isNaN(number_of_files) || !number_of_files){
                        var number_of_experiments = parseInt(expSet.number_of_experiments);
                        if (isNaN(number_of_experiments) || !number_of_experiments){
                            number_of_experiments = (Array.isArray(expSet.experiments_in_set) && expSet.experiments_in_set.length) || null;
                        }
                        if (number_of_experiments || Array.isArray(expSet.processed_files)){
                            number_of_files = expFxn.fileCountFromExperimentSet(expSet, true, true);
                        } else {
                            number_of_files = 0;
                        }
                        
                    }
                    if (!number_of_files){
                        number_of_files = 0;
                    }
                    
                    return <span>{ number_of_files }</span>;
                }
            }
        },
        'constantHiddenColumns' : ['experimentset_type']
    }

    constructor(props){
        super(props);
        this.colDefOverrides = this.colDefOverrides.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.onFilter = onFilterHandlerMixin.bind(this);
        this.hiddenColumns = this.hiddenColumns.bind(this);
        this.render = this.render.bind(this);
    }
    
    /*
    shouldComponentUpdate(nextProps, nextState){
        if (this.props.selectedFiles !== nextProps.selectedFiles) return true;
        if (this.props.context !== nextProps.context) return true;
        if (this.props.page !== nextProps.page) return true;
        if (this.props.limit !== nextProps.limit) return true;
        if (this.props.changingPage !== nextProps.changingPage) return true;
        if (this.props.sortColumn !== nextProps.sortColumn) return true;
        if (this.props.sortReverse !== nextProps.sortReverse) return true;
        if (this.props.searchBase !== nextProps.searchBase) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        return false;
    }
    */

    isTermSelected(term, facet){
        return !!(Filters.getUnselectHrefIfSelectedFromResponseFilters(term, facet, this.props.context.filters));
    }

    colDefOverrides(){
        if (!this.props.selectedFiles) return this.props.columnDefinitionOverrides || null;
        var selectedFiles = this.props.selectedFiles;

        function getSelectedFileForSet(allFilesForSet){
            var max = allFilesForSet.length;
            var selected = [];
            for (var i = 0; i < max; i++){
                if (typeof selectedFiles[allFilesForSet[i]] !== 'undefined'){
                    selected.push(allFilesForSet[i]);
                }
            }
            return selected;
        }

        // Add Checkboxes
        return _.extend({}, this.props.columnDefinitionOverrides, {
            'display_title' : _.extend({}, defaultColumnDefinitionMap.display_title, {
                'widthMap' : { 'lg' : 210, 'md' : 210, 'sm' : 200 },
                'render' : (expSet, columnDefinition, props, width) => {
                    var origTitleBlock = defaultColumnDefinitionMap.display_title.render(expSet, columnDefinition, props, width);
                    var newChildren = origTitleBlock.props.children.slice(0);
                    var allFiles = expFxn.allFilesFromExperimentSet(expSet, true);
                    var allFileAccessionTriples = expFxn.filesToAccessionTriples(allFiles, true, true);

                    var allFilesKeyedByTriples = _.object(_.zip(allFileAccessionTriples, allFiles));
                    allFileAccessionTriples = allFileAccessionTriples.sort();

                    var selectedFilesForSet = getSelectedFileForSet(allFileAccessionTriples); //getSelectedFileForSet(allFileIDs);
                    newChildren[2] = newChildren[1];
                    newChildren[2] = React.cloneElement(newChildren[2], { 'className' : newChildren[2].props.className + ' mono-text' });
                    var isAllFilesChecked = ExperimentSetCheckBox.isAllFilesChecked(selectedFilesForSet, allFileAccessionTriples);
                    newChildren[1] = (
                        <ExperimentSetCheckBox
                            checked={isAllFilesChecked}
                            indeterminate={ExperimentSetCheckBox.isIndeterminate(selectedFilesForSet, allFileAccessionTriples)}
                            disabled={ExperimentSetCheckBox.isDisabled(allFileAccessionTriples)}
                            onChange={(evt)=>{
                                if (!isAllFilesChecked){
                                    var fileTriplesToSelect = _.difference(allFileAccessionTriples, selectedFilesForSet);
                                    this.props.selectFile(fileTriplesToSelect.map(function(triple){
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
                                    this.props.unselectFile(allFileAccessionTriples);
                                }
                            }}
                        />
                    );
                    return React.cloneElement(origTitleBlock, { 'children' : newChildren });
                }
            })
        });
    }

    hiddenColumns(){
        var cols = [];
        if (Array.isArray(this.props.constantHiddenColumns)){
            cols = cols.concat(this.props.constantHiddenColumns);
        }
        if (Array.isArray(this.props.hiddenColumns)){
            cols = cols.concat(this.props.hiddenColumns);
        }
        return _.uniq(cols);
    }

    render() {
        var context = this.props.context;
        var facets = context.facets;
        var results = context['@graph'];
        
        return (
            <div className="row">
                { facets.length > 0 ?
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <div className="above-results-table-row"/>{/* <-- temporary-ish */}
                        <FacetList
                            orientation="vertical"
                            facets={facets}
                            filters={context.filters}
                            className="with-header-bg"
                            isTermSelected={this.isTermSelected}
                            onFilter={this.onFilter}
                            itemTypeForSchemas="ExperimentSetReplicates"
                            session={this.props.session}
                            href={this.props.href || this.props.searchBase}
                            browseBaseState={this.props.browseBaseState}
                            schemas={this.props.schemas}
                            showClearFiltersButton={_.keys(Filters.currentExpSetFilters() || {}).length > 0}
                            onClearFilters={(evt)=>{
                                evt.preventDefault();
                                evt.stopPropagation();
                                this.props.navigate(navigate.getBrowseBaseHref(), { 'inPlace' : true, 'dontScrollToTop' : true });
                            }}
                        />
                    </div>
                    :
                    null
                }
                <div className="expset-result-table-fix col-sm-7 col-md-8 col-lg-9">
                    <AboveTableControls
                        {..._.pick(this.props,
                            'hiddenColumns', 'addHiddenColumn', 'removeHiddenColumn', 'context', 'href',
                            'columns', 'selectedFiles', 'constantHiddenColumns', 'selectFile', 'unselectFile', 'resetSelectedFiles'
                        )}
                        parentForceUpdate={this.forceUpdate.bind(this)}
                        columnDefinitions={CustomColumnSelector.buildColumnDefinitions(
                            browseTableConstantColumnDefinitions,
                            this.props.context.columns || {},
                            {},
                            this.props.constantHiddenColumns
                        )}
                        showSelectedFileCount
                    />
                    <SearchResultTable
                        results={results}
                        columns={this.props.context.columns || {}}
                        renderDetailPane={(result, rowNumber, containerWidth, toggleExpandCallback)=>
                            <ExperimentSetDetailPane
                                result={result}
                                containerWidth={containerWidth}
                                href={this.props.href || this.props.searchBase}
                                selectedFiles={this.props.selectedFiles}
                                selectFile={this.props.selectFile}
                                unselectFile={this.props.unselectFile}
                                toggleExpandCallback={toggleExpandCallback}
                                paddingWidth={47}
                            />
                        }
                        stickyHeaderTopOffset={-78}
                        constantColumnDefinitions={browseTableConstantColumnDefinitions}
                        hiddenColumns={this.hiddenColumns()}
                        columnDefinitionOverrideMap={this.colDefOverrides()}
                        href={this.props.href}
                        totalExpected={this.props.context.total}

                        sortBy={this.props.sortBy}
                        sortColumn={this.props.sortColumn}
                        sortReverse={this.props.sortReverse}

                    />
                </div>
            </div>
        );
    }

}





export default class BrowseView extends React.Component {

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'session' : PropTypes.bool,
        'schemas' : PropTypes.object,
        'href' : PropTypes.string.isRequired
    }

    static defaultProps = {
        'defaultHiddenColumns' : ['lab.display_title', 'date_created', 'status', 'number_of_files']
    }

    shouldComponentUpdate(nextProps, nextState){
        if (this.props.context !== nextProps.context) return true;
        if (this.props.session !== nextProps.session) return true;
        if (this.props.href !== nextProps.href) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        return false; // We don't care about props.expIncomplete props (other views might), so we can skip re-render.
    }

    componentDidMount(){
        var hrefParts = url.parse(this.props.href, true);
        if (!navigate.isValidBrowseQuery(hrefParts.query)){
            this.redirectToCorrectBrowseView(hrefParts);
        }
    }

    componentDidUpdate(pastProps){
        if (pastProps.href !== this.props.href){
            var hrefParts = url.parse(this.props.href, true);
            if (!navigate.isValidBrowseQuery(hrefParts.query)){
                this.redirectToCorrectBrowseView(hrefParts);
            }
        }
    }

    redirectToCorrectBrowseView(hrefParts = null){
        if (!hrefParts) hrefParts = url.parse(this.props.href, true);

        var context = this.props.context;

        // If no 4DN projects available in this query but there are External Items, redirect to external view instead.
        //var availableProjectsInResults = Array.isArray(context.facets) ? _.uniq(_.pluck(_.flatten(_.pluck(_.filter(context.facets, { 'field' : 'award.project' }), 'terms')), 'key')) : [];
        //if (this.props.browseBaseState === 'only_4dn' && availableProjectsInResults.indexOf('External') > -1 && availableProjectsInResults.indexOf('4DN') === -1){
        //    navigate.setBrowseBaseStateAndRefresh('all', this.props.href, context);
        //    return;
        //}

        var nextBrowseHref = navigate.getBrowseBaseHref();
        var expSetFilters = Filters.contextFiltersToExpSetFilters();
        if (_.keys(expSetFilters).length > 0){
            nextBrowseHref += navigate.determineSeparatorChar(nextBrowseHref) + Filters.expSetFiltersToURLQuery(expSetFilters);
        }
        if (typeof hrefParts.query.q === 'string'){
            nextBrowseHref += navigate.determineSeparatorChar(nextBrowseHref) + 'q=' + hrefParts.query.q;
        }
        navigate(nextBrowseHref, { 'inPlace' : true, 'dontScrollToTop' : true, 'replace' : true });
    }

    renderNoResultsView(currentHrefQuery = null){
        if (!currentHrefQuery) currentHrefQuery = url.parse(this.props.href, true).query;
        var context = this.props.context;
        var hrefParts = url.parse(this.props.href, true);
        var seeSearchResults = null;
        var strippedQuery = (_.omit(hrefParts.query, ..._.keys(navigate.getBrowseBaseParams()) ));
        if (_.keys(strippedQuery).length > 0){
            seeSearchResults = <li><a href={'/search/?' + object.serializeObjectToURLQuery(strippedQuery)}>Search all Items</a> (advanced).</li>;
        }

        // If no 4DN projects available in this query but there are External Items, redirect to external view instead.
        var projectFacetTerms = Array.isArray(context.facets) ? _.uniq(_.flatten(_.pluck(_.filter(context.facets, { 'field' : 'award.project' }), 'terms')), 'key') : [];
        var availableProjectsInResults = _.pluck(projectFacetTerms, 'key');
        var setsExistInExternalData = this.props.browseBaseState === 'only_4dn' && availableProjectsInResults.indexOf('External') > -1 && availableProjectsInResults.indexOf('4DN') === -1;
        var countExternalSets = setsExistInExternalData ? _.findWhere(projectFacetTerms, { 'key' : 'External' }).doc_count : 0;

        return (
            <div className="error-page">
                <div className="clearfix">
                    <hr/>
                    <h3 className="text-500 mb-0 mt-42">{ context.notification }</h3>
                    { countExternalSets > 0 ?
                        <h4 className="text-400 mt-3 mb-05">
                            However, there { countExternalSets > 1 ? 'are ' + countExternalSets + ' Experiment Sets' : 'is one Experiment Set' } available in External data.
                        </h4>
                    : null}
                    <ul className="mb-45 mt-1">
                        <li><a href={navigate.getBrowseBaseHref()}>Browse <strong>all 4DN Experiment Sets</strong></a>.</li>
                        { this.props.browseBaseState !== 'all' && countExternalSets > 0 ?
                            <li>
                                <a href="#" onClick={(e)=>{
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate.setBrowseBaseStateAndRefresh('all', this.props.href, context);
                                }}>Search <strong>all Experiment Sets</strong></a>, including External data.
                            </li>
                        : null }
                        { seeSearchResults }
                    </ul>
                    <hr/>
                </div>
            </div>
        );
    }

    render() {
        var { context, href, session, defaultHiddenColumns, browseBaseState, schemas } = this.props;
        //var fileFormats = findFormats(context['@graph']);
        var results = context['@graph'];
        var hrefParts = url.parse(href, true);
        var searchBase = hrefParts.search || '';

        // no results found!
        if(context.total === 0 && context.notification) return this.renderNoResultsView(hrefParts.query);

        // browse is only for experiment sets
        if(!navigate.isValidBrowseQuery(hrefParts.query)){
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
                    <CustomColumnController defaultHiddenColumns={defaultHiddenColumns}>
                        <SortController href={href} context={context} navigate={this.props.navigate || navigate}>
                            <ResultTableContainer browseBaseState={browseBaseState} session={session} schemas={schemas} />
                        </SortController>
                    </CustomColumnController>
                </SelectedFilesController>
            </div>
        );
    }

}

globals.content_views.register(BrowseView, 'Browse');
