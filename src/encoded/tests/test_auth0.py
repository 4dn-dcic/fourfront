import pytest
import requests
import time
import os
from datetime import datetime
pytestmark = pytest.mark.working
from encoded.authentication import get_jwt


@pytest.fixture(scope='session')
def auth0_access_token():
    creds = {
        'connection': 'Username-Password-Authentication',
        'scope': 'openid email',
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
def auth0_4dn_user_profile():
    return {'email': '4dndcic@gmail.com'}

@pytest.fixture(scope='session')
def headers(auth0_access_token):
    return {'Accept': 'applicatin/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +
     auth0_access_token}

@pytest.fixture(scope='session')
def fake_request(headers):

    class FakeRequest(object):
        
        def __init__(self):
            self.headers = headers

    return FakeRequest()

def test_get_jwt_gets_bearer_auth(fake_request, auth0_access_token):
    jwt = get_jwt(fake_request)
    assert jwt == auth0_access_token


def test_get_jwt_skips_basic_auth(fake_request):
    fake_request.headers['Authorization'] = 'Basic test_token'
    jwt = get_jwt(fake_request)
    assert jwt is None 

def test_login_unknown_user(anontestapp, auth0_4dn_user_token):
    res = anontestapp.post_json('/login', auth0_4dn_user_token, status=403)


def test_login_logout(testapp, anontestapp, headers,
                      auth0_4dn_user_profile,
                      auth0_4dn_user_token):

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
    res = anontestapp.post_json('/login', auth0_4dn_user_token, headers=headers)

    assert res.json.get('auth.userid') is None
    assert 'id_token' in res.json
    assert 'user_actions' in res.json

    # Log out
    res = anontestapp.get('/logout?redirect=false', status=200)
    #no more cookies
    assert 'auth.userid' not in res.json
    assert 'id_token' not in res.json
    assert 'user_actions' not in res.json


def test_jwt_is_stateless_so_doesnt_actually_need_login(testapp, anontestapp, auth0_4dn_user_token,
                      auth0_4dn_user_profile, headers):
    # Create a user with the proper email
    url = '/users/'
    email = auth0_4dn_user_profile['email']
    item = {
        'email': email,
        'first_name': 'Auth0',
        'last_name': 'Test User',
    }
    testapp.post_json(url, item, status=201)

    res2 = anontestapp.get('/users/', headers=headers, status=200)
    assert '@id' in res2.json['@graph'][0]


def test_jwt_works_without_keys(testapp, anontestapp, auth0_4dn_user_token,
                      auth0_4dn_user_profile, headers):
    # Create a user with the proper email

    url = '/users/'
    email = auth0_4dn_user_profile['email']
    item = {
        'email': email,
        'first_name': 'Auth0',
        'last_name': 'Test User',
    }
    testapp.post_json(url, item, status=201)

    #clear out keys
    old_key = anontestapp.app.registry.settings['auth0.secret']
    anontestapp.app.registry.settings['auth0.secret'] = None
    res2 = anontestapp.get('/users/', headers=headers, status=200)

    anontestapp.app.registry.settings['auth0.secret'] = old_key
    assert '@id' in res2.json['@graph'][0]


def test_impersonate_user(anontestapp, admin, submitter):
    if not os.environ.get('Auth0Secret'):
        pytest.skip("need the keys to impersonate user, which aren't here")

    res = anontestapp.post_json(
        '/impersonate-user', {'userid':
                              submitter['email']},
        extra_environ={'REMOTE_USER':
                       str(admin['email'])})

    #we should get back a new token
    assert 'user_actions' in res.json
    assert 'id_token' in res.json


    # and we should be able to use that token as the new user
    headers = {'Accept': 'applicatin/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +
     res.json['id_token']}
    res2 = anontestapp.get('/users/', headers=headers)
    assert '@id' in res2.json['@graph'][0]

