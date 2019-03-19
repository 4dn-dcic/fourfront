'use strict';

// Require all components to ensure javascript load ordering

/**
 * Here we import all of our Content Views (Page Views) and register them
 * to `globals.content_views` so that they may be picked up and routed to in
 * the root `App` component.
 */

import * as globals             from './globals';

import StaticPage               from './static-pages/StaticPage';
import DirectoryPage            from './static-pages/DirectoryPage';

import HomePage                 from './static-pages/HomePage';
import PlannedSubmissionsPage   from './static-pages/PlannedSubmissionsPage';
import ReleaseUpdates           from './static-pages/ReleaseUpdates';
import StatisticsPageView       from './static-pages/StatisticsPageView';


import DefaultItemView          from './item-pages/DefaultItemView';
import ExperimentSetView        from './item-pages/ExperimentSetView';
import ExperimentView, { ExperimentMicView } from './item-pages/ExperimentView';
import FileSetCalibrationView   from './item-pages/FileSetCalibrationView';
import HealthView               from './item-pages/HealthView';
import HiGlassViewConfigView    from './item-pages/HiGlassViewConfigView';
import UserView, { ImpersonateUserForm } from './item-pages/UserView';
import WorkflowRunView          from './item-pages/WorkflowRunView';
import WorkflowView             from './item-pages/WorkflowView';
import SchemaView               from './item-pages/SchemaView';
import FallbackView             from './item-pages/FallbackView';
import FileView                 from './item-pages/FileView';
import FileMicroscopyView       from './item-pages/FileMicroscopyView';
import BiosampleView            from './item-pages/BiosampleView';
import BiosourceView            from './item-pages/BiosourceView';
import ProtocolView             from './item-pages/ProtocolView';
import DocumentView             from './item-pages/DocumentView';
import PublicationView          from './item-pages/PublicationView';
import SubmissionView           from './forms/SubmissionView';
import BrowseView               from './browse/BrowseView';
import SearchView               from './browse/SearchView';
import SubscriptionsView        from './browse/SubscriptionsView';


globals.content_views.register(StaticPage,    'StaticPage');
globals.content_views.register(DirectoryPage, 'DirectoryPage');

globals.content_views.register(HomePage,                'HomePage');
globals.content_views.register(PlannedSubmissionsPage,  'Planned-submissionsPage');
globals.content_views.register(ReleaseUpdates,          'Release-updatesPage');
globals.content_views.register(StatisticsPageView,      'StatisticsPage');


globals.content_views.register(DefaultItemView,         'Item');
globals.content_views.register(BiosampleView,           'Biosample');
globals.content_views.register(BiosourceView,           'Biosource');
globals.content_views.register(ExperimentSetView,       'ExperimentSet');
globals.content_views.register(ExperimentSetView,       'ExperimentSetReplicate');
globals.content_views.register(ExperimentView,          'Experiment');
globals.content_views.register(ExperimentMicView,       'ExperimentMic');
globals.content_views.register(FileMicroscopyView,      'FileMicroscopy');
globals.content_views.register(FileSetCalibrationView,  'FileSetCalibration');
globals.content_views.register(FileView,                'File');
globals.content_views.register(HealthView,              'Health');
globals.content_views.register(HiGlassViewConfigView,   'HiglassViewConfig');
globals.content_views.register(ProtocolView,            'Protocol');
globals.content_views.register(DocumentView,            'Document');
globals.content_views.register(PublicationView,         'Publication');
globals.content_views.register(SchemaView,              'JSONSchema');
globals.content_views.register(UserView,                'User');
globals.content_views.register(ImpersonateUserForm,     'User', 'impersonate-user');
globals.content_views.register(WorkflowRunView,         'WorkflowRun');
globals.content_views.register(WorkflowRunView,         'WorkflowRunSbg');
globals.content_views.register(WorkflowRunView,         'WorkflowRunAwsem');
globals.content_views.register(WorkflowView,            'Workflow');

globals.content_views.register(SubmissionView,          'Item', 'edit');
globals.content_views.register(SubmissionView,          'Item', 'create');
globals.content_views.register(SubmissionView,          'Item', 'clone');
globals.content_views.register(SubmissionView,          'Search', 'add');

globals.content_views.register(BrowseView,              'Browse');
globals.content_views.register(SearchView,              'Search');
globals.content_views.register(SearchView,              'Search', 'selection');
globals.content_views.register(SearchView,              'Browse', 'selection');
globals.content_views.register(SubscriptionsView,       'Submissions'); // TODO: Rename 'Submissions' to 'Subscriptions' on back-end (?)


// Fallback for anything we haven't registered
globals.content_views.fallback = function () {
    return FallbackView;
};

import App from './app';

export default App;
