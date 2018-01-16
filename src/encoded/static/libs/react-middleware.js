'use strict';

import React from 'react';
import ReactDOMServer from 'react-dom/server';
var doctype = '<!DOCTYPE html>\n';
var transformResponse = require('subprocess-middleware').transformResponse;
var fs = require('fs');
var inline = fs.readFileSync(__dirname + '/../build/inline.js', 'utf8').toString();
var store = require('../store');
var { Provider, connect } = require('react-redux');
var { JWT, Filters } = require('../components/util');
import Alerts from './../components/alerts';


var cssFileStats = fs.statSync(__dirname + '/../css/style.css');
var lastCSSBuildTime = Date.parse(cssFileStats.mtime.toUTCString());

var render = function (Component, body, res) {
    //var start = process.hrtime();
    var context = JSON.parse(body);
    var disp_dict = {
        'context': context,
        'href': res.getHeader('X-Request-URL') || context['@id'],
        'inline': inline,
        'lastCSSBuildTime' : lastCSSBuildTime
    };

    // Subprocess-middleware re-uses process on prod. Might have left-over data from prev request. 
    // JWT 'localStorage' uses 'dummyStorage' plain object on server-side
    JWT.remove(); 
    // Grab JWT token if available to inform session
    var jwtToken = res.getHeader('X-Request-JWT'); // Only returned if successfully authenticated
    var sessionMayBeSet = false;
    var userInfo = null;
    if (JWT.maybeValid(jwtToken)){
        sessionMayBeSet = true;
        userInfo = JSON.parse(res.getHeader('X-User-Info'));
        if (userInfo){
            JWT.saveUserInfoLocalStorage(userInfo);
        }
        //res.removeHeader('X-User-Info');
        //res.removeHeader('X-Request-JWT');
    } else if (
        /* (disp_dict.context.code === 403 || res.statusCode === 403) && */ 
        // Sometimes a different statusCode is returned (e.g. 404 if no search/browse result)
        (jwtToken === 'expired' || disp_dict.context.detail === "Bad or expired token.")
    ){
        sessionMayBeSet = false;
        // TEMPORARY DISABLED (maybe not temporary eventually)
        //disp_dict.alerts = [Alerts.LoggedOut];
    }
    // End JWT token grabbing

    store.dispatch({
        type: disp_dict
    });
    var markup;
    var UseComponent;
    try {
        UseComponent = connect(store.mapStateToProps)(Component);
        markup = ReactDOMServer.renderToString(<Provider store={store}><UseComponent sessionMayBeSet={sessionMayBeSet} /></Provider>);

    } catch (err) {
        context = {
            '@type': ['RenderingError', 'error'],
            status: 'error',
            code: 500,
            title: 'Server Rendering Error',
            description: 'The server erred while rendering the page.',
            detail: err.stack,
            log: console._stdout.toString(),
            warn: console._stderr.toString(),
            context: store.getState()['context']
        };
        store.dispatch({
            type: 'context',
            value: context
        });
        // To debug in browser, pause on caught exceptions:
        res.statusCode = 500;
        UseComponent = connect(store.mapStateToProps)(Component);
        markup = ReactDOMServer.renderToString(<Provider store={store}><UseComponent /></Provider>);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    //var duration = process.hrtime(start);
    //res.setHeader('X-React-duration', duration[0] * 1e6 + (duration[1] / 1000 | 0));
    return new Buffer(doctype + markup);
};


module.exports.build = function (Component) {
    return transformResponse(render.bind(null, Component));
};
