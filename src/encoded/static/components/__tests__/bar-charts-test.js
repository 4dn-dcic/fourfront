'use strict';

import React from 'react';
import _ from 'underscore';
import TestUtils from 'react-dom/test-utils';
import createReactClass from 'create-react-class';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing FacetCharts with a dummy sinon response returning test @graph', function() {
    var FacetCharts, ChartDataController, testItem, page, store, context, filters, Wrapper, href, sinon, server, fieldEndpointResult, propInitialFields;

    beforeAll(function() {
        var { Provider, connect } = require('react-redux');
        FacetCharts = require('../browse/components/FacetCharts').FacetCharts;
        ChartDataController = require('./../viz/chart-data-controller').ChartDataController;

        propInitialFields = ['experiments_in_set.experiment_type.display_title','experiments_in_set.biosample.biosource.biosource_type'];

        //context = require('../testdata/browse/context-limited-fields'); // We need to sinon fake server to give us this.
        fieldEndpointResult = require('../testdata/bar_plot_aggregations_1').JSON;
        href = "http://localhost:8000/browse/?award.project=4DN&type=ExperimentSetReplicate&experimentset_type=replicate";

        sinon = require('sinon');
        server = sinon.fakeServer.create();

        // We let ChartDataController request the data and feed it in rather than feeding it directly to the BarPlotChart (via prop 'barplot_data_unfiltered') so as to test ChartDataController.
        server.respondWith(
            "POST",
            "/bar_plot_aggregations",
            [
                200,
                { "Content-Type" : "application/json" },
                JSON.stringify(fieldEndpointResult)
            ]
        );

        page = TestUtils.renderIntoDocument(
            <FacetCharts
                href={href} // We need to be on '/' or '/browse/' for Chart to be visible.
                updateStats={function(stats){ console.log("CHARTS-TEST: props.updateStats called by FacetCharts (good) with: ", stats); }}
                schemas={null}
                initialFields={propInitialFields}
            />
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

    it('Has correct counts', function() {
        server.respond();
        jest.runAllTimers();
        var bar_labels = TestUtils.scryRenderedDOMComponentsWithClass(page, 'bar-top-label');
        var bar_counts = _.map(_.pluck(bar_labels, 'innerHTML'), function(str){ return parseInt(str); }).sort().reverse();

        var bar_counts_total = _.reduce(bar_counts, function(m,v){ return m + v; }, 0);

        expect(bar_counts_total).toEqual(fieldEndpointResult.total.experiment_sets); // Should add up to what we have as the total.

        console.log("CHARTS-TEST: Counts of items per bar - ", bar_counts )

    });

});
