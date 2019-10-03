'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';

import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';
import { LocalizedTime } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';
import { console, object, JWT, layout, schemaTransforms, isSelectAction } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

import { content_views } from './globals';
import { typedefs } from './util';
import QuickInfoBar from './viz/QuickInfoBar';
import jsonScriptEscape from './../libs/jsonScriptEscape';

// eslint-disable-next-line no-unused-vars
const { Item, JSONContentResponse, SearchResponse } = typedefs;

/**
 * @module PageTitle - Renders out title on all views.
 */

/**
 * A hardcoded mapping of URIs to title string or function.
 *
 * @private
 * @ignore
 */
const TITLE_PATHNAME_MAP = {
    '/' : {
        'title' : "Welcome"
    },
    '/browse/' : {
        'title' : "Data Browser",
        'subtitle' : "Filter & browse experiments"
    },
    '/search/' : {
        'title' : function(pathName, context, href, currentAction){
            if (isSelectAction(currentAction)) return 'Selecting';
            return 'Search';
        },
        'calloutTitle' : function searchViewCalloutTitle(pathName, context, href, currentAction, schemas){
            var thisTypeTitle = schemaTransforms.getSchemaTypeFromSearchContext(context, schemas);
            return thisTypeTitle ? <span><small style={{ 'fontWeight' : 300 }}>{ isSelectAction(currentAction) ? '' : 'for' }</small> { thisTypeTitle }</span>: null;
        },
        'subtitle' : function(pathName, context, href, currentAction){
            if (isSelectAction(currentAction)) {
                if (currentAction === 'selection') {
                    return 'Select an Item and click the Apply button.';
                } else if (currentAction === 'multiselect') {
                    return 'Select one or more Items and click the Apply button.';
                }
                //default
                return 'Drag and drop Items from this view into other window(s).';
            }
            return null;
        }
    },
    '/health' : {
        'title' : "Health"
    },
    '/indexing_status' : {
        'title' : "Indexing Status"
    },
    '/users/\*' : {
        'title' : function(pathName, context){
            var myDetails = JWT.getUserDetails(),
                myEmail = myDetails && myDetails.email;
            if (myEmail && context && context.email && myEmail === context.email){
                return "My Profile";
            }
            return object.itemUtil.getTitleStringFromContext(context);
        }
    },
    '/planned-submissions' : {
        'title' : function(pathName, context){
            if (context.status === 'error' && context.code && (context.code === 404 || context.code === 403)){
                return 'Forbidden';
            }
            return object.itemUtil.getTitleStringFromContext(context);
        }
    }
};

// Duplicates
TITLE_PATHNAME_MAP['/home'] = TITLE_PATHNAME_MAP['/home/'] = TITLE_PATHNAME_MAP['/'];



/**
 * Calculates and renders out a title on every single front-end view.
 *
 * Also renders out static page breadcrumbs (if applicable) and any alerts if any
 * are needed to be displayed.
 */
export default class PageTitle extends React.PureComponent {

