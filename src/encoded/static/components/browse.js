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
var DropdownButton = require('react-bootstrap').DropdownButton;
var MenuItem = require('react-bootstrap').MenuItem;
var store = require('../store');
var AuditIndicators = audit.AuditIndicators;
var AuditDetail = audit.AuditDetail;
var AuditMixin = audit.AuditMixin;

// Should really be singular...
var types = {
    annotation: {title: 'Annotation file set'},
    antibody_lot: {title: 'Antibodies'},
    biosample: {title: 'Biosamples'},
    experiment: {title: 'Experiments'},
    target: {title: 'Targets'},
    dataset: {title: 'Datasets'},
    image: {title: 'Images'},
    matched_set: {title: 'Matched set series'},
    organism_development_series: {title: 'Organism development series'},
    publication: {title: 'Publications'},
    page: {title: 'Web page'},
    pipeline: {title: 'Pipeline'},
    project: {title: 'Project file set'},
    publication_data: {title: 'Publication file set'},
    reference: {title: 'Reference file set'},
    reference_epigenome: {title: 'Reference epigenome series'},
    replication_timing_series: {title: 'Replication timing series'},
    software: {title: 'Software'},
    treatment_concentration_series: {title: 'Treatment concentration series'},
    treatment_time_series: {title: 'Treatment time series'},
    ucsc_browser_composite: {title: 'UCSC browser composite file set'}
};

var datasetTypes = {
    'Annotation': types['annotation'].title,
    'Dataset': types['dataset'].title,
    'MatchedSet': types['matched_set'].title,
    'OrganismDevelopmentSeries': types['organism_development_series'].title,
    'Project': types['project'].title,
    'PublicationData': types['publication_data'].title,
    'Reference': types['reference'].title,
    'ReferenceEpigenome': types['reference_epigenome'].title,
    'ReplicationTimingSeries': types['replication_timing_series'].title,
    'TreatmentConcentrationSeries': types['treatment_concentration_series'].title,
    'TreatmentTimeSeries': types['treatment_time_series'].title,
    'UcscBrowserComposite': types['ucsc_browser_composite'].title
};

var Listing = module.exports.Listing = function (props) {
    // XXX not all panels have the same markup
    var context;
    if (props['@id']) {
        context = props;
        props = {context: context, passExperiments: passExperiments,  key: context['@id']};
    }
    var ListingView = globals.listing_views.lookup(props.context);
    return <ListingView {...props} />;
};

var Item = module.exports.Item = React.createClass({
    render: function() {
        return (
            <div>Browse should not be used for this data type</div>
        );
    }
});
globals.listing_views.register(Item, 'Item');

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

    sortByKey: function(array) {
        return array.sort(function(a, b) {
            var keyA = a.key.toLowerCase();
            var keyB = b.key.toLowerCase();
            return ((keyA < keyB) ? -1 : ((keyA > keyB) ? 1 : 0));
        });
    },

    render: function() {
        var result = this.props.context;
        var passExperiments = this.props.passExperiments;
        var experimentArray = result.experiments_in_set;
        var intersection = new Set(experimentArray.filter(x => passExperiments.has(x)));
        var childExperiments = experimentArray.map(function (experiment) {
            if(passExperiments.has(experiment)){
                return (
                    <ExperimentSublist parentChecked={this.state.checked} passed={true} result={experiment} key={'a' + experiment.uuid} />
                );
            }else{
                return (
                    <ExperimentSublist parentChecked={this.state.checked} passed={false} result={experiment} key={'b' + experiment.uuid} />
                );
            }
        }.bind(this));
        var passed = "expset-entry";
        if(intersection.size > 0 && intersection.size === experimentArray.length){
            passed += " expset-entry-passed";
        }
        var exptHits = "(" + intersection.size + " of " + experimentArray.length +" experiments)";
        this.sortByKey(childExperiments);
        return (
            <li>
                <div className="clearfix">
                    <div className="accession">
                        <Button bsSize="xsmall" className="expset-button" onClick={this.handleToggle}>{this.state.open ? "-" : "+"}</Button>
                        <Checkbox checked={this.state.checked} className='expset-checkbox' onChange={this.handleCheck}/>
                        <a className={passed} href={result['@id']}>
                            {result.description || result.accesion || result.uuid || result['@id']}
                        </a>
                        <span className='expset-hits'>{exptHits}</span>
                    </div>
                    <Panel className="expset-panel" collapsible expanded={this.state.open}>
                        {childExperiments}
                    </Panel>
                </div>
            </li>
        );
    }
});
globals.listing_views.register(ExperimentSet, 'ExperimentSet');

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
        if(nextProps.parentChecked !== this.props.parentChecked){
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
                <FileSublist key={file.accession} parentChecked={this.state.checked} file={file} />
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
        if(nextProps.parentChecked !== this.props.parentChecked){
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
        return(
            <div className="expset-file">
                <Checkbox checked={this.state.checked} className='expset-checkbox expset-checkbox-sub' onChange={this.handleCheck}/>
                <a href={this.props.file['@id'] || ''}>
                    {this.props.file.file_format || this.props.file.accession || this.props.file.uuid || this.props.file['@id']}
                </a>
            </div>
        );
    }
});

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

var TypeTerm = browse.TypeTerm = React.createClass({
    render: function () {
        var term = this.props.term['key'];
        var title;
        try {
            title = types[term];
        } catch (e) {
            title = term;
        }
        var total = this.props.total;
        return <Term {...this.props} title={title} total={total} />;
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
        var TermComponent = field === 'type' ? TypeTerm : ExpTerm;
        return (
            <div className="facet" hidden={terms.length === 0} style={{width: this.props.width}}>
                <h5>{title}</h5>
                <div className="facet-list nav">
                    <div>
                        {terms.map(function (term) {
                            return <TermComponent {...this.props} key={term.key} term={term} total={total}/>;
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
        var total = context['total'];
        var columns = context['columns'];
        var label = 'results. ';
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
                <div className="row search-title">
                    <h3>Experiment set browse</h3>
                    <div className="row">
                        <h4 className='inline-subheader'>Showing {results.length} of {total} {label} {show_link}</h4>
                    </div>
                </div>
                <div className="row">
                    {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList {...this.props} facets={facets}
                                    searchBase={searchBase ? searchBase + '&' : searchBase + '?'} onFilter={this.onFilter} ignoredFilters={ignoredFilters}/>
                    </div> : ''}
                    <div className="col-sm-7 col-md-8 col-lg-9">
                        <ul className="nav result-table" id="result-table">
                            {results.length ?
                                results.map(function (result) {
                                    return Listing({context:result, columns: columns, passExperiments: passExperiments, key: result['@id']});
                                })
                            : null}
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
        var results = context['@graph'];
        var notification = context['notification'];
        var searchBase = url.parse(this.context.location_href).search || '';
        searchBase = searchBase.split('~')[0];
        var facetdisplay = context.facets && context.facets.some(function(facet) {
            return facet.total > 0;
        });
        return (
            <div>
                {facetdisplay ?
                    <div className="panel data-display main-panel">
                        <ResultTable {...this.props} key={undefined} searchBase={searchBase} onChange={this.context.navigate} changeFilters={this.changeFilters}/>
                    </div>
                : <h4>{notification}</h4>}
            </div>
        );
    }
});

globals.content_views.register(Browse, 'Browse');
