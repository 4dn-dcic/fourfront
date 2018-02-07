'use strict';

/** @ignore */
var React = require('react');
import PropTypes from 'prop-types';
var _ = require('underscore');
import queryString from 'querystring';
var { expFxn, Filters, Schemas, ajax, console, layout, isServerSide, navigate, object } = require('./../util');
import ChartDetailCursor from './ChartDetailCursor';
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
    contextFilters : {},
    baseSearchPath : null,
    baseSearchParams : {},
    updateStats : null, // Function to update stats @ top of page.
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
    experiment_sets         : null,
    filtered_experiment_sets : null,
    fetching                : false,

    barplot_data_filtered   : null,
    barplot_data_unfiltered : null,
    barplot_data_fields     : null,
    isLoadingNewFields      : false,

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
        if (typeof props.id === 'string') this.id = props.id;
        else this.id = object.randomId();
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
        childChartProps.expSetFilters = Filters.contextFiltersToExpSetFilters();
        childChartProps.barplot_data_filtered = state.barplot_data_filtered;
        childChartProps.barplot_data_unfiltered = state.barplot_data_unfiltered;
        childChartProps.updateBarPlotFields = ChartDataController.updateBarPlotFields;
        childChartProps.barplot_data_fields = state.barplot_data_fields;
        childChartProps.isLoadingNewFields = state.isLoadingNewFields;
        childChartProps.providerId = this.id;

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
        //requestURLBase = null,
        baseSearchPath = '/bar_plot_aggregations/',
        baseSearchParams = {},
        fields = null,
        updateStats = null,
        callback = null,
        resync = false
    ){
        if (!refs.store) refs.store = require('./../../store');

        var initStoreState = refs.store.getState();
        refs.href = initStoreState.href;
        refs.contextFilters = (initStoreState.context && initStoreState.context.filters) || null;
        if (typeof baseSearchPath === 'string'){
            refs.baseSearchPath = baseSearchPath;
        }
        if (typeof baseSearchParams === 'object' && baseSearchParams){
            refs.baseSearchParams = baseSearchParams;
        }
        if (Array.isArray(fields) && fields.length > 0){
            state.barplot_data_fields = fields;
        }
        if (typeof updateStats === 'function'){
            refs.updateStats = updateStats;
        }

        if (reduxSubscription !== null) {
            reduxSubscription(); // Unsubscribe current listener.
        }

        // Subscribe to Redux store updates to listen for changed expSetFilters.
        reduxSubscription = refs.store.subscribe(function(){
            var prevHref = refs.href;
            var reduxStoreState = refs.store.getState();
            refs.href = reduxStoreState.href;
            if (refs.href === prevHref) return; // Exit.

            // Hide any pop-overs still persisting with old filters or URL.
            setTimeout(function(){
                ChartDetailCursor.reset(true);
            }, 750);

            var prevContextFilters = refs.contextFilters;
            var prevExpSetFilters = Filters.contextFiltersToExpSetFilters(prevContextFilters);

            refs.href = reduxStoreState.href;
            refs.contextFilters = (reduxStoreState.context && reduxStoreState.context.filters) || {}; // Use empty obj instead of null so Filters.contextFiltersToExpSetFilters doesn't grab current ones.

            var nextExpSetFilters = Filters.contextFiltersToExpSetFilters(refs.contextFilters);

            // TODO: MAYBE REMOVE SEARCHQUERY WHEN SWITCH SEARCH FROM /BROWSE/

            var didFiltersChange = !Filters.compareExpSetFilters(nextExpSetFilters, prevExpSetFilters) || (prevHref && Filters.searchQueryStringFromHref(prevHref) !== Filters.searchQueryStringFromHref(refs.href));
            if (didFiltersChange) {
                ChartDataController.handleUpdatedFilters(nextExpSetFilters, notifyUpdateCallbacks, { 'searchQuery' : Filters.searchQueryStringFromHref(refs.href) });
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

    updateBarPlotFields : function(fields, callback = null){
        if (Array.isArray(fields) && Array.isArray(state.barplot_data_fields)){
            if (fields.length === state.barplot_data_fields.length){
                
                if (_.every(fields, function(f,i){
                    return (f === state.barplot_data_fields[i]);
                })) return;
            }
        }
        //state.barplot_data_fields = fields;
        ChartDataController.setState({ 'barplot_data_fields' : fields, 'isLoadingNewFields' : true }, callback);
        ChartDataController.sync(function(){
            ChartDetailCursor.reset(true);
            //if (typeof callback === 'function') callback();
        });
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

        //var allChanged = ChartDataController.checkIfExperimentArraysDiffer(updatedState.experiment_sets, state.experiment_sets);
        //var allOrFilteredChanged = allChanged || ChartDataController.checkIfExperimentArraysDiffer(updatedState.filtered_experiment_sets, state.filtered_experiment_sets);

        var allCountsChanged = (
            updatedState && updatedState.barplot_data_unfiltered && updatedState.barplot_data_unfiltered.total && (
                !state.barplot_data_unfiltered || !state.barplot_data_unfiltered.total || !state.barplot_data_unfiltered.total.experiment_sets ||
                updatedState.barplot_data_unfiltered.total.experiment_sets !== state.barplot_data_unfiltered.total.experiment_sets ||
                updatedState.barplot_data_unfiltered.total.experiments !== state.barplot_data_unfiltered.total.experiments ||
                updatedState.barplot_data_unfiltered.total.files !== state.barplot_data_unfiltered.total.files
            )
        );

        _.extend(state, updatedState);

        ChartDataController.updateStats();
        notifyUpdateCallbacks();

        if (allCountsChanged && isInitialLoadComplete && opts.fromInterval){
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
    sync : function(callback = null, syncOpts = {}){
        if (!isInitialized) throw Error("Not initialized.");
        lastTimeSyncCalled = Date.now();
        if (!syncOpts.fromSync) syncOpts.fromSync = true;
        ChartDataController.fetchUnfilteredAndFilteredBarPlotData(null, callback, syncOpts);
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

        // Reset or re-fetch 'filtered-in' data.
        if (_.keys(expSetFilters).length === 0 && state.barplot_data_unfiltered && (!opts || !opts.searchQuery)){
            ChartDataController.setState({ 'barplot_data_filtered' : null }, callback);
        } else {
            ChartDataController.fetchAndSetFilteredBarPlotData(callback, opts);
        }
    },

    /**
     * Called internally by setState to update stats in top left corner of page, if updateState param was passed in during initialization.
     * 
     * TODO: Get rid of this, instead, have this be done in QuickInfoBar itself and wrap QuickInfoBar in a ChartDataController.Provider.
     * 
     * @static
     * @ignore
     * @returns {void} Nothing
     */
    updateStats : function(){
        if (typeof refs.updateStats !== 'function'){
            throw Error("Not initialized with updateStats callback.");
        }

        var current = (state.barplot_data_filtered && state.barplot_data_filtered.total) || { 'experiment_sets' : null, 'experiments' : null, 'files' : null },
            total = (state.barplot_data_unfiltered && state.barplot_data_unfiltered.total) || null;

        refs.updateStats(current, total);
    },




    /**
     * Called by ChartDataController.sync() internally.
     */
    fetchUnfilteredAndFilteredBarPlotData : function(reduxStoreState = null, callback = null, opts = {}){
        if (!reduxStoreState || !reduxStoreState.href){
            reduxStoreState = refs.store.getState();
        }

        var currentExpSetFilters = Filters.contextFiltersToExpSetFilters((reduxStoreState.context && reduxStoreState.context.filters) || null);

        var filtersSet = (_.keys(currentExpSetFilters).length > 0) || (opts.searchQuery || Filters.searchQueryStringFromHref(reduxStoreState.href));
        
        var barplot_data_filtered = null,
            barplot_data_unfiltered = null;

        var cb = _.after(filtersSet ? 2 : 1, function(){
            ChartDataController.setState({
                'barplot_data_filtered' : barplot_data_filtered,
                'barplot_data_unfiltered' : barplot_data_unfiltered,
                'isLoadingNewFields' : false
            }, callback, opts);

        });

        var fieldsQuery = '?' + _.map(state.barplot_data_fields, function(f){ return 'field=' + f; }).join('&');
        var unfilteredHref = refs.baseSearchPath + queryString.stringify(refs.baseSearchParams) + '/' + fieldsQuery; //ChartDataController.getFieldsRequiredURLQueryPart();
        var filteredHref = refs.baseSearchPath + queryString.stringify(refs.baseSearchParams) + '&' + Filters.expSetFiltersToURLQuery(currentExpSetFilters) + '/' + fieldsQuery;

        notifyLoadStartCallbacks();

        ajax.load(
            unfilteredHref,
            function(unfiltered_result){
                barplot_data_unfiltered = unfiltered_result;
                cb();
            }, 'GET', function(errResp){
                opts.error = true;

                // If received a 403 or a 404 (no expsets returned) we're likely logged out, so reload current href / context
                // Reload/navigation will also receive 403 and then trigger JWT unset, logged out alert, & refresh.
                if (errResp && typeof errResp === 'object'){
                    if (typeof errResp.total === 'object' && errResp.total){
                        barplot_data_unfiltered = errResp;
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
                filteredHref,
                function(filtered_result){
                    barplot_data_filtered = filtered_result;
                    cb();
                }, 'GET', function(){
                    cb();
                }
            );
        }

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
    fetchAndSetFilteredBarPlotData : function(callback = null, opts = {}){

        var reduxStoreState = refs.store.getState();

        var fieldsQuery = '?' + _.map(state.barplot_data_fields, function(f){ return 'field=' + f; }).join('&');
        var currentExpSetFilters = Filters.contextFiltersToExpSetFilters((reduxStoreState.context && reduxStoreState.context.filters) || null);
        
        notifyLoadStartCallbacks();
        ajax.load(
            refs.baseSearchPath + queryString.stringify(refs.baseSearchParams) + '&' + '&' + Filters.expSetFiltersToURLQuery(currentExpSetFilters) + '/' + fieldsQuery,
            function(filteredContext){
                ChartDataController.setState({
                    'barplot_data_filtered' : filteredContext,
                    'isLoadingNewFields' : false
                }, callback, opts);
            },
            'GET',
            function(){
                // Fallback (no results or lost connection)
                ChartDataController.setState({
                    'barplot_data_filtered' : null,
                    'isLoadingNewFields' : false
                }, callback, opts);
                if (typeof callback === 'function') callback();
            }
        );
    },



    getRefs : function(){
        return refs;
    }

};

if (!isServerSide()){
    window.ChartDataController = ChartDataController;
}
