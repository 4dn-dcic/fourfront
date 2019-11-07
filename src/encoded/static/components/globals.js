'use strict';

import memoize from 'memoize-one';
import url from 'url';
import Registry from '@hms-dbmi-bgm/shared-portal-components/es/components/navigation/components/Registry';
import { console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

/**
 * Top bar navigation & link schema definition.
 */
export const portalConfig = {
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
    ],

    "gaTrackingIDHostMap" : {
        "data.4dnucleome" : "UA-86655305-1",
        "testportal.4dnucleome" : "UA-86655305-2",
        "localhost" : "UA-86655305-3",
        "4dn-web-alex" : "UA-86655305-4",
    }
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
export const memoizedUrlParse = memoize(function urlParse(href){
    console.warn("memoizedUrlParse called with", href);
    return url.parse(href, true);
});



/**
 * Registry of views for Item pages, keyed by Item type.
 * To register a new view for a given `@type`, may do the following:
 *
 * @type {Registry}
 * @example content_views.register(SomeReactViewComponent, 'ItemType');
 */
export const content_views = new Registry();

/**
 * Registry of views for panels. Works similarly to `content_views`.
 * Currently not being used but may be at a future time/date.
 *
 * @type {Registry}
 */
export const panel_views = new Registry();



export const getGoogleAnalyticsTrackingID = memoize(function(href){
    if (!href && !isServerSide()){
        href = window.location.href;
    }
    const { host } = url.parse(href);
    const hostnames = Object.keys(portalConfig.gaTrackingIDHostMap);
    for (var i = 0; i < hostnames.length; i++){
        if (host.indexOf(hostnames[i]) > -1) {
            return portalConfig.gaTrackingIDHostMap[hostnames[i]];
        }
    }
    return null;
});
