'use strict';

var _ = require('underscore');
var url = require('url');
var { isServerSide } = require('./misc');
var console = require('./patched-console');
var Filters = require('./experiments-filters');
var navigate = require('./navigate');
var object = require('./object');


var state = null;

var GADimensionMap = {
    'currentFilters' : 'dimension1',
    'name' : 'dimension2'
};

var defaultOptions = {
    isAnalyticsScriptOnPage : true,
    enhancedEcommercePlugin : true
};


var analytics = module.exports = {

    /**
     * Initialize Google Analytics tracking. Call this from app.js on initial mount perhaps.
     * 
     * @param {string} [trackingID] - Google Analytics ID.
     * @param {Object} [context] - Current page content / JSON, to get details about Item, etc.
     * @param {Object} [currentExpSetFilters] - Currently-set expSetFilters, e.g. from Redux. For tracking browse page and how an Item was found.
     * @param {Object} [options] - Extra options.
     * @returns {boolean} true if initialized.
     * @see analytics.getTrackingID()
     */
    initializeGoogleAnalytics : function(trackingID = null, context = {}, currentExpSetFilters = {}, options = {}){

        if (trackingID === null){
            trackingID = analytics.getTrackingId();
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

        analytics.registerPageView(null, context, currentExpSetFilters);
        return true;
    },

    registerPageView : function(href = null, context = {}, currentExpSetFilters = {}){
        if (isServerSide() || typeof window.ga === 'undefined') {
            console.error("Google Analytics is not initialized. Fine if this appears in a test.");
            return false;
        }

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
         * @param {string} pathName - Path part of href being navigated to. Use url.parse to get.
         * @param {Object} opts - Options object sent across with GA pageview event. Modified in place.
         * @return {string} Adjusted pathName.
         */
         function adjustPageViewPath(pathName){
            var pathParts = pathName.split('/').filter(function(pathPart){ // Gen path array to adjust href further if needed.
                return pathPart.length > 0;
            });

            var newPathName = null;

            // Remove Accession, UUID, and Name from URL and save it to 'name' dimension instead.
            if (typeof context.accession === 'string'){
                // We gots an accessionable Item. Lets remove its Accession from the path to get nicer Behavior Flows in GA.
                // And let product tracking / Shopping Behavior handle Item details.
                if (pathParts[1] === context.accession){
                    pathParts[1] = 'accession';
                    newPathName = '/' + pathParts.join('/') + '/';
                    opts[GADimensionMap.name] = context.accession;
                }
            } else if ((context.last_name && context.first_name) || (context['@type'] && context['@type'].indexOf('User') > -1)){
                // Save User name.
                if (pathParts[0] === 'users' && (context.uuid && pathParts[1] === context.uuid)){
                    pathParts[1] = 'uuid';
                    newPathName = '/' + pathParts.join('/') + '/';
                    opts[GADimensionMap.name] = context.title || context.uuid;
                }
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
         * @returns {boolean|Object|Object[]} Representation of what was tracked, or false if nothing was.
         */
        function registerProductView(){
            if (state.enhancedEcommercePlugin !== true){
                console.warn("Enhanced ECommerce is not enabled. Will -not- register product views.");
                return false;
            }
            if (Array.isArray(context['@graph'])){ // We have a results page of some kind. Likely, browse, search, or collection.
                // If browse page, get current filters and add to pageview event for 'dimension1'.
                opts[GADimensionMap.currentFilters] = analytics.getStringifiedCurrentFilters(
                    origHref || currentExpSetFilters,
                    (context && context.filters) || null
                );
                if (context['@graph'].length > 0){
                    // We have some results, lets impression them as product list views.
                    if (navigate.isBrowseHref(href)){
                        return analytics.impressionListOfItems(context['@graph'], origHref, currentExpSetFilters, 'Browse Results', context);
                    } else if (navigate.isSearchHref(href)){
                        return analytics.impressionListOfItems(context['@graph'], origHref, null, 'Search Results', context);
                    } else {
                        // Probably a collection page
                        return analytics.impressionListOfItems(context['@graph'], origHref, null, 'Collection View', context);
                    }
                }
                return false;
            } else if (typeof context.accession === 'string'){ // We got an Item view, lets track some details about it.
                var productObj = analytics.createProductObjectFromItem(context);
                console.info("Item with an accession. Will track as product:", productObj);
                if (currentExpSetFilters && typeof currentExpSetFilters === 'object'){
                    opts[GADimensionMap.currentFilters] = productObj[GADimensionMap.currentFilters] = analytics.getStringifiedCurrentFilters(currentExpSetFilters);
                }

                ga('ec:addProduct', productObj);
                ga('ec:setAction', 'detail', productObj);
                return productObj;
            }
        }



        // Store orig href in case we need it later
        var origHref = href;
        var parts = url.parse(href);

        // Clear query & hostname from HREF & convert accessions, uuids, and certain names to literals.
        href = adjustPageViewPath(parts.pathname);

        // Set it as current page
        ga('set', 'page', href);

        registerProductView();
        
        ga('send', 'pageview', opts);
        console.info('Sent pageview event.', href, opts);
        return true;
    },

    /**
     * @returns {Object[]} Representation of what was sent.
     */
    impressionListOfItems : function(itemList, origHref = null, currentExpSetFilters = null, listName = null, context = null){
        var from = 0;
        if (typeof origHref === 'string'){
            var urlParts = url.parse(origHref, true);
            if (!isNaN(parseInt(urlParts.query.from))) from = parseInt(urlParts.query['from']);
        }
        console.info("Will impression " + itemList.length + ' items.');
        return itemList.map(function(expSet, i){
            var pObj = analytics.createProductObjectFromItem(expSet);
            pObj[GADimensionMap.currentFilters] = analytics.getStringifiedCurrentFilters(
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
    },

    createProductObjectFromItem : function(item){
        var productObj = {
            'id' : item.accession || item['@id'] || object.atIdFromObject(item) || item.uuid,
            'name' : item.display_title || item.title || null,
            'category' : item['@type'].slice().reverse().slice(1).join('/'),
            'brand' : (item.lab && item.lab.display_title) || (item.submitted_by && item.submitted_by.display_title) || item.lab || item.submitted_by || null,
        };
        return productObj;
    },

    getStringifiedCurrentFilters : function(filters, contextFilters = null){
        if (typeof filters === 'string'){
            filters = Filters.hrefToFilters(filters, contextFilters);
        }
        return JSON.stringify(filters, _.keys(filters).sort());
    },

    getTrackingId : function(href = null){
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
        if (host.indexOf('4dn-web-alex.us-east') > -1){
            return 'UA-86655305-4';
        }
        return null;
    },

};

if (!isServerSide()) {
    window.analytics = analytics;
}
