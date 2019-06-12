import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.fixture
def biosample_cell_culture_1(de_term, award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "differentiation_tissue": de_term['@id']
    }


def test_biosample_cell_culture_1_2(
        app, biosample_cell_culture_1, de_term):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('biosample_cell_culture', biosample_cell_culture_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert 'differentiation_tissue' not in value
    assert value['tissue'] == de_term['@id']
