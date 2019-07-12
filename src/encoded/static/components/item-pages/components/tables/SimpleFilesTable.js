'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ItemPageTable, ItemPageTableIndividualUrlLoader } from './ItemPageTable';
import { expFxn } from './../../../util';


export const SimpleFilesTable = React.memo(function SimpleFilesTable(props){
    const { results, loading } = props;
    const reducedFiles = expFxn.reduceProcessedFilesWithExperimentsAndSets(results);
    return (
        <ItemPageTable {...props} results={reducedFiles} loading={loading && (!reducedFiles || !reducedFiles.length)}
            //renderDetailPane={(es, rowNum, width)=> <ExperimentSetDetailPane result={es} containerWidth={width || null} paddingWidthMap={{
            //    'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47, 'xl' : 47
            //}} />}
        />
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
