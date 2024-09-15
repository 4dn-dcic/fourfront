'use strict';

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import { store, mapStateToProps, batchDispatch } from './../store';
import { Provider, connect } from 'react-redux';
// We get a different console w. different methods & properties on server-side.
import { console as browserConsole, object, JWT } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';
import App from './../components';


const cssFileStats = fs.statSync(__dirname + '/../css/style.css');
const lastCSSBuildTime = Date.parse(cssFileStats.mtime.toUTCString());

export function appRenderFxn(body, res) {

    //var start = process.hrtime();

    const context = JSON.parse(body);
    const disp_dict = {
        'context'           : context,
        'href'              : res.getHeader('X-Request-URL') || object.itemUtil.atId(context),
        'lastCSSBuildTime'  : lastCSSBuildTime,
        'alerts'            : [] // Always have fresh alerts per request, else subprocess will re-use leftover global vars/vals.
    };

    // Subprocess-middleware re-uses process on prod. Might have left-over data from prev request.
    // JWT 'localStorage' uses 'dummyStorage' plain global object on server-side
    JWT.remove();

    // Grab JWT token if available to inform session.
    // It is only returned if successfully authenticated, else is cleared out or set to "expired".
    const jwtToken = res.getHeader('X-Request-JWT');

    let userInfo = null;

    if (JWT.maybeValid(jwtToken)){
        // Receiving 'X-User-Info' header allows us to have user info such as name
        // in server-side render instead of relying only on JWT (stored in cookie)
        // post-mount + AJAX request for user info.
        userInfo = JSON.parse(res.getHeader('X-User-Info'));
        if (userInfo){
            JWT.saveUserInfoLocalStorage(userInfo);
        }
    } else if (jwtToken === 'expired'){
        disp_dict.alerts.push(Alerts.LoggedOut);
    }
    // End JWT token grabbing
    batchDispatch(store, disp_dict);

    let AppWithReduxProps = connect(mapStateToProps)(App);
    let markup;

    try {
        markup = ReactDOMServer.renderToString(<Provider store={store}><AppWithReduxProps /></Provider>);
    } catch (err) {
        store.dispatch({
            type: 'SET_CONTEXT',
            payload: {
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
        AppWithReduxProps = connect(mapStateToProps)(App);
        markup = ReactDOMServer.renderToString(<Provider store={store}><AppWithReduxProps /></Provider>);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Prevent this header from arriving to downstream client for security.
    res.removeHeader("X-Request-JWT");

    //var duration = process.hrtime(start);
    //res.setHeader('X-React-duration', duration[0] * 1e6 + (duration[1] / 1000 | 0));

    return Buffer.from('<!DOCTYPE html>\n' + markup);
}
