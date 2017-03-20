import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def target_1(basic_genomic_region, award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "targeted_region": basic_genomic_region['@id']
    }


@pytest.fixture
def target_2(target_1):
    item = target_1.copy()
    item.update({
        'schema_version': '2',
    })
    return item


def test_target_convert_targeted_region_to_targeted_genome_regions(
        app, target_2, basic_genomic_region):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('target', target_2, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['targeted_genome_regions'][0] == basic_genomic_region['@id']
