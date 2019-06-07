from pkg_resources import resource_filename
from urllib.parse import urlencode
from pyramid.events import (
    BeforeRender,
    subscriber,
)
from pyramid.httpexceptions import (
    HTTPMovedPermanently,
    HTTPPreconditionFailed,
    HTTPUnauthorized,
    HTTPForbidden,
    HTTPUnsupportedMediaType,
    HTTPNotAcceptable,
    HTTPServerError
)
from pyramid.security import forget
from pyramid.settings import asbool
from pyramid.threadlocal import (
    manager,
)
from pyramid.response import Response
from pyramid.traversal import (
    split_path_info,
    _join_path_tuple,
)

from snovault.validation import CSRFTokenError
from subprocess_middleware.tween import SubprocessTween
from subprocess_middleware.worker import TransformWorker
import logging
import os
import psutil
import time
import json


log = logging.getLogger(__name__)


def includeme(config):
    '''
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
        1           .renderers.fix_request_method_tween_factory
        2           .renderers.remove_expired_session_cookies_tween_factory
        3           .renderers.render_page_html_tween_factory
        5           .renderers.set_response_headers_tween_factory
        6           pyramid_tm.tm_tween_factory
        7           .renderers.security_tween_factory
        8           pyramid.tweens.excview_tween_factory
        -           MAIN

    The `handler` kwarg of tween factories refers to the subsequent tween to be called.
    This means that if handler(request) is called, then the downstream tweens are acted upon it,
    until response is returned. It's an ONION!

    '''

    config.add_tween('.renderers.fix_request_method_tween_factory', under='snovault.stats.stats_tween_factory')
    #.add_tween('.renderers.remove_expired_session_cookies_tween_factory', under='.renderers.fix_request_method_tween_factory')
    config.add_tween('.renderers.render_page_html_tween_factory', under='.renderers.fix_request_method_tween_factory')

    # The above tweens, when using response (= `handler(request)`) act on the _transformed_ response (containing HTML body).
    # The below tweens run _before_ the JS rendering. Responses in these tweens have not been transformed to HTML yet.
    config.add_tween('.renderers.set_response_headers_tween_factory', under='.renderers.render_page_html_tween_factory')

    # If this isn't placed under 'pyramid_tm.tm_tween_factory' (e.g. under resp headers or something)
    # then the headers aren't preserved or available in server-side render or response.
    config.add_tween('.renderers.security_tween_factory', under='pyramid_tm.tm_tween_factory')

    config.scan(__name__)


def fix_request_method_tween_factory(handler, registry):
    """ Fix Request method changed by mod_wsgi.

    See: https://github.com/GrahamDumpleton/mod_wsgi/issues/2

    Apache config:
        SetEnvIf Request_Method HEAD X_REQUEST_METHOD=HEAD
    """

    def fix_request_method_tween(request):
        environ = request.environ
        if 'X_REQUEST_METHOD' in environ:
            environ['REQUEST_METHOD'] = environ['X_REQUEST_METHOD']
        return handler(request)

    return fix_request_method_tween



def security_tween_factory(handler, registry):

    def security_tween(request):
        """Executed prior to any page transforms"""
        login = None

        expected_user = request.headers.get('X-If-Match-User')
        if expected_user is not None: # Not sure when this is the case
            login = request.authenticated_userid
            if login != 'mailto.' + expected_user:
                detail = 'X-If-Match-User does not match'
                raise HTTPPreconditionFailed(detail)

        # Older stuff (pre-Auth0)
        elif request.authorization is not None or asbool(request.headers.get('X-Auth-Challenge', False)):
            login = request.authenticated_userid
            if not login:
                # wget may only send credentials following a challenge response.
                raise HTTPForbidden(title="No Access")

        if request.method in ('GET', 'HEAD'): # Includes page text/html requests.
            return handler(request)

        if request.content_type != 'application/json':
            if request.content_type == 'application/x-www-form-urlencoded' and request.path[0:10] == '/metadata/':
                # Special case to allow us to POST to metadata TSV requests via form submission
                return handler(request)
            detail = "Request content type %s is not 'application/json'" % request.content_type
            raise HTTPUnsupportedMediaType(detail)

        return handler(request)

        # This was commented out when we introduced JWT authentication
        # Theoretically we mitigate CSRF requests now by grabbing JWT for transactional
        # requests from Authorization header which acts like a CSRF token.
        # See authentication.py - get_jwt()

        #token = request.headers.get('X-CSRF-Token')
        #if token is not None:
        #    # Avoid dirtying the session and adding a Set-Cookie header
        #    # XXX Should consider if this is a good idea or not and timeouts
        #    if token == dict.get(request.session, '_csrft_', None):
        #        return handler(request)
        #    raise CSRFTokenError('Incorrect CSRF token')
        # raise CSRFTokenError('Missing CSRF token')

    return security_tween


