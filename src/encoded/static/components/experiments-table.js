'use strict';

var React = require('react');
var Table = require('react-bootstrap').Table;
var Checkbox = require('react-bootstrap').Checkbox;
var _ = require('underscore');
var FacetList = require('./facetlist'); // Only used for statics.
var console = require('./objectutils').console;

/**
 * To be used within Experiments Set View/Page, or
 * within a collapsible row on the browse page.
 * 
 * Shows experiments only, not experiment sets.
 * 
 * Allows either table component itself to control state of "selectedFiles"
 * or for a parentController (passed in as a prop) to take over management
 * of "selectedFiles" Set and "checked", for integration with other pages/UI.
 */

var ExperimentsTable = module.exports.ExperimentsTable = React.createClass({

    statics : {

        /* List of headers which are created/controlled by component (not customizable), by experimentset_type */
        builtInHeaders : function(expSetType = 'replicate'){
            switch (expSetType){
                case 'replicate' : 
                    return [
                        'Biosample Accession',
                        'Experiment Accession',
                        'File Accession'
                    ];
                default: 
                    return [
                        'Experiment Accession'
                    ];
            }
            
        },

        totalExperimentsCount : function(experimentArray = null){
            if (!experimentArray) return null;
            var experimentsCount = 0;
            var fileSet = new Set();
            for (var i = 0; i < experimentArray.length; i++){
                if (experimentArray[i].files && experimentArray[i].files.length > 0){
                    experimentsCount++; // Exclude empty experiments
                    for (var j = 0; j < experimentArray[i].files.length; j++){
                        if (!fileSet.has(experimentArray[i].files[j]['@id'])){
                            fileSet.add(experimentArray[i].files[j]['@id']);
                        }
                    }
                } else if (experimentArray[i].filesets && experimentArray[i].filesets.length > 0){
                    experimentsCount++;
                    for (var j = 0; j < experimentArray[i].filesets.length; j++){
                        for (var k = 0; k < experimentArray[i].filesets[j].files_in_set.length; k++){
                            if (!fileSet.has(experimentArray[i].filesets[j].files_in_set[k]['@id'])){
                                fileSet.add(experimentArray[i].filesets[j].files_in_set[k]['@id']);
                            }
                        }
                    }
                } else {
                    console.error("Couldn't find files for experiment - excluding from total count", experimentArray[i]);
                }
            }
            return {
                'experiments' : experimentsCount,
                'files' : fileSet.size
            };
        },

        visibleExperimentsCount : function(experimentArray){
            if (!Array.isArray(experimentArray)) return null;
            var fileKeys = Object.keys(fileDetailContainer.fileDetail);
            var experiments = new Set();
            var fileSet = new Set(fileKeys);

            for (var i = 0; i < fileKeys.length; i++){
                if (!experiments.has(fileDetailContainer.fileDetail[fileKeys[i]]['@id'])){
                    experiments.add(fileDetailContainer.fileDetail[fileKeys[i]]['@id']);
                }
                if (fileDetailContainer.fileDetail[fileKeys[i]].related && fileDetailContainer.fileDetail[fileKeys[i]].related.file){
                    if (!fileSet.has(fileDetailContainer.fileDetail[fileKeys[i]].related.file)){
                        fileSet.add(fileDetailContainer.fileDetail[fileKeys[i]].related.file);
                    }
                }
            }
            return {
                'experiments' : experiments.size,
                'files' : fileSet.size,
                'emptyExperiments' : fileDetailContainer.emptyExps.length
            };
        },

        visibleExperimentsCountDeprecated : function(fileDetailContainer){
            if (!fileDetailContainer) return null;
            var fileKeys = Object.keys(fileDetailContainer.fileDetail);
            var experiments = new Set();
            var fileSet = new Set(fileKeys);

            for (var i = 0; i < fileKeys.length; i++){
                if (!experiments.has(fileDetailContainer.fileDetail[fileKeys[i]]['@id'])){
                    experiments.add(fileDetailContainer.fileDetail[fileKeys[i]]['@id']);
                }
                if (fileDetailContainer.fileDetail[fileKeys[i]].related && fileDetailContainer.fileDetail[fileKeys[i]].related.file){
                    if (!fileSet.has(fileDetailContainer.fileDetail[fileKeys[i]].related.file)){
                        fileSet.add(fileDetailContainer.fileDetail[fileKeys[i]].related.file);
                    }
                }
            }
            return {
                'experiments' : experiments.size,
                'files' : fileSet.size,
                'emptyExperiments' : fileDetailContainer.emptyExps.length
            };
        },

        renderBlockLabel : function(title, subtitle = null, inline = false, className = null){

            function titleElement(){
                return React.createElement(
                    inline ? 'span' : 'div',
                    { className : "label-title" },
                    title
                );
            }

            function subtitleElement(){
                if (!subtitle) return null;
                return React.createElement(
                    inline ? 'span' : 'div',
                    { className : "ext" },
                    subtitle
                );
            }

            return (
                <div className={"label-ext-info" + (className ? ' ' + className : '') }>
                    { titleElement() }
                    { subtitleElement() }
                </div>
            );
        },

    },

    propTypes : {
        columnHeaders : React.PropTypes.array,
        experimentArray : React.PropTypes.array,
        passExperiments : React.PropTypes.instanceOf(Set),
        expSetFilters : React.PropTypes.object,
        // If include completed 'fileDetailContainer', e.g. as from Browse, then
        // 'passExperiments', 'expSetFilters', and 'facets' are not needed.
        fileDetailContainer : React.PropTypes.object,
        parentController : function(props, propName, componentName){
            // Custom validation
            if (props[propName] && 
                (typeof props[propName].state.checked != 'boolean' || !(props[propName].state.selectedFiles instanceof Set))
            ){
                return new Error('parentController must be a React Component passed in as "this", with "selectedFiles" (Set) and "checked" (bool) in its state.');
            } 
        },
        keepCounts : React.PropTypes.bool // Whether to run updateCachedCounts and store output in this.counts (get from instance if ref, etc.) 
    },

    getDefaultProps : function(){
        return {
            keepCounts : false,
            columnHeaders : [
                'Biosample Accession',
                'Experiment Accession', 
                'File Accession', 
                'File Type',
                'File Info'
            ]
        };
    },

    getInitialState: function() {
        return {
            checked: true,
            selectedFiles: new Set(),
            //counts : this.getCounts(false, fileDetailContainer)
        };
    },

    componentWillReceiveProps : function(nextProps){
        if (
            nextProps.fileDetailContainer !== this.props.fileDetailContainer ||
            nextProps.passExperiments !== this.props.passExperiments ||
            nextProps.experimentArray !== this.props.experimentArray ||
            nextProps.expSetFilters !== this.props.expSetFilters
        ){
            var fileDetailContainer = this.getFileDetailContainer(nextProps);
            this.setState({
                fileDetailContainer : fileDetailContainer,
                counts : this.getCounts(nextProps.experimentArray !== this.props.experimentArray, fileDetailContainer)
            });
        }
    },

    customizableColumnHeaders : function(){
        return this.props.columnHeaders.filter((c) => { 
            return ExperimentsTable.builtInHeaders(this.props.experimentSetType).indexOf(c) === -1;
        });
    },

    getCounts : function(includeTotals = false, fileDetailContainer = this.state.fileDetailContainer){
        var counts = {};
        if (!this.props.keepCounts) return; // Prevent execution if not necessary (specify in props)
        var visibleCounts = ExperimentsTable.visibleExperimentsCountDeprecated(fileDetailContainer);
        counts.visibleExperiments = visibleCounts.experiments;
        counts.visibleFiles = visibleCounts.files;
        if (includeTotals && this.props.experimentArray && Array.isArray(this.props.experimentArray)){
            // Only available if experimentArray is passed to props.
            var totalCounts = ExperimentsTable.totalExperimentsCount(this.props.experimentArray);
            if (totalCounts){
                counts.totalExperiments = totalCounts.experiments;
                counts.totalFiles = totalCounts.files;
            }
        }
        return counts;
    },

    handleFileUpdate: function (uuid, add=true){
        
        var newSet = this.props.parentController ? this.props.parentController.state.selectedFiles : this.state.selectedFiles;
        
        if(add){
            if(!newSet.has(uuid)){
                newSet.add(uuid);
            }
        } else if (newSet.has(uuid)) {
            newSet.delete(uuid);
        }

        if (!this.props.parentController){
            // Set state on self if no parent controller
            this.setState({
                selectedFiles: newSet
            });
        } else {
            this.props.parentController.setState({
                selectedFiles: newSet
            });
        }
        
    },

    getFileDetailContainer : function(props = this.props){
        // Re-use if passed in by a parent as a prop, 
        // otherwise generate from experimentArray & passExperiments props.

        if (props.fileDetailContainer) {
            // If filtering of results is done in parent component.
            return props.fileDetailContainer; 
        }

        var passExperiments = props.passExperiments,
            ignoredFilters = null;


        if (!passExperiments && props.expSetFilters) {
            if (props.facets && props.facets.length > 0) {
                ignoredFilters = FacetList.findIgnoredFiltersByMissingFacets(props.facets, props.expSetFilters);
            }
            passExperiments = FacetList.siftExperiments(props.experimentArray, props.expSetFilters, ignoredFilters);
        }
        
        return getFileDetailContainer(props.experimentArray, passExperiments);
    },

    /**
     * Here we render nested divs for a 'table' of experiments with shared elements spanning multiple rows,
     * e.g. an experiment block's height is the combined height of its containing file rows, biosample height
     * is combined height of its containing experiment rows (experiments that share that biosample).
     *  ___________________________________________________
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * | Biosample  _______________________________________|
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * |___________________________________________________|
     * 
     * Much of styling/layouting is defined in CSS.
     */
    renderReplicates : function(){

        var renderFileBlock = function(file, i, filesArr){
            var checked = this.state.checked;
            if (this.props.parentController && this.props.parentController.state) checked = this.props.parentController.state.checked;
            return (
                <FileEntryBlock
                    key={file['@id']}
                    parentChecked={checked}
                    file={file}
                    columnHeaders={ this.customizableColumnHeaders() }
                    handleFileUpdate={this.handleFileUpdate}
                    className={null}
                    replicateNum={i + 1}
                    isSingleItem={filesArr.length < 2 ? true : false}
                />
            );
        }.bind(this);

        var oddExpRow = false; // Alternate throughout all experiments (vs only within biosample), for striping

        var renderExperimentBlock = function(exp,i){
            oddExpRow = !oddExpRow;
            return (
                <div className={"s-block experiment hide-name-on-block-hover " + (oddExpRow ? 'odd' : 'even')} key={exp['@id']}>
                    <div className="name col-experiment">
                        { ExperimentsTable.renderBlockLabel('Experiment', 'Tech Replicate ' + exp.tec_rep_no) }
                        <a href={ exp['@id'] || '#' } className="name-title mono-text">{ exp.accession }</a>
                    </div>
                    <div className="files">
                        { Array.isArray(exp.files) ? exp.files.map(renderFileBlock) :
                            <FileEntryBlock file={null} columnHeaders={ this.customizableColumnHeaders() } />
                        }
                    </div>
                </div>
            );
        }.bind(this);

        var renderBiosampleBlock = function(expsWithBiosample,i){
            return (
                <div className="s-block biosample hide-name-on-block-hover" key={expsWithBiosample[0].biosample['@id']}>
                    <div className="name col-biosample" style={ expsWithBiosample.length > 3 ? { "position" : "relative" } : null }>
                        { ExperimentsTable.renderBlockLabel('Biosample', 'Bio Replicate ' + expsWithBiosample[0].biosample.bio_rep_no) }
                        <a href={ expsWithBiosample[0].biosample['@id'] || '#' } className="name-title mono-text">{ expsWithBiosample[0].biosample.accession }</a>
                    </div>
                    <div className="experiments">
                        { expsWithBiosample.map(renderExperimentBlock) }
                    </div>
                </div>
            );
        }.bind(this);

        function groupExperimentsByBiosample(experiments){
            return _(experiments).chain()
                .groupBy(function(exp){
                    return exp.biosample.bio_rep_no;
                })          // Creates { '1' : [expObjWBiosample1-1, expObjWBiosample1-2, ...], '2' : [expObjWBiosample2-1, expObjWBiosample2-2, ...], ... }
                .pairs()    // Creates [['1', [expObjWBiosample1-1, expObjWBiosample1-2]], ['2', [expObjWBiosample2-1, expObjWBiosample2-2]], ...]
                .sortBy(function(expSet){ return parseInt(expSet[0]); })
                .map(function(expSet){ return _.sortBy(expSet[1], 'tec_rep_no'); }) // Creates [[expObjWBiosample1-1, expObjWBiosample1-2], [expObjWBiosample2-1, expObjWBiosample2-2], ...]
                .value();
        };

        function combineWithReplicateNumbers(experimentsWithReplicateNums, fullExperimentData){
            if (!Array.isArray(experimentsWithReplicateNums)) return false;
            return _(experimentsWithReplicateNums).chain()
                .map(function(r){ 
                    return {
                        'tec_rep_no' : r.tec_rep_no || null,
                        'bio_rep_no' : r.bio_rep_no || null,
                        '@id' : r.replicate_exp['@id']
                    };
                })
                .zip(fullExperimentData) // On ExpSet view at least, replicate_exps and experiments_in_set are provided in same order, so can avoid nested loop.
                .map(function(r){
                    r[1].biosample.bio_rep_no = r[0].bio_rep_no; // Copy over bio_rep_no to biosample to ensure sorting.
                    return _.extend(r[0], r[1]);
                })
                /*
                .map((r) => {
                    // Looped findWhere takes about 3x longer for 72 exps than zipping in and extending on experimentArray, 
                    // so try to avoid unless arrays are NOT aligned.
                    return _.extend(r, _.findWhere(fullExperimentData, { '@id' : r['@id'] }));
                })
                */
                .value()
        }

        /* Measure sorting/aligning performance */
        /*
        var startTime = Date.now();
        var sortedExps = groupExperimentsByBiosample(combineWithReplicateNumbers(this.props.replicateExpsArray, this.props.experimentArray));
        var duration = Date.now() - startTime;
        console.log(sortedExps, duration);
        */

        return (
            <div className="biosamples">
                { 
                    groupExperimentsByBiosample(
                        combineWithReplicateNumbers(
                            this.props.replicateExpsArray,
                            this.props.experimentArray
                        )
                    ).map(renderBiosampleBlock) 
                }
            </div>
        );
    },

    render : function(){
        // TODO: Instead of renderReplicates, use render method dependent on props.experimentSetType to handle all types.
        return (
            <div className="expset-experiments">
                <div className="headers">
                    <div className="heading-block col-biosample">Biosample Accession</div>
                    <div className="heading-block col-experiment">Experiment Accession</div>
                    <div className="heading-block col-file">File Accession</div>
                    { this.customizableColumnHeaders().map(function(columnTitle, i){
                        return <div className="heading-block col-file-detail" key={i}>{ columnTitle }</div>;
                    }) }
                </div>
                <div className="body">
                    { this.renderReplicates() }
                </div>
            </div>
        );
    }

});