    /**
     * Calculates which title (and subtitle(s)) to show depending on the current page, URI, schema, etc.
     * Pretty hacky... we should replace this w. what doing on CGAP-side & use Registry of title views (?).
     *
     * @public
     * @param {JSONContentResponse} context - Current Item or backend response JSON representation.
     * @param {string} href - Current URI or href.
     * @param {{}[]} schemas - List of schemas as returned from Redux.
     * @param {boolean} [isMounted=false] - Whether page is currently mounted. Needed to determine whether can use LocalizedTime and similar.
     * @param {string} currentAction - Current action if any, e.g. 'edit', 'add'.
     * @returns {{ title: string, subtitle: ?string, calloutTitle: ?string }} Object with title and any subtitle/calloutTitle.
     */
    static calculateTitles(context, href, schemas, isMounted = false, currentAction){
        var currentPathName = null,
            currentPathRoot, title,
            atId = object.atIdFromObject(context),
            currentHref = isMounted ? (window && window.location && window.location.href) || href : href,
            currentHrefParts = url.parse(currentHref);

        if (typeof atId === 'string'){
            currentPathName = url.parse(atId).pathname;
        }
        if (!currentPathName && typeof currentHref === 'string'){
            currentPathName = currentHrefParts.pathname;
        }

        /**** Pre-mapping overrides ****/

        // For Edit, Create, Add titles:
        if (currentAction && (object.isAnItem(context) || currentPathName.indexOf('/search/') > -1)){
            if (currentAction === 'edit'){
                return {
                    'title' : "Editing",
                    'calloutTitle' : object.itemUtil.getTitleStringFromContext(context) // We can only edit on current context, so this should always be correct/relevant context.
                };
            }

            if (currentAction === 'create') {
                return {
                    'title' : "Creating",
                    'calloutTitle' : schemaTransforms.getItemTypeTitle(context, schemas) // Create is called from current item view.
                };
            }

            if (currentAction === 'add') {
                return {
                    'title' : "Creating",
                    'calloutTitle' : (
                        currentPathName.indexOf('/search/') > -1 ?
                            schemaTransforms.getSchemaTypeFromSearchContext(context) : schemaTransforms.getItemTypeTitle(context, schemas)
                    )
                };
            }

        }


        /**** Titles from mapping ****/
        title = TITLE_PATHNAME_MAP[currentPathName] && TITLE_PATHNAME_MAP[currentPathName].title;

        if (!title) {

            var pathRoot = currentPathName.split('/')[1] || null;
            if (typeof pathRoot === 'string' && pathRoot.length > 0){
                currentPathName = '/' + pathRoot + '/*';
                title = TITLE_PATHNAME_MAP[currentPathName] && TITLE_PATHNAME_MAP[currentPathName].title;
            }
        }

        function getProp(prop){
            if (typeof prop === 'string') return prop;
            if (typeof prop === 'function') return prop(currentPathName, context, href, currentAction, schemas);
            return prop;
        }

        if (title){
            return {
                'title' : getProp(title),
                'subtitle' : getProp(TITLE_PATHNAME_MAP[currentPathName].subtitle),
                'calloutTitle' : getProp(TITLE_PATHNAME_MAP[currentPathName].calloutTitle)
            };
        }

        if (isStaticPage(context)){
            return { 'title' : object.itemUtil.getTitleStringFromContext(context) };
        }

        /**** Post-mapping overrides ****/
        if (object.isAnItem(context)){ // If Item

            title = object.itemUtil.getTitleStringFromContext(context);

            const itemTypeTitle = schemaTransforms.getItemTypeTitle(context, schemas);
            const itemTypeHierarchy = schemaTransforms.schemasToItemTypeHierarchy(schemas);

            // Handle long title strings by Item type
            if (itemTypeTitle === 'Publication'){
                if (context.title && context.short_attribution){
                    return { 'title' : itemTypeTitle, 'subtitle' : context.title, 'subtitlePrepend' : <span className="text-300 subtitle-prepend border-right">{ context.short_attribution }</span>, 'subtitleEllipsis' : true };
                }
                return { 'title' : itemTypeTitle, 'subtitle' : title, 'subtitleEllipsis' : true };
            }

            // Don't show Accessions in titles.
            if (object.itemUtil.isDisplayTitleAccession(context, title, true)){

                // But show rest of title if it is in form 'Something - ACCESSION'
                if (typeof context.accession === 'string' && context.accession.length >= 12 && title.indexOf(' - ' + context.accession) > -1){
                    title = title.replace(' - ' + context.accession, '');
                    if (title.length > 0){
                        return { 'title' : itemTypeTitle, 'calloutTitle' : title };
                    }
                }

                return { 'title' : itemTypeTitle };
                // Re-Enable below if want Accessions as Page Subtitles.
                // return { 'title' : itemTypeTitle, 'subtitle' : title };
            } else {
                if (title.indexOf(context['@type'][0] + ' from ') === 0){ // Our title is in form of 'CellCultureDetails from 2018-01-01' or something, lets make it prettier.
                    title = (context.date_created && <span>from <LocalizedTime timestamp={context.date_created} /></span>) || title.replace(context['@type'][0] + ' ', '');
                }
                // Check if long title & no 'typeInfo' text right under it from Item page -- if so: render it _under_ Type title instead of to the right of it.
                var viewForItem = content_views.lookup(context, null);
                var viewReturnsTypeInfo = false;
                try {
                    viewReturnsTypeInfo = !!(viewForItem.prototype && viewForItem.prototype.typeInfo && viewForItem.prototype.typeInfo.call({ 'props' : { context, href, schemas } }).title ) || false;
                } catch (e){
                    viewReturnsTypeInfo = true; // Assume it failed because trying to access "this", which means typeInfo() most likely does & returns something.
                    console.warn(e);
                }
                if (!context.accession && !itemTypeHierarchy[context['@type'][0]] && !viewReturnsTypeInfo && typeof title === 'string' && title.length > 20) {
                    return { 'title' : itemTypeTitle, 'subtitle' : title };
                }
                return { 'title' : itemTypeTitle, 'calloutTitle' : title };
            }

        }

        // Fallback-ish stuff.
        title = object.itemUtil.getTitleStringFromContext(context);
        if (!title) title = currentHrefParts.path;

        return { title };
    }

