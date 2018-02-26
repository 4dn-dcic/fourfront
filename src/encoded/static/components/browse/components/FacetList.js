'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import * as store from './../../../store';
import { Collapse, Fade } from 'react-bootstrap';
import { ajax, console, object, isServerSide, Filters, Schemas, layout, analytics, JWT, navigate } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { PartialList } from './../../item-pages/components';
import ReactTooltip from 'react-tooltip';

/**
 * Component to render out the FacetList for the Browse and ExperimentSet views.
 * It can work with AJAX-ed in back-end data, as is used for the Browse page, or
 * with client-side data from back-end-provided Experiments, as is used for the ExperimentSet view.
 *
 * Some of this code is not super clean and eventually could use some refactoring.
 *
 * @module {Component} facetlist
 */

/**
 * Used to render individual terms in FacetList.
 *
 * @memberof module:facetlist.Facet
 * @class Term
 * @type {Component}
 */

class Term extends React.Component {

    /**
     * For non-AJAX filtration.
     *
     * @param {Set} termMatchExps - Set of matched exps.
     * @param {Array} allExpsOrSets - All exps or sets.
     * @param {string} [expsOrSets='sets'] Whether to count expsets or exps.
     * @returns {number} Count
     */
    static getPassExpsCount(termMatchExps, allExpsOrSets, expsOrSets = 'sets'){
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
    }


    static propTypes = {
        'facet'             : PropTypes.shape({
            'field'             : PropTypes.string.isRequired
        }).isRequired,
        'term'              : PropTypes.shape({
            'key'               : PropTypes.string.isRequired,
            'doc_count'         : PropTypes.number
        }).isRequired,
        'isTermSelected'    : PropTypes.func.isRequired
    }


    static defaultProps = {
        'getHref' : function(){ return '#'; }
    }

    constructor(props){
        super(props);
        this.experimentSetsCount = this.experimentSetsCount.bind(this);
        this.handleClick = _.debounce(this.handleClick.bind(this), 500, true);
        this.state = {
            'filtering' : false
        };
    }

    experimentSetsCount(){
        return (this.props.term && this.props.term.doc_count) || 0;
    }

    handleClick(e) {
        e.preventDefault();
        this.setState({ filtering : true }, () => {
            this.props.onFilter( this.props.facet.field, this.props.term.key, () => this.setState({ filtering : false }) );
        });
    }

    render() {
        //var selected = this.isSelectedExpItem();
        var selected = this.props.isTermSelected(this.props.term.key, (this.state.facet || this.props.facet || {field:null}).field, this.props.expsOrSets || 'sets');
        var title = this.props.title || Schemas.Term.toName(this.props.facet.field, this.props.term.key);
        if (!title || title === 'null' || title === 'undefined') title = 'None';
        return (
            <li className={"facet-list-element" + (selected ? " selected" : '')} key={this.props.term.key} data-key={this.props.term.key}>
                <a className="term" data-selected={selected} href="#" onClick={this.handleClick} data-term={this.props.term.key}>
                    <span className="pull-left facet-selector">
                        { this.state.filtering ?
                            <i className="icon icon-circle-o-notch icon-spin icon-fw"></i>
                            : selected ?
                                <i className="icon icon-times-circle icon-fw"></i>
                                : '' }
                    </span>
                    <span className="facet-item" data-tip={title.length > 30 ? title : null}>{ title || "None" }</span>
                    <span className="facet-count">{this.experimentSetsCount()}</span>
                </a>
            </li>
        );
    }

}


class InfoIcon extends React.Component{
    render(){
        if (!this.props.children) return null;
        return (
            <i className="icon icon-info-circle" data-tip={this.props.children}/>
        );
    }
}

class FacetTermsList extends React.Component {

