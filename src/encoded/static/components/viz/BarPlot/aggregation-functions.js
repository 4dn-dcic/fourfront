'use strict';

import React from 'react';
import _ from 'underscore';
import * as d3 from 'd3';
import * as vizUtil from './../utilities';
import { console, object, expFxn } from './../../util';


// TODO: Some of these funcs are deprecated & longer used. Check what they are & remove them.

/**
 * Various aggregation functions which are used by BarPlot.Chart and/or BarPlot.Aggregator to convert & aggregate list of experiments
 * into a chart-friendly structure.
 * 
 * @file
 */

// *************************************
// **** AGGREGATION FUNCTIONS BELOW ****
// *************************************

/** 
 * Entrypoint for aggregation. 
 * First, counts up terms per field from experiments for field in supplied 'fields' param array. Count is adjusted depending on if aggregating experiments, experiment_sets, or files.
 * Secondly, partitions one field as a child of another. If param 'useOnlyPopulatedFields' is false (default), then will use
 * first field in param 'fields' array as primary field, or X-axis, and second field as secondary field, or bar subdivision.
 * If 'useOnlyPopulatedFields' is set to true, will find the first field which has multiple terms (== multiple bars) to use as the primary field, and find
 * second field with multiple terms to use as the secondary field.
 * 
 * @static
 * @public
 * @param {Array} experiments - List of experiments which are to be aggregated or counted by their term(s).
 * @param {Array} fields - List of fields containing at least 'field' property (as object-dot-notated string).
 * @param {boolean} [useOnlyPopulatedFields=false] - If true, will try to only select fields which have multiple terms to visualize.
 * 
 * @returns {Array} - Array of fields, now containing term counts per field. One field (either the first or first populated) will have a childField with partitioned terms.
 */
export function genChartData(
    experiment_sets = [],
    fields = [{ 'name' : 'Biosample' , 'field' : 'experiments_in_set.biosample.biosource_summary' }],
    useOnlyPopulatedFields = false
){

    // Since we not looking for populated fields, only keep track of first two fields provided.
    fields = !useOnlyPopulatedFields ? fields.slice(0,2) : fields.slice(0);

    // Add terms and total for each field which isn't null or undefined.
    fields = _.filter(fields, function(f){
        return f;
    }).map(function(f){
        return _.extend({}, f, {
            'terms' : {},
            'total' : createZeroCountTermObj()
        });
    });

    aggregateByType(fields, experiment_sets); // First-level (x-axis) fields.

    if (fields.length === 1) return fields;
    return partitionFields(fields, experiment_sets, useOnlyPopulatedFields); // Partition them into bar components (counts will override).
}


function createZeroCountTermObj(){
    return {
        'experiments' : 0,
        'experiment_sets' : 0,
        'files' : 0
    };
}

export function getNestedExpSetPropertyFromExperiment(experiment, property, suppressNotFoundError = true){
    if (property.slice(0,19) === 'experiments_in_set.'){
        return object.getNestedProperty(experiment, property.slice(19), suppressNotFoundError);
    } else {
        return object.getNestedProperty(experiment.from_experiment_set, property, suppressNotFoundError);
    }
}


/**
 * Performs the INITIAL aggregation (along the X-Axis) for field(s).
 *
 * @static
 * @ignore
 */
