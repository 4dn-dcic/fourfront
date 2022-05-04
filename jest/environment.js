'use strict';

/**
 * @module Set up some global mocks and variables.
 */

import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;
global.DOMParser = window.DOMParser;
global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
global.navigator = {
    userAgent: 'node',
};
//jest.mock('scriptjs');

// if (window.DOMParser === undefined) {
//     // jsdom
//     window.DOMParser = function DOMParser() {};
//     window.DOMParser.prototype.parseFromString = function parseFromString(markup, type) {
//         var parsingMode = 'auto';
//         type = type || '';
//         if (type.indexOf('xml') >= 0) {
//             parsingMode = 'xml';
//         } else if (type.indexOf('html') >= 0) {
//             parsingMode = 'html';
//         }
//         var doc = new JSDOM(markup, { parsingMode: parsingMode });
//         return doc;
//     };
// }


// if (window.MutationObserver === undefined) {
//     // See https://stackoverflow.com/questions/48809753/testing-mutationobserver-with-jest
//     Object.defineProperty(window, 'MutationObserver', { value: MutationObserver });
// } else {
//     console.log("MutationObserver DOES EXIST in Jest environment, we can now delete 'mutation-observer' depndency and disable in jest/environment.js");
// }


// if (window.BUILDTYPE === undefined) {
//     // Not used now, added to remove warning msg, but could be purposed for something later.
//     window.BUILDTYPE = "Jest";
// }

// TODO: adjust a dom.window, return it or something?