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
        passExperiments : React.PropTypes.instanceOf(Set),
        experimentArray : React.PropTypes.array,
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

    handleFileUpdate: function (uuid, add=true){
        var newSet = this.state.selectedFiles;
        
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

    getFileDetailContainer : function(){
        // Re-use if passed in by a parent as a prop, 
        // otherwise generate from experimentArray & passExperiments props.
        if (this.props.fileDetailContainer) return this.props.fileDetailContainer; 
        return getFileDetailContainer(this.props.experimentArray, this.props.passExperiments);
    },

    render : function(){
        var fileDetailContainer = this.getFileDetailContainer();
        var fileDetail = fileDetailContainer.fileDetail;
        var emptyExps = fileDetailContainer.emptyExps;

        var formattedColumnHeaders = this.props.columnHeaders.map(function(columnTitle, i){
            return <th className="text-500" key={i}>{ columnTitle }</th>;
        });

        // Let parentController control 'checked' state if provided.
        // Fallback to own state otherwise.
        if (this.props.parentController) {
            var checked = this.props.parentController.state.checked;
        } else {
            var checked = this.state.checked;
        }

        var childFileEntryRows = Object.keys(fileDetail).map(function (file) {
            return (
                <FileEntry 
                    expSetFilters={this.props.expSetFilters} 
                    info={fileDetail[file]} 
                    key={fileDetail[file]['uuid'] + file} 
                    parentChecked={checked} 
                    handleFileUpdate={this.handleFileUpdate}
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
 */

var getFileDetailContainer = module.exports.getFileDetailContainer = function(experimentArray, passedExperiments){

    var fileDetail = {}; //use @id field as key
    var emptyExps = [];

    for (var i=0; i<experimentArray.length; i++){
        if(passedExperiments.has(experimentArray[i])){
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
            }

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
                for(var k=0;k<tempFiles.length;k++){

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
    return { 'fileDetail' : fileDetail, 'emptyExps' : emptyExps };
}


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
            fileID = this.state.checked + "~" + true + "~" + file.file_format + "~" + file.uuid;
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