'use strict';

import _ from 'underscore';
import url from 'url';
import { isServerSide } from './misc';
var console = require('./patched-console').default;
import * as Filters from './experiments-filters';
import { navigate } from './navigate';
import * as object from './object';
import * as JWT from './json-web-token';



const GADimensionMap = {
    'currentFilters' : 'dimension1',
    'name' : 'dimension2'
};

const defaultOptions = {
    isAnalyticsScriptOnPage : true,
    enhancedEcommercePlugin : true
};

let state = null;


/**
 * Initialize Google Analytics tracking. Call this from app.js on initial mount perhaps.
 *
 * @export
 * @see getTrackingID()
 * @param {string} [trackingID] - Google Analytics ID.
 * @param {Object} [context] - Current page content / JSON, to get details about Item, etc.
 * @param {Object} [currentExpSetFilters] - Currently-set expSetFilters, e.g. from Redux. For tracking browse page and how an Item was found.
 * @param {Object} [options] - Extra options.
 * @returns {boolean} true if initialized.
 */
export function initializeGoogleAnalytics(trackingID = null, context = {}, currentExpSetFilters = {}, options = {}){

    if (trackingID === null){
        trackingID = getTrackingId();
    }
    if (typeof trackingID !== 'string') return false;

    if (isServerSide()) return false;

    options = _.extend({}, defaultOptions, options);

    if (!options.isAnalyticsScriptOnPage){
        // If true, we already have <script src="...analytics.js">, e.g. in app.js so should skip this.
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
    }

    if (typeof window.ga === 'undefined'){
        console.error("Google Analytics is not initialized. Fine if this appears in a test.");
        return false;
    }

    state = _.clone(options);

    ga('create', trackingID, 'auto');
    console.info("Initialized google analytics.");
    
    if (options.enhancedEcommercePlugin){
        ga('require', 'ec');
        console.info("Initialized google analytics : Enhanced ECommerce Plugin");
    }

    registerPageView(null, context, currentExpSetFilters);
    return true;
}


/**
 * Register a pageview.
 * Used in app.js in App.componentDidUpdate(pastProps, ...).
 *
 * @export
 * @param {string} [href=null] - Page href, defaults to window.location.href.
 * @param {Object} [context={}] - The context prop; JSON representation of page.
 * @param {Object} [currentExpSetFilters={}] - Currently set expSetFilters.
 * @returns {boolean} True if success.
 */
