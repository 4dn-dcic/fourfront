'use strict';

var _ = require('underscore');

/**
 * A directory of methods and maybe a mini-component or two for common use.
 */

module.exports = _.extend({
    'object'        : require('./object'),          // Transforms, manipulations, parsers, etc. re: objects.
    'layout'        : require('./layout'),          // Layout utilities
    'ajax'          : require('./ajax'),            // Self-explanatory. Make AJAX requests with these functions.
    'console'       : require('./console'),         // Patches over browser window's console and disables logging (e.g. console.log) on production. Just import from component.
    'JWT'           : require('./json-web-token'),  // Functions related to JWT encoding/decoding/storage. Prevent name interference with 'jwt' NPM package
    'DateUtility'   : require('./date'),            // Use momentjs to parse and localize datetime. Has useful React component - DateUtility.LocalizedTime - which shows time in user's timezone after mount.
    'expFxn'        : require('./experiments-transforms'),
    'expFilters'    : require('./experiments-filters')
}, require('./misc')); // Add misc functions to root.
