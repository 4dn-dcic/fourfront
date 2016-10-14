'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var queryString = require('query-string');
var url = require('url');
var _ = require('underscore');
var globals = require('./globals');
var browse = module.exports;
var audit = require('./audit');
var Panel = require('react-bootstrap').Panel;
var Button = require('react-bootstrap').Button;
var Checkbox = require('react-bootstrap').Checkbox;
var Table = require('react-bootstrap').Table;
var ButtonToolbar = require('react-bootstrap').ButtonToolbar;
var DropdownButton = require('react-bootstrap').DropdownButton;
var MenuItem = require('react-bootstrap').MenuItem;
var store = require('../store');
var AuditIndicators = audit.AuditIndicators;
var AuditDetail = audit.AuditDetail;
var AuditMixin = audit.AuditMixin;
var expSetColumnLookup={
    // all arrays will be handled by taking the first item
    'biological replicates':{
        'Accession': 'accession',
        'Exp Type':'experiment_type',
        'Exps': '',
        'Organism': 'biosample.biosource.individual.organism.name',
        'Biosource': 'biosample.biosource_summary',
        'Enzyme': 'digestion_enzyme.name',
        'Modifications':'biosample.modifications_summary'

    },
    'other':[]
};

var expSetAdditionalInfo={
    'biological replicates':{
        'Lab': 'lab.title',
        'Treatments':'biosample.treatments_summary'
    },
    'other':[]
};

var IndeterminateCheckbox = React.createClass({
    render: function(){
        var props = this.props;
        return(
            <input {...props} type="checkbox" ref={function(input) {if (input) {input.indeterminate = props.checked ? false : props.indeterminate;}}} />
        );
    }
});

