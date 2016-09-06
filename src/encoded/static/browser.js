'use strict';
// Entry point for browser
require('./libs/react-patches');
var React = require('react');
var ReactDOM = require('react-dom')
var ReactMount = require('react/lib/ReactMount');
ReactMount.allowFullPageRender = true;

var App = require('./components');
var domready = require('domready');
var store = require('./store');
import { Provider, connect } from 'react-redux';

function mapStateToProps(store) {
   return {
       href: store.href,
       context: store.context,
       inline: store.inline,
       session_cookie: store.session_cookie,
       contextRequest: store.contextRequest,
       slow: store.slow
   };
}

// Treat domready function as the entry point to the application.
// Inside this function, kick-off all initialization, everything up to this
// point should be definitions.
if (!window.TEST_RUNNER) domready(function ready() {
    console.log('ready');
    // Set <html> class depending on browser features
    var BrowserFeat = require('./components/browserfeat').BrowserFeat;
    BrowserFeat.setHtmlFeatClass();
    App.getRenderedProps(document);
    var server_stats = require('querystring').parse(window.stats_cookie);
    App.recordServerStats(server_stats, 'html');
    var UseApp = connect(mapStateToProps)(App);
    var app = ReactDOM.render(<Provider store={store}><UseApp /></Provider>, document);

    // Simplify debugging
    window.app = app;
    window.React = React;
});
