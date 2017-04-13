'use strict';
var React = require('react');
var queryString = require('query-string');
var url = require('url');
var _ = require('underscore');
var globals = require('./globals');
var search = module.exports;
var ReactTooltip = require('react-tooltip');
var { ajax, console, object, isServerSide, Filters, layout } = require('./util');

var Listing = module.exports.Listing = function (props) {
    // XXX not all panels have the same markup
    var context;
    if (props['@id']) {
        context = props;
        props = {context: context,  key: context['@id']};
    }
    var ListingView = globals.listing_views.lookup(props.context);
    return <ListingView {...props} />;
};

var PickerActionsMixin = module.exports.PickerActionsMixin = {
    contextTypes: {actions: React.PropTypes.array},
    renderActions: function() {
        if (this.context.actions && this.context.actions.length) {
            return (
                <div className="pull-right">
                    {this.context.actions.map(action => React.cloneElement(action, {id: this.props.context['@id']}))}
                </div>
            );
        } else {
            return <span/>;
        }
    }
};

var Item = module.exports.Item = React.createClass({
    mixins: [PickerActionsMixin],
    render: function() {
        var result = this.props.context;
        var title = globals.listing_titles.lookup(result)({context: result});
        var item_type = result['@type'][0];
        return (
            <li>
                <div className="clearfix">
                    {this.renderActions()}
                    {result.accession ?
                        <div className="pull-right type sentence-case search-meta">
                            <p>{item_type}: {' ' + result['accession']}</p>
                        </div>
                    : null}
                    <div className="accession">
                        <a href={result['@id']}>{title}</a>
                    </div>
                    <div className="data-row">
                        {result.description}
                    </div>
                </div>
            </li>
        );
    }
});
globals.listing_views.register(Item, 'Item');

var Biosample = module.exports.Biosample = React.createClass({
    render: function() {
        var result = this.props.context;
        return (
            <li>
                <div className="clearfix">
                    <div className="pull-right search-meta">
                        <p className="type meta-title">Biosample</p>
                        <p className="type">{' ' + result['accession']}</p>
                    </div>
                    <div className="accession">
                        <a href={result['@id']}>
                            {result['biosource_summary']}
                        </a>
                    </div>
                    <div className="data-row">
                        <div><strong>Modifications: </strong>{result['modifications_summary']}</div>
                        <div><strong>Treatments: </strong>{result['treatments_summary']}</div>
                    </div>
                </div>
            </li>
        );
    }
});
globals.listing_views.register(Biosample, 'Biosample');


var Biosource = module.exports.Biosource = React.createClass({
    render: function() {
        var result = this.props.context;
        var organism;
        if (result['individual']){
            organism = result['individual']['organism']['name'];
        }
        return (
            <li>
                <div className="clearfix">
                    <div className="pull-right search-meta">
                        <p className="type meta-title">Biosource</p>
                        <p className="type">{' ' + result['accession']}</p>
                    </div>
                    <div className="accession">
                        <a href={result['@id']}>
                            {result['biosource_name']}
                        </a>
                    </div>
                    <div className="data-row">
                        <div><strong>{result['biosource_type']}</strong></div>
                        <div><strong>{organism}</strong></div>
                    </div>
                </div>
            </li>
        );
    }
});
globals.listing_views.register(Biosource, 'Biosource');


var Experiment = module.exports.Experiment = React.createClass({
    render: function() {
        var result = this.props.context;
        return (
            <li>
                <div className="clearfix">
                    <div className="pull-right search-meta">
                        <p className="type meta-title">Experiment</p>
                        <p className="type">{' ' + result['accession']}</p>
                        <p className="type">{' ' + result['award']['project']}</p>
                    </div>
                    <div className="accession">
                        <a href={result['@id']}>
                            {result['experiment_summary']}
                        </a>
                    </div>
                    <div className="data-row">
                        <div><strong>Modifications: </strong>{result['biosample']['modifications_summary']}</div>
                        <div><strong>Treatments: </strong>{result['biosample']['treatments_summary']}</div>
                        <div><strong>Lab: </strong>{result['lab']['title']}</div>
                    </div>
                </div>
            </li>
        );
    }
});
globals.listing_views.register(Experiment, 'Experiment');


