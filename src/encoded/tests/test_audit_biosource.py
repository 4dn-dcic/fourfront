# import pytest
# pytestmark = pytest.mark.working
#
#
# @pytest.fixture
# def bad_biosource(testapp, lab, award):
#     item = {
#         'description': 'Cell line Biosource w/o cell_line',
#         'biosource_type': 'immortalized cell line',
#         'award': award['@id'],
#         'lab': lab['@id']
#     }
#     return testapp.post_json('/biosource', item).json['@graph'][0]
#
#
# def test_audit_biosource_no_audit_if_not_cell_type(testapp, lung_biosource):
#     res = testapp.get(lung_biosource['@id'] + '/@@audit-self')
#     errors = res.json['audit']
#     assert not any(error['category'] == 'missing mandatory metadata' for error in errors)
#
#
# def test_audit_biosource_audit_if_cell_type_has_no_cell_line(testapp, bad_biosource):
#     res = testapp.get(bad_biosource['@id'] + '/@@audit-self')
#     errors = res.json['audit']
#     assert any(error['category'] == 'missing mandatory metadata' for error in errors)
#
#
# def test_audit_biosource_cell_line_type_has_cell_line(testapp, tier1_biosource):
#     res = testapp.get(tier1_biosource['@id'] + '/@@audit-self')
#     errors = res.json['audit']
#     assert not any(error['category'] == 'missing mandatory metadata' for error in errors)
