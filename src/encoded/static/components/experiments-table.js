var React = require('react');
var Table = require('react-bootstrap').Table;
var Checkbox = require('react-bootstrap').Checkbox;
var _ = require('underscore');

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

    propTypes : {
        columnHeaders : React.PropTypes.array.isRequired,
        experimentArray : React.PropTypes.array,
        fileDetailContainer : React.PropTypes.object,
        passExperiments : React.PropTypes.instanceOf(Set),
        expSetFilters : React.PropTypes.object,
        parentController : function(props, propName, componentName){
            // Custom validation
            if (props[propName] && 
                (typeof props[propName].state.checked != 'boolean' || !(props[propName].state.selectedFiles instanceof Set))
            ){
                return new Error('parentController must be a React Component passed in as "this", with "selectedFiles" (Set) and "checked" (bool) in its state.');
            } 
        }
    },

    getInitialState: function() {
        return {
            checked: true,
            selectedFiles: new Set()
        };
    },

    fileDetailContainer : null,

    componentWillMount : function(){
        // Cache output for faster re-rendering (?)
        this.fileDetailContainer = this.getFileDetailContainer();
    },

    componentWillUpdate : function(nextProps, nextState){
        this.fileDetailContainer = this.getFileDetailContainer(nextProps);
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
            return props.fileDetailContainer; 
        }
        return getFileDetailContainer(props.experimentArray, props.passExperiments);
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

        var childFileEntryRows = Object.keys(fileDetail).map(function (file) {
            return (
                <FileEntry 
                    expSetFilters={this.props.expSetFilters || null} 
                    info={fileDetail[file]} 
                    key={fileDetail[file]['uuid'] + file} 
                    parentChecked={checked} 
                    handleFileUpdate={this.handleFileUpdate}
                    columnHeaders={this.props.columnHeaders}
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
                    <td rowSpan="2" className="expset-exp-cell expset-exp-accession-title-cell">
                        <a href={
                            info['@id']  ? info['@id'] :
                            info['accession'] ? '/experiments/' + info['accession'] :
                            '#'
                        }>
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