import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def biosource_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "biosource_type": "immortalized cell line",
        "cell_line": "GM12878",
        "cell_line_termid": "EFO:0000001"
    }


@pytest.fixture
def biosource_2(biosource_1):
    item = biosource_1.copy()
    item['cell_line'] = 'blah'
    return item


def test_biosource_convert_cell_line_to_link_to_ontology_term(
        registry, biosource_1, gm12878_oterm):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('biosource', biosource_1, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['cell_line'] == gm12878_oterm['uuid']
    assert 'cell_line_termid' not in value


def test_biosource_convert_cell_line_w_no_ontology_term(
        registry, biosource_2):
    from snovault import UPGRADER
    upgrader = registry[UPGRADER]
    value = upgrader.upgrade('biosource', biosource_2, registry=registry,
                             current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert 'cell_line' not in value
    assert 'cell_line_termid' not in value