// If the given term is selected, return the href for the term
function termSelected(term, field, filters) {
    for (var filter in filters) {
        if (filters[filter]['field'] == field && filters[filter]['term'] == term) {
            return url.parse(filters[filter]['remove']).search;
        }
    }
    return null;
}

// Determine whether any of the given terms are selected
function countSelectedTerms(terms, field, filters) {
    var count = 0;
    for(var oneTerm in terms) {
        if(termSelected(terms[oneTerm].key, field, filters)) {
            count++;
        }
    }
    return count;
}

var Term = search.Term = React.createClass({

    getHref : function(selected = termSelected(this.props.term['key'], this.props.facet['field'], this.props.filters)){
        var href;
        if (selected && !this.props.canDeselect) {
            href = null;
        } else if (selected) {
            href = selected;
        } else {
            href = this.props.searchBase + this.props.facet['field'] + '=' + encodeURIComponent(this.props.term['key']).replace(/%20/g, '+');
        }
        return href;
    },

    render: function () {
        var filters = this.props.filters;
        var term = this.props.term['key'];
        var count = this.props.term['doc_count'];
        var title = this.props.title || term;
        var field = this.props.facet['field'];
        var selected = termSelected(term, field, filters);
        var href = this.getHref(selected);

        return (
            <li className={"facet-list-element" + (selected ? " selected" : '')} id={selected ? "selected" : null} key={term}>
                <a className="term" data-selected={selected} href={href} onClick={href ? this.props.onFilter : null}>
                    <span className="pull-left facet-selector">
                        {selected ? <i className="icon icon-times-circle icon-fw"></i> : '' }
                    </span>
                    <span className="facet-item">
                        {title}
                    </span>
                    <span className="facet-count">{count}</span>
                </a>
            </li>
        );
    }
});

var TypeTerm = search.TypeTerm = React.createClass({
    render: function () {
        var term = this.props.term['key'];
        var filters = this.props.filters;
        var total = this.props.total;
        return <Term {...this.props} title={term} filters={filters} total={total} />;
    }
});

class InfoIcon extends React.Component{
    render() {
        if (!this.props.children) return null;
        return (
            <i className="icon icon-info-circle" data-tip={this.props.children}/>
        );
    }
}


var Facet = search.Facet = React.createClass({

    statics : {

    },

    getDefaultProps: function() {
        return {width: 'inherit'};
    },

    getInitialState: function () {
        return {
            facetOpen: false
        };
    },

    handleClick: function () {
        this.setState({facetOpen: !this.state.facetOpen});
    },

    render: function() {
        var facet = this.props.facet;
        var filters = this.props.filters;
        var title = facet['title'];
        var field = facet['field'];
        var total = facet['total'];
        var termID = title.replace(/\s+/g, '');
        var terms = facet['terms'].filter(function (term) {
            if (term.key) {
                for(var filter in filters) {
                    if(filters[filter].term === term.key) {
                        return true;
                    }
                }
                return term.doc_count > 0;
            } else {
                return false;
            }
        });
        var moreTerms = terms.slice(5);
        var TermComponent = field === 'type' ? TypeTerm : Term;
        var selectedTermCount = countSelectedTerms(moreTerms, field, filters);
        var moreTermSelected = selectedTermCount > 0;
        var canDeselect = (!facet.restrictions || selectedTermCount >= 2);
        var moreSecClass = 'collapse' + ((moreTermSelected || this.state.facetOpen) ? ' in' : '');
        var seeMoreClass = 'btn btn-link' + ((moreTermSelected || this.state.facetOpen) ? '' : ' collapsed');
        // get type of this object for getSchemaProperty (if type="Item", no tooltips)
        var thisType = 'Item';
        var searchBits = this.props.searchBase.split(/[\?&]+/);
        var filteredBits = searchBits.filter(bit => bit.slice(0,5) === 'type=' && bit.slice(5,9) !== 'Item');
        if (filteredBits.length == 1){ // if multiple types, don't use any tooltips
            thisType = filteredBits[0].slice(5);
        }
        var schemaProperty = Filters.Field.getSchemaProperty(field, this.props.schemas, thisType, true);
        var description = schemaProperty && schemaProperty.description;
        return (
            <div className="facet" hidden={terms.length === 0} style={{width: this.props.width}}>
                <h5 className="facet-title">
                    <span className="inline-block">{ title || field }</span>
                    <InfoIcon children={description}/>
                </h5>
                <ul className="facet-list nav">
                    <div>
                        {terms.slice(0, 5).map(function (term) {
                            return <TermComponent {...this.props} key={term.key} term={term} filters={filters} total={total} canDeselect={canDeselect} />;
                        }.bind(this))}
                    </div>
                    {terms.length > 5 ?
                        <div id={termID} className={moreSecClass}>
                            {moreTerms.map(function (term) {
                                return <TermComponent {...this.props} key={term.key} term={term} filters={filters} total={total} canDeselect={canDeselect} />;
                            }.bind(this))}
                        </div>
                    : null}
                    {(terms.length > 5 && !moreTermSelected) ?
                        <label className="pull-left">
                                <small>
                                    <button type="button" className={seeMoreClass} data-toggle="collapse" data-target={'#'+termID} onClick={this.handleClick} />
                                </small>
                        </label>
                    : null}
                </ul>
            </div>
        );
    }
});


