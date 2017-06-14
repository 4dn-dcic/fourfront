'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe("Server rendering", function () {
    var React;
    var App;
    var ReactDOM;
    var ReactDOMServer;
    var document;
    var store;
    var statics = require('../testdata/statics');
    var fetch;
    var sinon;
    var server;
    var home_url = "http://localhost/";
    var home = {
        "@id": "/",
        "@type": ["HomePage", "StaticPage", "Portal"],
        "portal_title": "4DN Data Portal",
        "title": "Home",
        "content" : statics
    };
    

    beforeAll(function(){
        
        sinon = require('sinon');
        server = sinon.fakeServer.create();

        server.respondWith(
            "GET",
            '/profiles/',
            [
                200, 
                { "Content-Type" : "application/json" },
                '<html></html>' // Don't actually need content JSON here for test. Just to silence loadSchemas XHR request error (no XHR avail in test)
            ]
        );
    });

    afterAll(function(){
        server.restore();
    });

    beforeEach(function () {
        require('../../libs/react-patches');
        React = require('react');
        ReactDOM = require('react-dom');
        ReactDOMServer = require('react-dom/server');
        App = require('..');
        store = require('../../store');
        // test dispatching some values to store
        var dispatch_vals = {
            'href':home_url,
            'context':home,
            'inline':'',
            'contextRequest':{},
            'slow':false
        };
        store.dispatch({
            type: dispatch_vals
        });
        var props = store.getState();
        var server_app = <App {...props} />;
        var markup = '<!DOCTYPE html>\n' + ReactDOMServer.renderToString(server_app);
        var parser = new DOMParser();
        document = parser.parseFromString(markup, 'text/html');
        window.location.href = props['href'];
    });

    it("renders the application to html", function () {
        expect(document.title).toBe(home.portal_title);
    });

    it("react render http-equiv correctly", function () {
        var meta_http_equiv = document.querySelectorAll('meta[http-equiv]');
        expect(meta_http_equiv.length).not.toBe(0);
    });

    it("mounts the application over the rendered html", function () {
        var props = store.getState();
        var app = ReactDOM.render(<App {...props} />, document);
        app.loadSchemas = jest.fn(); // Mock func which launches XHR request
        expect(ReactDOM.findDOMNode(app)).toBe(document.documentElement);
    });
});
