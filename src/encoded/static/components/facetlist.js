var React = require('react');
var url = require('url');
var queryString = require('query-string');
var _ = require('underscore');
var store = require('../store');
var { ajaxLoad, console } = require('./objectutils');

var FacetList = module.exports.FacetList = React.createClass({

    statics : {

        /** rawFacets from props.context.facets (server-sent JSON) */
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

        resetFacetTermsAndCounts : function(facets){
            facets.forEach(function(facet,i,a){
                delete facet.terms;
                delete facet.total;
            });
        },

        /**
         * Fills facet objects with terms and counts.
         *
         * @param {Object[]} incompleteFacets - Array of facet objects. Each should have field and title keys/values.
         * @param {Object[]} exps - Array of experiment objects, obtained from @graph or experiments_in_set property on context.
         */
        fillFacetTermsAndCountFromExps : function(incompleteFacets, exps){

            // Recursively find Facet Term Value(s)
            function findFacetValue(facetValue, fieldHierarchyLevels, level = 0){
                if (level == fieldHierarchyLevels.length) return facetValue;

                if (Array.isArray(facetValue)){
                    var facetValues = [];
                    for (var i = 0; i < facetValue.length; i++){
                        facetValues.push( findFacetValue(facetValue[i], fieldHierarchyLevels, level) );
                    }
                    return facetValues;
                } else {
                    return findFacetValue(
                        facetValue[fieldHierarchyLevels[level]],
                        fieldHierarchyLevels,
                        ++level
                    );
                }
            };

            incompleteFacets.forEach(function(facet,i,a){

                var fieldHierarchyLevels = facet.field.split('.'); // E.g. [biosample, biosource, individual,..]
                var termCounts = {};

                // Loop through experiments to find all terms and counts per term.
                for (var i = 0; i < exps.length; i++){

                    var facetTerm = findFacetValue(exps[i], fieldHierarchyLevels);

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

        findIgnoredFilters : function(facets, expSetFilters){
            var ignoredFilters = {};
            for(var i=0; i < facets.length; i++){
                var ignoredSet = new Set();
                var field = facets[i].field;
                var terms = facets[i].terms;
                if(expSetFilters[field]){
                    for(let expFilter of expSetFilters[field]){
                        var found = false;
                        for(var j=0; j < terms.length; j++){
                            if(expFilter === terms[j].key){
                                found = true;
                                break;
                            }
                        }
                        if(!found){
                            ignoredSet.add(expFilter);
                        }
                    }
                    if(ignoredSet.size > 0){
                        ignoredFilters[field] = ignoredSet;
                    }
                }
            }
            return ignoredFilters;
        },

        /** Compare two arrays of experiments to check if contain same experiments, by their ID. **/
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
                if (typeof facets[i].total != 'number') return false;
                if (typeof facets[i].terms == 'undefined') return false;
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
            });
        }
    },

    componentWillUnmount : function(){
        if (this.state.usingProvidedFacets === false) {
            FacetList.resetFacetTermsAndCounts(this.facets);
        }
    },

    loadFacets : function(callback = null){
        var facetType = (this.props.experimentsOrSets == 'sets' ? 'ExperimentSet' : 'Experiment');
        ajaxLoad('/facets?type=' + facetType + '&format=json', function(r){
            this.facets = r;
            console.log('Loaded Facet List via AJAX.');
            if (facetType == 'Experiment' && !this.props.expIncompleteFacets && typeof window !== 'undefined'){
                window.requestAnimationFrame(()=>{
                    // Will trigger app re-render & update state.facetsLoaded as well through getInitialState.
                    store.dispatch({
                        type : {'expIncompleteFacets' : this.facets}
                    });
                    console.log('Stored Facet List in Redux store.');
                });
            }
            if (typeof callback == 'function') callback();
        }.bind(this));
    },

    clearFilters: function(e) {
        e.preventDefault()
        store.dispatch({
            type : {'expSetFilters' : {}}
        });
    },

    changeFilters: function(field, term) {
        // store currently selected filters as a dict of sets
        var tempObj = {};
        var newObj = {};

        // standardize on field naming convention for expSetFilters before they hit the redux store.
        if (this.props.experimentsOrSets == 'experiments') {
            if (field != 'experimentset_type'){ // ToDo: arrays of expSet- and exp- exclusive fields
                field = 'experiments_in_set.' + field;
            }
        }

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
                        ignoredFilters={ this.props.ignoredFilters || FacetList.findIgnoredFilters(facets, this.props.expSetFilters) }
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
                <div className={"box facets " + this.props.orientation}>
                    <div className="row">
                        {clearButton ?
                            <div className="pull-right clear-filters-control">
                                <a href="" onClick={this.clearFilters}><i className="icon icon-times-circle"></i> Clear All Filters </a>
                            </div>
                        :   <div className="pull-right clear-filters-control placeholder">
                                <a>Clear Filters</a>
                            </div>}
                    </div>
                    {regularFacets}
                </div>
            </div>
        );
    }
});

