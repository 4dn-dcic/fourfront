import encoded.project_defs
import base64
import hashlib
import logging
import json  # used only in Fourfront, not CGAP
import mimetypes
import netaddr
import os
import pkg_resources
import requests
import sentry_sdk
import subprocess
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dcicutils.misc_utils import PRINT
from codeguru_profiler_agent import Profiler
from dcicutils.ecs_utils import ECSUtils
from dcicutils.env_utils import EnvUtils, get_mirror_env_from_context
from dcicutils.ff_utils import get_health_page
from dcicutils.log_utils import set_logging
from dcicutils.misc_utils import VirtualApp
from dcicutils.secrets_utils import assume_identity, assumed_identity, SecretsTable
from pyramid.config import Configurator
from snovault.local_roles import LocalRolesAuthorizationPolicy
from pyramid.settings import asbool
from sentry_sdk.integrations.pyramid import PyramidIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
#import snovault.ingestion.ingestion_listener
from snovault.app import (
    session, json_from_path, configure_dbsession, changelogs,
    json_asset, STATIC_MAX_AGE as DEFAULT_STATIC_MAX_AGE
)
from snovault.elasticsearch import APP_FACTORY
from snovault.elasticsearch.interfaces import INVALIDATION_SCOPE_ENABLED

from .appdefs import APP_VERSION_REGISTRY_KEY
from snovault.loadxl import load_all


# snovault.app.STATIC_MAX_AGE (8 seconds) is WAY too low for /static and /profiles in CGAP - Will March 15 2022
# The default value from snovault is apparently fine for Fourfront.
STATIC_MAX_AGE = DEFAULT_STATIC_MAX_AGE

# Assign a custom default trace_rate for sentry.
# Tune this to get more data points when analyzing performance
# See https://docs.sentry.io/platforms/python/guides/logging/configuration/sampling/ for details.
#
# The default value from Sentry seems to be 1.0, but the code is convoluted, so if we set this to None
# here, it won't get passed and will be allowed to default in whatever manner they select. -kmp 15-Sep-2022
SENTRY_TRACE_RATE = 0.1

DEFAULT_AUTH0_DOMAIN = 'hms-dbmi.auth0.com'


def static_resources(config):
    mimetypes.init()
    mimetypes.init([pkg_resources.resource_filename('encoded', 'static/mime.types')])
    config.add_static_view('static', 'static', cache_max_age=STATIC_MAX_AGE)
    config.add_static_view('profiles', 'schemas', cache_max_age=STATIC_MAX_AGE)

    # Favicon
    favicon_path = '/static/img/favicon.ico'
    if config.route_prefix:
        favicon_path = '/%s%s' % (config.route_prefix, favicon_path)
    config.add_route('favicon.ico', 'favicon.ico')

    def favicon(request):
        subreq = request.copy()
        subreq.path_info = favicon_path
        response = request.invoke_subrequest(subreq)
        return response

    config.add_view(favicon, route_name='favicon.ico')

    # Robots.txt
    robots_txt_path = None
    if config.registry.settings.get('testing') in [True, 'true', 'True']:
        robots_txt_path = '/static/dev-robots.txt'
    else:
        robots_txt_path = '/static/robots.txt'

    if config.route_prefix:
        robots_txt_path = '/%s%s' % (config.route_prefix, robots_txt_path)

    config.add_route('robots.txt-conditional', '/robots.txt')

    def robots_txt(request):
        subreq = request.copy()
        subreq.path_info = robots_txt_path
        response = request.invoke_subrequest(subreq)
        return response

    config.add_view(robots_txt, route_name='robots.txt-conditional')


def load_workbook(app, workbook_filename, docsdir):
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'IMPORT',
    }
    testapp = VirtualApp(app, environ)
    load_all(testapp, workbook_filename, docsdir)


def app_version(config):
    if not config.registry.settings.get(APP_VERSION_REGISTRY_KEY):
        # we update version as part of deployment process `deploy_beanstalk.py`
        # but if we didn't check env then git
        version = os.environ.get("ENCODED_VERSION")
        if not version:
            try:
                version = subprocess.check_output(
                    ['git', '-C', os.path.dirname(__file__), 'describe']).decode('utf-8').strip()
                diff = subprocess.check_output(
                    ['git', '-C', os.path.dirname(__file__), 'diff', '--no-ext-diff'])
                if diff:
                    version += '-patch' + hashlib.sha1(diff).hexdigest()[:7]
            except Exception:
                version = "test"

        config.registry.settings[APP_VERSION_REGISTRY_KEY] = version

    # Fourfront does GA Config at this point, but CGAP does not need that.
    ga_conf_file = config.registry.settings.get('ga_config_location')
    ga_conf_existing = config.registry.settings.get('ga_config')
    if ga_conf_file and not ga_conf_existing:
        ga_conf_file = os.path.normpath(
            os.path.join(
                os.path.dirname(os.path.abspath(__file__)),  # Absolute loc. of this file
                "../../",                                    # Go back up to repo dir
                ga_conf_file
            )
        )
        if not os.path.exists(ga_conf_file):
            raise Exception(ga_conf_file + " does not exist in filesystem. Aborting.")
        with open(ga_conf_file) as json_file:
            config.registry.settings["ga_config"] = json.load(json_file)


