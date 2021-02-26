import json
import logging
import os
import psutil
import time

from dcicutils.misc_utils import environ_bool, PRINT, ignored
from functools import lru_cache
from pkg_resources import resource_filename
from pyramid.events import BeforeRender, subscriber
from pyramid.httpexceptions import (
    HTTPMovedPermanently,
    HTTPPreconditionFailed,
    HTTPUnauthorized,
    HTTPUnsupportedMediaType,
    HTTPNotAcceptable,
    HTTPServerError
)
from pyramid.response import Response
from pyramid.settings import asbool
from pyramid.threadlocal import manager
from pyramid.traversal import split_path_info, _join_path_tuple
from subprocess_middleware.worker import TransformWorker
from urllib.parse import urlencode
from webob.cookies import Cookie
from .util import content_type_allowed


log = logging.getLogger(__name__)


def includeme(config):
    """
    Can get tween ordering by executing the following on command-line from root dir:
        `bin/ptween development.ini`

    We could alternatively put these in the base.ini file explicitly.

    See: https://docs.pylonsproject.org/projects/pyramid/en/latest/narr/hooks.html#registering-tweens

    --- IMPORTANT ---
    The `handler` arg of 'tween factory' functions refers to the subsequent tween to be called.
    This means that if handler(request) is called, then the downstream tweens are acted upon it,
    until response is returned. It's an ONION depending on where handler(request) called within a tween
    and NOT necessarily an explicit ordering (unless `return handler(request)` is last line of each tween).

    A request goes down the tween chain from INGRESS to MAIN and then back up to INGRESS.
    `handler(request)` calls the subsequent tween and returns complete tweened-from-there response.

    Tween Chain as of 05/23/2019:

        Position    Name
        --------    ----
        -           INGRESS
        0           snovault.stats.stats_tween_factory
        1           .renderers.validate_request_tween_factory
        2           .renderers.render_page_html_tween_factory
        3           .renderers.set_response_headers_tween_factory
        4           pyramid_tm.tm_tween_factory
        5           .renderers.security_tween_factory
        6           pyramid.tweens.excview_tween_factory
        -           MAIN

    The `handler` kwarg of tween factories refers to the subsequent tween to be called.
    This means that if handler(request) is called, then the downstream tweens are acted upon it,
    until response is returned. It's an ONION!

    """

    config.add_tween('.renderers.validate_request_tween_factory', under='snovault.stats.stats_tween_factory')
    # DISABLED - .add_tween('.renderers.remove_expired_session_cookies_tween_factory',
    #                       under='.renderers.validate_request_tween_factory')
    config.add_tween('.renderers.render_page_html_tween_factory', under='.renderers.validate_request_tween_factory')

    # The above tweens, when using response (= `handler(request)`) act on the _transformed_ response
    # (containing HTML body).
    # The below tweens run _before_ the JS rendering. Responses in these tweens have not been transformed to HTML yet.
    config.add_tween('.renderers.set_response_headers_tween_factory', under='.renderers.render_page_html_tween_factory')

    # If this isn't placed under 'pyramid_tm.tm_tween_factory' (e.g. under resp headers or something)
    # then the headers aren't preserved or available in server-side render or response.
    config.add_tween('.renderers.security_tween_factory', under='pyramid_tm.tm_tween_factory')

    config.scan(__name__)


def validate_request_tween_factory(handler, registry):
    """
    Updates request.environ's REQUEST_METHOD to be X_REQUEST_METHOD if present.
    Asserts that if a POST (or similar) request is in application/json format,
    with exception for /metadata/* endpoints.

    Apache config:
        SetEnvIf Request_Method HEAD X_REQUEST_METHOD=HEAD
    """
    ignored(registry)

    def validate_request_tween(request):

        # Fix Request method changed by mod_wsgi.
        # See: https://github.com/GrahamDumpleton/mod_wsgi/issues/2
        environ = request.environ
        if 'X_REQUEST_METHOD' in environ:
            environ['REQUEST_METHOD'] = environ['X_REQUEST_METHOD']

        if request.method in ('GET', 'HEAD'):
            # If GET request, don't need to check `request.content_type`
            # Includes page text/html requests.
            return handler(request)

        elif content_type_allowed(request):
            return handler(request)

        else:
            detail = "Request content type %s is not 'application/json'" % request.content_type
            raise HTTPUnsupportedMediaType(detail)

    return validate_request_tween


