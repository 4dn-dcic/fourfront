'use strict';

// Require all components to ensure javascript load ordering
require('./lib');
require('./app');
require('./collection');
require('./footer');
require('./globals');
require('./static-pages/home');
require('./static-pages/help');
require('./static-pages/about');
require('./facetlist');
require('./item-pages/item-view');
require('./item-pages/experiment-set-view');
require('./item-pages/item');
require('./user');
require('./statuslabel');
require('./navigation');
require('./inputs');
require('./schema');
require('./search');
require('./experiments-table');
require('./browse');
require('./testwarning');

module.exports = require('./app');
