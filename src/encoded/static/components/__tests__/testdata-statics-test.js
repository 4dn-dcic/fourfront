'use strict';

/** 
 * Written by Alex, based on Carl's homepage test, to test the content
 * in statics.js to ensure variables required exist and have text/html 
 * content.
 */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing statics.js (to increase coverage)', function() {
    var React, Statics, testItem, TestUtils, page, data, _, banners, Wrapper, helpEntries;

    beforeAll(function() {
        React = require('react');
        Statics = require('../testdata/statics');
    });

    it('Has the required keys & values', function() {
        
        expect('description' in Statics).toBe(true);
        expect(Statics.description.length).toBeGreaterThan(0);
        expect('links' in Statics).toBe(true);
        expect(Statics.links.length).toBeGreaterThan(0);
        expect('gettingStarted' in Statics).toBe(true);
        expect(Statics.gettingStarted.length).toBeGreaterThan(0);
        expect('metadataStructure1' in Statics).toBe(true);
        expect(Statics.metadataStructure1.length).toBeGreaterThan(0);
        expect('metadataStructure2' in Statics).toBe(true);
        expect(Statics.metadataStructure2.length).toBeGreaterThan(0);
        expect('submissionXLS' in Statics).toBe(true);
        expect(Statics.submissionXLS.length).toBeGreaterThan(0);
        expect('dcic' in Statics).toBe(true);
        expect(Statics.dcic.length).toBeGreaterThan(0);
        expect('acknowledgements' in Statics).toBe(true);
        expect(Statics.acknowledgements.length).toBeGreaterThan(0);
        expect('funding' in Statics).toBe(true);
        expect(Statics.funding.length).toBeGreaterThan(0);

    });



    




});
