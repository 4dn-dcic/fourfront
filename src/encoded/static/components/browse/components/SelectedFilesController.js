'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { expFxn, object } from './../../util';


// Memoized helper functions for getting counts of files performantly-er.
// These are used often by other components which consume/display selected file counts.

/** Used and memoized in views which have multiple sets of selectedFiles */
export function uniqueFileCountNonMemoized(selectedFiles){
    if (!selectedFiles || typeof selectedFiles !== 'object' || Array.isArray(selectedFiles)){
        console.error("selectedFiles not in proper form or is non-existent", selectedFiles);
        return 0;
    }
    return _.uniq(_.pluck(_.values(selectedFiles), 'accession')).length;
}

/** Pre-memoized and to be used in views that only have 1 selectedFiles collection, such as BrowseView */
export const uniqueFileCount = memoize(uniqueFileCountNonMemoized);

export const fileCountWithDuplicates = memoize(function(selectedFiles){
    return _.keys(selectedFiles).length;
});


/**
 * IN PROGRESS -- TODO: Decide if we should store "selectedFiles" or "unselectedFiles" (re: 'All files in facet selection are selected by default')
 *
 * @export
 * @class SelectedFilesController
 * @extends {React.Component}
 */
export class SelectedFilesController extends React.PureComponent {

    /** Utility function to extract out the relevant props passed in by `SelectedFilesController` out of a props object. */
    static pick(props){ return _.pick(props, 'selectedFiles', 'selectFile', 'unselectFile', 'resetSelectedFiles'); }

    static listToObject(selectedFilesList){
        return _.object(_.map(
            // Ensure all files have an `@id` / view permissions.
            // Lack of view permissions is OK for when file visible in table as lack of permission
            // is shown (without checkbox).
            _.filter(selectedFilesList, object.itemUtil.atId),
            function(fileItem){
                return [ expFxn.fileToAccessionTriple(fileItem, true), fileItem ];
            }
        ));
    }

    static parseInitiallySelectedFiles(initiallySelectedFiles){

        if (initiallySelectedFiles === null){
            return {};
        }

        if (!Array.isArray(initiallySelectedFiles) && initiallySelectedFiles && typeof initiallySelectedFiles === 'object'){
            // Assume we got a well-formatted selectedFiles object. This is probably only case for tests, e.g. RawFilesStackedTable-test.js.
            // This means keys must be in form of stringified accession triples, e.g. `"EXPSETACCESSION~EXPACCESSION~FILEACCESSION"`
            // Lets validate that --
            _.forEach(_.keys(initiallySelectedFiles), function(key){
                const parts = key.split('~');
                if (parts.length !== 3){
                    throw new Error('If supply an object as initiallySelectedFiles, it must have stringified accession triples as keys.');
                }
            });
            return _.clone(initiallySelectedFiles);
        }

        if (Array.isArray(initiallySelectedFiles)){
            return SelectedFilesController.listToObject(initiallySelectedFiles);
        }

        console.error(initiallySelectedFiles);
        throw new Error('Received unexpected props.initiallySelectedFiles -');
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
    };

    constructor(props){
        super(props);
        this.selectFile = this.selectFile.bind(this);
        this.unselectFile = this.unselectFile.bind(this);
        this.resetSelectedFiles = this.resetSelectedFiles.bind(this);

        const selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles);

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

            return { 'selectedFiles' : newSelectedFiles };
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

            return { 'selectedFiles' : newSelectedFiles };
        });
    }

    resetSelectedFiles(props = this.props){
        var selectedFiles = SelectedFilesController.parseInitiallySelectedFiles(props.initiallySelectedFiles);
        this.setState({ selectedFiles });
    }

    render(){
        const { children } = this.props;
        const { selectedFiles } = this.state;
        const propsToPass = _.extend(_.omit(this.props, 'children'), {
            'selectedFiles'             : selectedFiles,
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
            if (!React.isValidElement(children)){
                throw new Error('SelectedFilesController expects props.children to be a valid React component instance.');
            }
            return React.cloneElement(children, propsToPass);
        }
    }

}
