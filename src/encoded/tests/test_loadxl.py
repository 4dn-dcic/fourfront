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
    res = testapp.post_json('/load_data', {}, status=200)
    assert res.json['msg'] == 'thanks'

