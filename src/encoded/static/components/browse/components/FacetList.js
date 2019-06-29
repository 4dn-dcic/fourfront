'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Collapse, Fade } from 'react-bootstrap';
import { console, Filters, Schemas, layout, analytics, navigate, DateUtility } from './../../util';
import { PartialList } from './../../item-pages/components/PartialList';
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

class Term extends React.PureComponent {

    static propTypes = {
        'facet'             : PropTypes.shape({
            'field'             : PropTypes.string.isRequired
        }).isRequired,
        'term'              : PropTypes.shape({
            'key'               : PropTypes.string.isRequired,
            'doc_count'         : PropTypes.number
        }).isRequired,
        'isTermSelected'    : PropTypes.func.isRequired,
        'onClick'           : PropTypes.func.isRequired
    };

    constructor(props){
        super(props);
        this.handleClick = _.debounce(this.handleClick.bind(this), 500, true);
        this.state = {
            'filtering' : false
        };
    }

    handleClick(e) {
        var { facet, term, onClick } = this.props;
        e.preventDefault();
        this.setState({ 'filtering' : true }, () => {
            onClick(facet, term, e, () => this.setState({ 'filtering' : false }));
        });
    }

    /**
     * INCOMPLETE -
     *   For future, in addition to making a nice date range title, we should
     *   also ensure that can send a date range as a filter and be able to parse it on
     *   back-end.
     * Handle date fields, etc.
     */
    customTitleRender(){
        const { facet, term } = this.props;

        if (facet.aggregation_type === 'range'){
            return (
                (typeof term.from !== 'undefined' ? Schemas.Term.toName(facet.field, term.from, true) : '< ') +
                (typeof term.from !== 'undefined' && typeof term.to !== 'undefined' ? ' - ' : '') +
                (typeof term.to !== 'undefined' ? Schemas.Term.toName(facet.field, term.to, true) : ' >')
            );
        }

        if (facet.aggregation_type === 'date_histogram'){
            var interval = Filters.getDateHistogramIntervalFromFacet(facet);
            if (interval === 'month'){
                return <DateUtility.LocalizedTime timestamp={term.key} formatType="date-month" localize={false} />;
            }
        }

        return null;
    }

    render() {
        const { term, facet, isTermSelected } = this.props;
        const { filtering } = this.state;
        const selected    = isTermSelected(term, facet);
        let title       = this.customTitleRender() || Schemas.Term.toName(facet.field, term.key) || term.key;
        const count       = (term && term.doc_count) || 0;

        if (!title || title === 'null' || title === 'undefined'){
            title = 'None';
        }

        return (
            <li className={"facet-list-element" + (selected ? " selected" : '')} key={term.key} data-key={term.key}>
                <a className="term" data-selected={selected} href="#" onClick={this.handleClick} data-term={term.key}>
                    <span className="pull-left facet-selector">
                        { filtering ?
                            <i className="icon icon-circle-o-notch icon-spin icon-fw"></i>
                            : selected ?
                                <i className="icon icon-times-circle icon-fw"></i>
                                : '' }
                    </span>
                    <span className="facet-item" data-tip={title.length > 30 ? title : null}>{ title }</span>
                    <span className="facet-count">{ count }</span>
                </a>
            </li>
        );
    }

}

class FacetTermsList extends React.Component {

    static defaultProps = {
        'persistentCount' : 10
    };

    constructor(props){
        super(props);
        this.handleOpenToggleClick = this.handleOpenToggleClick.bind(this);
        this.handleExpandListToggleClick = this.handleExpandListToggleClick.bind(this);
        this.renderTerms = this.renderTerms.bind(this);
        this.state = {
            'facetOpen'     : typeof props.defaultFacetOpen === 'boolean' ? props.defaultFacetOpen : true,
            'facetClosing'  : false,
            'expanded'      : false
        };
    }

    componentDidUpdate(pastProps, pastState){
        const { mounted, defaultFacetOpen } = this.props;
        const { facetOpen } = this.state;
        if (
            (
                !pastProps.mounted && mounted &&
                typeof defaultFacetOpen === 'boolean' && defaultFacetOpen !== pastProps.defaultFacetOpen
            ) || (
                defaultFacetOpen === true && !pastProps.defaultFacetOpen && !facetOpen
            )
        ){
            this.setState({ 'facetOpen' : true });
        }
        if (pastState.facetOpen !== facetOpen){
            ReactTooltip.rebuild();
        }
    }

