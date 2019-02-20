'use strict';

// Require all components to ensure javascript load ordering

/**
 * @file
 * @alias module:app
 */

require('./lib');
require('./util');
require('./viz/utilities');
require('./footer');
require('./globals');
require('./static-pages/StaticPage');
require('./static-pages/DirectoryPage');
require('./static-pages/HomePage');
require('./static-pages/PlannedDataSubmission');
require('./static-pages/ReleaseUpdates');
require('./static-pages/StatisticsPage');
require('./item-pages/DefaultItemView');
require('./item-pages/ExperimentSetView');
require('./item-pages/ExperimentView');
require('./item-pages/FileSetCalibrationView');
require('./item-pages/HealthView');
require('./item-pages/HiGlassViewConfigView');
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
require('./item-pages/PublicationView');
require('./forms/SubmissionView');
require('./browse/BrowseView');
require('./browse/SearchView');
require('./browse/SubscriptionsView');

const App = require('./app').default;

export default App;
