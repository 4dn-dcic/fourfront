'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ItemPageTable } from './../../browse/components/ItemPageTable';
import { ajax, console, layout, expFxn } from './../../util';


export class ProcessedFilesTableSimple extends React.Component {

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

    render(){
        var reducedFiles = expFxn.reduceProcessedFilesWithExperimentsAndSets(this.props.files);

        return (
            <ItemPageTable
                results={reducedFiles}
                //renderDetailPane={(es, rowNum, width)=> <ExperimentSetDetailPane result={es} containerWidth={width || null} paddingWidthMap={{
                //    'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
                //}} />}
                columns={{
                    "from_experiments.accession"  : "Experiments",
                    "file_format"       : "Format",
                    "file_size"         : "Size",
                    "from_experiment_sets.accession" : "Sets",
                }}
            />
        );
    }

}