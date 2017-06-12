'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'querystring';
import _ from 'underscore';
import * as globals from './globals';
import { MenuItem, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } from 'react-bootstrap';
import * as store from '../store';
import FacetList, { ReduxExpSetFiltersInterface } from './facetlist';
import ExperimentsTable from './experiments-table';
import { isServerSide, expFxn, Filters, navigate, object } from './util';
import { FlexibleDescriptionBox } from './item-pages/components';
import { PageLimitSortController, LimitAndPageControls, ColumnSorterIcon } from './browse/components';

var expSetColumnLookup={
    // all arrays will be handled by taking the first item
    'replicate':{
        'Accession': 'accession',
        'Exp Type':'experiments_in_set.experiment_type',
        'Exps': '',
        'Organism': 'experiments_in_set.biosample.biosource.individual.organism.name',
        'Biosource': 'experiments_in_set.biosample.biosource_summary',
        'Enzyme': 'experiments_in_set.digestion_enzyme.name',
        'Modifications':'experiments_in_set.biosample.modifications_summary_short'

    },
    'other':[]
};

// Re-use for now for older data (temp, probably).
expSetColumnLookup.custom =
expSetColumnLookup['technical replicates'] =
expSetColumnLookup['biological replicates'] =
//expSetColumnLookup['analysis_set'] = // Relevant?
expSetColumnLookup.replicate;

var expSetAdditionalInfo={
    'replicate':{
        'Lab': 'lab.title',
        'Treatments':'biosample.treatments_summary',
        'Modifications':'biosample.modifications_summary',
    },
    'other':[]
};

class IndeterminateCheckbox extends React.Component {
    render(){
        var props = this.props;
        return(
            <input
                checked={this.props.checked}
                disabled={this.props.disabled}
                onChange={this.props.onChange}
                type="checkbox"
                ref={function(input) {if (input) {input.indeterminate = props.checked ? false : props.indeterminate;}}}
            />
        );
    }
}

export class ExperimentSetRow extends React.Component {

    static propTypes = {
        'addInfo'           : PropTypes.object.isRequired,
        'experimentSet'     : PropTypes.object.isRequired,
        'columns'           : PropTypes.object.isRequired,
        'expSetFilters'     : PropTypes.object,
        'targetFiles'       : PropTypes.instanceOf(Set),
        'rowNumber'         : PropTypes.number,
        'facets'            : PropTypes.array,
        'selectAllFilesInitially' : PropTypes.bool,
        'useAjax'           : PropTypes.bool
    }

