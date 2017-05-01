'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var url = require('url');
var querystring = require('querystring');
var _ = require('underscore');
var globals = require('./globals');
var browse = module.exports;
var { MenuItem, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } = require('react-bootstrap');
var store = require('../store');
var FacetList = require('./facetlist');
import ExperimentsTable from './experiments-table';
var { isServerSide, expFxn, Filters } = require('./util');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./audit');
var { FlexibleDescriptionBox } = require('./experiment-common');

var expSetColumnLookup={
    // all arrays will be handled by taking the first item
    'replicate':{
        'Accession': 'accession',
        'Exp Type':'experiment_type',
        'Exps': '',
        'Organism': 'biosample.biosource.individual.organism.name',
        'Biosource': 'biosample.biosource_summary',
        'Enzyme': 'digestion_enzyme.name',
        'Modifications':'biosample.modifications_summary_short'

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

var IndeterminateCheckbox = React.createClass({
    render: function(){
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
});

var ExperimentSetRow = module.exports.ExperimentSetRow = React.createClass({

    propTypes : {
        addInfo : React.PropTypes.object,
        columns : React.PropTypes.object.isRequired,
        expSetFilters : React.PropTypes.object,
        experimentArray : React.PropTypes.array.isRequired,
        href : React.PropTypes.string,
        passExperiments : React.PropTypes.instanceOf(Set),
        targetFiles : React.PropTypes.instanceOf(Set),
        rowNumber : React.PropTypes.number,
        facets : React.PropTypes.array,
        selectAllFilesInitially : React.PropTypes.bool,
        useAjax : React.PropTypes.bool
    },

    getInitialState : function(){
        return {
            open : false,
            reallyOpen : false,
            selectedFiles : this.props.selectAllFilesInitially ? new Set(this.allFileIDs(this.props)) : new Set()
        };
    },

    componentWillReceiveProps: function(nextProps) {

        if(this.props.expSetFilters !== nextProps.expSetFilters){
            this.setState({
                selectedFiles: this.props.selectAllFilesInitially ? new Set(this.allFileIDs()) : new Set()
            });
        }

        // var newTargets = [];
        // for(var i=0; i<this.state.files.length; i++){
        //     if(nextProps.targetFiles.has(this.state.files[i].file_format)){
        //         newTargets.push(this.state.files[i].uuid);
        //     }
        // }
        // if(newTargets.length !== this.state.filteredFiles.length){
        //     this.setState({
        //         filteredFiles: newTargets
        //     });
        // }
    },

    componentDidUpdate: function(pastProps, pastState){
        if (pastState.open === true && this.state.open === false && this.state.reallyOpen === true){
            setTimeout(()=>{
                this.setState({ reallyOpen : false });
            }, 300);
        }
    },

    pairsAndFiles : function(props = this.props){
        // Combine file pairs and unpaired files into one array. [ [filePairEnd1, filePairEnd2], [...], fileUnpaired1, fileUnpaired2, ... ]
        // Length will be file_pairs.length + unpaired_files.length, e.g. files other than first file in a pair are not counted.
        return expFxn.listAllFilePairs(props.experimentArray).concat(
            expFxn.listAllUnpairedFiles(props.experimentArray)
        ); // (can always _.flatten() this or map out first file per pair, e.g. for targetFiles below)
    },

    allFileIDs : function(props = this.props){
        return this.pairsAndFiles(props).map(function(f){
            if (Array.isArray(f)) return f[0].uuid;
            else return f.uuid;
        });
    },

    handleToggle: _.throttle(function (e) {        
        var willOpen = !this.state.open;
        var state = {
            open : willOpen
        };
        if (state.open){
            state.reallyOpen = true;
        }
        this.setState(state);
    }, 500),

    handleCheck: function(e) {
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
    },

    render: function() {

        // unused for now... when format selection is added back in, adapt code below:
        // var filteredFiles = [];
        // for(var i=0; i<files.length; i++){
        //     if(this.props.targetFiles.has(files[i].file_format)){
        //         filteredFiles.push(files[i].uuid);
        //     }
        // }


        function formattedColumns(){
            return Object.keys(this.props.columns).map((key)=>{
                if(key === "Accession"){
                    return (
                        <td key={key+this.props.href} className="expset-table-cell mono-text">
                            <a className="expset-entry" href={this.props.href}>
                                {this.props.columns[key]}
                            </a>
                        </td>
                    );
                } else {
                    return(
                        <td key={key+this.props.href} className="expset-table-cell">
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
                                description={ this.props.description }
                                fitTo="self"
                                textClassName="text-medium"
                                dimensions={null}
                            />
                        </div>
                        <div className="col-sm-6 addinfo-properties-section">
                        { Object.keys(this.props.addInfo).map((key)=>
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
            if (!this.state.open) return <div> Test </div>;
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
                    experimentArray={[...this.props.passExperiments] /* Convert set to array */}
                    replicateExpsArray={this.props.replicateExpsArray}
                    experimentSetType={this.props.experimentSetType}
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
            <tbody data-key={this.props['data-key']} className={"expset-section expset-entry-passed " + (this.state.open ? "open" : "closed")} data-row={this.props.rowNumber} ref="tbody">
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
                    <td className="expsets-table-hidden" colSpan={Object.keys(this.props.columns).length + 2}>
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
});

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

var Term = browse.Term = React.createClass({
    contextTypes: {
        navigate: React.PropTypes.func
    },

    componentWillMount: function(){
        var fullHref = generateTypeHref('?type=ExperimentSetReplicate&', this.props.facet['field'], this.props.term['key']);
        if(this.props.typeTitle === this.props.term['key'] && fullHref !== this.props.searchBase){
            if(typeof document !== 'undefined'){
                this.context.navigate(fullHref);
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

//Dropdown facet for experimentset_type
var DropdownFacet = browse.DropdownFacet = React.createClass({
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



var ColumnSorter = React.createClass({

    sortClickFxn: function(e){
        e.preventDefault();
        var reverse = this.props.sortColumn === this.props.val;
        this.props.sortByFxn(this.props.val, reverse);
    },

    getDefaultProps : function(){
        return {
            descend : false
        };
    },

    iconStyle : function(style = 'descend'){
        if (style === 'descend'){
            return <i className="icon icon-sort-desc" style={{ transform: 'translateY(-1px)' }}></i>;
        } else if (style === 'ascend'){
            return <i className="icon icon-sort-asc" style={{ transform: 'translateY(2px)' }}></i>;
        }
    },

    icon : function(){
        var style = !this.props.descend && this.props.sortColumn === this.props.val ? 'ascend' : 'descend';
        var linkClass = this.props.sortColumn === this.props.val ? 'expset-column-sort-used' : 'expset-column-sort';
        return <a href="#" className={linkClass} onClick={this.sortClickFxn}>{ this.iconStyle(style) }</a>;
    },

    render: function(){
        return(
            <span>
                <span>{this.props.val}</span>&nbsp;&nbsp;{ this.icon() }
            </span>
        );
    }
});

var ResultTable = browse.ResultTable = React.createClass({

    propTypes : {
        // Props' type validation based on contents of this.props during render.
        href            : React.PropTypes.string.isRequired,
        context         : React.PropTypes.object.isRequired,
        expSetFilters   : React.PropTypes.object.isRequired,
        fileFormats     : React.PropTypes.array,
        fileStats       : React.PropTypes.object,
        targetFiles     : React.PropTypes.instanceOf(Set),
        onChange        : React.PropTypes.func,
        useAjax         : React.PropTypes.bool,
        navigate        : React.PropTypes.func.isRequired
    },

    getPageAndLimitFromURL : function(href){
        // Grab limit & page (via '(from / limit) + 1 ) from URL, if available.
        var urlParts = url.parse(href, true);
        var limit = parseInt(urlParts.query.limit || Filters.getLimit() || 25);
        var from  = parseInt(urlParts.query.from  || 0);
        if (isNaN(limit)) limit = 25;
        if (isNaN(from)) from = 0;
        
        return {
            'page' : (from / limit) + 1,
            'limit' : limit
        }
    },

    getInitialState: function(){
        // Grab limit & page (via '(from' / 'limit') + 1 ) from URL, if available.
        var pageAndLimit = this.getPageAndLimitFromURL(this.props.href);

        // Have Filters use our state.limit, until another component overrides.
        Filters.getLimit = function(){
            return (this && this.state && this.state.limit) || 25;
        }.bind(this);
        
        return _.extend({
            sortColumn: null,
            sortReverse: false,
            overflowingRight : false,
            // We need to get the below outta state once graph-ql is in; temporarily stored in state for performance.
            passedExperiments : 
                this.props.useAjax ? null :
                    ExperimentsTable.getPassedExperiments(
                        this.props.context['@graph'],
                        this.props.expSetFilters,
                        'missing-facets',
                        this.props.context.facets,
                        true
                    )
        }, this.getPageAndLimitFromURL(this.props.href));
    },

    getDefaultProps: function() {
        // 'restrictions' object migrated to facetlist.js > FacetList
        return {
            'href': '/browse/',
            'debug' : false,
            'useAjax' : true
        };
    },

    componentDidMount : function(){
        this.setOverflowingRight();
        var debouncedSetOverflowRight = _.debounce(this.setOverflowingRight, 300);
        window.addEventListener('resize', debouncedSetOverflowRight);
    },

    componentWillReceiveProps : function(newProps){
        var newState = {};

        // Update visible experiments via client-side filtering IF not using ajax.
        if (this.props.expSetFilters !== newProps.expSetFilters || this.props.context !== newProps.context){
            if (!this.props.useAjax){
                newState.passedExperiments = ExperimentsTable.getPassedExperiments(
                    newProps.context['@graph'],
                    newProps.expSetFilters,
                    'missing-facets',
                    newProps.context.facets,
                    true
                );
            }
        }

        // Update page re: href.
        if (this.props.href !== newProps.href){
            var pageAndLimit = this.getPageAndLimitFromURL(newProps.href);
            if (pageAndLimit.page !== this.state.page) newState.page = pageAndLimit.page;
            if (pageAndLimit.limit !== this.state.limit) newState.limit = pageAndLimit.limit;
        }

        if (Object.keys(newState).length > 0){
            this.setState(newState);
        }
    },

    changePage : _.throttle(function(page = null){
        
        if (typeof this.props.navigate !== 'function') throw new Error("Browse doesn't have props.navigate()");
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
            this.props.navigate(
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
    }, 250),

    changeLimit : _.throttle(function(limit = 25){
        
        if (typeof this.props.navigate !== 'function') throw new Error("Browse doesn't have props.navigate()");
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
            this.props.navigate(
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
    }, 250),

    shouldComponentUpdate : function(nextProps, nextState){
        if (this.props.context !== nextProps.context) return true;
        if (this.state.page !== nextState.page) return true;
        if (this.state.changingPage !== nextState.changingPage) return true;
        if (this.state.passedExperiments !== nextState.passedExperiments) return true;
        if (this.state.sortColumn !== nextState.sortColumn) return true;
        if (this.state.sortReverse !== nextState.sortReverse) return true;
        if (this.state.overflowingRight !== nextState.overflowingRight) return true;
        if (this.props.searchBase !== nextProps.searchBase) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        return false;
    },

    componentDidUpdate : function(pastProps, pastState){
        if (this.props.debug) { 
            console.log('ResultTable updated.');
        }
    },

    setOverflowingRight : function(){
        if (isServerSide()) return;
        if (this.refs.expSetTableContainer){
            if (this.refs.expSetTableContainer.offsetWidth < this.refs.expSetTableContainer.scrollWidth){
                this.setState({ overflowingRight : true });
            } else {
                this.setState({ overflowingRight : false });
            }
        }
    },

    sortBy: function(key, reverse) {
        if (reverse) {
            this.setState({
                sortColumn: key,
                sortReverse: !this.state.sortReverse
            });
        } else {
            this.setState({
                sortColumn: key,
                sortReverse: false
            });
        }

    },

    totalResultCount : function(){
        // account for empty expt sets
        var resultCount = this.props.context['@graph'].length;
        this.props.context['@graph'].map(function(r){
            if (r.experiments_in_set == 0) resultCount--;
        });
        return resultCount;
    },

    formatColumnHeaders : function(columnTemplate){
        return Object.keys(columnTemplate).map(function(key){
            return (
                <th key={key}>
                    <ColumnSorter
                        descend={this.state.sortReverse}
                        sortColumn={this.state.sortColumn}
                        sortByFxn={this.sortBy}
                        val={key}
                    />
                </th>
            );
        }.bind(this));
    },

    getTemplate : function(type){ 
        var setType = this.props.context['@graph'][0].experimentset_type;
        if (type === 'column'){
            return expSetColumnLookup[setType] ? expSetColumnLookup[setType] : expSetColumnLookup['other'];
        } else if (type === 'additional-info'){
            return expSetAdditionalInfo[setType] ? expSetAdditionalInfo[setType] : expSetAdditionalInfo['other'];
        }
    },

    getSelectedFiles : function(){
        if (!this.experimentSetRows) return null;
        return _(this.experimentSetRows).chain()
            .pairs()
            .map(function(expRow){
                return [expRow[0], expRow[1].state.selectedFiles];
            })
            .object()
            .value();
    },

    getColumnValues : function(experiment_set){
        var experimentArray = experiment_set.experiments_in_set;
        var columnTemplate = this.getTemplate('column');
        var columns = {};
        var firstExp = experimentArray[0]; // use only for replicates
        var accession = experiment_set.accession ? experiment_set.accession : "Experiment Set";

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
    },

    getAdditionaInfoSection : function(firstExp){
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
    },

    formatExperimentSetListings : function(facets = null){

        if (!Array.isArray(this.props.context['@graph']) || this.props.context['@graph'].length === 0) return null;
        
        var resultCount = 0;

        function buildRowComponent(experiment_set, passExps = null){

            var columns = this.getColumnValues(experiment_set);
            var addInfo = this.getAdditionaInfoSection(experiment_set.experiments_in_set[0]);

            return <ExperimentSetRow
                    ref={(r)=>{
                        // Cache component instance.
                        this.experimentSetRows[experiment_set['@id']] = r;
                    }}
                    addInfo={addInfo}
                    description={experiment_set.description}
                    columns={columns}
                    expSetFilters={this.props.expSetFilters}
                    experimentSetType={experiment_set.experimentset_type}
                    selectAllFilesInitially={true}
                    targetFiles={this.props.targetFiles}
                    href={experiment_set['@id']}
                    experimentArray={experiment_set.experiments_in_set}
                    replicateExpsArray={experiment_set.replicate_exps}
                    passExperiments={passExps || new Set(experiment_set.experiments_in_set) }
                    sort-value={this.state.sortColumn ? columns[this.state.sortColumn] : experiment_set['@id']}
                    key={experiment_set['@id']}
                    data-key={experiment_set['@id']}
                    rowNumber={resultCount++}
                    facets={facets || FacetList.adjustedFacets(this.props.context.facets)}
                    fileStats={this.props.fileStats}
                    useAjax={this.props.useAjax}
                />;
        }

        var sortFxn = function(a,b){
            a = a.props['sort-value'];
            b = b.props['sort-value'];
            if (this.state.sortReverse) {
                var b2 = b;
                b = a;
                a = b2;
            }
            if(!isNaN(a)){
                return (a - b);
            } else {
                //return(a.localeCompare(b));
                // Above doesn't assign consistently right values to letters/numbers, e.g. sometimes an int > a letter
                // Not sure how important.
                if (a < b) return -1;
                else if (a > b) return 1;
                else return 0;
            }
        }.bind(this);


        if (this.props.useAjax){
            return this.props.context['@graph']
                .map((expSet) => buildRowComponent.call(this, expSet))
                .sort(sortFxn);
        } else {
            return this.props.context['@graph']
                .filter(function(expSet){ return expSet.experiments_in_set.length > 0; })
                .map(function(expSet){
                    return { 
                        'intersection' : new Set(expSet.experiments_in_set.filter(x => this.state.passExperiments.has(x))),
                        'set' : expSet
                    };
                })
                .filter(function(expSetContainer){
                    return expSetContainer.intersection.size > 0;
                })
                .map((expSetContainer) => buildRowComponent.call(this, expSetContainer.set, expSetContainer.intersection))
                .sort(sortFxn);
        }
    },

    renderTable : function(){
        if (this.props.debug) console.log('Rendering ResultTable.');
        var formattedExperimentSetListings = this.formatExperimentSetListings();
        if (!formattedExperimentSetListings) return null;

        console.log('RENDER TABLE EXP LISTINGS', formattedExperimentSetListings);

        this.experimentSetRows = {}; // ExperimentSetRow instances stored here, keyed by @id, to get selectFiles from (?).
        var maxPage = Math.ceil(this.props.context.total / this.state.limit);

        var handleLimitSelect = function(eventKey, e){
            e.target.blur();
            return this.changeLimit(eventKey);
        }.bind(this);

        return (
            <div className={
                "expset-result-table-fix col-sm-7 col-md-8 col-lg-9" +
                (this.state.overflowingRight ? " overflowing" : "")
            }>


                <div className="row above-chart-row">
                    <div className="col-sm-5 col-xs-12">
                        <h5 className='browse-title'>
                            {formattedExperimentSetListings.length} of { this.props.context.total } Experiment Sets
                        </h5>
                    </div>
                    <div className="col-sm-7 col-xs-12">
                        
                        <ButtonToolbar className="pull-right">
                            
                                <DropdownButton title={
                                    <span className="text-small">
                                        <i className="icon icon-list icon-fw" style={{ fontSize: '0.825rem' }}></i> Show {this.state.limit}
                                    </span>
                                } id="bg-nested-dropdown">
                                    <MenuItem eventKey={10} onSelect={handleLimitSelect}>Show 10</MenuItem>
                                    <MenuItem eventKey={25} onSelect={handleLimitSelect}>Show 25</MenuItem>
                                    <MenuItem eventKey={50} onSelect={handleLimitSelect}>Show 50</MenuItem>
                                    <MenuItem eventKey={100} onSelect={handleLimitSelect}>Show 100</MenuItem>
                                    <MenuItem eventKey={250} onSelect={handleLimitSelect}>Show 250</MenuItem>
                                </DropdownButton>
                            
                            <ButtonGroup>
                                
                                <Button disabled={this.state.changingPage || this.state.page === 1} onClick={this.state.changingPage === true ? null : (e)=>{
                                    this.changePage(this.state.page - 1);
                                }}><i className="icon icon-angle-left icon-fw"></i></Button>
                            
                                <Button disabled style={{ minWidth : 120 }}>
                                    { this.state.changingPage === true ? 
                                        <i className="icon icon-spin icon-circle-o-notch" style={{ opacity : 0.5 }}></i>
                                        : 'Page ' + this.state.page + ' of ' + maxPage
                                    }
                                </Button>
                            
                                <Button disabled={this.state.changingPage || this.state.page === maxPage} onClick={this.state.changingPage === true ? null : (e)=>{
                                    this.changePage(this.state.page + 1);
                                }}><i className="icon icon-angle-right icon-fw"></i></Button>
                                
                            </ButtonGroup>
                        </ButtonToolbar>
                    </div>
                </div>
                <div className="row">
                    <div className="expset-table-container col-sm-12" ref="expSetTableContainer">
                        <Table className="expset-table expsets-table" condensed id="result-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th></th>
                                    { this.formatColumnHeaders(this.getTemplate('column')) }
                                </tr>
                            </thead>
                            { formattedExperimentSetListings }
                        </Table>
                    </div>
                </div>
            </div>
        );
    },

    render: function() {
        var facets = FacetList.adjustedFacets(this.props.context.facets);
        var ignoredFilters = FacetList.findIgnoredFiltersByMissingFacets(facets, this.props.expSetFilters);
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
                            ignoredFilters={ignoredFilters}
                            className="with-header-bg"
                            href={this.props.href}
                            navigate={this.props.navigate}
                            useAjax={true}
                            schemas={this.props.schemas}
                        />
                    </div>
                    :
                    null
                }
                { this.renderTable() }
            </div>
        );
    }
});

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
        if (!this.refs.resultTable) return null;
        return this.refs.resultTable.getSelectedFiles();
    },

    render: function(){
        var fileStats = this.state.fileStats;
        var targetFiles = this.state.filesToFind;
        var selectorButtons = this.props.fileFormats.map(function (format, idx) {
            var count = fileStats.formats[format] ? fileStats.formats[format].size : 0;
            return(
                <FileButton key={format} defaults={targetFiles} fxn={this.selectFiles} format={format} count={count}/>
            );
        }.bind(this));
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

                <ResultTable
                    ref="resultTable"
                    targetFiles={targetFiles}
                    fileStats={this.state.fileStats}
                    context={this.props.context}
                    expSetFilters={this.props.expSetFilters}
                    session={this.props.session}
                    href={this.props.href}
                    navigate={this.props.navigate}
                    useAjax={this.props.useAjax}
                    schemas={this.props.schemas}
                />

            </div>

        );
    }
});

var Browse = browse.Browse = React.createClass({

    contextTypes: {
        location_href: React.PropTypes.string,
        navigate: React.PropTypes.func
    },

    propTypes : {
        'context' : React.PropTypes.object.isRequired,
        'expSetFilters' : React.PropTypes.object,
        'session' : React.PropTypes.bool,
        'schemas' : React.PropTypes.object,
        'navigate' : React.PropTypes.func,
    },

    shouldComponentUpdate : function(nextProps, nextState){
        if (this.props.context !== nextProps.context) return true;
        if (this.props.expSetFilters !== nextProps.expSetFilters) return true;
        if (this.props.session !== nextProps.session) return true;
        if (this.props.href !== nextProps.href) return true;
        if (this.props.schemas !== nextProps.schemas) return true;
        return false; // We don't care about props.expIncomplete props (other views might), so we can skip re-render.
    },

    componentWillMount: function() {
        //var searchBase = url.parse(this.context.location_href).search || '';
    },

    render: function() {
        console.log('BROWSE PROPS', this.props);
        var context = this.props.context;
        var fileFormats = findFormats(context['@graph']);

        // no results found!
        if(context.total === 0 && context.notification){
            return <div className="error-page"><h4>{context.notification}</h4></div>
        }
        var results = context['@graph'];
        var searchBase = url.parse(this.props.href || this.context.location_href).search || '';

        // browse is only for experiment sets
        console.log(this.props.href, this.context.location_href, searchBase);
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
                    href={this.props.href || this.context.location_href}
                    onChange={this.context.navigate}
                    navigate={this.props.navigate || this.context.navigate}
                    useAjax={true}
                    schemas={this.props.schemas}
                />

            </div>
        );
    }
});

globals.content_views.register(Browse, 'Browse');
