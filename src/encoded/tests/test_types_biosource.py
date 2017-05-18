import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def cell_lines(GM12878_biosource, F123_biosource):
    return [GM12878_biosource, F123_biosource]


@pytest.fixture
def whole_biosource(testapp, human_individual, lab, award):
    item = {
        "biosource_type": "whole organisms",
        "individual": human_individual['@id'],
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/biosource', item).json['@graph'][0]


@pytest.fixture
def biosources(cell_lines, lung_biosource, whole_biosource):
    bs = cell_lines
    bs.extend([lung_biosource, whole_biosource])
    return bs


def test_calculated_biosource_name(biosources):
    for biosource in biosources:
        biotype = biosource['biosource_type']
        name = biosource['biosource_name']
        if biotype == 'immortalized cell line':
            assert name == 'GM12878'
        if biotype == 'stem cell':
            assert name == 'F123-CASTx129'
        if biotype == 'tissue':
            assert name == 'lung'
        if biotype == 'whole organisms':
            assert name == 'whole human'


# def test_validate_biosource_tissue_no_tissue(testapp, award, lab, gm12878_oterm):
#     biosource = {'award': award['@id'],
#                  'lab': lab['@id'],
#                  'biosource_type': 'immortalized cell line',
#                  'cell_line': 'GM12878'}
#     res = testapp.post_json('/biosource', biosource, status=201)
#     assert not res.json.get('errors')
#
#
# def test_validate_biosource_tissue_invalid(testapp, award, lab, lung_oterm, ontology):
#     testapp.patch_json(lung_oterm['@id'], {'source_ontology': ontology['@id']}, status=200)
#     biosource = {'award': award['@id'],
#                  'lab': lab['@id'],
#                  'biosource_type': 'tissue',
#                  'tissue': lung_oterm['@id']}
#     res = testapp.post_json('/biosource', biosource, status=422)
#     errors = res.json['errors']
#     assert 'not found in UBERON' in errors[0]['description']
#
#
# def test_validate_biosource_tissue_valid_atid(testapp, award, lab, lung_oterm):
#     biosource = {'award': award['@id'],
#                  'lab': lab['@id'],
#                  'biosource_type': 'tissue',
#                  'tissue': lung_oterm['@id']}
#     res = testapp.post_json('/biosource', biosource, status=201)
#     assert not res.json.get('errors')
#
#
# def test_validate_biosource_tissue_valid_uuid(testapp, award, lab, lung_oterm):
#     biosource = {'award': award['@id'],
#                  'lab': lab['@id'],
#                  'biosource_type': 'tissue',
#                  'tissue': lung_oterm['uuid']}
#     res = testapp.post_json('/biosource', biosource, status=201)
#     assert not res.json.get('errors')
#
#
# def test_validate_biosource_tissue_on_valid_patch(testapp, award, lab, lung_oterm):
#     biosource = {'award': award['@id'],
#                  'lab': lab['@id'],
#                  'biosource_type': 'tissue',
#                  'tissue': lung_oterm['uuid']}
#     res = testapp.post_json('/biosource', biosource, status=201)
#     assert not res.json.get('errors')
#     new_oterm = {'term_name': 'finger',
#                  'term_id': 'UBERON:0000009',
#                  'source_ontology': lung_oterm['source_ontology']}
#     ot = testapp.post_json('/ontology_term', new_oterm, status=201)
#     pid = '/' + res.json['@graph'][0].get('uuid')
#     res2 = testapp.patch_json(pid, {'tissue': ot.json['@graph'][0]['uuid']})
#     assert not res2.json.get('errors')
#
#
# def test_validate_biosource_tissue_on_invalid_patch(testapp, award, lab, lung_oterm, ontology):
#     biosource = {'award': award['@id'],
#                  'lab': lab['@id'],
#                  'biosource_type': 'tissue',
#                  'tissue': lung_oterm['uuid']}
#     res = testapp.post_json('/biosource', biosource, status=201)
#     assert not res.json.get('errors')
#     new_oterm = {'term_name': 'finger',
#                  'term_id': 'UBERON:0000009',
#                  'source_ontology': ontology['uuid']}
#     ot = testapp.post_json('/ontology_term', new_oterm, status=201)
#     pid = '/' + res.json['@graph'][0].get('uuid')
#     res2 = testapp.patch_json(pid, {'tissue': ot.json['@graph'][0]['uuid']}, status=422)
#     errors = res2.json['errors']
#     assert 'not found in UBERON' in errors[0]['description']