    static defaultProps = {
        'selectAllFilesInitially' : true,
        'useAjax' : true
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.pairsAndFiles = this.pairsAndFiles.bind(this);
        this.allFileIDs = this.allFileIDs.bind(this);
        this.handleToggle = _.throttle(this.handleToggle.bind(this), 500);
        this.handleCheck = this.handleCheck.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            open : false,
            reallyOpen : false,
            selectedFiles : this.props.selectAllFilesInitially ? new Set(this.allFileIDs(this.props)) : new Set()
        };
    }

    componentWillReceiveProps(nextProps) {

        if(this.props.expSetFilters !== nextProps.expSetFilters){
            this.setState({
                selectedFiles: this.props.selectAllFilesInitially ? new Set(this.allFileIDs()) : new Set()
            });
        }

    }

    componentDidUpdate(pastProps, pastState){
        if (pastState.open === true && this.state.open === false && this.state.reallyOpen === true){
            setTimeout(()=>{
                this.setState({ reallyOpen : false });
            }, 300);
        }
    }

    /**
     * Combine file pairs and unpaired files into one array. 
     * Length will be file_pairs.length + unpaired_files.length, e.g. files other than first file in a pair are not counted.
     * 
     * Can always _.flatten() this or map out first file per pair.
     * 
     * @param {any} [props=this.props] 
     * @returns {Array.<Array>} e.g. [ [filePairEnd1, filePairEnd2], [...], fileUnpaired1, fileUnpaired2, ... ]
     * 
     * @memberof ExperimentSetRow
     */
    pairsAndFiles(props = this.props){
        return expFxn.listAllFilePairs(props.experimentSet.experiments_in_set).concat(
            expFxn.listAllUnpairedFiles(props.experimentSet.experiments_in_set)
        );
    }

    allFileIDs(props = this.props){
        return this.pairsAndFiles(props).map(function(f){
            if (Array.isArray(f)) return f[0].uuid;
            else return f.uuid;
        });
    }

    handleToggle(e) {        
        var willOpen = !this.state.open;
        var state = {
            open : willOpen
        };
        if (state.open){
            state.reallyOpen = true;
        }
        this.setState(state);
    }

    handleCheck(e) {
        var newChecked = e.target.checked;
        var selectedFiles;

        if (newChecked === false){
            selectedFiles = new Set();
        } else {
            selectedFiles = new Set(this.allFileIDs());
        }

        this.setState({
            selectedFiles : selectedFiles
        });
    }

    render() {

        // unused for now... when format selection is added back in, adapt code below:
        // var filteredFiles = [];
        // for(var i=0; i<files.length; i++){
        //     if(this.props.targetFiles.has(files[i].file_format)){
        //         filteredFiles.push(files[i].uuid);
        //     }
        // }

        var expSet = this.props.experimentSet;
        var expSetLink = object.atIdFromObject(expSet);

        function formattedColumns(){
            return _.keys(this.props.columns).map((key)=>{
                if(key === "Accession"){
                    return (
                        <td key={key+expSetLink} className="expset-table-cell mono-text">
                            <a className="expset-entry" href={expSetLink}>
                                {this.props.columns[key]}
                            </a>
                        </td>
                    );
                } else {
                    return(
                        <td key={key+expSetLink} className="expset-table-cell">
                            <div>
                                {this.props.columns[key]}
                            </div>
                        </td>
                    );
                }
            });
        }

        function formattedAdditionaInformation(){
            return (
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
                        { _.keys(this.props.addInfo).map((key)=>
                            <div key={key}>
                                <span className="expset-addinfo-key">{key}:</span>
                                <span className="expset-addinfo-val">{this.props.addInfo[key]}</span>
                            </div>
                        ) }
                        </div>
                    </div>
                </div>
            );
        }

        function experimentsTable(){
            /* Removed props.facets & props.expSetFilters as passing in props.passExperiments as experimentArray. */
            if (!this.state.open && !this.state.reallyOpen) return <div> Test </div>;
            var expTableWidth = null;

            if (this.refs.tbody && this.refs.tbody.offsetWidth){
                expTableWidth = this.refs.tbody.offsetWidth - 40;
            }

            return (
                <ExperimentsTable
                    key='experiments-table'
                    columnHeaders={[
                        { columnClass: 'file-detail', title : 'File Type'},
                        { columnClass: 'file-detail', title : 'File Info'}
                    ]}
                    experimentArray={expSet.experiments_in_set}
                    replicateExpsArray={expSet.replicate_exps}
                    experimentSetType={expSet.experimentset_type}
                    parentController={this}
                    useAjax={this.props.useAjax}
                    width={expTableWidth}
                    fadeIn={false}
                />
            );
        }

        var files = this.pairsAndFiles();

        var disabled = files.length === 0;
        var allFilesChecked = this.state.selectedFiles.size === files.length && !disabled;
        var indeterminate = this.state.selectedFiles.size > 0 && this.state.selectedFiles.size < files.length;

        return (
            <tbody data-key={expSetLink} className={"expset-section expset-entry-passed " + (this.state.open ? "open" : "closed")} data-row={this.props.rowNumber} ref="tbody">
                <tr className="expset-table-row">
                    <td className="expset-table-cell dropdown-button-cell">
                        <Button bsSize="xsmall" className="expset-button icon-container" onClick={this.handleToggle}>
                            <i className={"icon " + (this.state.open ? "icon-minus" : "icon-plus")}></i>
                        </Button>
                    </td>
                    <td className="expset-table-cell">
                        <div className="control-cell">
                            <IndeterminateCheckbox
                                checked={allFilesChecked}
                                indeterminate={indeterminate}
                                disabled={disabled}
                                onChange={this.handleCheck}
                            />
                        </div>
                    </td>
                    { formattedColumns.call(this) }
                </tr>
                <tr className="expset-addinfo-row" style={{ display : !(this.state.open || this.state.reallyOpen) ? 'none' : null }}>
                    <td className="expsets-table-hidden" colSpan={_.keys(this.props.columns).length + 2}>
                        <div className="experiment-set-info-wrapper">
                            <Collapse in={this.state.open} mountOnEnter>
                                <div>
                                    { formattedAdditionaInformation.call(this) }
                                    { experimentsTable.call(this) }
                                </div>
                            </Collapse>
                        </div>
                    </td>
                </tr>
            </tbody>
        );
    }

}


