'use strict';

/* Written by Carl, used to test the experiment set browsers
Made for 1st round browse (without file selectors).*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

import React from 'react';




describe('Testing viz/QuickInfoBar.js', function() {
    var TestUtils, page, context, Filters, _, Wrapper, QuickInfoBar, href, expSetFilters, contextFilters, barplot_data_unfiltered, barplot_data_filtered;

    beforeEach(function() {
        var { Provider, connect } = require('react-redux');
        Filters = require('./../util/experiments-filters');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        context = require('../testdata/browse/context');
        QuickInfoBar = require('./../viz/QuickInfoBar').default;
        href = "http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&experiments_in_set.biosample.biosource.individual.organism.name=mouse&experiments_in_set.biosample.biosource.biosource_type=immortalized+cell+line";
        contextFilters = [ // N.B. 'context.filters' in our case is incorrect, and context itself lacks the href defined above, so we use this contextFilters instead for this test. TODO: Change this (use another testData context?)
            {
                "field": "type",
                "term": "ExperimentSetReplicate",
                "remove": "/browse/?experimentset_type=replicate&experiments_in_set.biosample.biosource.individual.organism.name=mouse&experiments_in_set.biosample.biosource.biosource_type=immortalized+cell+line"
            },
            {
                "field": "experimentset_type",
                "term": "replicate",
                "remove": "/browse/?type=ExperimentSetReplicate&experiments_in_set.biosample.biosource.individual.organism.name=mouse&experiments_in_set.biosample.biosource.biosource_type=immortalized+cell+line"
            },
            {
                "field": "experiments_in_set.biosample.biosource.individual.organism.name",
                "term": "mouse",
                "remove": "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&experiments_in_set.biosample.biosource.biosource_type=immortalized+cell+line"
            },
            {
                "field": "experiments_in_set.biosample.biosource.biosource_type",
                "term": "immortalized cell line",
                "remove": "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&experiments_in_set.biosample.biosource.individual.organism.name=mouse"
            }
        ];

        class QuickWrapper extends React.Component {

            constructor(props){
                super(props);
                this.state = {
                    barplot_data_unfiltered : props.barplot_data_unfiltered || null,
                    barplot_data_filtered : props.barplot_data_filtered || null
                };
            }
        
            render(){
                return <QuickInfoBar {...this.props} {...this.state} />;
            }
        }
        
        expSetFilters = Filters.contextFiltersToExpSetFilters(contextFilters);
        page = TestUtils.renderIntoDocument(<QuickWrapper href={href} expSetFilters={expSetFilters} />);
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

        barplot_data_filtered = { 'total' : { 'experiment_sets' : 10, 'experiments' : 10, 'files' : 10 } };
        barplot_data_unfiltered = { 'total' : { 'experiment_sets' : 211, 'experiments' : 211, 'files' : 211 } };

        page.setState({ barplot_data_filtered, barplot_data_unfiltered });

        // Ensure they're changed
        statValEls.forEach(function(el){
            expect(el.innerHTML.indexOf('10')).toBeGreaterThan(-1);
            expect(el.innerHTML.indexOf('211')).toBeGreaterThan(-1);
        });
    });

    it('There are visible filters in the hover-over dropdown', function() {
        // Not hovered over yet
        var crumbs = TestUtils.scryRenderedDOMComponentsWithClass(page, 'chart-crumb');
        var filterIcon = TestUtils.scryRenderedDOMComponentsWithClass(page, 'glance-label');

        expect(filterIcon.length).toEqual(1);
        expect(crumbs.length).toEqual(0);

        TestUtils.Simulate.mouseEnter(filterIcon[0]); // Hover over

        var crumbs = TestUtils.scryRenderedDOMComponentsWithClass(page, 'chart-crumb');

        var filterTerms = _.reduce(_.values(expSetFilters), function(m,v){ return m.concat(Array.from(v.values())); }, []);

        console.log("Testing for presence of terms in ActiveFiltersBar: ", filterTerms.join(', '));
        crumbs.forEach(function(c,i){
            expect(filterTerms.filter(function(ft){
                if (c.innerHTML.toLowerCase().indexOf(ft) > -1) return true;
                return false;
            }).length).toBeGreaterThan(0);
        });
    });


});
