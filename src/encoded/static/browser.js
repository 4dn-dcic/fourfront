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
var { JWT } = require('./components/objectutils');

// ToDo: Maybe have this in 'globals' or something so no need to add in lots of places if adding new field?
var reduxStoreFields = [
    'href', 'context', 'inline',        // Server--Client syndication stuff (not empty, important to get)
    'contextRequest', 'slow',           // Current nav request(s) (empty, no XHR requests initiated server-side))
    'expSetFilters', 'expIncompleteFacets' // Filter stuff (empty, unless start storing server-side or in cookies (& passing back))
];

function mapStateToProps(store) {
    var props = {};
    for (var i = 0; i < reduxStoreFields.length; i++){
        props[reduxStoreFields[i]] = store[reduxStoreFields[i]];
    }
    return props;
}

// Treat domready function as the entry point to the application.
// Inside this function, kick-off all initialization, everything up to this
// point should be definitions.
if (typeof window !== 'undefined' && window.document && !window.TEST_RUNNER) domready(function ready() {
    console.log('Browser: ready');

    var props = App.getRenderedPropValues(document, ['user_details', 'alerts']);
    if (props.user_details && typeof props.user_details.email === 'string'){
        // We have userDetails from server-side; keep client-side in sync (in case updated via/by back-end / dif client at some point)
        JWT.saveUserDetails(props.user_details);
        // Re: other session data - JWT token (stored as cookie) will match session as was used to auth server-side. 
        // user_actions will be left over in localStorage from initial login request (doesn't expire)
    } else {
        // Unset all user info otherwise (assume not signed in)
        // Deletes JWT token as well (stored as cookie - initially sent to server to auth server-side render)
        // but only as fallback as this is done beforehand via Set-Cookie response header
        JWT.remove();
    }

    store.dispatch({
        // Update Redux store from Redux store props that've been rendered into <script data-prop-name={ propName }> elems server-side
        type: App.getRenderedProps(document, reduxStoreFields)
    });

    var server_stats = require('querystring').parse(window.stats_cookie);
    var UseApp = connect(mapStateToProps)(App);
    var app = ReactDOM.render(<Provider store={store}><UseApp alerts={props.alerts} /></Provider>, document);

    // Set <html> class depending on browser features
    var BrowserFeat = require('./components/browserfeat').BrowserFeat;
    BrowserFeat.setHtmlFeatClass();

    // Simplify debugging
    window.app = app;
    window.React = React;
});
