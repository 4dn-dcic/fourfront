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
        "steps": [{ "meta": { "software_used" : software['@id'] } }]
    }


def test_workflow_convert_software_used_to_list_2(
        app, workflow_2, software):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('workflow', workflow_2, current_version='2', target_version='3')
    assert value['schema_version'] == '3'
    assert value['steps'][0]['meta']['software_used'] == [software['@id']]

@pytest.fixture
def workflow_3(software, award, lab):
    return{
        "schema_version": '3',
        "award": award['@id'],
        "lab": lab['@id'],
        "title": "some workflow",
        "name": "some workflow",
        "workflow_type": "Other",
        "arguments": [{"argumant_cardinality": 1},{}],
        "steps": [
            {
                "inputs":  [ {"source": [{"type": "Workflow Input File"} ] }, {} ],
                "outputs": [ {"target": [{"type": "Workflow Output File"}] }, {} ]
            }
        ]
    }

def test_workflow_convert_software_used_to_list_3(
        app, workflow_3, software):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('workflow', workflow_3, current_version='3', target_version='4')
    assert value['schema_version'] == '4'
    assert value['steps'][0]['inputs'][0]['source'].has_key('type') == False
    assert value['steps'][0]['outputs'][0]['target'].has_key('type') == False