var FacetList = search.FacetList = React.createClass({
    contextTypes: {
        session: React.PropTypes.bool,
    },

    getDefaultProps: function() {
        return {orientation: 'vertical'};
    },

    render: function() {
        var {context, term} = this.props;
        var loggedIn = this.context.session;

        // Get all facets, and "normal" facets, meaning non-audit facets
        var facets = this.props.facets;
        var normalFacets = facets.filter(facet => facet.field.substring(0, 6) !== 'audit.');

        var filters = this.props.filters;
        var width = 'inherit';
        if (!facets.length && this.props.mode != 'picker') return <div />;
        var hideTypes;
        if (this.props.mode == 'picker') {
            hideTypes = false;
        } else {
            hideTypes = filters.filter(filter => filter.field === 'type').length === 1 && normalFacets.length > 1;
        }
        if (this.props.orientation == 'horizontal') {
            width = (100 / facets.length) + '%';
        }

        // See if we need the Clear Filters link or not. context.clear_filters
        var clearButton; // JSX for the clear button
        var searchQuery = context && context['@id'] && url.parse(context['@id']).search;
        if (searchQuery) {
            // Convert search query string to a query object for easy parsing
            var terms = queryString.parse(searchQuery);

            // See if there are terms in the query string aside from `searchTerm`. We have a Clear
            // Filters button if we do
            var nonPersistentTerms = _(Object.keys(terms)).any(term => term !== 'searchTerm');
            clearButton = nonPersistentTerms && terms['searchTerm'];

            // If no Clear Filters button yet, do the same check with `type` in the query string
            if (!clearButton) {
                nonPersistentTerms = _(Object.keys(terms)).any(term => term !== 'type');
                clearButton = nonPersistentTerms && terms['type'];
            }
        }

        return (

            <div>
                <div className={"facets-container facets " + this.props.orientation}>
                    <div className="row facets-header">
                        <div className="col-xs-6 facets-title-column">
                            <i className="icon icon-fw icon-filter"></i>
                            &nbsp;
                            <h4 className="facets-title">Properties</h4>
                        </div>
                        <div className={"col-xs-6 clear-filters-control" + (clearButton ? '' : ' placeholder')}>
                            <a href={context.clear_filters} className={"btn btn-xs rounded btn-outline-default"}>
                                <i className="icon icon-times"></i> Clear All
                            </a>
                        </div>
                    </div>
                    {facets.map(facet => {
                        if ((hideTypes && facet.field == 'type') || (!loggedIn && facet.field.substring(0, 6) === 'audit.')) {
                            return <span key={facet.field} />;
                        } else {
                            return <Facet {...this.props} key={facet.field} facet={facet} filters={filters}
                                            width={width} />;
                        }
                    })}
                </div>
            </div>
        );
    }
});

