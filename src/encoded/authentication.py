import base64
import os
from operator import itemgetter
from datetime import datetime
import time
import jwt
from base64 import b64decode

from passlib.context import CryptContext
from pyramid.authentication import (
    BasicAuthAuthenticationPolicy as _BasicAuthAuthenticationPolicy,
    CallbackAuthenticationPolicy
)
import requests
from pyramid.path import (
    DottedNameResolver,
    caller_package,
)
from pyramid.security import (
    NO_PERMISSION_REQUIRED,
    remember,
    forget,
)
from pyramid.httpexceptions import (
    HTTPForbidden,
    HTTPFound
)
from pyramid.view import (
    view_config,
)
from pyramid.settings import asbool
from snovault import ROOT
from snovault.storage import User
from snovault import COLLECTIONS
from snovault.validation import ValidationFailure
from snovault.calculated import calculate_properties
from snovault.validators import no_validate_item_content_post

CRYPT_CONTEXT = __name__ + ':crypt_context'


def includeme(config):
    config.include('.edw_hash')
    setting_prefix = 'passlib.'
    passlib_settings = {
        k[len(setting_prefix):]: v
        for k, v in config.registry.settings.items()
        if k.startswith(setting_prefix)
    }
    if not passlib_settings:
        passlib_settings = {'schemes': 'edw_hash, unix_disabled'}
    crypt_context = CryptContext(**passlib_settings)
    config.registry[CRYPT_CONTEXT] = crypt_context

    # basic login route
    config.add_route('login', '/login')
    config.add_route('logout', '/logout')
    config.add_route('me', '/me')
    config.add_route('impersonate-user', '/impersonate-user')
    config.add_route('session-properties', '/session-properties')
    config.scan(__name__)


class NamespacedAuthenticationPolicy(object):
    """ Wrapper for authentication policy classes

    As userids are included in the list of principals, it seems good practice
    to namespace them to avoid clashes.

    Constructor Arguments

    ``namespace``

        The namespace used (string).

    ``base``

        The base authentication policy (class or dotted name).

    Remaining arguments are passed to the ``base`` constructor.

    Example

    To make a ``REMOTE_USER`` 'admin' be 'user.admin'

    .. code-block:: python

        policy = NamespacedAuthenticationPolicy('user',
            'pyramid.authentication.RemoteUserAuthenticationPolicy')
    """

    def __new__(cls, namespace, base, *args, **kw):
        # Dotted name support makes it easy to configure with pyramid_multiauth
        name_resolver = DottedNameResolver(caller_package())
        base = name_resolver.maybe_resolve(base)
        # Dynamically create a subclass
        name = 'Namespaced_%s_%s' % (namespace, base.__name__)
        klass = type(name, (cls, base), {'_namespace_prefix': namespace + '.'})
        return super(NamespacedAuthenticationPolicy, klass).__new__(klass)

    def __init__(self, namespace, base, *args, **kw):
        super(NamespacedAuthenticationPolicy, self).__init__(*args, **kw)

    def unauthenticated_userid(self, request):
        cls  = super(NamespacedAuthenticationPolicy, self)
        userid = super(NamespacedAuthenticationPolicy, self) \
            .unauthenticated_userid(request)
        if userid is not None:
            userid = self._namespace_prefix + userid
        return userid

    def remember(self, request, principal, **kw):
        if not principal.startswith(self._namespace_prefix):
            return []
        principal = principal[len(self._namespace_prefix):]
        return super(NamespacedAuthenticationPolicy, self) \
            .remember(request, principal, **kw)


class BasicAuthAuthenticationPolicy(_BasicAuthAuthenticationPolicy):
    def __init__(self, check, *args, **kw):
        # Dotted name support makes it easy to configure with pyramid_multiauth
        name_resolver = DottedNameResolver(caller_package())
        check = name_resolver.maybe_resolve(check)
        super(BasicAuthAuthenticationPolicy, self).__init__(check, *args, **kw)


class LoginDenied(HTTPForbidden):
    title = 'Login failure'


_fake_user = object()


