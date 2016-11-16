'use strict';
// Entry point for browser
require('./libs/react-patches');
var React = require('react');
var ReactDOM = require('react-dom')
var ReactMount = require('react-dom/lib/ReactMount');
ReactMount.allowFullPageRender = true;

var App = require('./components');
var domready = require('domready');
var store = require('./store');
var { Provider, connect } = require('react-redux');

function mapStateToProps(store) {
   return {
       href: store.href,
       context: store.context,
       inline: store.inline,
       contextRequest: store.contextRequest,
       slow: store.slow,
       expSetFilters: store.expSetFilters,
       expIncompleteFacets : store.expIncompleteFacets
   };
}

// Treat domready function as the entry point to the application.
// Inside this function, kick-off all initialization, everything up to this
// point should be definitions.
if (typeof window !== 'undefined' && window.document && !window.TEST_RUNNER) domready(function ready() {
    console.log('Browser: ready');

    App.getRenderedProps(document);
    var server_stats = require('querystring').parse(window.stats_cookie);
    var UseApp = connect(mapStateToProps)(App);
    var app = ReactDOM.render(<Provider store={store}><UseApp /></Provider>, document);

    // Set <html> class depending on browser features
    var BrowserFeat = require('./components/browserfeat').BrowserFeat;
    BrowserFeat.setHtmlFeatClass();

    // Simplify debugging
    window.app = app;
    window.React = React;
});
