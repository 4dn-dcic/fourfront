'use strict';
// Entry point for browser, compiled into bundle[.chunkHash].js.

import React from 'react';
import _ from 'underscore';
import ReactDOM from 'react-dom';
var ReactMount = require('react-dom/lib/ReactMount');
ReactMount.allowFullPageRender = true;

var App = require('./components');
var domready = require('domready');
import * as store from './store';
var { Provider, connect } = require('react-redux');
import * as JWT from './components/util/json-web-token';


/** 
 * Unset JWT/auth and reload page if missing user info which should be paired with otherwise valid JWT token.
 * If user_info valid (exists), update localStorage w/ server-provider user_details (through props).
 * If no user_details provided, assume not logged in and unset JWT, then continue.
 * User info would have been obtained on login & contains user_actions (only obtained through /login).
 */
function reloadIfBadUserInfo(removeJWTIfNoUserDetails = false){
    var props;
    // Try-block just in case,
    // keep <script data-prop-type="user_details"> in <head>, before <script data-prop-type="inline">, in app.js
    // so is available before this JS (via bundle.js)
    try { props = App.getRenderedPropValues(document, ['user_details']); } catch(e) {
        console.error(e);
        return false;
    }

    if (props.user_details && typeof props.user_details.email === 'string'){
        // We have userDetails from server-side; keep client-side in sync (in case updated via/by back-end / dif client at some point)
        var savedDetails = JWT.saveUserDetails(props.user_details);
        if (!savedDetails){
            // localStorage.user_info doesn't exist, we don't have user_actions to resume session, so delete cookie & reload unauth'd.
            JWT.remove();
            window.location.reload();
            return true; // TODO maybe: Show an 'error, please wait' + App.authenticateUser (try to make static).
        }
        // Re: other session data - JWT token (stored as cookie) will match session as was used to auth server-side. 
        // user_actions will be left over in localStorage from initial login request (doesn't expire)
    } else {
        // Unset all user info otherwise (assume not signed in)
        // Deletes JWT token as well (stored as cookie - initially sent to server to auth server-side render)
        // but mostly as fallback as this is done beforehand via Set-Cookie response header
        if (removeJWTIfNoUserDetails) JWT.remove();
    }
    return false;
}

// Treat domready function as the entry point to the application.
// Inside this function, kick-off all initialization, everything up to this
// point should be definitions.
if (typeof window !== 'undefined' && window.document && !window.TEST_RUNNER) {

    if (!reloadIfBadUserInfo()) domready(function(){
        console.log('Browser: ready');

        if (reloadIfBadUserInfo(true)) return;

        var initReduxStoreState = App.getRenderedProps(document, _.keys(store.reducers));

        store.dispatch({
            // Update Redux store from Redux store props that've been rendered into <script data-prop-name={ propName }> elems server-side
            type: initReduxStoreState
        });

        var server_stats = require('querystring').parse(window.stats_cookie);
        var UseApp = connect(store.mapStateToProps)(App);
        var app;
        
        try {
            app = ReactDOM.render(<Provider store={store}><UseApp /></Provider>, document);
        } catch (e) {
            console.error("INVARIANT ERROR", e); // To debug
            // So we can get printout and compare diff of renders.
            app = require('react-dom/server').renderToString(<Provider store={store}><UseApp /></Provider>);
        }

        // Set <html> class depending on browser features
        var BrowserFeat = require('./components/browserfeat').BrowserFeat;
        BrowserFeat.setHtmlFeatClass();

        // Simplify debugging
        window.app = app;
        window.React = React;
    });
    
}