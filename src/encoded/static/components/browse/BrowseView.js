'use strict';

// @flow

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'querystring';
import _ from 'underscore';
import * as globals from './../globals';
import { MenuItem, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } from 'react-bootstrap';
import * as store from './../../store';
import FacetList, { ReduxExpSetFiltersInterface } from './../facetlist';
import ExperimentsTable from './../experiments-table';
import { isServerSide, expFxn, Filters, navigate, object } from './../util';
import { FlexibleDescriptionBox } from './../item-pages/components';
import { SortController, SearchResultTable, defaultColumnBlockRenderFxn, extendColumnDefinitions, defaultColumnDefinitionMap } from './components';



export class ExperimentSetDetailPane extends React.Component {

    /**
     * Combine file pairs and unpaired files into one array. 
     * Length will be file_pairs.length + unpaired_files.length, e.g. files other than first file in a pair are not counted.
     * Can always _.flatten() this or map out first file per pair.
     * 
     * @param {any} [props=this.props] 
     * @returns {Array.<Array>} e.g. [ [filePairEnd1, filePairEnd2], [...], fileUnpaired1, fileUnpaired2, ... ]
     */
    static pairsAndFiles(expSet: Object){
        return expFxn.listAllFilePairs(expSet.experiments_in_set).concat(
            expFxn.listAllUnpairedFiles(expSet.experiments_in_set)
        );
    }

    static allFileIDs(expSet: Object){
        return ExperimentSetDetailPane.pairsAndFiles(expSet).map(function(f){
            if (Array.isArray(f)) return f[0].uuid;
            else return f.uuid;
        });
    }

    static propTypes = {
        'expSetFilters' : PropTypes.object.isRequired,
        'selectAllFilesInitially' : PropTypes.bool,
        'result' : PropTypes.object.isRequired,
        'containerWidth' : PropTypes.number.isRequired,
        'additionalDetailFields' : PropTypes.object.isRequired
    }

    static defaultProps = {
        'selectAllFilesInitially' : false,
        'additionalDetailFields' : {
            'Lab': 'lab.title',
            'Treatments':'biosample.treatments_summary',
            'Modifications':'biosample.modifications_summary'
        }
    }

