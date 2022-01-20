'use strict';

/**
 * @module Set up some global mocks and variables.
 */

import { jsdom } from 'jsdom';
import MutationObserver from 'mutation-observer';

//jest.mock('scriptjs');

if (typeof window.DOMParser === 'undefined') {
    // jsdom
    window.DOMParser = function DOMParser() {};
    window.DOMParser.prototype.parseFromString = function parseFromString(markup, type) {
        var parsingMode = 'auto';
        type = type || '';
        if (type.indexOf('xml') >= 0) {
            parsingMode = 'xml';
        } else if (type.indexOf('html') >= 0) {
            parsingMode = 'html';
        }
        var doc = jsdom(markup, { parsingMode: parsingMode });
        return doc;
    };
}


if (typeof window.MutationObserver === 'undefined') {
    // See https://stackoverflow.com/questions/48809753/testing-mutationobserver-with-jest
    Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });
} else {
    console.log("MutationObserver DOES EXIST in Jest environment, we can now delete 'mutation-observer' depndency and disable in jest/environment.js");
}


if (typeof window.BUILDTYPE === 'undefined') {
    // Not used now, added to remove warning msg, but could be purposed for something later.
    window.BUILDTYPE = "Jest";
}

