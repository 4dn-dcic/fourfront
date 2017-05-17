'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
var store = require('../store');
import { ajax, console, object, isServerSide, Filters, layout, analytics } from './util';
import * as vizUtil from './viz/utilities';
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


    static isSelected(
        termKey     = (this.state.term || this.props.term || {key:null}).key,
        facetField  = (this.state.facet || this.props.facet || {field:null}).field,
        expsOrSets  = this.props.experimentsOrSets || 'sets'
    ){
        var standardizedFieldKey = Filters.standardizeFieldKey(facetField, expsOrSets);
        if (
            this.props.expSetFilters[standardizedFieldKey] &&
            this.props.expSetFilters[standardizedFieldKey].has(termKey)
        ){
            return true;
        }
        return false;
    }


    static propTypes = {
        'facet'             : PropTypes.shape({
            'field'             : PropTypes.string.isRequired
        }).isRequired,
        'term'              : PropTypes.shape({
            'key'               : PropTypes.string.isRequired,
            'doc_count'         : PropTypes.number
        }).isRequired,
        'expSetFilters'     : PropTypes.object.isRequired,
        'experimentsOrSets' : PropTypes.string
    }


    static defaultProps = {
        'experimentsOrSets' : 'sets'
    }

    constructor(props){
        super(props);
        this.isSelected = Term.isSelected.bind(this);
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
        var existingFilters = _.clone(this.props.expSetFilters);
        this.setState(
            { filtering : true },
            () => {
                this.props.handleChangeFilter(
                    this.props.facet.field,
                    this.props.term.key,
                    () => this.setState({ filtering : false })
                );

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
        );
    }

    render() {
        var selected = this.isSelected();
        return (
            <li className={"facet-list-element" + (selected ? " selected" : '')} key={this.props.term.key}>
                <a className="term" data-selected={selected} href="#" onClick={this.handleClick} data-term={this.props.term.key}>
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
        'experimentSetListJSON' : PropTypes.array,
        'expSetFilters'         : PropTypes.object.isRequired,
        'changeFilter'          : PropTypes.func,           // Executed on term click
        'experimentsOrSets'     : PropTypes.string,         // Defaults to 'sets'
        'width'                 : PropTypes.any,
        'extraClassname'        : PropTypes.string,
        'schemas'               : PropTypes.object
    }

    static defaultProps = {
        width: 'inherit'
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.isStatic = this.isStatic.bind(this);
        this.isEmpty = this.isEmpty.bind(this);
        this.isSelected = this.isStatic(props) ? Term.isSelected.bind(this, props.facet.terms[0].key) : () => false;
        this.handleExpandToggleClick = this.handleExpandToggleClick.bind(this);
        this.handleStaticClick = this.handleStaticClick.bind(this);
        this.state = {
            'facetOpen' : typeof props.defaultFacetOpen === 'boolean' ? props.defaultFacetOpen : true
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

    isStatic(props = this.props){ return !!(props.facet.terms.length === 1); }
    isEmpty(props = this.props) { return !!(props.facet.terms.length === 0); }

    handleExpandToggleClick(e) {
        e.preventDefault();
        this.setState({facetOpen: !this.state.facetOpen});
    }

    handleStaticClick(e) {
        e.preventDefault();
        if (!this.isStatic()) return false;
        var existingFilters = _.clone(this.props.expSetFilters);
        this.setState(
            { filtering : true },
            () => {
                this.props.changeFilter(
                    this.props.facet.field,
                    this.props.facet.terms[0].key,
                    ()=> {
                        this.setState({ filtering : false });
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
                )
            }
        );
    }

    render() {
        var facet = this.props.facet;
        var standardizedFieldKey = Filters.standardizeFieldKey(facet.field, this.props.experimentsOrSets);
        var selected = this.isSelected();
        if (typeof facet.title !== 'string'){
            facet = _.extend({}, facet, {
                'title' : Filters.Field.toName(facet.field, this.props.schemas || null)
            });
        }

        var schemaProperty = Filters.Field.getSchemaProperty(facet.field, this.props.schemas);
        var description = schemaProperty && schemaProperty.description;

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
                >
                    <div className="facet-static-row clearfix">
                        <h5 className="facet-title">
                            <span className="inline-block" data-tip={description} data-place="right">{ facet.title || facet.field }</span>
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
                <h5 className="facet-title" onClick={this.handleExpandToggleClick}>
                    <span className="right">
                        <i className={
                            "icon icon-fw " +
                            (this.state.facetOpen ? "icon-angle-down" : "icon-angle-right")
                        }></i>
                    </span>
                    <span className="inline-block" data-tip={description} data-place="right">{ facet.title || facet.field }</span>
                </h5>
                { this.state.facetOpen ?
                <div className="facet-list nav">
                    <div>
                        { facet.terms.map((term)=>
                            <Term
                                {...this.props}
                                key={term.key}
                                term={term}
                                facet={this.props.facet}
                                total={facet.total}
                                href={this.props.href || this.context.location_href}
                                expSetFilters={this.props.expSetFilters}
                                handleChangeFilter={this.props.changeFilter}
                            />
                        )}
                    </div>
                </div>
                :
                null
                }
            </div>
        );

    }

}



let cachedEmptyFacets = [];

export default class FacetList extends React.Component {

    /**
     * @deprecated
     * 
     * For client-side filtering of experiments only.
     * Fills facet objects with 'terms' and 'total' properties, as well as terms' counts.
     * Modifies incompleteFacets param in place to turn the array of object into "complete" facets.
     *
     * @param {Object[]} incompleteFacets - Array of facet objects. Each should have field and title keys/values.
     * @param {Object[]} exps - Array of experiment objects, obtained from @graph or experiments_in_set property on context.
     */
    static fillFacetTermsAndCountFromExps(incompleteFacets, exps){

        incompleteFacets.forEach(function(facet, facetIndex){

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

        return incompleteFacets; // Now complete.

    }

    /**
     * Compare two arrays of experiments to check if contain same experiments, by their ID.
     * @returns {boolean} true if equal.
     */
    static compareExperimentLists(exps1, exps2){
        if (exps1.length != exps2.length) return false;
        for (var i; i < exps1.length; i++){
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
        for (var i; i < facets.length; i++){
            if (typeof facets[i].total !== 'number') return false;
            if (typeof facets[i].terms === 'undefined') return false;
        }
        return true;
    }


    static getFacets(props){
        if (Array.isArray(props.facets) && props.facets.length > 0) return props.facets;
        var facets = cachedEmptyFacets.slice(0);
        if (facets.length > 0){
            return FacetList.fillFacetTermsAndCountFromExps(
                facets.filter(function(f){ return props.filterFacetsFxn(f, props, {}); }),
                props.experimentSetListJSON
            );
        }
        return [];
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
        'expSetFilters' : PropTypes.object.isRequired,
        'experimentSetListJSON' : PropTypes.array.isRequired, // JSON data of experiments, if not in context['@graph']
        'orientation' : PropTypes.string,   // 'vertical' or 'horizontal'
        'urlPath' : PropTypes.string,       // context['@id'], used to get search param.
        'experimentsOrSets' : PropTypes.string,
        'expIncompleteFacets' : PropTypes.array,
        'title' : PropTypes.string,         // Title to put atop FacetList
        'className' : PropTypes.string,     // Extra class
        'href' : PropTypes.string,


        'context' : PropTypes.object,       // Unused -ish
        'onFilter' : PropTypes.func,        // Unused
        'fileFormats' : PropTypes.array,    // Unused
        'restrictions' : PropTypes.object,  // Unused
        'mode' : PropTypes.string,          // Unused
        'onChange' : PropTypes.func         // Unused
    }


    static defaultProps = {
        'orientation'       : 'vertical',
        'facets'            : null,
        'experimentsOrSets' : 'sets',
        'urlPath'           : null,
        'title'             : "Properties",
        'filterFacetsFxn'   : function(facet, props, state){
            if (facet.field.substring(0, 6) === 'audit.'){
                return false; // Ignore audit facets temporarily, esp if logged out.
            }
            if (facet.field === 'experimentset_type') return false;
            if (facet.field === 'type') return false;
            return true;
        },
        'debug'             : false,
    }


    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.loadFacets = this.loadFacets.bind(this);
        this.clearFilters = this.clearFilters.bind(this);
        this.changeFilter = this.changeFilter.bind(this);
        this.searchQueryTerms = this.searchQueryTerms.bind(this);

        var state = {
            'facetsLoaded' : false,
            'mounted' : false,
            'facets' : FacetList.getFacets(props)
        };

        if (state.facets.length > 0) state.facetsLoaded = true;
        this.state = state;
    }


    /**
     * If not using props passed in through props, and incomplete facets not available (yet) in redux store,
     * AJAX them in, save to redux store, then fill up w/ terms.
     *
     * @see FacetList.constructor()
     */
    componentDidMount(){

        if (this.props.debug) console.log(
            'Mounted FacetList on ' + (this.props.urlPath || 'unknown page.'),
            '\nFacets Provided: ' + this.props.facets,
            'Facets Loaded: ' + this.state.facetsLoaded
        );

        if (!this.props.facets && !this.state.facetsLoaded && !isServerSide()){
            this.loadFacets((facets) => {
                cachedEmptyFacets = facets;
                facets = FacetList.fillFacetTermsAndCountFromExps(
                    this.filterFacets(cachedEmptyFacets),
                    this.props.experimentSetListJSON
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


    /**
     * Deprecated description:
     * Since there's a good chunk of intensive potentially UI-blocking calculation,
     * minimize updates to only when necessary, i.e. only when relevant-to-facetlist-changes props
     * or state has changed. Child components' state changes, e.g. show/collapse facet, are not affected.
     */
    shouldComponentUpdate(nextProps, nextState){
        if (
            this.state.mounted !== nextState.mounted ||
            (Array.isArray(nextProps.facets) && nextProps.facets.length > 0) ||
            this.props.expSetFilters !== nextProps.expSetFilters ||
            !_.isEqual(nextProps.facets, this.props.facets) ||
            !_.isEqual(this.state.facets, nextState.facets) ||
            this.state.facetsLoaded !== nextState.facetsLoaded ||
            nextProps.schemas !== this.props.schemas
        ){
            if (this.props.debug) console.log('%cWill','color: green', 'update FacetList');
            return true;
        }
        if (this.props.debug) console.log('%cWill not', 'color: red', 'update FacetList');
        return false;
    }


    componentWillReceiveProps(nextProps){
        if (
            this.props.expSetFilters !== nextProps.expSetFilters ||
            !_.isEqual(nextProps.facets, this.props.facets)
        ){

            if (nextProps.facets && this.props.facets !== nextProps.facets){
                if (this.props.debug) console.log('FacetList props.facets updated.');
            }

        }
    }


    /** Load list of available facets via AJAX once & reuse via redux store. */
    loadFacets(callback = null){
        var facetType = (this.props.itemTypes && Array.isArray(this.props.itemTypes) && this.props.itemTypes[0]) ||
            (this.props.experimentsOrSets == 'sets' ? 'ExperimentSet' : 'Experiment');

        ajax.load('/facets?type=' + facetType + '&format=json', function(resultFacets){
            if (this.props.debug) console.log('Loaded Facet List via AJAX.', resultFacets);
            if (typeof callback == 'function') callback(resultFacets);
        }.bind(this));
    }


    clearFilters(e) {
        e.preventDefault();
        setTimeout(()=> Filters.saveChangedFilters({}, true, this.props.href) , 0);
    }


    changeFilter(field, term, callback) {
        return Filters.changeFilter(
            field,
            term,
            this.props.experimentsOrSets,
            this.props.expSetFilters,
            callback,
            false,      // Only return new expSetFilters vs saving them == set to false
            true,
            this.props.href
        );
    }


    searchQueryTerms(){
        var urlPath = this.props.urlPath || this.props.href || this.props.context && this.props.context['@id'] ? this.props.context['@id'] : null;
        if (!urlPath) return null;
        return urlPath && url.parse(urlPath, true).query;
    }


    filterFacets(facets){
        return facets.filter((f)=>{
            return this.props.filterFacetsFxn(f, this.props, this.state);
        });
    }


    renderFacets(facets){
        return facets
            .filter((facet)=> this.props.filterFacetsFxn(facet, this.props, this.state))
            .map(facet =>
            <Facet
                experimentSetListJSON={ this.props.experimentSetListJSON || this.props.context['@graph'] || null }
                expSetFilters={this.props.expSetFilters}
                changeFilter={this.changeFilter}
                key={facet.field}
                facet={facet}
                width="inherit"
                experimentsOrSets={this.props.experimentsOrSets}
                href={this.props.href}
                schemas={this.props.schemas}
                defaultFacetOpen={ !this.state.mounted ? false : !!(layout.responsiveGridState() !== 'xs') }
                mounted={this.state.mounted}
            />
        )
    }


    render() {
        if (this.props.debug) console.log('render facetlist');

        var exptypeDropdown;
        var facets = null;
        if (Array.isArray(this.props.facets) && this.props.facets.length > 0) {
            facets = this.props.facets;
        } else {
            facets = this.state.facets || null;
        }
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

        var clearButton = this.props.expSetFilters && !_.isEmpty(this.props.expSetFilters) ? true : false;
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
                        <div className={"col-xs-6 clear-filters-control" + (clearButton ? '' : ' placeholder')}>
                            <a href="#" onClick={this.clearFilters} className={"btn btn-xs rounded " + clearButtonStyle}>
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

