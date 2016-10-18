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
require('./experiment-set-view');
require('./user');
require('./mixins');
require('./statuslabel');
require('./navigation');
require('./inputs');
require('./schema');
require('./search');
require('./browse');
require('./testwarning');

module.exports = require('./app');
