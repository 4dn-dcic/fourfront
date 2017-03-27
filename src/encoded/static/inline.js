'use strict';

// Load the rest of the app as a separate chunk.
// require.ensure creates & append to <head> a <script src="/static/build/bundle.[chunkName].js" ...> element
// consisting of compilation from libs/compat.js and browser.js
require.ensure(['./libs/compat', './browser'], function(require) {
    require('./libs/compat');  // Shims first
    require('./browser');
}, 'bundle');

// Need to know if onload event has fired for safe history api usage.
window.onload = function () {
    window._onload_event_fired = true;

    // Delay non-React script execution until clientside app is mounted (hopefully).
    /*
    setTimeout(function(){
        // Use a separate tracker for dev / test
        var ga = require('google-analytics');
        var trackers = {'data.4dnucleome.org': 'UA-86655305-1'};
        var tracker = trackers[document.location.hostname] || 'UA-86655305-1';
        ga('create', tracker, {'cookieDomain': 'none', 'siteSpeedSampleRate': 100});
        ga('send', 'pageview');
    }, 0);
    */
};

// Not Used
//var $script = require('scriptjs');
//$script.path('/static/build/');
//$script('https://login.persona.org/include.js', 'persona');
