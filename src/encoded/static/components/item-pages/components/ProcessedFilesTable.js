'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ItemPageTable } from './../../browse/components/ItemPageTable';
import { ajax, console, layout, expFxn } from './../../util';



export function allProcessedFilesFromExperiments(experiments){
    return _.reduce(experiments || [], function(m, exp){
        var processed_files_for_exp = _.map(exp.processed_files || [], function(pF){
            pF = _.clone(pF);
            pF.from_experiment = exp;
            return pF;
        });

        //m[exp.accession] = exp.processed_files || [];
        return m.concat(processed_files_for_exp);
    }, []);
}

export function allProcessedFilesFromExperimentSet(experiment_set){
    return _.map(experiment_set.processed_files || [], function(pF){
        pF = _.clone(pF);
        pF.from_experiment_set = experiment_set;
        return pF;
    }).concat(allProcessedFilesFromExperiments(experiment_set.experiments_in_set));
}

export function processedFilesFromExperimentSetToGroup(processed_files, combined = false){

    var byES = {};
    var byE  = {};
    _.forEach(processed_files, function(pF){
        if (typeof pF.from_experiment !== 'undefined' && typeof pF.from_experiment.accession === 'string'){
            if (!Array.isArray(byE[pF.from_experiment.accession])){
                byE[pF.from_experiment.accession] = [];
            }
            byE[pF.from_experiment.accession].push(pF);
        } else if (typeof pF.from_experiment_set !== 'undefined' && typeof pF.from_experiment_set.accession === 'string'){
            if (!Array.isArray(byES[pF.from_experiment_set.accession])){
                byES[pF.from_experiment_set.accession] = [];
            }
            byES[pF.from_experiment_set.accession].push(pF);
        }
    });

    if (!combined){
        return {
            'experiments' : byE,
            'experiment_sets' : byES
        };
    } else {
        return _.extend(byE, byES);
    }

}

export function reduceProcessedFilesWithExperimentsAndSets(processed_files){
    var expsAndSetsByFileAccession =_.reduce(processed_files, function(m, pF){
        if (typeof pF.from_experiment !== 'undefined' && !Array.isArray(pF.from_experiment)){
            if (!Array.isArray(m.from_experiments[pF.accession])) m.from_experiments[pF.accession] = [];
            m.from_experiments[pF.accession].push(pF.from_experiment);
        } else if (typeof pF.from_experiment_set !== 'undefined' && !Array.isArray(pF.from_experiment_set)) {
            if (!Array.isArray(m.from_experiment_sets[pF.accession])) m.from_experiment_sets[pF.accession] = [];
            m.from_experiment_sets[pF.accession].push(pF.from_experiment_set);
        }
        return m;
    }, { 'from_experiments' : {}, 'from_experiment_sets' : {} } );
    return _.map(
        _.uniq(processed_files, false, function(pF){ return pF.accession; }),
        function(pF){
            pF = _.clone(pF);
            if (expsAndSetsByFileAccession.from_experiments[pF.accession]){
                pF.from_experiments = expsAndSetsByFileAccession.from_experiments[pF.accession];
            }
            if (expsAndSetsByFileAccession.from_experiment_sets[pF.accession]){
                pF.from_experiment_sets = expsAndSetsByFileAccession.from_experiment_sets[pF.accession];
            }
            return pF;
        }
    );
}


export class ProcessedFilesTableSectionForExperiment extends React.Component {
    
        
}

export class ProcessedFilesTableSectionForExperimentSet extends React.Component {
    

        
}


export class ProcessedFilesTable extends React.Component {

    static propTypes = {
        'viewingContext'        : PropTypes.oneOf(['experiment_set', 'experiment']),
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

    static defaultProps = {
        'viewingContext' : 'experiment_set'
    }

    render(){
        var groupsOfFiles = processedFilesFromExperimentSetToGroup(this.props.files, false);
        
        var reducedFiles = reduceProcessedFilesWithExperimentsAndSets(this.props.files);
        console.log(groupsOfFiles, reducedFiles);

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
        return <div>HI</div>;
    }

}