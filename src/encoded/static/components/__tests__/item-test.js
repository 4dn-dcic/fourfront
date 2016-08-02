'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

// Use for testing item.js view

describe('Typical Item made from a library', function() {
    var React, TestUtils, context, testItem, defTerms, defDescs;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        var Subview = require('../item').Subview;
        var fetched = require('../fetched');

        // Set up context object to be rendered
        // context = require('../testdata/library/sid38806');
        context = require('../testdata/platform');

        // Render platform panel into jsnode

        testItem = TestUtils.renderIntoDocument(
            <fetched.FetchedData>
                <fetched.Param name="schemas" url="/profiles/" />
                <Subview content={context} />
            </fetched.FetchedData>
        );
        console.log(testItem);
        // Get the <dt> and <dd> terms needed for all tests
        // defTerms = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'dt');
        // defDescs = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'dd');
        defTerms = TestUtils.scryRenderedDOMComponentsWithTag(testItem, 'div');
        defDescs = TestUtils.findRenderedDOMComponentWithClass(testItem, 'flexcol-sm-6').getDOMNode();
    });

    it('has nineteen <dt> and <dd> elements', function() {
        // expect(defTerms.length).toEqual(19);
        // expect(defDescs.length).toEqual(19);
        expect(defTerms.length).toEqual(2);
        expect(defDescs.getAttribute('href')).toEqual('/nonsense/');
    });

    it('has a good title', function() {
        var titleLine = TestUtils.findRenderedDOMComponentWithClass(testItem, 'experiment-heading');
        var exptHeading = titleLine.getDOMNode();
        expect(exptHeading.textContent).toEqual('ENCLB055ZZZ');
    });
});
