'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing FacetCharts with a dummy sinon response returning test @graph', function() {
    var React, FacetCharts, ChartDataController, testItem, TestUtils, page, store, context, filters, _, Wrapper, href, sinon, server;

    beforeAll(function() {
        React = require('react');
        var { Provider, connect } = require('react-redux');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        FacetCharts = require('./../facetcharts').FacetCharts;
        ChartDataController = require('./../viz/chart-data-controller').ChartDataController;
        context = require('../testdata/browse/context-limited-fields'); // We need to sinon fake server to give us this.
        href = "http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate";

        var fieldsToFetch = ChartDataController.getRefs().fieldsToFetch;

        sinon = require('sinon');
        server = sinon.fakeServer.create();

        if (typeof context === 'object'){
            context = JSON.stringify(context);
        }

        var chartRequestHref = (
            "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate" +
            "&limit=all&from=0&sort=experiments_in_set.accession" +
            ChartDataController.getFieldsRequiredURLQueryPart()
        );

        server.respondWith(
            "GET",
            chartRequestHref,
            [
                200,
                { "Content-Type" : "application/json" },
                context /* string */
            ]
        );

        page = TestUtils.renderIntoDocument(
            <FacetCharts
                href={href}
                updateStats={function(stats){ console.log("CHARTS-TEST: props.updateStats called by FacetCharts (good) with: ", stats); }}
                schemas={null}
                fieldsToFetch={fieldsToFetch} />
        );
        
    });

    afterAll(function(){
        server.restore();
    });

    /*
    it('Has multiple paths that theoretically may be clicked (have field & term related to them)', function() {
        var exClickablePaths = TestUtils.scryRenderedDOMComponentsWithClass(page, 'clickable');
        expect(exClickablePaths.length).toBeGreaterThan(1);
        console.log('CHARTS-TEST: Found ' + exClickablePaths.length + ' SVG paths which could be clickable.');
    });
    */

    it('Has bars, divided into bar parts, with labels', function() {
        server.respond();
        jest.runAllTimers();
        var bars = TestUtils.scryRenderedDOMComponentsWithClass(page, 'chart-bar');
        var barParts = TestUtils.scryRenderedDOMComponentsWithClass(page, 'bar-part');
        console.log('CHARTS-TEST: Found ' + bars.length + ' bars divided into ' + barParts.length + ' bar parts.');
        expect(bars.length).toBeGreaterThan(1);
        expect(barParts.length).toBeGreaterThan(1);
        bars.forEach(function(b){
            expect(b.children[0].className === 'bar-top-label').toBe(true);
        });
    });

});
