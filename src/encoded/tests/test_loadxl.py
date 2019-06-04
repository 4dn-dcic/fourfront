import pytest
from encoded import loadxl
import json
from unittest import mock
from past.builtins import basestring
from pkg_resources import resource_filename
from encoded.commands.run_upgrader_on_inserts import get_inserts

pytestmark = [pytest.mark.setone, pytest.mark.working]


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

    def side_effect(path, status=None):
        from webtest.response import TestResponse
        if path == '/health?format=json':
            tr = TestResponse()
            tr.json_body = {"beanstalk_env": "fourfront-webprod"}
            tr.content_type = 'application/json'
            return tr
        else:
            return old_get(path, status=status)

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
    data = {'fdn_dir': 'master-inserts',
            'itype': ['award', 'lab', 'user']}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.json['status'] == 'success'


def test_load_data_endpoint_returns_error_if_incorrect_keyword(testapp):
    data = {'mdn_dir': 'master-inserts',
            'itype': ['user']}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=422)
        assert res.json['status'] == 'error'
        assert res.json['@graph']


def test_load_data_endpoint_returns_error_if_incorrect_data(testapp):
    data = {'fdn_dir': 'master-inserts',
            'itype': ['user']}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=422)
        assert res.json['status'] == 'error'
        assert res.json['@graph']


def test_load_data_user_specified_config(testapp):
    data = {'fdn_dir': 'master-inserts',
            'itype': ['user', 'lab', 'award']}
    config_uri = 'test.ini'
    data['config_uri'] = config_uri
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.json['status'] == 'success'
        mocked_app.assert_called_once_with(config_uri, 'app')


def test_load_data_local_dir(testapp):
    expected_dir = resource_filename('encoded', 'tests/data/perf-testing/')
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        with mock.patch('encoded.loadxl.load_all') as load_all:
            mocked_app.return_value = testapp.app
            load_all.return_value = None
            res = testapp.post_json('/load_data', {'fdn_dir': 'perf-testing'}, status=200)
            assert res.json['status'] == 'success'
            load_all.assert_called_once_with(mock.ANY, expected_dir, None, itype=None, overwrite=False, from_json=False)


def test_load_data_from_json(testapp):
    user_inserts = list(get_inserts('master-inserts', 'user'))
    lab_inserts = list(get_inserts('master-inserts', 'lab'))
    award_inserts = list(get_inserts('master-inserts', 'award'))
    data = {'store': {'user': user_inserts, 'lab': lab_inserts, 'award': award_inserts},
            'itype': ['user', 'lab', 'award']}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.json['status'] == 'success'


def test_load_data_local_path(testapp):
    local_path = resource_filename('encoded', 'tests/data/master-inserts/')
    data = {'local_path': local_path, 'itype': ['user', 'lab', 'award']}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.json['status'] == 'success'


def test_load_data_iter_response(testapp):
    """
    Use iter_response=True in the request json to return a Pyramid Response
    that leverages app.iter. The output here will be directly from the
    generator
    """
    user_inserts = list(get_inserts('master-inserts', 'user'))
    lab_inserts = list(get_inserts('master-inserts', 'lab'))
    award_inserts = list(get_inserts('master-inserts', 'award'))
    # the total number of items we expect
    expected = len(user_inserts) + len(lab_inserts) + len(award_inserts)
    data = {'store': {'user': user_inserts, 'lab': lab_inserts, 'award': award_inserts},
            'itype': ['user', 'lab', 'award'], 'iter_response': True}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.content_type == 'text/plain'
        # this is number of successfully POSTed items
        assert res.text.count('POST:') == expected
        # this is number of successfully PATCHed items
        assert res.text.count('PATCH:') == expected
        # this is the number of items that were skipped completely
        assert res.text.count('SKIP:') == 0
        assert res.text.count('ERROR:') == 0


def test_load_data_iter_response_fail(testapp):
    """
    Use iter_response=True in the request json to return a Pyramid Response
    that leverages app.iter. The output here will be directly from the
    generator
    For this test, expect a validation error because we use incomplete data
    """
    user_inserts = list(get_inserts('master-inserts', 'user'))
    # the total number of items we expect
    expected = len(user_inserts)
    data = {'store': {'user': user_inserts}, 'itype': ['user'], 'iter_response': True}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        res = testapp.post_json('/load_data', data, status=200)
        assert res.content_type == 'text/plain'
        # this is number of successfully POSTed items
        assert res.text.count('POST:') == expected
        # no users should be successfully PATCHed due to missing links
        assert res.text.count('PATCH:') == 0
        assert res.text.count('SKIP:') == 0
        # one exception should be encountered
        assert res.text.count('ERROR:') == 1
        assert 'Bad response: 422 Unprocessable Entity' in res.text


def test_load_all_gen(testapp):
    """
    The load_all_gen generator is pretty thoroughly tested by the other
    tests here, but let's test it a bit more explicitly
    """
    user_inserts = list(get_inserts('master-inserts', 'user'))
    lab_inserts = list(get_inserts('master-inserts', 'lab'))
    award_inserts = list(get_inserts('master-inserts', 'award'))
    # the total number of items we expect
    expected = len(user_inserts) + len(lab_inserts) + len(award_inserts)
    data = {'store': {'user': user_inserts, 'lab': lab_inserts, 'award': award_inserts},
            'itype': ['user', 'lab', 'award']}
    with mock.patch('encoded.loadxl.get_app') as mocked_app:
        mocked_app.return_value = testapp.app
        # successful load cases
        gen1 = loadxl.load_all_gen(testapp, data['store'], None,
                                   itype=data['itype'], from_json=True)
        res1 = b''.join([v for v in gen1]).decode()
        assert res1.count('POST:') == expected
        assert res1.count('PATCH:') == expected
        assert res1.count('SKIP:') == 0
        assert res1.count('ERROR:') == 0
        # do the same with LoadGenWrapper
        # items should be SKIP instead of POST, since they were already POSTed
        gen2 = loadxl.load_all_gen(testapp, data['store'], None,
                                   itype=data['itype'], from_json=True)
        catch2 = loadxl.LoadGenWrapper(gen=gen2)
        res2 = b''.join([v for v in catch2]).decode()
        assert catch2.caught is None  # no Exception hit
        assert res2.count('POST:') == 0
        assert res2.count('PATCH:') == expected
        assert res2.count('SKIP:') == expected
        assert res1.count('ERROR:') == 0
        # now handle error cases, both with using LoadGenWrapper and without
        # let's use an bad directory path to cause Exception
        bad_dir = resource_filename('encoded', 'tests/data/not-a-fdn-dir/')
        gen3 = loadxl.load_all_gen(testapp, bad_dir, None)
        res3 = b''.join([v for v in gen3]).decode()
        assert res3.count('POST:') == 0
        assert res3.count('PATCH:') == 0
        assert res3.count('SKIP:') == 0
        assert res3.count('ERROR:') == 1
        assert 'Failure loading inserts' in res3
        # the LoadGenWrapper will give use access to the Exception
        gen4 = loadxl.load_all_gen(testapp, bad_dir, None)
        catch4 = loadxl.LoadGenWrapper(gen=gen4)
        res4 = b''.join([v for v in catch4]).decode()
        assert res4.count('POST:') == 0
        assert res4.count('PATCH:') == 0
        assert res4.count('SKIP:') == 0
        assert res4.count('ERROR:') == 1
        assert 'Failure loading inserts' in res4
        assert isinstance(catch4.caught, basestring)
        assert 'Failure loading inserts' in catch4.caught
