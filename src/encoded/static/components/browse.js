'use strict';
var React = require('react');
var queryString = require('query-string');
var url = require('url');
var _ = require('underscore');
var globals = require('./globals');
var browse = module.exports;
var audit = require('./audit');
var Panel = require('react-bootstrap').Panel;
var Button = require('react-bootstrap').Button;
var Checkbox = require('react-bootstrap').Checkbox;
var ButtonToolbar = require('react-bootstrap').ButtonToolbar;
var DropdownButton = require('react-bootstrap').DropdownButton;
var MenuItem = require('react-bootstrap').MenuItem;
var store = require('../store');
var AuditIndicators = audit.AuditIndicators;
var AuditDetail = audit.AuditDetail;
var AuditMixin = audit.AuditMixin;
var fileFormats = ["bam","bai","bed","bigBed","bigWig","fasta","fastq","gff","gtf","hdf5","tsv","csv","tar","tagAlign","wig"];


var ExperimentSet = module.exports.ExperimentSet = React.createClass({
    getInitialState: function() {
    	return {
            open: false,
            checked: false
        };
    },

    handleToggle: function (e) {
        e.preventDefault();
        this.setState({
  		    open: !this.state.open,
  	    });
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    render: function() {
        var experimentArray = this.props.experimentArray;
        var childExperiments = experimentArray.map(function (experiment) {
            if(this.props.passExperiments.has(experiment)){
                return (
                    <ExperimentSublist targetFiles={this.props.targetFiles} parentChecked={this.state.checked} passed={true} result={experiment} key={'a' + experiment.uuid} />
                );
            }else{
                return (
                    <ExperimentSublist targetFiles={this.props.targetFiles} parentChecked={this.state.checked} passed={false} result={experiment} key={'b' + experiment.uuid} />
                );
            }
        }.bind(this));
        childExperiments = sortByKey(childExperiments);
        return (
            <li>
                <div className="clearfix">
                    <div className="accession">
                        <Button bsSize="xsmall" className="expset-button" onClick={this.handleToggle}>{this.state.open ? "-" : "+"}</Button>
                        <Checkbox checked={this.state.checked} className='expset-checkbox' onChange={this.handleCheck}/>
                        <a className={this.props.passed} href={this.props.href}>
                            {this.props.title}
                        </a>
                        <span className='expset-hits pull-right'>{this.props.exptHits}</span>
                    </div>
                    <Panel className="expset-panel" collapsible expanded={this.state.open}>
                        {childExperiments}
                    </Panel>
                </div>
            </li>
        );
    }
});

var ExperimentSublist = React.createClass({

    getInitialState: function() {
    	return {
            open: false,
            checked: false
        };
    },

    handleToggle: function (e) {
        e.preventDefault();
        this.setState({
  		  open: !this.state.open
  	  });
    },

    // update checkboxes if parent has changed
    componentWillReceiveProps: function(nextProps) {
        if(nextProps !== this.props){
            this.setState({
                checked: nextProps.parentChecked
            });
        }
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    render: function() {
        var result = this.props.result;
        // get files from "files" or "filesets[idx].files_in_set"
        var files;
        if(result.files){
            files = result.files;
        }else if(result.filesets){
            var tempFiles = [];
            for(var i=0; i<result.filesets.length; i++){
                if(result.filesets[i].files_in_set){
                    tempFiles = tempFiles.concat(result.filesets[i].files_in_set);
                }
            }
            files = tempFiles;
        }else{
            files = [];
        }
        var passed = "expset-entry";
        if(this.props.passed){
            passed += " expset-entry-passed";
        }
        var childFiles = files.map(function (file) {
            return (
                <FileSublist targetFiles={this.props.targetFiles} key={file.accession} parentChecked={this.state.checked} file={file} passed={this.props.passed}/>
            );
        }.bind(this));
        var fileHits = "(" + childFiles.length + " of " + files.length +" files)";
        return(
            <div className='expset-sublist-entry' key={result.accession}>
                <Button bsSize="xsmall" className="expset-button" onClick={this.handleToggle}>{this.state.open ? "-" : "+"}</Button>
                <Checkbox checked={this.state.checked} className='expset-checkbox expset-checkbox-sub' onChange={this.handleCheck}/>
                <a className={passed} href={result['@id'] || ''}>
                    {result.experiment_summary || result.accession || result.uuid || result['@id']}
                </a>
                <span className='expset-hits'>{fileHits}</span>
                <Panel className="expset-panel" collapsible expanded={this.state.open}>
                    {childFiles}
                </Panel>
            </div>
        );
    }
});

var FileSublist = React.createClass({
    getInitialState: function() {
        return {
            checked: false
        };
    },

    // update checkboxes if parent has changed
    componentWillReceiveProps: function(nextProps) {
        if(nextProps !== this.props){
            if(nextProps.targetFiles[this.props.file.file_format] && nextProps.targetFiles[this.props.file.file_format].has(this.props.file.uuid)){
                this.setState({
                    checked: true
                });
            }else{
                this.setState({
                    checked: nextProps.parentChecked
                });
            }
        }
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    render: function() {
        var isChecked = this.state.checked;
        var fileID = isChecked + "~" + this.props.passed + "~" + this.props.file.file_format + "~" + this.props.file.uuid;
        return(
            <div className="expset-file">
                <Checkbox checked={this.state.checked} name="file-checkbox" id={fileID} className='expset-checkbox expset-checkbox-sub' onChange={this.handleCheck}/>
                <a href={this.props.file['@id'] || ''}>
                    {this.props.file.file_format || this.props.file.accession || this.props.file.uuid || this.props.file['@id']}
                </a>
            </div>
        );
    }
});

function sortByKey(array) {
    return array.sort(function(a, b) {
        var keyA = a.key.toLowerCase();
        var keyB = b.key.toLowerCase();
        return ((keyA < keyB) ? -1 : ((keyA > keyB) ? 1 : 0));
    });
}

// Find the component experiments in an experiment set that match the current filters
function siftExperiments(graph, filters, ignored=null, field=null, term=null) {
    var passExperiments = new Set();
    // Start by adding all applicable experiments to set
    for(var i=0; i < graph.length; i++){
        var experiment_set = graph[i];
        if(experiment_set.experiments_in_set){
            var experiments = experiment_set.experiments_in_set;
            for(var j=0; j < experiments.length; j++){
                passExperiments.add(experiments[j]);
            }
        }
    }
    // search through currently selected expt filters
    var filterKeys = Object.keys(filters);
    if (field && !_.contains(filterKeys, field)){
        filterKeys.push(field);
    }
    for(let experiment of passExperiments){
        var eliminated = false;
        for(var k=0; k < filterKeys.length; k++){
            var refinedFilterSet;
            if(ignored && ignored[filterKeys[k]] && ignored[filterKeys[k]].size > 0){
                // remove the ignored filters by using the difference between sets
                var difference = new Set([...filters[filterKeys[k]]].filter(x => !ignored[filterKeys[k]].has(x)));
                refinedFilterSet = difference;
            }else{
                refinedFilterSet = filters[filterKeys[k]];
            }
            if(eliminated){
                break;
            }
            var valueProbe = experiment;
            var filterSplit = filterKeys[k].split('.');
            for(var l=0; l < filterSplit.length; l++){
                if(filterSplit[l] === 'experiments_in_set'){
                    continue;
                }
                // for now, use first item in an array (for things such as biosamples)
                if(Array.isArray(valueProbe)){
                    valueProbe = valueProbe[0];
                }
                if(valueProbe[filterSplit[l]]){
                    valueProbe = valueProbe[filterSplit[l]];
                    if(l === filterSplit.length-1){ // last level of filter
                        if(field && filterKeys[k] === field){
                            if(valueProbe !== term){
                                eliminated = true;
                                passExperiments.delete(experiment);
                            }
                        }else if(refinedFilterSet.size > 0 && !refinedFilterSet.has(valueProbe)){ // OR behavior if not active field
                            eliminated = true;
                            passExperiments.delete(experiment);
                        }
                    }
                }else{
                    if(filterKeys[k] !== field && refinedFilterSet.size > 0){
                        eliminated = true;
                        passExperiments.delete(experiment);
                        break;
                    }else{
                        break;
                    }
                }
            }
        }
    }
    return passExperiments;
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
        return "biological replicates"; // default to biological replicates
    }
}

// generate href for one term only
// remove filter fields, apply these filters
function generateTypeHref(base, field, term) {
    var generated = base + field + '=' + encodeURIComponent(term).replace(/%20/g, '+');
    return generated;
}

function findFiles() {
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

var ExpTerm = browse.ExpTerm = React.createClass({

    getInitialState: function() {
        return {
            field: this.props.facet['field'],
            term: this.props.term['key']
        }
    },

    handleClick: function(e) {
        e.preventDefault();
        this.props.changeFilters(this.state.field, this.state.term);
    },

    render: function () {
        var field = this.state.field;
        var term = this.state.term;
        var count = this.props.term['doc_count'];
        var title = this.props.title || term;
        var graph = this.props.context['@graph'];
        var termExperiments = siftExperiments(graph, this.props.expSetFilters, this.props.ignoredFilters, field, term);
        var expCount = termExperiments.size;
        var selected = false;
        if(this.props.expSetFilters[field] && this.props.expSetFilters[field].has(term)){
            selected = true;
        }
        return (
            <li id={selected ? "selected" : null} key={term}>
                <a className={selected ? "expterm-selected" : "expterm"} id={selected ? "selected" : null} href="" onClick={this.handleClick}>
                    <span className="pull-left facet-selector">{selected ? <i className="icon icon-times-circle-o"></i> : ''}</span>
                    <span className="facet-item">
                        {title}
                    </span>
                    <span className="pull-right facet-count">{expCount}</span>
                </a>
            </li>
        );
    }
});

var Term = browse.Term = React.createClass({
    contextTypes: {
        navigate: React.PropTypes.func
    },

    componentWillMount: function(){
        var fullHref = generateTypeHref('?type=ExperimentSet&', this.props.facet['field'], this.props.term['key']);
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
        var fullHref = generateTypeHref('?type=ExperimentSet&', field, term);
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

var Facet = browse.Facet = React.createClass({
    getDefaultProps: function() {
        return {width: 'inherit'};
    },

    getInitialState: function () {
        return {
            facetOpen: false
        };
    },

    handleClick: function (e) {
        e.preventDefault();
        this.setState({facetOpen: !this.state.facetOpen});
    },

    render: function() {
        var facet = this.props.facet;
        var title = facet['title'];
        var field = facet['field'];
        var total = facet['total'];
        var terms = facet['terms'];
        return (
            <div className="facet" hidden={terms.length === 0} style={{width: this.props.width}}>
                <h5>{title}</h5>
                <div className="facet-list nav">
                    <div>
                        {terms.map(function (term) {
                            return <ExpTerm {...this.props} key={term.key} term={term} total={total}/>;
                        }.bind(this))}
                    </div>
                </div>
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

var FacetList = browse.FacetList = React.createClass({
    contextTypes: {
        session: React.PropTypes.object,
        hidePublicAudits: React.PropTypes.bool
    },

    getDefaultProps: function() {
        return {orientation: 'vertical'};
    },

    clearFilters: function(e) {
        e.preventDefault()
        store.dispatch({
            type : {'expSetFilters' : {}}
        });
    },

    render: function() {
        var {context, term} = this.props;
        var loggedIn = this.context.session && this.context.session['auth.userid'];
        var exptypeDropdown;
        var regularFacets = [];
        // Get all facets, and "normal" facets, meaning non-audit facets
        var facets = this.props.facets;
        // ignore all audit facets for the time being
        var normalFacets = facets.filter(facet => facet.field.substring(0, 6) !== 'audit.');
        var width = 'inherit';
        if (!facets.length && this.props.mode != 'picker') return <div />;
        var clearButton = Object.keys(this.props.expSetFilters).length === 0 ? false : true;
        var searchQuery = context && context['@id'] && url.parse(context['@id']).search;
        if (searchQuery) {
            // Convert search query string to a query object for easy parsing
            var terms = queryString.parse(searchQuery);
        }
        normalFacets.map(facet => {
            if ((facet.field == 'type') || (!loggedIn && this.context.hidePublicAudits && facet.field.substring(0, 6) === 'audit.')) {
                return;
            } else if (facet.field == 'experimentset_type') {
                exptypeDropdown = <DropdownFacet {...this.props} key={facet.field} facet={facet} width={width}/>;
                return;
            } else {
                regularFacets.push(<Facet {...this.props} key={facet.field} facet={facet} width={width}/>);
                return;
            }
        });

        return (
            <div>
                <div className="exptype-box">
                    {exptypeDropdown}
                </div>
                <div className={"box facets " + this.props.orientation}>
                    <div className="row">
                        {clearButton ?
                            <div className="pull-left clear-filters-control">
                                <a href="" onClick={this.clearFilters}><i className="icon icon-times-circle"></i> Clear Filters </a>
                            </div>
                        :   <div className="pull-left clear-filters-control placeholder">
                                <a>Clear Filters</a>
                            </div>}
                        <div className="expset-facet-header-group">
                            <div className="expset-facet-header pull-right"># expts</div>
                        </div>
                    </div>
                    {regularFacets}
                </div>
            </div>
        );
    }
});

var ResultTable = browse.ResultTable = React.createClass({

    getDefaultProps: function() {
        return {
            restrictions: {},
            searchBase: ''
        };
    },

    render: function() {
        var context = this.props.context;
        var results = context['@graph'];
        var targetFiles = this.props.targetFiles;
        var total = context['total'];
        var columns = context['columns'];
        var searchBase = this.props.searchBase;
        var trimmedSearchBase = searchBase.replace(/[\?|\&]limit=all/, "");
        var show_link;
        var facets = context['facets'].map(function(facet) {
            if (this.props.restrictions[facet.field] !== undefined) {
                facet = _.clone(facet);
                facet.restrictions = this.props.restrictions[facet.field];
                facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
            }
            return facet;
        }.bind(this));
        //find ignored filters
        var ignoredFilters = {};
        for(var i=0; i < facets.length; i++){
            var ignoredSet = new Set();
            var field = facets[i].field;
            var terms = facets[i].terms;
            if(this.props.expSetFilters[field]){
                for(let expFilter of this.props.expSetFilters[field]){
                    var found = false;
                    for(var j=0; j < terms.length; j++){
                        if(expFilter === terms[j].key){
                            found = true;
                            break;
                        }
                    }
                    if(!found){
                        ignoredSet.add(expFilter);
                    }
                }
                if(ignoredSet.size > 0){
                    ignoredFilters[field] = ignoredSet;
                }
            }
        }
        var passExperiments = siftExperiments(results, this.props.expSetFilters, ignoredFilters);
        // Map view icons to svg icons
        var view2svg = {
            'table': 'table',
            'th': 'matrix'
        };
        var resultListing = results.length ?
            results.map(function (result) {
                var experimentArray = result.experiments_in_set;
                var intersection = new Set(experimentArray.filter(x => passExperiments.has(x)));
                var passed = "expset-entry";
                var href = result['@id'];
                var title = result.description || result.accesion || result.uuid || result['@id'];
                var exptHits = "(" + intersection.size + " of " + experimentArray.length +" experiments)";
                if(intersection.size > 0 && intersection.size === experimentArray.length){
                    passed += " expset-entry-passed";
                    return (
                        <ExperimentSet targetFiles={targetFiles} passed={passed} href={href} title={title} exptHits={exptHits} experimentArray={experimentArray} passExperiments={passExperiments} key={'a' + result['@id']} />
                    );
                }else{
                    return (
                        <ExperimentSet targetFiles={targetFiles} passed={passed} href={href} title={title} exptHits={exptHits} experimentArray={experimentArray} passExperiments={passExperiments} key={'b' + result['@id']} />
                    );
                }
            })
            : null;

        if(resultListing){
            resultListing = sortByKey(resultListing);
        }

        // Create "show all" or "show 25" links if necessary
        show_link = ((total > results.length && searchBase.indexOf('limit=all') === -1) ?
            <a href={searchBase ? searchBase + '&limit=all' : '?limit=all'}
                    onClick={this.onFilter}>View All</a>
            :
            <span>{results.length > 25 ?
                <a href={trimmedSearchBase ? trimmedSearchBase : "/search/"}
                    onClick={this.onFilter}>View 25</a>
                : null}
            </span>);
        return (
            <div>
                <div className="row">
                    {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList {...this.props} facets={facets}
                                    searchBase={searchBase ? searchBase + '&' : searchBase + '?'} onFilter={this.onFilter} ignoredFilters={ignoredFilters}/>
                    </div> : ''}
                    <div className="col-sm-7 col-md-8 col-lg-9">
                        <div className="row">
                            <h4 className='row browse-title'>Showing {results.length} of {total} experiment sets. {show_link}</h4>
                        </div>
                        <ul className="nav result-table" id="result-table">
                            {resultListing}
                        </ul>
                    </div>
                </div>
            </div>
        );
    },

    onFilter: function(e) {
        var search = e.currentTarget.getAttribute('href');
        this.props.onChange(search);
        e.stopPropagation();
        e.preventDefault();
    }
});

var FileButton = browse.FileButton = React.createClass({
    runFxn: function(e){
        e.preventDefault();
        this.props.fxn(this.props.format);
    },
    render: function(){
        return(
            <Button className="expset-selector-button" bsSize="xsmall" onClick={this.runFxn}>{this.props.format} ({this.props.count})</Button>
        );
    }
});

var ControlsAndResults = browse.ControlsAndResults = React.createClass({

    getInitialState: function(){
        var initStats = {};
        initStats['checked'] = new Set();
        initStats['formats'] = {};
        initStats['uuids'] = new Set();
        return{
            fileStats: initStats,
            filesToFind: {}
        }
    },

    componentDidMount: function(){
        var currStats = findFiles();
        this.setState({
            fileStats: currStats
        });
        // update after initiating
        this.forceUpdate();
    },

    componentDidUpdate: function(nextProps, nextState){
        if(nextProps.expSetFilters !== this.props.expSetFilters || nextProps.context !== this.props.context){
            var currStats = findFiles();
            if(_.isEqual(nextState.fileStats, currStats)){
                this.setState({
                    fileStats: currStats
                });
            }
        }
    },

    selectFiles: function(format){
        var currTargets = this.state.filesToFind;
        var newTargets = {};
        var targetKeys = Object.keys(currTargets);
        if(!_.contains(targetKeys, format)){
            targetKeys = targetKeys.concat(format);
        }
        for(var i=0; i<targetKeys.length; i++){
            if(targetKeys[i] !== format){
                newTargets[format] = currTargets[format];
            }else{
                if(currTargets[format] && currTargets[format].size > 0){
                    newTargets[format] = new Set(); // remove old target
                }else{
                    newTargets[format] = this.state.fileStats.formats[format];
                }
            }
        }
        this.setState({
            filesToFind: newTargets
        });
    },

    render: function(){
        // make sure fileFormats global var is up-to-date
        var fileStats = this.state.fileStats;
        var targetFiles = this.state.filesToFind;
        var selectorButtons = fileFormats.map(function (format, idx) {
            var count = fileStats.formats[format] ? fileStats.formats[format].size : 0;
            return(
                <FileButton key={format} fxn={this.selectFiles} format={format} count={count}/>
            );
        }.bind(this));
        return(
            <div>
                <div className="row">
                    <div className="box expset-whole-selector col-sm-12 col-md-10 col-lg-9 col-md-push-2 col-lg-push-3">
                        <div className="col-sm-8 col-md-8 col-lg-8 expset-file-selector">
                            <div className="row">
                                <div className="expset-selector-header">
                                    <h5>For all <span className="expset-entry-passed">passing</span> entries, select files of type:</h5>
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
                                <div className="test-filler">Hi</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <ResultTable {...this.props} targetFiles={targetFiles}/>
                </div>
            </div>

        );
    }
});

var Browse = browse.Browse = React.createClass({
    contextTypes: {
        location_href: React.PropTypes.string,
        navigate: React.PropTypes.func
    },

    changeFilters: function(field, term) {
        // store currently selected filters as a dict of sets
        var tempObj = {};
        var newObj = {};
        var expSet = this.props.expSetFilters[field] ? this.props.expSetFilters[field] : new Set();
        if(expSet.has(term)){
            // term is already present, so delete it
            expSet.delete(term);
        }else{
            expSet.add(term);
        }
        if(expSet.size > 0){
            tempObj[field] = expSet;
            newObj = Object.assign({}, this.props.expSetFilters, tempObj);
        }else{ //remove key if set is empty
            newObj = Object.assign({}, this.props.expSetFilters);
            delete newObj[field];
        }
        store.dispatch({
            type : {'expSetFilters' : newObj}
        });
    },

    componentWillMount: function() {
        var searchBase = url.parse(this.context.location_href).search || '';
    },

    render: function() {
        var context = this.props.context;
        // no results found!
        if(context.total === 0 && context.notification){
            return <div className="error-page"><h4>{context.notification}</h4></div>
        }
        var results = context['@graph'];
        var searchBase = url.parse(this.context.location_href).search || '';
        // browse is only for experiment sets
        if(searchBase.indexOf('?type=ExperimentSet') === -1){
            return(<div className="error-page">
                        <h4><a href='/browse/?type=ExperimentSet&experimentset_type=biological+replicates'>Only experiment sets may be browsed.</a></h4>
                    </div>
            );
        }
        return (
            <div className="panel data-display main-panel">
                <ControlsAndResults {...this.props} key={undefined} searchBase={searchBase} onChange={this.context.navigate} changeFilters={this.changeFilters}/>
            </div>
        );
    }
});

globals.content_views.register(Browse, 'Browse');