// Use the href to determine if this is the experiment setType selected.
// If multiple selected (i.e. forced url), use the first
function typeSelected(href) {
    var title;
    var splitHref = href.split(/[?\&]+/);
    for(var i=0; i < splitHref.length; i++){
        var hrefKey = splitHref[i].split("=");
        if(hrefKey.length === 2 && hrefKey[0]==="experimentset_type"){
            title = hrefKey[1].replace(/\+/g,' ');
            break;
        }
    }
    if(title){
        return title;
    }else{
        return "replicates"; // default to replicates
    }
}

/*
// find all used file formats in the given context graph
function findFormats(graph) {
    var formats = [];
    var stringified = JSON.stringify(graph);
    var split = stringified.split(/[,}{]+/);
    for (var i=0; i<split.length; i++){
        var trySplit = split[i].split(':');
        if (trySplit.length === 2 && trySplit[0].replace(/"/g, '') === "file_format" && !_.contains(formats, trySplit[1].replace(/"/g, ''))){
            formats.push(trySplit[1].replace(/"/g, ''));
        }
    }
    return formats;
}
*/
/*
function findFiles(fileFormats) {
    var checkboxes = document.getElementsByName('file-checkbox');
    var fileStats = {};
    fileStats['checked'] = new Set();
    fileStats['formats'] = {};
    fileStats['uuids'] = new Set();
    var i;
    for(i=0; i<checkboxes.length; i++){
        // ID in form checked (boolean), passed (boolean), format, uuid
        var splitID = checkboxes[i].id.split('~');
        // check to see if file has already been found
        if(fileStats['uuids'].has(splitID[3])){
            continue;
        }else{
            fileStats['uuids'].add(splitID[3]);
            if(splitID[1] === "true" && fileStats['formats'][splitID[2]]){
                fileStats['formats'][splitID[2]].add(splitID[3]);
            }else if(splitID[1] === "true"){
                fileStats['formats'][splitID[2]] = new Set();
                fileStats['formats'][splitID[2]].add(splitID[3]);
            }
            if(splitID[0] === "true"){
                fileStats['checked'].add(splitID[3]);
            }
        }
    }
    for(i=0; i<fileFormats.length; i++){
        if(!fileStats['formats'][fileFormats[i]]){
            fileStats['formats'][fileFormats[i]] = new Set();
        }
    }
    return fileStats;
}
*/

//Dropdown facet for experimentset_type
/*
export const DropdownFacet = createReactClass({
    getDefaultProps: function() {
        return {width: 'inherit'};
    },

    getInitialState: function(){
        return{
            toggled: false
        };
    },

    handleToggle: function(){
        this.setState({toggled: !this.state.toggled});
    },

    render: function() {
        var facet = this.props.facet;
        var title = facet['title'];
        var field = facet['field'];
        var total = facet['total'];
        var terms = facet['terms'];
        var typeTitle = typeSelected(this.props.searchBase);
        var dropdownTitle = <span><span>{typeTitle}</span>{this.state.toggled ? <span className="pull-right"># sets</span> : <span></span>}</span>;
        return (
            <div style={{width: this.props.width}}>
                <h5>{title}</h5>
                <DropdownButton open={this.state.toggled} title={dropdownTitle} id={`dropdown-experimentset_type`} onToggle={this.handleToggle}>
                    {terms.map(function (term, i) {
                        return(
                            <Term {...this.props} key={i} term={term} total={total} typeTitle={typeTitle}/>
                        );
                    }.bind(this))}
                </DropdownButton>
            </div>
        );
    }
});
*/


class ColumnSorter extends React.Component {

    render(){
        var { title, value, sortColumn, descend, sortByFxn } = this.props;
        return(
            <span>
                <span>{ title || value}</span>&nbsp;&nbsp;<ColumnSorterIcon value={value} currentSortColumn={sortColumn} descend={descend} sortByFxn={sortByFxn} />
            </span>
        );
    }

}

export class ResultTable extends React.Component {

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'sortReverse' : PropTypes.bool.isRequired,
        'sortColumn' : PropTypes.string,
        'sortBy' : PropTypes.func.isRequired,
        'expSetFilters' : PropTypes.object,

