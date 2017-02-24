'use strict';

var React = require('react');
var _ = require('underscore');
var { expFxn, Filters, ajax, console, layout, isServerSide } = require('./../util');

/** 
 * This is a utility to manage charts' experiment data in one global place and distribute to charts throughout UI.
 */

var refs = {
    store       : null,
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
    expSetFilters : null,
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

var providerCallbacks = {};

var reduxSubscription = null;
var isInitialized = false;

var ChartDataController = module.exports = {

    debugging : true,

    Provider : React.createClass({

        propTypes : {
            'id' : React.PropTypes.string.isRequired,
            'children' : React.PropTypes.object.isRequired
        },

        componentWillMount : function(){
            ChartDataController.registerUpdateCallback(()=>{
                this.forceUpdate();
            }, this.props.id);
        },

        componentWillUnmount : function(){
            ChartDataController.unregisterUpdateCallback(this.props.id);
        },

        render : function(){
            var childChartProps = _.extend({}, this.props.children.props);
            childChartProps.experiments = state.experiments;
            childChartProps.filteredExperiments = state.filteredExperiments;
            return React.cloneElement(this.props.children, childChartProps);
        }

    }),

    /** 
     * This function must be called before this component is used anywhere else.
     */
    initialize : function(
        requestURLBase = null,
        callback = null
    ){
        if (!refs.store) {
            refs.store = require('./../../store');
        }
        if (requestURLBase){
            refs.requestURLBase = requestURLBase;
        }

        if (reduxSubscription !== null) {
            reduxSubscription(); // Unsubscribe current listener.
        }

        // Subscribe to Redux store updates to listen for changed expSetFilters.
        reduxSubscription = refs.store.subscribe(function(){
            var prevExpSetFilters = refs.expSetFilters;
            var reduxStoreState = refs.store.getState();
            refs.expSetFilters = reduxStoreState.expSetFilters;

            if (prevExpSetFilters !== refs.expSetFilters || !_.isEqual(refs.expSetFilters, prevExpSetFilters)){
                ChartDataController.handleUpdatedFilters(refs.expSetFilters, function(){
                    _.forEach(providerCallbacks, function(pcb){
                        pcb(state);
                    });
                });
            }
        });

        ChartDataController.fetchUnfilteredAndFilteredExperiments(null, callback);
        isInitialized = true;
    },

    isInitialized : function(){
        return isInitialized;
    },

    registerUpdateCallback : function(callback, uniqueID = 'global'){
        if (typeof callback !== 'function') throw Error("callback must be a function.");
        if (typeof uniqueID !== 'string') throw Error("uniqueID must be a string.");
        providerCallbacks[uniqueID] = callback;
    },

    unregisterUpdateCallback : function(uniqueID){
        if (typeof uniqueID !== 'string') throw Error("uniqueID must be a string.");
        delete providerCallbacks[uniqueID];
    },

    getState : function(){ return _.clone(state); },

    setState : function(updatedState = {}, callback = null){
        _.extend(state, updatedState);
        if (updatedState.experiments || updatedState.filteredExperiments){
            _.forEach(providerCallbacks, function(pcb){
                pcb(state);
            });
        }
        if (typeof callback === 'function'){
            return callback(state);
        }
    },

    sync : function(callback){
        if (!isInitialized) throw Error("Not initialized.");
        ChartDataController.fetchUnfilteredAndFilteredExperiments(null, callback);
    },

    handleUpdatedFilters : function(expSetFilters, callback){
        if (_.keys(expSetFilters).length === 0 && Array.isArray(state.experiments)){
            ChartDataController.setState({ filteredExperiments : null }, callback);
        } else {
            ChartDataController.fetchAndSetFilteredExperiments(callback);
        }
    },






    fetchUnfilteredAndFilteredExperiments : function(reduxStoreState = null, callback = null){
        if (!reduxStoreState || !reduxStoreState.expSetFilters || !reduxStoreState.href){
            reduxStoreState = refs.store.getState();
        }
        var filtersSet = _.keys(reduxStoreState.expSetFilters).length > 0;
        var experiments = null, filteredExperiments = null;

        var cb = _.after(filtersSet ? 2 : 1, function(){
            ChartDataController.setState({
                'experiments' : experiments,
                'filteredExperiments' : filteredExperiments
            }, callback);

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
                    reduxStoreState.expSetFilters, reduxStoreState.href
                ) + ChartDataController.getFieldsRequiredURLQueryPart(),
                function(filteredContext){
                    filteredExperiments = expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph']);
                    cb();
                }
            );
        }

    },

    fetchAndSetUnfilteredExperiments : function(callback = null){
        ajax.load(
            refs.requestURLBase + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(allExpsContext){
                ChartDataController.setState({
                    'experiments' : expFxn.listAllExperimentsFromExperimentSets(allExpsContext['@graph'])
                }, callback);
            }
        );
    },

    fetchAndSetFilteredExperiments : function(callback = null){
        ajax.load(
            ChartDataController.getFilteredContextHref() + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(filteredContext){
                ChartDataController.setState({
                    'filteredExperiments' : expFxn.listAllExperimentsFromExperimentSets(filteredContext['@graph'])
                }, callback);
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