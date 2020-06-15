'use strict';

/**
 * @module Set up some global mocks and variables.
 */

import { jsdom } from 'jsdom';
import MutationObserver from 'mutation-observer';

//jest.mock('scriptjs');

if (window.DOMParser === undefined) {
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


Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });
