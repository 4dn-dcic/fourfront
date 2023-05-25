from . import project_defs
import hashlib
import logging
import json  # used only in Fourfront, not CGAP
import mimetypes
import netaddr
import os
import pkg_resources
import sentry_sdk
import subprocess

from codeguru_profiler_agent import Profiler
from dcicutils.ecs_utils import ECSUtils
from dcicutils.env_utils import EnvUtils, get_mirror_env_from_context
from dcicutils.ff_utils import get_health_page
from dcicutils.log_utils import set_logging
from dcicutils.misc_utils import VirtualApp
from dcicutils.secrets_utils import assumed_identity, SecretsTable
from pyramid.config import Configurator
from pyramid_localroles import LocalRolesAuthorizationPolicy
from pyramid.settings import asbool
from sentry_sdk.integrations.pyramid import PyramidIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
import snovault.ingestion.ingestion_listener
from snovault.app import (
    session, json_from_path, configure_dbsession, changelogs,
    json_asset, STATIC_MAX_AGE as DEFAULT_STATIC_MAX_AGE
)
from snovault.elasticsearch import APP_FACTORY
from snovault.elasticsearch.interfaces import INVALIDATION_SCOPE_ENABLED

from .appdefs import APP_VERSION_REGISTRY_KEY
from .loadxl import load_all


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
    settings['auth0.domain'] = settings.get('auth0.domain', os.environ.get('Auth0Domain', DEFAULT_AUTH0_DOMAIN))
    settings['auth0.client'] = settings.get('auth0.client', os.environ.get('Auth0Client'))
    settings['auth0.secret'] = settings.get('auth0.secret', os.environ.get('Auth0Secret'))
    settings['auth0.options'] = {
        'auth': {
            'sso': False,
            'redirect': False,
            'responseType': 'token',
            'params': {
                'scope': 'openid email',
                'prompt': 'select_account'
            }
        },
        'allowedConnections': [  # TODO: make at least this part configurable
            'github', 'google-oauth2'
        ]
    }
    # set google reCAPTCHA keys
    # TODO propagate from GAC
    settings['g.recaptcha.key'] = os.environ.get('reCaptchaKey')
    settings['g.recaptcha.secret'] = os.environ.get('reCaptchaSecret')
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
    config.include(session)

    # must include, as tm.attempts was removed from pyramid_tm
    config.include('pyramid_retry')

    config.include(configure_dbsession)
    config.include('snovault')
    config.commit()  # commit so search can override listing

    # Render an HTML page to browsers and a JSON document for API clients
    # config.include(add_schemas_to_html_responses)
    config.include('.renderers')
#   config.include('.authentication')
    config.include('.server_defaults')
    config.include('.root')
    config.include('.types')
    config.include('.batch_download')
    config.include('.loadxl')
    config.include('.visualization')
#   config.include('.ingestion_listener')
#   config.include('.ingestion.ingestion_message_handler_default')

    if 'elasticsearch.server' in config.registry.settings:
        config.include('snovault.elasticsearch')
        config.include('.search')

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
