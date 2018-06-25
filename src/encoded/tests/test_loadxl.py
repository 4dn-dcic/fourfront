import pytest
from encoded import loadxl
import json
from unittest import mock

pytestmark = pytest.mark.working


def test_gen_access_keys(testapp, admin):
    res = loadxl.generate_access_key(testapp,
                                     store_access_key='local',
                                     email=admin['email'])
    res = json.loads(res)
    assert res['default']['server'] == 'http://localhost:8000'
    assert res['default']['secret']
    assert res['default']['key']


def test_gen_access_keys_on_server(testapp, admin):
    old_get = testapp.get

    def side_effect(path):
        from webtest.response import TestResponse
        if path == '/health?format=json':
            tr = TestResponse()
            tr.json_body = {"beanstalk_env": "fourfront-webprod"}
            tr.content_type = 'application/json'
            return tr
        else:
            return old_get(path)

    testapp.get = mock.Mock(side_effect=side_effect)
    with mock.patch('encoded.loadxl.get_beanstalk_real_url') as mocked_url:
        mocked_url.return_value = 'http://fourfront-hotseat'

        res = loadxl.generate_access_key(testapp,
                                         store_access_key='s3',
                                         email=admin['email'])
        res = json.loads(res)
        assert res['default']['server'] == 'http://fourfront-hotseat'
        assert res['default']['secret']
        assert res['default']['key']

        assert mocked_url.called_once()


def test_load_data_endpoint(testapp):
    from pkg_resources import resource_filename
    master_inserts = resource_filename('encoded', 'tests/data/master-inserts/')
    data = {}
    data['user'] = loadxl.read_single_sheet(master_inserts, 'user')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.json['status'] == 'success'


def test_load_data_endpoint_returns_error_if_incorrect_data(testapp):
    from pkg_resources import resource_filename
    master_inserts = resource_filename('encoded', 'tests/data/master-inserts/')
    data = {}
    data['user'] = loadxl.read_single_sheet(master_inserts, 'user')
    data['lab'] = loadxl.read_single_sheet(master_inserts, 'lab')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=422)
        assert res.json['status'] == 'error'
        assert res.json['@graph']


# @pytest.skip("only for performance testing")
def test_load_data_perf_data(testapp):
    '''
    this test is to ensure the performance testing data that is run
    nightly through the mastertest_deployment process in the torb repo
    it takes roughly 25 to run.
    '''

    from pkg_resources import resource_filename
    from os import listdir
    from os.path import isfile, join
    insert_dir = resource_filename('encoded', 'tests/data/perf-testing/')
    inserts = [f for f in listdir(insert_dir) if isfile(join(insert_dir, f))]
    json_inserts = {}

    # pluck a few uuids for testing
    test_types = ['biosample', 'user', 'lab', 'experiment_set_replicate']
    test_inserts = []
    for insert in inserts:
        type_name = insert.split('.')[0]
        json_inserts[type_name] = loadxl.read_single_sheet(insert_dir, type_name)
        # pluck a few uuids for testing
        if type_name in test_types:
            test_inserts.append(json_inserts[type_name][0])

    from timeit import default_timer as timer
    start = timer()
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', json_inserts, status=200)
        assert res.json['status'] == 'success'
    stop = timer()
    # import pdb; pdb.set_trace()
    print("Time to insert is %s" % (stop - start))

    # check a couple random inserts
    for item in test_inserts:
        assert testapp.get("/" + item['uuid'] + "?frame=raw").json['uuid']

    # userful for seeing debug messages
    # assert False






