'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';


/**
 * IN PROGRESS -- TODO: Decide if we should store "selectedFiles" or "unselectedFiles" (re: 'All files in facet selection are selected by default')
 *
 * @export
 * @class SelectedFilesController
 * @extends {React.Component}
 */
export class SelectedFilesController extends React.Component {

    /**
     * Includes related files that might be saved in memo values.
     *
     * @static
     * @returns {string[]} List of file UUIDs.
     */
    static objectToCompleteList(selectFilesObj){
        return _.keys(selectFilesObj);
    }

    static listToObject(selectedFilesList){
        return _.object(selectedFilesList.map(function(uuid){
            return [uuid, true];
        }));
    }

    static parseInitiallySelectedFiles(initiallySelectedFiles){
        return (
            Array.isArray(initiallySelectedFiles) ? SelectedFilesController.listToObject(initiallySelectedFiles) :
                initiallySelectedFiles ? initiallySelectedFiles : {}
        );
    }

    static uniqueFileCountByUUID(selectedFiles){
        return _.uniq(_.pluck(_.values(selectedFiles), 'uuid')).length;
    }

    static defaultProps = {
        'initiallySelectedFiles' : null,
        'resetSelectedFilesCheck' : function(nextProps, pastProps){
            if (typeof nextProps.href === 'string') {
                if (nextProps.href !== pastProps.href) return true;
            }
            if (nextProps.context && pastProps.context && nextProps.context !== pastProps.context) {
                if (Array.isArray(pastProps.context['@graph']) && !Array.isArray(nextProps.context['@graph'])) return true;
                //if (Array.isArray(pastProps.context['@graph']) && Array.isArray(nextProps.context['@graph'])) {
                //    var pastGraph = pastProps.context['@graph'];
                //    var newGraph = nextProps.context['@graph'];
                //}
            }
            return false;
        }
    }

    constructor(props){
        super(props);
        this.selectFile = this.selectFile.bind(this);
        this.unselectFile = this.unselectFile.bind(this);
        this.resetSelectedFiles = this.resetSelectedFiles.bind(this);
        this.getFlatList = this.getFlatList.bind(this);

        var selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles),
            selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(selectedFiles);

        this.state = { selectedFiles, selectedFilesUniqueCount };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.resetSelectedFilesCheck(nextProps, this.props)){
            var selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(nextProps.initiallySelectedFiles),
                selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(selectedFiles);
            this.setState({ selectedFiles, selectedFilesUniqueCount });
        }
    }

    selectFile(uuid: string, memo = null){

        var newSelectedFiles = _.clone(this.state.selectedFiles);

        function add(id, memo = null){
            if (typeof newSelectedFiles[id] !== 'undefined'){
                console.error("File already selected!", id);
            } else {
                newSelectedFiles[id] = memo || true;
            }
        }

        if (Array.isArray(uuid)){
            uuid.forEach((id)=>{
                if (typeof id === 'string'){
                    add(id);
                } else if (Array.isArray(id)){
                    add(id[0], id[1]);
                } else throw new Error("Supplied uuid is not a string or array of strings/arrays:", uuid);
            });
        } else if (typeof uuid === 'string') {
            add(uuid, memo);
        } else throw new Error("Supplied uuid is not a string or array of strings/arrays:", uuid);

        var selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(newSelectedFiles);
        this.setState({ 'selectedFiles' : newSelectedFiles, selectedFilesUniqueCount });
    }

    unselectFile(uuid: string){
        var newSelectedFiles = _.clone(this.state.selectedFiles);

        function remove(id) {
            if (typeof newSelectedFiles[id] === 'undefined'){
                console.log(id, newSelectedFiles);
                console.error("File not in set!", id);
            } else {
                delete newSelectedFiles[id];
            }
        }

        if (Array.isArray(uuid)){
            uuid.forEach((id)=>{
                if (typeof id === 'string'){
                    remove(id);
                } else throw new Error("Supplied uuid is not a string or array of strings/arrays:", uuid);
            });
        } else if (typeof uuid === 'string') {
            remove(uuid);
        } else throw new Error("Supplied uuid is not a string or array of strings:", uuid);

        var selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(newSelectedFiles);
        this.setState({ 'selectedFiles' : newSelectedFiles, selectedFilesUniqueCount });
    }

    resetSelectedFiles(props = this.props){
        var selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles),
            selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(selectedFiles);

        this.setState({ selectedFiles, selectedFilesUniqueCount });
    }

    getFlatList(){ return SelectedFilesController.objectToCompleteList(this.state.selectedFiles); }

    render(){
        if (typeof window !== 'undefined' && window){
            window.lastSelectedFiles = this.state.selectedFiles;
        }
        //console.log('SELTEST', this.state.selectedFiles);
        if (!React.isValidElement(this.props.children)) throw new Error('CustomColumnController expects props.children to be a valid React component instance.');
        var propsToPass = _.extend(_.omit(this.props, 'children'), {
            'selectedFiles'             : this.state.selectedFiles,
            'selectedFilesUniqueCount'  : this.state.selectedFilesUniqueCount,
            'selectFile'                : this.selectFile,
            'unselectFile'              : this.unselectFile,
            'resetSelectedFiles'        : this.resetSelectedFiles
        });
        return React.cloneElement(this.props.children, propsToPass);
    }

}
