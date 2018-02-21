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
require('./footer');
require('./globals');
require('./static-pages/StaticPage');
require('./static-pages/HomePage');
require('./static-pages/HelpPage');
require('./static-pages/PlannedDataSubmission');
require('./static-pages/JointAnalysis');
require('./static-pages/JointAnalysisReports');
require('./submissions');
require('./item-pages/DefaultItemView');
require('./item-pages/ExperimentSetView');
require('./item-pages/ExperimentView');
require('./item-pages/FileSetCalibrationView');
require('./item-pages/HealthView');
require('./item-pages/UserView');
require('./item-pages/WorkflowRunView');
require('./item-pages/WorkflowView');
require('./item-pages/SchemaView');
require('./item-pages/FallbackView');
require('./item-pages/FileView');
require('./item-pages/FileMicroscopyView');
require('./item-pages/BiosampleView');
require('./item-pages/BiosourceView');
require('./item-pages/ProtocolView');
//require('./statuslabel');
require('./navigation');
require('./submission/submission-view');
require('./submission/submission-fields');
require('./inputs');
require('./browse/BrowseView');
require('./browse/SearchView');
require('./browse/components');
require('./testwarning');

module.exports = require('./app').default;
