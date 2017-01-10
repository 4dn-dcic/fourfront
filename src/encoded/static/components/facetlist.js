var React = require('react');
var url = require('url');
var queryString = require('query-string');
var _ = require('underscore');
var store = require('../store');
var { ajaxLoad, getNestedProperty, flattenArrays, console } = require('./objectutils');


/**
 * Used to render individual terms in FacetList.
 * Available through FacetList.Facet.ExpTerm
 */
var ExpTerm = React.createClass({

    statics : {

        getPassExpsCount : function(termMatchExps, allExpsOrSets, expsOrSets = 'sets'){
            var numPassed = 0;

            if (expsOrSets == 'sets'){
                allExpsOrSets.forEach(function(expSet){
                    for (var i=0; i < expSet.experiments_in_set.length; i++){
                        if (termMatchExps.has(expSet.experiments_in_set[i])) {
                            numPassed++;
                            return;
                        }
                    }
                }, this);
            } else {
                // We have just list of experiments, not experiment sets.
                for (var i=0; i < allExpsOrSets.length; i++){
                    if (termMatchExps.has(allExpsOrSets[i])) numPassed++;
                }
            }

            return numPassed;
        },

        standardizeFieldKey : function(field, expsOrSets = 'sets', reverse = false){
            if (expsOrSets === 'experiments' && field !== 'experimentset_type'){
                // ToDo: arrays of expSet- and exp- exclusive fields
                if (reverse){
                    return field.replace('experiments_in_set.', '');
                }
                return 'experiments_in_set.' + field;
            } else {
                return field;
            }
        },

        /* Use as a mixin (i.e. func.call(this, termKey, facetField, expsOrSets) ) in components with access to this.props.expSetFilters */
        isSelected : function(
            termKey     = (this.state.term || this.props.term || {key:null}).key,
            facetField  = (this.state.facet || this.props.facet || {field:null}).field,
            expsOrSets  = this.props.experimentsOrSets || 'sets'
        ){
            var standardizedFieldKey = ExpTerm.standardizeFieldKey(facetField, expsOrSets);
            if (
                this.props.expSetFilters[standardizedFieldKey] && 
                this.props.expSetFilters[standardizedFieldKey].has(termKey)
            ){
                return true;
            }
            return false;
        }

    },

    propTypes : {
        'facet' : React.PropTypes.shape({
            'field' : React.PropTypes.string.isRequired
        }).isRequired,
        'term' : React.PropTypes.shape({
            'key' : React.PropTypes.string.isRequired
        }).isRequired,
        expSetFilters : React.PropTypes.object.isRequired,
        experimentsOrSets : React.PropTypes.string
    },

    getDefaultProps : function(){
        return {
            experimentsOrSets : 'sets'
        };
    },

    getInitialState: function() {

        // Bind isSelected (vs passing params) as needs no extraneous params
        this.isSelected = ExpTerm.isSelected.bind(this);

        /** 
         * props.expSetFilters uses standardized fieldKeys/props.facet.field while
         * experiment tables & facets do not. Props provided through props.facet 
         * are un-standardized, so run them through standardizeFieldKey() before
         * checking if in expSetFilters (e.g. as in ExpTerm.isSelected() ).
         */
        var termMatchExps = FacetList.siftExperiments(
            this.props.experimentSetListJSON,
            this.props.expSetFilters,
            this.props.ignoredFilters,
            this.props.facet.field,
            this.props.term.key
        );

        return {
            termMatchExps : termMatchExps,
            passExpsCount : this.getPassExpsCount(termMatchExps),
            filtering : false
        }
    },

    componentWillReceiveProps : function(newProps){
        var newState = {};
        if (
            // Probably only expSetFilters would change (re: faceting) but add other checks to be safe.
            newProps.term.key !== this.props.term.key ||
            newProps.facet.field !== this.props.facet.field ||
            newProps.expSetFilters !== this.props.expSetFilters ||
            newProps.ignoredFilters !== this.props.ignoredFilters ||
            !FacetList.compareExperimentLists(newProps.experimentSetListJSON, this.props.experimentSetListJSON)
        ){

            newState.termMatchExps = FacetList.siftExperiments(
                newProps.experimentSetListJSON || this.props.experimentSetListJSON,
                newProps.expSetFilters || this.props.expSetFilters,
                newProps.ignoredFilters || this.props.ignoredFilters,
                (newProps.facet || this.props.facet).field,
                (newProps.term || this.props.term).key
            );

            newState.passExpsCount = this.getPassExpsCount(newState.termMatchExps, newProps.experimentSetListJSON || this.props.experimentSetListJSON);
        }

        if (Object.keys(newState).length > 0){
            this.setState(newState);
        }

    },

    // Correct field to match that of browse page (ExpSet)
    standardizeFieldKey : function(field = this.props.facet.field, reverse = false){
        return ExpTerm.standardizeFieldKey(field, this.props.experimentsOrSets, reverse);
    },

    // find number of experiments or experiment sets
    getPassExpsCount : function(termMatchExps = this.state.termMatchExps, allExperiments = this.props.experimentSetListJSON){
        return ExpTerm.getPassExpsCount(termMatchExps, allExperiments, this.props.experimentsOrSets);
    },

    handleClick: function(e) {
        e.preventDefault();
        this.setState(
            { filtering : true },
            () => {
                this.props.changeFilter(
                    this.props.facet.field,
                    this.props.term.key
                );
                this.setState({ filtering : false });
            }
        );
    },

    render: function () {

        var standardizedFieldKey = this.standardizeFieldKey();
        //var expCount = this.state.termMatchExps.size;
        var selected = this.isSelected();
        return (
            <li className={"facet-list-element" + (selected ? " selected" : '')} key={this.props.term.key}>
                <a className={"term" + (selected ? " selected" : '')} href="#" onClick={this.handleClick}>
                    <span className="pull-left facet-selector">
                        { this.state.filtering ?
                            <i className="icon icon-circle-o-notch icon-spin icon-fw"></i>
                            : selected ? 
                                <i className="icon icon-times-circle icon-fw"></i>
                                : '' }
                    </span>
                    <span className="facet-item">
                        { this.props.title || this.props.term.key }
                    </span>
                    <span className="facet-count">{this.state.passExpsCount}</span>
                </a>
            </li>
        );
    }
});


