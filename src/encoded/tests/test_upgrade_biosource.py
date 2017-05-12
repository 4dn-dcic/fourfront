import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def biosource_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "biosource_type": "immortalized cell line",
        "cell_line": "GM12878"
    }


@pytest.fixture
def biosource_2(biosource_1):
    item = biosource_1.copy()
    item.update({
        'schema_version': '2',
    })
    return item


def test_biosource_convert_cell_line_to_link_to_ontology_term(
        app, biosource_2, gm12878_oterm):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('biosource', biosource_2, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['cell_line'] == gm12878_oterm['@id']
