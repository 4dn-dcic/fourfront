var React = require('react');
var url = require('url');
var queryString = require('query-string');
var _ = require('underscore');
var store = require('../store');
var { ajaxLoad, getNestedProperty, console } = require('./objectutils');

var FacetList = module.exports.FacetList = React.createClass({

    statics : {

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
         */
        findIgnoredFilters : function(facets, expSetFilters){
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
         * Compare two arrays of experiments to check if contain same experiments, by their ID.
         * 
         * @return {boolean} True if equal.
         */
        compareExperimentLists : function(exps1, exps2){
            if (exps1.length != exps2.length) return false;
            for (var i; i < exps1.length; i++){
                if (exps1[i]['@id'] != exps2[i]['@id']) return false;
            }
            return true;
        },

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
        /**
         * Array of objects containing -
         *   'field' : string (schema path),
         *   'terms' : [{'doc_count' : integer (# of matching experiments), 'key' : string (term/filter name) }],
         *   'title' : string (category name),
         *   'total' : integer (# of experiments)
         */
        facets : React.PropTypes.array,
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
            urlPath : null
        };
    },

    getInitialState : function(){

        var initState = {
            usingProvidedFacets : !!(this.props.facets), // Convert to bool
            facetsLoaded : false
        };

        if (initState.usingProvidedFacets) {
            this.facets = this.props.facets;
        } else {
            this.facets = this.props.expIncompleteFacets || []; // Try to get from Redux store via App props.
            if (this.facets && this.facets.length > 0) {
                initState.facetsLoaded = true;
            }
        }

        return initState;
    },

    componentWillMount : function(){
        if (this.state.usingProvidedFacets === false && this.state.facetsLoaded){
            FacetList.fillFacetTermsAndCountFromExps(this.facets, this.props.experimentSetListJSON);
        }
    },

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
                    this.ignoredFilters = FacetList.findIgnoredFilters(this.facets, this.props.expSetFilters);
                } // else: @see getInitialState
            });
        } // else if (this.state.usingProvidedFacets === false && this.state.facetsLoaded) : @see componentWillMount
    },

    componentWillUnmount : function(){
        if (this.state.usingProvidedFacets === false) {
            FacetList.resetFacetTermsAndCounts(this.facets);
        }
    },

    componentWillReceiveProps : function(nextProps){
        if (
            this.props.ignoredFilters !== nextProps.ignoredFilters ||
            this.props.expSetFilters !== nextProps.expSetFilters ||
            this.props.facets !== nextProps.facets
        ){

            if (this.state.usingProvidedFacets === true && this.props.facets !== nextProps.facets){
                this.facets = nextProps.facets;
                console.log('FacetList props.facets updated.');
            }

            if (!this.props.ignoredFilters && (this.state.usingProvidedFacets === true || this.state.facetsLoaded)){
                this.ignoredFilters = FacetList.findIgnoredFilters(this.facets, this.props.expSetFilters);
            } // else: See @componentDidMount > this.loadFacets() callback param
        }
    },

    loadFacets : function(callback = null){
        var facetType = (this.props.experimentsOrSets == 'sets' ? 'ExperimentSet' : 'Experiment');
        ajaxLoad('/facets?type=' + facetType + '&format=json', function(r){
            this.facets = r;
            console.log('Loaded Facet List via AJAX.');
            if (typeof callback == 'function') callback();
            if (facetType == 'Experiment' && !this.props.expIncompleteFacets && typeof window !== 'undefined'){
                window.requestAnimationFrame(()=>{
                    // Will trigger app re-render & update state.facetsLoaded as well through getInitialState.
                    store.dispatch({
                        type : {'expIncompleteFacets' : this.facets}
                    });
                    console.log('Stored Facet List in Redux store.');
                });
            }
        }.bind(this));
    },

    clearFilters: function(e) {
        e.preventDefault();
        setTimeout(function(){
            store.dispatch({
                type : {'expSetFilters' : {}}
            });
        }, 0);
    },

    changeFilters: function(field, term) {

        setTimeout(function(){

            // store currently selected filters as a dict of sets
            var tempObj = {};
            var newObj = {};

            // standardize on field naming convention for expSetFilters before they hit the redux store.
            field = ExpTerm.standardizeFieldKey(field, this.props.experimentsOrSets);

            var expSet = this.props.expSetFilters[field] ? new Set(this.props.expSetFilters[field]) : new Set();
            if(expSet.has(term)){
                // term is already present, so delete it
                expSet.delete(term);
            }else{
                expSet.add(term);
            }
            if(expSet.size > 0){
                tempObj[field] = expSet;
                newObj = Object.assign({}, this.props.expSetFilters, tempObj);
            }else{ //remove key if set is empty
                newObj = Object.assign({}, this.props.expSetFilters);
                delete newObj[field];
            }
            store.dispatch({
                type : {'expSetFilters' : newObj}
            });

        }.bind(this), 1);
    },

    searchQueryTerms : function(){
        var urlPath = this.props.urlPath || this.props.context && this.props.context['@id'] ? this.props.context['@id'] : null;
        if (!urlPath) return null;
        var searchQuery = urlPath && url.parse(urlPath).search;
        if (!searchQuery) return null;
        return queryString.parse(searchQuery);
    },

    render: function() {
        console.log('render facetlist');
        var facets = this.facets, // Get all facets, and "normal" facets, meaning non-audit facets
            loggedIn = this.context.session,
            regularFacets = [],
            exptypeDropdown;

        if (
            !facets ||
            (!facets.length && this.props.mode != 'picker') ||
            (!facets[0].terms && this.props.mode != 'picker')
        ) {
            if (!this.state.facetsLoaded) {
                return (
                    <div className="text-center" style={{ padding : "162px 0", fontSize : '26px', color : "#aaa" }}>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </div>
                );
            } else {
                return null;
            }
        }

        // ignore all audit facets for the time being
        var normalFacets = facets.filter(facet => facet.field.substring(0, 6) !== 'audit.');
        var clearButton = Object.keys(this.props.expSetFilters).length === 0 ? false : true;

        //var terms = this.searchQueryTerms();
        //var searchBase = url.parse(this.context.location_href).search || '';
        //searchBase = searchBase && searchBase.length > 0 ? searchBase + '&' : searchBase + '?';

        normalFacets.map(facet => {
            if ((facet.field == 'type') || (!loggedIn && this.context.hidePublicAudits && facet.field.substring(0, 6) === 'audit.')) {
                return;
            } else if (facet.field != 'experimentset_type') {
                regularFacets.push(
                    <Facet
                        experimentSetListJSON={ this.props.experimentSetListJSON || this.props.context['@graph'] || null }
                        expSetFilters={this.props.expSetFilters}
                        ignoredFilters={ this.props.ignoredFilters || this.ignoredFilters }
                        changeFilters={this.changeFilters}
                        key={facet.field}
                        facet={facet}
                        width="inherit"
                        experimentsOrSets={this.props.experimentsOrSets}
                    />);
                return;
            }
        });

        return (
            <div>
                <div className="exptype-box">
                    { exptypeDropdown }
                </div>
                <div className={"facets-container facets " + this.props.orientation}>
                    <div className={"clear-filters-control" + (clearButton ? '' : ' placeholder')}>
                        <a href="#" onClick={this.clearFilters}><i className="icon icon-times-circle"></i> Clear All Filters </a>
                    </div>
                    {regularFacets}
                </div>
            </div>
        );
    }
});