    handleOpenToggleClick(e) {
        e.preventDefault();
        this.setState(function({ facetOpen }){
            const willBeOpen = !facetOpen;
            if (willBeOpen) {
                return { 'facetOpen': true };
            } else {
                return { 'facetClosing': true };
            }
        }, ()=>{
            setTimeout(()=>{
                this.setState(function({ facetOpen, facetClosing }){
                    if (facetClosing){
                        return { 'facetOpen' : false, 'facetClosing' : false };
                    }
                    return null;
                });
            }, 350);
        });
    }

    handleExpandListToggleClick(e){
        e.preventDefault();
        this.setState(function({ expanded }){
            return { 'expanded' : !expanded };
        });
    }


    renderTerms(terms){
        const { facet, persistentCount, onTermClick } = this.props;
        const { expanded } = this.state;
        const makeTermComponent = (term) => (
            <Term {...this.props} onClick={onTermClick} key={term.key} term={term} total={facet.total} />
        );

        if (terms.length > persistentCount){
            const persistentTerms     = terms.slice(0, persistentCount);
            const collapsibleTerms    = terms.slice(persistentCount);
            const remainingTermsCount = !expanded ? _.reduce(collapsibleTerms, function(m, term){
                return m + (term.doc_count || 0);
            }, 0) : null;
            let expandButtonTitle;

            if (expanded){
                expandButtonTitle = (
                    <span>
                        <i className="icon icon-fw icon-minus"/> Collapse
                    </span>
                );
            } else {
                expandButtonTitle = (
                    <span>
                        <i className="icon icon-fw icon-plus"/> View {terms.length - persistentCount} More
                        <span className="pull-right">{ remainingTermsCount }</span>
                    </span>
                );
            }

            return (
                <div className="facet-list">
                    <PartialList open={expanded} persistent={ _.map(persistentTerms,  makeTermComponent)} collapsible={_.map(collapsibleTerms, makeTermComponent)} />
                    <div className="view-more-button" onClick={this.handleExpandListToggleClick}>{ expandButtonTitle }</div>
                </div>
            );
        } else {
            return (
                <div className="facet-list">{ _.map(terms, makeTermComponent) }</div>
            );
        }
    }

    render(){
        const { facet, tooltip, title } = this.props;
        const { facetOpen, facetClosing } = this.state;
        // Filter out terms w/ 0 counts in case of range, etc.
        let terms = _.filter(facet.terms, function(term){ return term.doc_count > 0; });

        // Filter out type=Item for now (hardcode)
        if (facet.field === 'type'){
            terms = _.filter(terms, function(t){ return t !== 'Item' && t && t.key !== 'Item'; });
        }

        const indicator = ( // Small indicator to help represent how many terms there are available for this Facet.
            <Fade in={facetClosing || !facetOpen}>
                <span className="pull-right closed-terms-count" data-tip={terms.length + " options"}>
                    { _.range(0, Math.min(Math.ceil(terms.length / 3), 8)).map((c)=>
                        <i className="icon icon-ellipsis-v" style={{ opacity : ((c + 1) / 5) * (0.67) + 0.33 }} key={c}/>
                    )}
                </span>
            </Fade>
        );

        // List of terms
        return (
            <div className={"facet" + (facetOpen ? ' open' : ' closed') + (facetClosing ? ' closing' : '')} data-field={facet.field}>
                <h5 className="facet-title" onClick={this.handleOpenToggleClick}>
                    <span className="expand-toggle">
                        <i className={"icon icon-fw " + (facetOpen && !facetClosing ? "icon-minus" : "icon-plus")}/>
                    </span>
                    <span className="inline-block" data-tip={tooltip} data-place="right">{ title }</span>
                    { indicator }
                </h5>
                <Collapse in={facetOpen && !facetClosing}>{ this.renderTerms(terms) }</Collapse>
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
class Facet extends React.PureComponent {

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
            'terms'                 : PropTypes.array.isRequired,     // Possible terms,
            'description'           : PropTypes.string
        }),
        'defaultFacetOpen'      : PropTypes.bool,
        'onFilter'              : PropTypes.func,           // Executed on term click
        'extraClassname'        : PropTypes.string,
        'schemas'               : PropTypes.object,
        'isTermSelected'        : PropTypes.func.isRequired,
        'href'                  : PropTypes.string.isRequired
    };