    static defaultProps = {
        'persistentCount' : 10
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.handleOpenToggleClick = this.handleOpenToggleClick.bind(this);
        this.handleExpandListToggleClick = this.handleExpandListToggleClick.bind(this);
        this.renderIndividualTerm = this.renderIndividualTerm.bind(this);
        this.renderTerms = this.renderTerms.bind(this);
        this.state = {
            'facetOpen' : typeof props.defaultFacetOpen === 'boolean' ? props.defaultFacetOpen : true,
            'facetClosing' : false,
            'expanded' : false
        };
    }

    componentWillReceiveProps(nextProps){
        // We might want to change defaultFacetOpen right after mount, so let us re-do getInitialState.
        if (
            (nextProps.mounted && !this.props.mounted) &&
            (typeof nextProps.defaultFacetOpen === 'boolean' && nextProps.defaultFacetOpen !== this.props.defaultFacetOpen)
        ){
            this.setState({ facetOpen : nextProps.defaultFacetOpen });
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (pastState.facetOpen !== this.state.facetOpen){
            ReactTooltip.rebuild();
        }
    }

    handleOpenToggleClick(e) {
        e.preventDefault();
        var willBeOpen = !this.state.facetOpen;
        if (!willBeOpen){
            this.setState({'facetClosing': true}, ()=>{
                setTimeout(()=>{
                    this.setState({ 'facetOpen' : false, 'facetClosing' : false });
                }, 350);
            });
        } else {
            this.setState({'facetOpen': true});
        }
    }

    handleExpandListToggleClick(e){
        e.preventDefault();
        this.setState({'expanded' : !this.state.expanded });
    }

    renderIndividualTerm(term){
        var facet = this.props.facet;
        return (
            <Term
                {...this.props}
                key={term.key}
                term={term}
                facet={this.props.facet}
                total={facet.total}
                href={this.props.href}
                onFilter={this.props.onFilter}
                isTermSelected={this.props.isTermSelected}
            />
        );
    }

    renderTerms(terms = null){
        var { facet, persistentCount } = this.props;
        if (!terms) terms = facet.terms;

        if (terms.length > this.props.persistentCount){
            var persistentTerms = terms.slice(0, persistentCount);
            var collapsibleTerms = terms.slice(persistentCount);

            var remainingTermsCount = !this.state.expanded ? _.reduce(collapsibleTerms, function(m, term){
                return m + (term.doc_count || 0);
            }, 0) : null;

            var expandButtonTitle = (
                this.state.expanded ?
                    <span>
                        <i className="icon icon-fw icon-minus"/> Collapse
                    </span>
                    :
                    <span>
                        <i className="icon icon-fw icon-plus"/> View {terms.length - persistentCount} More
                        <span className="pull-right">{ remainingTermsCount }</span>
                    </span>
            );

            return (
                <div className="facet-list nav">
                    <PartialList
                        persistent={persistentTerms.map(this.renderIndividualTerm)}
                        collapsible={collapsibleTerms.map(this.renderIndividualTerm)}
                        open={this.state.expanded}
                    />
                    <div className="view-more-button" onClick={this.handleExpandListToggleClick} children={expandButtonTitle} />
                </div>
            );
        } else {
            return <div className="facet-list nav" children={_.map(terms, this.renderIndividualTerm)} />;
        }
    }

    render(){
        var { facet, tooltip } = this.props;

        var terms = facet.terms;

        // Filter out type=Item for now (hardcode)
        if (facet.field === 'type') terms = _.filter(terms, function(t){ return t !== 'Item' && t && t.key !== 'Item'; });

        var indicator = (
            <Fade in={this.state.facetClosing || !this.state.facetOpen}>
                <span className="pull-right closed-terms-count" data-tip={terms.length + " options"}>
                    { _.range(0, Math.min(Math.ceil(terms.length / 3), 8)).map((c)=>
                        <i className="icon icon-ellipsis-v" style={{ opacity : ((c + 1) / 5) * (0.67) + 0.33 }} key={c}/>
                    )}
                </span>
            </Fade>
        );

        // List of terms
        return (
            <div
                className={"facet row" + (this.state.facetOpen ? ' open' : ' closed') + (this.state.facetClosing ? ' closing' : '')}
                hidden={false} data-field={facet.field}
            >
                <h5 className="facet-title" onClick={this.handleOpenToggleClick}>
                    <span className="expand-toggle">
                        <i className={
                            "icon icon-fw " +
                            (this.state.facetOpen && !this.state.facetClosing ? "icon-minus" : "icon-plus")
                        }></i>
                    </span>
                    <span className="inline-block" data-tip={tooltip} data-place="right">{ facet.title || facet.field }</span>
                    { indicator }
                </h5>
                <Collapse in={this.state.facetOpen && !this.state.facetClosing} children={this.renderTerms(terms)}/>
            </div>
        );
    }
}

/**
 * Used to render individual facet fields and their available terms in FacetList.
 *
 * @memberof module:facetlist
 * @class Facet
 * @type {Component}
 */
class Facet extends React.Component {

