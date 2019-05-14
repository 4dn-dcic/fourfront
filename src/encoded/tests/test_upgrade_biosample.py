import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.fixture
def biosample_1(biosample_cc_wo_diff, GM12878_biosource, award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "cell_culture_details": biosample_cc_wo_diff['@id'],
        "biosource": [GM12878_biosource['@id']]
    }


def test_biosample_1_2(
        app, biosample_1, biosample_cc_wo_diff):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('biosample', biosample_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['cell_culture_details'][0] == biosample_cc_wo_diff['@id']