    constructor(props){
        super(props);
        this.isStatic = memoize(Facet.isStatic);
        this.handleStaticClick = this.handleStaticClick.bind(this);
        this.handleTermClick = this.handleTermClick.bind(this);
        this.state = { 'filtering' : false };
    }

    /**
     * For cases when there is only one option for a facet - we render a 'static' row.
     * This may change in response to design.
     * Unlike in `handleTermClick`, we handle own state/UI here.
     *
     * @todo Allow to specify interval for histogram & date_histogram in schema instead of hard-coding 'month' interval.
     */
    handleStaticClick(e) {
        const { facet } = this.props;
        const term = facet.terms[0]; // Would only have 1

        e.preventDefault();
        if (!this.isStatic(facet)) return false;

        this.setState({ 'filtering' : true }, () => {
            this.handleTermClick(facet, term, e, () =>
                this.setState({ 'filtering' : false })
            );
        });

    }

    /**
     * Each Term component instance provides their own callback, we just route the navigation request.
     *
     * @todo Allow to specify interval for histogram & date_histogram in schema instead of hard-coding 'month' interval.
     */
    handleTermClick(facet, term, e, callback) {
        const { onFilter, href } = this.props;
        onFilter(facet, term, callback, false, href);
    }

    render() {
        const { facet, isTermSelected, extraClassname } = this.props;
        const { filtering } = this.state;
        const { description = null, field, title, terms = [] } = facet;
        const showTitle = title || field;

        if (this.isStatic(facet)){
            // Only one term exists.
            return <StaticSingleTerm {...{ facet, term : terms[0], filtering, showTitle, onClick : this.handleStaticClick, isTermSelected, extraClassname }} />;
        } else {
            return <FacetTermsList {...this.props} onTermClick={this.handleTermClick} tooltip={description} title={showTitle} />;
        }

    }

}

const StaticSingleTerm = React.memo(function StaticSingleTerm({ term, facet, showTitle, filtering, onClick, isTermSelected, extraClassname }){
    const { description = null, field } = facet;
    const selected = isTermSelected(term, facet);
    let termName = Schemas.Term.toName(field, term.key);

    if (!termName || termName === 'null' || termName === 'undefined'){
        termName = 'None';
    }

    return (
        <div className={"facet static" + (selected ? ' selected' : '') + ( filtering ? ' filtering' : '') + ( extraClassname ? ' ' + extraClassname : '' )}
            data-field={field}>
            <div className="facet-static-row clearfix">
                <h5 className="facet-title">
                    <span className="inline-block" data-tip={description} data-place="right">&nbsp;{ showTitle }</span>
                </h5>
                <div className={ "facet-item term" + (selected? ' selected' : '') + (filtering ? ' filtering' : '')}>
                    <span onClick={onClick} title={
                        'All results have ' +
                        term.key +
                        ' as their ' +
                        showTitle.toLowerCase() + '; ' +
                        (selected ?
                            'currently active as portal-wide filter.' :
                            'not currently active as portal-wide filter.'
                        )
                    }>
                        <i className={"icon icon-fw " +
                            (filtering ? 'icon-spin icon-circle-o-notch' :
                                ( selected ? 'icon-times-circle' : 'icon-circle' )
                            )
                        }/>
                        { termName }
                    </span>
                </div>
            </div>
        </div>
    );
});


/**
 * Use this function as part of SearchView and BrowseView to be passed down to FacetList.
 * Should be bound to a component instance, with `this` providing 'href', 'context' (with 'filters' property), and 'navigate'.
 *
 * @todo deprecate somehow. Mixins havent been part of React standards for a while now...
 * @todo Keep in mind is only for TERMS filters. Would not work for date histograms..
 *
 * @param {string} field - Field for which a Facet term was clicked on.
 * @param {string} term - Term clicked on.
 * @param {function} callback - Any function to execute afterwards.
 * @param {boolean} [skipNavigation=false] - If true, will return next targetSearchHref instead of going to it. Use to e.g. batch up filter changes on multiple fields.
 */