    static isStatic(facet){
        return (
            facet.terms.length === 1 &&
            facet.total <= _.reduce(facet.terms, function(m, t){ return m + (t.doc_count || 0); }, 0)
        );
    }

    static propTypes = {
        'facet'                 : PropTypes.shape({
            'field'                 : PropTypes.string.isRequired,    // Name of nested field property in experiment objects, using dot-notation.
            'title'                 : PropTypes.string,               // Human-readable Facet Term
            'total'                 : PropTypes.number,               // Total experiments (or terms??) w/ field
            'terms'                 : PropTypes.array.isRequired      // Possible terms
        }),
        'defaultFacetOpen'      : PropTypes.bool,
        'onFilter'              : PropTypes.func,           // Executed on term click
        'width'                 : PropTypes.any,
        'extraClassname'        : PropTypes.string,
        'schemas'               : PropTypes.object,
        'isTermSelected'        : PropTypes.func.isRequired,
        'facetOrder'            : PropTypes.number
    }

    static defaultProps = {
        width: 'inherit'
    }

    constructor(props){
        super(props);
        this.isStatic = this.isStatic.bind(this);
        this.isEmpty = this.isEmpty.bind(this);
        this.handleStaticClick = this.handleStaticClick.bind(this);
        this.state = {
            'facetOpen' : typeof props.defaultFacetOpen === 'boolean' ? props.defaultFacetOpen : true
        };
    }

    isStatic(props = this.props){
        return Facet.isStatic(props.facet);
    }

    isEmpty(props = this.props) { return !!(props.facet.terms.length === 0); }

    handleStaticClick(e) {
        e.preventDefault();
        if (!this.isStatic()) return false;
        this.setState({ filtering : true }, () => {
            this.props.onFilter( this.props.facet.field, this.props.facet.terms[0].key, () => this.setState({ filtering : false }) );
        });
    }

