import pytest
from encoded import loadxl
from unittest import mock
from timeit import default_timer as timer
from pkg_resources import resource_filename

pytestmark = pytest.mark.performance


def test_load_data_local_dir(testapp):
    expected_dir = resource_filename('encoded', 'tests/data/perf-testing/')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        with mock.patch('encoded.loadxl.load_all') as load_all:
            mocked_app.return_value = testapp.app
            load_all.return_value = None
            res = testapp.post_json('/load_data', {'local_dir': 'perf-testing'}, status=200)
            assert res.json['status'] == 'success'
            load_all.assert_called_once_with(mock.ANY, expected_dir, [])


def test_load_data_perf_data(testapp):
    '''
    this test is to ensure the performance testing data that is run
    nightly through the mastertest_deployment process in the torb repo
    it takes roughly 25 to run.
    Note:  run with bin/test -s -k test_performance to see the prints from the test
    '''

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
            test_inserts.append({'type_name': type_name, 'data':json_inserts[type_name][0]})

    # load -em up
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
        start = timer()
        assert testapp.get("/" + item['data']['uuid'] + "?frame=raw").json['uuid']
        stop = timer()
        frame_time = stop - start

        start = timer()
        assert testapp.get("/" + item['data']['uuid']).follow().json['uuid']
        stop = timer()
        embed_time = stop - start

        print("Time to query item %s - %s raw: %s embed %s" % (item['type_name'], item['data']['uuid'],
                                                               frame_time, embed_time))

    # userful for seeing debug messages
    # assert False
