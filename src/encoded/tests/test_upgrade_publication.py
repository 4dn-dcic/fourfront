import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def publication_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "authors": "Black JC, White AL, Red A"
    }


def test_publication_convert_author_string_to_list(
        app, publication_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('publication', publication_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    authors = ["Black JC", "White AL", "Red A"]
    for author in authors:
        assert author in value['authors']
