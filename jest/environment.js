'use strict';

/**
 * @module Set up some global mocks and variables.
 */

import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const dom = new JSDOM('', { url: 'http://localhost/' });
global.document = dom.window.document;
global.window = dom.window;
global.DOMParser = window.DOMParser;
global.Element = window.Element;
global.HTMLElement = window.HTMLElement;
// In browsers window properties are also globals. The Node + JSDOM fixture
// keeps them separate, so expose the analytics queue installed by the app.
Object.defineProperty(global, 'gtag', { configurable: true, get: () => window.gtag });

// JSDOM has no media-query/layout engine. Keep the default fixture in reduced
// motion mode; tests may override matches or element geometry when needed.
window.matchMedia = (media) => Object.assign(new window.EventTarget(), {
    media,
    matches: false,
    onchange: null,
    addListener(listener) { this.addEventListener('change', listener); },
    removeListener(listener) { this.removeEventListener('change', listener); }
});
global.ResizeObserver = window.ResizeObserver = class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, contentRect: target.getBoundingClientRect() }], this); }
    unobserve() {}
    disconnect() {}
};
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