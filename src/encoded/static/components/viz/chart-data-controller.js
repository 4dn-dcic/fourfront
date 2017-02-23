'use strict';

var _ = require('underscore');
var { expFxn, Filters, ajax, console, layout, isServerSide } = require('./../util');

/** 
 * This is a utility to manage charts' experiment data in one global place and distribute to charts throughout UI.
 */

var refs = {
    store       : null,
    navigate    : null,
    schemas     : null,
    updateStats : null,
    requestURLBase : '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&from=0',
    fieldsToFetch : [ // What fields we need from /browse/... for this chart.
        'accession',
        'experiments_in_set.experiment_summary',
        'experiments_in_set.experiment_type',
        'experiments_in_set.accession',
        //'experiments_in_set.status',
        //'experiments_in_set.files.file_type',
        'experiments_in_set.files.accession',
        'experiments_in_set.filesets.files_in_set.accession',
        //'experiments_in_set.biosample.description',
        //'experiments_in_set.biosample.modifications_summary_short',
        'experiments_in_set.biosample.biosource_summary',
        //'experiments_in_set.biosample.accession',
        //'experiments_in_set.biosample.biosource.description',
        'experiments_in_set.biosample.biosource.biosource_name',
        'experiments_in_set.biosample.biosource.biosource_type',
        'experiments_in_set.biosample.biosource.individual.organism.name',
        'experiments_in_set.biosample.biosource.individual.organism.scientific_name',
        'experiments_in_set.digestion_enzyme.name'
    ],
};

var state = {
    experiments         : null,
    filteredExperiments : null,
    fetching            : false,
    chartFieldsBarPlot  : [
        { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" },
        { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
        { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
        //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
    ],
    chartFieldsHierarchy: [
        //{ 
        //    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
        //    title : "Primary Organism",
        //    name : function(val, id, exps, filteredExps){
        //        return Filters.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
        //    }
        //},
        //{ title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
        //{ title : "Biosample", field : 'experiments_in_set.biosample.biosource_summary' },
        { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
        {
            title : "Digestion Enzyme",
            field : 'experiments_in_set.digestion_enzyme.name',
            description : function(val, id, exps, filteredExps, exp){
                return 'Enzyme ' + val;
            }
        },
        {
            title : "Experiment Set",
            aggregatefield : "experiment_sets.accession",
            field : "accession",
            isFacet : false,
            size : 1
        },
        //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" },
        //{
        //    title: "Experiment Accession",
        //    field : 'experiments_in_set.accession',
        //    //size : function(val, id, exps, filteredExps, exp, parentNode){
        //    //    return 1 / (_.findWhere(exp.experiment_sets, { 'accession' : parentNode.term }).experiments_in_set);
        //    //},
        //    color : "#eee",
        //    isFacet : false,
        //}
    ],
    chartFieldsHierarchyRight : [
        { 
            field : 'experiments_in_set.biosample.biosource.individual.organism.name',
            title : "Primary Organism",
            name : function(val, id, exps, filteredExps){
                return Filters.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
            }
        },
        { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
        { title : "Biosample", field : 'experiments_in_set.biosample.biosource_summary' },
        //{ title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
        //{
        //    title : "Digestion Enzyme",
        //    field : 'experiments_in_set.digestion_enzyme.name',
        //    description : function(val, id, exps, filteredExps, exp){
        //        return 'Enzyme ' + val;
        //    }
        //},
        {
            title : "Experiment Set",
            aggregatefield : "experiment_sets.accession",
            field : "accession",
            isFacet : false,
            size : 1
        },
        //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" },
        //{
        //    title: "Experiment Accession",
        //    field : 'experiments_in_set.accession',
        //    //size : function(val, id, exps, filteredExps, exp, parentNode){
        //    //    return 1 / (_.findWhere(exp.experiment_sets, { 'accession' : parentNode.term }).experiments_in_set);
        //    //},
        //    color : "#eee",
        //    isFacet : false,
        //}
    ]
};

var ChartDataController = module.exports = {

    /** 
     * This function must be called before this component is used anywhere else.
     */
    initialize : function(schemas = null, navigateFxn = null, updateStatsFxn = null){
        if (!refs.store) {
            refs.store = require('./../../store');
        }
        if (!refs.navigate && navigateFxn) {
            refs.navigate = navigateFxn;
        }
        if (!refs.schemas && schemas){
            refs.schemas = schemas;
        }
        if (!refs.updateStats && updateStatsFxn){
            refs.updateStats = updateStatsFxn;
        }
    },

    getState : function(){ return _.clone(state); },

    setState : function(updatedState = {}, callback = null){
        _.extend(state, updatedState);
        if (typeof callback === 'function'){
            return callback(state);
        }
    },

    fetchUnfilteredAndFilteredExperiments : function(storeState = null, callback = null, extraState = {}){
        if (!storeState || !storeState.expSetFilters || !storeState.href){
            storeState = refs.store.getState();
        }
        var filtersSet = _.keys(storeState.expSetFilters).length > 0;
        var experiments, filteredExperiments = null;

        var cb = _.after(filtersSet ? 2 : 1, function(){
            ChartDataController.setState(_.extend({ 
                'experiments' : experiments,
                'filteredExperiments' : filteredExperiments
            }, extraState), callback);

        });

        ajax.load(
            refs.requestURLBase + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(allExpsContext){
                experiments = expFxn.listAllExperimentsFromExperimentSets(allExpsContext['@graph']);
                cb();
            }
        );

        if (filtersSet){
            ajax.load(
                ChartDataController.getFilteredContextHref(
                    storeState.expSetFilters, storeState.href
                ) + ChartDataController.getFieldsRequiredURLQueryPart(),
                function(filteredContext){
                    filteredExperiments = expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph']);
                    cb();
                }
            );
        }

    },

    fetchAndSetUnfilteredExperiments : function(extraState = {}){
        ajax.load(
            refs.requestURLBase + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(allExpsContext){
                ChartDataController.setState(
                    _.extend(extraState, {
                        'experiments' : expFxn.listAllExperimentsFromExperimentSets(allExpsContext['@graph'])
                    })
                );
            }
        );
    },

    fetchAndSetFilteredExperiments : function(extraState = {}){
        ajax.load(
            ChartDataController.getFilteredContextHref(props) + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(filteredContext){
                ChartDataController.setState(
                    _.extend(extraState, {
                        'filteredExperiments' : expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph'])
                    })
                );
            },
            'GET',
            function(){
                // Fallback (no results or lost connection)
                ChartDataController.setState(extraState);
            }
        );
    },

    getFieldsRequiredURLQueryPart : function(fields = refs.fieldsToFetch){
        return fields.map(function(fieldToIncludeInResult){
            return '&field=' + fieldToIncludeInResult;
        }).join('');
    },

    getFilteredContextHref : function(expSetFilters, href){
        if (!expSetFilters || !href){
            var storeState = refs.store.getState();
            if (!expSetFilters) expSetFilters = storeState.expSetFilters;
            if (!href)          href = storeState.href;
        }
        return Filters.filtersToHref(expSetFilters, href, 0, 'all', '/browse/');
    },

};