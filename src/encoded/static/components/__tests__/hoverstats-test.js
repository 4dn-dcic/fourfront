'use strict';

/* Written by Carl, used to test the experiment set browsers
Made for 1st round browse (without file selectors).*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing viz/hover-statistics.js', function() {
    var React, TestUtils, page, context, filters, _, Wrapper, HoverStatistics, href;

    beforeEach(function() {
        React = require('react');
        var { Provider, connect } = require('react-redux');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        context = require('../testdata/browse/context');
        HoverStatistics = require('./../viz/hover-statistics');
        href = "http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=25&from=0";

        page = TestUtils.renderIntoDocument(
            <HoverStatistics href={href} expSetFilters={{
                "experiments_in_set.biosample.biosource.individual.organism.name" : new Set(["mouse"]),
                "experiments_in_set.biosample.biosource.biosource_type" : new Set(["immortalized cell line"])
             }} />
        );
    });

    it('Has elements for stats (file, exps, expsets)', function() {
        var statEls = TestUtils.scryRenderedDOMComponentsWithClass(page, 'stat');
        expect(statEls.length).toEqual(3);
    });

    it('Has elements for stats values (file, exps, expsets), starting at 0, which change re: updateCurrentStats function', function() {
        var statValEls = TestUtils.scryRenderedDOMComponentsWithClass(page, 'stat-value');
        expect(statValEls.length).toEqual(3);
        statValEls.forEach(function(el){ // Ensure all vals == 0
            expect(parseInt(el.innerHTML)).toBe(0);
        });
        // Change those vals
        page.updateCurrentCounts({
            experiments: 10,
            experiment_sets : 5,
            files : 20
        });

        // Ensure they're changed
        statValEls.forEach(function(el){
            expect(parseInt(el.innerHTML)).toBeGreaterThan(0);
        });
    });


});
