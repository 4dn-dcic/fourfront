import pytest


def test_audit_biosample_no_audit_if_no_cell_line(testapp, tissue_biosample):
    res = testapp.get(tissue_biosample['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert not any(error['category'] == 'missing mandatory metadata' for error in errors)


def test_audit_biosample_audit_if_cell_line_has_cell_line_details(testapp, biosample_1):
    res = testapp.get(biosample_1['@id'] + '/@@audit-self')
    errors = res.json['audit']
    assert any(error['category'] == 'missing mandatory metadata' for error in errors)


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
