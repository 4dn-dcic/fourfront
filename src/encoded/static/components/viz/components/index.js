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
 * @type {Component}
 * @prop {Object[]} fields - List of objects containing at least 'field', in object dot notation. Ideally should also have 'name'.
 * @prop {boolean} includeFieldTitle - Whether to show field title at top of terms.
 * @prop {string} className - Optional className to add to Legend's outermost div container.
 * @prop {number} width - How wide should the legend container element (<div>) be.
 * @prop {string|Element|Component} title - Optional title to display at top of fields.
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
 * @prop {number} angle - Angle of label rotation. Defaults to 30.
 * @prop {number} placementWidth - How wide along the X axis is the object to be labeled. Defaults to 60.
 * @prop {number} placementHeight - How much height, +~10px, is available for the label(s). Defaults to 50.
 * @prop {boolean} isMounted - Pass true if we are not server-side and/or if parent component is mounted. Will not render anything unless this is true. Defaults to false.
 * @prop {number} lineHeight - Line height of label, in px. Defaults to 14. Recommended to leave 14px as CSS stylesheet is set up for this value.
 * @prop {boolean} deRotateAppend - If true, caret or other appendage will be de-rotated from props.angle. Defaults to 14.
 * @prop {Element|Component|string} append - A React Element or Component to append at tail of label, centered at bottom of X axis placement. Defaults to an upwards-pointing caret.
 */
module.exports.RotatedLabel = require('./RotatedLabel');

module.exports.CursorComponent = require('./CursorComponent');
