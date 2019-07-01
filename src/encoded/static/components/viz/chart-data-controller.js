'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ajax, console, isServerSide, object, searchFilters } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { navigate } from './../util';


/**
 * This is a utility to manage charts' experiment data in one global place and distribute to charts throughout UI.
 * The mechanism for this is roughly diagrammed here:
 *
 * .. image:: https://files.slack.com/files-pri/T0723UERE-F4C8KQKMM/chartdatacontroller.png
 *
 * @module {Object} viz/chart-data-controller
 */


/**
 * These are cached values or references.
 * Some are used to check against reduxStoreState in the subscription-checking-function to detect if it has changed.
 *
 * @private
 * @ignore
 */
var refs = {
    store       : null,
    href        : null, // Cached from redux store updates // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
    contextFilters : [],
    baseSearchPath : '/bar_plot_aggregations',
    browseBaseState : null
};

/**
 * Contains "state" of ChartDataController. Some of these are deprecated and will be removed.
 * The most important ones are experiment_sets and filtered_experiment_sets.
 *
 * @todo Better property definitions here
 * @private
 * @type {Object}
 * @property {{ field: string, terms: Object }} barplot_data_filtered       Object for root/first-level field with bucketed term counts, recursed with children as set in 'barplot_data_fields'.
 * @property {{ field: string, terms: Object }} barplot_data_unfiltered     Same as `barplot_data_filtered` but without concern for any expSetFilters aside from those in `browseBaseParams`.
 * @property {string[]} barplot_data_fields                                 List of fields on which aggregations/bucketing is done for generating `barplot_data_filtered` & `barplot_data_unfiltered`.
 * @property {booolean} isLoadingChartData                                  Whether we are currently loading.
 */
