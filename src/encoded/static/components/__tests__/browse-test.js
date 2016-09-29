'use strict';

/* Written by Carl, used to test the experiment set browsers
Made for 1st round browse (without file selectors).*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing browse.js for experiment set browser', function() {
    var React, Browse, testItem, TestUtils, page, context, filters, _, Wrapper;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        Browse = require('../browse').Browse;
        context = require('../testdata/browse/context');

        filters = {};
        Wrapper = React.createClass({
            childContextTypes: {
                location_href: React.PropTypes.string,
                navigate: React.PropTypes.func
            },
            getChildContext: function() {
                return {
                    location_href: "http://localhost:8000/browse/?type=ExperimentSet&experimentset_type=biological+replicates",
                    navigate: function(){return;}
                };
            },
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });
        page = TestUtils.renderIntoDocument(
            <Wrapper>
                <Browse context={context} expSetFilters={filters}/>
            </Wrapper>
        );
    });

    it('has 3 passing entries (experiment sets or experiments)', function() {
        var passEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'expset-entry-passed');
        expect(passEntries.length).toEqual(3);
    });

});