var Facet = module.exports.Facet = React.createClass({

    getDefaultProps: function() {
        return {
            width: 'inherit'
        };
    },

    getInitialState: function () {
        return {
            facetOpen: false
        };
    },

    handleClick: function (e) {
        e.preventDefault();
        this.setState({facetOpen: !this.state.facetOpen});
    },

    render: function() {
        var facet = this.props.facet;
        var title = facet['title'];
        var field = facet['field'];
        var total = facet['total'];
        var terms = facet['terms'];
        return (
            <div className="facet" hidden={terms.length === 0} style={{width: this.props.width}} data-field={field}>
                <h5>{title}</h5>
                <div className="facet-list nav">
                    <div>
                        {terms.map(function (term) {
                            return <ExpTerm {...this.props} key={term.key} term={term} total={total}/>;
                        }.bind(this))}
                    </div>
                </div>
            </div>
        );
    }
});

var ExpTerm = module.exports.ExpTerm = React.createClass({

    getInitialState: function() {
        return {
            field: this.props.facet['field'],
            term: this.props.term['key']
        }
    },

    handleClick: function(e) {
        e.preventDefault();
        this.props.changeFilters(this.state.field, this.state.term);
    },

    render: function () {

        var field = this.state.field;
        var term = this.state.term;
        var title = this.props.title || term;
        var passSets = 0;

        // Correct field to match that of browse page
        if (this.props.experimentsOrSets == 'experiments'){
            field = 'experiments_in_set.' + field;
        }

        // for now, remove facet info on exp numbers
        var termExperiments = siftExperiments(this.props.experimentSetListJSON, this.props.expSetFilters, this.props.ignoredFilters, field, term);

        // find number of experiments or experiment sets
        if (this.props.experimentsOrSets == 'sets'){
            this.props.experimentSetListJSON.forEach(function(expSet){
                var intersection = new Set(expSet.experiments_in_set.filter(x => termExperiments.has(x)));
                if(intersection.size > 0){
                    passSets += 1;
                }
            }, this);
        } else {
            // We have list of experiments, not experiment sets.
            var intersection = new Set(this.props.experimentSetListJSON.filter(x => termExperiments.has(x)));
            if(intersection.size > 0){
                passSets += intersection.size;
            }
        }


        var expCount = termExperiments.size;
        var selected = false;
        if(this.props.expSetFilters[field] && this.props.expSetFilters[field].has(term)){
            selected = true;
        }
        return (
            <li className={selected ? "selected" : null} key={term}>
                <a className={selected ? "expterm-selected selected" : "expterm"} href="#" onClick={this.handleClick}>
                    <span className="pull-left facet-selector">{selected ? <i className="icon icon-times-circle"></i> : ''}</span>
                    <span className="facet-item">
                        {title}
                    </span>
                    <span className="pull-right facet-count">{passSets}</span>
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
        var experiment_set = graph[i];
        if(experiment_set.experiments_in_set){
            var experiments = experiment_set.experiments_in_set;
            for(var j=0; j < experiments.length; j++){
                passExperiments.add(experiments[j]);
            }
        } else {
            passExperiments.add(experiment_set);
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