var state = {
    'barplot_data_filtered'   : null,
    'barplot_data_unfiltered' : null,
    'barplot_data_fields'     : null,
    'isLoadingChartData'      : false
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
 * @private
 * @ignore
 */
var currentRequests = { filtered: null, unfiltered: null };

/**
 * After load & update, called to start any registered 'on update' callbacks.
 *
 * @ignore
 */
function notifyUpdateCallbacks(){
    console.log('Notifying update callbacks',_.keys(providerCallbacks));
    _.forEach(providerCallbacks, function(pcb){
        pcb(state);
    });
}

/**
 * Before load, called to start any registered 'on load start' callbacks.
 *
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
 *
 * @private
 * @type {null|function}
 */
var reduxSubscription = null;

/**
 * Flag for whether controller has been initialized.
 * Is set when ChartDataController.initialize() is called.
 *
 * @todo Perhaps move initialize() call from facetcharts.js to app.js.
 * @private
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
 * Use this React component to wrap individual charts and provide them with source of experiments data via
 * their props.filtered_bar_data and props.unfiltered_bar_data. Also provides props.expSetFilters from redux store.
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
    componentDidMount(){
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
     * Adds various properties from state, plus callback to update 'barplot_data_fields', to children.
     *
     * @returns {JSX.Element} Cloned & adjusted props.children.
     * @memberof module:viz/chart-data-controller.Provider
     * @private
     * @instance
     */
    render(){
        var childChartProps = _.extend({}, this.props.children.props,
            _.pick(state, 'barplot_data_filtered', 'barplot_data_unfiltered', 'barplot_data_fields', 'isLoadingChartData'),
            {
                'updateBarPlotFields'   : ChartDataController.updateBarPlotFields,
                'providerId'            : this.id
            }
        );

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
     * @todo Perhaps move initialize() call from facetcharts.js to app.js.
     * @todo Make 'fields' the first param and make it non-optional.
     * @public
     * @param {?string} [browseBaseState=null]  Current browse base state when initializing.
     * @param {?string[]} [fields=null]         Initial fields to aggregate on.
     * @param {?function} [callback]            Optional callback for after initializing.
     * @returns {void} Undefined
     */
    initialize : function(browseBaseState = null, fields = null, callback = null){
        if (!refs.store) refs.store = require('./../../store').store;

        var initStoreState = refs.store.getState();
        refs.href = initStoreState.href;
        refs.contextFilters = (initStoreState.context && initStoreState.context.filters) || [];

        if (typeof browseBaseState === 'string'){
            refs.browseBaseState = browseBaseState;
        }
        if (Array.isArray(fields) && fields.length > 0){
            state.barplot_data_fields = fields;
        }

        if (reduxSubscription !== null) {
            reduxSubscription(); // Unsubscribe current listener.
        }

        // Subscribe to Redux store updates to listen for (changed href + context.filters) || browseBaseState.
        reduxSubscription = refs.store.subscribe(function(){
            const reduxStoreState     = refs.store.getState();
            const prevHref            = refs.href;
            const prevBrowseBaseState = refs.browseBaseState;
            const prevContextFilters  = refs.contextFilters || []; // If falsy, we get current ones instead of 'no filters'

            refs.href               = reduxStoreState.href;
            refs.browseBaseState    = reduxStoreState.browseBaseState;
            refs.contextFilters     = (reduxStoreState.context && reduxStoreState.context.filters) || {}; // Use empty obj instead of null so Filters.contextFiltersToExpSetFilters doesn't grab current ones.

            if (refs.href === prevHref && refs.browseBaseState === prevBrowseBaseState){
                // Nothing relevant has changed. Exit.
                return;
            }

            const prevSearchQuery = searchFilters.searchQueryStringFromHref(prevHref);
            const nextSearchQuery = searchFilters.searchQueryStringFromHref(refs.href);

            const prevBrowseBaseParams = navigate.getBrowseBaseParams(prevBrowseBaseState);
            const nextBrowseBaseParams = navigate.getBrowseBaseParams(refs.browseBaseState);

            // Step 1. Check if need to refetch both unfiltered & filtered data.
            if (refs.browseBaseState !== prevBrowseBaseState){
                ChartDataController.sync(null, { 'searchQuery' : nextSearchQuery });
                return;
            }

            // We treat expSetFilters as being empty if we're not on browse page --
            // if we are not on the browse page, no need to get chart info
            var isBrowseHrefPrev = prevHref.indexOf('/browse/') !== -1,
                isBrowseHrefNext = refs.href.indexOf('/browse/') !== -1,
                prevExpSetFilters = isBrowseHrefPrev ? searchFilters.contextFiltersToExpSetFilters(prevContextFilters,  prevBrowseBaseParams) : {},
                nextExpSetFilters = isBrowseHrefNext ? searchFilters.contextFiltersToExpSetFilters(refs.contextFilters, nextBrowseBaseParams) : {},
                didFiltersChange = (
                    !searchFilters.compareExpSetFilters(nextExpSetFilters, prevExpSetFilters) ||
                    (prevHref && (prevSearchQuery !== nextSearchQuery))
                );

            // Step 2. Check if need to refresh filtered data only.
            if (didFiltersChange) {
                ChartDataController.handleUpdatedFilters(nextExpSetFilters, notifyUpdateCallbacks, { 'searchQuery' : nextSearchQuery });
            }
        });

        isInitialized = true;

        ChartDataController.sync(function(){
            isInitialLoadComplete = true;
            callback(state);
        }, { isInitial : true });

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
     * Updates fields for which BarPlot aggregations are performed.
     */
    updateBarPlotFields : function(fields, callback = null){
        if (Array.isArray(fields) && Array.isArray(state.barplot_data_fields)){
            if (fields.length === state.barplot_data_fields.length){
                // Cancel if fields are same as before.
                if (_.every(fields, function(f,i){
                    return (f === state.barplot_data_fields[i]);
                })) return;
            }
        }
        ChartDataController.setState({ 'barplot_data_fields' : fields, 'isLoadingChartData' : true }, callback);
        ChartDataController.sync();
    },

    /**
     * Get current state. Similar to Redux's store.getState().
     *
     * @public
     * @static
     * @returns {Object}
     */
    getState : function(){ return state || {}; },

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

        var allCountsChanged = (
            updatedState && updatedState.barplot_data_unfiltered && updatedState.barplot_data_unfiltered.total && (
                !state.barplot_data_unfiltered || !state.barplot_data_unfiltered.total || !state.barplot_data_unfiltered.total.experiment_sets ||
                updatedState.barplot_data_unfiltered.total.experiment_sets !== state.barplot_data_unfiltered.total.experiment_sets ||
                updatedState.barplot_data_unfiltered.total.experiments !== state.barplot_data_unfiltered.total.experiments ||
                updatedState.barplot_data_unfiltered.total.files !== state.barplot_data_unfiltered.total.files
            )
        );

        _.extend(state, updatedState);

        notifyUpdateCallbacks();

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
        ChartDataController.setState({'isLoadingChartData' : true }, function(){
            ChartDataController.fetchUnfilteredAndFilteredBarPlotData(null, callback, syncOpts);
        });
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
        } else if (state.barplot_data_unfiltered) {
            ChartDataController.fetchAndSetFilteredBarPlotData(callback, opts);
        } else {
            ChartDataController.fetchUnfilteredAndFilteredBarPlotData(null, callback, opts);
        }
    },

    /**
     * Called by ChartDataController.sync() internally.
     */
    fetchUnfilteredAndFilteredBarPlotData : function(reduxStoreState = null, callback = null, opts = {}){
        if (!reduxStoreState || !reduxStoreState.href){
            reduxStoreState = refs.store.getState();
        }
        const currentBrowseBaseParams = navigate.getBrowseBaseParams(opts.browseBaseState || null);
        const currentExpSetFilters = searchFilters.contextFiltersToExpSetFilters(
            (reduxStoreState.context && reduxStoreState.context.filters) || null,
            currentBrowseBaseParams
        );

        var searchQuery = opts.searchQuery || searchFilters.searchQueryStringFromHref(reduxStoreState.href);
        var filtersSet = (_.keys(currentExpSetFilters).length > 0) || searchQuery;

        var barplot_data_filtered = null,
            barplot_data_unfiltered = null;

        var cb = _.after(filtersSet ? 2 : 1, function(){
            ChartDataController.setState({
                'barplot_data_filtered' : barplot_data_filtered,
                'barplot_data_unfiltered' : barplot_data_unfiltered,
                'isLoadingChartData' : false
            }, callback, opts);

        });

        var baseSearchParams = navigate.getBrowseBaseParams(opts.browseBaseState || null);

        notifyLoadStartCallbacks();

        if (currentRequests.unfiltered !== null){
            currentRequests.unfiltered.abort && currentRequests.unfiltered.abort();
        }
        currentRequests.unfiltered = ajax.load(
            refs.baseSearchPath,
            function(unfiltered_result){
                barplot_data_unfiltered = unfiltered_result;
                currentRequests.unfiltered = null;
                cb();
            }, 'POST', function(errResp){
                opts.error = true;
                if (errResp && typeof errResp === 'object'){
                    if (typeof errResp.total === 'object' && errResp.total){
                        barplot_data_unfiltered = errResp;
                    }
                }
                currentRequests.unfiltered = null;
                console.warn('Some error, refetching context.');
                reFetchContext();
                cb();
            }, JSON.stringify({
                "search_query_params" : baseSearchParams,
                "fields_to_aggregate_for" : state.barplot_data_fields
            })
        );

        if (currentRequests.filtered !== null){
            currentRequests.filtered.abort && currentRequests.filtered.abort();
            currentRequests.filtered = null;
        }
        if (filtersSet){
            var filteredSearchParams = navigate.mergeObjectsOfLists(
                { 'q' : searchQuery || null },
                baseSearchParams,
                searchFilters.expSetFiltersToJSON(currentExpSetFilters)
            );
            currentRequests.filtered = ajax.load(
                refs.baseSearchPath,
                function(filtered_result){
                    barplot_data_filtered = filtered_result;
                    currentRequests.filtered = null;
                    cb();
                }, 'POST', function(errResp){
                    currentRequests.filtered = null;
                    cb();
                }, JSON.stringify({
                    "search_query_params" : filteredSearchParams,
                    "fields_to_aggregate_for" : state.barplot_data_fields
                })
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

        var currentExpSetFilters = searchFilters.contextFiltersToExpSetFilters((reduxStoreState.context && reduxStoreState.context.filters) || null);
        var searchQuery = opts.searchQuery || searchFilters.searchQueryStringFromHref(reduxStoreState.href);

        var filteredSearchParams = navigate.mergeObjectsOfLists(
            { 'q' : searchQuery || null },
            navigate.getBrowseBaseParams(opts.browseBaseState || null),
            searchFilters.expSetFiltersToJSON(currentExpSetFilters)
        );

        if (currentRequests.filtered !== null){
            currentRequests.filtered.abort && currentRequests.filtered.abort();
        }
        notifyLoadStartCallbacks();
        currentRequests.filtered = ajax.load(
            refs.baseSearchPath,
            function(filteredContext){
                currentRequests.filtered = null;
                ChartDataController.setState({
                    'barplot_data_filtered' : filteredContext,
                    'isLoadingChartData' : false
                }, callback, opts);
            },
            'POST',
            function(){
                // Fallback (no results or lost connection)
                currentRequests.filtered = null;
                ChartDataController.setState({
                    'barplot_data_filtered' : null,
                    'isLoadingChartData' : false
                }, callback, opts);
            },
            JSON.stringify({
                "search_query_params" : filteredSearchParams,
                "fields_to_aggregate_for" : state.barplot_data_fields
            })
        );
    },



    getRefs : function(){
        return refs;
    }

};

if (!isServerSide()){
    window.ChartDataController = ChartDataController;
}
