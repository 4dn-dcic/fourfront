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

describe('Testing statics.js (to increase coverage)', function() {
    var React, Statics, testItem, TestUtils, page, data, _, banners, Wrapper, helpEntries;

    beforeAll(function() {
        React = require('react');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        Statics = require('../../data/statics');
    });


    it('Has the required keys & values', function() {
        
        expect('homeDescription' in Statics).toBe(true);
        expect(Statics.homeDescription.length).toBeGreaterThan(0);
        expect('homeLinks' in Statics).toBe(true);
        expect(Statics.homeLinks.length).toBeGreaterThan(0);
        expect('gettingStarted' in Statics).toBe(true);
        expect(Statics.gettingStarted.length).toBeGreaterThan(0);
        expect('metadataStructure1' in Statics).toBe(true);
        expect(Statics.metadataStructure1.length).toBeGreaterThan(0);
        expect('metadataStructure2' in Statics).toBe(true);
        expect(Statics.metadataStructure2.length).toBeGreaterThan(0);
        expect('submissionXLS' in Statics).toBe(true);
        expect(Statics.submissionXLS.length).toBeGreaterThan(0);
        expect('aboutDCIC' in Statics).toBe(true);
        expect(Statics.aboutDCIC.length).toBeGreaterThan(0);
        expect('aboutAcknowledgement' in Statics).toBe(true);
        expect(Statics.aboutAcknowledgement.length).toBeGreaterThan(0);
        expect('aboutFunding' in Statics).toBe(true);
        expect(Statics.aboutFunding.length).toBeGreaterThan(0);

    });



    




});
