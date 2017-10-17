'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { console, object, Schemas, JWT, layout } from './util';
import { windowHref } from './globals';
import QuickInfoBar from './viz/QuickInfoBar';

var TITLE_PATHNAME_MAP = {
    '/' : {
        'title' : "Welcome"
    },
    '/browse/' : {
        'title' : "Data Browser",
        'subtitle' : "Filter & browse experiments"
    },
    '/search/' : {
        'title' : 'Search',
        'calloutTitle' : function(pathName, context){
            var thisType = _.pluck(_.filter(context.filters || [], function(o){
                if (o.field === 'type' && o.term !== 'Item') return true;
                return false;
            }), 'term')[0] || null;
            if (thisType){
                var thisTypeTitle = Schemas.getTitleForType(thisType);
                return thisTypeTitle ? <span><small style={{ 'fontWeight' : 300 }}>for</small> { thisTypeTitle }</span>: 'Search';
                //return thisTypeTitle || null;
            }
        }
    },
    '/health' : {
        'title' : "Health"
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

export default class PageTitle extends React.Component {

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

    static calculateTitles(context, href, schemas = Schemas.get(), isMounted = false){
        var currentPathName = null, currentPathRoot;
        var title;
        var atId = object.atIdFromObject(context);
        var currentHref = isMounted ? windowHref(href) : href;
        var currentHrefParts = url.parse(currentHref);

        if (typeof atId === 'string'){
            currentPathName = url.parse(atId).pathname;
        }
        if (!currentPathName && typeof currentHref === 'string'){
            currentPathName = currentHrefParts.pathname;
        }

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
            if (typeof prop === 'function') return prop(currentPathName, context, href);
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
            return { 'title' : object.itemUtil.eStringFromContext(context) };
        }

        if (object.isAnItem(context)){ // If Item

            
            
            if (currentHrefParts.hash === '#!edit'){
                return {
                    'title' : "Editing",
                    'calloutTitle' : object.itemUtil.getTitleStringFromContext(context)
                };
            }

            
            title = object.itemUtil.getTitleStringFromContext(context);
            var itemTypeTitle = Schemas.getItemTypeTitle(context, schemas);

            if (currentHrefParts.hash === '#!create') {
                return {
                    'title' : "Creating",
                    'calloutTitle' : itemTypeTitle
                };
            }

            if (object.itemUtil.isDisplayTitleAccession(context, title, true)){ // Don't show Accessions in titles.

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
                return { 'title' : itemTypeTitle, 'calloutTitle' : title };
            }

            

        }
        return { 'title' : object.itemUtil.getTitleStringFromContext(context) };
    }

    static getStyles(context, href, mounted){
        var style = { marginTop : 45 };
        if (!QuickInfoBar.isInvisibleForHref(href)){
            // We're showing QuickInfoBar, lets extend margin top by height of QuickInfoBar (hardcoded in CSS 38px).
            var gridSize = mounted && layout.responsiveGridState();
            if (mounted && (gridSize === 'xs' || gridSize === 'sm')) {
                // don't do it; but do by default if not mounted (aka serverside) since desktop is more common than mobile for us
            } else {
                style.marginTop += 38;
            }
        }

        if (PageTitle.isStaticPage(context)){
            style.marginLeft = 10; // Indent slightly to match content.
        }

        return style;
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    render(){
        var { context, href } = this.props;

        if (PageTitle.isHomePage(href)){
            return (
                <layout.WindowResizeUpdateTrigger>
                    <HomePageTitleElement {..._.pick(this.props, 'context', 'href')} mounted={this.state.mounted} />
                </layout.WindowResizeUpdateTrigger>
            );
        }

        var { title, subtitle, calloutTitle } = PageTitle.calculateTitles(context, href, (this.props.shemas || Schemas.get()), this.state.mounted);
        

        if (title) {
            title = (
                <span className={"title" + (calloutTitle ? ' has-callout-title' : '')}>
                    { title }
                </span>
            );
        }

        if (calloutTitle){
            calloutTitle = (
                <span className="subtitle prominent">
                    { calloutTitle }
                </span>
            );
        }

        if (subtitle){
            subtitle = (
                <div className="page-subtitle smaller">
                    { subtitle }
                </div>
            );
        }

        return (
            <layout.WindowResizeUpdateTrigger>
                <PageTitleElement {... { title, subtitle, context, href, calloutTitle } } mounted={this.state.mounted} />
            </layout.WindowResizeUpdateTrigger>
        );
    }

}


class PageTitleElement extends React.Component {
    render(){
        var { title, calloutTitle, subtitle, context, href, mounted } = this.props;

        return ((title || subtitle) && (
            <h1 className="page-title top-of-page" style={PageTitle.getStyles(context, href, mounted)} >
                { title }{ calloutTitle }{ subtitle }
            </h1>
        )) || <br/>;
    }
}

class HomePageTitleElement extends React.Component {
    render(){
        var { title, calloutTitle, subtitle, context, href, mounted } = this.props;

        var style = PageTitle.getStyles(context, href, mounted);
        style.marginTop ? style.marginTop -= 3 : null;

        return (
            <h1 className="home-page-title page-title top-of-page" style={style} >
                <span className="title">4D Nucleome Data Portal</span>
                <div className="subtitle">A platform to search, visualize, and download nucleomics data.</div>
            </h1>
        );
    }
}

