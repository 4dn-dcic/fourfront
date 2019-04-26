'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';


/**
 * IN PROGRESS -- TODO: Decide if we should store "selectedFiles" or "unselectedFiles" (re: 'All files in facet selection are selected by default')
 *
 * @export
 * @class SelectedFilesController
 * @extends {React.Component}
 */
export class SelectedFilesController extends React.PureComponent {

    /**
     * Utility function to extract out the relevant props passed
     * in by `SelectedFilesController` out of a props object.
     *
     * @public
     */
    static pick(props){
        return _.pick(props, 'selectedFiles', 'selectFile', 'unselectFile', 'selectedFilesUniqueCount');
    }

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
        return _.object(_.map(selectedFilesList, function(uuid){
            return [uuid, true];
        }));
    }

    static parseInitiallySelectedFiles(initiallySelectedFiles){
        return (
            Array.isArray(initiallySelectedFiles) ? SelectedFilesController.listToObject(initiallySelectedFiles) :
                initiallySelectedFiles ? initiallySelectedFiles : {}
        );
    }

    static uniqueFileCountByUUID = memoize(function(selectedFiles){
        return _.uniq(_.pluck(_.values(selectedFiles), 'uuid')).length;
    });

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
    };

    constructor(props){
        super(props);
        this.selectFile = this.selectFile.bind(this);
        this.unselectFile = this.unselectFile.bind(this);
        this.resetSelectedFiles = this.resetSelectedFiles.bind(this);
        this.getFlatList = this.getFlatList.bind(this);

        var selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles);

        this.state = { selectedFiles };
    }

    componentDidUpdate(pastProps){
        if (this.props.resetSelectedFilesCheck(this.props, pastProps)){
            this.resetSelectedFiles(this.props);
        }
    }

    selectFile(accessionTriple, memo = null){

        function error(){
            throw new Error("Supplied accessionTriple is not a string or array of strings/arrays:", accessionTriple);
        }

        this.setState(({ selectedFiles })=>{
            var newSelectedFiles = _.extend({}, selectedFiles);

            function add(id, memo = null){
                if (typeof newSelectedFiles[id] !== 'undefined'){
                    console.error("File already selected!", id);
                } else {
                    newSelectedFiles[id] = memo || true;
                }
            }

            if (Array.isArray(accessionTriple)){
                _.forEach(accessionTriple, function(id){
                    if (typeof id === 'string'){
                        add(id);
                    } else if (Array.isArray(id)){
                        add(id[0], id[1]);
                    } else error();
                });
            } else if (typeof accessionTriple === 'string') {
                add(accessionTriple, memo);
            } else error();

            var selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(newSelectedFiles);
            return { 'selectedFiles' : newSelectedFiles, selectedFilesUniqueCount };
        });
    }

    unselectFile(accessionTriple){

        function error(){
            throw new Error("Supplied accessionTriple is not a string or array of strings/arrays:", accessionTriple);
        }

        this.setState(({ selectedFiles })=>{
            var newSelectedFiles = _.extend({}, selectedFiles);

            function remove(id) {
                if (typeof newSelectedFiles[id] === 'undefined'){
                    console.log(id, newSelectedFiles);
                    console.error("File not in set!", id);
                } else {
                    delete newSelectedFiles[id];
                }
            }

            if (Array.isArray(accessionTriple)){
                _.forEach(accessionTriple, function(id){
                    if (typeof id === 'string'){
                        remove(id);
                    } else error();
                });
            } else if (typeof accessionTriple === 'string') {
                remove(accessionTriple);
            } else error();

            var selectedFilesUniqueCount = SelectedFilesController.uniqueFileCountByUUID(newSelectedFiles);
            return { 'selectedFiles' : newSelectedFiles, selectedFilesUniqueCount };
        });
    }

    resetSelectedFiles(props = this.props){
        var selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles);
        this.setState({ selectedFiles });
    }

    getFlatList(){ return SelectedFilesController.objectToCompleteList(this.state.selectedFiles); }

    render(){
        const children = this.props.children;
        const propsToPass = _.extend(_.omit(this.props, 'children'), {
            'selectedFiles'             : this.state.selectedFiles,
            'selectedFilesUniqueCount'  : SelectedFilesController.uniqueFileCountByUUID(this.state.selectedFiles),
            'selectFile'                : this.selectFile,
            'unselectFile'              : this.unselectFile,
            'resetSelectedFiles'        : this.resetSelectedFiles
        });

        if (Array.isArray(children)){
            return React.Children.map(children, function(child){
                if (!React.isValidElement(child)){
                    throw new Error('SelectedFilesController expects props.children[] to be valid React component instances.');
                }
                return React.cloneElement(child, propsToPass);
            });
        } else {
            if (!React.isValidElement(this.props.children)){
                throw new Error('SelectedFilesController expects props.children to be a valid React component instance.');
            }
            return React.cloneElement(this.props.children, propsToPass);
        }
    }

}
