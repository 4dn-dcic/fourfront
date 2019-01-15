'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ItemPageTable, ItemPageTableLoader } from './../../browse/components/ItemPageTable';
import { ajax, console, layout, expFxn, object } from './../../util';


export class SimpleFilesTable extends React.Component {

    static propTypes = {
        'results'                 : PropTypes.arrayOf(PropTypes.shape({
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
    };

    static defaultProps = {
        'columns' : {
            "display_title"     : { "title" : "Title" },
            "file_format"       : { "title" : "Format" },
            "file_size"         : {
                "title" : "Size",
                'minColumnWidth' : 60,
                'widthMap' : { 'sm' : 50, 'md' : 50, 'lg' : 60 }
            },
            "file_type"         : { "title" : "File Type" },
        }
    };

    render(){
        var reducedFiles = expFxn.reduceProcessedFilesWithExperimentsAndSets(this.props.results);

        return (
            <ItemPageTable
                {...this.props}
                results={reducedFiles}
                //renderDetailPane={(es, rowNum, width)=> <ExperimentSetDetailPane result={es} containerWidth={width || null} paddingWidthMap={{
                //    'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
                //}} />}
                loading={this.props.loading && (!reducedFiles || !reducedFiles.length)}
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

    render(){
        var filesObj = _.object(_.zip(
            _.map(this.props.files, object.atIdFromObject),
            this.props.files
        ));
        return (
            <ItemPageTableLoader itemsObject={filesObj} isItemCompleteEnough={SimpleFilesTableLoaded.isFileCompleteEnough}>
                <SimpleFilesTable {..._.pick(this.props, 'sortFxn', 'width', 'defaultOpenIndices',
                    'defaultOpenIds', 'columns', 'columnExtensionMap')} />
            </ItemPageTableLoader>
        );
    }
}