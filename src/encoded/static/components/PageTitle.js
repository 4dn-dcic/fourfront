'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { getTitleStringFromContext, isDisplayTitleAccession } from './item-pages/item';
import { object, Schemas, JWT } from './util';
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
    '/users/\*' : {
        'title' : function(pathName, context){
            var myDetails = JWT.getUserDetails();
            var myEmail = myDetails && myDetails.email;
            if (myEmail && context && context.email && myEmail === context.email){
                return "My Profile";
            }
            return getTitleStringFromContext(context);
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
            console.log(TITLE_PATHNAME_MAP, pathRoot);
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
            return { 'title' : getTitleStringFromContext(context) };
        }

        if (object.isAnItem(context)){ // If Item

            
            
            if (currentHrefParts.hash === '#!edit'){
                return {
                    'title' : "Editing",
                    'calloutTitle' : getTitleStringFromContext(context)
                };
            }

            
            title = getTitleStringFromContext(context);
            var itemTypeTitle = Schemas.getItemTypeTitle(context, schemas);

            if (currentHrefParts.hash === '#!create') {
                return {
                    'title' : "Creating",
                    'calloutTitle' : itemTypeTitle
                };
            }

            if (isDisplayTitleAccession(context, title, true)){ // Don't show Accessions in titles.
                return { 'title' : itemTypeTitle };
                // Re-Enable below if want Accessions as Page Subtitles.
                // return { 'title' : itemTypeTitle, 'subtitle' : title };
            } else {
                return { 'title' : itemTypeTitle, 'calloutTitle' : title };
            }

            

        }
        return { 'title' : getTitleStringFromContext(context) };
    }

    static getStyles(context, href){
        var style = { marginTop : 45 };
        if (!QuickInfoBar.isInvisibleForHref(href)){
            // We're showing QuickInfoBar, lets extend margin top by height of QuickInfoBar (hardcoded in CSS 38px).
            style.marginTop += 38;
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
        var { title, subtitle, calloutTitle } = PageTitle.calculateTitles(this.props.context, this.props.href, (this.props.shemas || Schemas.get()), this.state.mounted);

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

        return ((title || subtitle) && (
            <h1 className="page-title top-of-page" style={PageTitle.getStyles(this.props.context, this.props.href)}>
                { title }{ calloutTitle }{ subtitle }
            </h1>
        )) || <br/>;
    }

}