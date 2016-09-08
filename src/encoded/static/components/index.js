'use strict';

// Require all components to ensure javascript load ordering
require('./lib');
require('./app');
require('./collection');
require('./footer');
require('./globals');
require('./home');
require('./item');
require('./user');
require('./mixins');
require('./statuslabel');
require('./navigation');
require('./inputs');
require('./schema');
require('./search');


module.exports = require('./app');
