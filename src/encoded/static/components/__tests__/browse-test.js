'use strict';

/* Written by Carl, used to test the experiment set browsers
Made for 1st round browse (without file selectors).*/


/**
 * Some test portions currently disabled re: edits. Will need to rewrite some eventually after another round of Browse page edits.
 */
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
        TestUtils = require('react-dom/lib/ReactTestUtils');
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
                    location_href: "http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate",
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

    it('has 1 passing entry (an experiment set)', function() {
        var passEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'expset-entry-passed');
        expect(passEntries.length).toEqual(1);
    });

    it('filters are rendered correctly (facetlist terms)', function() {
        var expFilters = TestUtils.scryRenderedDOMComponentsWithClass(page, 'term');
        expect(expFilters.length).toEqual(12);
        //TestUtils.Simulate.click(expFilters[0]);
        // ToDo : sinon stuff.
        //jest.runAllTimers(); // Click handler has been wrapped in setTimeout (to incr. UI responsiveness) so must wait for it before proceeding.
        //var selectedExpFilters = TestUtils.scryRenderedDOMComponentsWithClass(page, 'term');
        //expect(selectedExpFilters.filter(function(el){ return [true,'true'].indexOf(el.getAttribute('data-selected')) > -1; }).length).toEqual(1);
    });

});
