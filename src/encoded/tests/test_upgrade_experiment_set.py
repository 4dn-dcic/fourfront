import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def experiment_set_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "date_released": "2017-01-01"
    }


@pytest.fixture
def experiment_set_replicate_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "date_released": "2017-01-01"
    }


def test_experiment_set_convert_date_released_to_public_release(
        app, experiment_set_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_set', experiment_set_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert 'date_released' not in value
    assert value['public_release'] == "2017-01-01"


def test_experiment_set_replicate_convert_date_released_to_public_release(
        app, experiment_set_replicate_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('experiment_set_replicate', experiment_set_replicate_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    assert 'date_released' not in value
    assert value['public_release'] == "2017-01-01"
