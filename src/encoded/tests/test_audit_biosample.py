import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def tier1_biosource(testapp, protocol, lab, award):
    item = {
        'description': 'Tier 1 cell line Biosource',
        'biosource_type': 'immortalized cell line',
        'cell_line': 'IMR-90',
        'SOP_cell_line': protocol['@id'],
        'cell_line_tier': 'Tier 1',
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def cell_culture(testapp, lab, award):
    '''
    A minimal biosample_cell_culture item with only schema-required field
    '''
    return testapp.post_json('/biosample_cell_culture',
                             {'culture_start_date': '2016-01-01',
                              'award': award['@id'],
                              'lab': lab['@id']
                              }
                             ).json['@graph'][0]


@pytest.fixture
def tier1_cell_culture(testapp, image, lab, award):
    '''
    A biosample_cell_culture item for a tier 1 cell
    '''
    item = {
        'culture_start_date': '2016-01-01',
        'culture_duration': 2,
        'passage_number': 1,
        'morphology_image': image['@id'],
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosample_cell_culture', item).json['@graph'][0]


@pytest.fixture
def biosample_data(tier1_biosource, lab, award):
    return {'description': "Tier 1 Biosample",
            'biosource': [tier1_biosource['@id']],
            'lab': lab['@id'],
            'award': award['@id']
            }


@pytest.fixture
def tier1_biosample(testapp, biosample_data, tier1_cell_culture):
    biosample_data['cell_culture_details'] = tier1_cell_culture['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_no_cld(testapp, biosample_data):
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_missing_cld_required(testapp, biosample_data, cell_culture):
    biosample_data['cell_culture_details'] = cell_culture['@id']
    print(biosample_data)
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_10_passages_no_image(testapp, biosample_data, tier1_cell_culture):
    testapp.patch_json(tier1_cell_culture['@id'], {'passage_number': 10}, status=200)
    biosample_data['cell_culture_details'] = tier1_cell_culture['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_10_passages_w_image(testapp, biosample_data, tier1_cell_culture, image):
    testapp.patch_json(tier1_cell_culture['@id'], {'passage_number': 10}, status=200)
    testapp.patch_json(tier1_cell_culture['@id'], {'karyotype_image': image['@id']}, status=200)
    biosample_data['cell_culture_details'] = tier1_cell_culture['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


def test_audit_biosample_no_audit_if_no_cell_line(testapp, tissue_biosample):
    res = testapp.get(tissue_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_audit_if_cell_line_has_no_cell_line_details(testapp, tier1_biosample_no_cld):
    res = testapp.get(tier1_biosample_no_cld['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_missing_required(testapp, tier1_biosample_missing_cld_required):
    res = testapp.get(tier1_biosample_missing_cld_required['@id'] + '/@@audit-self')
    print(res)
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_has_required(testapp, tier1_biosample):
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_10_passages_has_karyotype(testapp, tier1_biosample_10_passages_w_image):
    res = testapp.get(tier1_biosample_10_passages_w_image['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_10_passages_no_karyotype(testapp, tier1_biosample_10_passages_no_image):
    res = testapp.get(tier1_biosample_10_passages_no_image['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)