var ExperimentSet = module.exports.ExperimentSet = React.createClass({
    getInitialState: function() {
    	return {
            open: false,
            checked: true,
            selectedFiles: new Set()
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if(!_.isEqual(this.props.expSetFilters, nextProps.expSetFilters)){
            this.setState({
                selectedFiles: new Set()
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

    handleToggle: function (e) {
        e.preventDefault();
        this.setState({
  		  open: !this.state.open
        });
    },

    handleFileUpdate: function (uuid, add=true){
        var newSet = this.state.selectedFiles;
        if(add){
            if(!newSet.has(uuid)){
                newSet.add(uuid);
                this.setState({
                    selectedFiles: newSet
                });
            }
        }else if(newSet.has(uuid)){
            newSet.delete(uuid);
            this.setState({
                selectedFiles: newSet
            });
        }
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    render: function() {
        var experimentArray = this.props.experimentArray;
        var fileDetail = {}; //use @id field as key
        var emptyExps = [];
        for (var i=0; i<experimentArray.length; i++){
            if(this.props.passExperiments.has(experimentArray[i])){
                var tempFiles = [];
                var biosample_accession = experimentArray[i].biosample ? experimentArray[i].biosample.accession : null;
                var biosample_id = biosample_accession ? experimentArray[i].biosample['@id'] : null;
                if(experimentArray[i].files){
                    tempFiles = experimentArray[i].files;
                }else if(experimentArray[i].filesets){
                    for(var j=0; j<experimentArray[i].filesets.length; j++){
                        if(experimentArray[i].filesets[j].files_in_set){
                            tempFiles = tempFiles.concat(experimentArray[i].filesets[j].files_in_set);
                        }
                    }
                // No files in experiment
                }else{
                    emptyExps.push(experimentArray[i]['@id']);
                    fileDetail[experimentArray[i]['@id']] = {
                        'accession':experimentArray[i].accession,
                        'biosample':biosample_accession,
                        'biosample_id':biosample_id,
                        'uuid':experimentArray[i].uuid,
                        'data':{}
                    };
                }
                // save appropriate experiment info
                if(tempFiles.length > 0){
                    var relatedFiles = {};
                    var relatedData = [];
                    for(var k=0;k<tempFiles.length;k++){

                        // only use first file relation for now. Only support one relationship total
                        if(tempFiles[k].related_files && tempFiles[k].related_files[0].file){
                            // in form [related file @id, this file @id]
                            relatedFiles[tempFiles[k].related_files[0].file] =  tempFiles[k]['@id'];
                            fileDetail[tempFiles[k]['@id']] = {
                                'accession':experimentArray[i].accession,
                                'biosample':biosample_accession,
                                'biosample_id':biosample_id,
                                'uuid':experimentArray[i].uuid,
                                'data':tempFiles[k],
                                'related':{'relationship_type':tempFiles[k].related_files[0].relationship_type,
                                            'file':tempFiles[k].related_files[0].file,
                                            'data':null
                                            }
                            };
                        }else{
                            fileDetail[tempFiles[k]['@id']] = {
                                'accession':experimentArray[i].accession,
                                'biosample':biosample_accession,
                                'biosample_id':biosample_id,
                                'uuid':experimentArray[i].uuid,
                                'data':tempFiles[k]
                            };
                        }
                    }
                    var usedRelations = [];
                    for(var k=0;k<tempFiles.length;k++){
                        if(_.contains(Object.keys(relatedFiles), tempFiles[k]['@id'])){
                            if(_.contains(usedRelations, tempFiles[k]['@id'])){
                                // skip already-added related files
                                delete fileDetail[relatedFiles[tempFiles[k]['@id']]];
                            }else{
                                fileDetail[relatedFiles[tempFiles[k]['@id']]]['related']['data'] = tempFiles[k];
                                usedRelations.push(relatedFiles[tempFiles[k]['@id']]);
                            }
                        }
                    }
                }
            }
        }
        var files = Object.keys(fileDetail);
        // unused for now... when format selection is added back in, adapt code below:
        // var filteredFiles = [];
        // for(var i=0; i<files.length; i++){
        //     if(this.props.targetFiles.has(files[i].file_format)){
        //         filteredFiles.push(files[i].uuid);
        //     }
        // }
        var childEntries = files.map(function (file) {
            return (
                <FileEntry expSetFilters={this.props.expSetFilters} info={fileDetail[file]} key={fileDetail[file]['uuid'] + file} parentChecked={this.state.checked} handleFileUpdate={this.handleFileUpdate}/>
            );
        }.bind(this));
        // sort to group experiments
        childEntries.sort(function(a,b){
            return(a.key - b.key);
        });
        var columnValues = Object.keys(this.props.columns).map(function (key){
            if(key==="Accession"){
                return(
                    <td className="expset-table-cell">
                        <a className="expset-entry" href={this.props.href}>
                            {this.props.columns[key]}
                        </a>
                    </td>
                );
            }else if(key==="Exps"){
                return(
                    <td className="expset-table-cell">{experimentArray.length}</td>
                );
            }else{
                return(
                    <td className="expset-table-cell">{this.props.columns[key]}</td>
                );
            }
        }.bind(this));
        var addInfoVals = Object.keys(this.props.addInfo).map(function (key){
            return(
                <div>
                    <span className="expset-addinfo-key">{key}:</span>
                    <span className="expset-addinfo-val">{this.props.addInfo[key]}</span>
                </div>
            );
        }.bind(this));
        var checked = this.state.selectedFiles.size === childEntries.length || childEntries.length === emptyExps.length;
        var indeterminate = this.state.selectedFiles.size > 0 && this.state.selectedFiles.size < childEntries.length
        return (
            <tbody className={this.props.fillIdx%2 === 1 ? "expset-filled" : ""}>
                <tr>
                    <td className="expset-table-cell">
                    <div className="control-cell expset-entry-passed">
                        <Button bsSize="xsmall" className="icon-container" onClick={this.handleToggle}>
                            <i className={"icon " + (this.state.open ? "ss-navigateup" : "ss-navigatedown")}></i>
                        </Button>
                    </div>
                    </td>
                    <td className="expset-table-cell">
                    <div className="control-cell expset-entry-passed">
                        <IndeterminateCheckbox checked={checked} indeterminate={indeterminate} onChange={this.handleCheck}/>
                    </div>
                    </td>
                    {columnValues}
                </tr>
                <tr>
                    <td className={this.state.open ? "hidden-col-open" : "hidden-col-closed"} colSpan={Object.keys(this.props.columns).length + 2}>
                        <Panel className="expset-panel" collapsible expanded={this.state.open}>
                            <div className="expset-addinfo">
                                {addInfoVals}
                            </div>
                            <Table striped bordered condensed hover>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Experiment Accession</th>
                                        <th>Biosample Accession</th>
                                        <th>File Accession</th>
                                        <th>File Type</th>
                                        <th>File Info</th>
                                    </tr>
                                </thead>
                                {childEntries}
                            </Table>
                        </Panel>
                    </td>
                </tr>
            </tbody>
        );
    }
});

var FileEntry = React.createClass({

    getInitialState: function() {
        return {
            checked: true
        };
    },

    // initial checkbox setting
    componentWillMount: function(){
        // if(this.props.exptPassed && _.contains(this.props.filteredFiles, this.props.file.uuid)){
        //     this.setState({
        //         checked: true
        //     });
        // }
        if(this.props.info.data){
            this.props.handleFileUpdate(this.props.info.data.uuid, true);
        }
    },

    // update checkboxes if parent has changed
    componentWillReceiveProps: function(nextProps) {
        // if(this.props.filteredFiles !== nextProps.filteredFiles || this.props.exptPassed !== nextProps.exptPassed){
        //     if(nextProps.exptPassed && _.contains(nextProps.filteredFiles, this.props.file.uuid)){
        //         this.setState({
        //             checked: true
        //         });
        //     }
        // }
        if(this.props.parentChecked !== nextProps.parentChecked){
            this.setState({
                checked: nextProps.parentChecked
            });
        }
    },

    // update parent checked state
    componentDidUpdate(nextProps, nextState){
        if((nextState.checked !== this.state.checked || !_.isEqual(this.props.expSetFilters, nextProps.expSetFilters)) && this.props.info.data){
            this.props.handleFileUpdate(this.props.info.data.uuid, this.state.checked);
        }
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    render: function(){
        var file = this.props.info.data ? this.props.info.data : null;
        var info = this.props.info;
        var relationship = this.props.info.related ? this.props.info.related : null;
        var relatedFile;
        if(relationship){
            relatedFile = this.props.info.related.data ? this.props.info.related.data : null;
        }
        var fileOne;
        var fileTwo;
        var fileID;
        // code embarrasingly specific to fastq file pairs
        if(file){
            if(file.paired_end && file.paired_end === '1'){
                fileOne = [];
                fileOne.push(<td><a href={file['@id'] || ''}>{file.accession || file.uuid || file['@id']}</a></td>);
                fileOne.push(<td>{file.file_format}</td>);
                fileOne.push(<td>Paired end {file.paired_end}</td>);
            }else if(file.paired_end && file.paired_end === '2'){
                fileTwo = [];
                fileTwo.push(<td><a href={file['@id'] || ''}>{file.accession || file.uuid || file['@id']}</a></td>);
                fileTwo.push(<td>{file.file_format}</td>);
                fileTwo.push(<td>Paired end {file.paired_end}</td>);
            }else{
                fileOne = [];
                if(file['@id']){
                    fileOne.push(<td><a href={file['@id'] || ''}>{file.accession || file.uuid || file['@id']}</a></td>);
                    fileOne.push(<td>{file.file_format}</td>);
                    fileOne.push(<td>{(file.file_format === 'fastq' || file.file_format === 'fasta') ? 'Unpaired' : ''}</td>);
                }else{
                    fileOne.push(<td>No files</td>);
                    fileOne.push(<td></td>);
                    fileOne.push(<td></td>);
                }
            }
            var fileID = this.state.checked + "~" + true + "~" + file.file_format + "~" + file.uuid;
        }
        if(relatedFile){
            if(relatedFile.paired_end && relatedFile.paired_end === '1'){
                fileOne = [];
                fileOne.push(<td><a href={relatedFile['@id'] || ''}>{relatedFile.accession || relatedFile.uuid || relatedFile['@id']}</a></td>);
                fileOne.push(<td>{relatedFile.file_format}</td>);
                fileOne.push(<td>Paired end {relatedFile.paired_end}</td>);
            }else if(relatedFile.paired_end && relatedFile.paired_end === '2'){
                fileTwo = [];
                fileTwo.push(<td><a href={relatedFile['@id'] || ''}>{relatedFile.accession || relatedFile.uuid || relatedFile['@id']}</a></td>);
                fileTwo.push(<td>{relatedFile.file_format}</td>);
                fileTwo.push(<td>Paired end {relatedFile.paired_end}</td>);
            }else{
                fileTwo = [];
                fileTwo.push(<td><a href={relatedFile['@id'] || ''}>{relatedFile.accession || relatedFile.uuid || relatedFile['@id']}</a></td>);
                fileTwo.push(<td>{relatedFile.file_format}</td>);
                fileTwo.push(<td></td>);
            }
        }
        return(
            <tbody>
                <tr className='expset-sublist-entry'>
                    {file['@id'] ?
                        <td rowSpan="2" className="expset-exp-cell expset-checkbox-cell">
                            <Checkbox validationState='warning' checked={this.state.checked} name="file-checkbox" id={fileID} className='expset-checkbox-sub' onChange={this.handleCheck}/>
                        </td>
                    : <td rowSpan="2"></td>
                    }
                    <td rowSpan="2" className="expset-exp-cell">
                        <a href={info['@id'] || ''}>
                            {info.accession || info.uuid}
                        </a>
                    </td>
                    <td rowSpan="2" className="expset-exp-cell">
                        <a href={info.biosample_id || ''}>
                            {info.biosample}
                        </a>
                    </td>
                    {(fileOne && fileOne[0]) ? fileOne[0] : null}
                    {(fileOne && fileOne[1]) ? fileOne[1] : null}
                    {(fileOne && fileOne[2]) ? fileOne[2] : null}
                </tr>
                {fileTwo ?
                <tr>
                    {fileTwo[0]}
                    {fileTwo[1]}
                    {fileTwo[2]}
                </tr>
                : null}
            </tbody>
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
        var title = this.props.title || term;
        var graph = this.props.context['@graph'];
        var passSets = 0;
        // for now, remove facet info on exp numbers
        var termExperiments = siftExperiments(graph, this.props.expSetFilters, this.props.ignoredFilters, field, term);
        // find number of exp sets
        graph.map(function(expSet){
            var intersection = new Set(expSet.experiments_in_set.filter(x => termExperiments.has(x)));
            if(intersection.size > 0){
                passSets += 1;
            }
        });
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
                    <span className="pull-right facet-count">{passSets}</span>
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
            } else if (facet.field != 'experimentset_type') {
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
                            <div className="pull-right clear-filters-control">
                                <a href="" onClick={this.clearFilters}><i className="icon icon-times-circle"></i> Clear All Filters </a>
                            </div>
                        :   <div className="pull-right clear-filters-control placeholder">
                                <a>Clear Filters</a>
                            </div>}
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
        // use first experiment set to grap type (all types are the same in any given graph)
        var setType = results[0].experimentset_type;
        var targetFiles = this.props.targetFiles;
        var total = context['total'];
        var searchBase = this.props.searchBase;
        var expSetFilters = this.props.expSetFilters;
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
            if(expSetFilters[field]){
                for(let expFilter of expSetFilters[field]){
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
        var passExperiments = siftExperiments(results, expSetFilters, ignoredFilters);
        // Map view icons to svg icons
        var view2svg = {
            'table': 'table',
            'th': 'matrix'
        };
        var resultListing = [];
        var columnTemplate = expSetColumnLookup[setType] ? expSetColumnLookup[setType] : expSetColumnLookup['other'];
        var addInfoTemplate = expSetAdditionalInfo[setType] ? expSetAdditionalInfo[setType] : expSetAdditionalInfo['other'];
        var resultHeaders = Object.keys(columnTemplate).map(function(key){
            return(<th>{key}</th>);
        });
        var fillIdx = 0;
        results.map(function (result) {
            var experimentArray = result.experiments_in_set;
            var intersection = new Set(experimentArray.filter(x => passExperiments.has(x)));
            var href = result['@id'];
            var columns = {};
            var addInfo = {};
            var firstExp = experimentArray[0]; // use only for biological replicates
            for (var i=0; i<Object.keys(columnTemplate).length;i++){
                var splitFilters = columnTemplate[Object.keys(columnTemplate)[i]].split('.');
                var valueProbe = firstExp;
                for (var j=0; j<splitFilters.length;j++){
                    valueProbe = Array.isArray(valueProbe) ? valueProbe[0][splitFilters[j]] : valueProbe[splitFilters[j]];
                }
                columns[Object.keys(columnTemplate)[i]] = valueProbe;
            }
            for (var i=0; i<Object.keys(addInfoTemplate).length;i++){
                var splitFilters = addInfoTemplate[Object.keys(addInfoTemplate)[i]].split('.');
                var valueProbe = firstExp;
                for (var j=0; j<splitFilters.length;j++){
                    valueProbe = Array.isArray(valueProbe) ? valueProbe[0][splitFilters[j]] : valueProbe[splitFilters[j]];
                }
                addInfo[Object.keys(addInfoTemplate)[i]] = valueProbe;
            }
            if(intersection.size > 0){
                resultListing.push(<ExperimentSet fillIdx={fillIdx} addInfo={addInfo} columns={columns} expSetFilters={expSetFilters} targetFiles={targetFiles} href={href} experimentArray={experimentArray} passExperiments={intersection} key={'a' + result['@id']} />);
            }
            fillIdx += 1; // for striped tables
        });
        return (
            <div>
                <div className="row">
                    {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList {...this.props} facets={facets}
                                    searchBase={searchBase ? searchBase + '&' : searchBase + '?'} onFilter={this.onFilter} ignoredFilters={ignoredFilters}/>
                    </div> : ''}
                    <div className="col-sm-7 col-md-8 col-lg-9">
                        <div className="row">
                            <h4 className='row browse-title'>Showing {resultListing.length} of {results.length} experiment sets.</h4>
                        </div>
                        <div>
                            <Table bordered condensed id="result-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th></th>
                                        {resultHeaders}
                                    </tr>
                                </thead>
                                {resultListing}
                            </Table>
                        </div>
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
        if(nextProps.expSetFilters !== this.props.expSetFilters || nextProps.context !== this.props.context){
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

    downloadFiles: function(e){
        e.preventDefault();
        var currStats = findFiles(this.props.fileFormats);
        var checkedFiles = currStats['checked'] ? currStats['checked'] : new Set();
        console.log('____DOWNLOAD THESE ' + checkedFiles.size + ' FILES____');
        console.log(checkedFiles);
    },

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
        var fileFormats = findFormats(context['@graph']);
        // no results found!
        if(context.total === 0 && context.notification){
            return <div className="error-page"><h4>{context.notification}</h4></div>
        }
        var results = context['@graph'];
        var searchBase = url.parse(this.context.location_href).search || '';
        // browse is only for experiment sets
        if(searchBase.indexOf('?type=ExperimentSet') === -1){
            return(<div className="error-page">
                        <h4><a href='/browse/?type=ExperimentSet&experimentset_type=biological+replicates&limit=all'>Only experiment sets may be browsed.</a></h4>
                    </div>
            );
        }
        return (
            <div className="panel data-display main-panel">
                <ControlsAndResults {...this.props} key={undefined} fileFormats={fileFormats} searchBase={searchBase} onChange={this.context.navigate} changeFilters={this.changeFilters}/>
            </div>
        );
    }
});

globals.content_views.register(Browse, 'Browse');
