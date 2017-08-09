'use strict';

import _ from 'underscore';
//import patchedConsoleInstance from './patched-console';

/**
 * @param   {Object[]} experiments - List of experiments, e.g. from experiments_in_set.
 * @returns {Object[]} - List of experiments without files.
 */
export function listEmptyExperiments(experiments){
    return _.filter(ensureArray(experiments), function(exp){
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
 * @param   {Object[]} experiments - List of experiments, e.g. from experiments_in_set.
 * @returns {number} - Count of files from all experiments.
 */
export function fileCountFromExperiments(experiments, includeFileSets = false){
    return _.reduce(experiments.map(function(exp, i){ return fileCount(exp, includeFileSets); }), function(r,expFileCount,i){
        return r + expFileCount;
    }, 0);
}


/**
 * NOT SORTED
 *
 * @param   {Object[]} experiments - List of experiments, e.g. from experiments_in_set.
 * @returns {Object[]} - All files from experiments without a pair.
 */
export function listAllUnpairedFiles(experiments, includeFileSets = false){
    return _.filter(
        _.flatten(
            findUnpairedFilesPerExperiment(experiments, includeFileSets),
            true
        ),
        function(file){ return typeof file !== 'undefined'; }
    );
}

/**
 * Sorted by accession. Does not need to be all from one Experiment Set.
 * For usage especially by ChartDataController-using components.
 * 
 * @export
 * @param {Object[]} List of experiments with at least a 'files' property.
 * @returns {Object[]} List of all files gathered from experiments list.
 */
export function allFilesFromExperiments(experiments, includeFileSets = false, uniqify = false){
    var files = _.sortBy(
        _.flatten(
            _.map(ensureArray(experiments), function(exp){ return allFilesFromExperiment(exp, includeFileSets); }),
            true
        ),
        'accession'
    );

    if (uniqify){
        return _.uniq(files, true, function(file){ return file.accession; });
    }
    return files;
}

export function fileToAccessionTriple(file, toString = false){
    if (typeof file.from_experiment === 'undefined') throw new Error("No 'from_experiment' property set on this file.");
    if (typeof file.from_experiment.accession !== 'string') throw new Error("No 'from_experiment.accession' property set on this file.");
    if (typeof file.from_experiment.from_experiment_set === 'undefined') throw new Error("No 'from_experiment.from_experiment_set' property set on this file.");
    if (typeof file.from_experiment.from_experiment_set.accession !== 'string') throw new Error("No 'from_experiment.accession' property set on this file.");
    if (typeof file.accession !== 'string') throw new Error("No 'accession' property set on this file.");

    var triple = [ file.from_experiment.from_experiment_set.accession, file.from_experiment.accession, file.accession ];

    if (toString === true){
        return triple.join('~');
    } else if (toString && typeof toString === 'string'){
        return triple.join(toString);
    } else {
        return triple;
    }
}

export function filesToAccessionTriples(files, toString = false){
    return _.map(ensureArray(files), function(file){
        return fileToAccessionTriple(file, toString);
    });
}


/**
 * NOT SORTED
 *
 * @param   {Object[]} experiments - List of experiments, e.g. from experiments_in_set.
 * @returns {Object[][]} - All files with relations from experiments grouped into arrays of pairs (or other multiple).
 */
export function listAllFilePairs(experiments, includeFileSets = false){
    return (
        _.flatten(
            _.filter(
                _.pluck(
                    groupFilesByPairsForEachExperiment(experiments, includeFileSets),
                    'file_pairs'
                ),
                function(file){ return typeof file !== 'undefined'; }
            ),
            true
        )
    );
}


/**
 * Grab all experiments from experiment_sets, and save non-circular reference to parent experiment_set on experiment.
 *
 * @param   {Object[]} experiment_sets - List of experiment_sets, e.g. from a /browse/ request result's context['@graph'].
 * @returns {Object[]} - List of experiments from all experiments_sets, each with an updated 'experiment_sets' property
 */
export function listAllExperimentsFromExperimentSets(experiment_sets){
    var uniqExpAccessions = {};
    return _(ensureArray(experiment_sets)).chain()
        .map(function(set){
            return ensureArray(set.experiments_in_set).map(function(exp){
                // Make sure we return new exp & set objects instead of mutating existing ones.
                var cExp = _.clone(exp);
                var cSet = _.clone(set);
                cSet.experiments_in_set = cSet.experiments_in_set.length;
                cExp.experiment_sets = [cSet];
                cExp.from_experiment_set = cSet;
                return cExp;
            });
        })
        .flatten(true)
        .filter(function(exp){
            if (typeof uniqExpAccessions[exp.accession] !== 'undefined'){
                // Already have exp with same accession; keep 1 instance of it but combine their experiment_sets.
                uniqExpAccessions[exp.accession].experiment_sets = uniqExpAccessions[exp.accession].experiment_sets.concat(exp.experiment_sets);
                return false;
            } else {
                uniqExpAccessions[exp.accession] = exp;
                return true;
            }
        })
        .value();
    //return _.flatten(experiment_sets.map(function(set){ return set.experiments_in_set }), true);
}


/**
 * Groups experiments by experiment_set accession.
 * Almost inverse of listAllExperimentsFromExperimentSets, though returns an object.
 *
 * @param {Array} experiments - Array of experiment objects. Each must have property 'experiment_sets', containing array of experiment_set objects with at least accession.
 * @returns {Object} Contains experiment_set accessions as keys and array of experiments in that set as value.
 */
export function groupExperimentsIntoExperimentSets(experiments){
    var expSets = {};
    if (!Array.isArray(experiments)) throw new Error('param "experiments" must be an array');
    if (experiments.length === 0) return expSets;
    experiments.forEach(function(exp, i){
        if (!Array.isArray(exp.experiment_sets) || exp.experiment_sets.length === 0){
            // TODO : If no experiment sets, add to a 'None' set?
            throw new Error('Experiment "' + exp.accession + '" (index '+ i +') has no experiment sets.');
        }
        exp.experiment_sets.forEach(function(expSet, i){
            //if (typeof expSet.accession !== 'string') throw new Error('experiment_set.accession must be a string, we have:' + expSet.accession);
            var expSetKey = expSet.accession || 'set' + i;
            if (!(expSets[expSetKey] instanceof Set)){
                expSets[expSetKey] = new Set();
            }
            expSets[expSetKey].add(exp);
        });
    });

    var expSetKeys = _.keys(expSets);
    var currentKey = null;
    while (typeof expSetKeys[0] !== 'undefined'){
        // Convert Sets to Arrays
        currentKey = expSetKeys.pop();
        expSets[currentKey] = [...expSets[currentKey]];
    }
    return expSets;
}

/** @return Object with experiment accessions as keys, from input array of experiments. */
export function convertToObjectKeyedByAccession(experiments, keepExpObject = true){
    return _.object(
        ensureArray(experiments).map(function(exp){
            return [exp.accession, keepExpObject ? exp : true];
        })
    );
}




/*** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *
 * Partial Funcs (probably don't use these unless composing a function) *
 *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** */


export function combineWithReplicateNumbers(experimentsWithReplicateNums, experimentsInSet){
    if (!Array.isArray(experimentsWithReplicateNums)) return false;
    return _(experimentsWithReplicateNums).chain()
        .map(function(r){
            return {
                'tec_rep_no' : r.tec_rep_no || null,
                'bio_rep_no' : r.bio_rep_no || null,
                '@id' : r.replicate_exp && r.replicate_exp['@id'] || null
            };
        })
        .zip(experimentsInSet) // 'replicate_exps' and 'experiments_in_set' are delivered in same order from backend, so can .zip (linear) vs .map -> .findWhere  (nested loop).
        .map(function(r){
            r[1].biosample = _.clone(r[1].biosample);
            if (!r[1].biosample) r[1].biosample = { 'bio_rep_no' : '?' };
            r[1].biosample.bio_rep_no = r[0].bio_rep_no; // Copy over bio_rep_no to biosample to ensure sorting.
            return _.extend(r[0], r[1]);
        })
        .value();
}

export function findUnpairedFiles(files_in_experiment){
    return _.reduce(ensureArray(files_in_experiment), function(unpairedFiles, file, files){
        if (/*!Array.isArray(file.related_files) || */typeof file.paired_end === 'undefined') {
            unpairedFiles.push(file);
        }
        return unpairedFiles;
    }, []);
}

/**
 * TODO: Add from filesets as well instead of only as fallback if no experiment.files?
 *
 * @param {Object[]} experiments - List of experiment objects with files properties.
 * @returns {Object[]} List of unpaired files from all experiments.
 */
export function findUnpairedFilesPerExperiment(experiments, includeFileSets = false){
    return ensureArray(experiments).map(function(exp){
        var files;
        if (Array.isArray(exp.files)){
            files = findUnpairedFiles(exp.files);
        } else if (
            includeFileSets &&
            Array.isArray(exp.filesets) &&
            exp.filesets.length > 0 &&
            Array.isArray(exp.filesets[0].files_in_set)
        ){
            files = findUnpairedFiles(
                _.flatten(
                    _.pluck(exp.filesets, 'files_in_set'),
                    true
                )
            );
        } else {
            files = [];
        }
        return _.map(files, function(file){
            return _.extend({}, file, { 'from_experiment' : exp });
        });
    });
}

export function findExperimentInSetWithFileAccession(experiments_in_set, file_accession){
    return _.find(ensureArray(experiments_in_set), function(exp){
        var expFiles = ensureArray(exp.files);
        for (var i = 0; i < expFiles.length; i++){
            if (expFiles[i] && expFiles[i].accession && expFiles[i].accession === file_accession){
                return true;
            }
        }
        return false;
    });
}

export function fileCount(experiment, includeFileSets = false){
    var count = 0;
    if (Array.isArray(experiment.files)) {
        count += experiment.files.length;
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

export function allFilesFromExperiment(experiment, includeFileSets = false){
    var allFiles = ensureArray(experiment.files);
    if (includeFileSets){
        allFiles = allFiles.concat(allFilesFromFileSetsInExperiment(experiment));
    }
    return _.map(allFiles, function(origFile){
        var file = _.clone(origFile);
        if (typeof file.from_experiment === 'undefined') file.from_experiment = experiment;
        return file;
    });
}

export function allFilesFromExperimentSet(expSet){

    function add(memo, file){
        if (typeof file.accession === 'undefined' || _.pluck(memo, 'accession').indexOf(file.accession) === -1){
            memo.push(file);
        }
    }

    return _.reduce(allPairsSetsAndFilesFromExperimentSet(expSet), function(m, f){
        if (Array.isArray(f)){
            _.forEach(f, add.bind(add, m));
        } else {
            add(m, f);
        }
        return m;
    }, []);
}

/**
 * Combine file pairs and unpaired files into one array. 
 * Length will be file_pairs.length + unpaired_files.length, e.g. files other than first file in a pair are not counted.
 * Can always _.flatten() this or map out first file per pair.
 * 
 * @param {Object} expSet - Experiment Set
 * @returns {Array.<Array>} e.g. [ [filePairEnd1, filePairEnd2], [...], fileUnpaired1, fileUnpaired2, ... ]
 */
export function allPairsSetsAndFilesFromExperimentSet(expSet){
    var exps_in_set_with_from_set_property = _.map(ensureArray(expSet.experiments_in_set), function(exp){
        return _.extend({}, exp, { 'from_experiment_set' : expSet });
    });
    var pairs = listAllFilePairs(exps_in_set_with_from_set_property);
    var unpairedFiles = listAllUnpairedFiles(exps_in_set_with_from_set_property);
    return pairs.concat(unpairedFiles);
}

export function groupFilesByPairs(files_in_experiment){
    return _(ensureArray(files_in_experiment)).chain()
        .map(function(file){
            return _.clone(file);
        })
        .sortBy(function(file){ return parseInt(file.paired_end); }) // Bring files w/ paired_end == 1 to top of list.
        .reduce(function(pairsObj, file, files){
            // Group via { 'file_paired_end_1_ID' : { '1' : file_paired_end_1, '2' : file_paired_end_2,...} }
            if (parseInt(file.paired_end) === 1){
                pairsObj[file.uuid] = { '1' : file };
            } else if (Array.isArray(file.related_files)) {
                _.each(file.related_files, function(related){
                    if (pairsObj[related.file && related.file.uuid]) {
                        pairsObj[related.file && related.file.uuid][file.paired_end + ''] = file;
                    } else {
                        file.unpaired = true; // Mark file as unpaired
                    }
                });
            } else {
                file.unpaired = true; // Mark file as unpaired
            }
            return pairsObj;
        }, { })
        .values()
        .map(function(filePairObj){
            return _(filePairObj).chain()
                .pairs()
                .sortBy (function(fp){ return parseInt(fp[0]); })
                .map    (function(fp){ return fp[1]; })
                .value();
        })
        .value(); // [[file1,file2,file3,...],[file1,file2,file3,file4,...],...]
}

/**
 * @param {any} experiments - List of Experiment Items in JSON format.
 * @param {boolean} [includeFileSets=false] - Whether to include files from experiment.filesets.
 * @returns Modified list 'experiments' objects.
 */
export function groupFilesByPairsForEachExperiment(experiments, includeFileSets = false){
    return ensureArray(experiments).map(function(exp) {
        var file_pairs;
        if (Array.isArray(exp.files)){
            file_pairs = groupFilesByPairs(exp.files);
        } else if (
            includeFileSets &&
            Array.isArray(exp.filesets) &&
            exp.filesets.length > 0 &&
            Array.isArray(exp.filesets[0].files_in_set)
        ){
            file_pairs = groupFilesByPairs(
                allFilesFromFileSetsInExperiment(exp)
            );
        }

        if (Array.isArray(file_pairs) && file_pairs.length > 0) {
            _.forEach(file_pairs, function(pair){
                _.forEach(pair, function(file_in_pair){
                    file_in_pair.from_experiment = exp;
                });
            });
            exp = _.extend({}, exp, { 'file_pairs' : file_pairs });
        }
        return exp;
    });
}

export function flattenFileSetsToFilesIfNoFilesOnExperiment(experiment){
    if (Array.isArray(experiment.files)) return experiment;
    if (!Array.isArray(experiment.filesets) || experiment.filesets.length === 0 || !Array.isArray(experiment.filesets[0].files_in_set)) return experiment;
    experiment.files = _.flatten(
        _.pluck(experiment.filesets, 'files_in_set'),
        true
    );
    return experiment;
}

export function flattenFileSetsToFilesIfNoFilesForEachExperiment(experiments){
    return experiments.map(flattenFileSetsToFilesIfNoFilesOnExperiment);
}

export function groupExperimentsByBiosampleRepNo(experiments){
    return _(ensureArray(experiments)).chain()
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
    return _(ensureArray(experiments)).chain()
        .groupBy(function(exp){
            return exp.biosample['@id'] || exp.biosample.bio_rep_no;
        })
        .pairs()
        .sortBy(function(expSet){ return expSet[0]; }) // Sort outer list (biosamples) by biosample id
        .map(function(expSet){ return expSet[1]; }) // Creates [[expObjWBiosample1-1, expObjWBiosample1-2], [expObjWBiosample2-1, expObjWBiosample2-2], ...]
        .value();
}

/**
 * Use this to fail gracefully but also inform that some data is missing.
 *
 * @param {Object[]} someArray - Any list that should be a list.
 * @returns {Object[]} Array if valid array, or empty array if not.
 */
export function ensureArray(someArray){
    if (!Array.isArray(someArray)) {
        // Fail gracefully but inform -- because likely that only one of many experiment_sets may be missing experiments_in_set and we don't want
        // entire list of experiment_sets to fail.
        console.error("Parameter is not an array! Most likely an experiment_set has undefined property experiments_in_set instead of an empty array. Or files for an experiment. etc.");
        return [];
    }
    return someArray;
}
