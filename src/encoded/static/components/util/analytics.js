'use strict';

var _ = require('underscore');
var url = require('url');
var { isServerSide } = require('./misc');
var console = require('./patched-console');

var analytics = module.exports = {

    initializeGoogleAnalytics : function(trackingID = null, isAnalyticsScriptOnPage = true){

        if (trackingID === null){
            trackingID = analytics.getTrackingId()
        }
        if (typeof trackingID !== 'string') return false;

        if (isServerSide()) return false;

        if (!isAnalyticsScriptOnPage){
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

        ga('create', trackingID, 'auto');
        console.info("Initialized google analytics.");
        analytics.registerPageView();
        return true;
    },

    registerPageView : function(href = null){
        if (isServerSide() || typeof window.ga === 'undefined') {
            console.error("Google Analytics is not initialized. Fine if this appears in a test.");
            return false;
        }
        if (href){
            var parts = url.parse(href);
            href = parts.pathname + (parts.search || '');
            ga('set', 'page', href);
        }
        ga('send', 'pageview');
        console.info('Sent pageview event.', href);
        return true;
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