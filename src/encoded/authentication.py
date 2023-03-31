import base64
import os
from operator import itemgetter
import jwt
import json
import logging

from passlib.context import CryptContext
from urllib.parse import urlencode
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
)
from pyramid.httpexceptions import (
    HTTPForbidden,
    HTTPUnauthorized,
    HTTPTemporaryRedirect
)
from pyramid.view import (
    view_config,
)
from snovault import (
    ROOT,
    COLLECTIONS
)
from snovault.validation import ValidationFailure
from snovault.calculated import calculate_properties
from snovault.validators import no_validate_item_content_post
from snovault.crud_views import collection_add as sno_collection_add
from snovault.schema_utils import validate_request
from snovault.util import debug_log
from snovault.redis.interfaces import REDIS
from dcicutils.redis_tools import RedisSessionToken


logger = logging.getLogger(__name__)


CRYPT_CONTEXT = __name__ + ':crypt_context'


JWT_ENCODING_ALGORITHM = 'HS256'

# Might need to keep a list of previously used algorithms here, not just the one we use now.
# Decryption algorithm used to default to a long list, but more recent versions of jwt library
# say we should stop assuming that.
#
# In case it goes away, as far as I can tell, the default for decoding from their
# default_algorithms() method used to be what we've got in JWT_ALL_ALGORITHMS here.
#  -kmp 15-May-2020

JWT_ALL_ALGORITHMS = ['ES512', 'RS384', 'HS512', 'ES256', 'none',
                      'RS256', 'PS512', 'ES384', 'HS384', 'ES521',
                      'PS384', 'HS256', 'PS256', 'RS512']

# Probably we could get away with fewer, but I think not as few as just our own encoding algorithm,
# so for now I believe the above list was the default, and this just rearranges it to prefer the one
# we use for encoding. -kmp 19-Jan-2021

JWT_DECODING_ALGORITHMS = [JWT_ENCODING_ALGORITHM]


CONTENT_TYPE = "Content-Type"
JSON_CONTENT_TYPE = "application/json"
STANDARD_HEADERS = {CONTENT_TYPE: JSON_CONTENT_TYPE}


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
    config.add_route('create-unauthorized-user', '/create-unauthorized-user')
    config.add_route('callback', '/callback')
    config.scan(__name__)


def redis_is_active(request):
    """ Quick helper to standardize detecting whether redis is in use """
    return 'redis.server' in request.registry.settings


