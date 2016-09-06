'use strict';

// Require all components to ensure javascript load ordering
require('./lib');
require('./footer');
require('./globals');
require('./home');
require('./mixins');
require('./statuslabel');
require('./schema');
require('./navigation');
require('./search');


module.exports = require('./app');
