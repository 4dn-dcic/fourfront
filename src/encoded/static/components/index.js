'use strict';

// Require all components to ensure javascript load ordering

/**
 * @file
 * @alias module:app
 */

require('./lib');
require('./util');
require('./app');
require('./collection');
require('./footer');
require('./globals');
require('./static-pages/static-page-base');
require('./static-pages/home');
require('./static-pages/help');
require('./static-pages/about');
require('./uploads');
require('./submissions');
require('./facetlist');
require('./item-pages/item-view');
require('./item-pages/experiment-set-view');
require('./item-pages/file-set-calibration-view');
require('./item-pages/item');
require('./item-pages/user');
require('./statuslabel');
require('./navigation');
require('./inputs');
require('./schema');
require('./search');
require('./experiments-table');
require('./browse');
require('./testwarning');

module.exports = require('./app');
