'use strict';

/** @ignore */
var React = require('react');
import PropTypes from 'prop-types';
var _ = require('underscore');
var { expFxn, Filters, Schemas, ajax, console, layout, isServerSide, navigate, object } = require('./../util');
var vizUtil = require('./utilities');


/** 
 * This is a utility to manage charts' experiment data in one global place and distribute to charts throughout UI.
 * The mechanism for this is roughly diagrammed here:
 * 
 * .. image:: https://files.slack.com/files-pri/T0723UERE-F4C8KQKMM/chartdatacontroller.png
 * 
 * @module {Object} viz/chart-data-controller
 */


/**
 * @private
 * @ignore
 */
var refs = {
    store       : null,
    href        : null, // Cached from redux store updates // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
    requestURLBase : null,//'/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&from=0',
    updateStats : null, // Function to update stats @ top of page.
    fieldsToFetch : [ // What fields we need from /browse/... for this chart.
        'accession',
        'experiments_in_set.experiment_summary',
        'experiments_in_set.experiment_type',
        'experiments_in_set.accession',
        //'experiments_in_set.status',
        //'experiments_in_set.files.file_type',
        'experiments_in_set.files.accession',
        'experiments_in_set.files.file_type_detailed',
        'experiments_in_set.filesets.files_in_set.accession',
        'experiments_in_set.processed_files.accession',
        'processed_files.accession',
        'experiments_in_set.processed_files.file_type_detailed',
        'processed_files.file_type_detailed',
        //'experiments_in_set.biosample.description',
        //'experiments_in_set.biosample.modifications_summary_short',
        'experiments_in_set.biosample.biosource_summary', // AKA Biosource
        //'experiments_in_set.biosample.biosource.biosource_name', // AKA Biosource
        'experiments_in_set.biosample.biosource.biosource_type', // AKA Biosource Type
        'experiments_in_set.lab.title',
        'experiments_in_set.biosample.biosource.individual.organism.name',
        'experiments_in_set.digestion_enzyme.name',
        'award.project',
        'lab.title'
    ],
    expSetFilters : null,
};

/**
 * Contains "state" of ChartDataController. Some of these are deprecated and will be removed.
 * The most important ones are experiment_sets and filtered_experiment_sets.
 * 
 * @type {Object}
 * @private
 * @ignore
 */