function aggregateByType(fields, experiment_sets){

    

    // Experiment Sets
    _.forEach(
        expFxn.ensureArray(experiment_sets),
        function(experiment_set){

            var expsInSet = expFxn.experimentsFromExperimentSet(experiment_set);

            fields.forEach(function(currField){
                // Add +1 for each unique term that the ExpSet (aka one of its experiments) matches.
                getUniqueMatchedTermsFromExpsInSet(expsInSet, currField.field).forEach(function(term){
                    countFieldTerm(currField, term, true, 'experiment_sets', 1);
                });
            });

            /*
            DEPRECATED: Add (1 / # exps in set) for each exp in exps_in_set.
            ------
            var aggrValue = (1 / expsInSet.length);
            expsInSet.forEach(function(exp){
                var fieldTermPairs = getTermsForFieldsFromExperiment(fields,exp);
                fieldTermPairs.forEach(function(fieldTermPair, i){
                    if (fields[i].field !== fieldTermPair[0]) throw new Error("This shouldn't happen");
                    countFieldTerm(fields[i], fieldTermPair[1], true, aggrValue);
                });
            });
            // Finally, round resulting counts because JS might leave, e.g., 0.99999999999 instead of 1.
            fields.forEach(function(field){
                _.forEach(_.keys(field.terms), function(term){
                    field.terms[term] = Math.round(field.terms[term] * 100) / 100;
                });
            });
            */

            // Experiments
            expsInSet.forEach(function(exp){
                getTermsForFieldsFromExperiment(fields,exp).forEach(function(fieldTermPair, i){
                    if (fields[i].field !== fieldTermPair[0]) throw new Error("This shouldn't happen");
                    countFieldTerm(fields[i], fieldTermPair[1], true, 'experiments');
                });
            });

            // Raw Files, Exp Processed Files
            expsInSet.forEach(function(exp){
                // [[field0Id, term], [field1Id, term], ...] . forEach( -->
                getTermsForFieldsFromExperiment(fields,exp).forEach(function(fieldTermPair, i){
                    countFieldTerm(fields[i], fieldTermPair[1], true, 'files', expFxn.fileCount(exp, true));
                });
            });

            // ExpSet Processed Files
            if (Array.isArray(experiment_set.processed_files)){
                getTermsForFieldsFromExperimentSet(fields, experiment_set).forEach(function(fieldTermPair, i){
                    countFieldTerm(fields[i], fieldTermPair[1], true, 'files', experiment_set.processed_files.length);
                });
            }
        
        }
    );

}


/**
 * Get all unique terms to which param field evaluates to for experiments in a set.
 * We need to count +1 exp set to each unique term.
 *
 * @public
 * @static
 * @param {Object[]} experiments_in_set - Experiment objects belonging to a single experiment set.
 * @param {string|Object.<string>} field - Field to get matched terms for. Can be string or object with a {string} "field" property.
 */
export function getUniqueMatchedTermsFromExpsInSet(experiments_in_set, field){
    if (field && typeof field === 'object' && typeof field.field === 'string') field = field.field;
    return _.uniq(_.map(experiments_in_set, function(exp){ return getNestedExpSetPropertyFromExperiment(exp, field, true); }).sort(), true);
}


/**
 * Same as getUniqueMatchedTermsFromExpsInSet BUT only from experiments filtered to match parentField and parentTerm.
 * 
 * @public
 * @static
 * @param {Object[]} experiments_in_set - Experiment objects belonging to a single experiment set.
 * @param {string|Object.<string>} field - Field to get matched terms for. Can be string or object with a {string} "field" property.
 */
export function getUniqueMatchedTermsFromExpsInSetWhereFieldIsTerm(experiments_in_set, field, parentField, parentTerm){
    if (parentField && typeof parentField === 'object' && typeof parentField.field === 'string') parentField = parentField.field;
    return getUniqueMatchedTermsFromExpsInSet(
        _.filter(experiments_in_set, function(exp){
            var foundTerm = getNestedExpSetPropertyFromExperiment(exp, parentField, true);
            if (Array.isArray(foundTerm)) foundTerm = foundTerm[0]; // Use first term if it evals to multiple for now.
            if (!foundTerm && parentTerm === "None") return true;
            return parentTerm === foundTerm;
        }),
        field
    );
}


/**
 * If useOnlyPopulatedFields is true, will find the first two fields which have more than 1 term and select those for further aggregation and visualization.
 * Otherwise, will simply select the first two fields from the fields parameter.
 *
 * @deprecated
 * @static
 * @public
 * @param {Object[]} fields - List of field objects.
 * @param {Object[]} experiments - List of experiment objects.
 * @param {string} aggregate - Deprecated. What to aggregate by.
 * @param {boolean} [useOnlyPopulatedFields=false] - Whether to search for populated fields or not.
 */
