'use strict';

/* Written by Carl, test for search.js (used for objs such as expts and
biosources). Test data captured from Nov. 2016 metadata.*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing item.js', function() {
    var React, Search, testSearch, TestUtils, FetchContext, context, schemas, _, Wrapper;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        Search = require('../search').Search;
        context = require('../testdata/expt_search');
        Wrapper = React.createClass({
            childContextTypes: {
                location_href: React.PropTypes.string,
                navigate: React.PropTypes.func
            },

            // Retrieve current React context
            getChildContext: function() {
                return {
                    location_href: this.props.href,
                    navigate: function(){return;}
                };
            },

            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });
        testSearch = TestUtils.renderIntoDocument(
            <Wrapper href='/search/?type=Experiment'>
                <Search context={context} />
            </Wrapper>
        );

    });

    it('has the correct number of facets and experiment accessions listed', function() {
        var facets = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'facet');
        var accessions = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'accession');
        expect(facets.length).toEqual(7);
        expect(accessions.length).toEqual(5);
    });

    it('has a good title', function() {
        var titleLine = TestUtils.findRenderedDOMComponentWithTag(testSearch, 'h3');
        expect(titleLine.textContent).toEqual('Experiment search');
    });

    it('facets properly (biosource = GM06990)', function() {
        context = require('../testdata/expt_search_GM06990');
        testSearch = TestUtils.renderIntoDocument(
            <Wrapper href='/search/?type=Experiment&biosample.biosource.individual.organism.name=mouse'>
                <Search context={context} />
            </Wrapper>
        );
        var accessions = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'accession');
        var selectedFacets = TestUtils.scryRenderedDOMComponentsWithClass(testSearch, 'selected-facet');
        expect(accessions.length).toEqual(3);
        expect(selectedFacets.length).toEqual(1);
    });
});
