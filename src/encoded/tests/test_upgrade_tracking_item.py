import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.fixture
def tracking_item_1():
    return {
        "tracking_type": "download_tracking",
        "uuid": "b068f9d3-c026-4ef6-8769-104d745b9ca0",
        "download_tracking": {
            "range_query": True,
            "experiment_type": "in situ Hi-C",
            "remote_ip": "86.154.184.239",
            "request_path": "/files-processed/4DNFIBBKG9KD/@@download/4DNFIBBKG9KD.hic",
            "user_uuid": "anonymous",
            "filename": "4DNFIBBKG9KD.hic",
            "file_format": "hic",
            "geo_country": "GB",
            "geo_city": "Summertown, Oxfordshire",
            "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/72.0.3626.121 Chrome/72.0.3626.121 Safari/537.36",
            "is_visualization": False
        },
        "status": "released",
        "schema_version": "1"
    }


def test_tracking_item_delete_is_visualization(app, tracking_item_1):
    migrator = app.registry['upgrader']
    value = migrator.upgrade('tracking_item', tracking_item_1, current_version='1', target_version='2')
    dt = value['download_tracking']
    assert 'range_query' in dt
    assert 'is_visualization' not in dt
