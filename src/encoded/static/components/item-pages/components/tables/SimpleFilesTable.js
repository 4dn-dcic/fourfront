'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemPageTable, ItemPageTableIndividualUrlLoader, ItemPageTableSearchLoader, ViewMoreResultsBtn } from './ItemPageTable';
import { expFxn } from './../../../util';

/**
 * @todo
 *   - Maybe make custom detail pane for type=File
 *   - Maybe wrap in container element to match ExperimentSetTables counterpart, idk.
 */
export const SimpleFilesTable = React.memo(function SimpleFilesTable(props){
    const { results, loading, countTotalResults, hrefWithoutLimit } = props;
    const reducedFiles = expFxn.reduceProcessedFilesWithExperimentsAndSets(results);
    return (
        <React.Fragment>
            <ItemPageTable {...props} results={reducedFiles} loading={loading && (!reducedFiles || !reducedFiles.length)} />
            <ViewMoreResultsBtn {...{ results, countTotalResults, hrefWithoutLimit }} itemTypeTitle="File" />
        </React.Fragment>
    );
});
SimpleFilesTable.propTypes = {
    'results'                 : PropTypes.arrayOf(PropTypes.shape({
        'accession'             : PropTypes.string.isRequired,
        'display_title'         : PropTypes.string.isRequired,
        '@id'               : PropTypes.string.isRequired,
        'from_experiment'       : PropTypes.shape({
            'accession'             : PropTypes.string.isRequired,
            '@id'                   : PropTypes.string.isRequired
        }),
        'from_experiment_set'   : PropTypes.shape({
            'accession'             : PropTypes.string.isRequired,
            '@id'                   : PropTypes.string.isRequired
        })
    })),
    'loading'                   : PropTypes.bool,
    'columns'                   : PropTypes.object
};
SimpleFilesTable.defaultProps = {
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


export const FilesTableLoadedFromSearch = React.memo(function FilesTableLoadedFromSearch(props){
    return (
        <ItemPageTableSearchLoader {..._.pick(props, 'requestHref', 'windowWidth', 'title', 'onLoad')}>
            <SimpleFilesTable {..._.pick(props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad', 'href')} />
        </ItemPageTableSearchLoader>
    );
});



export const SimpleFilesTableLoaded = React.memo(function SimpleFilesTableLoaded(props){
    const { fileUrls, id } = props;
    return (
        <ItemPageTableIndividualUrlLoader itemUrls={fileUrls} key={id}>
            <SimpleFilesTable {..._.pick(props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'columns', 'columnExtensionMap')} />
        </ItemPageTableIndividualUrlLoader>
    );
});
SimpleFilesTableLoaded.propTypes = {
    'fileUrls' : PropTypes.arrayOf(PropTypes.string).isRequired
};
