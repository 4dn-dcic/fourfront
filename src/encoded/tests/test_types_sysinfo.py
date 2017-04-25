import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def sys_info():
    return {"ontology_updated": "2017-01-22", "name": "sysinfo1"}


def test_insert_and_get_sys_info(testapp, sys_info):
    res = testapp.post_json('/sysinfo', sys_info, status=201)
    assert res.json['@graph'][0]['ontology_updated'] == sys_info['ontology_updated']

    res2 = testapp.get('/sysinfos/' + sys_info['name']).follow()
    assert res2.json['name'] == sys_info['name']
    # TODO: test for admin only access to this bad boy
