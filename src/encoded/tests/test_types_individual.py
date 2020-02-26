import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


# @pytest.fixture
# def mouse_individual(testapp, mouse, lab, award):
#     item = {
#         'uuid': '4731442b-f283-4fdf-ad8a-a69cf5a7c68a',
#         "age": 53,
#         "age_units": "day",
#         'award': award['@id'],
#         'lab': lab['@id'],
#         'organism': mouse['@id'],
#         "mouse_strain": "Balb-c",
#         "mouse_life_stage": "adult",
#         "sex": "female",
#     }
#     return testapp.post_json('/individual_mouse', item).json['@graph'][0]


@pytest.fixture
def mouse_child(testapp, mouse, lab, award):
    return {
        'uuid': '4731449b-f283-4fdf-ad8a-b69cf5a7e68a',
        'award': award['@id'],
        'lab': lab['@id'],
        'organism': mouse['@id'],
        "sex": "female",
    }

def test_validate_individual_invalid_relation(testapp, award, lab, mouse_child, human_individual):
    mouse_child['individual_relation'] = [{'relationship_type': 'derived from', 'individual': human_individual['@id']}]
    res = testapp.post_json('/individual_mouse', mouse_child, status=422)
    errors = res.json['errors']
    assert errors[0]['name'] == 'Individual relation: different species'
    # testapp.patch_json(gm12878_oterm['@id'], {'slim_terms': [lung_oterm['@id']]}, status=200)
    # biosource = {'award': award['@id'],
    #              'lab': lab['@id'],
    #              'biosource_type': 'immortalized cell line',
    #              'cell_line': gm12878_oterm['@id']}
    # res = testapp.post_json('/biosource', biosource, status=422)
    # errors = res.json['errors']
    # assert errors[0]['name'] == 'Biosource: invalid cell_line term'
    # assert 'not a known valid cell line' in errors[0]['description']

def test_validate_individual_valid_relation(testapp, award, lab, mouse_individual, mouse_child):
    mouse_child['individual_relation'] = [{'relationship_type': 'derived from', 'individual': mouse_individual['@id']}]
    res = testapp.post_json('/individual_mouse', mouse_child, status=201)
    assert not res.json.get('errors')
