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
        'initiallySelectedFiles' : null
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

    selectFile(uuid: string, memo = null){
        if (typeof this.state.selectedFiles[uuid] !== 'undefined'){
            throw new Error("File already selected!");
        }
        var newSet = _.clone(this.state.selectedFiles);
        newSet[uuid] = memo || true;
        this.setState({ 'selectedFiles' : newSet });
    }

    unselectFile(uuid: string){
        if (typeof this.state.selectedFiles[uuid] === 'undefined'){
            throw new Error("File not in set!");
        }
        var newSet = _.clone(this.state.selectedFiles);
        delete newSet[uuid];
        this.setState({ 'selectedFiles' : newSet });
    }

    resetSelectedFiles(props = this.props){
        this.setState({ 'selectedFiles' : SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles) });
    }

    getFlatList(){ return SelectedFilesController.objectToCompleteList(this.state.selectedFiles); }

    render(){
        var propsToPass = _.extend(_.omit(this.props, 'children'), {
            'selectedFiles'         : this.state.selectedFiles,
            'selectFile'            : this.selectFile,
            'unselectFile'          : this.unselectFile,
            'resetSelectedFiles'    : this.resetSelectedFiles
        });

        return React.cloneElement(this.props.children, propsToPass);
    }

}