@view_config(route_name='callback', request_method='GET', permission=NO_PERMISSION_REQUIRED)
def callback(context, request):
    """ /callback for Fourfront that will result in a session token
        Note that this sets jwtToken as to not break the front-end
    """
    if not redis_is_active(request):
        raise HTTPForbidden('Calls to /callback are not allowed when Redis not in use - check your ini file')
    auth0_code = request.params.get('code', None)
    if not auth0_code:
        raise HTTPForbidden('No code sent back from Auth0')
    is_https = request.scheme == "https"

    # Acquire Auth0 configuration
    registry = request.registry
    auth0_domain = registry.settings.get('auth0.domain')
    auth0_client = registry.settings.get('auth0.client')
    auth0_secret = registry.settings.get('auth0.secret')
    if not (auth0_code and auth0_domain and auth0_client and auth0_secret):
        raise HTTPForbidden('Auth0 not configured, no callback possible')

    # Create auth0 payload, send and get JWT back
    auth0_redirect_uri = f'{request.host_url}'
    auth0_payload = {
        'grant_type': 'authorization_code',
        'client_id': auth0_client,
        'client_secret': auth0_secret,
        'code': auth0_code,
        'redirect_uri': auth0_redirect_uri
    }
    auth0_post_url = f'https://{auth0_domain}/oauth/token'
    auth0_payload_json = json.dumps(auth0_payload)
    auth0_headers = STANDARD_HEADERS
    auth0_response = requests.post(auth0_post_url, data=auth0_payload_json, headers=auth0_headers)
    auth0_response_json = auth0_response.json()
    auth0_jwt = auth0_response_json.get('id_token')
    if not auth0_jwt:
        raise LoginDenied('No JWT returned from Auth0, check Auth0 configuration')

    # Generate a session from Redis
    redis_handler = registry[REDIS]
    env_name = registry.settings['env.name']
    redis_session_token = RedisSessionToken(
        namespace=env_name,
        jwt=auth0_jwt
    )

    # Check that the user exists in our database, if they do not, redirect them to /registration
    email = Auth0AuthenticationPolicy.get_token_info(auth0_jwt, request).get('email', '').lower()
    if not email:
        raise LoginDenied('No email extracted from JWT, not possible to continue')
    try:
        Auth0AuthenticationPolicy.get_user_info(request, email, redis_session_token.get_session_token())
    except HTTPUnauthorized:
        # in this case return a different response that the UI can interpret to pull up the registration modal
        resp_json = {
            '@type': ['registration'],
            '@context': '/callback',
            'title': 'registration',
            '@graph': [
                email  # this is needed by the front-end to render the UserRegistrationModal
            ]
        }
    except Exception as e:
        raise LoginDenied(f'Unknown error encountered trying to extract user from DB {str(e)}')
    else:
        resp_json = {
            '@type': ['callback'],
            '@context': '/callback',
            'title': 'callback'
    }

    # Give a session token unconditionally so we can retrieve JWT later on 
    # in the registration scenario (if an unknown user) or make auth'd requests
    # as an existing user
    redis_session_token.store_session_token(redis_handler=redis_handler)
    request.response.set_cookie(
        'jwtToken',  # note that although we are setting jwtToken, it is NOT a JWT when going through this route
        value=redis_session_token.get_session_token(),
        domain=request.domain,
        path='/',
        httponly=True,
        samesite='lax',
        overwrite=True,
        secure=is_https
    )
    return resp_json


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


class LoginDenied(HTTPUnauthorized):
    title = 'Login Failure'

    def __init__(self, domain=None, *args, **kwargs):
        super(LoginDenied, self).__init__(*args, **kwargs)
        if not self.headers.get('WWW-Authenticate') and domain:
            # headers['WWW-Authenticate'] might be set in constructor thru headers
            self.headers['WWW-Authenticate'] = "Bearer realm=\"{}\"; Basic realm=\"{}\"".format(domain, domain)


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

        if redis_is_active(request):
            session_token = RedisSessionToken.from_redis(
                redis_handler=request.registry[REDIS],
                namespace=request.registry.settings['env.name'],
                token=id_token
            )
            if not session_token:
                return None
            jwt_info = session_token.decode_jwt(
                audience=request.registry.settings['auth0.client'],
                secret=request.registry.settings['auth0.secret']
            )
        else:
            jwt_info = self.get_token_info(id_token, request)
        if not jwt_info:
            return None

        email = request._auth0_authenticated = jwt_info['email'].lower()

        # At this point, email has been authenticated with their Auth0 provider, but we don't know yet if this email is in our database.
        # If not authenticated (not in our DB), request.user_info will throw an HTTPUnauthorized error.
        def get_user_info(request):
            # This indirection is necessary, otherwise needed parameters don't make it
            return self.get_token_info(request, email, id_token)

        request.set_property(get_user_info, "user_info", True)
        return email

    @staticmethod
    def get_user_info(request, email, id_token):
        """ 
        Previously an inner method, redefined here so can be used outside, but can only be used within a route
        Allow access basic user credentials from request obj after authenticating & saving request 
        """
        user_props = request.embed('/session-properties', as_user=email)  # Performs an authentication against DB for user.
        if not user_props.get('details'):
            raise HTTPUnauthorized(
                title="Could not find user info for {}".format(email),
                headers={'WWW-Authenticate': "Bearer realm=\"{}\"; Basic realm=\"{}\"".format(request.domain, request.domain) }
            )
        user_props['id_token'] = id_token
        return user_props
    
    @staticmethod
    def get_token_info(token, request):
        '''
        Given a jwt get token info from auth0, handle retrying and whatnot.
        This is only called if we receive a Bearer token in Authorization header.
        '''
        try:

            # lets see if we have an auth0 token or our own
            registry = request.registry
            auth0_client = registry.settings.get('auth0.client')
            auth0_secret = registry.settings.get('auth0.secret')
            if auth0_client and auth0_secret:
                # leeway accounts for clock drift between us and auth0
                payload = jwt.decode(token, auth0_secret,
                                     algorithms=JWT_DECODING_ALGORITHMS,
                                     audience=auth0_client, leeway=30)
                if 'email' in payload and payload.get('email_verified') is True:
                    request.set_property(lambda r: False, 'auth0_expired')
                    return payload

            else:  # we don't have the key, let auth0 do the work for us
                user_url = "https://{domain}/tokeninfo".format(domain='hms-dbmi.auth0.com')
                resp = requests.post(user_url, {'id_token':token})
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


