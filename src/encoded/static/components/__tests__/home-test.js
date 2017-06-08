'use strict';

import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

/* Written by Carl, used to test the homepage rendered by home.js
Specifically, test the creation of Accouncements and Getting Started entries,
making sure they collapse correctly, and test the fetchedParams used to build
the banner.*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing home.js', function() {
    var React, HomePage, testItem, TestUtils, page, data, _, banners, Wrapper, statics;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        HomePage = require('../static-pages/home').default;
        statics = require('../../data/statics'); // Maybe keep version of statics.js and put into /testdata/
        Wrapper = createReactClass({
            childContextTypes: {
                fetch: PropTypes.func
            },

            // Retrieve current React context
            getChildContext: function() {
                return {
                    fetch: this.fetch
                };
            },

            fetch: function(url, options) {
                return null;
            },

            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });
        page = TestUtils.renderIntoDocument(
            <Wrapper>
                <HomePage context={{ 'content' : statics }} />
            </Wrapper>
        );
    });
    
    /*
    Banner not on homepage at moment.
    it('has one banner with three entries. Entry links are correct', function() {
        var banners = TestUtils.scryRenderedDOMComponentsWithClass(page, 'fourDN-banner');
        var bannerEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'banner-entry');
        expect(banners.length).toEqual(1);
        expect(bannerEntries.length).toEqual(3);
        expect(bannerEntries[0].getAttribute('href')).toEqual('/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all');
        expect(bannerEntries[1].getAttribute('href')).toEqual('/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all');
        expect(bannerEntries[2].getAttribute('href')).toEqual('/search/?type=Biosource');
    });
    */

    it('has welcome, announcements, and links headers', function() {
        var newsHeaders = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-header");
        expect(newsHeaders.length).toEqual(3);
    });

});