    /**
     * Calculates CSS style object in response to some parameters and current layout.
     * Adds things like +38 top margin if QuickInfoBar is visible, or limits width to 75%
     * if table of contents is visible for page.
     *
     * @public
     * @param {JSONContentResponse} context     Current Item or backend response JSON representation.
     * @param {string} href                     Current URI/href.
     * @param {boolean} mounted                 Whether we are currently mounted.
     * @param {boolean} hasToc                  Whether table of contents is enabled for this page. Might be calculated via presence of 'table-of-contents' in `context`.
     * @param {number} windowWidth              Current window width, to trigger changes on window resize.
     * @returns {{ 'marginTop' : number, 'width' : string }} - JS object representing some CSS styles.
     */
    static getStyles(context, href, mounted, hasToc, windowWidth){
        var style = { 'marginTop' : 0 };
        var gridSize = mounted && layout.responsiveGridState(windowWidth || null);
        if (!QuickInfoBar.isInvisibleForHref(href)){
            // We're showing QuickInfoBar, lets extend margin top by height of QuickInfoBar (hardcoded in CSS 38px).
            if (mounted && (gridSize === 'xs' || gridSize === 'sm')) {
                // don't do it; but do by default if not mounted (aka serverside) since desktop is more common than mobile for us
            } else {
                style.marginTop += 38;
            }
        }

        if (hasToc && (gridSize === 'xl' || !mounted)) style.width = '75%';

        return style;
    }

    /** @ignore */
    constructor(props){
        super(props);

        /**
         * @private
         * @type {Object}
         * @property {boolean} state.mounted - Whether element is mounted or not.
         */
        this.state = { 'mounted' : false };
    }