class Auth0AuthenticationPolicy(CallbackAuthenticationPolicy):

    login_path = '/login'
    method = 'POST'

    def unauthenticated_userid(self, request):
        '''
        So basically this is used to do a login, instead of the actual
        login view... not sure why, but yeah..
        '''
        # we will cache it for the life of this request, cause pyramids does traversal
        cached = getattr(request, '_auth0_authenticated', _fake_user)
        if cached is not _fake_user:
            return cached

        # try to find the token in the request (should be in the header)
        id_token = get_jwt(request)
        if not id_token:
            # can I thrown an 403 here?
            # print('Missing assertion.', 'unauthenticated_userid', request)
            return None

        user_info = self.get_token_info(id_token, request)
        if not user_info:
            return None

        email = request._auth0_authenticated = user_info['email'].lower()

        # Allow access basic user credentials from request obj after authenticating & saving request
        def getUserInfo(request):
            user_props = request.embed('/session-properties', as_user=email)
            user_details = self.get_user_details(request)

            includedDetailFields = ['email', 'first_name', 'last_name', 'groups',
                                    'timezone', 'status']
            user_props.update({
                # Only include certain fields from profile
                "details": {p: v for p, v in user_details.items() if p in includedDetailFields},
                "id_token": id_token
            })
            return user_props

        request.set_property(getUserInfo, "user_info", True)
        return email

    def get_user_details(self, request):
        for principal in request.effective_principals:
            if principal.startswith('userid.'):
                break
        else:
            raise HTTPForbidden(title="Not logged in.")

        namespace, userid = principal.split('.', 1)
        # Prevent from creating 301 redirects which are then cached permanently by browser
        request.response.status_code = 307
        properties = request.embed('/', userid, '@@object')
        return properties

    def get_token_info(self, token, request):
        '''
        given a jwt get token info from auth0, handle
        retrying and what not
        '''
        try:
            # lets see if we have an auth0 token or our own
            registry = request.registry
            auth0_client = registry.settings.get('auth0.client')
            auth0_secret = registry.settings.get('auth0.secret')
            if auth0_client and auth0_secret:
                # leeway accounts for clock drift between us and auth0
                payload = jwt.decode(token, b64decode(auth0_secret, '-_'),
                                     audience=auth0_client, leeway=30)
                if 'email' in payload and payload.get('email_verified') is True:
                    request.set_property(lambda r: False, 'auth0_expired')
                    return payload

            else: # we don't have the key, let auth0 do the work for us
                user_url = "https://{domain}/tokeninfo".format(domain='hms-dbmi.auth0.com')
                resp  = requests.post(user_url, {'id_token':token})
                payload = resp.json()
                if 'email' in payload and payload.get('email_verified') is True:
                    request.set_property(lambda r: False, 'auth0_expired')
                    return payload

        except (ValueError, jwt.exceptions.InvalidTokenError, jwt.exceptions.InvalidKeyError) as e:
            # Catch errors from decoding JWT
            print('Invalid JWT assertion : %s (%s)', (e, type(e).__name__))
            request.set_property(lambda r: True, 'auth0_expired') # Allow us to return 403 code &or unset cookie in renderers.py
            return None

        print("didn't get email or email is not verified")
        return None


def get_jwt(request):
    token = None
    try:
        # ensure this is a jwt token not basic auth:
        auth_type = request.headers['Authorization'][:6]
        if auth_type.strip().lower() == 'bearer':
            token = request.headers['Authorization'][7:]
    except (ValueError, TypeError, KeyError):
        pass

    if not token:
        token = request.cookies.get('jwtToken')

    return token


@view_config(route_name='login', request_method='POST',
             permission=NO_PERMISSION_REQUIRED)
def login(request):
    '''check the auth0 assertion and remember the user'''

    if hasattr(request, 'user_info'):
        user_info = request.user_info
        if not user_info:
            raise LoginDenied()
    else:
        raise LoginDenied()

    return user_info


@view_config(route_name='logout',
             permission=NO_PERMISSION_REQUIRED, http_cache=0)
def logout(request):
    """View to forget the user"""
    #request.session.invalidate()
    #request.response.headerlist.extend(forget(request))

    # call auth0 to logout
    auth0_logout_url = "https://{domain}/v2/logout" \
                .format(domain='hms-dbmi.auth0.com')

    requests.get(auth0_logout_url)

    if asbool(request.params.get('redirect', True)):
        raise HTTPFound(location=request.resource_path(request.root))

    return {}


