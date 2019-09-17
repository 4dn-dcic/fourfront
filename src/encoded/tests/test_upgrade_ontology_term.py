import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.fixture
def ontology_term_1(so_ont, award, lab):
    return{
        "schema_version": '1',
        "term_id": 'SO:0001111',
        "term_name": 'so_term',
        "source_ontology": so_ont['@id']
    }


def test_ontology_term_1_2(
        app, ontology_term_1, so_ont):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('ontology_term', ontology_term_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['source_ontologies'][0] == so_ont['@id']
