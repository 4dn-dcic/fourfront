'use strict';

// Require all components to ensure javascript load ordering
require('./lib');
require('./app');
require('./collection');
require('./footer');
require('./globals');
require('./home');
require('./help');
require('./about');
require('./item');
require('./objectutils');
require('./facetlist');
require('./experiment-set-view');
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