def init_sentry(dsn):
    """ Helper function that initializes sentry SDK if a dsn is specified. """
    if not SecretsTable.is_empty_value(dsn):
        options = {}
        if SENTRY_TRACE_RATE is not None:
            options['traces_sample_rate'] = SENTRY_TRACE_RATE
        sentry_sdk.init(dsn, integrations=[PyramidIntegration(), SqlalchemyIntegration()], **options)


def init_code_guru(*, group_name, region=ECSUtils.REGION):
    """ Starts AWS CodeGuru process for profiling the app remotely. """
    Profiler(profiling_group_name=group_name, region_name=region).start()


def jwk_to_pem(jwk):
    """ Converts JSON Web Key to PEM format """
    if 'kty' not in jwk:
        raise ValueError("JWK must have a 'kty' field")
    kty = jwk['kty']

    if kty == 'RSA':
        if 'n' not in jwk or 'e' not in jwk:
            raise ValueError("JWK RSA key must have 'n' and 'e' fields")

        n = int.from_bytes(base64.urlsafe_b64decode(jwk['n'] + '=='), byteorder='big')
        e = int.from_bytes(base64.urlsafe_b64decode(jwk['e'] + '=='), byteorder='big')

        public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        return pem

    # You can add more cases for other key types (e.g., 'EC' for elliptic curve keys)
    raise ValueError("Unsupported 'kty': {}".format(kty))

def main(global_config, **local_config):
    """
    This function returns a Pyramid WSGI application.
    """

    settings = global_config
    settings.update(local_config)

    doing_testing = asbool(settings.get('testing', False))

    # If running on a real server (not a unit test or local deploy), assume identity and resolve EnvUtils
    if not doing_testing:
        with assumed_identity():
            # Assume GAC and load env utils (once)
            EnvUtils.init()

    # adjust log levels for some annoying loggers
    lnames = ['boto', 'urllib', 'elasticsearch', 'dcicutils']
    for name in logging.Logger.manager.loggerDict:
        if any(logname in name for logname in lnames):
            logging.getLogger(name).setLevel(logging.WARNING)

    set_logging(in_prod=settings.get('production'))
    # set_logging(settings.get('elasticsearch.server'), settings.get('production'))

    settings['snovault.jsonld.namespaces'] = json_asset('encoded:schemas/namespaces.json')
    settings['snovault.jsonld.terms_namespace'] = 'https://www.encodeproject.org/terms/'
    settings['snovault.jsonld.terms_prefix'] = 'encode'
    # set auth0 keys
    PRINT(f'auth0_domain in settings: {settings.get("auth0.domain")}')
    PRINT(f'auth0_domain in env: {os.environ.get("Auth0Domain")}')
    settings['auth0.domain'] = settings.get('auth0.domain', os.environ.get('Auth0Domain', DEFAULT_AUTH0_DOMAIN))
    settings['auth0.client'] = settings.get('auth0.client', os.environ.get('Auth0Client'))
    settings['auth0.secret'] = settings.get('auth0.secret', os.environ.get('Auth0Secret'))
    if 'auth0' in settings['auth0.domain']:
        scope = 'openid email'
        allowed_conn = ['github', 'google-oauth2']
    else:
        # RAS
        scope = 'openid profile email ga4gh_passport_v1'
        allowed_conn = ['google-oauth2']
         # get public key from jwks uri
        auth0Domain = settings['auth0.domain']
        response = requests.get(url=f'https://{auth0Domain}/openid/connect/jwks.json')
        # gives the set of jwks keys.the keys has to be passed as it is to jwt.decode() for signature verification.
        jwks = response.json()
        settings['auth0.public.key'] = jwk_to_pem(jwks['keys'][0])

    settings['auth0.options'] = {
        'auth': {
            'sso': False,
            'redirect': True,
            'responseType': 'code',
            'params': {
                'scope': scope,
                'prompt': 'select_account'
            }
        },
        'allowedConnections': allowed_conn # TODO: make at least this part configurable
    }
    # ga4 api secret
    if 'IDENTITY' in os.environ:
        identity = assume_identity()
        if 'ga4.secret' not in settings:
            settings['ga4.secret'] = identity.get('GA4_API_SECRET', os.environ.get('GA4Secret'))
    else:
        settings['ga4.secret'] = settings.get('ga4.secret', os.environ.get('GA4Secret'))
    # set google reCAPTCHA keys
    # TODO propagate from GAC
    settings['g.recaptcha.key'] = settings.get('g.recaptcha.key', os.environ.get('reCaptchaKey'))
    settings['g.recaptcha.secret'] = settings.get('g.recaptcha.secret', os.environ.get('reCaptchaSecret'))
    # enable invalidation scope
    settings[INVALIDATION_SCOPE_ENABLED] = True

    # set mirrored Elasticsearch location (for staging and production servers)
    # Although this is a Fourfront-only feature for now, not used by CGAP, this code is generic.
    mirror = get_mirror_env_from_context(settings)
    if mirror is not None:
        settings['mirror.env.name'] = mirror
        settings['mirror_health'] = get_health_page(ff_env=mirror)

    config = Configurator(settings=settings)

    config.registry[APP_FACTORY] = main  # used by mp_indexer
    config.include(app_version)

    config.include('pyramid_multiauth')  # must be before calling set_authorization_policy
    # Override default authz policy set by pyramid_multiauth
    config.set_authorization_policy(LocalRolesAuthorizationPolicy())

    # This creates a session factory (from definition in Snovault/app.py)
    config.include(session)

    # must include, as tm.attempts was removed from pyramid_tm
    config.include('pyramid_retry')
    config.include('pyramid_tm')

    config.include(configure_dbsession)
    include_snovault(config)
    include_fourfront(config)

    # Render an HTML page to browsers and a JSON document for API clients
    # config.include(add_schemas_to_html_responses)
    config.include('snovault.renderers')