    /** @ignore */
    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    /**
     * Renders out title elements, any alerts, and breadcrumbs, if necessary.
     *
     * @private
     * @returns {JSX.Element} Div with ID set to "page-title-container" and any child elements for representing title, subtitle, etc.
     */
    render(){
        const { context, href, session, currentAction, windowWidth, alerts, schemas } = this.props;
        const { mounted } = this.state;

        let elementStyle;

        if (isHomePage(href)){
            elementStyle = PageTitle.getStyles(context, href, mounted, false, windowWidth);
            return (
                <div id="page-title-container" className="container">
                    <div className="breadcrumb-placeholder" key="breadcrumbs" />
                    <HomePageTitleElement {..._.pick(this.props, 'context', 'href', 'windowWidth')} mounted={mounted} style={elementStyle} />
                    <Alerts alerts={alerts} />
                </div>
            );
        }

        var { title, subtitle, calloutTitle, subtitlePrepend, subtitleAppend, subtitleEllipsis } = PageTitle.calculateTitles(
            context, href, schemas, mounted, currentAction
        );

        if (title) {
            title = <span className={"title" + (calloutTitle ? ' has-callout-title' : '')}>{ title }</span>;
        }

        if (calloutTitle){
            calloutTitle = <span className="subtitle prominent">{ calloutTitle }</span>;
        }

        if (subtitle){
            subtitle = <div className={"page-subtitle smaller" + (subtitleEllipsis ? ' text-ellipsis-container' : '')}>{ subtitlePrepend }{ subtitle }{ subtitleAppend }</div>;
        }

        const hasToc = (
            context && Array.isArray(context['@type'])
            && context['@type'].indexOf('StaticPage') > -1
            && context['table-of-contents']
            && context['table-of-contents'].enabled
        );

        elementStyle = PageTitle.getStyles(context, href, mounted, hasToc, windowWidth);
        return (
            <div id="page-title-container" className="container">
                <StaticPageBreadcrumbs {...{ context, session, hasToc, href, windowWidth }} key="breadcrumbs" pageTitleStyle={elementStyle} />
                <PageTitleElement {... { title, subtitle, context, href, calloutTitle, hasToc, windowWidth } } mounted={mounted} style={elementStyle} />
                <Alerts alerts={alerts} style={{ 'width' : elementStyle.width || null }} />
            </div>
        );
    }
}


/** Check whether current context has an `@type` list containing "StaticPage". */
const isStaticPage = memoize(function(context){
    if (Array.isArray(context['@type'])){
        if (context['@type'][context['@type'].length - 1] === 'Portal' && context['@type'][context['@type'].length - 2] === 'StaticPage'){
            if (context['@type'].indexOf('HomePage') > -1) return false; // Exclude home page
            return true;
        }
    }
    return false;
});

const isHomePage = memoize(function(href){
    const currentHrefParts = url.parse(href, false);
    const pathName = currentHrefParts.pathname;
    if (pathName === '/' || pathName === '/home'){
        return true;
    }
    return false;
});


/**
 * Used for most page titles.
 *
 * @ignore
 * @prop {JSX.Element|string} title - Shown at top left, 300 font weight.
 * @prop {JSX.Element|string} calloutTitle - Shown at right of title in similar size, 400 font weight.
 * @prop {JSX.Element|string} subtitle - Shown at bottom title in small size, 400 font weight.
 * @returns {JSX.Element} br if no title to display or h1 element with appropriate className, style, content.
 */
const PageTitleElement = React.memo(function PageTitleElement(props) {
    const { title, calloutTitle, subtitle, style } = props;
    return ((title || subtitle) && (
        <h1 className="page-title top-of-page" style={style} >
            { title }{ calloutTitle }{ subtitle }
        </h1>
    )) || <br/>;
});


const HomePageTitleElement = React.memo(function HomePageTitleElement(props) {
    let { style } = props;

    style = _.clone(style);
    //style.marginTop ? style.marginTop -= 3 : null;

    return (
        <h1 className="home-page-title page-title top-of-page" style={style} >
            <span className="title">4D Nucleome Data Portal</span>
            <div className="subtitle">A platform to search, visualize, and download nucleomics data.</div>
        </h1>
    );
});


/**
 * Renders out breadcrumb links under page title for static help pages.
 * Also adds JSON-LD structured data breadcrumbs for SEO.
 *
 * Is used as part of PageTitle.
 * @memberof PageTitle
 */
export class StaticPageBreadcrumbs extends React.Component {