    constructor(props){
        super(props);
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);
    }

    handleFileCheckboxChange(uuid){
        if (!this.props.selectedFiles || !this.props.selectFile || !this.props.unselectFile) return null;

        if (typeof this.props.selectedFiles[uuid] === 'undefined') {
            this.props.selectFile(uuid);
        } else {
            this.props.unselectFile(uuid);
        }
    }

    render(){
        var expSet = this.props.result;
        var addInfo = this.props.additionalDetailFields;

        return (
            <div className="experiment-set-info-wrapper">
                <div className="expset-addinfo">
                    <div className="row">
                        <div className="col-sm-6 addinfo-description-section">
                            <label className="text-500 description-label">Description</label>
                            <FlexibleDescriptionBox
                                description={ expSet.description }
                                fitTo="self"
                                textClassName="text-medium"
                                dimensions={null}
                            />
                        </div>
                        <div className="col-sm-6 addinfo-properties-section">
                        { _.keys(addInfo).map(function(title){
                            var value = SearchResultTable.sanitizeOutputValue(defaultColumnBlockRenderFxn(expSet, { 'field' : addInfo[title] })); // Uses object.getNestedProperty, pretty prints JSX. Replaces value probe stuff.
                            return (
                                <div key={title}>
                                    <span className="expset-addinfo-key">{ title }:</span>
                                    <span className="expset-addinfo-val">{ value || <small><em>N/A</em></small> }</span>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
                <ExperimentsTable
                    key='experiments-table'
                    columnHeaders={[
                        { columnClass: 'file-detail', title : 'File Type'},
                        { columnClass: 'file-detail', title : 'File Info'}
                    ]}
                    experimentArray={expSet.experiments_in_set}
                    replicateExpsArray={expSet.replicate_exps}
                    experimentSetType={expSet.experimentset_type}
                    width={this.props.containerWidth - 47 /* account for left padding of pane */}
                    fadeIn={false}
                    selectedFiles={this.props.selectedFiles}
                    handleFileCheckboxChange={this.handleFileCheckboxChange}
                />
            </div>
        );
    }

}



const browseTableConstantColumnDefinitions = extendColumnDefinitions([
    { 'field' : 'display_title', },
    { 'field' : 'experiments_in_set.experiment_type', },
    { 'field' : 'experiments_in_set', },
    { 'field' : 'lab.display_title', },
    { 'field' : 'date_created',  }
], defaultColumnDefinitionMap);


export class ExperimentSetCheckBox extends React.Component {

    static isDisabled(files: Array){ return files.length === 0; }

    static isAllFilesChecked(selectedFiles: Array, allFiles: Array){ return selectedFiles.length === allFiles.length && !ExperimentSetCheckBox.isDisabled(allFiles); }

    static isIndeterminate(selectedFiles: Array, allFiles){ return selectedFiles.length > 0 && selectedFiles.length < allFiles.length; }

    render(){
        var props = this.props;
        return(
            <input
                className="expset-checkbox"
                checked={props.checked}
                disabled={props.disabled}
                onChange={props.onChange}
                type="checkbox"
                ref={function(input) {if (input) {input.indeterminate = props.checked ? false : props.indeterminate;}}}
            />
        );
    }
}

/**
 * IN PROGRESS -- TODO: Decide if we should store "selectedFiles" or "unselectedFiles" (re: 'All files in facet selection are selected by default')
 * 
 * @export
 * @class SelectedFilesController
 * @extends {React.Component}
 */
export class SelectedFilesController extends React.Component {

    static defaultProps = {
        'initiallySelectedFiles' : []
    }

    constructor(props){
        super(props);
        this.selectFile = this.selectFile.bind(this);
        this.unselectFile = this.unselectFile.bind(this);
        this.state = {
            'selectedFiles' : {}
        };
    }

    selectFile(uuid: string){
        if (typeof this.state.selectedFiles[uuid] !== 'undefined'){
            throw new Error("File already selected!");
        }
        var newSet = _.clone(this.state.selectedFiles);
        newSet[uuid] = true;
        this.setState({ 'selectedFiles' : newSet });
    }

    unselectFile(uuid: string){
        if (typeof this.state.selectedFiles[uuid] === 'undefined'){
            throw new Error("File not in set!");
        }
        var newSet = _.clone(this.state.selectedFiles);
        delete newSet[uuid];
        this.setState({ 'selectedFiles' : newSet });
    }

    render(){
        return React.cloneElement(this.props.children, {
            'selectedFiles' : this.state.selectedFiles,
            'selectFile' : this.selectFile,
            'unselectFile' : this.unselectFile
        });
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
            }
        },
        'constantHiddenColumns' : ['experimentset_type']
    }

    constructor(props){
        super(props);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.colDefOverrides = this.colDefOverrides.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
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

    componentDidUpdate(pastProps, pastState){
        if (this.props.debug) { 
            console.log('ResultTableContainer updated.');
        }
    }

    isTermSelected(termKey, facetField, expsOrSets = 'sets'){
        var standardizedFieldKey = Filters.standardizeFieldKey(facetField, expsOrSets);
        if (
            this.props.expSetFilters[standardizedFieldKey] &&
            this.props.expSetFilters[standardizedFieldKey].has(termKey)
        ){
            return true;
        }
        return false;
    }

    /**
     * IN PROGRESS --- TODO: See SelectedFilesController
     */
    colDefOverrides(){
        if (!this.props.selectedFiles) return this.props.columnDefinitionOverrides || null;
        var allSelectedFileIDs = _.keys(this.props.selectedFiles).sort(); // ALL selectedFiles, need to filter down to set re: result expSet

        // Add Checkboxes
        return _.extend({}, this.props.columnDefinitionOverrides, {
            'display_title' : _.extend({}, defaultColumnDefinitionMap.display_title, {
                'render' : (expSet, columnDefinition, props, width) => {
                    var origTitleBlock = defaultColumnDefinitionMap.display_title.render(expSet, columnDefinition, props, width);
                    var newChildren = origTitleBlock.props.children.slice(0);
                    var allFiles = ExperimentSetDetailPane.allFileIDs(expSet).sort();
                    var selectedFilesForSet = _.intersection(allSelectedFileIDs, allFiles);
                    //var isAllFilesChecked
                    newChildren[2] = newChildren[1];
                    newChildren[1] = (
                        <ExperimentSetCheckBox
                            checked={ExperimentSetCheckBox.isAllFilesChecked(selectedFilesForSet, allFiles)}
                            indeterminate={ExperimentSetCheckBox.isIndeterminate(selectedFilesForSet, allFiles)}
                            disabled={ExperimentSetCheckBox.isDisabled(allFiles)}
                            onChange={(evt)=>{
                                console.log(evt, evt.target);
                            }}
                        />
                    );
                    return React.cloneElement(origTitleBlock, { 'children' : newChildren });
                }
            })
        });
    }

    render() {
        var facets = this.props.context.facets;
        var results = this.props.context['@graph'];
        return (
            <div className="row">
                { facets.length > 0 ?
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <ReduxExpSetFiltersInterface
                            experimentSets={results}
                            expSetFilters={this.props.expSetFilters}
                            facets={facets}
                            href={this.props.href}
                            schemas={this.props.schemas}
                            session={this.props.session}
                        >
                            <FacetList
                                orientation="vertical"
                                browseFilters={{
                                    filters : this.props.context.filters || null,
                                    clear_filters : this.props.context.clear_filters || null
                                }}
                                className="with-header-bg"
                                isTermSelected={this.isTermSelected}
                            />
                        </ReduxExpSetFiltersInterface>
                    </div>
                    :
                    null
                }
                <div className="expset-result-table-fix col-sm-7 col-md-8 col-lg-9">
                    <SearchResultTable
                        results={results}
                        columns={this.props.context.columns || {}}
                        renderDetailPane={(result, rowNumber, containerWidth)=>
                            <ExperimentSetDetailPane
                                result={result}
                                containerWidth={containerWidth}
                                expSetFilters={this.props.expSetFilters}
                                selectedFiles={this.props.selectedFiles}
                                selectFile={this.props.selectFile}
                                unselectFile={this.props.unselectFile}
                            />
                        }
                        stickyHeaderTopOffset={-78}
                        constantColumnDefinitions={browseTableConstantColumnDefinitions}
                        hiddenColumns={this.props.constantHiddenColumns}
                        columnDefinitionOverrideMap={this.colDefOverrides()}
                        href={this.props.href}

                        sortBy={this.props.sortBy}
                        sortColumn={this.props.sortColumn}
                        sortReverse={this.props.sortReverse}

                    />
                </div>
            </div>
        );
    }

}



class ControlsAndResults extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        //var fileStats = this.state.fileStats;
        //var targetFiles = this.state.filesToFind;
        //var selectorButtons = this.props.fileFormats.map(function (format, idx) {
        //    var count = fileStats.formats[format] ? fileStats.formats[format].size : 0;
        //    return(
        //        <FileButton key={format} defaults={targetFiles} fxn={this.selectFiles} format={format} count={count}/>
        //    );
        //}.bind(this));
        // var deselectButton = <Button className="expset-selector-button" bsSize="xsmall">Deselect</Button>;
        var downloadButton = <Button className="expset-selector-button" bsSize="xsmall" onClick={this.downloadFiles}>Download</Button>;
        return(
            <div>

                {/*<div className="row">
                    <div className="box expset-whole-selector col-sm-12 col-md-10 col-lg-9 col-md-push-2 col-lg-push-3">
                        <div className="col-sm-8 col-md-8 col-lg-8 expset-file-selector">
                            <div className="row">
                                <div className="expset-selector-header">
                                    <h5>For all experiments, display files of type:</h5>
                                </div>
                            </div>
                            <div className="row">
                                <ButtonToolbar>{selectorButtons}</ButtonToolbar>
                            </div>
                        </div>
                        <div className="col-sm-3 col-md-3 col-lg-3">
                            <div className="row">
                                <div className="expset-selector-header">
                                    <h5>For all selected files:</h5>
                                </div>
                            </div>
                            <div className="row">
                                <ButtonToolbar>
                                    {downloadButton}
                                </ButtonToolbar>
                            </div>
                        </div>
                    </div>
                </div>*/}

                <SelectedFilesController>
                    <SortController href={this.props.href} context={this.props.context} navigate={this.props.navigate || navigate}>
                        <ResultTableContainer
                            expSetFilters={this.props.expSetFilters}
                            session={this.props.session}
                            schemas={this.props.schemas}
                        />
                    </SortController>
                </SelectedFilesController>
            </div>

        );
    }

}