    render() {
        var facet = this.props.facet;
        if (typeof facet.title !== 'string'){
            facet = _.extend({}, facet, {
                'title' : Schemas.Field.toName(facet.field, this.props.schemas || null)
            });
        }

        var schemaProperty, description;
        try {
            schemaProperty = Schemas.Field.getSchemaProperty(facet.field, this.props.schemas, this.props.itemTypeForSchemas || 'ExperimentSet');
            description = schemaProperty && schemaProperty.description;
        } catch(e){
            console.warn("Could not find schema property (for description tooltip) for field " + facet.field, e);
        }

        if (this.isStatic()){
            // Only one term
            var selected = this.props.isTermSelected(facet.terms[0].key, facet.field);
            var termName = Schemas.Term.toName(facet.field, facet.terms[0].key);
            if (!termName || termName === 'null' || termName === 'undefined') termName = 'None';
            return (
                <div
                    className={
                        "facet static row" +
                        ( selected ? ' selected' : '') +
                        ( this.state.filtering ? ' filtering' : '') +
                        ( this.props.extraClassname ? ' ' + this.props.extraClassname : '' )
                    }
                    style={{width: this.props.width}}
                    data-field={facet.field}
                >
                    <div className="facet-static-row clearfix">
                        <h5 className="facet-title">
                            <span className="inline-block" data-tip={description} data-place="right">&nbsp;{ facet.title || Schemas.Field.toName(facet.field, this.props.schemas || null) }</span>
                        </h5>
                        <div className={
                            "facet-item term" +
                            (selected? ' selected' : '') +
                            (this.state.filtering ? ' filtering' : '')
                        }>
                            <span onClick={this.handleStaticClick} title={
                                'All results have ' +
                                facet.terms[0].key +
                                ' as their ' +
                                (facet.title || facet.field ).toLowerCase() + '; ' +
                                (selected ?
                                    'currently active as portal-wide filter.' :
                                    'not currently active as portal-wide filter.'
                                )
                            }>
                                <i className={
                                    "icon icon-fw " +
                                    (this.state.filtering ? 'icon-spin icon-circle-o-notch' :
                                        ( selected ? 'icon-times-circle' : 'icon-circle' )
                                    )
                                }/>{ termName }
                            </span>
                        </div>
                    </div>
                </div>
            );
        } else {
            return <FacetTermsList {...this.props} tooltip={description} />;
        }



    }

}



/**
 * Use this function as part of SearchView and BrowseView to be passed down to FacetList.
 * Should be bound to a component instance, with `this` providing 'href', 'context' (with 'filters' property), and 'navigate'.
 * 
 * @param {string} field - Field for which a Facet term was clicked on. 
 * @param {string} term - Term clicked on.
 * @param {function} callback - Any function to execute afterwards.
 */
export function onFilterHandlerMixin(field, term, callback){

    var unselectHrefIfSelected = Filters.getUnselectHrefIfSelectedFromResponseFilters(term, field, this.props.context.filters);

    var targetSearchHref = Filters.buildSearchHref(
        unselectHrefIfSelected,
        field, term, this.props.searchBase || this.props.href
    );

    // Ensure only 1 type filter is selected at once. Unselect any other type= filters if setting new one.
    if (field === 'type'){
        if (!(unselectHrefIfSelected)){
            var parts = url.parse(targetSearchHref, true);
            if (Array.isArray(parts.query.type)){
                var types = parts.query.type;
                if (types.length > 1){
                    var queryParts = _.clone(parts.query);
                    delete queryParts[""]; // Safety
                    queryParts.type = encodeURIComponent(term); // Only 1 Item type selected at once.
                    var searchString = queryString.stringify(queryParts);
                    parts.search = searchString && searchString.length > 0 ? ('?' + searchString) : '';
                    targetSearchHref = url.format(parts);
                }
            }
        }
    }

    (this.props.navigate || navigate)(targetSearchHref, { 'dontScrollToTop' : true });
    setTimeout(callback, 100);
}

export class FacetList extends React.Component {

    /**
     * @deprecated
     *
     * @returns {boolean} True if filled.
     */
    static checkFilledFacets(facets){
        if (!facets.length) return false;
        for (var i = 0; i < facets.length; i++){
            if (typeof facets[i].total !== 'number') return false;
            if (typeof facets[i].terms === 'undefined') return false;
        }
        return true;
    }

    static onFilterHandlerMixin = onFilterHandlerMixin

    static propTypes = {
        'facets' : PropTypes.arrayOf(PropTypes.shape({
            'field' : PropTypes.string,           // Nested field in experiment(_set), using dot-notation.
            'terms' : PropTypes.arrayOf(PropTypes.shape({
                'doc_count' : PropTypes.number,   // Exp(set)s matching term
                'key' : PropTypes.string          // Unique key/title of term.
            })),
            'title' : PropTypes.string,           // Title of facet
            'total' : PropTypes.number            // # of experiment(_set)s
        })),
        /**
         * In lieu of facets, which are only generated by search.py, can
         * use and format schemas, which are available to experiment-set-view.js through item.js.
         */
        'schemas' : PropTypes.object,
        // { '<schemaKey : string > (active facet categories)' : Set (active filters within category) }
        'orientation' : PropTypes.string,   // 'vertical' or 'horizontal'
        'title' : PropTypes.string,         // Title to put atop FacetList
        'className' : PropTypes.string,     // Extra class
        'href' : PropTypes.string,

        'onFilter' : PropTypes.func,        // What happens when Term is clicked.


        'context' : PropTypes.object,       // Unused -ish
        'fileFormats' : PropTypes.array,    // Unused
        'restrictions' : PropTypes.object,  // Unused
        'mode' : PropTypes.string,          // Unused
        'onChange' : PropTypes.func,        // Unused
        'submissionFacetList' : PropTypes.bool // Used for hiding dataType facet
    }

