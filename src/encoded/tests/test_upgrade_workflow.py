import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def workflow_2(software_used):
    return{
        "schema_version": '2',
        "steps": { "meta": { "software_used" : software_used['@id'] } } }
    }


def test_workflow_convert_software_used_to_list(
        app, workflow_2, software_used):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('workflow', workflow_2, current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    assert value['steps']['meta']['software_used'] == [software_used['@id']] 
