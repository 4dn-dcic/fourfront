import pytest
pytestmark = pytest.mark.working


def test_audit_item_schema_validation(testapp, organism):
    testapp.patch_json(organism['@id'] + '?validate=false', {'disallowed': 'errs'})
    res = testapp.get(organism['@id'] + '@@index-data')
    print(res)
    errors = res.json['audit']
    errors_list = []
    for error_type in errors:
        errors_list.extend(errors[error_type])
    assert any(
        error['category'] == 'validation error' and error['name'] == 'audit_item_schema'
        for error in errors_list)


def test_audit_item_schema_upgrade_failure(testapp, organism):
    testapp.patch_json(organism['@id'] + '?validate=false', {'schema_version': '999'})
    res = testapp.get(organism['@id'] + '@@index-data')
    errors = res.json['audit']
    errors_list = []
    for error_type in errors:
        errors_list.extend(errors[error_type])
    assert any(
        error['category'] == 'upgrade failure' and error['name'] == 'audit_item_schema'
        for error in errors_list)


def test_audit_item_schema_upgrade_ok(testapp, organism):
    patch = {
        'schema_version': '1',
        'status': 'current',
    }
    testapp.patch_json(organism['@id'] + '?validate=false', patch)
    res = testapp.get(organism['@id'] + '@@index-data')
    # errors = [e for e in res.json['audit'] if e['name'] == 'audit_item_schema']
    # assert not errors
    errors = res.json['audit']
    errors_list = []
    for error_type in errors:
        errors_list.extend(errors[error_type])
    assert not any(error['name'] == 'audit_item_schema' for error in errors_list)


def test_audit_item_schema_upgrade_validation_failure(testapp, organism):
    patch = {
        'schema_version': '1',
        'status': 'UNKNOWN',
    }
    testapp.patch_json(organism['@id'] + '?validate=false', patch)
    res = testapp.get(organism['@id'] + '@@index-data')
    errors = res.json['audit']
    errors_list = []
    for error_type in errors:
        errors_list.extend(errors[error_type])
    assert any(
        error['category'] == 'validation error: status' and error['name'] == 'audit_item_schema'
        for error in errors_list)


def test_audit_item_schema_permission(testapp, file, embed_testapp):
    # Redmine 2915
    patch = {
        'file_format': 'fastq',
        'status': 'deleted',
    }
    testapp.patch_json(file['@id'], patch)
    res = embed_testapp.get(file['@id'] + '/@@audit-self')
    errors_list = res.json['audit']
    assert not any(error['name'] == 'audit_item_schema' for error in errors_list)


def test_audit_item_status_mismatch(testapp, experiment, embed_testapp):
    patch = {
        'status': 'released'
    }
    testapp.patch_json(experiment['@id'], patch)
    res = embed_testapp.get(experiment['@id'] + '/@@audit-self')
    print(res)
    errors_list = res.json['audit']
    assert any(error['category'] == 'mismatched status' for error in errors_list)


def test_audit_item_obsolete_ontology_term_no_term_linkTos(experiment, embed_testapp):
    res = embed_testapp.get(experiment['@id'] + '/@@audit-self')
    errors_list = res.json['audit']
    assert not any(error['name'] == 'link to obsolete ontology term' for error in errors_list)


def test_audit_item_obsolete_ontology_term_not_obsolete(lung_biosource, embed_testapp):
    res = embed_testapp.get(lung_biosource['@id'] + '/@@audit-self')
    errors_list = res.json['audit']
    assert not any(error['name'] == 'link to obsolete ontology term' for error in errors_list)


def test_audit_item_obsolete_ontology_term_obsolete(
        oterm, lung_biosource, embed_testapp, testapp):
    oterm['status'] = 'obsolete'
    testterm = testapp.post_json('/ontology_term', oterm).json['@graph'][0]
    res = embed_testapp.get(testterm['@id'] + '/@@audit-self')
    errors_list = res.json['audit']
    for error in errors:
        print(error)
        assert any(error['name'] == 'link to obsolete ontology term')  # for error in errors_list)
