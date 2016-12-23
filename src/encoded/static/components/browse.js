'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var url = require('url');
var _ = require('underscore');
var globals = require('./globals');
var browse = module.exports;
var { MenuItem, DropdownButton, ButtonToolbar, Table, Checkbox, Button, Panel } = require('react-bootstrap');
var store = require('../store');
var FacetList = require('./facetlist');
var { ExperimentsTable, getFileDetailContainer } = require('./experiments-table');
var { isServerSide } = require('./objectutils');
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
        selectAllFilesInitially : React.PropTypes.bool
    },

    getInitialState: function() {
    	return {
            'open': false,
            'selectedFiles': this.props.selectAllFilesInitially ? new Set(this.allFileIDs()) : new Set()
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

    pairsAndFiles : function(){
        // Combine file pairs and unpaired files into one array. [ [filePairEnd1, filePairEnd2], [...], fileUnpaired1, fileUnpaired2, ... ]
        // Length will be file_pairs.length + unpaired_files.length, e.g. files other than first file in a pair are not counted.
        return ExperimentsTable.funcs.listAllFilePairs(this.props.experimentArray).concat(
            ExperimentsTable.funcs.listAllUnpairedFiles(this.props.experimentArray)
        ); // (can always _.flatten() this or map out first file per pair, e.g. for targetFiles below)
    },

    allFileIDs : function(){
        return this.pairsAndFiles().map(function(f){
            if (Array.isArray(f)) return f[0].uuid;
            else return f.uuid;
        });
    },

    handleToggle: function (e) {
        e.preventDefault();
        this.setState({
  		    open: !this.state.open
        });
    },

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
                        <td key={key+this.props.href} className="expset-table-cell">{this.props.columns[key]}</td>
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
            return (
                <ExperimentsTable
                    columnHeaders={[
                        { className: 'file-detail', title : 'File Type'},
                        { className: 'file-detail', title : 'File Info'}
                    ]}
                    experimentArray={[...this.props.passExperiments] /* Convert set to array */}
                    replicateExpsArray={this.props.replicateExpsArray}
                    experimentSetType={this.props.experimentSetType}
                    selectedFiles={this.state.selectedFiles}
                    parentController={this}
                    expSetFilters={this.props.expSetFilters}
                    facets={this.props.facets}
                />
            );
        }

        var files = this.pairsAndFiles();

        var disabled = files.length === 0;
        var allFilesChecked = this.state.selectedFiles.size === files.length && !disabled;
        var indeterminate = this.state.selectedFiles.size > 0 && this.state.selectedFiles.size < files.length;

        return (
            <tbody className={"expset-section expset-entry-passed " + (this.state.open ? "open" : "closed")} data-row={this.props.rowNumber}>
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
                { this.state.open ?
                <tr className="expset-addinfo-row">
                    <td className={"expsets-table-hidden " + (this.state.open ? "hidden-col-open" : "hidden-col-closed")} colSpan={Object.keys(this.props.columns).length + 2}>
                        { formattedAdditionaInformation.call(this) }
                        { experimentsTable.call(this) }
                    </td>
                </tr>
                : null }
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
        searchBase      : React.PropTypes.string,
        context         : React.PropTypes.object.isRequired,
        expSetFilters   : React.PropTypes.object,
        fileFormats     : React.PropTypes.array,
        fileStats       : React.PropTypes.object,
        targetFiles     : React.PropTypes.instanceOf(Set),
        onChange        : React.PropTypes.func
    },

    getInitialState: function(){
        return {
            sortColumn: null,
            sortReverse: false,
            overflowingRight : false,
            // We need to get the below outta state once graph-ql is in; temporarily stored in state for performance.
            passedExperiments : ExperimentsTable.getPassedExperiments(
                this.props.context['@graph'],
                this.props.expSetFilters,
                'missing-facets',
                this.props.context.facets,
                true
            )
        }
    },

    getDefaultProps: function() {
        // 'restrictions' object migrated to facetlist.js > FacetList
        return {
            searchBase: ''
        };
    },

    componentDidMount : function(){
        this.setOverflowingRight();
        var debouncedSetOverflowRight = _.debounce(this.setOverflowingRight, 300);
        window.addEventListener('resize', debouncedSetOverflowRight);
    },

    componentWillReceiveProps : function(newProps){
        var newState = {};

        if (this.props.expSetFilters !== newProps.expSetFilters || this.props.context !== newProps.context){
            newState.passedExperiments = ExperimentsTable.getPassedExperiments(
                newProps.context['@graph'],
                newProps.expSetFilters,
                'missing-facets',
                newProps.context.facets,
                true
            );
        }

        if (Object.keys(newState).length > 0){
            this.setState(newState);
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

    formatExperimentSetListings : function(passExperiments, facets = null){
        // use first experiment set to grap type (all types are the same in any given graph)
        var columnTemplate = this.getTemplate('column');
        var addInfoTemplate = this.getTemplate('additional-info');

        var resultListings = [],
            resultCount = 0;

        if (facets === null){
            facets = FacetList.adjustedFacets(this.props.context.facets);
        }

        this.props.context['@graph'].map(function (result) {
            var experimentArray = result.experiments_in_set;
            if(experimentArray.length == 0){
                return; // ignore if no expts in the expt set
            }

            var accession = result.accession ? result.accession : "Experiment Set";
            var intersection = new Set(experimentArray.filter(x => passExperiments.has(x)));
            var columns = {};
            var addInfo = {};
            var firstExp = experimentArray[0]; // use only for replicates

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
                for (var j=0; j<splitFilters.length;j++){
                    valueProbe = Array.isArray(valueProbe) ? valueProbe[0][splitFilters[j]] : valueProbe[splitFilters[j]];
                }
                columns[Object.keys(columnTemplate)[i]] = valueProbe;
            }

            // Experiment Set Row Add'l Info (Lab, etc.)
            for (var i=0; i<Object.keys(addInfoTemplate).length;i++){
                var splitFilters = addInfoTemplate[Object.keys(addInfoTemplate)[i]].split('.');
                var valueProbe = firstExp;
                for (var j=0; j<splitFilters.length;j++){
                    valueProbe = Array.isArray(valueProbe) ? valueProbe[0][splitFilters[j]] : valueProbe[splitFilters[j]];
                }
                addInfo[Object.keys(addInfoTemplate)[i]] = valueProbe;
            }

            if(intersection.size > 0){
                var keyVal = "";
                if (this.state.sortColumn){
                    keyVal = columns[this.state.sortColumn];
                }
                resultListings.push(
                    <ExperimentSetRow
                        addInfo={addInfo}
                        description={result.description}
                        columns={columns}
                        expSetFilters={this.props.expSetFilters}
                        experimentSetType={result.experimentset_type}
                        selectAllFilesInitially={true}
                        targetFiles={this.props.targetFiles}
                        href={result['@id']}
                        experimentArray={experimentArray}
                        replicateExpsArray={result.replicate_exps}
                        passExperiments={intersection}
                        key={keyVal+result['@id']}
                        rowNumber={resultCount++}
                        facets={facets}
                        fileStats={this.props.fileStats}
                    />
                );
            }
        }.bind(this));

        // Sort
        if(this.state.sortColumn){
            resultListings.sort(function(a,b){
                a = a.key.split('/')[0];
                b = b.key.split('/')[0];
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
            }.bind(this));
        }

        if (resultCount === 0) return null;
        return resultListings;
    },

    renderTable : function(){
        var formattedExperimentSetListings = this.formatExperimentSetListings(this.state.passedExperiments);
        if (!formattedExperimentSetListings) return null;

        return (
            <div className={
                "expset-result-table-fix col-sm-7 col-md-8 col-lg-9" +
                (this.state.overflowingRight ? " overflowing" : "")
            }>

                <h5 className='browse-title'>
                    Showing {formattedExperimentSetListings.length} of {this.totalResultCount()} experiment sets.
                </h5>

                <div className="expset-table-container" ref="expSetTableContainer">
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
                            facets={facets}
                            onFilter={this.onFilter}
                            ignoredFilters={ignoredFilters}
                            className="with-header-bg"
                        />
                    </div>
                    :
                    null
                }
                { this.renderTable() }
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

                <ResultTable {...this.props} targetFiles={targetFiles} fileStats={this.state.fileStats} />

            </div>

        );
    }
});

var Browse = browse.Browse = React.createClass({

    contextTypes: {
        location_href: React.PropTypes.string,
        navigate: React.PropTypes.func
    },

    componentWillMount: function() {
        //var searchBase = url.parse(this.context.location_href).search || '';
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
        if(searchBase.indexOf('?type=ExperimentSetReplicate') === -1){
            return(
                <div className="error-page">
                    <h4>
                        <a href='/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all'>
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
                    key={undefined}
                    fileFormats={fileFormats}
                    searchBase={searchBase}
                    onChange={this.context.navigate}
                />

            </div>
        );

        /**
         * Re: removing .panel above: .panel not really needed; adds extra outer padding which causes
         * non-alignment w/ navbar logo.
         */

    }
});

globals.content_views.register(Browse, 'Browse');
