import pytest
from encoded import loadxl
import json
from unittest import mock
from pkg_resources import resource_filename

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
    master_inserts = resource_filename('encoded', 'tests/data/master-inserts/')
    data = {}
    data['user'] = loadxl.read_single_sheet(master_inserts, 'user')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.json['status'] == 'success'


def test_load_data_endpoint_returns_error_if_incorrect_data(testapp):
    master_inserts = resource_filename('encoded', 'tests/data/master-inserts/')
    data = {}
    data['user'] = loadxl.read_single_sheet(master_inserts, 'user')
    data['lab'] = loadxl.read_single_sheet(master_inserts, 'lab')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=422)
        assert res.json['status'] == 'error'
        assert res.json['@graph']


def test_load_data_user_specified_config(testapp):
    config_uri= 'test.ini'
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', {'config_uri': config_uri}, status=200)
        assert res.json['status'] == 'success'
        mocked_app.assert_called_once_with(config_uri, 'app')


def test_load_data_local_dir(testapp):
    expected_dir = resource_filename('encoded', 'tests/data/perf-testing/')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        with mock.patch('encoded.loadxl.load_all') as load_all:
            mocked_app.return_value = testapp.app
            load_all.return_value = None
            res = testapp.post_json('/load_data', {'local_dir': 'perf-testing'}, status=200)
            assert res.json['status'] == 'success'
            load_all.assert_called_once_with(mock.ANY, expected_dir, [])
