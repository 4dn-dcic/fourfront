import pytest
import requests
import os
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
def auth0_access_token_no_email():
    creds = {
        'connection': 'Username-Password-Authentication',
        'scope': 'openid',
        'client_id': 'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
        'grant_type': 'password',
        'username': 'test1@test.com',
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
    return {'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' +
     auth0_access_token}


@pytest.fixture(scope='session')
def fake_request(headers):


    class FakeRequest(object):

        def __init__(self):
            self.headers = headers
            self.cookies = {}

    return FakeRequest()


def test_get_jwt_gets_bearer_auth(fake_request):
    jwt = get_jwt(fake_request)
    assert jwt == fake_request.headers['Authorization'][7:]


def test_get_jwt_skips_basic_auth(fake_request):
    fake_request.headers['Authorization'] = 'Basic test_token'
    jwt = get_jwt(fake_request)
    assert jwt is None


def test_get_jwt_falls_back_to_cookie(fake_request):
    fake_request.cookies['jwtToken'] = 'test_token'
    fake_request.headers['Authorization'] = 'Basic test_token'
    jwt = get_jwt(fake_request)
    assert jwt == 'test_token'


def test_login_unknown_user(anontestapp, auth0_4dn_user_token):
    anontestapp.post_json('/login', auth0_4dn_user_token, status=403)


def test_login_token_no_email(anontestapp, auth0_access_token_no_email, headers):
    headers1 = headers.copy()
    headers1['Authorization'] = 'Bearer ' + auth0_access_token_no_email
    # Log in without headers
    anontestapp.post_json('/login', headers=headers1, status=403)


def test_invalid_login(anontestapp, headers):
    headers1=headers.copy()
    headers1['Authorization'] = 'Bearer invalid token'
    # Log in without headers
    res = anontestapp.post_json('/login', headers=headers1, status=403)


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
    res = anontestapp.post_json('/login', headers=headers)

    assert res.json.get('auth.userid') is None
    assert 'id_token' in res.json
    assert 'user_actions' in res.json

    # Log out
    res = anontestapp.get('/logout?redirect=false', status=200)
    # no more cookies
    assert 'auth.userid' not in res.json
    assert 'id_token' not in res.json
    assert 'user_actions' not in res.json


def test_404_keeps_auth_info(testapp, anontestapp, headers,
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
    page_view_request_headers = headers.copy()

    # X-User-Info header is only set for text/html -formatted Responses.
    page_view_request_headers.update({
        "Accept" : "text/html",
        "Content-Type" : "text/html",
        "Cookie" : "jwtToken=" + headers['Authorization'][7:]
    })
    # Log in
    res = anontestapp.get(
        '/not_found_url',
        headers=page_view_request_headers,
        status = 404
    )

    assert str(res.status_int) == "404"
    try:
        assert res.headers.get('X-Request-JWT', None) is not None
        assert res.headers.get('X-User-Info', None) is not None
    except Exception as e:
        if os.environ.get('TRAVIS', False):
            print("this don't work on travis do to access issues to Auth-0")
        else:
            raise e


def test_login_logout_redirect(testapp, anontestapp, headers,
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
    res = anontestapp.post_json('/login', headers=headers)

    assert res.json.get('auth.userid') is None
    assert 'id_token' in res.json
    assert 'user_actions' in res.json

    # Log out
    res = anontestapp.get('/logout?redirect=True', status=302)


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



def test_impersonate_invalid_user(anontestapp, admin):
    anontestapp.post_json(
        '/impersonate-user', {'userid': 'not@here.usr'},
        extra_environ={'REMOTE_USER':
                       str(admin['email'])}, status=422)


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

