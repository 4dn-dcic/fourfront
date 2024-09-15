import jwt
import logging

from pyramid.authentication import (
    BasicAuthAuthenticationPolicy as _BasicAuthAuthenticationPolicy,
    CallbackAuthenticationPolicy
)
import requests
from pyramid.path import (
    DottedNameResolver,
    caller_package,
)
from pyramid.httpexceptions import HTTPUnauthorized
from snovault.authentication import get_jwt
from snovault.redis.interfaces import REDIS
from dcicutils.redis_tools import RedisSessionToken


logger = logging.getLogger(__name__)


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



def redis_is_active(request):
    """ Quick helper to standardize detecting whether redis is in use """
    return 'redis.server' in request.registry.settings


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
    
    def authenticated_userid(self, request):
        """
        Adds `request.user_info` for all authentication types.
        Fetches and returns some user details if called.
        """
        namespaced_userid = super().authenticated_userid(request)

        if namespaced_userid is not None:
            # userid, if present, may be in form of UUID (if remoteuser) or an email (if Auth0).
            namespace, userid = namespaced_userid.split(".", 1)

            # Allow access basic user credentials from request obj after authenticating & saving request
            def get_user_info(request):
                user_props = request.embed('/session-properties', as_user=userid)  # Performs an authentication against DB for user.
                if not user_props.get('details'):
                    raise HTTPUnauthorized(
                        title="Could not find user info for {}".format(userid),
                        headers={
                            'WWW-Authenticate':
                                "Bearer realm=\"{}\"; Basic realm=\"{}\"".format(request.domain, request.domain)
                        }
                    )
                return user_props

            # If not authenticated (not in our DB), request.user_info will throw an HTTPUnauthorized error.
            request.set_property(get_user_info, "user_info", True)

        return namespaced_userid

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
            
            auth0_domain = request.registry.settings['auth0.domain']
            if 'auth0' in auth0_domain:
                secret = request.registry.settings['auth0.secret']
                algorithms = JWT_DECODING_ALGORITHMS
            else:
                # RAS
                secret = request.registry.settings['auth0.public.key']
                algorithms = ['RS256']


            jwt_info = session_token.decode_jwt(
                audience=request.registry.settings['auth0.client'],
                secret=secret,
                algorithms=algorithms
            )
            if jwt_info.get('email') is None:
                jwt_info['email'] = session_token.get_email()
            if session_token.get_email() is not None:
                request.set_property(lambda r: False, 'auth0_expired')
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
