'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { getTitleStringFromContext, isDisplayTitleAccession } from './item-pages/item';
import { object, Schemas } from './util';
import QuickInfoBar from './viz/QuickInfoBar';

const TITLE_PATHNAME_MAP = {
    '/browse/' : {
        'title' : "Data Browser",
        'subtitle' : "Filter & browse experiments"
    }
};

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

    static getTitleString(context, href, schemas = Schemas.get()){
        var currentPathName = null;
        var title;
        var atId = object.atIdFromObject(context);
        if (typeof atId === 'string'){
            currentPathName = url.parse(atId).pathname;
        }
        if (!currentPathName && typeof href === 'string'){
            currentPathName = url.parse(href).pathname;
        }
        title = TITLE_PATHNAME_MAP[currentPathName] && TITLE_PATHNAME_MAP[currentPathName].title;
        if (title){
            return { 'title' : title, 'subtitle' : TITLE_PATHNAME_MAP[currentPathName].subtitle, 'calloutTitle' : TITLE_PATHNAME_MAP[currentPathName].calloutTitle };
        }

        if (PageTitle.isStaticPage(context)){
            return { 'title' : getTitleStringFromContext(context) };
        }

        if (object.isAnItem(context)){

            // If Item
            title = getTitleStringFromContext(context);
            var isItemTitleAnAccession = isDisplayTitleAccession(context, title);
            var itemTypeTitle = Schemas.getItemTypeTitle(context, schemas);
            if (isDisplayTitleAccession(context, title)){ // Don't show Accessions as titles.
                return { 'title' : itemTypeTitle };
                // Re-Enable below if want Accessions as Page Subtitles.
                // return { 'title' : itemTypeTitle, 'subtitle' : title };
            }

        }
        return { 'title' : getTitleStringFromContext(context) };
    }

    static getStyles(context, href){
        var style = { marginTop : 36 };
        if (!QuickInfoBar.isInvisibleForHref(href)){
            // We're showing QuickInfoBar, lets extend margin top by height of QuickInfoBar (hardcoded in CSS 38px).
            style.marginTop += 38;
        }

        if (PageTitle.isStaticPage(context)){
            style.marginLeft = 10; // Indent slightly to match content.
        }

        return style;
    }

    render(){
        var { title, subtitle, calloutTitle } = PageTitle.getTitleString(this.props.context, this.props.href);

        if (calloutTitle){
            calloutTitle = (
                <span className="subtitle prominent" style={{ marginLeft : !this.props.showType ? 0 : null }}>
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
                { title } { calloutTitle } { subtitle }
            </h1>
        )) || <br/>;
    }

}