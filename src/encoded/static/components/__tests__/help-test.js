'use strict';

import TestUtils, { act } from 'react-dom/test-utils';
import React from 'react';

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
    var HelpPage, testItem, page, context, _, banners, Wrapper, helpEntries;
    let offsetWidth, scrollWidth;

    beforeAll(function() {
        // Nuka 8 measures scrollable pages; JSDOM deliberately has no layout.
        offsetWidth = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(720);
        scrollWidth = jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function() {
            const slides = this.querySelector('#nuka-wrapper');
            return 720 * (slides ? slides.children.length : 1);
        });
        _ = require('underscore');
        HelpPage = require('../static-pages/StaticPage').default;
        context = require('../testdata/static/helppage');

        act(() => {
            page = TestUtils.renderIntoDocument(<HelpPage context={context} />);
        });
        helpEntries = TestUtils.scryRenderedDOMComponentsWithClass(page, 'help-entry');
        
    });


    afterAll(() => {
        offsetWidth.mockRestore();
        scrollWidth.mockRestore();
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
        const carousel = TestUtils.scryRenderedDOMComponentsWithClass(page, 'slide-carousel-wrapper')[0];
        const slideCount = carousel.querySelectorAll('#nuka-wrapper > div').length;
        const scroller = carousel.querySelector('.nuka-overflow');
        // SlideCarousel's current controls are buttons themselves, not wrappers.
        const previous = carousel.querySelector('.slider-control-centerleft');
        const next = carousel.querySelector('.slider-control-centerright');
        expect(slideCount).toBe(16);
        expect(previous.textContent).toBe('Prev');
        expect(next.textContent).toBe('Next');
        expect(previous.disabled).toBe(true);
        expect(next.disabled).toBe(false);
        expect(scroller.scrollLeft).toBe(0);

        for (let current = 1; current < slideCount; current++) {
            act(() => { TestUtils.Simulate.click(next); });
            expect(scroller.scrollLeft).toBe(current * 720);
        }
        expect(next.disabled).toBe(true); // No wrapping beyond the final slide.
        expect(previous.disabled).toBe(false);
        for (let current = slideCount - 2; current >= 0; current--) {
            act(() => { TestUtils.Simulate.click(previous); });
            expect(scroller.scrollLeft).toBe(current * 720);
        }
        expect(previous.disabled).toBe(true);
        expect(next.disabled).toBe(false);
    });






});
