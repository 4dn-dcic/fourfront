import pkg_resources


_app_settings = {
    'collection_datastore': 'database',
    'item_datastore': 'database',
    'multiauth.policies': 'session remoteuser accesskey auth0',
    'multiauth.groupfinder': 'encoded.authorization.groupfinder',
    'multiauth.policy.session.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.session.base': 'pyramid.authentication.SessionAuthenticationPolicy',
    'multiauth.policy.session.namespace': 'mailto',
    'multiauth.policy.remoteuser.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.remoteuser.namespace': 'remoteuser',
    'multiauth.policy.remoteuser.base': 'pyramid.authentication.RemoteUserAuthenticationPolicy',
    'multiauth.policy.accesskey.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.accesskey.namespace': 'accesskey',
    'multiauth.policy.accesskey.base': 'encoded.authentication.BasicAuthAuthenticationPolicy',
    'multiauth.policy.accesskey.check': 'encoded.authentication.basic_auth_check',
    'multiauth.policy.auth0.use': 'encoded.authentication.NamespacedAuthenticationPolicy',
    'multiauth.policy.auth0.namespace': 'auth0',
    'multiauth.policy.auth0.base': 'encoded.authentication.Auth0AuthenticationPolicy',
    'load_test_only': True,
    'testing': True,
    'indexer': True,
    'mpindexer': False,
    'production': True,
    'pyramid.debug_authorization': True,
    'postgresql.statement_timeout': 20,
    'sqlalchemy.url': 'dummy@dummy',
    'retry.attempts': 3,
    'ontology_path': pkg_resources.resource_filename('encoded', '../../ontology.json'),
    # some file specific stuff for testing
    'file_upload_bucket': 'test-wfout-bucket',
    'file_wfout_bucket': 'test-wfout-bucket',
    'file_upload_profile_name': 'test-profile',
}

def make_app_settings_dictionary():
    return _app_settings.copy()


ORDER = [
    'user', 'award', 'lab', 'static_section', 'higlass_view_config', 'page',
    'ontology', 'ontology_term', 'file_format', 'badge', 'organism', 'gene',
    'genomic_region', 'bio_feature', 'target', 'imaging_path', 'publication',
    'publication_tracking', 'document', 'image', 'vendor', 'construct',
    'modification', 'experiment_type', 'protocol', 'sop_map', 'biosample_cell_culture',
    'individual_human', 'individual_mouse', 'individual_fly', 'individual_primate',
    'individual_chicken', 'individual_zebrafish', 'biosource', 'antibody', 'enzyme',
    'treatment_rnai', 'treatment_agent',
    'biosample', 'quality_metric_fastqc', 'quality_metric_bamcheck', 'quality_metric_rnaseq',
    'quality_metric_bamqc', 'quality_metric_pairsqc', 'quality_metric_margi',
    'quality_metric_dedupqc_repliseq', 'quality_metric_chipseq', 'quality_metric_workflowrun',
    'quality_metric_atacseq', 'quality_metric_rnaseq_madqc',  'quality_metric_qclist',
    'microscope_setting_d1', 'microscope_setting_d2',
    'microscope_setting_a1', 'microscope_setting_a2', 'file_fastq',
    'file_processed', 'file_reference', 'file_calibration', 'file_microscopy',
    'file_set', 'file_set_calibration', 'file_set_microscope_qc',
    'file_vistrack', 'experiment_hi_c', 'experiment_capture_c',
    'experiment_repliseq', 'experiment_atacseq', 'experiment_chiapet',
    'experiment_damid', 'experiment_seq', 'experiment_tsaseq',
    'experiment_mic', 'experiment_set', 'experiment_set_replicate',
    'data_release_update', 'software', 'analysis_step', 'workflow',
    'workflow_mapping', 'workflow_run_sbg', 'workflow_run_awsem',
    'tracking_item', 'quality_metric_flag',
    'summary_statistic', 'summary_statistic_hi_c', 'workflow_run',
    'microscope_configuration'
]