export function registerPageView(href = null, context = {}, currentExpSetFilters = {}){

    if (!shouldTrack()) return false;

    // Set href from window if not provided. Safe to use because we're not server-side.
    if (!href) href = window.location && window.location.href;

    // Take heed of this notice if it is visible somewhere.
    if (!href) {
        console.error("No HREF defined, check.. something. Will still send pageview event.");
    }

    // Options to send with GA pageview event.
    var opts = {};

    /**
     * Convert pathname with a 'UUID', 'Accession', or 'name' to having a 
     * literal "uuid", "accession", or "name" and track the display_title, title, or accession as a
     * separate GA dimension.
     * 
     * @private
     * @param {string} pathName - Path part of href being navigated to. Use url.parse to get.
     * @return {string} Adjusted pathName.
     */
    function adjustPageViewPath(pathName){
        var pathParts = pathName.split('/').filter(function(pathPart){ // Gen path array to adjust href further if needed.
            return pathPart.length > 0;
        });

        var newPathName = null;

        // Remove Accession, UUID, and Name from URL and save it to 'name' dimension instead.
        if (typeof context.accession === 'string' && pathParts[1] === context.accession){
            // We gots an accessionable Item. Lets remove its Accession from the path to get nicer Behavior Flows in GA.
            // And let product tracking / Shopping Behavior handle Item details.
            pathParts[1] = 'accession';
            newPathName = '/' + pathParts.join('/') + '/';
            opts[GADimensionMap.name] = context.accession;
        } else if (
            (context.last_name && context.first_name) || (context['@type'] && context['@type'].indexOf('User') > -1) &&
            (pathParts[0] === 'users' && (context.uuid && pathParts[1] === context.uuid))
        ){
            // Save User name.
            pathParts[1] = 'uuid';
            newPathName = '/' + pathParts.join('/') + '/';
            opts[GADimensionMap.name] = context.title || context.uuid;
        } else if (typeof context.uuid === 'string' && pathParts[1] === context.uuid){
            pathParts[1] = 'uuid';
            newPathName = '/' + pathParts.join('/') + '/';
            opts[GADimensionMap.name] = context.display_title || context.uuid;
        } else if (typeof context.name === 'string' && pathParts[1] === context.name){
            pathParts[1] = 'name';
            newPathName = '/' + pathParts.join('/') + '/';
            opts[GADimensionMap.name] = context.display_title || context.name;
        } else {
            newPathName = pathName;
        }
        return newPathName;
    }

    /**
     * Check for Items (aka Products) - either a results graph on /browse/, /search/, or collections pages, or an Item page.
     * If any are present, impression list views or detail view accordingly.
     *
     * @private
     * @returns {boolean|Object|Object[]} Representation of what was tracked, or false if nothing was.
     */
    function registerProductView(){
        
        if (!shouldTrack()) return false;

        if (state.enhancedEcommercePlugin !== true){
            console.warn("Enhanced ECommerce is not enabled. Will -not- register product views.");
            return false;
        }
        if (Array.isArray(context['@graph'])){ // We have a results page of some kind. Likely, browse, search, or collection.
            // If browse page, get current filters and add to pageview event for 'dimension1'.
            opts[GADimensionMap.currentFilters] = getStringifiedCurrentFilters(
                origHref || currentExpSetFilters,
                (context && context.filters) || null
            );
            if (context['@graph'].length > 0){
                // We have some results, lets impression them as product list views.
                if (navigate.isBrowseHref(href)){
                    return impressionListOfItems(context['@graph'], origHref, currentExpSetFilters, 'Browse Results', context);
                } else if (navigate.isSearchHref(href)){
                    return impressionListOfItems(context['@graph'], origHref, null, 'Search Results', context);
                } else {
                    // Probably a collection page
                    return impressionListOfItems(context['@graph'], origHref, null, 'Collection View', context);
                }
            }
            return false;
        } else if (typeof context.accession === 'string'){ // We got an Item view, lets track some details about it.
            var productObj = createProductObjectFromItem(context);
            console.info("Item with an accession. Will track as product:", productObj);
            if (currentExpSetFilters && typeof currentExpSetFilters === 'object'){
                opts[GADimensionMap.currentFilters] = productObj[GADimensionMap.currentFilters] = getStringifiedCurrentFilters(currentExpSetFilters);
            }

            ga('ec:addProduct', productObj);
            ga('ec:setAction', 'detail', productObj);
            return productObj;
        }
    }

    var origHref = href; // Store orig href in case we need it later
    var parts = url.parse(href);
    // Clear query & hostname from HREF & convert accessions, uuids, and certain names to literals.
    href = adjustPageViewPath(parts.pathname);
    ga('set', 'page', href); // Set it as current page
    registerProductView();
    ga('send', 'pageview', opts);
    console.info('Sent pageview event.', href, opts);
    return true;
}

/**
 * Primarily for UI interaction events.
 *
 * Rough Guidelines:
 * - For category, try to use name of React Component by which are grouping events by.
 * - For action, try to standardize name to existing ones (search through files for instances of `analytics.event(`).
 *   - For example, "Set Filter", "Unset Filter" for UI interactions which change one or more filters (even if multiple, use '.. Filter')
 * - For fields.eventLabel, try to standardize similarly to action.
 * - For fields.eventValue - do whatever makes sense I guess. Perhaps time vector from previous interaction.
 *
 * @see eventLabelFromChartNode()
 *
 * @param {string} category - Event Category
 * @param {string} action - Event Action
 * @param {Object} fields - Additional fields.
 * @param {string} fields.eventLabel - Event Label, e.g. 'play'.
 * @param {number} fields.eventValue - Event Value, must be an integer.
 */
export function event(category, action, fields = {}){
    if (!shouldTrack()) return false;

    var eventObj = _.extend(fields, {
        hitType : 'event',
        eventCategory : category,
        eventAction : action
    });

    // Convert internal dimension names to Google Analytics ones.
    _.pairs(eventObj).forEach(function(kvPair){
        if (typeof GADimensionMap[kvPair[0]] !== 'undefined'){
            eventObj[GADimensionMap[kvPair[0]]] = kvPair[1];
            delete eventObj[kvPair[0]];
        }
    });

    // Add current expSetFilters if not present in 'fields' already.
    if (typeof eventObj[GADimensionMap.currentFilters] === 'undefined'){
        eventObj[GADimensionMap.currentFilters] = getStringifiedCurrentFilters(Filters.currentExpSetFilters());
    }

    ga('send', eventObj);
    console.info("Sent UI event", eventObj);
}