def security_tween_factory(handler, registry):
    ignored(registry)

    def security_tween(request):
        """
        Executed inside/prior-to any page transforms and inside/prior-to
        `pyramid_tm.tm_tween_factory` (transaction management tween).
        This is because request.authenticated_userid as well as `request.user_info`
        property getters _may_ access Postgres DB to get user properties (if not yet
        indexed in ES) and all DB transactions must complete before transaction
        management tween is completed.
        """

        expected_user = request.headers.get('X-If-Match-User')
        if expected_user is not None:  # Not sure when this is the case
            if request.authenticated_userid != 'mailto.' + expected_user:
                detail = 'X-If-Match-User does not match'
                raise HTTPPreconditionFailed(detail)

        if request.authorization is not None or asbool(request.headers.get('X-Auth-Challenge', False)):
            # wget may only send credentials following a challenge response.
            if not request.authenticated_userid:
                if not hasattr(request, 'auth0_expired'):
                    # Not a "Bearer" JWT token in Auth header. Or other error.
                    # We send a 401 "Unauthorized" exception if authentication issue or expiration.
                    # We send a 403 "Forbidden" (TODO: assert) if authorized correctly but no view permission
                    raise HTTPUnauthorized(
                        title="No Access",
                        comment="Invalid Authorization header or Auth Challenge response.",
                        headers={
                            'WWW-Authenticate': ("Bearer realm=\"{}\"; Basic realm=\"{}\""
                                                 .format(request.domain, request.domain))
                        }
                    )

        if hasattr(request, 'auth0_expired'):
            # Add some security-related headers on the up-swing
            response = handler(request)
            if request.auth0_expired:
                # return response
                #
                # If have the attribute and it is true, then our session has expired.
                # This is true for both AJAX requests (which have request.authorization) & browser page
                # requests (which have cookie); both cases handled in authentication.py
                # Informs client or libs/react-middleware.js serverside render of expired token
                # to set logged-out state in front-end in either doc request or xhr request & set appropriate alerts
                response.headers['X-Request-JWT'] = "expired"

                # Especially for initial document requests by browser, but also desired for AJAX and other requests,
                # unset jwtToken cookie so initial client-side React render has App(instance).state.session = false
                # to be synced w/ server-side
                response.set_cookie(name='jwtToken',
                                    value=None, max_age=0, path='/')  # = Same as response.delete_cookie(..)
                response.status_code = 401
                response.headers['WWW-Authenticate'] = (
                    "Bearer realm=\"{}\", title=\"Session Expired\"; Basic realm=\"{}\""
                    .format(request.domain, request.domain)
                )
            else:
                # We have JWT and it's not expired. Add 'X-Request-JWT' & 'X-User-Info' header.
                # For performance, only do it if should transform to HTML as is not needed on every request.
                if should_transform(request, response):
                    login = request.authenticated_userid
                    if login:
                        authtype, email = login.split('.', 1)
                        if authtype == 'auth0':
                            # This header is parsed in renderer.js, or, more accurately,
                            # by libs/react-middleware.js which is imported by server.js and compiled into
                            # renderer.js. Is used to get access to User Info on initial web page render.
                            response.headers['X-Request-JWT'] = request.cookies.get('jwtToken', '')
                            # TODO: Should user_info be copied before the del? If the user info is shared,
                            #       we are modifying it for other uses. -kmp 24-Jan-2021
                            user_info = request.user_info.copy()  # Re-ified property set in authentication.py
                            # Redundant - don't need this in SSR nor browser as get from X-Request-JWT.
                            del user_info["id_token"]
                            response.headers['X-User-Info'] = json.dumps(user_info)
                        else:
                            response.headers['X-Request-JWT'] = "null"
            return response

        return handler(request)

        # This was commented out when we introduced JWT authentication
        # Theoretically we mitigate CSRF requests now by grabbing JWT for transactional
        # requests from Authorization header which acts like a CSRF token.
        # See authentication.py - get_jwt()

        # token = request.headers.get('X-CSRF-Token')
        # if token is not None:
        #     # Avoid dirtying the session and adding a Set-Cookie header
        #     # XXX Should consider if this is a good idea or not and timeouts
        #     if token == dict.get(request.session, '_csrft_', None):
        #         return handler(request)
        #     raise CSRFTokenError('Incorrect CSRF token')
        # raise CSRFTokenError('Missing CSRF token')

    return security_tween


