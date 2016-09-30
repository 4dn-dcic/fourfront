'use strict';

/* Written by Carl, used to test the experiment set browsers
Made for 1st round browse (without file selectors).*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

function mapStateToProps(store) {
   return {
       expSetFilters: store.expSetFilters
   };
}

describe('Testing browse.js for experiment set browser', function() {
    var React, Browse, testItem, TestUtils, page, store, context, filters, _, Wrapper;

    beforeEach(function() {
        React = require('react');
        var { Provider, connect } = require('react-redux');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        Browse = require('../browse').Browse;
        context = require('../testdata/browse/context');
        store = require('../../store');
        var dispatch_vals = {
            'expSetFilters': {}
        };
        store.dispatch({
            type: dispatch_vals
        });
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
        var UseBrowse = connect(mapStateToProps)(Browse);
        page = TestUtils.renderIntoDocument(
            <Wrapper>
                <Provider store={store}><UseBrowse context={context}/></Provider>
            </Wrapper>
        );
    });

    it('has 3 passing entries (experiment sets or experiments)', function() {
        var passEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'expset-entry-passed');
        expect(passEntries.length).toEqual(3);
    });

    it('filters correctly when filters are clicked', function() {
        var expFilters = TestUtils.scryRenderedDOMComponentsWithClass(page, 'expterm');
        expect(expFilters.length).toEqual(12);
        TestUtils.Simulate.click(expFilters[0]);
        var selectedExpFilters = TestUtils.scryRenderedDOMComponentsWithClass(page, 'expterm-selected');
        expect(selectedExpFilters.length).toEqual(1);
    });

});