#   config.include('.authentication')
#   config.include('.server_defaults')
    config.include('.root')
    config.include('.types')
    config.include('.batch_download')
    config.include('snovault.loadxl')
    config.include('.visualization')
    config.include('snovault.ingestion.ingestion_listener')
    config.include('.ingestion.ingestion_processors')
    config.include('snovault.ingestion.ingestion_message_handler_default')
    config.commit()  # commit so search can override listing

    if 'elasticsearch.server' in config.registry.settings:
        config.include('snovault.elasticsearch')
        config.include('.search')

    if 'redis.server' in config.registry.settings:
        config.include('snovault.redis')

    # this contains fall back url, so make sure it comes just before static_resoruces
    config.include('.types.page')
    config.include(static_resources)
    config.include(changelogs)

    aws_ip_ranges = json_from_path(settings.get('aws_ip_ranges_path'), {'prefixes': []})
    config.registry['aws_ipset'] = netaddr.IPSet(
        record['ip_prefix'] for record in aws_ip_ranges['prefixes'] if record['service'] == 'AMAZON')

    if doing_testing:
        config.include('.tests.testing_views')

    # Load upgrades last so that all views (including testing views) are
    # registered.
    config.include('.upgrade')

    # initialize sentry reporting
    sentry_dsn = settings.get('sentry_dsn', None)
    init_sentry(sentry_dsn)

    # initialize CodeGuru profiling, if set
    # note that this is intentionally an env variable (so it is a TASK level setting)
    if 'ENCODED_PROFILING_GROUP' in os.environ:
        init_code_guru(group_name=os.environ['ENCODED_PROFILING_GROUP'])

    app = config.make_wsgi_app()

    workbook_filename = settings.get('load_workbook', '')
    # This option never gets used. Is that bad? -kmp 27-Jun-2020
    # load_test_only = asbool(settings.get('load_test_only', False))
    docsdir = settings.get('load_docsdir', None)
    if docsdir is not None:
        docsdir = [path.strip() for path in docsdir.strip().split('\n')]
    if workbook_filename:
        load_workbook(app, workbook_filename, docsdir)

    return app


# TODO: Took from smaht-portal/src/encodedd/__init__.py (branch: wrr_intial) ...
def include_snovault(config: Configurator) -> None:
    """ Implements the selective include mechanism from Snovault
        Decide here which modules you want to include from snovault

        Note that because of new conflicts from extended modules, you can no longer
        do config.include('snovault'), as you will get Configurator conflicts when
        bringing in duplicates of various modules ie: root.py
    """
    config.include('snovault.authentication')
    config.include('snovault.util')
    config.include('snovault.drs')
    config.include('snovault.stats')
    config.include('snovault.batchupgrade')
    config.include('snovault.calculated')
    config.include('snovault.config')
    config.include('snovault.connection')
    config.include('snovault.custom_embed')
    config.include('snovault.embed')
    config.include('snovault.json_renderer')
    config.include('snovault.validation')
    config.include('snovault.predicates')
    config.include('snovault.invalidation')
    config.include('snovault.upgrader')
    config.include('snovault.aggregated_items')
    config.include('snovault.storage')
    config.include('snovault.typeinfo')
    config.include('snovault.types')
    config.include('snovault.resources')
    config.include('snovault.attachment')
    config.include('snovault.schema_graph')
    config.include('snovault.jsonld_context')
    config.include('snovault.schema_views')
    config.include('snovault.crud_views')
    config.include('snovault.indexing_views')
    config.include('snovault.resource_views')
    config.include('snovault.settings')
    config.include('snovault.server_defaults')

    # configure redis server in production.ini
    if 'redis.server' in config.registry.settings:
        config.include('snovault.redis')

    config.commit()


def include_fourfront(config: Configurator) -> None:
    # TODO
    config.commit()