export default class BrowseView extends React.Component {

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'expSetFilters' : PropTypes.object,
        'session' : PropTypes.bool,
        'schemas' : PropTypes.object,
        'href' : PropTypes.string.isRequired
    }

    shouldComponentUpdate(nextProps, nextState){
        if (this.props.context !== nextProps.context) return true;
        if (this.props.expSetFilters !== nextProps.expSetFilters) return true;
        if (this.props.session !== nextProps.session) return true;
        if (this.props.href !== nextProps.href) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        return false; // We don't care about props.expIncomplete props (other views might), so we can skip re-render.
    }

    render() {
        //console.log('BROWSE PROPS', this.props);
        var context = this.props.context;
        //var fileFormats = findFormats(context['@graph']);

        // no results found!
        if(context.total === 0 && context.notification){
            return <div className="error-page"><h4>{context.notification}</h4></div>;
        }
        var results = context['@graph'];
        var searchBase = url.parse(this.props.href).search || '';

        // browse is only for experiment sets
        if(searchBase.indexOf('?type=ExperimentSetReplicate') === -1){
            return(
                <div className="error-page">
                    <h4>
                        <a href='/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=25&from=0'>
                            Only experiment sets may be browsed.
                        </a>
                    </h4>
                </div>
            );
        }

        return (
            <div className="browse-page-container">

                <h1 className="page-title">Data Browser</h1>
                <h4 className="page-subtitle">Filter & browse experiments</h4>

                <ControlsAndResults
                    {...this.props}
                    //fileFormats={fileFormats}
                    href={this.props.href}
                    schemas={this.props.schemas}
                />

            </div>
        );
    }

}

globals.content_views.register(BrowseView, 'Browse');