export function performFilteringQuery(props, facet, term, callback, skipNavigation = false, currentHref = null){
    const { href: propHref, navigate: propNavigate, context } = props;
    let targetSearchHref;

    currentHref = currentHref || propHref;

    var unselectHrefIfSelected = Filters.getUnselectHrefIfSelectedFromResponseFilters(term, facet, context.filters),
        isUnselecting = !!(unselectHrefIfSelected);

    if (unselectHrefIfSelected){
        targetSearchHref = unselectHrefIfSelected;
    } else {
        targetSearchHref = Filters.buildSearchHref(facet.field, term.key, currentHref);
        /*
        var interval, nextHref;
        if (facet.aggregation_type === 'date_histogram'){
            interval = Filters.getDateHistogramIntervalFromFacet(facet) || 'month';
            nextHref            = Filters.buildSearchHref(facet.field + '.from', term.key, currentHref); //onFilter(facet.field + '.from', term.key, null, true, href);
            var toDate = moment.utc(term.key);
            toDate.add(1, interval + 's');
            targetSearchHref    = Filters.buildSearchHref(facet.field + '.to', toDate.format().slice(0,10), nextHref); // onFilter(facet.field + '.to', toDate.format().slice(0,10), null, true, nextHref);
        } else if (facet.aggregation_type === 'range') {
            nextHref            = Filters.buildSearchHref(facet.field + '.from', term.from, currentHref);
            targetSearchHref    = Filters.buildSearchHref(facet.field + '.to', term.to, nextHref);
        } else { // Default - regular term matching
            targetSearchHref    = Filters.buildSearchHref(facet.field, term.key, currentHref);
        }
        */
    }

    // Ensure only 1 type filter is selected at once.
    // Unselect any other type= filters if setting new one.
    if (facet.field === 'type'){
        if (!(unselectHrefIfSelected)){
            var parts = url.parse(targetSearchHref, true);
            if (Array.isArray(parts.query.type)){
                var types = parts.query.type;
                if (types.length > 1){
                    var queryParts = _.clone(parts.query);
                    delete queryParts[""]; // Safety
                    queryParts.type = encodeURIComponent(term.key); // Only 1 Item type selected at once.
                    var searchString = queryString.stringify(queryParts);
                    parts.search = searchString && searchString.length > 0 ? ('?' + searchString) : '';
                    targetSearchHref = url.format(parts);
                }
            }
        }
    }

    // If we have a '#' in URL, add to target URL as well.
    const hashFragmentIdx = currentHref.indexOf('#');
    if (hashFragmentIdx > -1 && targetSearchHref.indexOf('#') === -1){
        targetSearchHref += currentHref.slice(hashFragmentIdx);
    }

    analytics.event('FacetList', (isUnselecting ? 'Unset Filter' : 'Set Filter'), {
        'field'             : facet.field,
        'term'              : term.key,
        'eventLabel'        : analytics.eventLabelFromChartNode({ 'field' : facet.field, 'term' : term.key }),
        'currentFilters'    : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters()), // 'Existing' filters, or filters at time of action, go here.
    });

    if (!skipNavigation){
        (propNavigate || navigate)(targetSearchHref, { 'dontScrollToTop' : true }, callback);
    } else {
        return targetSearchHref;
    }

}

export class FacetList extends React.PureComponent {

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
        'title' : PropTypes.string,         // Title to put atop FacetList
        'className' : PropTypes.string,     // Extra class
        'href' : PropTypes.string,

        'onFilter' : PropTypes.func,        // What happens when Term is clicked.


