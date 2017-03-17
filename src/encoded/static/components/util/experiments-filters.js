'use strict';

var _ = require('underscore');
var url = require('url');
var ajax = require('./ajax');
var Alerts = null; //require('./../alerts');
var store = null;
var object = require('./object');


var expFilters = module.exports = {

    // navigate should be set by app.js in App.getInitialState(), getSchemas is set in App.componentDidMount() -> App.loadSchemas()
    // the others (getPage,getLimit) are defaults but should be overwritten by some component, referencing its state.
    navigate : null,
    getSchemas : null,
    getPage  : function(){ return 1;  },
    getLimit : function(){ return 25; },


    Term : {

        toName : function(field, term){
            switch (field) {
                case 'experiments_in_set.biosample.biosource.individual.organism.name':
                    return term.charAt(0).toUpperCase() + term.slice(1);
                default:
                    return term;
            }
        },

    },

    Field : {

        nameMap : {
            'experiments_in_set.biosample.biosource.individual.organism.name' : 'Organism',
            'accession' : 'Experiment Set',
            'experiments_in_set.digestion_enzyme.name' : 'Enzyme',
            'experiments_in_set.biosample.biosource_summary' : 'Biosource',
        },

        toName : function(field, schemas, schemaOnly = false){
            if (!schemaOnly && expFilters.Field.nameMap[field]){
                return expFilters.Field.nameMap[field];
            } else {
                var schemaProperty = expFilters.Field.getSchemaProperty(field, schemas);
                if (schemaProperty && schemaProperty.title){
                    expFilters.Field.nameMap[field] = schemaProperty.title; // Cache in nameMap for faster lookups.
                    return schemaProperty.title;
                } else if (!schemaOnly) {
                    return field;
                } else {
                    return null;
                }
            }
        },

        getSchemaProperty : function(field, schemas = null, startAt = 'ExperimentSet'){
            if (!schemas) schemas = expFilters.getSchemas && expFilters.getSchemas();
            var baseSchemaProperties = (schemas && schemas[startAt] && schemas[startAt].properties) || null;
            if (!baseSchemaProperties) return null;

            var fieldParts = field.split('.');

            function getNextSchemaProperties(linkToName){

                function combineSchemaPropertiesFor(relatedLinkToNames){
                    return _.reduce(relatedLinkToNames, function(schemaProperties, schemaName){
                        if (schemas[schemaName]){
                            return _.extend(schemaProperties, schemas[schemaName].properties);
                        }
                        else return schemaProperties;
                    }, {});
                }

                if (linkToName === 'Experiment'){
                    return combineSchemaPropertiesFor(['Experiment', 'ExperimentRepliseq', 'ExperimentHiC', 'ExperimentCaptureC']);
                } else if (linkToName === 'Individual'){
                    return combineSchemaPropertiesFor(['Individual', 'IndividualHuman', 'ExperimentHiC', 'IndividualMouse']);
                } else {
                    return schemas[linkToName].properties;
                }
            }


            function getProperty(propertiesObj, fieldPartIndex){
                var property = propertiesObj[fieldParts[fieldPartIndex]];
                if (fieldPartIndex >= fieldParts.length - 1) return property;
                var nextSchemaProperties = null;

                if (property.type === 'array' && property.items && property.items.linkTo){
                    nextSchemaProperties = getNextSchemaProperties(property.items.linkTo);
                } else if (property.linkTo) {
                    nextSchemaProperties = getNextSchemaProperties(property.linkTo);
                }

                if (nextSchemaProperties) return getProperty(nextSchemaProperties, fieldPartIndex + 1);
            }

            return getProperty(baseSchemaProperties, 0);

        }

    },


    /**
     * Given a field/term, add or remove filter from expSetFilters (in redux store) within context of current state of filters.
     * 
     * @param {string}  field               Field, in object dot notation.
     * @param {string}  term                Term to add/remove from active filters.
     * @param {string}  [experimentsOrSets='experiments'] - Informs whether we're standardizing field to experiments_in_set or not. Defaults to 'experiments'.
     * @param {Object}  [expSetFilters]     The expSetFilters object that term is being added or removed from; if not provided it grabs state from redux store.
     * @param {function}[callback]          Callback function to call after updating redux store.
     * @param {boolean} [returnInsteadOfSave=false]  - Whether to return a new updated expSetFilters object representing would-be changed state INSTEAD of updating redux store. Useful for doing a batched update.
     * @param {boolean} [useAjax=true]      Whether to use AJAX to fetch and save new experiment(-sets) to (props.)context. If true, must also provide href argument.
     * @param {string}  [href]              Current or base href to use for AJAX request if using AJAX to update.
     */
    changeFilter: function(
        field,
        term,
        experimentsOrSets = 'experiments',
        expSetFilters = null,
        callback = null,
        returnInsteadOfSave = false,
        useAjax=true,
        href=null
    ){
        if (!expSetFilters){
            if (!store) store = require('./../../store');
            expSetFilters = store.getState().expSetFilters;
        }

        // store currently selected filters as a dict of sets
        var tempObj = {};
        var newObj = {};

        // standardize on field naming convention for expSetFilters before they hit the redux store.
        field = expFilters.standardizeFieldKey(field, experimentsOrSets);

        var expSet = expSetFilters[field] ? new Set(expSetFilters[field]) : new Set();
        if(expSet.has(term)){
            // term is already present, so delete it
            expSet.delete(term);
        }else{
            expSet.add(term);
        }
        if(expSet.size > 0){
            tempObj[field] = expSet;
            newObj = Object.assign({}, expSetFilters, tempObj);
        }else{ //remove key if set is empty
            newObj = Object.assign({}, expSetFilters);
            delete newObj[field];
        }

        if (returnInsteadOfSave){
            return newObj;
        } else {
            console.info("Saving new filters:", newObj, "Using AJAX:", useAjax);
            return expFilters.saveChangedFilters(newObj, useAjax, href, callback, expSetFilters);
        }
    },
    
    /**
     * Update expSetFilters in redux store and, if using AJAX, update context and href as well after fetching.
     * Before calling, make sure expSetFilters is a new or cloned object (not props.expSetFilters) for Redux to recognize that it has changed.
     * 
     * @param {Object}  expSetFilters   A new or cloned expSetFilters object to save. Can be empty (to clear all filters).
     * @param {boolean} [useAjax=true]  Whether to use AJAX and update context & href in Redux store as well.
     * @param {string}  [href]          Base URL to use for AJAX request, with protocol (i.e. http(s)), hostname (i.e. domain name), and path, at minimum. Required if using AJAX.
     * @param {function}[callback]      Callback function.
     */
    saveChangedFilters : function(expSetFilters, useAjax=true, href=null, callback = null, originalFilters = null){
        if (!store)   store = require('./../../store');
        if (!Alerts) Alerts = require('../alerts');
        if (!useAjax) {
            store.dispatch({
                type : {'expSetFilters' : expSetFilters}
            });
            if (typeof callback === 'function') setTimeout(callback, 0);
            return true;
        }

        // Else we fetch new experiment_sets (i.e. (props.)context['@graph'] ) via AJAX.
        if (typeof href !== 'string') throw new Error("No valid href (3rd arg) supplied to saveChangedFilters:", href);

        var originalReduxState = store.getState();

        var newHref = expFilters.filtersToHref(expSetFilters, href);

        var navigateFxn = (
            this.props && typeof this.props.navigate === 'function' ?   this.props.navigate : 
                typeof expFilters.navigate === 'function' ?     expFilters.navigate : null
        );

        store.dispatch({
            type: {
                'expSetFilters' : expSetFilters,
            }
        });

        if (navigateFxn){
            navigateFxn(newHref, { replace : true, skipConfirmCheck: true }, (result)=>{
                if (result && result.total === 0){
                    // No results, cancel out.
                    Alerts.queue(Alerts.NoFilterResults);
                    store.dispatch({ 
                        type : {
                            'expSetFilters' : originalReduxState.expSetFilters,
                            'context' : originalReduxState.context,
                            //'expSetFilters' : originalReduxState.expSetFilters
                        } 
                    });
                    navigateFxn(originalReduxState.href, { skipRequest : true });
                } else {
                    // Success. Remove any no result alerts.
                    Alerts.deQueue(Alerts.NoFilterResults);
                }
                if (typeof callback === 'function') setTimeout(callback, 0);
            }, (err) =>{
                // Fallback callback
                if (err && (err.status === 404 || err.total === 0)) Alerts.queue(Alerts.NoFilterResults);
                if (typeof callback === 'function') setTimeout(callback, 0);
            }/*, { 'expSetFilters' : expSetFilters }*/);
        } else {
            ajax.load(newHref, (newContext) => {
                Alerts.deQueue(Alerts.NoFilterResults);
                store.dispatch({
                    type: {
                        'context'       : newContext,
                        //'expSetFilters' : expSetFilters,
                        'href'          : newHref
                    }
                });
                if (typeof callback === 'function') setTimeout(callback, 0);
            }, 'GET', ()=>{
                // Fallback callback
                Alerts.queue(Alerts.NoFilterResults);
                if (typeof callback === 'function') setTimeout(callback, 0);
            });
        }

        

    },

    unsetAllTermsForField : function(field, expSetFilters, save = true, href = null){
        var esf = _.clone(expSetFilters);
        delete esf[field];
        if (save && href){
            return expFilters.saveChangedFilters(esf, true, href);
        } else {
            return esf;
        }
    },

    /**
     * Convert expSetFilters to a URL, given a current URL whose path is used to append arguments
     * to (e.g. http://hostname.com/browse/  or http://hostname.com/search/).
     * 
     * @param {Object}  expSetFilters    Filters as stored in Redux, keyed by facet field containing Set of term keys.
     * @param {string}  currentHref      String with at least current host & path which to use as base for resulting URL, e.g. http://localhost:8000/browse/[?type=ExperimentSetReplicate&experimentset_type=...].
     * @param {number}  [page=1]         Current page if using pagification.
     * @param {number|string} [limit]    Number of results to get par page; if not set, will get default from getLimit().
     * @param {string}  [hrefPath]       Override the /path/ in URL returned, e.g. to /browse/.
     * @returns {string} URL which can be used to request filtered results from back-end, e.g. http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&from=0&limit=50&field.name=term1&field2.something=term2[...]
     */
    filtersToHref : function(expSetFilters, currentHref, page = null, limit = null, hrefPath = null){
        var baseHref = expFilters.baseHref(currentHref, hrefPath);

        // Include a '?' or '&' if needed.
        var sep = ['?','&'].indexOf(baseHref.charAt(baseHref.length - 1)) > -1 ? // Is last character a '&' or '?' ?
            '' : (
                baseHref.match(/\?./) ? 
                '&' : '?'
            );

        var filterQuery = expFilters.expSetFiltersToURLQuery(expSetFilters);

        if (!page)   page = expFilters.getPage();
        if (!limit) limit = expFilters.getLimit();

        return (
            baseHref + 
            sep+'limit=' + limit + 
            '&from=' + (Math.max(page - 1, 0) * (typeof limit === 'number' ? limit : 0)) + 
            (filterQuery.length > 0 ? '&' + filterQuery : '')
        );
    },


    /** 
     * Parse href to return an expSetFilters object, the opposite of @see expFilters.filtersToHref. 
     * Used for server-side rendering to set initial selected filters in UI based on request URL.
     * 
     * @param {string}   href              A URL or path containing query at end in form of ?...&field.name=term1&field2.name=term2[...]
     * @param {Object[]} [contextFilters]  Collection of objects from (props.)context.filters or context.facets which have a 'field' property to cross-ref and check if URL query args are facets.
     * @param {string}   [contextFilters.field]
    */
    hrefToFilters : function(href, contextFilters = null){
        return _(url.parse(href, true).query).chain()
            .pairs() // Object to [key, val] pairs.
            .filter(function(queryPair){ // Get only facet fields query args.
                if (['type', 'experimentset_type'].indexOf(queryPair[0]) > -1) return false; // Exclude these for now.
                if (contextFilters && _.findWhere(contextFilters,  {'field' : queryPair[0]})) return true; // See if in context.filters, if is available.

                // These happen to all start w/ 'experiments_in_set.' currently.
                if (queryPair[0].indexOf('experiments_in_set.') > -1) return true;
                return false;
            })
            .map(function(queryPair){ // Convert term(s) to Sets
                if (Array.isArray(queryPair[1])) return [  queryPair[0], new Set(queryPair[1])  ];
                else return [  queryPair[0], new Set([queryPair[1]])  ];
            })
            .object() // Pairs back to object. We have expSetFilters now.
            .value();

    },


    /** Convert expSetFilters, e.g. as stored in Redux, into a partial URL query: field.name=term1&field2.something=term2[&field3...] */
    expSetFiltersToURLQuery : function(expSetFilters = null){
        if (!expSetFilters){
            if (!store) store = require('./../../store');
            expSetFilters = store.getState().expSetFilters;
        }
        return _.pairs(expSetFilters).map(function(filterPair){
            var field = filterPair[0];
            var terms = [...filterPair[1]]; // Set to Array
            return terms.map(function(t){
                return field + '=' + encodeURIComponent(t).replace(/%20/g, '+');
            }).join('&');
        }).join('&');
    },

    filtersToNodes : function(expSetFilters = {}, orderedFieldNames = null, flatten = false){
        // Convert orderedFieldNames into object/hash for faster lookups.
        var sortObj = null;
        if (Array.isArray(orderedFieldNames)) sortObj = _.invert(_.object(_.pairs(orderedFieldNames)));
        return _(expSetFilters).chain()
            .pairs() // fieldPair[0] = field, fieldPair[1] = Set of terms
            .sortBy(function(fieldPair){
                if (sortObj && typeof sortObj[fieldPair[0]] !== 'undefined') return parseInt(sortObj[fieldPair[0]]);
                else return fieldPair[0];
            })
            .reduce(function(m, fieldPair){
                var termNodes = [...fieldPair[1]].map(function(term){
                    return {
                        'data' : {
                            'term' : term,
                            'name' : expFilters.Term.toName(fieldPair[0], term),
                            'field' : fieldPair[0]
                        }
                    };
                });
                if (flatten){
                    // [field1:term1, field1:term2, field1:term3, field2:term1]
                    termNodes.push('spacer');
                    return m.concat(termNodes);
                } else {
                    // [[field1:term1, field1:term2, field1:term3],[field2:term1, field2:term2], ...]
                    m.push(termNodes);
                    return m;
                }
            }, [])
            .value();
    },

    /**
     * JSON.stringify() cannot store Set objects, which are used in expSetFilters, so we must convert
     * the Sets to/from Arrays upon needing to use JSON.stringify() and after returning from JSON.parse(), 
     * such as when saving or grabbing the expSetFilter to/from the <script data-prop-name="expSetFilters"...>...</script>
     * element which is used to pass the filters from server-side render to client-side React initiatilization.
     * 
     * @param {Object} expSetFilters  Object keyed by field name/key containing term key strings in form of Set or Array, which need to be converted to Set or Array.
     * @param {string} [to='array']   One of 'array' or 'set' for what to convert expSetFilter's terms to.
     */
    convertExpSetFiltersTerms : function(expSetFilters, to = 'array'){
        return _(expSetFilters).chain()
            .pairs()
            .map(function(pair){
                if (to === 'array'){
                    return [pair[0], [...pair[1]]];
                } else if (to === 'set'){
                    return [pair[0], new Set(pair[1])];
                }
            })
            .object()
            .value();
    },

    /** Return URL without any queries or hash, ending at pathname. Add hardcoded stuff for /browse/ or /search/ endpoints. */
    baseHref : function(currentHref = '/browse/', hrefPath = null){
        var urlParts = url.parse(currentHref, true);
        if (!hrefPath){
            hrefPath = urlParts.pathname;
        }
        var baseHref = urlParts.protocol + '//' + urlParts.host + hrefPath;
        var baseQuery = [];
        if (urlParts.pathname.indexOf('/browse/') > -1){
            if (typeof urlParts.query.type !== 'string') baseQuery.push(['type','ExperimentSetReplicate']);
            else baseQuery.push(['type', urlParts.query.type]);
            if (typeof urlParts.query.experimentset_type !== 'string') baseQuery.push(['experimentset_type','replicate']);
            else baseQuery.push(['experimentset_type', urlParts.query.experimentset_type]);
        } else if (urlParts.pathname.indexOf('/search/') > -1){
            if (typeof urlParts.query.type !== 'string') baseQuery.push(['type','Item']);
            else baseQuery.push(['type', urlParts.query.type]);
        }

        return baseHref + (baseQuery.length > 0 ? '?' + baseQuery.map(function(queryPair){ return queryPair[0] + '=' + queryPair[1]; }).join('&') : '');
    },

    /** 
     * Filter experiments or sets (graph arg) by filters, adjusting for adding/removing field or term (if defined) or ignored filters.
     *
     * @param {Object[]} graph      Array of experiment_sets or experiments as obtained from (props.)context['@graph'].
     * @param {Object}   filters    expSetFilters in form as obtained from Redux store, e.g. { experiments_in_set...organism.name : Set(['human','mouse']), ... }
     * @param {Object}   [ignored]
     * @param {string}   [field]
     * @param {string}   [term]
     */
    siftExperimentsClientSide : function(graph, filters, ignored=null, field=null, term=null) {
        var passExperiments = new Set();
        // Start by adding all applicable experiments to set
        for(var i=0; i < graph.length; i++){
            if(graph[i].experiments_in_set){
                for(var j=0; j < graph[i].experiments_in_set.length; j++){
                    passExperiments.add(graph[i].experiments_in_set[j]);
                }
            } else {
                passExperiments.add(graph[i]);
            }
        }
        // search through currently selected expt filters
        var filterKeys = Object.keys(filters);
        if (field && !_.contains(filterKeys, field)){
            filterKeys.push(field);
        }
        for(let experiment of passExperiments){
            var eliminated = false;
            for(var k=0; k < filterKeys.length; k++){
                var refinedFilterSet = null;
                if (ignored && typeof ignored === 'object' && ignored[filterKeys[k]] && ignored[filterKeys[k]].size > 0){
                    // remove the ignored filters by using the difference between sets
                    refinedFilterSet = new Set([...filters[filterKeys[k]]].filter(x => !ignored[filterKeys[k]].has(x)));
                }
                if (refinedFilterSet === null) refinedFilterSet = filters[filterKeys[k]];
                if (eliminated){
                    break;
                }
                var valueProbe = experiment;
                var filterSplit = filterKeys[k].split('.');
                for(var l=0; l < filterSplit.length; l++){
                    if(filterSplit[l] === 'experiments_in_set'){
                        continue;
                    }
                    // for now, use first item in an array (for things such as biosamples)
                    if(Array.isArray(valueProbe)){
                        valueProbe = valueProbe[0];
                    }
                    if(valueProbe[filterSplit[l]]){
                        valueProbe = valueProbe[filterSplit[l]];
                        if(l === filterSplit.length-1){ // last level of filter
                            if(field && filterKeys[k] === field){
                                if(valueProbe !== term){
                                    eliminated = true;
                                    passExperiments.delete(experiment);
                                }
                            }else if(refinedFilterSet.size > 0 && !refinedFilterSet.has(valueProbe)){ // OR behavior if not active field
                                eliminated = true;
                                passExperiments.delete(experiment);
                            }
                        }
                    }else{
                        if(filterKeys[k] !== field && refinedFilterSet.size > 0){
                            eliminated = true;
                            passExperiments.delete(experiment);
                            break;
                        }else{
                            break;
                        }
                    }
                }
            }
        }

        return passExperiments;
    },

    /** For client-side filtering, add or remove experiments_in_set at start of field depending if filtering experiments or sets. */
    standardizeFieldKey : function(field, expsOrSets = 'sets', reverse = false){
        if (expsOrSets === 'experiments' && field !== 'experimentset_type'){
            // ToDo: arrays of expSet- and exp- exclusive fields
            if (reverse){
                return field.replace('experiments_in_set.', '');
            } else if (field.slice(0, 19) !== 'experiments_in_set.') {
                return 'experiments_in_set.' + field;
            }
        }
        return field;
    },


};