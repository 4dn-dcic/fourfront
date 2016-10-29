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
def cell_culture(testapp):
    '''
    A minimal biosample_cell_culture item with only schema-required field
    '''
    return testapp.post_json('/biosample_cell_culture', {'culture_start_date': '2016-01-01'}).json['@graph'][0]


@pytest.fixture
def tier1_cell_culture(testapp, image):
    '''
    A biosample_cell_culture item for a tier 1 cell
    '''
    item = {
        'culture_start_date': '2016-01-01',
        'culture_duration': 2,
        'culture_duration_units': 'days',
        'passage_number': 1,
        'morphology_image': image['@id']
    }
    return testapp.post_json('/biosample_cell_culture', item).json['@graph'][0]


@pytest.fixture
def tier1_biosample(testapp, tier1_biosource, tier1_cell_culture):
    item = {
        'description': "Tier1 Biosample",
        'biosource': [tier1_biosource['@id']],
        'cell_culture_details': tier1_cell_culture['@id'],
    }
    return testapp.post_json('/biosample', item).json['@graph'][0]


def test_audit_biosample_no_audit_if_no_cell_line(testapp, biosample_1):
    res = testapp.get(biosample_1['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_has_required(testapp, tier1_biosample):
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_missing_required(testapp, tier1_biosample, cell_culture):
    testapp.patch_json(tier1_biosample['@id'], {'cell_culture_details': cell_culture['@id']}, status=200)
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_10_passages_has_karyotype(testapp, tier1_biosample, tier1_cell_culture, image):
    testapp.patch_json(
        tier1_cell_culture['@id'],
        {'passage_number': 10, 'karyotype_image': image['@id']},
        status=200)
    testapp.patch_json(
        tier1_biosample['@id'],
        {'cell_culture_details': tier1_cell_culture['@id']},
        status=200)
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    print(res)
    errors = res.json['audit']
    print(errors)
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_10_passages_no_karyotype(testapp, tier1_biosample, tier1_cell_culture, image):
    testapp.patch_json(
        tier1_cell_culture['@id'],
        {'passage_number': 10},
        status=200)
    testapp.patch_json(
        tier1_biosample['@id'],
        {'cell_culture_details': tier1_cell_culture['@id']},
        status=200)
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    print(res)
    errors = res.json['audit']
    print(errors)
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)
