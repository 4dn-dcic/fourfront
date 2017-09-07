'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


function getActiveTabIndex(tabs){
    return tabs.map(function(tb){
        return tb.className.indexOf('active') > -1;
    }).indexOf(true);
}


describe('Testing ExperimentSetView', function() {
    var sinon, server, React, TestUtils;
    var expFuncs, context, schemas, _, ExperimentSetView, testView, RawFilesStackedTable;

    beforeAll(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');

        sinon = require('sinon');
        server = sinon.fakeServer.create();
        
        server.respondWith(
            "GET",
            '/profiles/',
            [
                200, 
                { "Content-Type" : "application/json" },
                '<html></html>' // Don't actually need content JSON here for test.
            ]
        );

        ExperimentSetView = require('../item-pages/ExperimentSetView').default;
        RawFilesStackedTable = require('../browse/components').RawFilesStackedTable;
        context = require('../testdata/experiment_set/replicate_4DNESH4MYRID');
        schemas = require('../testdata/schemas');
        expFuncs = require('../util').expFxn;

        testView = TestUtils.renderIntoDocument(<ExperimentSetView context={context} schemas={schemas} expSetFilters={{}} />);


        //jest.runAllTimers();
    });

    afterAll(function(){
        server.restore();
    });

    beforeEach(function() {
        return;
    });
    
    it('Same first test from RawFilesStackedTable; test to ensure we have table.', function() {
        var checkIfHaveHeaders = ['Experiment', 'Biosample', 'File'].sort(); // Sort b/c indices matter
        
        // Check if built-in header definitions match headers to be checked in rendered table.
        expect(
            _.intersection(
                _.map(
                    RawFilesStackedTable.builtInHeaders(context.experimentset_type),
                    function(h){ return h.visibleTitle || h.title; }
                ).sort(),
                checkIfHaveHeaders
            )
        ).toEqual(checkIfHaveHeaders);

        // Then ensure they're rendered.
        var headersContainer = TestUtils.findRenderedDOMComponentWithClass(testView, 'expset-headers');
        var headers = headersContainer.children; // == TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 'heading-block');
        expect(
            _.intersection(
                _.pluck(headers, 'innerHTML').sort(),
                checkIfHaveHeaders
            )
        ).toEqual(checkIfHaveHeaders);
    });

    it('Has tab bar with tabs.', function() {

        var tabBar = TestUtils.scryRenderedDOMComponentsWithClass(testView, 'rc-tabs-bar');
        var tabButtons = TestUtils.scryRenderedDOMComponentsWithClass(testView, 'rc-tabs-tab');
        expect(tabBar.length).toBeGreaterThan(0);
        expect(tabButtons.length).toBeGreaterThan(1);

    });

    it('Can click on tab button and stuff on page will change', function() {

        var tabButtons = TestUtils.scryRenderedDOMComponentsWithClass(testView, 'rc-tabs-tab');

        // 'active' tab should exist and be set to first tab by default.
        expect(getActiveTabIndex(tabButtons)).toBe(0);

        // Click on 2nd (index 1) tab and see if active tab changes.
        TestUtils.Simulate.click(tabButtons[1]);
        expect(getActiveTabIndex(tabButtons)).toBe(1);

    });

    it('Should be on Attribution tab view, with some attribution stuff', function() {

        var tabButtons = TestUtils.scryRenderedDOMComponentsWithClass(testView, 'rc-tabs-tab');
        expect(getActiveTabIndex(tabButtons)).toBe(1); // Ensure we still on same tab from prior test (Attribution)

        var formattedBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testView, 'formatted-info-panel');
        expect(formattedBlocks.length).toBeGreaterThan(0);

        var blockTypes = formattedBlocks.map(function(f){
            return f.children[0].innerHTML;
        });

        console.log('Attributions Present on Page:', blockTypes);

        var labBlockIndex = blockTypes.indexOf('Lab');
        expect(labBlockIndex).toBeGreaterThan(-1); // Ensure we have a lab block.

        //             .formatted-info-panel         > .row      > .details-col > h5.block-title > a innerHTML
        var labTitle = formattedBlocks[labBlockIndex].children[1].children[1].children[0].children[0].innerHTML;

        expect(labTitle).toEqual('4DN DCIC Lab, HMS');

    });

});