var FileEntryBlock  = React.createClass({

    getInitialState: function() {
        return {
            checked: this.props.parentChecked
        };
    },

    // initial checkbox setting if parent is checked
    componentWillMount: function(){
        if(
            this.props.file &&
            this.props.file['@id'] &&
            this.state.checked &&
            typeof this.props.handleFileUpdate === 'function'
        ){
            this.props.handleFileUpdate(this.props.file.uuid, true);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if(this.props.parentChecked !== nextProps.parentChecked){
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
    
    filledFileRow : function (file = this.props.file){
        var row = [];
        var cols = this.props.columnHeaders;
        var className = (this.props.className || '') + " col-file-detail item detail-col-";
        for (var i = 0; i < cols.length; i++){

            if (!file || !file['@id']) { 
                row.push(<div key={"file-detail-empty-" + i} className={className + i}></div>);
                continue;
            }

            if (cols[i] == 'File Type'){
                row.push(<div key="file-type" className={className + i}>{file.file_format}</div>);
                continue;
            }

            if (cols[i] == 'File Info'){
                if (typeof file.paired_end !== 'undefined') {
                    row.push(<div key="file-info" className={className + i}>Paired end {file.paired_end}</div>);
                } else if (file.file_format === 'fastq' || file.file_format === 'fasta') {
                    row.push(<div key="file-info" className={className + i}>Unpaired</div>);
                } else {
                    row.push(<div key="file-info" className={className + i}></div>);
                }
                continue;
            }
        }
        return row;
    },

    renderName : function(){

        function titleString(){
            if (!this.props.file) return 'No Files';
            return this.props.file.accession || this.props.file.uuid || this.props.file['@id'];
        }

        function title(){
            if (!this.props.file) return <span className="name-title">{ titleString.call(this) }</span>;
            return (
                <a className="name-title mono-text" href={ this.props.file['@id'] || '#' }>
                    { titleString.call(this) }
                </a>
            );
        }

        return (
            <div className={"name col-file" + (this.props.file && this.props.file.accession ? ' mono-text' : '')}>
                { this.props.file ? ExperimentsTable.renderBlockLabel(
                    'File',
                    this.props.replicateNum ? 'Seq Replicate ' + this.props.replicateNum : null,
                    false,
                    'col-file'
                ) : null }
                { title.call(this) }
            </div>
        );
    },

    render : function(){
        return (
            <div className={"s-block file hide-name-on-block-hover" + (this.props.isSingleItem ? ' single-item' : '') }>
                { this.renderName() }
                { this.filledFileRow() }
            </div>
        );
    }

});

/**
 * Returns an object containing fileDetail and emptyExps.
 * 
 * @param {Object[]} experimentArray - Array of experiments in set. Required.
 * @param {Set} [passedExperiments=null] - Set of experiments which match filter(s).
 * @return {Object} JS object containing two keys with arrays: 'fileDetail' of experiments with formatted details and 'emptyExps' with experiments with no files.
 */

var getFileDetailContainer = module.exports.getFileDetailContainer = function(experimentArray, passedExperiments = null){

    var fileDetail = {}; //use @id field as key
    var emptyExps = [];

    for (var i=0; i<experimentArray.length; i++){
        if(typeof passedExperiments === 'undefined' || passedExperiments == null || passedExperiments.has(experimentArray[i])){
            var tempFiles = [];
            var biosample_accession = experimentArray[i].biosample ? experimentArray[i].biosample.accession : null;
            var biosample_id = biosample_accession ? experimentArray[i].biosample['@id'] : null;

            var experimentDetails = {
                'accession':    experimentArray[i].accession,
                'biosample':    biosample_accession,
                'biosample_id': biosample_id,
                'uuid':         experimentArray[i].uuid,
                '@id' :         experimentArray[i]['@id']
                // Still missing : 'data', 'related'
            };

            if(experimentArray[i].files){
                tempFiles = experimentArray[i].files;
            } else if (experimentArray[i].filesets) {
                for (var j=0; j<experimentArray[i].filesets.length; j++) {
                    if (experimentArray[i].filesets[j].files_in_set) {
                        tempFiles = tempFiles.concat(experimentArray[i].filesets[j].files_in_set);
                    }
                }
            // No files in experiment
            } else {
                emptyExps.push(experimentArray[i]['@id']);
                experimentDetails.data = {};
                fileDetail[experimentArray[i]['@id']] = experimentDetails;
                continue;
            }

            // save appropriate experiment info
            if(tempFiles.length > 0){
                var relatedFiles = {};
                var relatedData = [];
                var k;
                for(k=0;k<tempFiles.length;k++){

                    // only use first file relation for now. Only support one relationship total
                    if(tempFiles[k].related_files && tempFiles[k].related_files[0].file){
                        // in form [related file @id, this file @id]
                        relatedFiles[tempFiles[k].related_files[0].file] =  tempFiles[k]['@id'];
                        fileDetail[tempFiles[k]['@id']] = _.extend({
                            'data' : tempFiles[k],
                            'related' : {
                                'relationship_type':tempFiles[k].related_files[0].relationship_type,
                                'file':tempFiles[k].related_files[0].file,
                                'data':null
                            }
                        }, experimentDetails);
                    } else {
                        fileDetail[tempFiles[k]['@id']] = _.extend({
                            'data' : tempFiles[k]
                        }, experimentDetails);
                    }
                }
                var usedRelations = [];
                for(k=0;k<tempFiles.length;k++){
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
    return { 'fileDetail' : fileDetail, 'emptyExps' : emptyExps };
}


var FileEntry = React.createClass({

    // TODO (ideally): Functionality to customize columns (e.g. pass in a schema instead of list of 
    // column names, arrange fields appropriately under them).

    getInitialState: function() {
        return {
            checked: this.props.parentChecked
        };
    },

    getDefaultProps : function(){
        return {
            experimentAccessionEntrySpan : 1
        };
    },

    // initial checkbox setting if parent is checked
    componentWillMount: function(){
        // if(this.props.exptPassed && _.contains(this.props.filteredFiles, this.props.file.uuid)){
        //     this.setState({
        //         checked: true
        //     });
        // }
        if(
            this.props.info.data &&
            this.props.info.data['@id'] &&
            this.state.checked &&
            typeof this.props.handleFileUpdate == 'function'
        ){
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
    componentWillUpdate(nextProps, nextState){
        if(
            (nextState.checked !== this.state.checked || this.props.expSetFilters !== nextProps.expSetFilters) &&
            nextProps.info.data &&
            nextProps.info.data['@id']
        ){
            this.props.handleFileUpdate(nextProps.info.data.uuid, nextState.checked);
        }
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    fastQFilePairRow : function(file, relatedFile, columnsOffset = 3){

        var columnHeadersShortened = this.props.columnHeaders.slice(columnsOffset);

        var fileOne;
        var fileTwo;
        var fileID;

        function fillFileRow(file, paired, exists = true){
            var f = [];
            for (var i = 0; i < columnHeadersShortened.length; i++){

                if (columnHeadersShortened[i] == 'File Accession'){
                    if (!exists) { 
                        f.push(<td>No files</td>);
                        continue;
                    } 
                    f.push(<td><a href={file['@id'] || ''}>{file.accession || file.uuid || file['@id']}</a></td>);
                }

                if (!exists) { 
                    f.push(<td></td>);
                    continue;
                }

                if (columnHeadersShortened[i] == 'File Type'){
                    f.push(<td>{file.file_format}</td>);
                    continue;
                }

                if (columnHeadersShortened[i] == 'File Info'){
                    if (paired) {
                        f.push(<td>Paired end {file.paired_end}</td>);
                    } else if (file.file_format === 'fastq' || file.file_format === 'fasta') {
                        f.push(<td>Unpaired</td>);
                    } else {
                        f.push(<td></td>);
                    }
                    continue;
                }
            }
            return f;
        }

        // code embarrasingly specific to fastq file pairs
        if(file){
            if(file.paired_end && file.paired_end === '1'){
                fileOne = fillFileRow(file, true, true);
            }else if(file.paired_end && file.paired_end === '2'){
                fileTwo = fillFileRow(file, true, true);
            }else{
                if(file['@id']){
                    fileOne = fillFileRow(file, false, true);
                }else{
                    fileOne = fillFileRow(file, false, false);
                }
            }
            fileID = this.state.checked + "~" + true + "~" + file.file_format + "~" + file.uuid;
        }
        if(relatedFile){
            if(relatedFile.paired_end && relatedFile.paired_end === '1'){
                fileOne = fillFileRow(relatedFile, true, true);
            }else if(relatedFile.paired_end && relatedFile.paired_end === '2'){
                fileTwo = fillFileRow(relatedFile, true, true);
            }else{
                fileTwo = fillFileRow(relatedFile, true, true);
            }
        }
        return {
            'fileOne' : fileOne,
            'fileTwo' : fileTwo,
            'fileID'  : fileID
        }
    },

    render: function(){
        var info = this.props.info;
        var file = info.data ? info.data : null;
        var relationship = info.related ? info.related : null;
        var relatedFile = null;

        if(relationship && relationship.data){
            relatedFile = relationship.data;
        }

        var fileInfo = this.fastQFilePairRow(file, relatedFile); 
        // Maybe later can do like switch...case for which function to run (fastQFilePairRow or other)
        // to fill fileInfo according to type of file or experiment type.
        var fileOne = fileInfo.fileOne;
        var fileTwo = fileInfo.fileTwo;
        var fileID  = fileInfo.fileID;

        console.log("FILEINFO", fileInfo);

        var experimentAccessionCell = null;

        // Will need to separate out <tbody> before rowSpan will work correctly
        //if (this.props.experimentAccessionEntrySpan > 0){
            experimentAccessionCell = (
                <td rowSpan={2/* * this.props.experimentAccessionEntrySpan */} className="expset-exp-cell expset-exp-accession-title-cell">
                    <a href={
                        info['@id']  ? info['@id'] :
                        info['accession'] ? '/experiments/' + info['accession'] :
                        '#'
                    }>
                        {info.accession || info.uuid}
                    </a>
                </td>
            );
        //}
        
        return(
            <tbody>
                <tr className='expset-sublist-entry'>
                    { file['@id'] ?
                        <td rowSpan="2" className="expset-exp-cell expset-checkbox-cell">
                            <Checkbox validationState='warning' checked={this.state.checked} name="file-checkbox" id={fileID} className='expset-checkbox-sub' onChange={this.handleCheck}/>
                        </td>
                    : 
                        <td rowSpan="2" className="expset-exp-cell expset-checkbox-cell">
                            <Checkbox checked={false} disabled={true} className='expset-checkbox-sub' />
                        </td>
                    }
                    { experimentAccessionCell }
                    <td rowSpan="2" className="expset-exp-cell">
                        <a href={info.biosample_id || '#'}>
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