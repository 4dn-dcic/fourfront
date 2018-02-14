'use strict';

/* Written by Carl, used to test the IPannel of item.js. Statically uses a library
and a json of all schemas (such as is called by <fetched.Param name="schemas" url="/profiles/")>*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing DefaultItemView.js', function() {
    var React, DefaultItemView, testItem, TestUtils, FetchContext, context, schemas, _, Wrapper, sinon, server;

    beforeAll(function(){
        
        sinon = require('sinon');
        server = sinon.fakeServer.create();

        server.respondWith(
            "GET",
            '/profiles/?format=json',
            [
                200, 
                { "Content-Type" : "application/json" },
                '<html></html>' // Don't actually need content JSON here for test. Just to silence loadSchemas XHR request error (no XHR avail in test)
            ]
        );

        server.respondWith(
            "GET",
            '/profiles/?format=json',
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

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        DefaultItemView = require('./../item-pages/DefaultItemView').default;
        context = require('../testdata/library/sid38806');
        schemas = require('../testdata/schemas');
        Wrapper = React.createClass({
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });
        testItem = TestUtils.renderIntoDocument(
            <Wrapper>
                <DefaultItemView schemas={schemas} context={context} />
            </Wrapper>
        );

        jest.runAllTimers();

    });

    /** TODO: IMPROVE */
    it('has the correct number of def terms and def descriptions', function() {
        var defTerms = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'item-label');
        var defDescs = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'item-value');
        expect(defTerms.length).toBeLessThan(19);
        expect(defDescs.length).toBeLessThan(19);
    });

    it('has an accession', function() {
        var titleLine = TestUtils.findRenderedDOMComponentWithClass(testItem, 'accession');
        var exptHeading = titleLine;
        expect(exptHeading.textContent.trim()).toEqual('ENCLB055ZZZ');
    });

    /** TODO: FIX TEST */
    it('expands object views properly', function() {
        server.respond();
        var objToggles = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'item-page-detail-toggle-button');
        var detailPanel = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'item-page-detail-panel');
        jest.runAllTimers();
        var collapse = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'collapse');
        
        return;

        // TODO:: FIX BELOW
        expect(detailPanel.length).toEqual(1);
        expect(objToggles.length).toEqual(1);
        expect(collapse.length).toEqual(1);
        expect(collapse[0].className.indexOf('in') > -1).toBe(false);
        var objDefDesc = objToggles[0];
        // this is the biosamples link
        TestUtils.Simulate.click(objDefDesc);
        jest.runAllTimers();

        expect(collapse[0].className.indexOf('in') > -1).toBe(true);
        var defTerms = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'item-label');
        var defDescs = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'item-value');
        expect(defTerms.length).toEqual(19);
        expect(defDescs.length).toEqual(19);

        //var objDefinitions = TestUtils.findRenderedDOMComponentWithClass(testItem, 'sub-descriptions');
        //var objEntries = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'sub-entry');
        // there should be 25 entries within the biosample object subview
        //expect(objEntries.length).toEqual(25);
    });
    
    /*
    DEPRECATED. TODO: Create new version for new tooltips.
    it('opens and closes tooltips correctly', function(){
        var objTriggers = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'tooltip-trigger');
        TestUtils.SimulateNative.mouseOver(objTriggers[0]);
        var openTooltips = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'tooltip-open');
        expect(openTooltips.length > 0).toBeTruthy();
        TestUtils.SimulateNative.mouseOut(objTriggers[0]);
        var openTooltips = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'tooltip-open');
        expect(openTooltips.length).toEqual(0);
    });
    */
});