    static isLoggedInAsAdmin(){
        var details = JWT.getUserDetails();
        if (details && Array.isArray(details.groups) && details.groups.indexOf('admin') > -1){
            return true;
        }
        return false;
    }


    static filterFacetsForBrowse(facet, props, state){

        if (props.browseBaseState){
            var browseBaseParams = navigate.getBrowseBaseParams(props.browseBaseState);
            if (typeof browseBaseParams[facet.field] !== 'undefined') return false;
        }

        if (facet.field.substring(0, 6) === 'audit.'){
            if (props.session && FacetList.isLoggedInAsAdmin()) return true;
            return false; // Ignore audit facets temporarily, if not logged in as admin.
        }
        if (facet.field === 'experimentset_type') return false;
        if (facet.field === 'type') return false;
        return true;
    }

    static filterFacetsForExpSetView(facet, props, state){
        // Lets extend Browse version w/ more strictness (remove audits).
        var browseFilterResult = FacetList.filterFacetsForBrowse.apply(this, arguments);
        if (!browseFilterResult) return false;
        if (facet.field.substring(0, 25) === 'experiments_in_set.audit.'){
            return false; // Ignore audit facets, we have a different view for them.
        }
        // For now we exclude these fields because they aren't available to us when EXP is embedded as part of EXPSET.
        // In future, we should, do something better. Like AJAX all experiments in so we have all properties that they can be filtered by.
        if (facet.field === 'experiments_in_set.award.project') return false;
        if (facet.field === 'experiments_in_set.lab.title') return false;
        if (facet.field === 'experiments_in_set.status') return false;
        if (facet.field === 'experiments_in_set.publications_of_exp.display_title') return false;
        return true;
    }

    static filterFacetsForSearch(facet, props, state){
        if (facet.field.indexOf('experiments.experiment_sets.') > -1) return false;
        if (facet.field === 'experiment_sets.@type') return false;
        if (facet.field === 'experiment_sets.experimentset_type') return false;
        if (facet.field.substring(0, 6) === 'audit.'){
            if (props.session && FacetList.isLoggedInAsAdmin()) return true;
            return false; // Ignore audit facets temporarily, esp if logged out.
        }
        // logic for removing Data Type facet on submissions page-title
        if (facet.field === 'type' && props.submissionFacetList) return false;
        return true;
    }


    static defaultProps = {
        'orientation'       : 'vertical', // Probably unnecessary.
        'facets'            : null,
        'title'             : "Properties",
        'filterFacetsFxn'   : FacetList.filterFacetsForBrowse, // Filters out 'Item Type', etc.
        'debug'             : false,
        'showClearFiltersButton' : false,

        /**
         * These 'default' functions don't do anything except show parameters passed.
         * Callback must be called because it changes Term's 'loading' state back to false.
         */
        'onFilter'          : function(field, term, callback){
            // Set redux filter accordingly, or update search query/href.
            console.log('FacetList: props.onFilter(' + field + ', ' + term + ', callback)');
            if (typeof callback === 'function'){
                setTimeout(callback, 1000);
            }
        },
        'onClearFilters'    : function(e, callback){
            // Clear Redux filters, or go base search url.
            e.preventDefault();
            console.log('FacetList: props.onClearFilters(e, callback)');
            if (typeof callback === 'function'){
                setTimeout(callback, 1000);
            }
        },
        'isTermSelected'    : function (termKey, facetField, expsOrSets = 'sets'){
            // Check against responseContext.filters, or expSetFilters in Redux store.
            return false;
        }
    }


    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.searchQueryTerms = this.searchQueryTerms.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    componentWillReceiveProps(nextProps){
        if (!this.props.debug) return;

        if (!_.isEqual(nextProps.facets, this.props.facets)){
            if (nextProps.facets && this.props.facets !== nextProps.facets) console.log('FacetList props.facets updated.');
        }
    }

