'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import * as store from './../../../store';
import { Collapse, Fade } from 'react-bootstrap';
import { ajax, console, object, isServerSide, Filters, Schemas, layout, analytics, JWT } from './../../util';
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
        'experimentsOrSets' : PropTypes.string,
        'isTermSelected'    : PropTypes.func.isRequired
    }


    static defaultProps = {
        'experimentsOrSets' : 'sets',
        'getHref' : function(){ return '#'; }
    }

    constructor(props){
        super(props);
        this.experimentSetsCount = this.experimentSetsCount.bind(this);
        this.standardizeFieldKey = this.standardizeFieldKey.bind(this);
        this.handleClick = _.debounce(this.handleClick.bind(this), 500, true);
        this.state = {
            'filtering' : false
        };
    }

    experimentSetsCount(){
        return (this.props.term && this.props.term.doc_count) || 0;
    }


    // Correct field to match that of browse page (ExpSet)
    standardizeFieldKey(field = this.props.facet.field, reverse = false){
        return Filters.standardizeFieldKey(field, this.props.experimentsOrSets, reverse);
    }

    handleClick(e) {
        e.preventDefault();
        var existingFilters;
        if (this.props.expSetFilters) existingFilters = _.clone(this.props.expSetFilters);

        this.setState(
            { filtering : true },
            () => {
                this.props.onFilter(
                    this.props.facet.field,
                    this.props.term.key,
                    () => this.setState({ filtering : false })
                );

                if (this.props.expSetFilters){
                    var isUnset = false;
                    if (
                        existingFilters &&
                        existingFilters[this.props.facet.field] &&
                        existingFilters[this.props.facet.field].has(this.props.term.key)
                    ) isUnset = true;
                    analytics.event('FacetList', (isUnset ? 'Unset' : 'Set') + ' Filter', {
                        'eventLabel' : 'Field: ' + this.props.facet.field + ', Term: ' + this.props.term.key,
                        'dimension1' : analytics.getStringifiedCurrentFilters(this.props.expSetFilters)
                    });
                }
            }
        );
    }

    render() {
        //var selected = this.isSelectedExpItem();
        var selected = this.props.isTermSelected(this.props.term.key, (this.state.facet || this.props.facet || {field:null}).field, this.props.expsOrSets || 'sets');
        var title = this.props.title || Schemas.Term.toName(this.props.facet.field, this.props.term.key);
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
                    <span className="facet-item" data-tip={title.length > 30 ? title : null}>{ title }</span>
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

    renderTerms(){
        var facet = this.props.facet;
        var terms = facet.terms;
        if (terms.length > this.props.persistentCount){
            var persistentTerms = terms.slice(0, this.props.persistentCount + 1);
            var collapsibleTerms = terms.slice(this.props.persistentCount + 1);

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
                        <i className="icon icon-fw icon-plus"/> View {terms.length - this.props.persistentCount} More
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
                    <div className="view-more-button" onClick={this.handleExpandListToggleClick}>
                        { expandButtonTitle }
                    </div>
                </div>
            );
        } else {
            return (
                <div className="facet-list nav">
                    { facet.terms.map(this.renderIndividualTerm) }
                </div>
            );
        }
    }

    render(){
        var { facet, standardizedFieldKey, tooltip } = this.props;

        var indicator = (
                <Fade in={this.state.facetClosing || !this.state.facetOpen}>
                    <span className="pull-right closed-terms-count" data-tip={facet.terms.length + " options"}>
                        { _.range(0, Math.min(Math.ceil(facet.terms.length / 3), 8)).map((c)=>
                            <i className="icon icon-ellipsis-v" style={{ opacity : ((c + 1) / 5) * (0.67) + 0.33 }} key={c}/>
                        )}
                    </span>
                </Fade>
            );
        // List of terms
        return (
            <div
                className={"facet row" + (this.state.facetOpen ? ' open' : ' closed') + (this.state.facetClosing ? ' closing' : '')}
                hidden={false/*this.isEmpty()*/}
                data-field={standardizedFieldKey}
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
                { this.state.facetOpen || this.state.facetClosing ? 
                    <Collapse in={this.state.facetOpen && !this.state.facetClosing} transitionAppear children={this.renderTerms()}/>
                : null }
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
    
    static propTypes = {
        'facet'                 : PropTypes.shape({
            'field'                 : PropTypes.string.isRequired,    // Name of nested field property in experiment objects, using dot-notation.
            'title'                 : PropTypes.string,               // Human-readable Facet Term
            'total'                 : PropTypes.number,               // Total experiments (or terms??) w/ field
            'terms'                 : PropTypes.array.isRequired      // Possible terms
        }),
        'defaultFacetOpen'      : PropTypes.bool,
        'onFilter'              : PropTypes.func,           // Executed on term click
        'experimentsOrSets'     : PropTypes.string,         // Defaults to 'sets'
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
        return (
            props.facet.terms.length === 1 &&
            props.facet.total <= _.reduce(props.facet.terms, function(m, t){ return m + (t.doc_count || 0); }, 0)
        ); 
    }
    isEmpty(props = this.props) { return !!(props.facet.terms.length === 0); }

    handleStaticClick(e) {
        e.preventDefault();
        if (!this.isStatic()) return false;
        if (this.props.expSetFilters) var existingFilters = _.clone(this.props.expSetFilters);
        this.setState(
            { filtering : true },
            () => {
                this.props.onFilter(
                    this.props.facet.field,
                    this.props.facet.terms[0].key,
                    ()=> {
                        this.setState({ filtering : false });
                        if (this.props.expSetFilters){
                            var isUnset = false;
                            if (
                                existingFilters &&
                                existingFilters[this.props.facet.field] &&
                                existingFilters[this.props.facet.field].has(this.props.facet.terms[0].key)
                            ) isUnset = true;
                            analytics.event('FacetList', (isUnset ? 'Unset' : 'Set') + ' Filter', {
                                'eventLabel' : 'Field: ' + this.props.facet.field + ', Term: ' + this.props.facet.terms[0].key,
                                'dimension1' : analytics.getStringifiedCurrentFilters(existingFilters)
                            });
                        }
                    }
                );
            }
        );
    }

    render() {
        var facet = this.props.facet;
        var standardizedFieldKey = Filters.standardizeFieldKey(facet.field, this.props.experimentsOrSets);
        if (typeof facet.title !== 'string'){
            facet = _.extend({}, facet, {
                'title' : Schemas.Field.toName(facet.field, this.props.schemas || null)
            });
        }

        var schemaProperty, description;
        try {
            schemaProperty = Schemas.Field.getSchemaProperty(standardizedFieldKey, this.props.schemas, this.props.itemTypeForSchemas || 'ExperimentSet');
            description = schemaProperty && schemaProperty.description;
        } catch(e){
            console.warn("Could not find schema property (for description tooltip) for field " + standardizedFieldKey, e);
        }

        if (this.isStatic()){
            // Only one term
            var selected = this.props.isTermSelected(facet.terms[0].key, standardizedFieldKey);
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
                            }>
                                <i className={
                                    "icon icon-fw " +
                                    (this.state.filtering ? 'icon-spin icon-circle-o-notch' :
                                        ( selected ? 'icon-times-circle' : 'icon-circle' )
                                    )
                                }></i> { Schemas.Term.toName(facet.field, facet.terms[0].key) }
                            </span>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <FacetTermsList
                    {...this.props}
                    standardizedFieldKey={standardizedFieldKey}
                    tooltip={description}
                />
            );
        }

        

    }

}