var state = {
    experiment_sets     : null,
    filtered_experiment_sets : null,
    fetching            : false,

    chartFieldsHierarchy: [
        //{ 
        //    field : 'experiments_in_set.biosample.biosource.individual.organism.name',
        //    title : "Primary Organism",
        //    name : function(val, id, exps, filteredExps){
        //        return Schemas.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
        //    }
        //},
        //{ title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
        //{ title : "Biosample", field : 'experiments_in_set.biosample.biosource_summary' },
        { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
        {
            title : "Digestion Enzyme",
            field : 'experiments_in_set.digestion_enzyme.name',
            /** @ignore */
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
    /** @ignore */
    chartFieldsHierarchyRight : [
        { 
            field : 'experiments_in_set.biosample.biosource.individual.organism.name',
            title : "Primary Organism",
            /** @ignore */
            name : function(val, id, exps, filteredExps){
                return Schemas.Term.toName('experiments_in_set.biosample.biosource.individual.organism.name', val);
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

/** Private state & functions **/

/** 
 * @private
 * @ignore
 */
var providerCallbacks = {};

/** 
 * @private
 * @ignore
 */
var providerLoadStartCallbacks = {};

/**
 * After load & update, call registered Update callbacks.
 * @private
 * @ignore
 */
function notifyUpdateCallbacks(){
    console.log('Notifying update callbacks',_.keys(providerCallbacks));
    _.forEach(providerCallbacks, function(pcb){
        pcb(state);
    });
}

/**
 * Before load, call registered Load Start callbacks.
 * @private
 * @ignore
 */
function notifyLoadStartCallbacks(){
    console.log('Notifying load start callbacks', _.keys(providerLoadStartCallbacks));
    _.forEach(providerLoadStartCallbacks, function(plscb){
        plscb(state);
    });
}

function reFetchContext(){
    console.info('ChartDataController -> Refetch Context Called');
    try {
        navigate('', { inPlace : true, dontScrollToTop: true });
    } catch (e){
        console.warn(e);
        return false;
    }
    return true;
}


/**
 * Holds unsubcribe callback to Redux store subscription.
 * @private
 * @ignore
 * @type {null|function}
 */
var reduxSubscription = null;

/**
 * @private
 * @ignore
 * @type {boolean}
 */
var isInitialized = false;


var isInitialLoadComplete = false;

/**
 * @private
 * @ignore
 * @type {number}
 */
var lastTimeSyncCalled = 0;

/**
 * @private
 * @ignore
 * @type {?string}
 */
var resyncInterval = null;

/**
 * @private
 * @ignore
 * @type {boolean}
 */
var isWindowActive = false;


/**
 * Use this React component to wrap individual charts and provide them with source of experiments data via
 * their props.experiment_sets and props.filtered_experiment_sets. Also provides props.expSetFilters from redux store.
 * 
 * @class Provider
 * @type {Component}
 * @memberof module:viz/chart-data-controller
 * 
 * @prop {string} id - Unique ID.
 * @prop {Object} children - Must be a Chart or Chart controller component.
 */
class Provider extends React.Component {

    static propTypes = {
        'id' : PropTypes.string,
        'children' : PropTypes.object.isRequired
    }

    constructor(props){
        super(props);
        if (typeof props.id === 'string') {
            this.id = props.id;
        } else {
            this.id = object.randomId();
        }
    }

    /**
     * Registers a callback function, which itself calls this.forceUpdate(), with module-viz_chart-data-controller_
     * using ChartDataController.registerUpdateCallback(cb, this.props.id).
     * 
     * @memberof module:viz/chart-data-controller.Provider
     * @private
     * @instance
     * @this module:viz/chart-data-controller.Provider
     * @returns {void} Nothing
     */
    componentWillMount(){
        ChartDataController.registerUpdateCallback(()=>{
            this.forceUpdate();
        }, this.id);
    }

    /**
     * Unregisters itself using ChartDataController.unregisterUpdateCallback(this.props.id).
     * 
     * @memberof module:viz/chart-data-controller.Provider
     * @private
     * @instance
     * @this module:viz/chart-data-controller.Provider
     * @returns {void} Nothing
     */
    componentWillUnmount(){
        ChartDataController.unregisterUpdateCallback(this.id);
    }

    /**
     * Sets 'experiment_sets' and 'filtered_experiment_sets' props on props.children.
     * 
     * @returns {JSX.Element} Cloned & adjusted props.children.
     * @memberof module:viz/chart-data-controller.Provider
     * @private
     * @instance
     */
    render(){
        var childChartProps = _.extend({}, this.props.children.props);

        childChartProps.experiment_sets = state.experiment_sets;
        childChartProps.filtered_experiment_sets = state.filtered_experiment_sets;
        childChartProps.expSetFilters = refs.expSetFilters;

        return React.cloneElement(this.props.children, childChartProps);
    }

}


/**
 * @type {Object}
 * @alias module:viz/chart-data-controller
 */
export const ChartDataController = {

    Provider : Provider,

    /** 
     * This function must be called before this component is used anywhere else.
     * 
     * @public
     * @static
     * @param {string} requestURLBase - Where to request 'all experiments' from.
     * @param {function} [updateStats] - Callback for updating QuickInfoBar, for example, with current experiments, experiment_sets, and files counts.
     * @param {function} [callback] - Optional callback for after initializing.
     * @param {number|boolean} [resync=false] - How often to resync data, in ms, if window is active, for e.g. if submitters submitted new data while user is browsing.
     * @returns {void} Undefined
     */
    initialize : function(
        requestURLBase = null,
        updateStats = null,
        callback = null,
        resync = false,
        href = null
    ){
        refs.href = href;
        if (!refs.store) {
            refs.store = require('./../../store');
        }
        if (typeof requestURLBase === 'string'){
            refs.requestURLBase = requestURLBase;
        }
        if (typeof updateStats === 'function'){
            refs.updateStats = updateStats;
        }

        if (reduxSubscription !== null) {
            reduxSubscription(); // Unsubscribe current listener.
        }

        // Subscribe to Redux store updates to listen for changed expSetFilters.
        reduxSubscription = refs.store.subscribe(function(){
            var prevExpSetFilters = refs.expSetFilters;
            var prevHref = refs.href; // TODO: MAYBE REMOVE REFS.HREF WHEN SWITCH SEARCH FROM /BROWSE/
            var reduxStoreState = refs.store.getState();
            refs.href = reduxStoreState.href;
            refs.expSetFilters = reduxStoreState.expSetFilters;

            // TODO: MAYBE REMOVE SEARCHQUERY WHEN SWITCH SEARCH FROM /BROWSE/
            if ((prevExpSetFilters !== refs.expSetFilters || !_.isEqual(refs.expSetFilters, prevExpSetFilters)) || (prevHref && Filters.searchQueryStringFromHref(prevHref) !== Filters.searchQueryStringFromHref(refs.href))){
                ChartDataController.handleUpdatedFilters(
                    refs.expSetFilters,
                    notifyUpdateCallbacks,
                    { 'searchQuery' : Filters.searchQueryStringFromHref(refs.href) }
                );
            }
        });

        isInitialized = true;

        ChartDataController.sync(function(){
            isInitialLoadComplete = true;
            callback(state);
        }, { isInitial : true });

        // Resync periodically if resync interval supplied.
        if (typeof resync === 'number' && !isServerSide()){

            resync = Math.max(resync, 20000); // 20sec minimum

            window.addEventListener('focus', function(){
                if (lastTimeSyncCalled + resync < Date.now()){
                    ChartDataController.sync(function(){
                        isWindowActive = true;
                    }, { 'fromSync' : true, 'fromInterval' : true });
                } else {
                    isWindowActive = true;
                }
            });

            window.addEventListener('blur', function(){
                isWindowActive = false;
            });

            resyncInterval = setInterval(function(){
                if (!isWindowActive) return;
                console.info('Resyncing experiment_sets & filtered_experiment_sets for ChartDataController.');
                ChartDataController.sync(null, { 'fromInterval' : true, 'fromSync' : true });
            }, resync);

            isWindowActive = true;

        }

        // For debugging, e.g. embedded properties of fetched experiments.
        if (!isServerSide()){
            window.ChartDataController = ChartDataController;
        }

    },

    /**
     * Whether component has been initialized and may be used.
     * 
     * @public
     * @static
     * @returns {boolean} True if initialized.
     */
    isInitialized : function(){
        return isInitialized;
    },

    /** 
     * For React components to register an "update me" function, i.e. forceUpdate,
     * to be called when new experiments/filteredExperiments has finished loading from back-end.
     * 
     * @public
     * @static
     * @param {function} callback - Function to be called upon loading 'experiments' or 'all experiments'. If registering from a React component, should include this.forceUpdate() or this.setState(..).
     * @param {string}   uniqueID - A unique identifier for the registered callback, to be used for removal or overwrites.
     * @returns {function}   A function which may be called to unregister the callback, in lieu of ChartDataController.unregisterUpdateCallback.
     */
    registerUpdateCallback : function(callback, uniqueID = 'global', overwrite=false){
        if (typeof callback !== 'function') throw Error("callback must be a function.");
        if (typeof uniqueID !== 'string') throw Error("uniqueID must be a string.");
        if (!overwrite && typeof providerCallbacks[uniqueID] !== 'undefined') throw new Error(uniqueID + " already set.");
        providerCallbacks[uniqueID] = callback;
        return function(){
            return ChartDataController.unregisterUpdateCallback(uniqueID);
        };
    },

    /**
     * The opposite of registerUpdateCallback.
     * 
     * @public
     * @static
     * @param {string} uniqueID - ID given alongside initially-registered callback.
     * @returns {void}
     */
    unregisterUpdateCallback : function(uniqueID){
        if (typeof uniqueID !== 'string') throw Error("uniqueID must be a string.");
        delete providerCallbacks[uniqueID];
    },

    /**
     * Same as registerUpdateCallback but for when starting AJAX fetch of data.
     *
     * @public
     * @static
     * @param {function} callback - Function to be called upon starting AJAX load.
     * @param {string} uniqueID - @see ChartDataController.registerUpdateCallback().
     * @returns {function} Function for unregistering callback which may be used in lieu of @see ChartDataController.unregisterUpdateCallback().
     */
    registerLoadStartCallback : function(callback, uniqueID = 'global'){
        if (typeof callback !== 'function') throw Error("callback must be a function.");
        if (typeof uniqueID !== 'string') throw Error("uniqueID must be a string.");
        providerLoadStartCallbacks[uniqueID] = callback;
        return function(){
            return ChartDataController.unregisterUpdateCallback(uniqueID);
        };
    },

    /**
     * The opposite of registerLoadStartCallback.
     * 
     * @public
     * @static
     * @param {string} uniqueID - ID given alongside initially-registered callback.
     * @returns {undefined}
     */
    unregisterLoadStartCallback : function(uniqueID){
        if (typeof uniqueID !== 'string') throw Error("uniqueID must be a string.");
        delete providerLoadStartCallbacks[uniqueID];
    },

    /** 
     * Get current state. Similar to Redux's store.getState().
     * 
     * @public
     * @static
     * @returns {Object}
     */
    getState : function(){ return state; },

    /**
     * Analogous to a component's setState. Updates the private state of
     * ChartDataController and notifies update callbacks if experiments or filtered
     * experiments have changed.
     * 
     * @static
     * @param {Object} updatedState - New or updated state object to save.
     * @param {function} [callback] - Optional callback function.
     * @returns {*} Result of callback, or undefined.
     */
    setState : function(updatedState = {}, callback = null, opts = {}){

        var allChanged = ChartDataController.checkIfExperimentArraysDiffer(updatedState.experiment_sets, state.experiment_sets);
        var allOrFilteredChanged = allChanged || ChartDataController.checkIfExperimentArraysDiffer(updatedState.filtered_experiment_sets, state.filtered_experiment_sets);

        _.extend(state, updatedState);

        if (allOrFilteredChanged){
            ChartDataController.updateStats();
            notifyUpdateCallbacks();
        }

        if (allChanged && isInitialLoadComplete && opts.fromInterval){
            // Update browse page results or w/e.
            reFetchContext();
        }

        if (typeof callback === 'function' && callback !== notifyUpdateCallbacks){
            return callback(state);
        }
    },

    /**
     * Fetch new data from back-end regardless of expSetFilters state, e.g. for when session has changed (@see App.prototype.componentDidUpdate()).
     * 
     * @public
     * @static
     * @param {function} [callback] - Function to be called after sync complete.
     * @returns {void} Nothing
     */
    sync : function(callback, syncOpts = {}){
        if (!isInitialized) throw Error("Not initialized.");
        lastTimeSyncCalled = Date.now();
        if (!syncOpts.fromSync) syncOpts.fromSync = true;
        ChartDataController.fetchUnfilteredAndFilteredExperimentSets(null, callback, syncOpts);
    },

    /**
     * Internally used to either fetch new filtered experiments or clear them, according to state of expSetFilters from Redux store.
     * Called by listener to Redux store.
     * 
     * @static
     * @memberof module:viz/chart-data-controller
     * @param {Object} expSetFilters - (Newly-updated) Experiment Set Filters in Redux store.
     * @param {function} callback - Callback function to call after updating state.
     * @returns {void} Nothing
     */
    handleUpdatedFilters : function(expSetFilters, callback, opts){
        if (_.keys(expSetFilters).length === 0 && Array.isArray(state.experiment_sets) && (!opts || !opts.searchQuery)){
            ChartDataController.setState({ filtered_experiment_sets : null }, callback);
        } else {
            ChartDataController.fetchAndSetFilteredExperimentSets(callback, opts);
        }
    },

    checkIfExperimentArraysDiffer : function(exps1, exps2){
        if (exps1 === null && exps2 === null) return false;
        if (!Array.isArray(exps1) && !Array.isArray(exps2)) return false;
        if (
            (Array.isArray(exps1) && !Array.isArray(exps2)) ||
            (!Array.isArray(exps1) && Array.isArray(exps2))
        ) {
            return true;
        }
        var lenExps1 = exps1.length;
        if (lenExps1!== exps2.length) return true;


        for (var i = 0; i < lenExps1; i++){

            if ( exps1[i].accession !== exps2[i].accession ){
                return true;
            }
            /*
            if (!_.isEqual(exps1[i], exps2[i])){
                return true;
            }
            */
            
        }

        return false;
    },

    /**
     * Called internally by setState to update stats in top left corner of page, if updateState param was passed in during initialization.
     * 
     * @static
     * @ignore
     * @returns {void} Nothing
     */
    updateStats : function(){
        if (typeof refs.updateStats !== 'function'){
            throw Error("Not initialized with updateStats callback.");
        }

        var current, total;

        function getCountsFromExps(exps){
            var expSets = _.reduce(exps, function(m,exp){
                if (exp.experiment_sets) return new Set([...m, ..._.pluck(exp.experiment_sets, 'accession')]);
                return m;
            }, new Set());
            return {
                'experiment_sets' : expSets.size,
                'experiments' : exps.length,
                'files' : expFxn.fileCountFromExperiments(exps)
            };
        }

        function getCountsFromExpSets(expSets){
            return {
                'experiment_sets' : expSets.length,
                'experiments' : _.reduce(expSets, function(m,v){ return m + (v.experiments_in_set || []).length; }, 0),
                'files' : _.reduce(expSets, function(m,v){ return (expFxn.allFilesFromExperimentSet(v, true) || []).length + m; }, 0)
            };
        }

        function genNullCounts(){
            return {
                'experiment_sets' : null,
                'experiments' : null,
                'files' : null
            };
        }

        if (state.filtered_experiment_sets !== null){
            current = getCountsFromExpSets(state.filtered_experiment_sets);
        } else {
            current = genNullCounts();
        }

        if (state.experiment_sets !== null){
            total = getCountsFromExpSets(state.experiment_sets);
        } else {
            total = genNullCounts();
        }

        refs.updateStats(current, total);
    },


    /**
     * Used internally to fetch both all & filtered experiments then calls ChartDataController.setState({ experiments, filteredExperiments }, callback).
     * Called by ChartDataController.sync() internally.
     * 
     * @private
     * @static
     * @param {Object} [reduxStoreState] - Current Redux store state to get expSetFilters and current href from. If not provided, gets it from store.getState().
     * @param {function} [callback] - Optional callback function to call after setting updated state.
     * @returns {void} Nothing
     */
    fetchUnfilteredAndFilteredExperimentSets : function(reduxStoreState = null, callback = null, opts = {}){
        if (!reduxStoreState || !reduxStoreState.expSetFilters || !reduxStoreState.href){
            reduxStoreState = refs.store.getState();
        }

        // Set refs.expSetFilters if is null (e.g. if called from initialize() and not triggered Redux store filter change).
        if (refs.expSetFilters === null){
            refs.expSetFilters = reduxStoreState.expSetFilters;
        }

        var filtersSet = (_.keys(reduxStoreState.expSetFilters).length > 0) || (opts.searchQuery || Filters.searchQueryStringFromHref(reduxStoreState.href));
        var experiment_sets = null,
            filtered_experiment_sets = null;

        var cb = _.after(filtersSet ? 2 : 1, function(){
            ChartDataController.setState({
                'experiment_sets' : experiment_sets,
                'filtered_experiment_sets' : filtered_experiment_sets
            }, callback, opts);

        });

        var allExpsHref = refs.requestURLBase + ChartDataController.getFieldsRequiredURLQueryPart();
        var filteredExpsHref = ChartDataController.getFilteredContextHref(
            reduxStoreState.expSetFilters, reduxStoreState.href, opts
        ) + '&limit=all' + ChartDataController.getFieldsRequiredURLQueryPart();

        notifyLoadStartCallbacks();

        ajax.load(
            allExpsHref,
            function(allExpsContext){
                experiment_sets = allExpsContext['@graph'];
                cb();
            }, 'GET', function(errResp){
                opts.error = true;

                // If received a 403 or a 404 (no expsets returned) we're likely logged out, so reload current href / context
                // Reload/navigation will also receive 403 and then trigger JWT unset, logged out alert, & refresh.
                if (errResp && typeof errResp === 'object'){
                    if (typeof errResp.total === 'number' && errResp.total > 0){
                        experiment_sets = errResp['@graph'];
                    }
                    //if (errResp.code === 403 || errResp.total === 0){
                    //    console.warn('403 or 404 Error, refetching.');
                    //    reFetchContext();
                    //}
                }
                reFetchContext();
                cb();
            }
        );

        if (filtersSet){
            ajax.load(
                filteredExpsHref,
                function(filteredContext){
                    filtered_experiment_sets = filteredContext['@graph'];
                    cb();
                }, 'GET', function(){
                    cb();
                }
            );
        }

    },

    /**
     * Like ChartDataController.fetchUnfilteredAndFilteredExperimentSets(), but only to get all experiments.
     * Not actually used, but could be, for something.
     * 
     * @memberof module:viz/chart-data-controller
     * @private
     * @static
     * @param {function} [callback] - Optional callback function.
     * @returns {void} Nothing
     */
    fetchAndSetUnfilteredExperimentSets : function(callback = null, opts = {}){
        notifyLoadStartCallbacks();
        ajax.load(
            refs.requestURLBase + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(allExpsContext){
                ChartDataController.setState({
                    'experiment_sets' : allExpsContext['@graph']
                }, callback, opts);
            }
        );
    },

    /**
     * Like ChartDataController.fetchUnfilteredAndFilteredExperimentSets(), but only to get filtered/selected experiments according to expSetFilters from Redux store.
     * 
     * @memberof module:viz/chart-data-controller
     * @private
     * @static
     * @param {function} [callback] - Optional callback function.
     * @returns {void} Nothing
     */
    fetchAndSetFilteredExperimentSets : function(callback = null, opts = {}){
        notifyLoadStartCallbacks();
        ajax.load(
            ChartDataController.getFilteredContextHref(null, null, opts) + '&limit=all' + ChartDataController.getFieldsRequiredURLQueryPart(),
            function(filteredContext){
                ChartDataController.setState({
                    'filtered_experiment_sets' : filteredContext['@graph']
                }, callback, opts);
            },
            'GET',
            function(){
                // Fallback (no results or lost connection)
                ChartDataController.setState({
                    'filtered_experiment_sets' : null
                }, callback, opts);
                if (typeof callback === 'function') callback();
            }
        );
    },

    /**
     * Internally used to help form query part of URL.
     * Adds 'field=<field.name.1>&...<field.name.n>' for each field required for chart(s).
     * 
     * @static
     * @param {string[]} [fields] - Fields to fetch from back-end search result(s).
     * @returns {string} Part of URL query.
     */
    getFieldsRequiredURLQueryPart : function(fields = refs.fieldsToFetch){
        return fields.map(function(fieldToIncludeInResult){
            return '&field=' + fieldToIncludeInResult;
        }).join('');
    },

    /**
     * Internally used to generate a URL from current href and expSetFilters from Redux store to fetch filtered/selected experiments from back-end.
     * If no 'search'-compatible href is set in Redux store, '/browse/' is used.
     * 
     * @static
     * @param {Object} [expSetFilters] - Current Experiment Set Filters in Redux store.
     * @param {string} [href] - Current href from Redux store.
     * @returns {string} URL for fetching filtered experiments/sets from back-end.
     */
    getFilteredContextHref : function(expSetFilters, href, opts){
        if (!expSetFilters || !href){
            var storeState = refs.store.getState();
            if (!expSetFilters) expSetFilters = storeState.expSetFilters;
            if (!href)          href = storeState.href;
        }
        // TODO: MAYBE REMOVE SEARCHQUERY WHEN SWITCH SEARCH FROM /BROWSE/
        var searchQuery = opts.searchQuery || Filters.searchQueryStringFromHref(href);
        return Filters.filtersToHref(expSetFilters, href, 0, 'experiments_in_set.accession', false, '/browse/') + (searchQuery ? '&q=' + searchQuery : '');
    },

    getRefs : function(){
        return refs;
    }

};

if (!isServerSide()){
    window.ChartDataController = ChartDataController;
}