@view_config(route_name='me', request_method='GET', permission=NO_PERMISSION_REQUIRED)
def me(request):
    '''Alias /users/<uuid-of-current-user>'''
    for principal in request.effective_principals:
        if principal.startswith('userid.'):
            break
    else:
        raise HTTPForbidden(title="Not logged in.")

    namespace, userid = principal.split('.', 1)

    # return { "uuid" : userid } # Uncomment and delete below code to just grab UUID.

    request.response.status_code = 307 # Prevent from creating 301 redirects which are then cached permanently by browser
    properties = request.embed('/users/' + userid, as_user=userid)
    return properties


@view_config(route_name='session-properties', request_method='GET',
             permission=NO_PERMISSION_REQUIRED)
def session_properties(request):
    for principal in request.effective_principals:
        if principal.startswith('userid.'):
            break
    else:
        return {}

    namespace, userid = principal.split('.', 1)
    user = request.registry[COLLECTIONS]['user'][userid]
    user_actions = calculate_properties(user, request, category='user_action')

    properties = {
        #'user': request.embed(request.resource_path(user)),
        'user_actions': [v for k, v in sorted(user_actions.items(), key=itemgetter(0))]
    }

    #if 'auth.userid' in request.session:
    #    properties['auth.userid'] = request.session['auth.userid']

    return properties


def basic_auth_check(username, password, request):
    # We may get called before the context is found and the root set
    root = request.registry[ROOT]
    collection = root['access-keys']
    try:
        access_key = collection[username]
    except KeyError:
        return None

    properties = access_key.properties
    hash = properties['secret_access_key_hash']

    crypt_context = request.registry[CRYPT_CONTEXT]
    valid = crypt_context.verify(password, hash)
    if not valid:
        return None

    #valid, new_hash = crypt_context.verify_and_update(password, hash)
    #if new_hash:
    #    replace_user_hash(user, new_hash)

    return []


@view_config(route_name='impersonate-user', request_method='POST',
             validators=[no_validate_item_content_post],
             permission='impersonate')
def impersonate_user(request):
    """As an admin, impersonate a different user."""
    userid = request.validated['userid']
    users = request.registry[COLLECTIONS]['user']

    try:
        user = users[userid]
    except KeyError:
        raise ValidationFailure('body', ['userid'], 'User not found.')

    if user.properties.get('status') != 'current':
        raise ValidationFailure('body', ['userid'], 'User is not enabled.')

    user_actions = calculate_properties(users[userid], request, category='user_action')
    user_properties = {
        'user_actions': [v for k, v in sorted(user_actions.items(), key=itemgetter(0))]
    }
    # pop off impersonate user action if not admin
    user_properties['user_actions'] = [x for x in user_properties['user_actions'] if (x['id'] and x['id'] != 'impersonate')]
    # make a key
    registry = request.registry
    auth0_client = registry.settings.get('auth0.client')
    auth0_secret = registry.settings.get('auth0.secret')
    if not(auth0_client and auth0_secret):
        raise HTTPForbidden(title="no keys to impersonate user")

    payload = {'email': userid,
               'email_verified': True,
               'aud': auth0_client,
              }
    id_token = jwt.encode(payload, b64decode(auth0_secret, '-_'), algorithm='HS256')
    user_properties['id_token'] = id_token.decode('utf-8')

    return user_properties


def generate_user():
    """ Generate a random user name with 64 bits of entropy
        Used to generate access_key
    """
    # Take a random 5 char binary string (80 bits of
    # entropy) and encode it as upper cased base32 (8 chars)
    random_bytes = os.urandom(5)
    user = base64.b32encode(random_bytes).decode('ascii').rstrip('=').upper()
    return user


def generate_password():
    """ Generate a password with 80 bits of entropy
    """
    # Take a random 10 char binary string (80 bits of
    # entropy) and encode it as lower cased base32 (16 chars)
    random_bytes = os.urandom(10)
    password = base64.b32encode(random_bytes).decode('ascii').rstrip('=').lower()
    return password