def remove_expired_session_cookies_tween_factory(handler, registry):
    """
    CURRENTLY DISABLED
    Original purpose of this was to remove expired (session?) cookies.
    See: https://github.com/ENCODE-DCC/encoded/commit/75854803c99e5044a6a33aedb3a79d750481b6cd#diff-bc19a9793a1b3b4870cff50e7c7c9bd1R135

    We disable it for now via removing from tween chain as are using JWT tokens and handling
    their removal in security_tween_factory & authentication.py as well as client-side
    (upon "Logout" action). If needed for some reason, can re-enable.
    """  # noQA - not going to break the long URL line above
    ignored(registry)

    ignore = {
        '/favicon.ico',
    }

    def remove_expired_session_cookies_tween(request):
        if request.path in ignore or request.path.startswith('/static/'):
            return handler(request)

        session = request.session
        # if session or session._cookie_name not in request.cookies:
        #     return handler(request)

        response = handler(request)
        # Below seems to be empty always; though we do have some in request.cookies
        existing = response.headers.getall('Set-Cookie')
        if existing:
            cookies = Cookie()
            for header in existing:
                cookies.load(header)
            if session._cookie_name in cookies:
                return response

        response.delete_cookie(
            session._cookie_name,
            path=session._cookie_path,
            domain=session._cookie_domain,
        )

        return response

    return remove_expired_session_cookies_tween


def set_response_headers_tween_factory(handler, registry):
    """Add additional response headers here"""
    ignored(registry)

    def set_response_headers_tween(request):
        response = handler(request)
        response.headers['X-Request-URL'] = request.url
        # Setter automatically converts set back to tuple.
        # See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
        response.vary = set((response.vary or ()) + ('Accept', 'Authorization'))
        return response

    return set_response_headers_tween


@subscriber(BeforeRender)
def canonical_redirect(event):
    request = event['request']

    # Ignore subrequests
    if len(manager.stack) > 1:
        return

    if request.method not in ('GET', 'HEAD'):
        return
    if request.response.status_int != 200:
        return
    if not request.environ.get('encoded.canonical_redirect', True):
        return
    if request.path_info == '/':
        return

    if not isinstance(event.rendering_val, dict):
        return

    canonical = event.rendering_val.get('@id', None)
    if canonical is None:
        return
    canonical_path, _, canonical_qs = canonical.partition('?')

    request_path = _join_path_tuple(('',) + split_path_info(request.path_info))
    if (request_path == canonical_path.rstrip('/') and
            request.path_info.endswith('/') == canonical_path.endswith('/') and
            (canonical_qs in ('', request.query_string))):
        return

    if '/@@' in request.path_info:
        return

    qs = canonical_qs or request.query_string
    # add redirect information to the query string, but not for the routes specified below
    if not any(route in canonical_path for route in ['/search/', '/browse/', '/metadata/']):
        redir_qs = (qs + '&' if qs else '') + urlencode([('redirected_from', request.path_info)])
    else:
        redir_qs = qs
    location = canonical_path + ('?' if redir_qs else '') + redir_qs
    raise HTTPMovedPermanently(location=location, detail="Redirected from " + str(request.path_info))


