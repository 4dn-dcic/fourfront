'use strict';

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
    var React, HelpPage, testItem, TestUtils, page, data, _, banners, Wrapper, helpEntries;

    beforeAll(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        HelpPage = require('../help');
        Wrapper = React.createClass({
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });
        page = TestUtils.renderIntoDocument(
            <Wrapper>
                <HelpPage />
            </Wrapper>
        );
        helpEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'help-entry');
    });


    it('Has at least one help entry, first title named "Getting Started", with paragraph', function() {
        expect(helpEntries.length).toBeGreaterThan(0); // Doesn't matter if 1 or more entries.

        // Check that first child of first help entry is a title.
        expect(helpEntries[0].children[0].className.search('fourDN-header')).toBeGreaterThan(-1);

        // Make sure second child of first section is a content paragraph.
        expect(helpEntries[0].children[1].className.search('fourDN-content')).toBeGreaterThan(-1);

    });


    it('Has multiple help entries, titled: getting started, metadata structure, data submission ..., rest api', function() {

        // .toLowerCase() in case capitalization changes ( e.g. Getting started -> Getting *S*tarted ) 
        expect(helpEntries[0].children[0].innerHTML.toLowerCase()).toEqual('getting started');
        expect(helpEntries[1].children[0].innerHTML.toLowerCase()).toEqual('metadata structure');
        expect(helpEntries[2].children[0].innerHTML.toLowerCase().search('data submission')).toBeGreaterThan(-1); // In case it changes
        expect(helpEntries[3].children[0].innerHTML.toLowerCase()).toEqual('rest api');

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

        // Check to make sure slide deck loops (going out of index bounds)
        TestUtils.Simulate.click(prevButton); // Slide 0 -> Slide N-1
        expect(originalSlideImage.src.length).toBeGreaterThan(0); // Img URL is a string w/ length
        expect(originalSlideImage.src == originalSlideImageURL).toBe(false);
        TestUtils.Simulate.click(nextButton); // Slide N-1 -> Slide 0
        expect(originalSlideImage.src == originalSlideImageURL).toBe(true);

    });

    




});
