'use strict';

import memoize from 'memoize-one';
import url from 'url';
import Registry from '@hms-dbmi-bgm/shared-portal-components/es/components/navigation/components/Registry';
import { console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { default as analyticsConfigurationOptions } from "./../ga_config.json";

/**
 * Top bar navigation & link schema definition.
 */
const portalConfig = {
    "title": "4DN Data Portal",

    /**
     * Hostnames which are considered to be canonical for 4DN data.
     * If "current" hostname is not in this list, is presumed to be a development environment,
     * and minor visual changes, such as the test data warning banner, appear.
     *
     * @type {string[]}
     */
    "productionHosts": [
        "www.data.4dnucleome.org",
        "data.4dnucleome.org",
        "fourfront-webdev.us-east-1.elasticbeanstalk.com"
    ]
};


/**
 * `url.parse`, but globally memoized for performance.
 * **ONLY** pass in the _current_ `props.href` here.
 * Use regular `url.parse` for e.g. `pastProps.href`.
 *
 * If are re-using or transforming the resulting url parts or any
 * of its properties, such as the `query` property, be sure to
 * **clone** it first (since result is cached/memoized for other calls).
 *
 * @param {string} href - Current href.
 */
const memoizedUrlParse = memoize(function urlParse(href){
    console.warn("memoizedUrlParse called with", href);
    return url.parse(href, true);
});

/**
 * Meant to be used in click handlers. See app.js.
 * Memoized in case multiple click handlers bound to
 * event bubble chain (same event bubbles up).
 */
const elementIsChildOfLink = memoize(function(initDomElement){
    let domElem = initDomElement;
    // SVG anchor elements have tagName == 'a' while HTML anchor elements have tagName == 'A'
    while (domElem && (domElem.tagName.toLowerCase() !== 'a' && !domElem.getAttribute('data-href'))) {
        domElem = domElem.parentElement;
    }
    return domElem;
});

/**
 * Registry of views for Item pages, keyed by Item type.
 * To register a new view for a given `@type`, may do the following:
 *
 * @type {Registry}
 * @example content_views.register(SomeReactViewComponent, 'ItemType');
 */
const content_views = new Registry();

/**
 * Registry of views for panels. Works similarly to `content_views`.
 * Currently not being used but may be at a future time/date.
 *
 * @type {Registry}
 */
const panel_views = new Registry();



const getGoogleAnalyticsTrackingID = memoize(function(href){
    if (!href && !isServerSide()){
        href = window.location.href;
    }
    const { host } = url.parse(href);
    const hostnames = Object.keys(analyticsConfigurationOptions.hostnameTrackerIDMapping);
    for (var i = 0; i < hostnames.length; i++){
        if (host.indexOf(hostnames[i]) > -1) {
            return analyticsConfigurationOptions.hostnameTrackerIDMapping[hostnames[i]];
        }
    }
    return null;
});


export {
    analyticsConfigurationOptions,
    portalConfig,
    getGoogleAnalyticsTrackingID,
    content_views,
    panel_views,
    memoizedUrlParse,
    elementIsChildOfLink
};