function partitionFields(fields, experiment_sets, useOnlyPopulatedFields = false){
    var topIndex, nextIndex;
    if (!Array.isArray(fields) || fields.length < 2) throw new Error("Need at least 2 fields.");
    if (useOnlyPopulatedFields){
        // Find first & second fields which have more than 1 term and use those.
        topIndex = firstPopulatedFieldIndex(fields);
        if ((topIndex + 1) >= fields.length) return fields; // Cancel
        
        nextIndex = firstPopulatedFieldIndex(fields, topIndex + 1);
    } else {
        // Use fields[0] and fields[1].
        topIndex = 0;
        nextIndex = 1;
    }
    fields[topIndex].childField = fields[nextIndex];
    return combinedFieldTermsForExperimentSets(fields, experiment_sets);
}


/**
 * Routes an incremental value to the proper fieldObj term count.
 *
 * @static
 * @public
 * @param {Object} fieldObj - A field object with present but incomplete 'terms' & 'total'.
 * @param {string|string[]} term - A string or array of strings denoting terms.
 * @param {boolean} [updateTotal=true] - Whether to update fieldObj.total property as well.
 * @param {number} [countIncrease=1] - Amount to increase count for term by.
 * @returns {void}
 */
export function countFieldTerm(fieldObj, term, updateTotal = true, aggregateType = 'experiments', countIncrease = 1){
    if (term === null) term = "None";
    var termsCont = fieldObj.terms;
    if (Array.isArray(term)){
        term = _.uniq(term);
        if (term.length === 1) term = term[0];
        else {
            console.warn('Multiple unique terms for field ' + fieldObj.field, term);
            term = term[0];
        }
        /*
        else {
            var i = 0;
            while (i < term.length - 1){
                termsCont = termsCont[term[i]].terms;
                if (typeof termsCont === 'undefined') return;
                i++;
            }
            term = term[i];
        }
        */
    }

    if (typeof termsCont[term] !== 'object'){
        termsCont[term] = createZeroCountTermObj();
    }

    termsCont[term][aggregateType] += countIncrease;
    if (updateTotal) fieldObj.total[aggregateType] += countIncrease;
}


export function doFieldsDiffer(fields1, fields2){
    if (Array.isArray(fields1) && !Array.isArray(fields2)) return true;
    if (!Array.isArray(fields1) && Array.isArray(fields2)) return true;
    if (fields1.length !== fields2.length) return true;
    if (fields1 !== fields2) return true;
    var combos = _.zip(_.pluck(fields1, 'field'), _.pluck(fields2, 'field'));
    for (var i = 0; i < combos.length; i++){
        if (combos[i][0] !== combos[i][1]) return true;
    }
    return false;
}


/**
 * @param {Array} fields - List of field objects.
 * @param {Object} exp - Experiment to get terms (field values) from to pair with fields.
 * @returns {Array} Array of pairs containing field key (index 0) and term (index 1) 
 */
export function getTermsForFieldsFromExperiment(fields, exp){
    return fields.map(function(f){
        return [f.field, getNestedExpSetPropertyFromExperiment(exp, f.field, true) ];
    });
}

/**
 * @param {Array} fields - List of field objects.
 * @param {Object} exp - Experiment to get terms (field values) from to pair with fields.
 * @returns {Array} Array of pairs containing field key (index 0) and term (index 1) 
 */
export function getTermsForFieldsFromExperimentSet(fields, expSet){
    return fields.map(function(f){
        return [ f.field, object.getNestedProperty(expSet, f.field, true) ];
    });
}


/**
 * @static
 * @ignore
 */
