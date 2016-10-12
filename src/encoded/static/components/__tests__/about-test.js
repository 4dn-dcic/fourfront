'use strict';

/** 
 * Written by Alex, based on Carl's homepage test, to test the 'About' page 
 * rendered by about.js, including navigation and other app components.
 * 
 * Unlike for other components, because the 'About' page is relatively simple,
 * the ENTIRE App is loaded and initialized to the /about/ page so that 
 * presence of nav bar and other global elements may be tested+covered as well.
 */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing about.js', function() {
    
    // Setup required variables/dependencies before running tests.
    
    var React, About, testItem, TestUtils, page, data, _, banners, Wrapper, App;

    beforeAll(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        App = require('../app');
        page = TestUtils.renderIntoDocument(
            <App href="http://data.4dnucleome.org/about/" context={{}} />
        );
    });


    // Check that has navBar with links
    it('Has global navigation bar & links', function() {

        var navBanner = TestUtils.scryRenderedDOMComponentsWithClass(page, 'navbar navbar-main');
        var navBannerLinkWrapper = TestUtils.scryRenderedDOMComponentsWithClass(page, 'nav navbar-nav');
        expect(navBanner.length).toEqual(1);
        expect(navBannerLinkWrapper.length).toBeGreaterThan(0); // Doesn't matter if 1 or more links.
    });


    it("Has 'about' page elements -- '.static-page' wrapper, title, and content regions", function() {
        var staticContainer = TestUtils.findRenderedDOMComponentWithClass(page, "static-page");
        expect(staticContainer).toBeTruthy();
        
        var staticContainerContentSections = staticContainer.children[0].children; 
        // ^ == div.static-page > div.help-entry > *

        // Should at least have 1 child element (title, paragraphs) 
        expect(staticContainerContentSections.length).toBeGreaterThan(1); 

        // Finding by className incase title location in DOM changes in future.
        var staticContainerTitle = TestUtils.findRenderedDOMComponentWithClass(page, "fourDN-section-title");
        expect(staticContainerTitle.innerHTML).toEqual('About');
        
    });

    // Example of something which would be present on About page.
    it("Has Burak and Nils' names", function() {
        var contentParagraphs = TestUtils.scryRenderedDOMComponentsWithClass(page, "fourDN-content");
        expect(contentParagraphs.length).toBeGreaterThan(1); // At least 1 paragraph.
        
        var fullContentParagraphsText = contentParagraphs.map(function(v){ return v.innerHTML }).join('\n');
        expect(fullContentParagraphsText.search('Burak Alver')).toBeGreaterThan(-1); // .search returns index, or -1.
        expect(fullContentParagraphsText.search('Nils Gehlenborg')).toBeGreaterThan(-1);
        
    });

});