/**
 * Used to render individual facet fields and their option(s) in FacetList.
 * Available through FacetList.Facet
 */
var Facet = React.createClass({

    statics : {
        ExpTerm : ExpTerm // Allow access to ExpTerm thru Facet.ExpTerm
    },

    propTypes : {
        'facet' : React.PropTypes.shape({
            'field' : React.PropTypes.string.isRequired,    // Name of nested field property in experiment objects, using dot-notation.
            'title' : React.PropTypes.string,               // Human-readable Facet Term
            'total' : React.PropTypes.number,               // Total experiments (or terms??) w/ field
            'terms' : React.PropTypes.array.isRequired      // Possible terms
        }),
        experimentSetListJSON : React.PropTypes.array,
        expSetFilters : React.PropTypes.object.isRequired,
        ignoredFilters : React.PropTypes.object,
        changeFilter : React.PropTypes.func.isRequired,     // Executed on term click
        experimentsOrSets : React.PropTypes.string,         // Defaults to 'sets'
        width : React.PropTypes.any,
        extraClassname : React.PropTypes.string
    },

    getDefaultProps: function() {
        return {
            width: 'inherit'
        };
    },
    
    getInitialState: function () {
        // Bind class instance to ExpTerm.isSelected to create this.isSelected if static (== 1 term in facet)
        this.isSelected = this.isStatic() ?
            Facet.ExpTerm.isSelected.bind(this, this.props.facet.terms[0].key)
            :
            () => false;

        return {
            facetOpen: true // Potential ToDo: store list of open or closed facet field IDs in localstorage.
        };
    },

    isStatic: function(props = this.props){ return !!(props.facet.terms.length === 1); },
    isEmpty: function(props = this.props){ return !!(props.facet.terms.length === 0); },

    handleExpandToggleClick: function (e) {
        e.preventDefault();
        this.setState({facetOpen: !this.state.facetOpen});
    },

    handleStaticClick: function(e) {
        e.preventDefault();
        if (!this.isStatic()) return false;
        this.setState(
            { filtering : true },
            () => {
                this.props.changeFilter(
                    this.props.facet.field,
                    this.props.facet.terms[0].key,
                    ()=> {
                        this.setState({ filtering : false })
                    }
                )
            }
        );
    },

    render: function() {
        var facet = this.props.facet;
        var standardizedFieldKey = FacetList.Facet.ExpTerm.standardizeFieldKey(facet.field, this.props.experimentsOrSets);
        var selected = this.isSelected();
        if (this.isStatic()){ 
            // Only one term
            return (
                <div
                    className={
                        "facet static row" +
                        ( selected ? ' selected' : '') +
                        ( this.state.filtering ? ' filtering' : '') +
                        ( this.props.extraClassname ? ' ' + this.props.extraClassname : '' )
                    }
                    style={{width: this.props.width}}
                    data-field={standardizedFieldKey}
                    title={
                        'All ' +
                        (this.props.experimentsOrSets === 'sets' ? 'experiment sets' : 'experiments') +
                        ' have ' +
                        facet.terms[0].key +
                        ' as their ' +
                        (facet.title || facet.field ).toLowerCase() + '; ' +
                        (selected ? 
                            'currently active as portal-wide filter.' : 
                            'not currently active as portal-wide filter.'
                        )
                    }
                >
                    <div className="facet-static-row clearfix">
                        <h5 className="facet-title">
                            { facet.title || facet.field }
                        </h5>
                        <div className={
                            "facet-item term" +
                            (selected? ' selected' : '') +
                            (this.state.filtering ? ' filtering' : '')
                        }>
                            <span onClick={this.handleStaticClick}>
                                <i className={
                                    "icon icon-fw " +
                                    (this.state.filtering ? 'icon-spin icon-circle-o-notch' :
                                        ( selected ? 'icon-times-circle' : 'icon-circle' )
                                    )
                                }></i>{ facet.terms[0].key }
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        // List of terms
        return (
            <div
                className={"facet row" + (this.state.facetOpen ? ' open' : ' closed')}
                hidden={false/*this.isEmpty()*/}
                data-field={standardizedFieldKey}
            >
                <h5 className="facet-title" onClick={this.handleExpandToggleClick} title="Hide or expand facet terms">
                    { facet.title || facet.field }
                    <span className="right">
                        <i className={
                            "icon icon-fw " +
                            (this.state.facetOpen ? "icon-angle-down" : "icon-angle-right")
                        }></i>
                    </span>
                </h5>
                { this.state.facetOpen ?
                <div className="facet-list nav">
                    <div>
                        { facet.terms.map(function (term) {
                            return <Facet.ExpTerm {...this.props} key={term.key} term={term} total={facet.total}/>;
                        }.bind(this))}
                    </div>
                </div>
                :
                null
                }
            </div>
        );

    }
});

/**
 * FacetList - Exported
 */

var FacetList = module.exports = React.createClass({

    statics : {

        // Include sub-components as static (sub-)properties of main FacetList
        Facet : Facet,

        changeFilter: function(field, term, experimentsOrSets = 'experiments', currentFilters = null, callback = null, returnInsteadOfSave = false) {

            if (!currentFilters){
                currentFilters = store.getState().expSetFilters;
            }

            // store currently selected filters as a dict of sets
            var tempObj = {};
            var newObj = {};

            // standardize on field naming convention for expSetFilters before they hit the redux store.
            field = FacetList.Facet.ExpTerm.standardizeFieldKey(field, experimentsOrSets);

            var expSet = currentFilters[field] ? new Set(currentFilters[field]) : new Set();
            if(expSet.has(term)){
                // term is already present, so delete it
                expSet.delete(term);
            }else{
                expSet.add(term);
            }
            if(expSet.size > 0){
                tempObj[field] = expSet;
                newObj = Object.assign({}, currentFilters, tempObj);
            }else{ //remove key if set is empty
                newObj = Object.assign({}, currentFilters);
                delete newObj[field];
            }

            if (returnInsteadOfSave){
                return newObj;
            } else {
                FacetList.saveChangedFilters(newObj);
                if (typeof callback === 'function') setTimeout(callback, 0);
            }
        },

        saveChangedFilters : function(expSetFilters){
            console.log(expSetFilters, expSetFilters == true, expSetFilters == false);
            store.dispatch({
                type : {'expSetFilters' : expSetFilters}
            });
        },

        /**
         * Adds a restrictions property to each facet from restrictions object
         * and uses it to filter terms.
         * 
         * @param {Object[]} origFacets - Array of initial facets; should have terms already.
         * @param {Object} [restrictions] - Object containing restricted facet fields as property names and arrays of term keys as values.
         */
        adjustedFacets : function(origFacets, restrictions = {}){
            return origFacets.map(function(facet){
                if (restrictions[facet.field] !== undefined) {
                    facet = _.clone(facet);
                    facet.restrictions = restrictions[facet.field];
                    facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
                }
                return facet;
            });
        },

        siftExperiments : function(graph, filters, ignored=null, field=null, term=null) {
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

        /**
         * Unsets any 'terms' or 'total' properties on facets.
         * Modifies facets param in place, does not clone/copy/create new one(s).
         * 
         * @param {Object[]} facets - List of facets.
         */
        resetFacetTermsAndCounts : function(facets){
            facets.forEach(function(facet,i,a){
                delete facet.terms;
                delete facet.total;
            });
        },

        /**
         * Fills facet objects with 'terms' and 'total' properties, as well as terms' counts.
         * Modifies incompleteFacets param in place (to turn them into "complete" facets).
         *
         * @param {Object[]} incompleteFacets - Array of facet objects. Each should have field and title keys/values.
         * @param {Object[]} exps - Array of experiment objects, obtained from @graph or experiments_in_set property on context.
         */
        fillFacetTermsAndCountFromExps : function(incompleteFacets, exps){

            incompleteFacets.forEach(function(facet, facetIndex){

                var fieldHierarchyLevels = facet.field.split('.'); // E.g. [biosample, biosource, individual,..]
                var termCounts = {};

                // Loop through experiments to find all terms and counts per term.
                for (var i = 0; i < exps.length; i++){

                    var facetTerm = getNestedProperty(exps[i], fieldHierarchyLevels);

                    if (Array.isArray(facetTerm)) {
                        for (var j = 0; j < facetTerm.length; j++){
                            if (!termCounts.hasOwnProperty(facetTerm[j])) termCounts[facetTerm[j]] = 0;
                            termCounts[facetTerm[j]]++;
                        }
                    } else {
                        if (!termCounts.hasOwnProperty(facetTerm)) termCounts[facetTerm] = 0;
                        termCounts[facetTerm]++;
                    }

                }

                facet.total = 0;
                facet.terms = Object.keys(termCounts).map(function(term,i,a){
                    facet.total += termCounts[term];
                    return {
                        'key' : term,
                        'doc_count' : termCounts[term]
                    };
                });

            }, this);

        },

        /**
         * Find filters to ignore - i.e. filters which are set in expSetFilters but are
         * not present in facets.
         * 
         * @param {Object[]} facets - Array of complete facet objects (must have 'terms' & 'fields' properties).
         * @param {Object} expSetFilters - Object containing facet fields and their enabled terms:
         *     '{string} Field in item JSON hierarchy, using object dot notation : {Set} terms'.
         * 
         * @return {Object} The filters which are ignored. Object looks like expSetFilters.
         */
        findIgnoredFiltersByMissingFacets : function(facets, expSetFilters){
            var ignoredFilters = {};
            for(var i=0; i < facets.length; i++){
                var ignoredSet = new Set();
                if(expSetFilters[facets[i].field]){
                    for(let expFilter of expSetFilters[facets[i].field]){
                        var found = false;
                        for(var j=0; j < facets[i].terms.length; j++){
                            if(expFilter === facets[i].terms[j].key){
                                found = true;
                                break;
                            }
                        }
                        if(!found){
                            ignoredSet.add(expFilter);
                        }
                    }
                    if(ignoredSet.size > 0){
                        ignoredFilters[facets[i].field] = ignoredSet;
                    }
                }

            }
            if (Object.keys(ignoredFilters).length) console.log("Found Ignored Filters: ", ignoredFilters);
            return ignoredFilters;
        },

        /**
         * Find filters which to ignore based on if all experiments in experimentArray which are being filtered
         * have the same term for that selected filter. Geared towards usage by ExperimentSetView.
         * 
         * @param {Object[]} experimentArray - Experiments which are being filtered.
         * @param {Object} expSetFilters - Object containing facet field name as key and set of terms to filter by as value.
         * @param {string} [expsOrSets] - Whether are filtering experiments or sets, in order to standardize facet names.
         */
        findIgnoredFiltersByStaticTerms : function(experimentArray, expSetFilters, expsOrSets = 'experiments'){
            var ignored = {};
            Object.keys(expSetFilters).forEach((selectedFacet, i)=>{ // Get facets/filters w/ only 1 applicable term

                // Unique terms in all experiments per filter
                if (
                    flattenArrays(
                        // getNestedProperty returns array(s) if property is nested within array(s), so we needa flatten to get list of terms.
                        experimentArray.map((experiment, j)=>{
                            var termVal = getNestedProperty(
                                experiment,
                                ExpTerm.standardizeFieldKey(selectedFacet, expsOrSets, true)
                            );
                            if (Array.isArray(termVal)){ // Only include terms by which we're filtering
                                return termVal.filter((term) => expSetFilters[selectedFacet].has(term));
                            }
                            return termVal;
                        })
                    ).filter((experimentTermValue, j, allTermValues)=>{ 
                        // Reduce to unique term vals (indexOf returns first index, so if is repeat occurance, returns false)
                        return allTermValues.indexOf(experimentTermValue) === j;
                    }).length < 2
                ) {
                    ignored[selectedFacet] = expSetFilters[selectedFacet]; // Ignore all terms in filter.
                }

            });
            return ignored;
        },

        /**
         * Compare two arrays of experiments to check if contain same experiments, by their ID.
         * @return {boolean} True if equal.
         */
        compareExperimentLists : function(exps1, exps2){
            if (exps1.length != exps2.length) return false;
            for (var i; i < exps1.length; i++){
                if (exps1[i]['@id'] != exps2[i]['@id']) return false;
            }
            return true;
        },

        /**
         * ToDo : Compare two objects of expSetFilters.
         * @return {boolean} True if equal.
         */
        /*
        compareExpSetFilters : function(expSetFilters1, expSetFilters2){
            var esfKeys1 = Object.keys(expSetFilters1);
            var esfKeys2 = Object.keys(expSetFilters2);
            if (esfKeys1.length != esfKeys2.length) return false;
        },
        */
        checkFilledFacets : function(facets){
            if (!facets.length) return false;
            for (var i; i < facets.length; i++){
                if (typeof facets[i].total !== 'number') return false;
                if (typeof facets[i].terms === 'undefined') return false;
            }
            return true;
        }

    },

    contextTypes: {
        session: React.PropTypes.bool,
        hidePublicAudits: React.PropTypes.bool,
        location_href : React.PropTypes.string
    },

    propTypes : {
        facets : React.PropTypes.arrayOf(React.PropTypes.shape({
            'field' : React.PropTypes.string,           // Nested field in experiment(_set), using dot-notation.
            'terms' : React.PropTypes.arrayOf(React.PropTypes.shape({
                'doc_count' : React.PropTypes.number,   // Exp(set)s matching term
                'key' : React.PropTypes.string          // Unique key/title of term.
            })),
            'title' : React.PropTypes.string,           // Title of facet
            'total' : React.PropTypes.number            // # of experiment(_set)s
        })),
        /**
         * In lieu of facets, which are only generated by search.py, can
         * use and format schemas (available to experiment-set-view.js through item.js)
         */
        schemas : React.PropTypes.object,
        // { '<schemaKey : string > (active facet categories)' : Set (active filters within category) }
        expSetFilters : React.PropTypes.object.isRequired,
        experimentSetListJSON : React.PropTypes.array.isRequired, // JSON data of experiments, if not in context['@graph']
        orientation : React.PropTypes.string,   // 'vertical' or 'horizontal'
        ignoredFilters : React.PropTypes.any,   // Passed down to ExpTerm
        urlPath : React.PropTypes.string,       // context['@id'], used to get search param.
        restrictions : React.PropTypes.object,
        experimentsOrSets : React.PropTypes.string,
        expIncompleteFacets : React.PropTypes.array,
        title : React.PropTypes.string,         // Title to put atop FacetList
        className : React.PropTypes.string,     // Extra class


        context : React.PropTypes.object,       // Unused -ish
        onFilter : React.PropTypes.func,        // Unused
        fileFormats : React.PropTypes.array,    // Unused
        // searchBase : React.PropTypes.string,    // Unused - grab from location_href
        restrictions : React.PropTypes.object,  // Unused
        mode : React.PropTypes.string,          // Unused
        onChange : React.PropTypes.func         // Unused
    },

    facets : null,
    ignoredFilters : null,

    getDefaultProps: function() {
        return {
            orientation: 'vertical',
            restrictions : {},
            facets : null,
            experimentsOrSets : 'sets',
            urlPath : null,
            title : "Properties"
        };
    },

    /**
     * Sets up list of facets to use for filtering in this.facets. 
     * `this.facets` be migrated to `this.state.facets` at some point.
     * - (1) Try to use facets passed in through props, if any.
     * - (2) Try to get list of incomplete experiment-applicable facets from redux store (passed through props),
     *       if has been loaded previously. Then fill up facets with terms and term-match counts on mount.
     * - (3) If not set here in getInitialState, then get list of incomplete exp-applicable facets from back-end
     *       on componentDidMount. Once fetched, fill up w/ terms and term-match counts and update state.
     * 
     * @return {Object} Initial state object.
     */
    getInitialState : function(){

        var initState = {
            usingProvidedFacets : !!(this.props.facets), // Convert to bool
            facetsLoaded : false
        };

        if (initState.usingProvidedFacets) {
            this.facets = this.filterFacets(this.props.facets);
        } else {
            // Try to get from Redux store via App props.
            // If exists, will fill them up w/ terms from current experiments before mount.
            // Else, if doesn't exist (facetsLoaded remains false), will perform ajax fetch on mount
            // to get list of applicable then fill up w/ terms.
            this.facets = this.props.expIncompleteFacets || [];
            if (this.facets && this.facets.length > 0) {
                initState.facetsLoaded = true;
                this.facets = this.filterFacets(this.facets);
            }
        }

        return initState;
    },

    /**
     * If not using facets that were passed in through props and incomplete facets were obtained through redux store,
     * fill them up w/ terms from experiments.
     */
    componentWillMount : function(){
        if (this.state.usingProvidedFacets === false && this.state.facetsLoaded){
            FacetList.fillFacetTermsAndCountFromExps(this.facets, this.props.experimentSetListJSON);
        }
    },

    /**
     * If not using props passed in through props, and incomplete facets not available (yet) in redux store,
     * AJAX them in, save to redux store, then fill up w/ terms. @see FacetList.getInitialState
     * 
     * Possible ToDo : Store copy of this.(state.)facets in redux store instead of reference.
     */
    componentDidMount : function(){

        console.log(
            'Mounted FacetList on ' + (this.props.urlPath || 'unknown page.'),
            '\nFacets Provided: ' + this.state.usingProvidedFacets,
            'Facets Loaded: ' + this.state.facetsLoaded
        );

        if (this.state.usingProvidedFacets === false && !this.state.facetsLoaded && typeof window !== 'undefined'){
            // Load list of available facets via AJAX once & reuse.
            this.loadFacets(() => {
                FacetList.fillFacetTermsAndCountFromExps(this.facets, this.props.experimentSetListJSON);
                if (!this.props.ignoredFilters) {
                    this.ignoredFilters = FacetList.findIgnoredFiltersByMissingFacets(this.facets, this.props.expSetFilters);
                } // else: @see getInitialState
            });
        } // else if (this.state.usingProvidedFacets === false && this.state.facetsLoaded) : @see componentWillMount
    },

    /**
     * Because redux store seems to store a reference to facets,
     * reset them to be incomplete on dismount so they can be reused.
     */
    componentWillUnmount : function(){
        if (this.state.usingProvidedFacets === false) {
            FacetList.resetFacetTermsAndCounts(this.facets);
        }
    },

    /**
     * Since there's a good chunk of intensive (potentially UI-blocking) calculation,
     * minimize updates to only when necessary, i.e. only when relevant-to-facetlist-changes props
     * or state has changed. Child components' state changes (e.g. show/collapse facet) are not affected.
     */
    shouldComponentUpdate : function(nextProps, nextState){
        if (
            this.state.usingProvidedFacets === false ||
            this.props.expSetFilters !== nextProps.expSetFilters ||
            !_.isEqual(nextProps.facets, this.props.facets) ||
            !_.isEqual(nextProps.ignoredFilters, this.props.ignoredFilters)
        ){
            console.log('%cWill','color: green', 'update FacetList');
            return true;
        }
        console.log('%cWill not', 'color: red', 'update FacetList');
        return false;
    },

    componentWillReceiveProps : function(nextProps){
        if (
            this.props.expSetFilters !== nextProps.expSetFilters ||
            !_.isEqual(nextProps.facets, this.props.facets) ||
            !_.isEqual(nextProps.ignoredFilters, this.props.ignoredFilters)
        ){

            if (this.state.usingProvidedFacets === true && this.props.facets !== nextProps.facets){
                this.facets = this.filterFacets(nextProps.facets);
                console.timeLog('FacetList props.facets updated.');
            }

            if (!this.props.ignoredFilters && (this.state.usingProvidedFacets === true || this.state.facetsLoaded)){
                this.ignoredFilters = FacetList.findIgnoredFiltersByMissingFacets(this.facets, nextProps.expSetFilters);
            } // else: See @componentDidMount > this.loadFacets() callback param
        }
    },

    loadFacets : function(callback = null){
        var facetType = (this.props.experimentsOrSets == 'sets' ? 'ExperimentSet' : 'Experiment');
        ajaxLoad('/facets?type=' + facetType + '&format=json', function(r){
            this.facets = this.filterFacets(r);
            console.log('Loaded Facet List via AJAX.');
            if (typeof callback == 'function') callback();
            if (facetType == 'Experiment' && !this.props.expIncompleteFacets && typeof window !== 'undefined'){
                window.requestAnimationFrame(()=>{
                    // Will trigger app re-render & update state.facetsLoaded as well through getInitialState.
                    store.dispatch({
                        type : {'expIncompleteFacets' : this.facets}
                    });
                    console.info('Stored Incomplete Facet List in Redux store.');
                });
            }
        }.bind(this));
    },

    filterFacets : function(facets = this.facets){
        return facets.filter(facet =>
            (
                (facet.field.substring(0, 6) === 'audit.') || /* ignore all audit facets for the time being */
                (facet.field === 'type') ||
                (facet.field === 'experimentset_type') ||
                (   /* permissions */
                    !this.context.session && 
                    this.context.hidePublicAudits && 
                    facet.field.substring(0, 6) === 'audit.'
                )
            ) ? false : true 
        )
    },

    clearFilters: function(e) {
        e.preventDefault();
        setTimeout(function(){
            store.dispatch({
                type : {'expSetFilters' : {}}
            });
        }, 0);
    },

    changeFilter: function(field, term, callback) {
        return FacetList.changeFilter(field, term, this.props.experimentsOrSets, this.props.expSetFilters, callback);
    },

    searchQueryTerms : function(){
        var urlPath = this.props.urlPath || this.props.context && this.props.context['@id'] ? this.props.context['@id'] : null;
        if (!urlPath) return null;
        var searchQuery = urlPath && url.parse(urlPath).search;
        if (!searchQuery) return null;
        return queryString.parse(searchQuery);
    },

    checkIfAllSingleTerm : function(){
        for (var i = 0; i < this.facets.length; i++){
            if (!Array.isArray(this.facets[i].terms)) throw new Error("Facets must have list of terms.");
            if (this.facets[i].terms && this.facets[i].terms.length > 1) return false;
        }
        return true;
    },

    renderFacets : function(facets = this.facets){
        var extClass = this.checkIfAllSingleTerm() ? ' all-single-term' : null;
        return facets.map(facet =>
            <FacetList.Facet
                experimentSetListJSON={ this.props.experimentSetListJSON || this.props.context['@graph'] || null }
                expSetFilters={this.props.expSetFilters}
                ignoredFilters={ this.props.ignoredFilters || this.ignoredFilters }
                changeFilter={this.changeFilter}
                key={facet.field}
                facet={facet}
                width="inherit"
                experimentsOrSets={this.props.experimentsOrSets}
                extraClassname={extClass}
            />
        )
    },

    render: function() {
        console.timeLog('render facetlist');
        var exptypeDropdown;

        if (
            !this.facets ||
            (!this.facets.length && this.props.mode != 'picker') ||
            (!this.facets[0].terms && this.props.mode != 'picker')
        ) {
            if (!this.state.facetsLoaded && !this.state.usingProvidedFacets) {
                return (
                    <div className="text-center" style={{ padding : "162px 0", fontSize : '26px', color : "#aaa" }}>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </div>
                );
            } else {
                return null;
            }
        }

        var clearButton = this.props.expSetFilters && !_.isEmpty(this.props.expSetFilters) ? true : false;
        var clearButtonStyle = (this.props.className && this.props.className.indexOf('with-header-bg') > -1) ?
            "btn-outline-white" : "btn-outline-default";

        //var terms = this.searchQueryTerms();
        //var searchBase = url.parse(this.context.location_href).search || '';
        //searchBase = searchBase && searchBase.length > 0 ? searchBase + '&' : searchBase + '?';

        return (
            <div>
                <div className="exptype-box">
                    { exptypeDropdown }
                </div>
                <div className={
                    "facets-container facets " +
                    this.props.orientation +
                    ( this.props.className ? ' ' + this.props.className : '' )
                }>
                    <div className="row facets-header">
                        <div className="col-xs-6 facets-title-column">
                            <i className="icon icon-fw icon-sort-amount-desc"></i>
                            &nbsp;
                            <h4 className="facets-title">{ this.props.title }</h4>
                        </div>
                        <div className={"col-xs-6 clear-filters-control" + (clearButton ? '' : ' placeholder')}>
                            <a href="#" onClick={this.clearFilters} className={"btn btn-xs rounded " + clearButtonStyle}>
                                <i className="icon icon-times"></i> Clear All
                            </a>
                        </div>
                    </div>
                    { this.renderFacets() }
                </div>
            </div>
        );
    }
});