var ResultTable = search.ResultTable = React.createClass({

    getDefaultProps: function() {
        return {
            restrictions: {},
            searchBase: ''
        };
    },

    childContextTypes: {actions: React.PropTypes.array},
    getChildContext: function() {
        return {
            actions: this.props.actions
        };
    },

    getSearchType: function(facets){
        var specificSearchType;
        // Check to see if we are searching among multiple data types
        // If only one type, use that as the search title
        for (var i = 0; i < facets.length; i++){
            if (facets[i]['field'] && facets[i]['field'] == 'type'){
                if (facets[i]['terms'][0]['doc_count'] === facets[i]['total']
                    && facets[i]['total'] > 0 && facets[i]['terms'][0]['key'] !== 'Item'){
                    // it's a single data type, so grab it
                    specificSearchType = facets[i]['terms'][0]['key'];
                }else{
                    specificSearchType = 'Multiple type';
                }
            }
            return specificSearchType;
        }
    },

    render: function() {
        const batchHubLimit = 100;
        var context = this.props.context;
        var results = context['@graph'];
        var total = context['total'];
        var batch_hub_disabled = total > batchHubLimit;
        var filters = context['filters'];
        var label = 'results. ';
        var searchBase = this.props.searchBase;
        var trimmedSearchBase = searchBase.replace(/[\?|\&]limit=all/, "");
        var show_link;
        var facets = context['facets'].map(function(facet) {
            if (this.props.restrictions[facet.field] !== undefined) {
                facet = _.clone(facet);
                facet.restrictions = this.props.restrictions[facet.field];
                facet.terms = facet.terms.filter(term => _.contains(facet.restrictions, term.key));
            }
            return facet;
        }.bind(this));

        // get type of search for building the page title
        var specificSearchType = this.getSearchType(facets);

        // Get a sorted list of batch hubs keys with case-insensitive sort
        var batchHubKeys = [];
        if (context.batch_hub && Object.keys(context.batch_hub).length) {
            batchHubKeys = Object.keys(context.batch_hub).sort((a, b) => {
                var aLower = a.toLowerCase();
                var bLower = b.toLowerCase();
                return (aLower > bLower) ? 1 : ((aLower < bLower) ? -1 : 0);
            });
        }

        // Map view icons to svg icons
        var view2svg = {
            'table': 'table',
            'th': 'matrix'
        };

        // Create "show all" or "show 25" links if necessary
        show_link = ((total > results.length && searchBase.indexOf('limit=all') === -1) ?
            <a href={searchBase ? searchBase + '&limit=all' : '?limit=all'}
                    onClick={this.onFilter}>View All</a>
            :
            <span>{results.length > 25 ?
                <a href={trimmedSearchBase ? trimmedSearchBase : "/search/"}
                    onClick={this.onFilter}>View 25</a>
                : null}
            </span>);

        return (
            <div>
                <div className="row search-title">
                    <h3>{specificSearchType ? specificSearchType : 'Unresolved type'} search</h3>
                    <div className="row">
                        <h4 className='inline-subheader'>Showing {results.length} of {total} {label} {show_link}</h4>
                    </div>
                </div>
                <div className="row">
                    {facets.length ? <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList {...this.props} facets={facets} filters={filters}
                                    searchBase={searchBase ? searchBase + '&' : searchBase + '?'} onFilter={this.onFilter} />
                    </div> : ''}
                    <div className="col-sm-7 col-md-8 col-lg-9">
                        <ul className="nav result-table" id="result-table">
                            {results.length ?
                                results.map(function (result) {
                                    return Listing({context:result, key: result['@id']});
                                })
                            : null}
                        </ul>
                    </div>
                </div>
            </div>
        );
    },

    onFilter: function(e) {
        var search = e.currentTarget.getAttribute('href');
        this.props.onChange(search);
        e.stopPropagation();
        e.preventDefault();
    }
});

var Search = search.Search = React.createClass({
    contextTypes: {
        location_href: React.PropTypes.string,
        navigate: React.PropTypes.func
    },

    render: function() {
        var context = this.props.context;
        var results = context['@graph'];
        var notification = context['notification'];
        var searchBase = url.parse(this.context.location_href).search || '';
        var facetdisplay = context.facets && context.facets.some(function(facet) {
            return facet.total > 0;
        });
        return (
            <div>
                {facetdisplay ?
                    <div className="panel data-display main-panel">
                        <ResultTable {...this.props} key={undefined} searchBase={searchBase} onChange={this.context.navigate} />
                    </div>
                : <div className='error-page'><h4>{notification}</h4></div>}
            </div>
        );
    }
});

globals.content_views.register(Search, 'Search');
