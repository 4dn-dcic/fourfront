'use strict';

/* Written by Carl, used to test the homepage rendered by home.js
Specifically, test the creation of Accouncements and Getting Started entries,
making sure they collapse correctly, and test the fetchedParams used to build
the banner.*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing item.js', function() {
    var React, HomePage, BannerEntry, testItem, TestUtils, page, data, _, banners;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        HomePage = require('../home').HomePage;
        BannerEntry = require('../home').BannerEntry;
        banners = [];
        data = require('../testdata/static/search-data');
        banners.push(<BannerEntry data={data} text='experiments' location='/search/?type=Experiment&award.project=4DN'/>);
        banners.push(<BannerEntry data={data} text='experiments' location='/search/?type=Experiment&award.project=External'/>);
        banners.push(<BannerEntry data={data} text='cell types' location='/search/?type=Biosource'/>);
        page = TestUtils.renderIntoDocument(
            <HomePage banners={banners} />
        );
    });

    it('has one banner with three entries. Entry links are correct', function() {
        var banners = TestUtils.scryRenderedDOMComponentsWithClass(page, 'fourDN-banner');
        var bannerEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'banner-entry');
        expect(banners.length).toEqual(1);
        expect(bannerEntries.length).toEqual(3);
        expect(bannerEntries[0].getDOMNode().getAttribute('href')).toEqual('/search/?type=Experiment&award.project=4DN');
        expect(bannerEntries[1].getDOMNode().getAttribute('href')).toEqual('/search/?type=Experiment&award.project=External');
        expect(bannerEntries[2].getDOMNode().getAttribute('href')).toEqual('/search/?type=Biosource');
    });

    it('has announcement and getting started headers', function() {
        var newsHeaders = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-header");
        expect(newsHeaders.length).toEqual(2);
    });

    it('closes and opens entries properly', function() {
        var originalEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-content");
        var numOriginalEntries = originalEntries.length;
        var titleToggles = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-section-toggle");
        var entryTitle = titleToggles[0].getDOMNode();
        // this is the first found entry title (doesn't matter which)
        TestUtils.Simulate.click(entryTitle);
        var expandedEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-content");
        // it closes correctly
        expect(expandedEntries.length < numOriginalEntries).toBeTruthy();
        TestUtils.Simulate.click(entryTitle);
        expandedEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-content");
        // and re-opens correctly
        expect(expandedEntries.length).toEqual(numOriginalEntries);
    });

});