def get_jwt_from_auth_header(request):
    if "Authorization" in request.headers:
        try:
            # Ensure this is a JWT token, not basic auth.
            # Per https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication and
            # https://tools.ietf.org/html/rfc6750, JWT is introduced by 'bearer', as in
            #   Authorization: Bearer something.something.something
            # rather than, for example, the 'basic' key information, which as discussed in
            # https://tools.ietf.org/html/rfc7617 is base64 encoded and looks like:
            #   Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==
            # See also https://jwt.io/introduction/ for other info specific to JWT.
            [ auth_type, auth_data ] = request.headers['Authorization'].strip().split(' ', 1)
            if auth_type.lower() == 'bearer':
                return auth_data.strip()  # The spec says exactly one space, but then a token, so spaces don't matter
        except Exception:
            return None
    return None


def get_jwt(request):

    # First try to obtain JWT from headers
    token = get_jwt_from_auth_header(request)

    # If the JWT is not in the headers, get it from cookies
    if not token:
        token = request.cookies.get('jwtToken')

    return token


@view_config(route_name='login', request_method='POST', permission=NO_PERMISSION_REQUIRED)
@debug_log
def login(context, request):
    '''
    Save JWT as httpOnly cookie
    '''

    # Allow providing token thru Authorization header as well as POST request body.
    # Should be about equally secure if using HTTPS.
    request_token = get_jwt_from_auth_header(request)
    if request_token is None:
        request_token = request.json_body.get("id_token", None)

    is_https = request.scheme == "https"


    # The below 'check' is disabled to provide less feedback than possible
    # to make it slightly harder for brute force attacks.

    # is_valid_token = Auth0AuthenticationPolicy.get_token_info(request_token, request)
    # if not is_valid_token:
    #     # Doesn't check if User exists in system, just if token is validly signed,
    #     # to allow for unregistered users to still have cookie stored so
    #     # they can go through registration process.
    #     # (This check is not strictly needed for anything, just provides more feedback faster.. maybe should be removed?)
    #     raise LoginDenied(domain=request.domain)


    request.response.set_cookie(
        "jwtToken",
        value=request_token,
        domain=request.domain,
        path="/",
        httponly=True,
        samesite="lax",
        overwrite=True,
        secure=is_https
    )

    return { "saved_cookie" : True }


@view_config(route_name='logout',
             permission=NO_PERMISSION_REQUIRED, http_cache=0)
