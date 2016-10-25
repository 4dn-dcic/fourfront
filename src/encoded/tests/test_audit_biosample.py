import pytest


@pytest.fixture
def image(testapp, attachment):
    item = {
        'attachment': attachment,
        'caption': 'Test image'
    }
    return testapp.post_json('/image', item).json['@graph'][0]


@pytest.fixture
def protocol(testapp):
    item = {'description': 'A Protocol'}
    return testapp.post_json('/protocol', item).json['@graph'][0]


@pytest.fixture
def tier1_biosource(testapp, protocol):
    item = {
        'description': 'Tier 1 cell line Biosource',
        'biosource_type': 'immortalized cell line',
        'cell_line': 'IMR90',
        'cell_line_tier': 'Tier 1',
        'SOP_cell_line': protocol['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def tier1_biosample_cell_culture_1_passage(testapp, image):
    item = {
        'culture_start_date': '2016-01-01',
        'passage_number': 1,
        'culture_duration': 2,
        'culture_duration_units': 'days',
        'morphology_image': image['@id']
    }
    return testapp.post_json('/biosample_cell_culture', item).json['@graph'][0]


@pytest.fixture
def tier1_biosample(testapp, tier1_biosource, tier1_biosample_cell_culture_1_passage):
    item = {
        'description': "Tier1 Biosample",
        'biosource': [tier1_biosource['@id']],
        'cell_culture_details': tier1_biosample_cell_culture_1_passage['@id'],
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


def test_audit_biosample_tier1_cell_line_checks(testapp, tier1_biosample):
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    print(res)
    assert False


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


def test_audit_item_status_mismatch(testapp, experiment, embed_testapp):
    patch = {
        'status': 'released'
    }
    testapp.patch_json(experiment['@id'], patch)
    res = embed_testapp.get(experiment['@id'] + '/@@audit-self')
    print(res)
    errors_list = res.json['audit']
    assert any(error['category'] == 'mismatched status' for error in errors_list)
