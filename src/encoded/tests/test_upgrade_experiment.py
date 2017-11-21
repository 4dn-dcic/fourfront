import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def experiment_repliseq_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "experiment_type": "repliseq"
    }


def test_experiment_repliseq_update_type(app, experiment_repliseq_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_repliseq', experiment_repliseq_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert value['experiment_type'] == 'Repli-seq'
