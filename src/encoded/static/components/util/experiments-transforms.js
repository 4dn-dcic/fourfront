'use strict';

import _ from 'underscore';
import { atIdFromObject } from './object';
import patchedConsoleInstance from './patched-console';
import { Item, File, Experiment, ExperimentSet } from './typedefs';

var console = patchedConsoleInstance;



/**
 * Gets experiment_type string from an experiment.
 * Requires experiment_type.display_title to be embedded.
 *
 * @param {Experiment} exp - An Experiment Item JSON
 * @returns {string|null} Type of the experiment.
 */
export function getExperimentTypeStr(exp){
    return (exp && exp.experiment_type && (exp.experiment_type.display_title || exp.experiment_type.display_title)) || null;
}


/**
 * @param {Experiment[]} experiments - List of experiments, e.g. from experiments_in_set.
 * @returns {Experiment[]} - List of experiments without files.
 */
export function listEmptyExperiments(experiments){
    return _.filter(experiments || [], function(exp){
        if (Array.isArray(exp.files) && exp.files.length > 0) return false;
        else if (Array.isArray(exp.filesets) && exp.filesets.length > 0){
            for (var i = 0; i < exp.filesets.length; i++){
                if (Array.isArray(exp.filesets[i].files_in_set) && exp.filesets[i].files_in_set.length > 0){
                    return false;
                }
            }
            return true;
        }
        else return true;
    });
}


/**
 * @param {Experiment[]} experiments - List of experiments, e.g. from experiments_in_set.
 * @param {boolean} [includeProcessedFiles=false] - Whether to include processed files in count.
 * @param {boolean} [includeFileSets=false] - Whether to include file sets in count.
 * @returns {number} - Count of files from all experiments.
 */
export function fileCountFromExperiments(experiments, includeProcessedFiles = false, includeFileSets = false){
    return _.reduce(_.map(experiments, function(exp, i){
        return fileCountFromSingleExperiment(exp, includeProcessedFiles, includeFileSets);
    }), function(r,expFileCount,i){
        return r + expFileCount;
    }, 0);
}

/**
 * @param {ExperimentSet} experiment_set - ExpSet Item context.
 * @param {boolean} [includeProcessedFiles=false] - Whether to include processed files in count.
 * @param {boolean} [includeFileSets=false] - Whether to include file sets in count.
 * @returns {number} - Count of files from all experiments.
 */
export function fileCountFromExperimentSet(experiment_set, includeProcessedFiles = false, includeFileSets = false){
    var initialCountFromSet = 0;
    if (includeProcessedFiles){
        initialCountFromSet += (experiment_set && Array.isArray(experiment_set.processed_files) && experiment_set.processed_files.length) || 0;
    }
    return initialCountFromSet + fileCountFromExperiments(experiment_set.experiments_in_set || [], includeProcessedFiles, includeFileSets);
}


export function fileToAccessionTriple(file, toString = false){
    if (typeof file.accession !== 'string') throw new Error("No 'accession' property set on this file.");
    if (typeof file.from_experiment === 'undefined') throw new Error("No 'from_experiment' property set on this file. " + (file.accession));
    if (typeof file.from_experiment.accession !== 'string') throw new Error("No 'from_experiment.accession' property set on this file. " + (file.accession));
    if (typeof file.from_experiment.from_experiment_set === 'undefined') throw new Error("No 'from_experiment.from_experiment_set' property set on this file. " + (file.accession));
    if (typeof file.from_experiment.from_experiment_set.accession !== 'string') throw new Error("No 'from_experiment.from_experiment_set.accession' property set on this file. " + (file.accession));

    var triple = [
        file.from_experiment.from_experiment_set.accession,
        file.from_experiment.accession,
        file.accession
    ];

    if (toString === true){
        return triple.join('~');
    } else if (toString && typeof toString === 'string'){
        return triple.join(toString);
    } else {
        return triple;
    }
}

