'use strict';

// Require all components to ensure javascript load ordering
require('./lib');
require('./app');
require('./footer');
require('./globals');
require('./home');
require('./mixins');
require('./statuslabel');
require('./navigation');
require('./inputs');
require('./schema');
require('./search');


module.exports = require('./app');
