'use strict';

/**
 * A collection of components to aid in visualization or charting.
 * 
 * @module viz/components
 * @example
 * <caption>Import and use components like any other modules, e.g.</caption>
 * var { FetchingView, Legend } = require('./viz/components');
 */


module.exports.ActiveFiltersBar = require('./ActiveFiltersBar').default;
export * from './SVGFilters';
export * from './FetchingView';
module.exports.Legend = require('./Legend').default;

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

