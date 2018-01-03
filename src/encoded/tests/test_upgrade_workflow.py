import pytest
# pytestmark = pytest.mark.working


@pytest.fixture
def workflow_2(software, award, lab):
    return{
        "schema_version": '2',
        "award": award['@id'],
        "lab": lab['@id'],
        "title": "some workflow",
        "name": "some workflow",
        "workflow_type": "Other",
        "steps": { "meta": { "software_used" : software['@id'] } }
    }


def test_workflow_convert_software_used_to_list(
        app, workflow_2, software):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('workflow', workflow_2, current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    assert value['steps']['meta']['software_used'] == [software['@id']]