        fileStats : PropTypes.any,
        targetFiles : PropTypes.any
    }

    constructor(props){
        super(props);
        
        this.getTemplate = this.getTemplate.bind(this);
        this.formatColumnHeaders = this.formatColumnHeaders.bind(this);
        this.getAdditionaInfoSection = this.getAdditionaInfoSection.bind(this);
        this.getColumnValues = this.getColumnValues.bind(this);
        this.formatExperimentSetListings = this.formatExperimentSetListings.bind(this);
    }

    getTemplate(type, setType = null){ 
        if (!setType) setType = this.props.context['@graph'][0].experimentset_type;
        if (type === 'column'){
            return expSetColumnLookup[setType] ? expSetColumnLookup[setType] : expSetColumnLookup['other'];
        } else if (type === 'additional-info'){
            return expSetAdditionalInfo[setType] ? expSetAdditionalInfo[setType] : expSetAdditionalInfo['other'];
        }
    }

    formatColumnHeaders(columnTemplate){
        return _.pairs(columnTemplate).map((pair)=>
            <th key={pair[1]}>
                <ColumnSorter
                    descend={this.props.sortReverse}
                    sortColumn={this.props.sortColumn}
                    sortByFxn={this.props.sortBy}
                    title={pair[0]}
                    value={pair[1]}
                />
            </th>
        );
    }

    getAdditionaInfoSection(firstExp){
        // Experiment Set Row Add'l Info (Lab, etc.)
        var addInfoTemplate = this.getTemplate('additional-info');
        var addInfo = {};
        for (var i=0; i<Object.keys(addInfoTemplate).length;i++){
            var splitFilters = addInfoTemplate[Object.keys(addInfoTemplate)[i]].split('.');
            var valueProbe = firstExp;
            for (var j=0; j<splitFilters.length;j++){
                valueProbe = Array.isArray(valueProbe) ? valueProbe[0][splitFilters[j]] : valueProbe[splitFilters[j]];
            }
            addInfo[Object.keys(addInfoTemplate)[i]] = valueProbe;
        }

        return addInfo;
    }

    getColumnValues(experiment_set){
        var experimentArray = experiment_set.experiments_in_set;
        var columnTemplate = this.getTemplate('column');
        var columns = {};
        var firstExp = experimentArray[0]; // use only for replicates
        var accession = experiment_set.accession ? experiment_set.accession : "Experiment Set";

        columnTemplate = _.object(_.map(_.pairs(columnTemplate), function(p){
            var lookup = p[1];
            if (lookup.slice(0,19) === 'experiments_in_set.'){
                lookup = lookup.slice(19);
            }
            return [p[0], lookup];
        }));

        // Experiment Set Row Columns
        for (var i=0; i<Object.keys(columnTemplate).length;i++) {
            if(Object.keys(columnTemplate)[i] === 'Exps'){
                columns[Object.keys(columnTemplate)[i]] = experimentArray.length;
                continue;
            }else if(Object.keys(columnTemplate)[i] === 'Accession'){
                columns[Object.keys(columnTemplate)[i]] = accession;
                continue;
            }
            var splitFilters = columnTemplate[Object.keys(columnTemplate)[i]].split('.');
            var valueProbe = firstExp;
            try {
                for (var j=0; j<splitFilters.length;j++){
                    valueProbe = Array.isArray(valueProbe) ? valueProbe[0][splitFilters[j]] : valueProbe[splitFilters[j]];
                }
            } catch (e) {
                console.error("Could not find value for " + splitFilters.join('.') + " in exp", firstExp);
                valueProbe = "N/A";
            }
            columns[Object.keys(columnTemplate)[i]] = valueProbe;
        }

        return columns;
    }


    formatExperimentSetListings(facets = null){

        if (!Array.isArray(this.props.context['@graph']) || this.props.context['@graph'].length === 0) return null;
        
        var resultCount = 0;

        return this.props.context['@graph'].map((experiment_set, i) => { 
            var columns = this.getColumnValues(experiment_set);
            var addInfo = this.getAdditionaInfoSection(experiment_set.experiments_in_set[0]);

            return <ExperimentSetRow
                ref={(r)=>{
                    // Cache component instance.
                    this.experimentSetRows[experiment_set['@id']] = r;
                }}
                experimentSet={experiment_set}
                addInfo={addInfo}
                columns={columns}
                expSetFilters={this.props.expSetFilters}
                targetFiles={this.props.targetFiles}
                key={experiment_set['@id']}
                rowNumber={resultCount++}
                facets={facets || this.props.context.facets}
                fileStats={this.props.fileStats}
            />;
        });
    }

    render(){
        this.experimentSetRows = {};
        return(
            <Table className="expset-table expsets-table" condensed id="result-table">
                <thead>
                    <tr>
                        <th></th>
                        <th></th>
                        { this.formatColumnHeaders(this.getTemplate('column')) }
                    </tr>
                </thead>
                { this.formatExperimentSetListings() }
            </Table>
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
export class ResultTableContainer extends React.Component {

    static propTypes = {
        // Props' type validation based on contents of this.props during render.
        href            : PropTypes.string.isRequired,
        context         : PropTypes.object.isRequired,
        expSetFilters   : PropTypes.object.isRequired,
        fileFormats     : PropTypes.array,
        fileStats       : PropTypes.object,
        targetFiles     : PropTypes.instanceOf(Set)
    }

    static defaultProps = {
        'href'      : '/browse/',
        'debug'     : false
    }

    constructor(props){
        super(props);

        this.componentDidMount = this.componentDidMount.bind(this);
        this.totalResultCount = this.totalResultCount.bind(this);
        this.visibleResultCount = this.visibleResultCount.bind(this);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.setOverflowingRight = this.setOverflowingRight.bind(this);
        this.getSelectedFiles = this.getSelectedFiles.bind(this);
        this.isTermSelected = this.isTermSelected.bind(this);
        this.renderTable = this.renderTable.bind(this);
        this.render = this.render.bind(this);

        this.state = {
            overflowingRight : false,
        };

    }

    componentDidMount(){
        this.setOverflowingRight();
        var debouncedSetOverflowRight = _.debounce(this.setOverflowingRight, 300);
        window.addEventListener('resize', debouncedSetOverflowRight);
    }

    totalResultCount(){
        return (this.props.context && typeof this.props.context.total === 'number' && this.props.context.total) || 0;
    }

    visibleResultCount(){
        // account for empty expt sets
        var resultCount = (this.props.context && Array.isArray(this.props.context['@graph']) && this.props.context['@graph'].length) || 0;
        this.props.context['@graph'].map(function(r){
            if (r.experiments_in_set == 0) resultCount--;
        });
        return resultCount;
    }

    shouldComponentUpdate(nextProps, nextState){
        if (this.props.context !== nextProps.context) return true;
        if (this.props.page !== nextProps.page) return true;
        if (this.props.limit !== nextProps.limit) return true;
        if (this.props.changingPage !== nextProps.changingPage) return true;
        if (this.props.sortColumn !== nextProps.sortColumn) return true;
        if (this.props.sortReverse !== nextProps.sortReverse) return true;
        if (this.state.overflowingRight !== nextState.overflowingRight) return true;
        if (this.props.searchBase !== nextProps.searchBase) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        return false;
    }

    componentDidUpdate(pastProps, pastState){
        if (this.props.debug) { 
            console.log('ResultTableContainer updated.');
        }
    }

    setOverflowingRight(){
        if (isServerSide()) return;
        if (this.refs.expSetTableContainer){
            if (this.refs.expSetTableContainer.offsetWidth < this.refs.expSetTableContainer.scrollWidth){
                this.setState({ overflowingRight : true });
            } else {
                this.setState({ overflowingRight : false });
            }
        }
    }



    getSelectedFiles(){
        if (!this.experimentSetRows) return null;
        return _(this.experimentSetRows).chain()
            .pairs()
            .map(function(expRow){
                return [expRow[0], expRow[1].state.selectedFiles];
            })
            .object()
            .value();
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

    renderTable(){
        if (this.props.debug) console.log('Rendering ResultTableContainer.');

        //console.log('RENDER TABLE EXP LISTINGS', formattedExperimentSetListings);

        this.experimentSetRows = {}; // ExperimentSetRow instances stored here, keyed by @id, to get selectFiles from (?).
        return (
            <div className={
                "expset-result-table-fix col-sm-7 col-md-8 col-lg-9" +
                (this.state.overflowingRight ? " overflowing" : "")
            }>


                <div className="row above-chart-row">
                    <div className="col-sm-5 col-xs-12">
                        <h5 className='browse-title'>
                            { this.visibleResultCount() } of { this.totalResultCount() } Experiment Sets
                        </h5>
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
                <div className="row">
                    <div className="expset-table-container col-sm-12" ref="expSetTableContainer">
                        <ResultTable
                            context={this.props.context}
                            sortBy={this.props.sortBy}
                            sortColumn={this.props.sortColumn}
                            sortReverse={this.props.sortReverse}
                        />
                    </div>
                </div>
            </div>
        );
    }

    render() {
        var facets = this.props.context.facets;
        return (
            <div className="row">
                { facets.length > 0 ?
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <ReduxExpSetFiltersInterface
                            experimentSets={this.props.context['@graph']}
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
                { this.renderTable() }
            </div>
        );
    }

}


// var FileButton = React.createClass({

//     getInitialState: function(){
//         return{
//             selected: true
//         };
//     },

//     handleToggle: function(){
//         this.setState({
//             selected: !this.state.selected
//         });
//         this.props.fxn(this.props.format, this.state.selected);
//     },

//     render: function(){
//         var selected = this.state.selected ? "success" : "default";
//         return(
//             <Button className="expset-selector-button" bsStyle={selected} bsSize="xsmall" onClick={this.handleToggle}>{this.props.format} ({this.props.count})</Button>
//         );
//     }
// });


export class ControlsAndResults extends React.Component {

    constructor(props){
        super(props);
        this.getSelectedFiles = this.getSelectedFiles.bind(this);
        this.render = this.render.bind(this);
    }

    getSelectedFiles(){
        if (!this.refs.resultTableContainer) return null;
        return this.refs.resultTableContainer.getSelectedFiles();
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

                <PageLimitSortController href={this.props.href} context={this.props.context} navigate={this.props.navigate || navigate}>
                    <ResultTableContainer
                        ref="resultTableContainer"
                        context={this.props.context}
                        expSetFilters={this.props.expSetFilters}
                        session={this.props.session}
                        href={this.props.href}
                        schemas={this.props.schemas}
                    />
                </PageLimitSortController>

            </div>

        );
    }

}


//var ControlsAndResults = React.createClass({

    // TODO: ADJUST THIS!!! SELECTED FILES ARE NO LONGER GUARANTEED TO BE IN DOM!!!!!
    // They are now in ExperimentSetRows state. We need to grab state.selectedFiles from each.
    // We may in future store selectedFiles completely in Redux store or localStorage to allow a 'shopping cart' -like experience.

    //getInitialState: function(){
    //    var initStats = {};
    //    initStats['checked'] = new Set();
    //    initStats['formats'] = {};
    //    initStats['uuids'] = new Set();
    //    var defaultFormats = new Set();
    //    for(var i=0; i<this.props.fileFormats.length; i++){
    //        defaultFormats.add(this.props.fileFormats[i]);
    //    }
    //    return{
    //        fileStats: initStats,
    //        filesToFind: defaultFormats
    //    }
    //},

    //componentDidMount: function(){
    //    var currStats = findFiles(this.props.fileFormats);
    //    this.setState({
    //        fileStats: currStats
    //    });
    //    // update after initiating
    //    this.forceUpdate();
    //},

    //componentDidUpdate: function(nextProps, nextState){
    //    if (nextProps.expSetFilters !== this.props.expSetFilters || nextProps.context !== this.props.context){
    //        // reset file filters when changing set type
    //        var currStats = findFiles(this.props.fileFormats);
    //        if(this.state.fileStats.formats !== currStats.formats){
    //            this.setState({
    //                fileStats: currStats
    //            });
    //        }
    //    }
    //},

    /** 
     * DEPRECATED (probably), get current selected files sets via this.getSelectedFiles(), keyed by experiment set @id. 
     * Use _.flatten(_.values(this.getSelectedFiles())) to get single array of selected files, maybe also wrapped in a _.uniq() if files might be shared between expsets.
     */
    //downloadFiles: function(e){
    //    e.preventDefault();
    //    var currStats = findFiles(this.props.fileFormats);
    //    var checkedFiles = currStats['checked'] ? currStats['checked'] : new Set();
    //    console.log('____DOWNLOAD THESE ' + checkedFiles.size + ' FILES____');
    //    console.log(checkedFiles);
    //},

    /** DEPRECATED */
    //selectFiles: function(format, selected){
    //    var newSet = this.state.filesToFind;
    //    if(newSet.has(format) && selected){
    //        newSet.delete(format);
    //    }else if(!selected){
    //        newSet.add(format);
    //    }
    //    this.setState({
    //        filesToFind: newSet
    //    });
    //},

//});

export class Browse extends React.Component {

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
        //console.log(this.props.href, this.context.location_href, searchBase);
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
                    key="controlsAndResults"
                    //fileFormats={fileFormats}
                    href={this.props.href}
                    schemas={this.props.schemas}
                />

            </div>
        );
    }

}

globals.content_views.register(Browse, 'Browse');
