'use strict';

import React from 'react';
import _ from 'underscore';
import TestUtils from 'react-dom/test-utils';
import createReactClass from 'create-react-class';

jest.autoMockOff();

jest.dontMock('react');
jest.dontMock('underscore');

describe('Higlass Visualization Page', function() {
    var context, schemas, sinon, server, Wrapper;

    beforeAll(function(){
        sinon = require('sinon');
        server = sinon.fakeServer.create();
    });

    afterAll(function(){
        server.restore();
    });

    beforeEach(function() {
        // TODO Load App dependencies

        // Get test Data
        context = require('./../higlassview/config-00').default[0];
        schemas = require('../testdata/schemas');

        // Setup
        Wrapper = createReactClass({
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });

        jest.runAllTimers();

    });

    it("Can add a new higlass file to the display", function() {
        // User can add a new file to the higlass display.

        // TODO: Make AJAX call to PUT a new item.
    });

    it("Can save a new higlass file", function() {
        // User can save the higlass file, creating a new viewconf.
    });

    it("Can save an existing higlass file", function() {
        // User can save an existing higlass viewconf.
    });

    it("Can reset a higlass file", function() {
        // User can reset the higlass file to its original saved version.
    });

    it("Can edit the title and description for a higlass file", function() {
        // User can change the title and description, creating a new higclass viewconf in the process.
    });

    it("Can share the higlass file with other users", function() {
        // User can share the higlass viewconf with another user. This creates a new viewconf
    });
});
