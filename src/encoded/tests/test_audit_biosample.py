import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def biosample_data(tier1_biosource):
    return {'description': "Tier 1 Biosample", 'biosource': [tier1_biosource['@id']]}


@pytest.fixture
def tier1_biosample(testapp, biosample_data, tier1_cell_culture):
    biosample_data['cell_culture_details'] = tier1_cell_culture['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_no_cld(testapp, biosample_data):
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_missing_cld(testapp, biosample_data, cell_culture):
    biosample_data['cell_culture_details'] = cell_culture['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_10_passages_no_image(testapp, biosample_data, tier1_cell_culture):
    t1cc = tier1_cell_culture
    t1cc['passage_number'] = 10
    print(t1cc)
    biosample_data['cell_culture_details'] = t1cc['@id']
    print(biosample_data)
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


@pytest.fixture
def tier1_biosample_10_passages_w_image(testapp, biosample_data, tier1_cell_culture, image):
    t1cc = tier1_cell_culture
    t1cc['passage_number'] = 10
    t1cc['karyotype_image'] = image['@id']
    biosample_data['cell_culture_details'] = t1cc['@id']
    return testapp.post_json('/biosample', biosample_data).json['@graph'][0]


def test_audit_biosample_no_audit_if_no_cell_line(testapp, tissue_biosample):
    res = testapp.get(tissue_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_audit_if_cell_line_has_no_cell_line_details(testapp, tier1_biosample_no_cld):
    res = testapp.get(tier1_biosample_no_cld['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_has_required(testapp, tier1_biosample):
    res = testapp.get(tier1_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_missing_required(testapp, tier1_biosample_missing_cld):
    res = testapp.get(tier1_biosample_missing_cld['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_10_passages_has_karyotype(testapp, tier1_biosample_10_passages_w_image):
    res = testapp.get(tier1_biosample_10_passages_w_image['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_tier1_cell_line_10_passages_no_karyotype(testapp, tier1_biosample_10_passages_no_image):
    print(tier1_biosample_10_passages_no_image)
    res = testapp.get(tier1_biosample_10_passages_no_image['@id'] + '/@@audit-self')
    print(res)
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)
