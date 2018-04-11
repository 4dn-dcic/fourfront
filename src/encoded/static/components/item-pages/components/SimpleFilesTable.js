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
    }

    static defaultProps = {
        'columns' : {
            "file_format"       : { "title" : "Format" },
            "file_size"         : { "title" : "Size" },
            "file_type"         : { "title" : "File Type" },
        },
        'columnDefinitionOverrideMap' : _.extend({}, ItemPageTable.defaultProps.columnDefinitionOverrideMap, {
            'file_size' : {
                'minColumnWidth' : 60,
                'widthMap' : { 'sm' : 50, 'md' : 50, 'lg' : 60 }
            }
        })
    }

    render(){
        var reducedFiles = expFxn.reduceProcessedFilesWithExperimentsAndSets(this.props.results);

        return (
            <ItemPageTable
                {...this.props}
                results={reducedFiles}
                //renderDetailPane={(es, rowNum, width)=> <ExperimentSetDetailPane result={es} containerWidth={width || null} paddingWidthMap={{
                //    'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
                //}} />}
                schemas={this.props.schemas}
                columns={this.props.columns}
                columnDefinitionOverrideMap={this.props.columnDefinitionOverrideMap}
                width={this.props.width}
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

    static defaultProps = {
        'columns' : SimpleFilesTable.defaultProps.columns,
        'columnDefinitionOverrideMap' : SimpleFilesTable.defaultProps.columnDefinitionOverrideMap
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
                <SimpleFilesTable
                    sortFxn={this.props.sortFxn}
                    width={this.props.width}
                    defaultOpenIndices={this.props.defaultOpenIndices}
                    defaultOpenIds={this.props.defaultOpenIds}
                    columns={this.props.columns}
                    columnDefinitionOverrideMap={this.props.columnDefinitionOverrideMap}
                />
            </ItemPageTableLoader>
        );
    }
}