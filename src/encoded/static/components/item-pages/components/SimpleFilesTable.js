'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ItemPageTable } from './../../browse/components/ItemPageTable';
import { ajax, console, layout, expFxn, object } from './../../util';


export class SimpleFilesTable extends React.Component {

    static propTypes = {
        'files'                 : PropTypes.arrayOf(PropTypes.shape({
            'accession'             : PropTypes.string.isRequired,
            'display_title'         : PropTypes.string.isRequired,
            'link_id'               : PropTypes.string.isRequired,
            'from_experiment'       : PropTypes.shape({
                'accession'             : PropTypes.string.isRequired,
                'link_id'               : PropTypes.string.isRequired
            }),
            'from_experiment_set'   : PropTypes.shape({
                'accession'             : PropTypes.string.isRequired,
                'link_id'               : PropTypes.string.isRequired
            })
        }))
    }

    static defaultProps = {
        'columns' : {
            "file_format"       : "Format",
            "file_size"         : "Size",
            "file_type" : "File Type",
        },
        'columnDefinitionOverrideMap' : _.extend({}, ItemPageTable.defaultProps.columnDefinitionOverrideMap, {
            'file_size' : {
                'minColumnWidth' : 60,
                'widthMap' : { 'sm' : 50, 'md' : 50, 'lg' : 60 }
            }
        })
    }

    render(){
        var reducedFiles = expFxn.reduceProcessedFilesWithExperimentsAndSets(this.props.files);

        return (
            <ItemPageTable
                results={reducedFiles}
                //renderDetailPane={(es, rowNum, width)=> <ExperimentSetDetailPane result={es} containerWidth={width || null} paddingWidthMap={{
                //    'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
                //}} />}
                schemas={this.props.schemas}
                columns={this.props.columns}
                columnDefinitionOverrideMap={this.props.columnDefinitionOverrideMap}
                width={this.props.width}
            />
        );
    }

}

export class SimpleFilesTableLoaded extends React.Component {
    
    static propTypes = {
        'files' : SimpleFilesTable.propTypes.files,
        'sortFxn' : PropTypes.func
    }

    static isFileCompleteEnough(expSet){
        // TODO
        return false;
    }

    static defaultProps = {
        'columns' : SimpleFilesTable.defaultProps.columns,
        'columnDefinitionOverrideMap' : SimpleFilesTable.defaultProps.columnDefinitionOverrideMap
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);

        // Get ExpSets from this file, check if are complete (have bio_rep_no, etc.), and use if so; otherwise, save 'this.experiment_set_uris' to be picked up by componentDidMount and fetched.
        var files = this.props.files;
        var filesForState = null;

        if (Array.isArray(files) && files.length > 0 && SimpleFilesTableLoaded.isFileCompleteEnough(files[0])){
            filesForState = files;
        } else {
            this.file_uris = _.map(files, object.atIdFromObject);
        }

        this.state = {
            'files' : filesForState
        };
    }

    componentDidMount(){
        var newState = {};

        var onFinishLoad = null;

        if (Array.isArray(this.file_uris) && this.file_uris.length > 0){

            onFinishLoad = _.after(this.file_uris.length, function(){
                this.setState({ 'loading' : false });
            }.bind(this));

            newState.loading = true;
            _.forEach(this.file_uris, (uri)=>{
                ajax.load(uri, (r)=>{
                    var currentFiles = (this.state.files || []).slice(0);
                    currentFiles.push(r);
                    this.setState({ files : currentFiles }, onFinishLoad);
                }, 'GET', onFinishLoad);
            });
        }
        
        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    componentWillUnmount(){
        delete this.file_uris;
    }

    render(){
        if (this.state.loading){
            return <span>'loading'</span>;
        }
        return (
            <layout.WindowResizeUpdateTrigger>
                <SimpleFilesTable
                    loading={this.state.loading}
                    files={this.state.files}
                    sortFxn={this.props.sortFxn}
                    columns={this.props.columns}
                    columnDefinitionOverrideMap={this.props.columnDefinitionOverrideMap}
                    width={this.props.width}
                />
            </layout.WindowResizeUpdateTrigger>
        );
    }
}