@debug_log
def logout(context, request):
    """
    This endpoint is called by the front-end upon executing a logout. It will delete
    the session token passed to it from Redis storage, which has the effect of logging
    out the user internally. If this isn't done there is no harm as the session token
    will expire after 3 hours anyway. 

    We do not send the logout signal to Auth0 at this time, since we handle it on our end.
    It may be undesirable to send this signal as it will log the user out of all sessions
    tied to that account.
    """
    # Delete Redis Session Token, if in use
    registry = request.registry
    session_token = get_jwt(request)
    if redis_is_active(request):
        redis_handler = registry[REDIS]
        env_name = registry.settings['env.name']
        redis_session_token = RedisSessionToken.from_redis(
            redis_handler=redis_handler,
            namespace=env_name,
            token=session_token
        )
        if redis_session_token:
            redis_session_token.delete_session_token(redis_handler=redis_handler)
    
    # Tell the browser to delete the cookie
    request.response.set_cookie(
        name='jwtToken',
        value=None,
        domain=request.domain,
        max_age=0,
        path='/',
        overwrite=True
    )

    # previously returned 401 - I think 200 (or even 204) is "more correct" - Will March 28 2023
    request.response.status_code = 200
    request.response.headers['WWW-Authenticate'] = (
        "Bearer realm=\"{}\", title=\"Session Expired\"; Basic realm=\"{}\""
        .format(request.domain, request.domain)
    )
    return { "deleted_cookie" : True }

    # TODO: NEED DO THIS CLIENTSIDE SO IT UNSETS USER'S COOKIE - MUST BE THRU REDIRECT NOT AJAX
    # (we don't do this - i.e. we don't bother to log user out of all of Auth0 session, just out of
    # own web app)
    # Note that in the Redis factor using Auth0 we are sticking with this behavior, but a callout may
    # be necessary to RAS when that system is integrated - Will March 28 2023

    # call auth0 to logout -
    # auth0_logout_url = "https://{domain}/v2/logout" \
    #             .format(domain='hms-dbmi.auth0.com')

    # requests.get(auth0_logout_url)

    # if asbool(request.params.get('redirect', True)):
    #     raise HTTPFound(location=request.resource_path(request.root))

    # return {}


@view_config(route_name='me', request_method='GET', permission=NO_PERMISSION_REQUIRED)
@debug_log
def me(context, request):
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


def get_basic_properties_for_user(request, userid):
    user = request.registry[COLLECTIONS]['user'][userid]
    user_dict = user.__json__(request)

    # Only include certain/applicable fields from profile
    include_detail_fields = ['email', 'first_name', 'last_name', 'groups', 'timezone', 'status']
    user_actions = calculate_properties(user, request, category='user_action')

    properties = {
        #'user': request.embed(request.resource_path(user)),
        'details' : { p:v for p, v in user_dict.items() if p in include_detail_fields },
        'user_actions' : [ v for k, v in sorted(user_actions.items(), key=itemgetter(0)) ]
    }

    # add uuid to user details
    properties['details']['uuid'] = userid

    return properties


@view_config(route_name='session-properties', request_method='GET',
             permission=NO_PERMISSION_REQUIRED)
@debug_log
def session_properties(context, request):
    for principal in request.effective_principals:
        if principal.startswith('userid.'):
            break
    else:
        raise LoginDenied(domain=request.domain)

    namespace, userid = principal.split('.', 1)
    properties = get_basic_properties_for_user(request, userid)

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
@debug_log
def impersonate_user(context, request):
    """As an admin, impersonate a different user."""

    userid = request.validated['userid']
    users = request.registry[COLLECTIONS]['user']

    try:
        user = users[userid]
    except KeyError:
        raise ValidationFailure('body', ['userid'], 'User not found.')

    if user.properties.get('status') != 'current':
        raise ValidationFailure('body', ['userid'], 'User is not enabled.')

    user_properties = get_basic_properties_for_user(request, userid)
    # pop off impersonate user action if not admin
    user_properties['user_actions'] = [x for x in user_properties['user_actions'] if (x['id'] and x['id'] != 'impersonate')]
    # make a key
    registry = request.registry
    auth0_client = registry.settings.get('auth0.client')
    auth0_secret = registry.settings.get('auth0.secret')
    if not(auth0_client and auth0_secret):
        raise HTTPForbidden(title="No keys to impersonate user")

    jwt_contents = {
        'email': userid,
        'email_verified': True,
        'aud': auth0_client,
    }

    id_token = jwt.encode(
        jwt_contents,
        auth0_secret,
        algorithm=JWT_ENCODING_ALGORITHM
	)

    if redis_is_active(request):
        redis_session_token = RedisSessionToken.from_redis(
            redis_handler=request.registry[REDIS],
            namespace=request.registry.settings['env.name'],
            token=id_token
        )
        if not redis_session_token:
            raise HTTPForbidden('Unable to generate session token for impersonate user')

    is_https = request.scheme == "https"

    request.response.set_cookie(
        "jwtToken",
        value=redis_session_token.get_session_token(),
        domain=request.domain,
        path="/",
        httponly=True,
        samesite="strict",
        overwrite=True,
        secure=is_https
    )

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