let cachedEmptyFacets = null;

export class ReduxExpSetFiltersInterface extends React.Component {

    static getFacets(props){
        if (Array.isArray(props.facets) && props.facets.length > 0) return props.facets;
        if (!cachedEmptyFacets) return [];
        var facets = cachedEmptyFacets.slice(0);
        if (facets.length > 0){
            return ReduxExpSetFiltersInterface.fillFacetTermsAndCountFromExps(
                facets,
                props.experimentSets
            );
        }
        return [];
    }

    /**
     * For client-side filtering of experiments only.
     * Fills facet objects with 'terms' and 'total' properties, as well as terms' counts.
     * Modifies incompleteFacets param in place to turn the array of object into "complete" facets.
     *
     * @param {Object[]} incompleteFacets - Array of facet objects. Each should have field and title keys/values.
     * @param {Object[]} exps - Array of experiment objects, obtained from @graph or experiments_in_set property on context.
     */
    static fillFacetTermsAndCountFromExps(incompleteFacets, exps){

        var facets = incompleteFacets.slice(0);
        facets.forEach(function(facet, facetIndex){

            var fieldHierarchyLevels = facet.field.replace('experiments_in_set.', '').split('.'); // E.g. [biosample, biosource, individual,..]
            var termCounts = {};

            // Loop through experiments to find all terms and counts per term.
            for (var i = 0; i < exps.length; i++){

                var facetTerm = object.getNestedProperty(exps[i], fieldHierarchyLevels);

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

        return facets; // Now complete.

    }

    

    static propTypes = {
        'facets' : PropTypes.array,
        'experimentsOrSets' : PropTypes.oneOf([ 'sets', 'experiments' ]),
        'expSetFilters' : PropTypes.object,
        'href' : PropTypes.string.isRequired,
        'experimentSets' : PropTypes.array, // Required if no facets supplied.
        'filterOnClientSide' : PropTypes.bool
    }

    static defaultProps = {
        'facets' : null,
        'experimentsOrSets' : 'sets',
        'filterOnClientSide' : false
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadFacets = this.loadFacets.bind(this);
        this.changeFilter = this.changeFilter.bind(this);
        this.clearFilters = this.clearFilters.bind(this);
        this.render = this.render.bind(this);
    }

    /**
     * If not using props passed in through props, and incomplete facets not available (yet) in redux store,
     * AJAX them in, save to redux store, then fill up w/ terms.
     *
     * @see FacetList.constructor()
     */
    componentDidMount(){

        if (this.props.debug) console.log(
            'Mounted FacetList/ReduxExpSetFiltersInterface on ' + (this.props.href || 'unknown page.'),
            '\nFacets Provided: ' + this.props.facets,
            'Facets Loaded: ' + Array.isArray(cachedEmptyFacets)
        );

        if (!this.props.facets && !isServerSide() && !Array.isArray(cachedEmptyFacets)){
            this.loadFacets((facets) => {

                cachedEmptyFacets = facets.map((f)=>{
                    return _.extend({}, f, { 'field' : Filters.standardizeFieldKey(f.field, this.props.experimentsOrSets, false) });
                });
                facets = ReduxExpSetFiltersInterface.fillFacetTermsAndCountFromExps(
                    cachedEmptyFacets,
                    this.props.experimentSets
                );
                if (Array.isArray(facets) && facets.length > 0){
                    this.setState({ 'facets' : facets, 'facetsLoaded' : true, 'mounted' : true }, function(){
                        ReactTooltip.rebuild();
                    });
                }
            });
        } else {
            // @see getInitialState
            this.setState({ 'mounted' : true });
        }
    }

    /** Load list of available facets via AJAX once & reuse via redux store. */
    loadFacets(callback = null){
        var facetType = (this.props.itemTypes && Array.isArray(this.props.itemTypes) && this.props.itemTypes[0]) ||
            (this.props.experimentsOrSets === 'sets' ? 'ExperimentSet' : 'Experiment');

        ajax.load('/facets?type=' + facetType, (resultFacets) => {
            if (this.props.debug) console.log('Loaded Facet List via AJAX.', resultFacets);
            if (typeof callback == 'function') callback(resultFacets);
        });
    }

    changeFilter(field, term, callback) {

        var filtrationArgs = [
            field,
            term,
            this.props.experimentsOrSets,
            this.props.expSetFilters,
            callback,
            false,
            this.props.filterOnClientSide ? false : true,
            this.props.href
        ];

        return Filters.changeFilter.apply(Filters.changeFilter, filtrationArgs);
    }

    clearFilters(e) {
        e.preventDefault();
        setTimeout(()=> Filters.saveChangedFilters({}, !(this.props.filterOnClientSide), this.props.href) , 0);
    }

    render(){
        var oldChildProps = this.props.children.props;
        var newChildProps = {
            'facets' : ReduxExpSetFiltersInterface.getFacets(this.props),
            'onFilter' : this.changeFilter,
            'onClearFilters' : this.clearFilters
        };
        newChildProps.experimentsOrSets = oldChildProps.experimentsOrSets || this.props.experimentsOrSets;
        newChildProps.experimentSets = oldChildProps.experimentSets || this.props.experimentSets;
        newChildProps.title = oldChildProps.title || this.props.title;
        newChildProps.filterFacetsFxn = oldChildProps.filterFacetsFxn || this.props.filterFacetsFxn;
        newChildProps.href = oldChildProps.href || this.props.href;
        newChildProps.schemas = oldChildProps.schemas || this.props.schemas;
        newChildProps.expSetFilters = oldChildProps.expSetFilters || this.props.expSetFilters;
        newChildProps.showClearFiltersButton = newChildProps.expSetFilters && !_.isEmpty(newChildProps.expSetFilters) ? true : false;
        newChildProps.session = oldChildProps.session || this.props.session;
        return React.cloneElement(this.props.children, newChildProps);
    }

}

export class FacetList extends React.Component {

    /**
     * @deprecated
     * 
     * Compare two arrays of experiments to check if contain same experiments, by their ID.
     * @returns {boolean} true if equal.
     */
    static compareExperimentLists(exps1, exps2){
        if (exps1.length != exps2.length) return false;
        for (var i = 0; i < exps1.length; i++){
            if (exps1[i]['@id'] != exps2[i]['@id']) return false;
        }
        return true;
    }

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
        'experimentsOrSets' : PropTypes.string,
        'title' : PropTypes.string,         // Title to put atop FacetList
        'className' : PropTypes.string,     // Extra class
        'href' : PropTypes.string,

        'onFilter' : PropTypes.func,        // What happens when Term is clicked.


        'context' : PropTypes.object,       // Unused -ish
        'fileFormats' : PropTypes.array,    // Unused
        'restrictions' : PropTypes.object,  // Unused
        'mode' : PropTypes.string,          // Unused
        'onChange' : PropTypes.func         // Unused
    }


    static filterFacetsForBrowse(facet, props, state){
        if (facet.field.substring(0, 6) === 'audit.'){
            if (props.session){
                var details = JWT.getUserDetails();
                if (details && details.groups && details.groups.indexOf('admin') > -1){
                    return true;
                }
            }
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
        return true;
    }

    static filterFacetsForSearch(facet, props, state){
        if (facet.field.indexOf('experiments.experiment_sets.') > -1) return false;
        if (facet.field === 'experiment_sets.@type') return false;
        if (facet.field === 'experiment_sets.experimentset_type') return false;
        if (facet.field.substring(0, 6) === 'audit.'){
            if (props.session){
                var details = JWT.getUserDetails();
                if (details && details.groups && details.groups.indexOf('admin') > -1){
                    return true;
                }
            }
            return false; // Ignore audit facets temporarily, esp if logged out.
        }
        return true;
    }


    static defaultProps = {
        'orientation'       : 'vertical', // Probably unnecessary.
        'facets'            : null,
        'experimentsOrSets' : 'sets',
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
        this.filterFacets = this.filterFacets.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    componentWillReceiveProps(nextProps){
        if (
            !_.isEqual(nextProps.facets, this.props.facets)
        ){

            if (nextProps.facets && this.props.facets !== nextProps.facets){
                if (this.props.debug) console.log('FacetList props.facets updated.');
            }

        }
    }

    searchQueryTerms(){
        var href = this.props.href || this.props.context && this.props.context['@id'] ? this.props.context['@id'] : null;
        if (!href) return null;
        return href && url.parse(href, true).query;
    }


    filterFacets(facets){
        return facets.filter((f)=>{
            return this.props.filterFacetsFxn(f, this.props, this.state);
        });
    }


    renderFacets(facets, maxTermsToShow = 12){

        facets = _.uniq(facets.filter((facet)=> this.props.filterFacetsFxn(facet, this.props, this.state)), false, function(f){ return f.field });

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

        return facets.map((facet, i) =>
            <Facet
                onFilter={this.props.onFilter}
                key={facet.field}
                facet={facet}
                width="inherit"
                experimentsOrSets={this.props.experimentsOrSets}
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
            if (!this.state.facetsLoaded && (!Array.isArray(this.props.facets) || this.props.facets.length === 0)) {
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

        //var terms = this.searchQueryTerms();
        //var searchBase = url.parse(this.context.location_href).search || '';
        //searchBase = searchBase && searchBase.length > 0 ? searchBase + '&' : searchBase + '?';

        return (
            <div>
                {/*
                <div className="exptype-box">
                    { exptypeDropdown }
                </div>
                */}
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
                    { this.renderFacets(facets) }
                </div>
            </div>
        );
    }

}