        'context' : PropTypes.object,       // Unused -ish
        'fileFormats' : PropTypes.array,    // Unused
        'restrictions' : PropTypes.object,  // Unused
        'mode' : PropTypes.string,          // Unused
        'onChange' : PropTypes.func,        // Unused
    };

    static defaultProps = {
        'facets'            : null,
        'title'             : "Properties",
        'debug'             : false,
        'showClearFiltersButton' : false,

        /**
         * These 'default' functions don't do anything except show parameters passed.
         * Callback must be called because it changes Term's 'loading' state back to false.
         */
        'onFilter'          : function(facet, term, callback){
            // Set redux filter accordingly, or update search query/href.
            console.log('FacetList: props.onFilter(' + facet.field + ', ' + term.key + ', callback)');
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
        'isTermSelected'    : function (term, facet){
            // Check against responseContext.filters, or expSetFilters in Redux store.
            return false;
        },
        'itemTypeForSchemas': 'ExperimentSetReplicate'
    };


    constructor(props){
        super(props);
        this.searchQueryTerms = this.searchQueryTerms.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    searchQueryTerms(){
        const { href: propHref, context } = this.props;
        const href = propHref || context && context['@id'] ? context['@id'] : null;
        if (!href) return null;
        return href && url.parse(href, true).query;
    }

    renderFacets(maxTermsToShow = 12){
        const { facets, href, onFilter, schemas, isTermSelected, itemTypeForSchemas, windowWidth, persistentCount } = this.props;
        const { mounted } = this.state;

        // Ensure each facets has an `order` property and default it to 0 if not.
        // And then sort by `order`.
        const useFacets = _.sortBy(
            _.map(
                _.uniq(facets, false, function(f){ return f.field; }), // Ensure facets are unique, field-wise.
                function(f){
                    if (typeof f.order !== 'number'){
                        return _.extend({ 'order' : 0 }, f);
                    }
                    return f;
                }
            ),
            'order'
        );

        const facetIndexWherePastXTerms = _.reduce(useFacets, (m, facet, index) => {
            if (m.end) return m;
            m.facetIndex = index;
            m.termCount = m.termCount + Math.min( // Take into account 'view more' button
                facet.terms.length, persistentCount || FacetTermsList.defaultProps.persistentCount
            );
            if (m.termCount > maxTermsToShow) m.end = true;
            return m;
        }, { facetIndex : 0, termCount: 0, end : false }).facetIndex;

        return _.map(useFacets, (facet, i) =>
            <Facet onFilter={onFilter} key={facet.field}
                facet={facet} href={href} isTermSelected={isTermSelected}
                schemas={schemas} itemTypeForSchemas={itemTypeForSchemas} mounted={mounted}
                defaultFacetOpen={!mounted ? false : !!(
                    _.any(facet.terms, (t) => isTermSelected(t, facet)) ||
                    ( layout.responsiveGridState(windowWidth || null) !== 'xs' && i < (facetIndexWherePastXTerms || 1) )
                )} />
        );
    }


    render() {
        const { debug, facets, className, title, showClearFiltersButton, onClearFilters, windowHeight } = this.props;
        if (debug) console.log('render facetlist');

        if (!facets || !Array.isArray(facets) || facets.length === 0) {
            return (
                <div className="pt-2 pb-2" style={{ color : "#aaa" }}>
                    No facets available
                </div>
            );
        }

        const clearButtonClassName = (
            (className && className.indexOf('with-header-bg') > -1) ?
                "btn-outline-white" : "btn-outline-default"
        );
        const maxTermsToShow = typeof windowHeight === 'number' && !isNaN(windowHeight) ? Math.floor(windowHeight / 60) : 12;
        const allFacetElements = this.renderFacets(maxTermsToShow);
        const staticFacetElements = _.filter(allFacetElements, function(f){
            return Facet.isStatic(f.props.facet);
        });
        const selectableFacetElements = _.difference(allFacetElements, staticFacetElements);

        return (
            <div className={"facets-container facets" + (className ? ' ' + className : '')}>
                <div className="row facets-header">
                    <div className="col col-xs-7 facets-title-column text-ellipsis-container">
                        <i className="icon icon-fw icon-filter"></i>
                        &nbsp;
                        <h4 className="facets-title">{ title }</h4>
                    </div>
                    <div className={"col col-xs-5 clear-filters-control" + (showClearFiltersButton ? '' : ' placeholder')}>
                        <a href="#" onClick={onClearFilters} className={"btn btn-xs rounded " + clearButtonClassName}>
                            <i className="icon icon-times"></i> Clear All
                        </a>
                    </div>
                </div>
                { selectableFacetElements }
                { staticFacetElements.length > 0 ?
                    <div className="row facet-list-separator">
                        <div className="col col-xs-12">
                            { staticFacetElements.length } Common Properties
                        </div>
                    </div>
                    : null }
                { staticFacetElements }
            </div>
        );
    }

}
