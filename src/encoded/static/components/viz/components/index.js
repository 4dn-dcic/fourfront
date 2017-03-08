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
 * Legend components to use alongside Charts. Best to include within a UIControlsWrapper, and place next to chart, utilizing the same data.
 * 
 * @member
 * @namespace
 * @type {React.Component}
 */
module.exports.Legend = require('./Legend');

/**
 * Deprecated. Magnifies an SVG component into a viewport which appears over mouse cursor.
 * 
 * @member
 * @namespace
 */
module.exports.ZoomCursor = require('./ZoomCursor');
module.exports.RotatedLabel = require('./RotatedLabel');
module.exports.CursorComponent = require('./CursorComponent');