    /**
     * Get ancestors of current Item JSON.
     *
     * @param {Item} context - Current Item JSON.
     * @returns {{ '@id' : string }[]} List of ancestors as a JSON list.
     */
    static getAncestors(context){
        if (!context.parent || !context.parent.display_title) return null;
        var list = [];
        var node = context.parent;
        while (node){
            list.push(node);
            node = node.parent;
        }
        list.reverse();
        list.push(context);
        return list;
    }

    /**
     * @constant
     * @public
     * @ignore
     */
    static defaultProps = {
        'pageTitleStyle' : {}
    };

    /** @ignore */
    constructor(props){
        super(props);
        this.renderCrumb = this.renderCrumb.bind(this);
        this.seoMetadata = this.seoMetadata.bind(this);
    }

    /**
     * Renders each individual crumb.
     *
     * @private
     * @param {Item} ancestor   JSON representing an ancestor. Should have at least an @id and a display_title.
     * @param {number} index    Current ancestor index.
     * @param {Item[]} all      List of all ancestors being iterated.
     * @returns {JSX.Element} A div element representing a breadcrumb.
     */
    renderCrumb(ancestor, index, all){
        var inner;
        if (ancestor['@id'] === this.props.context['@id']){
            inner = null;//ancestor.display_title;
        } else {
            inner = <a href={ancestor['@id']}>{ ancestor.display_title }</a>;
        }
        return (
            <div className="static-breadcrumb" data-name={ancestor.name} key={ancestor['@id']}>
                { index > 0 ? <i className="icon icon-fw icon-angle-right fas"/> : null }
                { inner }
            </div>
        );
    }

    /**
     * Renders an edit button to right side of page for people with edit permission.
     *
     * @private
     */
    editButton(){
        var { session, context, pageTitleStyle } = this.props;
        if (session && context && Array.isArray(context['@type']) && context['@type'].indexOf('StaticPage') > -1){

            if (Array.isArray(context.actions)){
                var editAction = _.findWhere(context.actions, { 'name' : 'edit' });
                if (editAction && editAction.href){
                    return (
                        <div className="static-edit-button pull-right" style={_.pick(pageTitleStyle, 'marginTop')}>
                            <i className="icon icon-fw icon-pencil fas"/> <a href={editAction.href} data-tip="Edit this Static Page">Edit</a>
                        </div>
                    );
                }
            }
        }
        return null;
    }

    /**
     * Renders out JSON-LD structured data version of our breadcrumbs for
     * search engine consumption.
     *
     * @see https://developers.google.com/search/docs/data-types/breadcrumb
     *
     * @private
     * @param {{ display_title: string }[]} ancestors - List of ancestors, including self.
     * @returns {JSX.Element} A script element containing JSON-LD data.
     */
    seoMetadata(ancestors){
        if (!ancestors || !Array.isArray(ancestors) || ancestors.length < 2) return null;
        var hrefParts = url.parse(this.props.href),
            baseDomain = (hrefParts.protocol || '') + '//' + hrefParts.host,
            structuredJSON = {
                "@context": "http://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement" : _.map(ancestors, function(item, idx){
                    return {
                        "@type" : "ListItem",
                        "position" : idx + 1,
                        "item" : {
                            "name" : item.title || item.display_title,
                            "@id" : baseDomain + object.itemUtil.atId(item)
                        }
                    };
                })
            };
        return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonScriptEscape(JSON.stringify(structuredJSON)) }} />;
    }

    /** @private */
    render(){
        var { context, hasToc } = this.props,
            ancestors = StaticPageBreadcrumbs.getAncestors(context),
            crumbs = ancestors && _.map(ancestors, this.renderCrumb);

        return  (
            <div className={"static-page-breadcrumbs clearfix" + (!crumbs ? ' empty' : '') + (hasToc ? ' page-has-toc' : '')}>
                { crumbs }
                { this.editButton() }
                { this.seoMetadata(ancestors) }
            </div>
        );
    }
}
