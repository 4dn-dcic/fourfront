var React = require('react');
var Table = require('react-bootstrap').Table;
var Checkbox = require('react-bootstrap').Checkbox;
var _ = require('underscore');
var siftExperiments = require('./facetlist').siftExperiments;
var FacetList = require('./facetlist').FacetList; // Only used for statics.

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

        visibleExperimentsCount : function(fileDetailContainer){
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
        }

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
                null, 
                'Experiment Accession', 
                'Biosample Accession',
                'File Accession', 
                'File Type',
                'File Info'
            ]
        };
    },

    getInitialState: function() {
        return {
            checked: true,
            selectedFiles: new Set()
        };
    },

    // Mutable non-state data, e.g. value caching.
    fileDetailContainer : null,
    counts : {
        visibleExperiments : null,
        visibleFiles : null,
        totalExperiments : null,
        totalFiles : null
    },

    componentWillMount : function(){
        // Cache output for faster re-rendering (?)
        this.fileDetailContainer = this.getFileDetailContainer();
        this.updateCachedCounts(true);
    },

    componentWillReceiveProps : function(nextProps){
        if (
            nextProps.fileDetailContainer !== this.props.fileDetailContainer ||
            nextProps.passExperiments !== this.props.passExperiments ||
            nextProps.experimentArray !== this.props.experimentArray ||
            nextProps.expSetFilters !== this.props.expSetFilters
        ){
            this.fileDetailContainer = this.getFileDetailContainer(nextProps);
            this.updateCachedCounts(nextProps.experimentArray !== this.props.experimentArray);
        }
    },

    updateCachedCounts : function(updateTotals = false){
        if (!this.props.keepCounts) return; // Prevent execution if not necessary (specify in props)
        var visibleCounts = ExperimentsTable.visibleExperimentsCount(this.fileDetailContainer);
        this.counts.visibleExperiments = visibleCounts.experiments;
        this.counts.visibleFiles = visibleCounts.files;
        if (updateTotals && this.props.experimentArray && Array.isArray(this.props.experimentArray)){
            // Only available if experimentArray is passed to props.
            var totalCounts = ExperimentsTable.totalExperimentsCount(this.props.experimentArray);
            if (totalCounts){
                this.counts.totalExperiments = totalCounts.experiments;
                this.counts.totalFiles = totalCounts.files;
            }
        }
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
                ignoredFilters = FacetList.findIgnoredFilters(props.facets, props.expSetFilters);
            }
            passExperiments = siftExperiments(props.experimentArray, props.expSetFilters, ignoredFilters);
        }
        
        return getFileDetailContainer(props.experimentArray, passExperiments);
    },

    render : function(){
        var fileDetail = this.fileDetailContainer.fileDetail;
        var emptyExps = this.fileDetailContainer.emptyExps;

        var formattedColumnHeaders = this.props.columnHeaders.map(function(columnTitle, i){
            return <th className="text-500" key={i}>{ columnTitle }</th>;
        });

        // Let parentController control 'checked' state if provided.
        // Fallback to own state otherwise.
        var checked;
        if (this.props.parentController) {
            checked = this.props.parentController.state.checked;
        } else {
            checked = this.state.checked;
        }

        var expsWithFileCounts = {};
        var childFileEntryRows = Object.keys(fileDetail).map(function (file) {

            // Check how many file entries have same exp. accession.
            // To allow to set rowSpan multiple where exp accession is same between files.
            if (!expsWithFileCounts[file]) {
                var skip = false;
                // Allow only 1 file to have incremented count (for incr. rowspan)
                Object.keys(expsWithFileCounts).forEach(function(file2){
                    if (expsWithFileCounts[file2].exp == fileDetail[file]['@id']) { 
                        skip = true;
                        return;
                    }
                });
                expsWithFileCounts[file] = { 
                    'exp' : fileDetail[file]['@id'],
                    'count' : 0,
                    'skip' : skip
                };

            }
            Object.keys(fileDetail).forEach(function(file2){
                if (expsWithFileCounts[file].exp == fileDetail[file2]['@id']) { 
                    if (!expsWithFileCounts[file].skip) expsWithFileCounts[file].count++;
                }
            });

            return (
                <FileEntry 
                    expSetFilters={this.props.expSetFilters || null} 
                    info={fileDetail[file]} 
                    key={fileDetail[file]['uuid'] + file} 
                    parentChecked={checked} 
                    handleFileUpdate={this.handleFileUpdate}
                    columnHeaders={this.props.columnHeaders}
                    experimentAccessionEntrySpan={expsWithFileCounts[file].count}
                />
            );
        }.bind(this));

        // sort to group experiments
        childFileEntryRows.sort(function(a,b){
            return(a.key - b.key);
        });

        return (
            <Table className="expset-table" striped bordered condensed hover>
                <thead>
                    <tr>
                        { formattedColumnHeaders }
                    </tr>
                </thead>
                { childFileEntryRows }
            </Table>
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
        if(passedExperiments == null || passedExperiments.has(experimentArray[i])){
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