# from future.standard_library import install_aliases
# TODO: Once things are working, remove this as probably 2.7 compatibility. --kent&will 4-Feb-2020
# install_aliases()  # NOQA

import hashlib
import json
import mimetypes
import netaddr
import os
import sentry_sdk
# import structlog
import subprocess
import sys
import webtest

from dcicutils.beanstalk_utils import source_beanstalk_env_vars
# from dcicutils.beanstalk_utils import whodaman as _whodaman  # don't export
from dcicutils.env_utils import get_mirror_env_from_context, is_stg_or_prd_env
from dcicutils.ff_utils import get_health_page
from dcicutils.log_utils import set_logging
from sentry_sdk.integrations.pyramid import PyramidIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from pkg_resources import resource_filename
# from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.config import Configurator
from pyramid_localroles import LocalRolesAuthorizationPolicy
# from pyramid.path import AssetResolver, caller_package
# from pyramid.session import SignedCookieSessionFactory
from pyramid.settings import asbool
from snovault.app import STATIC_MAX_AGE, session, json_from_path, configure_dbsession, changelogs, json_asset
from snovault.elasticsearch import APP_FACTORY
from snovault.elasticsearch.interfaces import INVALIDATION_SCOPE_ENABLED
# from snovault.json_renderer import json_renderer
# from sqlalchemy import engine_from_config
# from webob.cookies import JSONSerializer

from .appdefs import APP_VERSION_REGISTRY_KEY
from .loadxl import load_all
from .util import find_other_in_pair


if sys.version_info.major < 3:
    raise EnvironmentError("The Fourfront encoded library no longer supports Python 2.")


# location of environment variables on elasticbeanstalk
BEANSTALK_ENV_PATH = "/opt/python/current/env"


def static_resources(config):
    mimetypes.init()
    mimetypes.init([resource_filename('encoded', 'static/mime.types')])
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
    testapp = webtest.TestApp(app, environ)
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

    # GA Config
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


def main(global_config, **local_config):
    """
    This function returns a Pyramid WSGI application.
    """

    settings = global_config
    settings.update(local_config)

    set_logging(in_prod=settings.get('production'))
    # set_logging(settings.get('elasticsearch.server'), settings.get('production'))

    # source environment variables on elastic beanstalk
    source_beanstalk_env_vars()

    settings['snovault.jsonld.namespaces'] = json_asset('encoded:schemas/namespaces.json')
    settings['snovault.jsonld.terms_namespace'] = 'https://www.encodeproject.org/terms/'
    settings['snovault.jsonld.terms_prefix'] = 'encode'
    # set auth0 keys
    settings['auth0.secret'] = os.environ.get("Auth0Secret")
    settings['auth0.client'] = os.environ.get("Auth0Client")
    # set google reCAPTCHA keys
    settings['g.recaptcha.key'] = os.environ.get('reCaptchaKey')
    settings['g.recaptcha.secret'] = os.environ.get('reCaptchaSecret')
    # enable invalidation scope
    settings[INVALIDATION_SCOPE_ENABLED] = True

    # set mirrored Elasticsearch location (for staging and production servers)
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
    config.include('.authentication')
    config.include('.server_defaults')
    config.include('.root')
    config.include('.types')
    config.include('.batch_download')
    config.include('.loadxl')
    config.include('.visualization')

    if 'elasticsearch.server' in config.registry.settings:
        config.include('snovault.elasticsearch')
        config.include('.search')

    # this contains fall back url, so make sure it comes just before static_resoruces
    config.include('.types.page')
    config.include(static_resources)
    config.include(changelogs)

    # we are loading ontologies now as regular items
    # config.registry['ontology'] = json_from_path(settings.get('ontology_path'), {})
    aws_ip_ranges = json_from_path(settings.get('aws_ip_ranges_path'), {'prefixes': []})
    config.registry['aws_ipset'] = netaddr.IPSet(
        record['ip_prefix'] for record in aws_ip_ranges['prefixes'] if record['service'] == 'AMAZON')

    if asbool(settings.get('testing', False)):
        config.include('.tests.testing_views')

    # Load upgrades last so that all views (including testing views) are
    # registered.
    config.include('.upgrade')

    # initialize sentry reporting, split into "production" and "mastertest", do nothing in local/testing
    current_env = settings.get('env.name', None)
    if is_stg_or_prd_env(current_env):
        sentry_sdk.init("https://0d46fafce1d04ea2bfbe11ff15ca896e@o427308.ingest.sentry.io/5379985",
                        integrations=[PyramidIntegration(), SqlalchemyIntegration()])
    elif current_env is not None:
        sentry_sdk.init("https://ce359da106854a07aa67aabee873601c@o427308.ingest.sentry.io/5373642",
                        integrations=[PyramidIntegration(), SqlalchemyIntegration()])

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
