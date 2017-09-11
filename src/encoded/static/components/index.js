'use strict';

// Require all components to ensure javascript load ordering

/**
 * @file
 * @alias module:app
 */

require('./lib');
require('./util');
require('./viz/utilities');
require('./app');
require('./collection');
require('./footer');
require('./globals');
require('./static-pages/static-page-base');
require('./static-pages/home');
require('./static-pages/help');
require('./submissions');
require('./item-pages/item');
require('./item-pages/DefaultItemView');
require('./item-pages/ExperimentSetView');
require('./item-pages/FileSetCalibrationView');
require('./item-pages/HealthView');
require('./item-pages/UserView');
require('./item-pages/WorkflowRunView');
require('./item-pages/WorkflowView');
require('./item-pages/SchemaView');
require('./item-pages/FallbackView');
require('./item-pages/FileView');
require('./statuslabel');
require('./navigation');
require('./submission/submission-view');
require('./submission/submission-fields');
require('./inputs');
require('./browse/BrowseView');
require('./browse/SearchView');
require('./browse/components');
require('./testwarning');

module.exports = require('./app').default;
