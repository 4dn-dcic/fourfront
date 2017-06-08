'use strict';

/* Written by Carl, test for search.js (used for objs such as expts and
biosources). Test data captured from Nov. 2016 metadata.*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing search.js', function() {
    var React, Search, testSearch, TestUtils, context, schemas, _;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        Search = require('../search').Search;
        context = require('../testdata/expt_search');

        testSearch = TestUtils.renderIntoDocument(
            <Search context={context} href="/search/?type=ExperimentHiC" />
        );

    });

    it('has the correct number of facets and experiment accessions listed', function() {
        var facets = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'facet');
        var results = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'search-result-row');
        expect(facets.length).toBeGreaterThan(7);
        expect(results.length).toEqual(5);
    });

    it('has a good title', function() {
        var titleLine = TestUtils.findRenderedDOMComponentWithTag(testSearch, 'h1');
        expect(titleLine.textContent).toEqual('ExperimentHiC Search');
    });

    it('facets properly (digestion_enzyme=hindIII)', function() {
        context = require('../testdata/expt_search_hindIII');
        testSearch = TestUtils.renderIntoDocument(
            <Search context={context} href='/search/?type=ExperimentHiC&digestion_enzyme.name=HindIII' />
        );
        var results = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'search-result-row');
        var selectedFacets = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'selected');
        expect(results.length).toEqual(2);
        expect(selectedFacets.length).toEqual(2);
    });
});
