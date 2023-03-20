'use strict';

// Require all components to ensure javascript load ordering

/**
 * Here we import all of our Content Views (Page Views) and register them
 * to `globals.content_views` so that they may be picked up and routed to in
 * the root `App` component.
 * 
 * VERY IMPORTANT: The routing mechanism dispatching from the back-end is based on the 
 * "title" field ie: if the back-end returns JSON with title=login-success that will trigger
 * the rendering of the LoginSuccessView. In addition, there is some weirdness with 
 * "npm run dev-quick" where it will not reload new components into the system, nor 
 * can they be imported directly from SPC in this file - so you need to override all components
 * from SPC in this repo before configuring the dispatch below. See LoginSuccessView.js and
 * authentication.py for a basic illustration of how it works. - Will March 17 2023
 * 
 */

import { content_views }        from './globals';

import StaticPage               from './static-pages/StaticPage';
import DirectoryPage            from './static-pages/DirectoryPage';

import HomePage                 from './static-pages/HomePage';
import PlannedSubmissionsPage   from './static-pages/PlannedSubmissionsPage';
import ReleaseUpdates           from './static-pages/ReleaseUpdates';
import StatisticsPageView       from './static-pages/StatisticsPageView';


import DefaultItemView          from './item-pages/DefaultItemView';
import ExperimentSetView        from './item-pages/ExperimentSetView';
import ExperimentView, { ExperimentMicView } from './item-pages/ExperimentView';
import ExperimentTypeView       from './item-pages/ExperimentTypeView';
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
import MicroscopeConfigurationView  from './item-pages/MicroscopeConfigurationView';
import BiosampleView            from './item-pages/BiosampleView';
import BiosourceView            from './item-pages/BiosourceView';
import ProtocolView             from './item-pages/ProtocolView';
import DocumentView             from './item-pages/DocumentView';
import ImageView                from './item-pages/ImageView';
import PublicationView          from './item-pages/PublicationView';
import QualityMetricView        from './item-pages/QualityMetricView';
import LabView                  from './item-pages/LabView';
import AwardView                from './item-pages/AwardView';
import StaticSectionView        from './item-pages/StaticSectionView';
import FourfrontSubmissionView  from './forms/FourfrontSubmissionView';
import BrowseView               from './browse/BrowseView';
import SearchView               from './browse/SearchView';
import MicroscopySearchView     from './browse/MicroscopySearchView';
import PublicationSearchView    from './browse/PublicationSearchView';
import SubscriptionsView        from './browse/SubscriptionsView';
import FileSearchView           from './browse/FileSearchView';

// login success view
import LoginSuccessView         from './navigation/components/LoginSuccessView';


content_views.register(StaticPage,    'StaticPage');
content_views.register(DirectoryPage, 'DirectoryPage');

content_views.register(HomePage,                'HomePage');
content_views.register(PlannedSubmissionsPage,  'Planned-submissionsPage');
content_views.register(ReleaseUpdates,          'Release-updatesPage');
content_views.register(StatisticsPageView,      'StatisticsPage');


content_views.register(DefaultItemView,         'Item');
content_views.register(BiosampleView,           'Biosample');
content_views.register(BiosourceView,           'Biosource');
content_views.register(ExperimentSetView,       'ExperimentSet');
content_views.register(ExperimentSetView,       'ExperimentSetReplicate');
content_views.register(ExperimentView,          'Experiment');
content_views.register(ExperimentTypeView,      'ExperimentType');
content_views.register(ExperimentMicView,       'ExperimentMic');
content_views.register(FileMicroscopyView,      'FileMicroscopy');
content_views.register(FileSetCalibrationView,  'FileSetCalibration');
content_views.register(FileView,                'File');
content_views.register(MicroscopeConfigurationView, 'MicroscopeConfiguration');
content_views.register(HealthView,              'Health');
content_views.register(HiGlassViewConfigView,   'HiglassViewConfig');
content_views.register(ProtocolView,            'Protocol');
content_views.register(DocumentView,            'Document');
content_views.register(ImageView,               'Image');
content_views.register(PublicationView,         'Publication');
content_views.register(QualityMetricView,       'QualityMetric');
content_views.register(LabView,                 'Lab');
content_views.register(AwardView,               'Award');
content_views.register(SchemaView,              'JSONSchema');
content_views.register(UserView,                'User');
content_views.register(ImpersonateUserForm,     'User', 'impersonate-user');
content_views.register(WorkflowRunView,         'WorkflowRun');
content_views.register(WorkflowRunView,         'WorkflowRunSbg');
content_views.register(WorkflowRunView,         'WorkflowRunAwsem');
content_views.register(WorkflowView,            'Workflow');
content_views.register(StaticSectionView,       'StaticSection');

content_views.register(FourfrontSubmissionView, 'Item', 'edit');
content_views.register(FourfrontSubmissionView, 'Item', 'create');
content_views.register(FourfrontSubmissionView, 'Item', 'clone');
content_views.register(FourfrontSubmissionView, 'Search', 'add');

content_views.register(BrowseView,              'Browse');
content_views.register(SearchView,              'Search');
content_views.register(PublicationSearchView,   'PublicationSearchResults');
// Use SearchView for all currentAction=selection/multiselect - reassess later re: Publications
content_views.register(SearchView,              'Search', 'selection');
content_views.register(SearchView,              'Search', 'multiselect');
content_views.register(SearchView,              'Browse', 'selection');
content_views.register(SearchView,              'Browse', 'multiselect');
content_views.register(MicroscopySearchView,    'MicroscopeConfigurationSearchResults');
content_views.register(SearchView,              'PublicationSearchResults', 'selection');
content_views.register(SearchView,              'PublicationSearchResults', 'multiselect');
content_views.register(SubscriptionsView,       'Submissions'); // TODO: Rename 'Submissions' to 'Subscriptions' on back-end (?)
content_views.register(FileSearchView,          'FileSearchResults');

content_views.register(LoginSuccessView,        'callback');

// Fallback for anything we haven't registered
content_views.fallback = function () {
    return FallbackView;
};

import App from './app';

export default App;
