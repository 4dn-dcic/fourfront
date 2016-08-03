'use strict';

/* Written by Carl, used to test the IPannel of item.js. Statically uses a library
and a json of all schemas (such as is called by <fetched.Param name="schemas" url="/profiles/")>*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing item.js', function() {
    var React, item, Item, testItem, TestUtils, FetchContext, context, schemas, _, definitions, defTerms, defDescs;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        item = require('../item');
        Item = item.IPanel;
        context = require('../testdata/library/sid38806');
        schemas = require('../testdata/schemas');
        FetchContext = {
            fetch: function(url, options) {
                return Promise.resolve({json: () => ({'@graph': []})});
            }
        };
        testItem = React.withContext(FetchContext, function() {
            return TestUtils.renderIntoDocument(
                <Item schemas={schemas} context={context} />
            );
        });
        definitions = TestUtils.findRenderedDOMComponentWithClass(testItem, 'key-value');
        defTerms = TestUtils.scryRenderedDOMComponentsWithTag(definitions, 'dt');
        defDescs = TestUtils.scryRenderedDOMComponentsWithTag(definitions, 'dd');
    });

    it('has the correct number of def terms and def descriptions', function() {
        expect(defTerms.length).toEqual(19);
        expect(defDescs.length).toEqual(19);
    });

    it('has a good title', function() {
        var titleLine = TestUtils.findRenderedDOMComponentWithClass(testItem, 'experiment-heading');
        var exptHeading = titleLine.getDOMNode();
        expect(exptHeading.textContent).toEqual('ENCLB055ZZZ');
    });

    it('expands object views properly', function() {
        var objToggles = TestUtils.scryRenderedDOMComponentsWithClass(testItem, 'item-toggle-link');
        var objDefDesc = objToggles[0].getDOMNode();
        // this is the biosamples link
        TestUtils.Simulate.click(objDefDesc);
        var objDefinitions = TestUtils.findRenderedDOMComponentWithClass(testItem, 'sub-descriptions');
        var objEntries = TestUtils.scryRenderedDOMComponentsWithClass(objDefinitions, 'sub-entry');
        // there should be 25 entries within the biosample object subview
        expect(objEntries.length).toEqual(25);
    });
});
