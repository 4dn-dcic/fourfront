'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Experiment Page', function() {
    var React, item, Item, TestUtils, FetchContext, context, schemas, _;

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
    });

    describe('Testing basic subview using a library', function() {
        var testItem, definitions, defTerms, defDescs;

        beforeEach(function() {
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
    });
});