/**
 * Converts a list of files (list of objects),
 * which have "from_experiment" & "from_experiment.from_experiment_set"
 * properties, into a list of strings which represent them.
 *
 * @param {File[]} files                        Files which to convert to accession triples. Must have 'from_experiment' properties (provided by other funcs).
 * @param {boolean|string} [toString=false]     Whether to concatanate resulting accession items into strings delimited by a tilde (`~`). If string is supplied, it is used as delimiter instead.
 * @returns {string[]} List of arrays or strings in form of EXPSETACCESSION~EXPACESSION~FILEACCESSION. EXPACESSION may be "NONE".
 */
export function filesToAccessionTriples(files, toString = false){
    return _.map(files || [], function(file){
        return fileToAccessionTriple(file, toString);
    });
}


/**
 * Returns (copies of) 'experiments_in_set' from an ExperimentSet,
 * each extended with a "from_experiment_set" property, which may be used
 * by other experiment-focused functions or views which require information
 * about the parent ExperimentSet.
 *
 * @param {ExperimentSet} experiment_set - An ExperimentSet Item
 * @returns {{ from_experiment_set: Object, accession: string }[]} List of experiments from ExperimentSet, extended with 'from_experiment_set'
 */
export function experimentsFromExperimentSet(experiment_set){
    return _.map(experiment_set.experiments_in_set || [], function(exp){
        return _.extend({ 'from_experiment_set' : experiment_set }, exp);
    });
}


/**
 * Extracts `experiment_sets` and `experiments.experiment_sets` property value(s) from file.
 *
 * @param {File} file - File Item object with 'experiments' and 'experiments.experiment_sets' properties.
 * @param {string} returnFormat - One of 'list', 'object', or 'ids'. Format which to return.
 * @returns {Object.<ExperimentSet>} Object with ExperimentSet @ids as keys and their JSON as values.
 */
export function experimentSetsFromFile(file, returnFormat = 'list'){

    var setsByKey = _.extend(

        _.reduce(file.experiment_sets || [], function(m, expSet){ // ExpSets by @id, no 'experiments_in_set' added.
            var id = atIdFromObject(expSet);
            if (id && typeof m[id] === 'undefined'){
                m[id] = _.clone(expSet);
            }
            return m;
        }, {}),

        _.reduce(file.experiments || [], function(sets, exp){ // ExpSets by @id from file.experiments, with 'experiments_in_set' added.

            var expSetsFromExp = _.reduce(exp.experiment_sets || [], function(m, expSet){
                var id = atIdFromObject(expSet);
                if (!id) {
                    return m; // Skip, in case of no id, no permission to view, etc.
                } else if (id && typeof m[id] === 'undefined'){
                    m[id] = _.extend({ 'experiments_in_set' : [exp] }, expSet);
                } else {
                    if (Array.isArray(m[id].experiments_in_set) && _.map(m[id].experiments_in_set, atIdFromObject).indexOf(atIdFromObject(exp)) === -1){
                        m[id].experiments_in_set.push(exp);
                    }
                }
                return m;
            }, {});

            _.keys(expSetsFromExp).forEach(function(es_id){
                if (typeof sets[es_id] !== 'undefined'){
                    sets[es_id].experiments_in_set = (sets[es_id].experiments_in_set || []).concat(expSetsFromExp[es_id].experiments_in_set);
                } else {
                    sets[es_id] = expSetsFromExp[es_id];
                }
            });

            return sets;

        }, {})
    );

    if (returnFormat === 'list'){
        return _.values(setsByKey);
    } else if (returnFormat === 'object'){
        return setsByKey;
    } else if (returnFormat === 'ids') {
        return _.keys(setsByKey);
    }

}





/**** **** **** **** **** **** **** **** ****
 **** Processed Files -related Functions ****
 **** **** **** **** **** **** **** **** ****/


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

/**
 * @param {ExperimentSet} experiment_set - Representation of ExperimentSet Item
 * @returns {File[]} List of ProcessedFile Items, cloned & extended from param expset with '[from_experiment.]from_experiment_set' property.
 */
