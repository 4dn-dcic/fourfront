import pytest
import requests
import time
from datetime import datetime
from encoded.authentication import get_token_info
pytestmark = pytest.mark.working


@pytest.fixture(scope='session')
def auth0_access_token():
    creds = {
        'connection': 'Username-Password-Authentication',
        'scope': 'openid',
        'client_id': 'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
        'grant_type': 'password',
        'username': '4dndcic@gmail.com',
        'password': 'Testing123',
    }
    url = 'https://hms-dbmi.auth0.com/oauth/ro'
    try:
        res = requests.post(url, json=creds)
        res.raise_for_status()
    except Exception as e:
        pytest.skip("Error retrieving auth0 test user access token: %r" % e)

    data = res.json()
    if 'id_token' not in data:
        pytest.skip("Missing 'id_token' in auth0 test user access token: %r" % data)

    return data['id_token']


@pytest.fixture(scope='session')
def auth0_4dn_user_token(auth0_access_token):
    return {'id_token': auth0_access_token}


@pytest.fixture(scope='session')
def auth0_4dn_user_profile(auth0_access_token):
    return get_token_info(auth0_access_token)


def test_login_unknown_user(anontestapp, auth0_4dn_user_token):
    res = anontestapp.post_json('/login', auth0_4dn_user_token, status=403)
    import pdb; pdb.set_trace()
    assert 'Set-Cookie' in res.headers


def test_login_logout(testapp, anontestapp, auth0_4dn_user_token,
                      auth0_4dn_user_profile):
    # Create a user with the persona email
    url = '/users/'
    email = auth0_4dn_user_profile['email']
    item = {
        'email': email,
        'first_name': 'Auth0',
        'last_name': 'Test User',
    }
    testapp.post_json(url, item, status=201)

    # Log in
    res = anontestapp.post_json('/login', auth0_4dn_user_token)

    assert 'Set-Cookie' in res.headers
    assert res.json['auth.userid'] == email
    assert 'id_token' in res.json
    assert 'user_actions' in res.json

    # Log out
    res = anontestapp.get('/logout?redirect=false', status=200)
    #no more cookies
    assert 'Set-Cookie' in res.headers
    assert 'auth.userid' not in res.json
    assert 'id_token' not in res.json
    assert 'user_actions' not in res.json


def test_impersonate_user(anontestapp, admin, submitter):
    res = anontestapp.post_json(
        '/impersonate-user', {'userid':
                              submitter['email']},
        extra_environ={'REMOTE_USER':
                       str(admin['email'])},
        status=200)

    assert 'Set-Cookie' in res.headers
    assert res.json['auth.userid'] == submitter['email']
    assert res.json['auth.userid'] == submitter['email']
