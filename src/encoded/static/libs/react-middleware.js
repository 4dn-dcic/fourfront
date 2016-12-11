'use strict';
var React = require('react');
var ReactDOMServer = require('react-dom/server');
var doctype = '<!DOCTYPE html>\n';
var transformResponse = require('subprocess-middleware').transformResponse;
var fs = require('fs');
var inline = fs.readFileSync(__dirname + '/../build/inline.js').toString();
var store = require('../store');
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

var render = function (Component, body, res) {
    //var start = process.hrtime();
    var disp_dict = {
        'context': JSON.parse(body),
        'href':res.getHeader('X-Request-URL') || context['@id'],
        'inline':inline
    };

    // Grab JWT token if available to inform session
    var jwtToken = res.getHeader('X-Request-JWT'); // Only returned if successfully authenticated
    var sessionMayBeSet = false;
    var userInfo = null;
    var alerts = null;
    if (jwtToken && jwtToken.length > 0 && jwtToken !== "null" && jwtToken !== "expired"){
        sessionMayBeSet = true;
        userInfo = JSON.parse(res.getHeader('X-User-Info'));
        res.removeHeader('X-User-Info');
        res.removeHeader('X-Request-JWT');
    } else if (
        (disp_dict.context.code === 403 || res.statusCode === 403) && 
        (jwtToken === 'expired' || disp_dict.context.detail === "Bad or expired token.")
    ) { 
        sessionMayBeSet = false;
        alerts = [{"title" : "Logged Out", "message" : "You have been logged out due to an expired session."}];
    }
    // End JWT token grabbing

    store.dispatch({
        type: disp_dict
    });
    var markup;
    var UseComponent;
    try {
        UseComponent = connect(mapStateToProps)(Component);
        markup = ReactDOMServer.renderToString(<Provider store={store}><UseComponent sessionMayBeSet={sessionMayBeSet} userInfo={userInfo} alerts={alerts} /></Provider>);

    } catch (err) {
        var context = {
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
        UseComponent = connect(mapStateToProps)(Component);
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
