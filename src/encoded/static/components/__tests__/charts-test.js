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
        href = "http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=25&from=0";

        var fieldsToFetch = [
            'accession',
            'experiments_in_set.experiment_summary',
            'experiments_in_set.experiment_type',
            'experiments_in_set.accession',
            //'experiments_in_set.status',
            //'experiments_in_set.files.file_type',
            'experiments_in_set.files.accession',
            'experiments_in_set.filesets.files_in_set.accession',
            //'experiments_in_set.biosample.description',
            //'experiments_in_set.biosample.modifications_summary_short',
            'experiments_in_set.biosample.biosource_summary',
            //'experiments_in_set.biosample.accession',
            //'experiments_in_set.biosample.biosource.description',
            'experiments_in_set.biosample.biosource.biosource_name',
            'experiments_in_set.biosample.biosource.biosource_type',
            'experiments_in_set.biosample.biosource.individual.organism.name',
            'experiments_in_set.biosample.biosource.individual.organism.scientific_name',
            'experiments_in_set.digestion_enzyme.name'
        ];

        sinon = require('sinon');
        server = sinon.fakeServer.create();
        
        server.respondWith(
            "GET",
            "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&from=0"
                + ChartDataController.getFieldsRequiredURLQueryPart(fieldsToFetch),
            [
                200, 
                { "Content-Type" : "application/json" },
                context /* string */
            ]
        );

        page = TestUtils.renderIntoDocument(
            <FacetCharts
                href={href}
                expSetFilters={{}}
                navigate={function(){ return; }}
                updateStats={function(stats){ console.log("CHARTS-TEST: props.updateStats called by FacetCharts (good) with: ", stats); }}
                schemas={null}
                fieldsToFetch={fieldsToFetch} />
        );
        
    });

    afterAll(function(){
        server.restore();
    });

    /*
    it('Has chart elements such as SVG, bar parts', function() {
        server.respond();
        jest.runAllTimers();
        var svg = TestUtils.scryRenderedDOMComponentsWithClass(page, 'sunburst-svg-chart');
        expect(svg.length).toBe(1);
    });
    */

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
        expect(bars.length).toBeGreaterThan(1);
        expect(barParts.length).toBeGreaterThan(1);
        console.log('CHARTS-TEST: Found ' + bars.length + ' bars divided into ' + barParts.length + ' bar parts.');
        bars.forEach(function(b){
            expect(b.children[0].className === 'bar-top-label').toBe(true);
        });
    });

});