var Facet = module.exports.Facet = React.createClass({

    propTypes : {
        'facet' : React.PropTypes.shape({
            'field' : React.PropTypes.string.isRequired,    // Name of nested field property in experiment objects, using dot-notation.
            'title' : React.PropTypes.string,               // Human-readable Facet Term
            'total' : React.PropTypes.number,               // Total experiments (or terms??) w/ field
            'terms' : React.PropTypes.array.isRequired      // Possible terms
        })
    },

    getDefaultProps: function() {
        return {
            width: 'inherit'
        };
    },
    /*
    getInitialState: function () {
        return {
            facetOpen: false
        };
    },

    handleClick: function (e) {
        e.preventDefault();
        this.setState({facetOpen: !this.state.facetOpen});
    },
    */
    render: function() {
        var facet = this.props.facet;
        return (
            <div className="facet" hidden={facet.terms.length === 0} style={{width: this.props.width}} data-field={facet.field}>
                <h5>{ facet.title || facet.field }</h5>
                <div className="facet-list nav">
                    <div>
                        { facet.terms.map(function (term) {
                            return <ExpTerm {...this.props} key={term.key} term={term} total={facet.total}/>;
                        }.bind(this))}
                    </div>
                </div>
            </div>
        );
    }
});

var ExpTerm = module.exports.ExpTerm = React.createClass({

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

    },

    propTypes : {
        'facet' : React.PropTypes.shape({
            'field' : React.PropTypes.string.isRequired
        }).isRequired,
        'term' : React.PropTypes.shape({
            'key' : React.PropTypes.string.isRequired
        }).isRequired,
        expSetFilters : React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        // props.expSetFilters uses corrected fieldKeys
        // experiment tables & facets do not.
        var termMatchExps = siftExperiments(
            this.props.experimentSetListJSON,
            this.props.expSetFilters,
            this.props.ignoredFilters,
            this.props.facet.field,
            this.props.term.key
        );

        return {
            termMatchExps : termMatchExps,
            passExpsCount : this.getPassExpsCount(termMatchExps)
        }
    },

    componentWillReceiveProps : function(newProps){
        var newState = {};

        if (
            // Probably only expSetFilters would change (re: faceting) but add other checks to be safe.
            newProps.term.key !== this.props.term.key ||
            newProps.facet.field !== this.props.facet.field ||
            !_.isEqual(newProps.expSetFilters, this.props.expSetFilters) ||
            !_.isEqual(newProps.ignoredFilters, this.props.ignoredFilters) ||
            !FacetList.compareExperimentLists(newProps.experimentSetListJSON, this.props.experimentSetListJSON)
        ){

            newState.termMatchExps = siftExperiments(
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
        this.props.changeFilters(this.props.facet.field, this.props.term.key);
    },

    render: function () {

        var standardizedFieldKey = this.standardizeFieldKey();
        //var expCount = this.state.termMatchExps.size;
        var selected = false;
        if (
            this.props.expSetFilters[standardizedFieldKey] && 
            this.props.expSetFilters[standardizedFieldKey].has(this.props.term.key)
        ){
            selected = true;
        }
        return (
            <li className={"expterm-list-element" + (selected ? " selected" : '')} key={this.props.term.key}>
                <a className={selected ? "expterm-selected selected" : "expterm"} href="#" onClick={this.handleClick}>
                    <span className="pull-left facet-selector">{selected ? <i className="icon icon-times-circle"></i> : ''}</span>
                    <span className="facet-item">
                        { this.props.title || this.props.term.key }
                    </span>
                    <span className="pull-right facet-count">{this.state.passExpsCount}</span>
                </a>
            </li>
        );
    }
});

// Find the component experiments in an experiment set that match the current filters
var siftExperiments = module.exports.siftExperiments = function(graph, filters, ignored=null, field=null, term=null) {
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
            var refinedFilterSet;
            if(ignored && ignored[filterKeys[k]] && ignored[filterKeys[k]].size > 0){
                // remove the ignored filters by using the difference between sets
                var difference = new Set([...filters[filterKeys[k]]].filter(x => !ignored[filterKeys[k]].has(x)));
                refinedFilterSet = difference;
            }else{
                refinedFilterSet = filters[filterKeys[k]];
            }
            if(eliminated){
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
}
