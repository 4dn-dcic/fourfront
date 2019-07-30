'use strict';

/* Written by Carl, test for search.js (used for objs such as expts and
biosources). Test data captured from Nov. 2016 metadata.*/

import React from 'react';
import _ from 'underscore';
import TestUtils from 'react-dom/test-utils';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


function filterRowsToResults(rows){
    return rows.filter(function(r){
        if (r.className.indexOf('fin') > -1) return false;
        if (r.className.indexOf('empty-block') > -1) return false;
        if (r.className.indexOf('loading') > -1) return false;
        return true;
    });
}


describe('Testing search.js', function() {
    var sinon, server;
    var SearchView, searchViewCommonProps, testSearch, context, schemas;

    beforeEach(function() {
        SearchView = require('./../browse/SearchView').default;
        context = require('../testdata/expt_search');

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

        searchViewCommonProps = {
            "href" : "/search/?type=ExperimentHiC",

            // Mocked props that would be sent from app.BodyElement
            "windowWidth" : 1000,
            "registerWindowOnScrollHandler" : function(fxn){
                setTimeout(()=> console.log(fxn(345, 345)), 2000);
                setTimeout(()=> console.log(fxn(40, -305)), 5000);
                console.log("Will call `fxn(scrollTop, scrollTopVector)` which was registered to registerWindowOnScrollHandler in 2 & 5 seconds and print its return val. Fine if 'undefined'.");
                jest.runAllTimers();
            }
        };

        testSearch = TestUtils.renderIntoDocument(
            <SearchView {...searchViewCommonProps} context={context} />
        );

    });

    it('has the correct number of facets and experiment accessions listed', function() {
        var facets      = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'facet'),
            rows        = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'search-result-row'),
            results     = filterRowsToResults(rows),
            facetFields = facets.map(function(f){ return f.getAttribute('data-field'); });

        console.log("Facets are visible for:", facetFields.join(', '));

        expect(facets.length).toBeGreaterThan(7);
        expect(results.length).toEqual(5);
    });

    it('facets properly (digestion_enzyme=hindIII)', function() {
        context = require('../testdata/expt_search_hindIII');
        testSearch = TestUtils.renderIntoDocument(
            <SearchView {...searchViewCommonProps} context={context} href='/search/?type=ExperimentHiC&digestion_enzyme.name=HindIII' />
        );
        var rows            = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'search-result-row'),
            results         = filterRowsToResults(rows),
            selectedFacets  = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'selected');

        expect(results.length).toEqual(2);
        expect(selectedFacets.length).toEqual(2);
    });
});
