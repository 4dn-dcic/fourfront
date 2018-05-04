'use strict';

import createReactClass from 'create-react-class';

/**
 * Written by Alex, based on Carl's homepage test, to test the 'Help' page
 * rendered by help.js.
 *
 * Includes check for 1+ help section, for current 4 section titles,
 * and for functionality of .slide-display slider.
 */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing help.js', function() {
    var React, HelpPage, testItem, TestUtils, page, context, _, banners, Wrapper, helpEntries;

    beforeAll(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        HelpPage = require('../static-pages/StaticPage').default;
        context = require('../testdata/static/helppage');

        /*

        Wrapper = createReactClass({
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });

        */

        page = TestUtils.renderIntoDocument(<HelpPage context={context} />);
        helpEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'help-entry');
        
    });


    it('Has at least one help entry with paragraph, title', function() {
        expect(helpEntries.length).toBeGreaterThan(0); // Doesn't matter if 1 or more entries.

        // Check that there's titles.
        expect(
            helpEntries.filter(function(el){
                return (
                    el && el.children.length &&
                    el.children[0].className.indexOf('section-title') > -1
                );
            }).length
        ).toBeGreaterThan(0);

        // Check that there's paragraphs.
        expect(
            helpEntries.filter(function(el){
                return (
                    el && el.children.length &&
                    (
                        el.children[0].className.indexOf('section-content') > -1 ||
                        (el.children[1] && el.children[1].className.indexOf('section-content') > -1)
                    )
                );
            }).length
        ).toBeGreaterThan(0);

    });


    it('Has multiple help entries, titled:  metadata structure, rest api', function() {
        var allHeaderNames = _.flatten(helpEntries.map(function(e){ return e.children[0]; }), true)
            .filter(function(el){ return typeof el.innerHTML !== 'undefined' && el.className.indexOf('section-title') > -1; })
            .map(function(el){ return el.innerHTML.toLowerCase(); });

        // .toLowerCase() in case capitalization changes ( e.g. Getting started -> Getting *S*tarted )
        expect(_.any(allHeaderNames, function(h){ return h.indexOf('metadata structure') > -1; })).toBe(true);
        expect(_.any(allHeaderNames, function(h){ return h.indexOf('rest api') > -1; })).toBe(true);
        expect(_.any(allHeaderNames, function(h){ return h.indexOf('data submission via spreadsheet') > -1; })).toBe(true);

    });


    it('Has functional slideshow/slider', function() {
        var slideDisplay = TestUtils.scryRenderedDOMComponentsWithClass(page, 'slide-display');
        expect(helpEntries.length).toBeGreaterThan(0); // It exists on page.

        // div.slide-display > div.slide-controls > button.btn (x2)
        var nextButton = slideDisplay[0].children[0].children[1];
        var prevButton = slideDisplay[0].children[0].children[0];

        // Proper labeling (subject to change in future (?))
        expect(nextButton.innerHTML.toLowerCase()).toEqual('next');
        expect(prevButton.innerHTML.toLowerCase()).toEqual('previous');

        // Original image exists w/ src.
        var originalSlideImage = slideDisplay[0].children[1];
        var originalSlideImageURL = originalSlideImage.src;
        expect(originalSlideImageURL.length).toBeGreaterThan(0); // Img URL is a string w/ length

        // Simulate clicking to ensure image SRC changes.
        expect(originalSlideImage.src == originalSlideImageURL).toBe(true);
        TestUtils.Simulate.click(nextButton); // Slide 0 -> Slide 1
        expect(originalSlideImage.src == originalSlideImageURL).toBe(false);
        TestUtils.Simulate.click(nextButton); // Slide 1 -> Slide 2
        TestUtils.Simulate.click(prevButton); // Slide 2 -> Slide 1
        TestUtils.Simulate.click(prevButton); // Slide 1 -> Slide 0
        expect(originalSlideImage.src == originalSlideImageURL).toBe(true);

        // Check to make sure slide deck doesn't loop
        TestUtils.Simulate.click(prevButton); // Slide 0 -> Slide 0
        expect(originalSlideImage.src.length).toBeGreaterThan(0); // Img URL is a string w/ length
        expect(originalSlideImage.src == originalSlideImageURL).toBe(true);
    });






});