/**
 * Given a 'node' object with a field, term, and potential parent node, generate a descriptive string to use as event label.
 *
 * @param {Object} node - Node object.
 * @returns {string} Label for analytics event.
 */
export function eventLabelFromChartNode(node){
    if (!node || typeof node !== 'object') return null;
    var labelData = [];
    if (node.field)     labelData.push('Field: ' + node.field);
    if (node.term)      labelData.push('Term: ' + node.term);
    if (node.parent && node.parent.field)   labelData.push('Parent Field: ' + node.parent.field);
    if (node.parent && node.parent.term)    labelData.push('Parent Term: ' + node.parent.term);
    return labelData.join(', ');
}


export function eventLabelFromChartNodes(nodes){
    return nodes.map(eventLabelFromChartNode).join('; ');
}


/**
 * Converts expSetFilters object or href with query (as string) to stringified JSON representation.
 *
 * @export
 * @param {Object.<Set>|string} filters - expSetFilters object or href string. 
 * @param {any} [contextFilters=null] - Filters potentially set on a /browse/-type page, to use when filters param is an href.
 * @returns {string} Stringied JSON.
 */
export function getStringifiedCurrentFilters(filters, contextFilters = null){
    if (typeof filters === 'string'){
        filters = Filters.hrefToFilters(filters, contextFilters);
    } else if (typeof filters === 'undefined'){ // Allow filters to be blank.
        filters = Filters.currentExpSetFilters();
    }
    return JSON.stringify(filters, _.keys(filters).sort());
}


export function getTrackingId(href = null){
    if (href === null && !isServerSide()){
        href = window.location.href;
    }
    var host = url.parse(href).host;
    if (host.indexOf('testportal.4dnucleome') > -1){
        return 'UA-86655305-2';
    }
    if (host.indexOf('data.4dnucleome') > -1){
        return 'UA-86655305-1';
    }
    if (host.indexOf('localhost') > -1){
        return 'UA-86655305-3';
    }
    if (host.indexOf('4dn-web-alex') > -1){
        return 'UA-86655305-4';
    }
    return null;
}


export function getGoogleAnalyticsTrackingData(key = null){
    var allData = null;
    try {
        allData = ga.getAll()[0].b.data.values;
    } catch (e){
        console.error('Could not get data from current GA tracker.');
        return null;
    }
    if (allData !== null && key === null) return allData;
    if (typeof key === 'string' && typeof allData === 'object' && allData){
        try {
            return allData[':' + key];
        } catch (e) {
            console.error(e);
            return null;
        }
    }  
}



/*********************
 * Private Functions *
 *********************/

function shouldTrack(){
    // 1. Ensure we're initialized
    if (isServerSide() || typeof window.ga === 'undefined') {
        console.error("Google Analytics is not initialized. Fine if this appears in a test.");
        return false;
    }

    // 2. TODO: Make sure not logged in as admin on a production site.
    var userDetails = JWT.getUserDetails();
    if (userDetails && userDetails.email === '4dndcic@gmail.com'){
        var urlParts = url.parse(window.location.href);
        if (urlParts.host.indexOf('4dnucleome.org') > -1){
            console.warn("Logged in as 4DNDCIC on 4dnucleome.org - will NOT track.");
            return false;
        }
    }

    return true;
}

/**
 * @private
 * @returns {Object[]} Representation of what was sent.
 */
function impressionListOfItems(itemList, origHref = null, currentExpSetFilters = null, listName = null, context = null){
    var from = 0;
    if (typeof origHref === 'string'){
        var urlParts = url.parse(origHref, true);
        if (!isNaN(parseInt(urlParts.query.from))) from = parseInt(urlParts.query.from);
    }
    console.info("Will impression " + itemList.length + ' items.');
    return itemList.map(function(expSet, i){
        var pObj = createProductObjectFromItem(expSet);
        pObj[GADimensionMap.currentFilters] = getStringifiedCurrentFilters(
            currentExpSetFilters || origHref || {},
            (context && context.filters) || null
        );
        if (typeof listName === 'string'){
            pObj.list = listName;
        }
        pObj.position = from + i + 1;
        ga('ec:addImpression', pObj);
        return pObj;
    });
}

function createProductObjectFromItem(item){
    var productObj = {
        'id' : item.accession || item['@id'] || object.atIdFromObject(item) || item.uuid,
        'name' : item.display_title || item.title || null,
        'category' : item['@type'].slice().reverse().slice(1).join('/'),
        'brand' : (item.lab && item.lab.display_title) || (item.submitted_by && item.submitted_by.display_title) || item.lab || item.submitted_by || null,
    };
    return productObj;
}