function combinedFieldTermsForExperimentSets(fields, experiment_sets){
    var field;
    var fieldIndex;
    if (Array.isArray(fields)){ // Fields can be array or single field object.
        fieldIndex = _.findIndex(fields, function(f){ return typeof f.childField !== 'undefined'; });
        field = fields[fieldIndex];
    } else {
        field = fields;
    }

    function createNoneChildField(){
        field.terms["None"] = {
            'field' : field.childField.field, 
            'cachedTotal' : null,
            'total' : createZeroCountTermObj(),
            'term' : "None",
            'terms' : {}
        };
    }

    field.terms = _.object(_.map(_.pairs(_.clone(field.terms)), function(term){ // Convert term vals from counts to child-fields
        return [ term[0], {
            'field' : field.childField.field, 
            'cachedTotal' : term[1],
            'total' : createZeroCountTermObj(),
            'term' : term[0],
            'terms' : {} 
        }];
    }));

    function aggregateExpAndFilesFromExp(exp){

        var topLevelFieldTerm = getNestedExpSetPropertyFromExperiment(exp, field.field, true);
        var nextLevelFieldTerm = getNestedExpSetPropertyFromExperiment(exp, field.childField.field, true);

        // For now, just use first term if evaluates to list.
        if (Array.isArray(topLevelFieldTerm)) topLevelFieldTerm = topLevelFieldTerm[0];
        if (Array.isArray(nextLevelFieldTerm)) nextLevelFieldTerm = nextLevelFieldTerm[0];

        if (!topLevelFieldTerm){
            topLevelFieldTerm = "None";
            if (typeof field.terms[topLevelFieldTerm] === 'undefined') createNoneChildField();
        }

        if (!nextLevelFieldTerm) nextLevelFieldTerm = "None";

        // Files
        var fileCountFromExps = expFxn.fileCount(exp, true);
        countFieldTerm(field.terms[topLevelFieldTerm], nextLevelFieldTerm, true, 'files', expFxn.fileCount(exp, true));

        // Experiments
        countFieldTerm(field.terms[topLevelFieldTerm], nextLevelFieldTerm, true, 'experiments', 1);
    }

    // Aggregate experiment sets, exps, files for child (subdivision) field
    // [ [set1exp1, set1exp2, set1exp3], [set2exp1, set2exp2, ...], ...].forEach
    expFxn.ensureArray(experiment_sets).forEach(function(experiment_set){

        var expsInSet = expFxn.experimentsFromExperimentSet(experiment_set);

        var topLevelFieldTerms = _.uniq(getUniqueMatchedTermsFromExpsInSet(
            expsInSet,
            field.field
        ).map(function(tlft){
            if (Array.isArray(tlft)) tlft = tlft[0]; // For now, just use first term per unique set of terms if evaluates to list.
            if (!tlft){
                tlft = "None";
                if (typeof field.terms["None"] === 'undefined') createNoneChildField();
            }
            return tlft;
        }));

        topLevelFieldTerms.forEach(function(tlft){
            var nextLevelFieldTerms = _.uniq(getUniqueMatchedTermsFromExpsInSetWhereFieldIsTerm(
                expsInSet,
                field.childField.field,
                field,
                tlft
            ).map(function(nlft){
                if (Array.isArray(nlft)) nlft = nlft[0]; // For now, just use first term per unique set of terms if evaluates to list.
                if (!nlft) return "None";
                return nlft;
            }));
            
            nextLevelFieldTerms.forEach(function(term){
                countFieldTerm(field.terms[tlft], term, true, 'experiment_sets', 1);

                // ExpSet Processed Files
                if (Array.isArray(experiment_set.processed_files) && experiment_set.processed_files.length > 0){
                    var fileCountFromExps = experiment_set.processed_files.length;
                    countFieldTerm(field.terms[tlft], term, true, 'files', experiment_set.processed_files.length);
                }

            });

        });

        // Experiments, Raw Files
        expsInSet.forEach(aggregateExpAndFilesFromExp);

    });

    if (Array.isArray(fields)){
        fields[fieldIndex] = field; // Probably not needed as field already simply references fields[fieldIndex];
    }

    return fields;

}


/**
 * Find first field from param 'fields', starting from param 'start', which has more counts for more than 1 term.
 * 
 * @static
 * @public
 * @param {Object[]} fields - List of field objects.
 * @param {number} start - Start index.
 * @returns {number} - Index of first populated field.
 */
export function firstPopulatedFieldIndex(fields, start = 0){
    var topIndex = start;
    var numberOfTerms;

    // Go down list of fields until select field to display which has more than 1 term, or until last field.
    while (topIndex + 1 < fields.length){
        numberOfTerms = _.keys(fields[topIndex].terms).length;
        if (numberOfTerms > 1) break;
        topIndex++;
    }
    return topIndex;
}
