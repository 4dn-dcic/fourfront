import pytest
from unittest import mock
from encoded.commands.load_access_keys import generate_access_key

pytestmark = [pytest.mark.setone, pytest.mark.working]

# TODO: test load_access_keys.get_existing_key_ids, which would use ES

def test_gen_access_keys(testapp, admin):
    with mock.patch('encoded.commands.load_access_keys.get_beanstalk_real_url') as mocked_url:
        mocked_url.return_value = 'http://fourfront-hotseat'
        res = generate_access_key(testapp, 'test_env', admin['uuid'], 'test_desc')
        assert res['server'] == 'http://fourfront-hotseat'
        assert res['secret']
        assert res['key']
        assert mocked_url.called_once()
