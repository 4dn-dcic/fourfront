var React = require('react');
var url = require('url');
var queryString = require('query-string');
var _ = require('underscore');

var FacetList = module.exports.FacetList = React.createClass({

    contextTypes: {
        session: React.PropTypes.object,
        hidePublicAudits: React.PropTypes.bool
    },

    getDefaultProps: function() {
        return {orientation: 'vertical'};
    },

    clearFilters: function(e) {
        e.preventDefault()
        store.dispatch({
            type : {'expSetFilters' : {}}
        });
    },

    render: function() {
        var context = this.props.context,
            term = this.props.term,
            facets = this.props.facets, // Get all facets, and "normal" facets, meaning non-audit facets
            loggedIn = this.context.session && this.context.session['auth.userid'],
            regularFacets = [],
            exptypeDropdown;

        if (!facets.length && this.props.mode != 'picker') return <div />;

        // ignore all audit facets for the time being
        var normalFacets = facets.filter(facet => facet.field.substring(0, 6) !== 'audit.');
        var clearButton = Object.keys(this.props.expSetFilters).length === 0 ? false : true;
        var searchQuery = context && context['@id'] && url.parse(context['@id']).search;
        if (searchQuery) {
            // Convert search query string to a query object for easy parsing
            var terms = queryString.parse(searchQuery);
        }
        normalFacets.map(facet => {
            if ((facet.field == 'type') || (!loggedIn && this.context.hidePublicAudits && facet.field.substring(0, 6) === 'audit.')) {
                return;
            } else if (facet.field != 'experimentset_type') {
                regularFacets.push(<Facet {...this.props} key={facet.field} facet={facet} width="inherit" />);
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
        return {width: 'inherit'};
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
            <div className="facet" hidden={terms.length === 0} style={{width: this.props.width}}>
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
        var graph = this.props.context['@graph'];
        var passSets = 0;
        // for now, remove facet info on exp numbers
        var termExperiments = siftExperiments(graph, this.props.expSetFilters, this.props.ignoredFilters, field, term);
        // find number of exp sets
        graph.map(function(expSet){
            var intersection = new Set(expSet.experiments_in_set.filter(x => termExperiments.has(x)));
            if(intersection.size > 0){
                passSets += 1;
            }
        });
        var expCount = termExperiments.size;
        var selected = false;
        if(this.props.expSetFilters[field] && this.props.expSetFilters[field].has(term)){
            selected = true;
        }
        return (
            <li id={selected ? "selected" : null} key={term}>
                <a className={selected ? "expterm-selected" : "expterm"} id={selected ? "selected" : null} href="" onClick={this.handleClick}>
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