@view_config(route_name='create-unauthorized-user', request_method='POST',
             permission=NO_PERMISSION_REQUIRED)
@debug_log
def create_unauthorized_user(context, request):
    """
    Endpoint to create an unauthorized user, which will have no lab or award.
    Requires a reCAPTCHA response, which is propogated from the front end
    registration form. This is so the endpoint cannot be abused.
    Given a user properties in the request body, will validate those and also
    validate the reCAPTCHA response using the reCAPTCHA server. If all checks
    are succesful, POST a new user

    Args:
        request: Request object

    Returns:
        dictionary User creation response from collection_add

    Raises:
        LoginDenied, HTTPForbidden, or ValidationFailure
    """
    recaptcha_resp = request.json.get('g-recaptcha-response')
    if not recaptcha_resp:
        raise LoginDenied()
    
    registry = request.registry

    # old method for retrieving auth'd email - request object should have _auth0_authenticated set
    # NOTE: it is not obvious to me how this works... probably should be looked into - Will March 29 2023
    if not redis_is_active(request):
        email = "<no auth0 authenticated e-mail supplied>"
        if hasattr(request, "_auth0_authenticated"):
            email = request._auth0_authenticated # equal to: jwt_info['email'].lower()
    
    # new method for retrieving auth'd email - request should have transmitted a session token
    # from which we can get the JWT and the email they auth'd with
    else:
        id_token = get_jwt(request)
        redis_handler = registry[REDIS]
        env_name = registry.settings['env.name']
        redis_session_token = RedisSessionToken.from_redis(
            redis_handler=redis_handler,
            namespace=env_name,
            token=id_token
        )
        jwt_info = redis_session_token.decode_jwt(
                audience=request.registry.settings['auth0.client'],
                secret=request.registry.settings['auth0.secret']
        )
        email = jwt_info.get('email', '<no e-mail supplied>').lower()

    user_props = request.json
    user_props_email = user_props.get("email", "<no e-mail supplied>").lower()
    if user_props_email != email:
        raise HTTPUnauthorized(
            title="Provided email {} not validated with Auth0. Try logging in again.".format(user_props_email),
            headers={'WWW-Authenticate': "Bearer realm=\"{}\"; Basic realm=\"{}\"".format(request.domain, request.domain) }
        )

    del user_props['g-recaptcha-response']
    user_props['was_unauthorized'] = True
    user_props['email'] = user_props_email  # lowercased
    user_coll = request.registry[COLLECTIONS]['User']
    request.remote_user = 'EMBED'  # permission = import_items

    # validate the User json
    validate_request(user_coll.type_info.schema, request, user_props)
    if request.errors:
        raise ValidationFailure('body', 'create_unauthorized_user', 'Cannot validate request')

    # validate recaptcha_resp
    # https://developers.google.com/recaptcha/docs/verify
    recap_url = 'https://www.google.com/recaptcha/api/siteverify'
    recap_values = {
        'secret': request.registry.settings['g.recaptcha.secret'],
        'response': recaptcha_resp
    }
    data = urlencode(recap_values).encode()
    headers = {"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"}
    recap_res = requests.get(recap_url, params=data, headers=headers).json()
    if recap_res['success']:
        sno_res = sno_collection_add(user_coll, request, False)  # POST User
        if sno_res.get('status') == 'success':
            return sno_res
        else:
            raise HTTPForbidden(title="Could not create user. Try logging in again.")
    else:
        # error with re-captcha
        logger.error(f'Error from captcha {recap_res}')
        raise HTTPUnauthorized(
            title="Invalid reCAPTCHA. Try logging in again.",
            headers={'WWW-Authenticate': "Bearer realm=\"{}\"; Basic realm=\"{}\"".format(request.domain, request.domain) }
        )