    searchQueryTerms(){
        var href = this.props.href || this.props.context && this.props.context['@id'] ? this.props.context['@id'] : null;
        if (!href) return null;
        return href && url.parse(href, true).query;
    }

    renderFacets(facets = this.props.facets, maxTermsToShow = 12){

        facets = _.uniq(
            _.filter(facets, (facet) => this.props.filterFacetsFxn(facet, this.props, this.state)),
            false, function(f){ return f.field; }
        );

        var facetIndexWherePastXTerms = _.reduce(facets, (m, facet, index) => {
            if (m.end) return m;
            m.facetIndex = index;
            m.termCount = m.termCount + Math.min( // Take into account 'view more' button
                facet.terms.length,
                this.props.persistentCount || FacetTermsList.defaultProps.persistentCount
            );
            if (m.termCount > maxTermsToShow) m.end = true;
            return m;
        }, { facetIndex : 0, termCount: 0, end : false }).facetIndex;

        return _.map(facets, (facet, i) =>
            <Facet
                onFilter={this.props.onFilter}
                key={facet.field}
                facet={facet}
                width="inherit"
                href={this.props.href}
                schemas={this.props.schemas}
                defaultFacetOpen={ !this.state.mounted ? false : !!(
                    facet.terms.filter((t)=> this.props.isTermSelected(t.key, facet.field)).length ||
                    (
                        layout.responsiveGridState() !== 'xs' &&
                        i < (facetIndexWherePastXTerms || 1)
                    )
                )}
                mounted={this.state.mounted}
                isTermSelected={this.props.isTermSelected}
                itemTypeForSchemas={this.props.itemTypeForSchemas}
            />
        );
    }


    render() {
        if (this.props.debug) console.log('render facetlist');

        var exptypeDropdown;
        var facets = this.props.facets;
        if (!facets || !facets.length) {
            if (!this.state.facetsLoaded && (!Array.isArray(facets) || facets.length === 0)) {
                return (
                    <div className="text-center" style={{ padding : "162px 0", fontSize : '26px', color : "#aaa" }}>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </div>
                );
            } else {
                return null;
            }
        }

        var clearButtonStyle = (this.props.className && this.props.className.indexOf('with-header-bg') > -1) ?
            "btn-outline-white" : "btn-outline-default";

        var facetElements = this.renderFacets(this.props.facets);

        var staticFacetElements = _.filter(facetElements, function(f){
            return Facet.isStatic(f.props.facet);
        });

        facetElements = _.difference(facetElements, staticFacetElements);

        return (
            <div className={
                "facets-container facets " +
                this.props.orientation +
                ( this.props.className ? ' ' + this.props.className : '' )
            }>
                <div className="row facets-header">
                    <div className="col-xs-6 facets-title-column">
                        <i className="icon icon-fw icon-filter"></i>
                        &nbsp;
                        <h4 className="facets-title">{ this.props.title }</h4>
                    </div>
                    <div className={"col-xs-6 clear-filters-control" + (this.props.showClearFiltersButton ? '' : ' placeholder')}>
                        <a href="#" onClick={this.props.onClearFilters} className={"btn btn-xs rounded " + clearButtonStyle}>
                            <i className="icon icon-times"></i> Clear All
                        </a>
                    </div>
                </div>
                { facetElements }
                { staticFacetElements.length > 0 ?
                    <div className="row facet-list-separator">
                        <div className="col-xs-12">
                            { staticFacetElements.length } Common Properties
                        </div>
                    </div>
                : null }
                { staticFacetElements }
            </div>
        );
    }

}
