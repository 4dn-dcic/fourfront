'use strict';

/* Written by Carl, used to test the experiment set browsers
Made for 1st round browse (without file selectors).*/

import createReactClass from 'create-react-class';

/**
 * Some test portions currently disabled re: edits. Will need to rewrite some eventually after another round of Browse page edits.
 */
jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

function mapStateToProps(store) {
   return {
       href: store.href,
       context: store.context
   };
}

describe('Testing browse.js for experiment set browser', function() {
    var React, Browse, testItem, TestUtils, page, store, context, filters, _, Wrapper;

    beforeEach(function() {
        React = require('react');
        var { Provider, connect } = require('react-redux');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        Browse = require('../browse/BrowseView').default;
        context = require('../testdata/browse/context');
        store = require('../../store');

        var dispatch_vals = {
            'href' : "http://localhost:8000/browse/?type=ExperimentSetReplicate&experimentset_type=replicate",
            'context' : context
        };

        store.dispatch({
            type: dispatch_vals
        });

        var UseBrowse = connect(mapStateToProps)(Browse);
        page = TestUtils.renderIntoDocument(
            <Provider store={store}>
                <UseBrowse />
            </Provider>
        );
    });

    it('has 3 passing entries (experiment sets)', function() {
        var rows = TestUtils.scryRenderedDOMComponentsWithClass(page, 'search-result-row');
        var resultRows = rows.filter(function(r){
            if (r.className.indexOf('fin') > -1) return false;
            if (r.className.indexOf('empty-block') > -1) return false;
            if (r.className.indexOf('loading') > -1) return false;
            return true;
        });

        expect(resultRows.length).toEqual(context['@graph'].length);
    });

    it('filters are rendered correctly (facetlist terms)', function() {
        var expFilters = TestUtils.scryRenderedDOMComponentsWithClass(page, 'term');
        //console.log(expFilters.map(function(f){ return f.innerHTML; }))
        expect(expFilters.length).toBeGreaterThan(9);
        //TestUtils.Simulate.click(expFilters[0]);
        // ToDo : sinon stuff.
        //jest.runAllTimers(); // Click handler has been wrapped in setTimeout (to incr. UI responsiveness) so must wait for it before proceeding.
        //var selectedExpFilters = TestUtils.scryRenderedDOMComponentsWithClass(page, 'term');
        //expect(selectedExpFilters.filter(function(el){ return [true,'true'].indexOf(el.getAttribute('data-selected')) > -1; }).length).toEqual(1);
    });

});
