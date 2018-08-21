'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import Alerts from './alerts';
import { content_views } from './globals';
import { console, object, Schemas, JWT, layout, DateUtility } from './util';
import { windowHref } from './globals';
import QuickInfoBar from './viz/QuickInfoBar';
import jsonScriptEscape from './../libs/jsonScriptEscape';

var TITLE_PATHNAME_MAP = {
    '/' : {
        'title' : "Welcome"
    },
    '/browse/' : {
        'title' : "Data Browser",
        'subtitle' : "Filter & browse experiments"
    },
    '/search/' : {
        'title' : function(pathName, context, href, currentAction){
            if (currentAction === 'selection') return 'Selecting';
            return 'Search';
        },
        'calloutTitle' : function(pathName, context, href, currentAction){
            var thisTypeTitle = getSchemaTypeFromSearchContext(context);
            return thisTypeTitle ? <span><small style={{ 'fontWeight' : 300 }}>{ currentAction === 'selection' ? '' : 'for' }</small> { thisTypeTitle }</span>: null;
        },
        'subtitle' : function(pathName, context, href, currentAction){
            if (currentAction === 'selection') {
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
            var myDetails = JWT.getUserDetails();
            var myEmail = myDetails && myDetails.email;
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

export function getSchemaTypeFromSearchContext(context){
    var thisType = _.pluck(_.filter(context.filters || [], function(o){
        if (o.field === 'type' && o.term !== 'Item') return true;
        return false;
    }), 'term')[0] || null;
    if (thisType){
        return Schemas.getTitleForType(thisType);
    }
    return null;
}

export default class PageTitle extends React.PureComponent {

    static isStaticPage(context){
        if (Array.isArray(context['@type'])){
            if (context['@type'][context['@type'].length - 1] === 'Portal' && context['@type'][context['@type'].length - 2] === 'StaticPage'){
                if (context['@type'].indexOf('HomePage') > -1) return false; // Exclude home page
                return true;
            }
        }
        return false;
    }

    static isHomePage(href){
        var currentHrefParts = url.parse(href, false);
        var pathName = currentHrefParts.pathname;
        if (pathName === '/' || pathName === '/home'){
            return true;
        }
        return false;
    }

    static calculateTitles(context, href, schemas = Schemas.get(), isMounted = false, currentAction){
        var currentPathName = null,
            currentPathRoot, title,
            atId = object.atIdFromObject(context),
            currentHref = isMounted ? windowHref(href) : href,
            currentHrefParts = url.parse(currentHref);

        if (typeof atId === 'string'){
            currentPathName = url.parse(atId).pathname;
        }
        if (!currentPathName && typeof currentHref === 'string'){
            currentPathName = currentHrefParts.pathname;
        }

        /**** Pre-mapping overrides ****/

        // For Edit, Create, Add titles:
        if (currentHrefParts.hash && currentHrefParts.hash.length > 1 && (object.isAnItem(context) || currentPathName.indexOf('/search/') > -1)){
            if (currentHrefParts.hash === '#!edit'){
                return {
                    'title' : "Editing",
                    'calloutTitle' : object.itemUtil.getTitleStringFromContext(context) // We can only edit on current context, so this should always be correct/relevant context.
                };
            }

            if (currentHrefParts.hash === '#!create') {
                return {
                    'title' : "Creating",
                    'calloutTitle' : Schemas.getItemTypeTitle(context, schemas) // Create is called from current item view.
                };
            }

            if (currentHrefParts.hash === '#!add') {
                return {
                    'title' : "Creating",
                    'calloutTitle' : (currentPathName.indexOf('/search/') > -1 ? getSchemaTypeFromSearchContext(context) : Schemas.getItemTypeTitle(context, schemas) )
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
            if (typeof prop === 'function') return prop(currentPathName, context, href, currentAction);
            return prop;
        }

        if (title){
            return {
                'title' : getProp(title),
                'subtitle' : getProp(TITLE_PATHNAME_MAP[currentPathName].subtitle),
                'calloutTitle' : getProp(TITLE_PATHNAME_MAP[currentPathName].calloutTitle)
            };
        }

        if (PageTitle.isStaticPage(context)){
            return { 'title' : object.itemUtil.getTitleStringFromContext(context) };
        }

        /**** Post-mapping overrides ****/
        if (object.isAnItem(context)){ // If Item
            
            title = object.itemUtil.getTitleStringFromContext(context);
            var itemTypeTitle = Schemas.getItemTypeTitle(context, schemas);

            // Handle long title strings by Item type
            if (itemTypeTitle === 'Publication'){
                if (context.title && context.short_attribution){
                    return {'title' : itemTypeTitle, 'subtitle' : context.title, 'subtitlePrepend' : <span className="text-300 subtitle-prepend border-right">{ context.short_attribution }</span>, 'subtitleEllipsis' : true };
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
                    title = (context.date_created && <span>from <DateUtility.LocalizedTime timestamp={context.date_created} /></span>) || title.replace(context['@type'][0] + ' ', '');
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
                if (!context.accession && !Schemas.itemTypeHierarchy[context['@type'][0]] && !viewReturnsTypeInfo && typeof title === 'string' && title.length > 20) {
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

    static getStyles(context, href, mounted, hasToc){
        var style = { 'marginTop' : 0 };
        var gridSize = mounted && layout.responsiveGridState();
        if (!QuickInfoBar.isInvisibleForHref(href)){
            // We're showing QuickInfoBar, lets extend margin top by height of QuickInfoBar (hardcoded in CSS 38px).
            if (mounted && (gridSize === 'xs' || gridSize === 'sm')) {
                // don't do it; but do by default if not mounted (aka serverside) since desktop is more common than mobile for us
            } else {
                style.marginTop += 38;
            }
        }

        if (hasToc && (gridSize === 'lg' || !mounted)) style.width = '75%';

        return style;
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    render(){
        var { context, href, session, currentAction } = this.props;

        var elementStyle;

        if (PageTitle.isHomePage(href)){
            elementStyle = PageTitle.getStyles(context, href, this.state.mounted, false);
            return (
                <div id="page-title-container" className="container">
                    <div className="breadcrumb-placeholder" key="breadcrumbs" />
                    <layout.WindowResizeUpdateTrigger>
                        <HomePageTitleElement {..._.pick(this.props, 'context', 'href')} mounted={this.state.mounted} style={elementStyle} />
                    </layout.WindowResizeUpdateTrigger>
                    <Alerts alerts={this.props.alerts} />
                </div>
            );
        }

        var { title, subtitle, calloutTitle, subtitlePrepend, subtitleAppend, subtitleEllipsis } = PageTitle.calculateTitles(
            context, href, (this.props.shemas || Schemas.get()), this.state.mounted, currentAction
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

        var hasToc = (
            context && Array.isArray(context['@type'])
            && context['@type'].indexOf('StaticPage') > -1
            && context['table-of-contents']
            && context['table-of-contents'].enabled
        );

        elementStyle = PageTitle.getStyles(context, href, this.state.mounted, hasToc);

        return (
            <div id="page-title-container" className="container">
                <StaticPageBreadcrumbs {...{ context, session, hasToc, href }} key="breadcrumbs" pageTitleStyle={elementStyle} />
                <layout.WindowResizeUpdateTrigger>
                    <PageTitleElement {... { title, subtitle, context, href, calloutTitle, hasToc } } mounted={this.state.mounted} style={elementStyle} />
                </layout.WindowResizeUpdateTrigger>
                <Alerts alerts={this.props.alerts} style={{ 'width' : elementStyle.width || null }} />
            </div>
        );
    }
}


/**
 * Used for most page titles.
 *
 * @prop {JSX.Element|string} title - Shown @ top left, 300 font weight.
 * @prop {JSX.Element|string} calloutTitle - Shown @ right of title in similar size, 400 font weight.
 * @prop {JSX.Element|string} subtitle - Shown @ bottom title in small size, 400 font weight.
 * @returns {JSX.Element} br if no title to display or h1 element with appropriate className, style, content.
 */
class PageTitleElement extends React.PureComponent {

    render(){
        var { title, calloutTitle, subtitle, context, href, mounted, hasToc, style } = this.props;

        return ((title || subtitle) && (
            <h1 className="page-title top-of-page" style={style} >
                { title }{ calloutTitle }{ subtitle }
            </h1>
        )) || <br/>;
    }
}


class HomePageTitleElement extends React.PureComponent {
    render(){
        var { title, calloutTitle, subtitle, context, href, mounted, hasToc, style } = this.props;

        style = _.clone(style);
        style.marginTop ? style.marginTop -= 3 : null;

        return (
            <h1 className="home-page-title page-title top-of-page" style={style} >
                <span className="title">4D Nucleome Data Portal</span>
                <div className="subtitle">A platform to search, visualize, and download nucleomics data.</div>
            </h1>
        );
    }
}


export class StaticPageBreadcrumbs extends React.Component {

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

    static defaultProps = {
        'pageTitleStyle' : {}
    }

    constructor(props){
        super(props);
        this.renderCrumb = this.renderCrumb.bind(this);
        this.seoMetadata = this.seoMetadata.bind(this);
    }

    renderCrumb(ancestor, index, all){
        var inner;
        if (ancestor['@id'] === this.props.context['@id']){
            inner = null;//ancestor.display_title;
        } else {
            inner = <a href={ancestor['@id']}>{ ancestor.display_title }</a>;
        }
        return (
            <div className="static-breadcrumb" data-name={ancestor.name} key={ancestor['@id']}>
                { index > 0 ? <i className="icon icon-fw icon-angle-right"/> : null }
                { inner }
            </div>
        );
    }

    editButton(){
        var { session, context, pageTitleStyle } = this.props;
        if (session && context && Array.isArray(context['@type']) && context['@type'].indexOf('StaticPage') > -1){

            if (Array.isArray(context.actions)){
                var editAction = _.findWhere(context.actions, { 'name' : 'edit' });
                if (editAction && editAction.href){
                    return (
                        <div className="static-edit-button pull-right" style={_.pick(pageTitleStyle, 'marginTop')}>
                            <i className="icon icon-fw icon-pencil"/> <a href={editAction.href} data-tip="Edit this Static Page">Edit</a>
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

    render(){
        var { context, hasToc } = this.props,
            ancestors = StaticPageBreadcrumbs.getAncestors(context),
            crumbs = ancestors && _.map(ancestors, this.renderCrumb);

        return  (
            <div className={"static-page-breadcrumbs clearfix" + (!crumbs ? 'empty' : '') + (hasToc ? ' page-has-toc' : '')}>
                { crumbs }
                { this.editButton() }
                { this.seoMetadata(ancestors) }
            </div>
        );
    }
}