# Web browsers send an Accept request header for initial (e.g. non-AJAX) page requests
# which should contain 'text/html'
MIME_TYPE_HTML = 'text/html'
MIME_TYPE_JSON = 'application/json'
MIME_TYPE_LD_JSON = 'application/ld+json'

MIME_TYPES_SUPPORTED = [MIME_TYPE_JSON, MIME_TYPE_HTML, MIME_TYPE_LD_JSON]
MIME_TYPE_DEFAULT = MIME_TYPES_SUPPORTED[0]
MIME_TYPE_TRIAGE_MODE = 'modern'  # if this doesn't work, fall back to 'legacy'

DEBUG_MIME_TYPES = environ_bool("DEBUG_MIME_TYPES", default=False)


def best_mime_type(request, mode=MIME_TYPE_TRIAGE_MODE):
    # TODO: I think this function does nothing but return MIME_TYPES_SUPPORTED[0] -kmp 3-Feb-2021
    """
    Given a request, tries to figure out the best kind of MIME type to use in response
    based on what kinds of responses we support and what was requested.

    In the case we can't comply, we just use application/json whether or not that's what was asked for.
    """
    if mode == 'legacy':
        # See:
        # https://tedboy.github.io/flask/generated/generated/werkzeug.Accept.best_match.html#werkzeug-accept-best-match
        # Note that this is now deprecated, or will be. The message is oddly worded ("will be deprecated")
        # that presumably means "will be removed". Deprecation IS the warning of actual action, not the action itself.
        # "This is currently maintained for backward compatibility, and will be deprecated in the future.
        #  AcceptValidHeader.best_match() uses its own algorithm (one not specified in RFC 7231) to determine
        #  what is a best match. The algorithm has many issues, and does not conform to RFC 7231."
        # Anyway, we were getting this warning during testing:
        #   DeprecationWarning: The behavior of AcceptValidHeader.best_match is currently
        #      being maintained for backward compatibility, but it will be deprecated in the future,
        #      as it does not conform to the RFC.
        # TODO: Once the modern replacement is shown to work, we should remove this conditional branch.
        result = request.accept.best_match(MIME_TYPES_SUPPORTED, MIME_TYPE_DEFAULT)
    else:
        options = request.accept.acceptable_offers(MIME_TYPES_SUPPORTED)
        if not options:
            # TODO: Probably we should return a 406 response by raising HTTPNotAcceptable if
            #       no acceptable types are available. (Certainly returning JSON in this case is
            #       not some kind of friendly help toa naive user with an old browser.)
            #       Ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
            result = MIME_TYPE_DEFAULT
        else:
            mime_type, score = options[0]
            result = mime_type
    if DEBUG_MIME_TYPES:
        PRINT("Using mime type", result, "for", request.method, request.url)
        for k, v in request.headers.items():
            PRINT("%s: %s" % (k, v))
        PRINT("----------")
    return result