export function allProcessedFilesFromExperimentSet(experiment_set){

    // Add in Exp Bio & Tec Rep Nos, if available.
    if (Array.isArray(experiment_set.replicate_exps) && Array.isArray(experiment_set.experiments_in_set)){
        experiment_set = combineExpsWithReplicateNumbersForExpSet(experiment_set);
    }

    return _.map(experiment_set.processed_files || [], function(pF){
        pF = _.clone(pF);
        pF.from_experiment_set = experiment_set;
        if (typeof pF.from_experiment === 'undefined') {
            pF.from_experiment = {
                // Extend w/ dummy experiment to make accession triples with (these will have NONE in place of (middle) exp accession).
                'accession' : "NONE",
                'from_experiment_set' : pF.from_experiment_set
            };
        }
        return pF;
    }).concat(
        allProcessedFilesFromExperiments(
            _.map(experiment_set.experiments_in_set || [], function(exp){
                if (typeof exp.from_experiment_set === 'undefined'){
                    return _.extend({}, exp, { 'from_experiment_set' : experiment_set });
                }
                return exp;
            })
        )
    );
}

/**
 * Groups processed files by experiment or experiment set.
 */
export function processedFilesFromExperimentSetToGroup(processed_files, combined = false){

    var byES = {};
    var byE  = {};

    _.forEach(processed_files, function(pF){
        if (typeof pF.from_experiment !== 'undefined' && typeof pF.from_experiment.accession === 'string' && pF.from_experiment.accession !== "NONE"){
            if (!Array.isArray(byE[pF.from_experiment.accession])){
                byE[pF.from_experiment.accession] = [];
            }
            byE[pF.from_experiment.accession].push(pF);
            return; // Belongs to a single Exp. Don't group under ExpSet as well.
        }

        var expSet = pF.from_experiment_set || (pF.from_experiment && pF.from_experiment && pF.from_experiment.from_experiment_set);

        if (expSet && typeof expSet !== 'undefined' && typeof expSet.accession === 'string'){
            if (!Array.isArray(byES[expSet.accession])){
                byES[expSet.accession] = [];
            }
            byES[expSet.accession].push(pF);
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

/** Removes duplicates ? */
export function reduceProcessedFilesWithExperimentsAndSets(processed_files){

    var expsAndSetsByFileAccession =_.reduce(processed_files || [], function(m, pF){
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
        _.uniq(processed_files || [], false, function(pF){ return pF.accession; }),
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




/*** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *
 * Partial Funcs (probably don't use these unless composing a function) *
 *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** */


export function combineWithReplicateNumbers(experimentsWithReplicateNums, experimentsInSet){
    if (!Array.isArray(experimentsWithReplicateNums)) return false;

    return _.map(
        _.zip(
            _.map(experimentsWithReplicateNums, function(r){
                return {
                    'tec_rep_no' : r.tec_rep_no || null,
                    'bio_rep_no' : r.bio_rep_no || null,
                    '@id' : r.replicate_exp && r.replicate_exp['@id'] || null
                };
            }),
            experimentsInSet
        ),
        function([replicateInfo, expSet]){
            return _.extend({}, replicateInfo, expSet, {
                'biosample' : (
                    expSet.biosample && _.extend(
                        {}, expSet.biosample, { 'bio_rep_no' : replicateInfo.bio_rep_no || '?' }
                    )
                ) || { 'bio_rep_no' : replicateInfo.bio_rep_no || '?' }
            });
        }
    );
}

export function combineExpsWithReplicateNumbersForExpSet(experiment_set){
    if (!Array.isArray(experiment_set.replicate_exps) || !Array.isArray(experiment_set.experiments_in_set) || experiment_set.experiments_in_set.length !== experiment_set.replicate_exps.length){
        throw new Error('Incorrect/non-aligned replicate_exps or experiments_in_set.', experiment_set);
    }
    return _.extend({}, experiment_set, {
        'experiments_in_set' : combineWithReplicateNumbers(experiment_set.replicate_exps, experiment_set.experiments_in_set)
    });
}


export function findExperimentInSetWithFileAccession(experiments_in_set, file_accession){
    return _.find(experiments_in_set || [], function(exp){
        var expFiles = exp.files || [];
        for (var i = 0; i < expFiles.length; i++){
            if (expFiles[i] && expFiles[i].accession && expFiles[i].accession === file_accession){
                return true;
            }
        }
        return false;
    });
}

export function fileCountFromSingleExperiment(experiment, includeProcessedFiles = false, includeFileSets = false){
    var count = 0;
    if (Array.isArray(experiment.files)) {
        count += experiment.files.length;
    }
    if (includeProcessedFiles && Array.isArray(experiment.processed_files)) {
        count += experiment.processed_files.length;
    }
    if (includeFileSets && Array.isArray(experiment.filesets)) {
        count += _.reduce(experiment.filesets, function(r,fs){
            return r + (fs.files_in_set || []).length;
        }, 0);
    }
    return count;
}

export function allFilesFromFileSetsInExperiment(experiment){
    if (Array.isArray(experiment.filesets)){
        return _(experiment.filesets).chain()
            .pluck('files_in_set')
            .filter(function(files_in_set){ return typeof files_in_set !== 'undefined'; })
            .flatten(true)
            .value();
    }
    return [];
}

export function allFilesFromExperiment(experiment, includeProcessedFiles = false, includeFileSets = false){
    var filesToReturn = experiment.files || [];
    if (includeFileSets){
        filesToReturn = filesToReturn.concat(allFilesFromFileSetsInExperiment(experiment));
    }
    if (includeProcessedFiles){
        filesToReturn = filesToReturn.concat(allProcessedFilesFromExperiments([experiment]));
    }
    return _.map(filesToReturn, function(f){
        return _.extend({}, f, { 'from_experiment' : f.from_experiment || experiment });
    });
}

/**
 * Returns all files from an Experiment Set Item.
 * Excludes other_processed_files.
 *
 * @todo (Possibly) Add param/feature to include other processed files.
 */
export function allFilesFromExperimentSet(expSet, includeProcessedFiles = false){

    var processedFiles = includeProcessedFiles ? reduceProcessedFilesWithExperimentsAndSets(allProcessedFilesFromExperimentSet(expSet)) : [];
    var rawFiles = _.reduce(experimentsFromExperimentSet(expSet), function(m, exp){
        return m.concat(allFilesFromExperiment(exp));
    }, []);

    return rawFiles.concat(processedFiles);
}

/** @deprecated ? */
export function flattenFileSetsToFilesIfNoFilesOnExperiment(experiment){
    if (Array.isArray(experiment.files)) return experiment;
    if (!Array.isArray(experiment.filesets) || experiment.filesets.length === 0 || !Array.isArray(experiment.filesets[0].files_in_set)) return experiment;
    experiment.files = _.flatten(
        _.pluck(experiment.filesets, 'files_in_set'),
        true
    );
    return experiment;
}

/** @deprecated ? */
export function flattenFileSetsToFilesIfNoFilesForEachExperiment(experiments){
    return experiments.map(flattenFileSetsToFilesIfNoFilesOnExperiment);
}

export function groupExperimentsByBiosampleRepNo(experiments){
    return _(experiments || []).chain()
        .groupBy(function(exp){
            return exp.biosample.bio_rep_no;
        })          // Creates { '1' : [expObjWBiosample1-1, expObjWBiosample1-2, ...], '2' : [expObjWBiosample2-1, expObjWBiosample2-2, ...], ... }
        .pairs()    // Creates [['1', [expObjWBiosample1-1, expObjWBiosample1-2]], ['2', [expObjWBiosample2-1, expObjWBiosample2-2]], ...]
        .sortBy(function(expSet){ return parseInt(expSet[0]); }) // Sort outer list (biosamples) by bio_rep_no
        .map(function(expSet){ // Creates [[expObjWBiosample1-1, expObjWBiosample1-2], [expObjWBiosample2-1, expObjWBiosample2-2], ...]
            return _.sortBy(expSet[1], 'tec_rep_no'); // Sort inner list (experiments) by tec_rep_no
        })
        .value();
}

export function groupExperimentsByBiosample(experiments){
    return _(experiments || []).chain()
        .groupBy(function(exp){
            return exp.biosample['@id'] || exp.biosample.bio_rep_no;
        })
        .pairs()
        .sortBy(function(expSet){ return expSet[0]; }) // Sort outer list (biosamples) by biosample id
        .map(function(expSet){ return expSet[1]; }) // Creates [[expObjWBiosample1-1, expObjWBiosample1-2], [expObjWBiosample2-1, expObjWBiosample2-2], ...]
        .value();
}
