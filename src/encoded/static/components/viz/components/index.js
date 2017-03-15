'use strict';

/**
 * A collection of components to aid in visualization or charting.
 * 
 * @module viz/components
 * @example
 * <caption>Import and use components like any other modules, e.g.</caption>
 * var { FetchingView, Legend } = require('./viz/components');
 */


module.exports.ActiveFiltersBar = require('./ActiveFiltersBar');
module.exports.SVGFilters = require('./SVGFilters');
module.exports.FetchingView = require('./FetchingView');

/**
 * @alias module:viz/components.Legend
 */
module.exports.Legend = require('./Legend');

/**
 * Deprecated. Magnifies an SVG component into a viewport which appears over mouse cursor.
 * 
 * @member
 * @namespace
 * @type {Component}
 */
module.exports.ZoomCursor = require('./ZoomCursor');

/**
 * A label meant to be place along an X-axis. Given an angle, label text, placementHeight, and other properties, calculates 
 * visible portion of label and rotates it. Handles showing full label onHover.
 * Optionally adds a directional pointer icon to tail of label.
 * 
 * @member
 * @namespace
 * @type {Component}
 */
module.exports.RotatedLabel = require('./RotatedLabel');

module.exports.CursorComponent = require('./CursorComponent');