def remove_expired_session_cookies_tween_factory(handler, registry):
    from webob.cookies import Cookie

    ignore = {
        '/favicon.ico',
    }

    def remove_expired_session_cookies_tween(request):
        '''
        Original purpose of this was to remove expired (session?) cookies.
        See: https://github.com/ENCODE-DCC/encoded/commit/75854803c99e5044a6a33aedb3a79d750481b6cd#diff-bc19a9793a1b3b4870cff50e7c7c9bd1R135

        We disable it for now via removing from tween chain.
        If needed for some reason due to newly-encountered error,
        can re-enable.
        '''

        if request.path in ignore or request.path.startswith('/static/'):
            return handler(request)

        session = request.session
        #if session or session._cookie_name not in request.cookies:
        #    return handler(request)

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
    '''Add additional response headers here'''
    def set_response_headers_tween(request):
        response = handler(request)
        response.headers['X-Request-URL'] = request.url
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


def render_page_html_tween_factory(handler, registry):

    def should_transform(request, response):
        '''
        Determines whether to transform the response from JSON->HTML/JS depending on type of response
        and what the request is looking for to be returned via e.g. request Accept, Authorization header.
        In case of no Accept header, attempts to guess
        '''

        # We always return JSON in response to POST, PATCH, etc.
        #if request.method not in ('GET', 'HEAD'):
        #    return False

        # Only JSON response/content can be plugged into HTML/JS template responses.
        if response.content_type != 'application/json':
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
                raise HTTPNotAcceptable("Improper format URI parameter", comment="The format URI parameter should be set to either html or json.")

        # Web browsers send an Accept request header for initial (e.g. non-AJAX) page requests
        # which should contain 'text/html'
        # See: https://tedboy.github.io/flask/generated/generated/werkzeug.Accept.best_match.html#werkzeug-accept-best-match
        mime_type = request.accept.best_match(['text/html',  'application/json', 'application/ld+json'], 'application/json')
        format = mime_type.split('/', 1)[1] # Will be 1 of 'html', 'json', 'json-ld'

        # N.B. ld+json (JSON-LD) is likely more unique case and might be sent by search engines (?) which can parse JSON-LDs.
        # At some point we could maybe have it to be same as making an `@@object` or `?frame=object` request (?) esp if fill
        # out @context response w/ schema(s) (or link to schema)

        if format == 'html':
            return True
        return False

    def add_x_user_info_header(response, request):
        """
        This 'X-User-Info' header is added only for server-side HTML responses; not on JSON responses.

        Checks if user is logged in via Auth0 and sets 'X-Request-JWT' & 'X-User-Info' headers
        accordingly to inform React render.

        Arguments:
            response - Response for req as obtained from handler(request).
        """

        if not hasattr(request, 'auth0_expired'):
            # No session acquired in authentication.py, assume anonymous user & skip
            return response

        if not request.auth0_expired:
            login = request.authenticated_userid
            if login:
                authtype, email = login.split('.', 1)
                if authtype == 'auth0':
                    response.headers['X-Request-JWT'] = request.cookies.get('jwtToken','')
                    response.headers['X-User-Info'] = json.dumps(request.user_info) # Re-ified property set in authentication.py
                else:
                    response.headers['X-Request-JWT'] = "null"

        else:
            # Inform libs/react-middleware.js of expired token to set logout state in front-end in response to
            # either doc request or xhr request & set appropriate alerts
            response.headers['X-Request-JWT'] = "expired"

            # Especially for initial document requests by browser, unset jwtToken cookie so initial client-side
            # React render has App(instance).state.session = false to be synced w/ server-side
            response.set_cookie(name='jwtToken', value=None, max_age=0,path='/')
            response.status_code = 401
            response.headers['WWW-Authenticate'] = "Bearer realm=\"{}\", title=\"Session Expired\"; Basic realm=\"{}\"".format(request.domain, request.domain)

        return response

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

    reload_process = True if registry.settings.get('reload_templates', False) else lambda proc: psutil.Process(proc.pid).memory_info().rss > rss_limit

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
        should_transform_this_response = should_transform(request, response)

        if not should_transform_this_response:
            # Continue back up the tween chain with JSON response body.
            return response

        # Add `X-User-Info` header. This is parsed in renderer.js, or, more accurately,
        # by libs/react-middleware.js which is imported by server.js and compiled into
        # renderer.js. Is used to get access to User Info on initial web page render.
        add_x_user_info_header(response, request)

        # These stats are converted into "X-Stats" header in snovault.
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
            request._add_stats_cookie = True

        return response

    return render_page_html_tween