@lru_cache(maxsize=16)
def should_transform(request, response):
    """
    Determines whether to transform the response from JSON->HTML/JS depending on type of response
    and what the request is looking for to be returned via these criteria, which are tried in order
    until one succeeds:

    * If the request method is other than GET or HEAD, returns False.
    * If the response.content_type is other than 'application/json', returns False.
    * If a 'frame=' query param is given and not 'page' (the default), returns False.
    * If a 'format=json' query param is given explicitly,
        * For 'format=html', returns True.
        * For 'format=json', returns False.
      This rule does not match if 'format=' is not given explicitly.
      If 'format=' is given an explicit value of ther than 'html' or 'json', an HTTPNotAcceptable error will be raised.
    * If the first element of MIME_TYPES_SUPPORTED[0] is 'text/html', returns True.
    * Otherwise, in all remaining cases, returns False.

    NOTE: Memoized via `lru_cache`. Cache size is set to be 16 (> 1) in case sub-requests fired off during handling.
    """
    # We always return JSON in response to POST, PATCH, etc.
    if request.method not in ('GET', 'HEAD'):
        return False

    # Only JSON response/content can be plugged into HTML/JS template responses.
    if response.content_type != 'application/json':
        return False

    # If we have a 'frame' that is not None or page, force JSON, since our UI doesn't handle all various
    # forms of the data, just embedded/page.
    request_frame = request.params.get("frame", "page")
    if request_frame != "page":
        return False

    # The `format` URI param allows us to override request's 'Accept' header.
    format = request.params.get('format')
    if format is not None:
        format = format.lower()
        if format == 'json':
            return False
        if format == 'html':
            return True
        else:
            raise HTTPNotAcceptable("Improper format URI parameter",
                                    comment="The format URI parameter should be set to either html or json.")

    # Web browsers send an Accept request header for initial (e.g. non-AJAX) page requests
    # which should contain 'text/html'
    # See: https://tedboy.github.io/flask/generated/generated/werkzeug.Accept.best_match.html#werkzeug-accept-best-match
    mime_type = best_mime_type(request)
    format = mime_type.split('/', 1)[1]  # Will be 1 of 'html', 'json', 'json-ld'

    # N.B. ld+json (JSON-LD) is likely more unique case and might be sent by search engines (?)
    # which can parse JSON-LDs. At some point we could maybe have it to be same as
    # making an `@@object` or `?frame=object` request (?) esp if fill
    # out @context response w/ schema(s) (or link to schema)

    if format == 'html':
        return True
    return False


def render_page_html_tween_factory(handler, registry):

    class TransformErrorResponse(HTTPServerError):
        """Extends 500 server error"""
        explanation = 'Transformation of JSON response to HTML webpage failed.'

    node_env = os.environ.copy()
    node_env['NODE_PATH'] = ''

    # Rendering huge pages can make the node process memory usage explode.
    # Ideally we would let the OS handle this with `ulimit` or by calling
    # `resource.setrlimit()` from  a `subprocess.Popen(preexec_fn=...)`.
    # Unfortunately Linux does not enforce RLIMIT_RSS.
    # An alternative would be to use cgroups, but that makes per-process limits
    # tricky to enforce (we would need to create one cgroup per process.)
    # So we just manually check the resource usage after each transform.

    rss_limit = 256 * (1024 ** 2)  # MB

    reload_process = (True
                      if registry.settings.get('reload_templates', False)
                      else lambda proc: psutil.Process(proc.pid).memory_info().rss > rss_limit)

    # TransformWorker inits and manages a subprocess
    # it re-uses the subprocess so interestingly data in JS global variables
    # might persist in between renders (from different users, even).
    transform = TransformWorker(
        Response=Response,
        reload_process=reload_process,
        # Other kwargs, including env below, get passed down to subprocess.Popen
        args=['node', resource_filename(__name__, 'static/build/renderer.js')],
        env=node_env
    )

    def render_page_html_tween(request):
        # Result of downstream tweens. Body not yet transformed into HTML.
        response = handler(request)

        if not should_transform(request, response):
            # Continue back up the tween chain with JSON response body.
            return response

        # The stats below are converted into "X-Stats" header in snovault.
        # Maybe we could conditionally disable this at some point in .ini config
        # for minute performance enhancement(s).

        transform_start_time = time.time()

        try:
            response = transform(response)
        except ValueError as e:
            response = TransformErrorResponse(e.args[0])
        else:
            transform_end_time = time.time()
            transform_duration = int((transform_end_time - transform_start_time) * 1e6)
            stats = request._stats
            stats['render_count'] = stats.get('render_count', 0) + 1
            stats['render_time'] = stats.get('render_time', 0) + transform_duration
            # We don't care about getting this back in form of a cookie. Will be available
            # as header.
            request._add_stats_cookie = False

        return response

    return render_page_html_tween
