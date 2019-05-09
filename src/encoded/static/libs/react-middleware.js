'use strict';

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { transformResponse } from 'subprocess-middleware';
import fs from 'fs';
import { store, mapStateToProps } from './../store';
import { Provider, connect } from 'react-redux';
import { JWT } from './../components/util';
//import Alerts from './../components/alerts';


var cssFileStats        = fs.statSync(__dirname + '/../css/style.css'),
    lastCSSBuildTime    = Date.parse(cssFileStats.mtime.toUTCString());

var render = function (Component, body, res) {

    //var start = process.hrtime();

    const context = JSON.parse(body);
    const disp_dict = {
        'context'           : context,
        'href'              : res.getHeader('X-Request-URL') || context['@id'],
        //'inline'            : inline, // -- uncomment this line and the line in imports if we want to compile an inline JS script.
        'lastCSSBuildTime'  : lastCSSBuildTime
    };

    // Subprocess-middleware re-uses process on prod. Might have left-over data from prev request.
    // JWT 'localStorage' uses 'dummyStorage' plain global object on server-side
    JWT.remove();

    // Grab JWT token if available to inform session. Is only returned if successfully authenticated else is cleared out
    const jwtToken = res.getHeader('X-Request-JWT');

    let sessionMayBeSet = false;
    let userInfo = null;

    if (JWT.maybeValid(jwtToken)){
        sessionMayBeSet = true;
        userInfo = JSON.parse(res.getHeader('X-User-Info'));
        // This allows us to have user info such as name in server-side render
        // instead of relying only on JWT (stored in cookie)
        if (userInfo){
            JWT.saveUserInfoLocalStorage(userInfo);
        }
    } else if (
        /* (disp_dict.context.code === 403 || res.statusCode === 403) && */
        // Sometimes a different statusCode is returned (e.g. 404 if no search/browse result)
        jwtToken === 'expired' || disp_dict.context.detail === "Bad or expired token."
    ){
        sessionMayBeSet = false;
        // TEMPORARY DISABLED (maybe not temporary eventually)
        //disp_dict.alerts = [Alerts.LoggedOut];
    }
    // End JWT token grabbing

    store.dispatch({
        type: disp_dict
    });

    var markup, UseComponent;

    try {
        UseComponent = connect(mapStateToProps)(Component);
        markup = ReactDOMServer.renderToString(<Provider store={store}><UseComponent sessionMayBeSet={sessionMayBeSet} /></Provider>);
        // TODO maybe in future: Try to utilize https://reactjs.org/docs/react-dom-server.html#rendertonodestream instead -- would require big edits to subprocess-middleware, however (e.g. removing buffering, piping stream directly to process.stdout).
    } catch (err) {
        store.dispatch({
            type: 'context',
            value: {
                '@type': ['RenderingError', 'error'],
                'status': 'error',
                'code': 500,
                'title': 'Server Rendering Error',
                'description': 'The server erred while rendering the page.',
                'detail': err.stack,
                'log': console._stdout.toString(),
                'warn': console._stderr.toString(),
                'context': store.getState()['context']
            }
        });
        // To debug in browser, pause on caught exceptions:
        res.statusCode = 500;
        UseComponent = connect(mapStateToProps)(Component);
        markup = ReactDOMServer.renderToString(<Provider store={store}><UseComponent /></Provider>);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    //var duration = process.hrtime(start);
    //res.setHeader('X-React-duration', duration[0] * 1e6 + (duration[1] / 1000 | 0));
    return new Buffer('<!DOCTYPE html>\n' + markup);
};


export function build(Component) {
    return transformResponse(render.bind(render, Component));
}
