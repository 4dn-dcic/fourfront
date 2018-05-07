import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def data_release_update_1(award, lab):
    return{
        "schema_version": '1',
        "award": award['@id'],
        "lab": lab['@id'],
        "summary": "Upgrader test.",
        "update_tag": "UPGRADERTEST",
        "submitted_by": "4dndcic@gmail.com",
        "severity": 1,
        "is_internal": False,
        "parameters": [
            "tags=4DN Joint Analysis 2018"
        ],
        "comments": "Test upgrader",
        "foursight_uuid": "2018-02-12T16:54:38.526810+00:00",
        "end_date": "2018-02-14",
        "start_date": "2018-02-13",
        "update_items": [
            {
                "primary_id": "431106bc-8535-4448-903e-854af460b112",
                "secondary_id": "431106bc-8535-4448-903e-854af460b112"
            }
        ]
    }


def test_data_release_updates_secondary_id_to_secondary_ids(
        app, data_release_update_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('data_release_update', data_release_update_1, current_version='1', target_version='2')
    assert value['schema_version'] == '2'
    update_items = value['update_items']
    assert len(update_items) == 1
    assert 'primary_id' in update_items[0]
    assert 'secondary_ids' in update_items[0]
    assert 'secondary_id' not in update_items[0]
    assert isinstance(update_items[0]['secondary_ids'], list)
    assert len(update_items[0]['secondary_ids']) == 1
