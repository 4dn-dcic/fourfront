'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 * 
 * @module util
 */

// Misc functions are top-level
var misc                    = require('./misc');
module.exports.isServerSide = misc.isServerSide;

/** Transforms, manipulations, parsers, etc. re: objects. **/
module.exports.object       = require('./object');


/**
 * A singleton function, defined the old fashioned way (pre ES6).
 * Uses the same parameters as app.prototype.navigate(..).
 * 
 * Use by importing and calling in the same way app.navigate might be used.
 * 
 * @member
 * @namespace
 * @type {function}
 * @see module:app.navigate
 * @example
 * var { navigate } = require('./util');
 * navigate('/a/different/page', options);
 */
module.exports.navigate     = require('./navigate').default;

/** Analytics utilities */
module.exports.analytics    = require('./analytics');

/** Layout utilities */
module.exports.layout       = require('./layout');

/** Self-explanatory. Make AJAX requests with these functions. */
module.exports.ajax         = require('./ajax');

/** Patches over browser window's console and disables logging (e.g. console.log) on production. Just import from this module to patch. */
module.exports.console      = require('./patched-console').default;

/** Functions related to JWT encoding/decoding/storage. Prevent name interference with 'jwt' NPM package */
module.exports.JWT          = require('./json-web-token');
if (!misc.isServerSide()) {
    window.JWT = module.exports.JWT;
}

/** Use momentjs to parse and localize datetime. Has useful React component - DateUtility.LocalizedTime - which shows time in user's timezone after mount. */
module.exports.DateUtility  = require('./date-utility');

module.exports.expFxn       = require('./experiments-transforms');
module.exports.Filters      = require('./experiments-filters');
module.exports.Schemas      = require('./Schemas');
