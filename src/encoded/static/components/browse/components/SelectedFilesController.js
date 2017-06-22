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
        return _.uniq(
            _.flatten(
                _.pairs(selectFilesObj).map(function(p){
                    var related = (typeof p[1] !== 'boolean' && p[1] && p[1].related_files) || null;
                    if (related) {
                        related = related.map(function(r){ return (r && r.file && r.file.uuid) || null; }).filter(function(r){ if (!r){ return false; } return true; });
                        return [p[0]].concat(related); // Arr
                    } else {
                        return p[0]; // Single
                    }
                }), true
            )
        );
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

    static defaultProps = {
        'initiallySelectedFiles' : null,
        'resetSelectedFilesCheck' : function(nextProps, pastProps){
            if (typeof nextProps.href === 'string') {
                if (nextProps.href !== pastProps.href) return true;
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
        this.state = {
            'selectedFiles' : SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles)
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.resetSelectedFilesCheck(nextProps, this.props)){
            this.setState({ 'selectedFiles' : SelectedFilesController.parseInitiallySelectedFiles(nextProps.initiallySelectedFiles) });
        }
    }

    selectFile(uuid: string, memo = null){
        
        var newSelectedFiles = _.clone(this.state.selectedFiles);

        function add(id, memo = null){
            if (typeof newSelectedFiles[id] !== 'undefined'){
                throw new Error("File already selected!");
            }
            newSelectedFiles[id] = memo || true;
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

        this.setState({ 'selectedFiles' : newSelectedFiles });
    }

    unselectFile(uuid: string){
        var newSelectedFiles = _.clone(this.state.selectedFiles);

        function remove(id) {
            if (typeof newSelectedFiles[id] === 'undefined'){
                console.log(id, newSelectedFiles);
                throw new Error("File not in set!");
            }
            delete newSelectedFiles[id];
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

        this.setState({ 'selectedFiles' : newSelectedFiles });
    }

    resetSelectedFiles(props = this.props){
        this.setState({ 'selectedFiles' : SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles) });
    }

    getFlatList(){ return SelectedFilesController.objectToCompleteList(this.state.selectedFiles); }

    render(){
        if (!React.isValidElement(this.props.children)) throw new Error('CustomColumnController expects props.children to be a valid React component instance.');
        var propsToPass = _.extend(_.omit(this.props, 'children'), {
            'selectedFiles'         : this.state.selectedFiles,
            'selectFile'            : this.selectFile,
            'unselectFile'          : this.unselectFile,
            'resetSelectedFiles'    : this.resetSelectedFiles
        });
        return React.cloneElement(this.props.children, propsToPass);
    }

}