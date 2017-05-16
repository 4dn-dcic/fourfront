'use strict';
var React = require('react');
import PropTypes from 'prop-types';
var ReactDOM = require('react-dom');
var url = require('url');
var querystring = require('querystring');
var _ = require('underscore');
var globals = require('./globals');
var browse = module.exports;
var { MenuItem, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } = require('react-bootstrap');
var store = require('../store');
import FacetList from './facetlist';
import ExperimentsTable from './experiments-table';
var { isServerSide, expFxn, Filters, navigate, object } = require('./util');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./audit');
var { FlexibleDescriptionBox } = require('./item-pages/components');

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
        }
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
        };

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

// generate href for one term only
// remove filter fields, apply these filters
function generateTypeHref(base, field, term) {
    var generated = base + field + '=' + encodeURIComponent(term).replace(/%20/g, '+') + '&limit=all';
    return generated;
}

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

function findFiles(fileFormats) {
    var checkboxes = document.getElementsByName('file-checkbox');
    var fileStats = {};
    fileStats['checked'] = new Set();
    fileStats['formats'] = {};
    fileStats['uuids'] = new Set();
    for(var i=0; i<checkboxes.length; i++){
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
    for(var i=0; i<fileFormats.length; i++){
        if(!fileStats['formats'][fileFormats[i]]){
            fileStats['formats'][fileFormats[i]] = new Set();
        }
    }
    return fileStats;
}

var Term = React.createClass({

    componentWillMount: function(){
        var fullHref = generateTypeHref('?type=ExperimentSetReplicate&', this.props.facet['field'], this.props.term['key']);
        if(this.props.typeTitle === this.props.term['key'] && fullHref !== this.props.searchBase){
            if(typeof document !== 'undefined'){
                navigate(fullHref);
            }
        }
    },

    render: function () {
        var term = this.props.term['key'];
        var count = this.props.term['doc_count'];
        var title = this.props.title || term;
        var field = this.props.facet['field'];
        var selected = term === this.props.typeTitle ? true : false;
        var fullHref = generateTypeHref('?type=ExperimentSetReplicate&', field, term);
        var href = fullHref;
        return (
            <div className="facet-entry-container" id={selected ? "selected" : null} key={term}>
                <MenuItem className="facet-entry" id={selected ? "selected" : null} href={href} onClick={href ? this.props.onFilter : null}>
                    <span className="facet-item">
                        {title}
                    </span>
                    <span className="pull-right facet-count">{count}</span>
                </MenuItem>
            </div>
        );
    }
});

export var Term;

//Dropdown facet for experimentset_type
var DropdownFacet = React.createClass({
    getDefaultProps: function() {
        return {width: 'inherit'};
    },

    getInitialState: function(){
        return{
            toggled: false
        };
    },

    handleToggle: function(){
        this.setState({toggled: !this.state.toggled})
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

export var DropdownFacet;


export class PageLimitSortController extends React.Component {

    static propTypes = {
        href            : React.PropTypes.string.isRequired,
        context         : React.PropTypes.object.isRequired,
    }

    /**
     * Grab limit & page (via '(from / limit) + 1 ) from URL, if available.
     * 
     * @static
     * @param {string} href - Current page href, with query.
     * @returns {Object} { 'page' : int, 'limit' : int }
     * 
     * @memberof PageLimitSortController
     */
    static getPageAndLimitFromURL(href){
        var urlParts = url.parse(href, true);
        var limit = parseInt(urlParts.query.limit || Filters.getLimit() || 25);
        var from  = parseInt(urlParts.query.from  || 0);
        if (isNaN(limit)) limit = 25;
        if (isNaN(from)) from = 0;
        
        return {
            'page' : (from / limit) + 1,
            'limit' : limit
        }
    }

    static getSortColumnAndReverseFromURL(href){
        var urlParts = url.parse(href, true);
        var sortParam = urlParts.query.sort;
        var reverse = false;
        if (typeof sortParam !== 'string') return {
            sortColumn : null,
            sortReverse : reverse
        };
        if (sortParam.charAt(0) === '-'){
            reverse = true;
            sortParam = sortParam.slice(1);
        }
        
        return {
            'sortColumn' : sortParam,
            'sortReverse' : reverse
        }
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.sortBy = this.sortBy.bind(this);
        this.changePage = _.throttle(this.changePage.bind(this), 250);
        this.changeLimit = _.throttle(this.changeLimit.bind(this), 250);

        // State

        // Have Filters use our state.limit, until another component overrides.
        Filters.getLimit = function(){
            return (this && this.state && this.state.limit) || 25;
        }.bind(this);

        this.state = _.extend(
            { changingPage : false },
            PageLimitSortController.getSortColumnAndReverseFromURL(props.href),
            PageLimitSortController.getPageAndLimitFromURL(props.href)
        );
    }

    componentWillReceiveProps(newProps){
        var newState = {};

        // Update page re: href.
        if (this.props.href !== newProps.href){
            var pageAndLimit = PageLimitSortController.getPageAndLimitFromURL(newProps.href);
            if (pageAndLimit.page !== this.state.page) newState.page = pageAndLimit.page;
            if (pageAndLimit.limit !== this.state.limit) newState.limit = pageAndLimit.limit;

            var { sortColumn, sortReverse } = PageLimitSortController.getSortColumnAndReverseFromURL(newProps.href);
            if (sortColumn !== this.state.sortColumn) newState.sortColumn = sortColumn;
            if (sortReverse !== this.state.sortReverse) newState.sortReverse = sortReverse;
        }

        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    sortBy(key, reverse) {

        if (typeof navigate !== 'function') throw new Error("No navigate function.");
        if (typeof this.props.href !== 'string') throw new Error("Browse doesn't have props.href.");

        var urlParts = url.parse(this.props.href, true);
        //var previousLimit = parseInt(urlParts.query.limit || this.state.limit || 25);
        //urlParts.query.limit = previousLimit + '';
        urlParts.query.from = '0';
        if (key){
            urlParts.query.sort = (reverse ? '-' : '' ) + key;
        } else {
            urlParts.query.sort = null;
        }
        urlParts.search = '?' + querystring.stringify(urlParts.query);
        var newHref = url.format(urlParts);

        this.setState({ 'changingPage' : true }, ()=>{
            navigate(
                newHref,
                { 'replace' : true },
                ()=>{
                    this.setState({ 
                        'sortColumn' : key,
                        'sortReverse' : reverse,
                        'changingPage' : false,
                        'page' : 1
                    }
                );
            });
        });

    }

    changePage(page = null){
        
        if (typeof navigate !== 'function') throw new Error("No navigate function");
        if (typeof this.props.href !== 'string') throw new Error("Browse doesn't have props.href.");

        page = Math.min( // Correct page, so don't go past # available or under 1.
            Math.max(page, 1),
            Math.ceil(this.props.context.total / this.state.limit)
        );

        var urlParts = url.parse(this.props.href, true);
        var previousFrom = parseInt(urlParts.query.from || 0);

        if ( // Check page from URL and state to see if same and if so, cancel navigation.
            page === this.state.page && 
            page === Math.ceil(previousFrom / this.state.limit) + 1
        ){
            console.warn("Already on page " + page);
            return;
        }

        if (typeof urlParts.query.limit === 'number'){
            urlParts.query.from = (urlParts.query.limit * (page - 1)) + '';
        } else {
            urlParts.query.from = (Filters.getLimit() * (page - 1)) + '';
        }
        urlParts.search = '?' + querystring.stringify(urlParts.query);
        this.setState({ 'changingPage' : true }, ()=>{
            navigate(
                url.format(urlParts),
                { 'replace' : true },
                ()=>{
                    this.setState({ 
                        'changingPage' : false,
                        'page' : page
                    }
                );
            });
        });
    }

    changeLimit(limit = 25){
        
        if (typeof navigate !== 'function') throw new Error("No navigate function.");
        if (typeof this.props.href !== 'string') throw new Error("Browse doesn't have props.href.");

        var urlParts = url.parse(this.props.href, true);
        var previousLimit = parseInt(urlParts.query.limit || 25);
        var previousFrom = parseInt(urlParts.query.from || 0);
        var previousPage = parseInt(Math.ceil(urlParts.query.from / previousLimit)) + 1;

        if ( // Check page from URL and state to see if same and if so, cancel navigation.
            limit === this.state.limit &&
            limit === previousLimit
        ){
            console.warn("Already have limit " + limit);
            return;
        }

        urlParts.query.limit = limit + '';
        urlParts.query.from = parseInt(Math.max(Math.floor(previousFrom / limit), 0) * limit);
        urlParts.search = '?' + querystring.stringify(urlParts.query);
        var newHref = url.format(urlParts);

        this.setState({ 'changingPage' : true }, ()=>{
            navigate(
                newHref,
                { 'replace' : true },
                ()=>{
                    this.setState({ 
                        'changingPage' : false,
                        'limit' : limit,
                    }
                );
            });
        });
    }

    render(){
        return(
            <div>
                { 
                    React.Children.map(this.props.children, (c)=>{
                        return React.cloneElement(c, _.extend({
                            'maxPage' : Math.ceil(this.props.context.total / this.state.limit),
                            'sortBy' : this.sortBy,
                            'changePage' : this.changePage,
                            'changeLimit' : this.changeLimit
                        }, this.state));
                    })
                }
            </div>
        );
    }


}

export class LimitAndPageControls extends React.Component {

    static propTypes = {
        'limit'         : PropTypes.number.isRequired,
        'page'          : PropTypes.number.isRequired,
        'maxPage'       : PropTypes.number.isRequired,
        'changingPage'  : PropTypes.bool,
        'changeLimit'   : PropTypes.func.isRequired,
        'changePage'    : PropTypes.func.isRequired
    }

    static defaultProps = {
        'changingPage' : false
    }

    constructor(props){
        super(props);
        this.handleLimitSelect = this.handleLimitSelect.bind(this);
        this.render = this.render.bind(this);
    }


    handleLimitSelect(eventKey, evt){
        evt.target.blur();
        return this.props.changeLimit(eventKey);
    }

    render(){
        var { page, limit, maxPage, changingPage, changePage, changeLimit } = this.props;
        return (
            <div>
                <ButtonToolbar className="pull-right">
                            
                    <DropdownButton title={
                        <span className="text-small">
                            <i className="icon icon-list icon-fw" style={{ fontSize: '0.825rem' }}></i> Show {limit}
                        </span>
                    } id="bg-nested-dropdown">
                        <MenuItem eventKey={10} onSelect={this.handleLimitSelect}>Show 10</MenuItem>
                        <MenuItem eventKey={25} onSelect={this.handleLimitSelect}>Show 25</MenuItem>
                        <MenuItem eventKey={50} onSelect={this.handleLimitSelect}>Show 50</MenuItem>
                        <MenuItem eventKey={100} onSelect={this.handleLimitSelect}>Show 100</MenuItem>
                        <MenuItem eventKey={250} onSelect={this.handleLimitSelect}>Show 250</MenuItem>
                    </DropdownButton>
                    
                    <ButtonGroup>
                        
                        <Button disabled={changingPage || page === 1} onClick={changingPage === true ? null : (e)=>{
                            changePage(page - 1);
                        }}><i className="icon icon-angle-left icon-fw"></i></Button>
                    
                        <Button disabled style={{ minWidth : 120 }}>
                            { changingPage === true ? 
                                <i className="icon icon-spin icon-circle-o-notch" style={{ opacity : 0.5 }}></i>
                                : 'Page ' + page + ' of ' + maxPage
                            }
                        </Button>
                    
                        <Button disabled={changingPage || page === maxPage} onClick={changingPage === true ? null : (e)=>{
                            changePage(page + 1);
                        }}><i className="icon icon-angle-right icon-fw"></i></Button>
                        
                    </ButtonGroup>

                </ButtonToolbar>
            </div>
        )
    }

}

class ColumnSorter extends React.Component {

    constructor(props){
        super(props);
        this.sortClickFxn = this.sortClickFxn.bind(this);
    }

    defaultProps = {
        descend : false
    }

    sortClickFxn(e){
        e.preventDefault();
        var reverse = this.props.sortColumn === this.props.val && !this.props.descend;
        this.props.sortByFxn(this.props.val, reverse);
    }

    iconStyle(style = 'descend'){
        if (style === 'descend')        return <i className="icon icon-sort-desc" style={{ transform: 'translateY(-1px)' }}/>;
        else if (style === 'ascend')    return <i className="icon icon-sort-asc" style={{ transform: 'translateY(2px)' }}/>;
    }

    icon(){
        var val = this.props.val;
        if (typeof val !== 'string' || val.length === 0) {
            return null;
        }
        var style = !this.props.descend && this.props.sortColumn === val ? 'ascend' : 'descend';
        var linkClass = this.props.sortColumn === val ? 'expset-column-sort-used' : 'expset-column-sort';
        return <a href="#" className={linkClass} onClick={this.sortClickFxn}>{ this.iconStyle(style) }</a>;
    }

    render(){
        return(
            <span>
                <span>{this.props.title || this.props.val}</span>&nbsp;&nbsp;{ this.icon() }
            </span>
        );
    }

}

export class ResultTable extends React.Component {

    static propTypes = {
        'context' : PropTypes.object.isRequired,
        'sortReverse' : PropTypes.bool.isRequired,
        'sortColumn' : PropTypes.string.isRequired,
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
                    val={pair[1]}
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
        href            : React.PropTypes.string.isRequired,
        context         : React.PropTypes.object.isRequired,
        expSetFilters   : React.PropTypes.object.isRequired,
        fileFormats     : React.PropTypes.array,
        fileStats       : React.PropTypes.object,
        targetFiles     : React.PropTypes.instanceOf(Set),
        useAjax         : React.PropTypes.bool
    }

    static defaultProps = {
        'href'      : '/browse/',
        'debug'     : false,
        'useAjax'   : true
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
                        <FacetList
                            urlPath={this.props.context['@id']}
                            experimentSetListJSON={this.props.context['@graph']}
                            orientation="vertical"
                            expSetFilters={this.props.expSetFilters}
                            browseFilters={{
                                filters : this.props.context.filters || null,
                                clear_filters : this.props.context.clear_filters || null
                            }}
                            facets={facets}
                            className="with-header-bg"
                            href={this.props.href}
                            useAjax={true}
                            schemas={this.props.schemas}
                            session={this.props.session}
                        />
                    </div>
                    :
                    null
                }
                { this.renderTable() }
            </div>
        );
    }

}


var FileButton = browse.FileButton = React.createClass({

    getInitialState: function(){
        return{
            selected: true
        };
    },

    handleToggle: function(){
        this.setState({
            selected: !this.state.selected
        });
        this.props.fxn(this.props.format, this.state.selected);
    },

    render: function(){
        var selected = this.state.selected ? "success" : "default";
        return(
            <Button className="expset-selector-button" bsStyle={selected} bsSize="xsmall" onClick={this.handleToggle}>{this.props.format} ({this.props.count})</Button>
        );
    }
});




var ControlsAndResults = browse.ControlsAndResults = React.createClass({

    // TODO: ADJUST THIS!!! SELECTED FILES ARE NO LONGER GUARANTEED TO BE IN DOM!!!!!
    // They are now in ExperimentSetRows state. We need to grab state.selectedFiles from each.
    // We may in future store selectedFiles completely in Redux store or localStorage to allow a 'shopping cart' -like experience.

    getInitialState: function(){
        var initStats = {};
        initStats['checked'] = new Set();
        initStats['formats'] = {};
        initStats['uuids'] = new Set();
        var defaultFormats = new Set();
        for(var i=0; i<this.props.fileFormats.length; i++){
            defaultFormats.add(this.props.fileFormats[i]);
        }
        return{
            fileStats: initStats,
            filesToFind: defaultFormats
        }
    },

    componentDidMount: function(){
        var currStats = findFiles(this.props.fileFormats);
        this.setState({
            fileStats: currStats
        });
        // update after initiating
        this.forceUpdate();
    },

    componentDidUpdate: function(nextProps, nextState){
        if (nextProps.expSetFilters !== this.props.expSetFilters || nextProps.context !== this.props.context){
            // reset file filters when changing set type
            var currStats = findFiles(this.props.fileFormats);
            if(this.state.fileStats.formats !== currStats.formats){
                this.setState({
                    fileStats: currStats
                });
            }
        }
    },

    deselectFiles: function(e){
        e.preventDefault();
    },

    /** 
     * DEPRECATED (probably), get current selected files sets via this.getSelectedFiles(), keyed by experiment set @id. 
     * Use _.flatten(_.values(this.getSelectedFiles())) to get single array of selected files, maybe also wrapped in a _.uniq() if files might be shared between expsets.
     */
    downloadFiles: function(e){
        e.preventDefault();
        var currStats = findFiles(this.props.fileFormats);
        var checkedFiles = currStats['checked'] ? currStats['checked'] : new Set();
        console.log('____DOWNLOAD THESE ' + checkedFiles.size + ' FILES____');
        console.log(checkedFiles);
    },

    /** DEPRECATED */
    selectFiles: function(format, selected){
        var newSet = this.state.filesToFind;
        if(newSet.has(format) && selected){
            newSet.delete(format);
        }else if(!selected){
            newSet.add(format);
        }
        this.setState({
            filesToFind: newSet
        });
    },

    getSelectedFiles : function(){
        if (!this.refs.resultTableContainer) return null;
        return this.refs.resultTableContainer.getSelectedFiles();
    },

    render: function(){
        var fileStats = this.state.fileStats;
        var targetFiles = this.state.filesToFind;
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

                <PageLimitSortController href={this.props.href} context={this.props.context}>
                    <ResultTableContainer
                        ref="resultTableContainer"
                        targetFiles={targetFiles}
                        fileStats={this.state.fileStats}
                        context={this.props.context}
                        expSetFilters={this.props.expSetFilters}
                        session={this.props.session}
                        href={this.props.href}
                        useAjax={this.props.useAjax}
                        schemas={this.props.schemas}
                    />
                </PageLimitSortController>

            </div>

        );
    }
});

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
        var fileFormats = findFormats(context['@graph']);

        // no results found!
        if(context.total === 0 && context.notification){
            return <div className="error-page"><h4>{context.notification}</h4></div>
        }
        var results = context['@graph'];
        var searchBase = url.parse(this.props.href || this.context.location_href).search || '';

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
                    fileFormats={fileFormats}
                    href={this.props.href}
                    useAjax={true}
                    schemas={this.props.schemas}
                />

            </div>
        );
    }

}

globals.content_views.register(Browse, 'Browse');
