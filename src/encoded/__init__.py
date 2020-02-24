from future.standard_library import install_aliases
# TODO: Once things are working, remove this as probably 2.7 compatibility. --kent&will 4-Feb-2020
install_aliases()  # NOQA

import base64
import codecs
import hashlib
import json
import logging
import mimetypes
import netaddr
import os
import structlog
# try:
#     # TODO: Once things are working, remove this 2.7 compatibility. --kent&will 4-Feb-2020
#     import subprocess32 as subprocess  # Closes pipes on failure
# except ImportError:
#     import subprocess
import subprocess
import webtest

from dcicutils.log_utils import set_logging
from dcicutils.beanstalk_utils import whodaman as _whodaman  # don't export
from .commands.create_mapping_on_deploy import (
    ENV_WEBPROD,
    ENV_WEBPROD2,
    BEANSTALK_PROD_ENVS,
)
from pkg_resources import resource_filename
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.config import Configurator
from pyramid_localroles import LocalRolesAuthorizationPolicy
from pyramid.path import (
    AssetResolver,
    caller_package,
)
from pyramid.session import SignedCookieSessionFactory
from pyramid.settings import (
    aslist,
    asbool,
)
from snovault.app import (
    STATIC_MAX_AGE,
    session,
    json_from_path,
    configure_dbsession,
    changelogs,
    json_asset,
)
from snovault.elasticsearch import APP_FACTORY
from snovault.json_renderer import json_renderer
from sqlalchemy import engine_from_config
from webob.cookies import JSONSerializer
from .commands.create_mapping_on_deploy import (
    ENV_WEBPROD,
    ENV_WEBPROD2,
    BEANSTALK_PROD_ENVS,
)

from .loadxl import load_all
from .utils import find_other_in_pair


# location of environment variables on elasticbeanstalk
BEANSTALK_ENV_PATH = "/opt/python/current/env"


def get_mirror_env(settings):
    """
        Figures out who the mirror beanstalk Env is if applicable
        This is important in our production environment because in our
        blue-green deployment we maintain two elasticsearch intances that
        must be up to date with each other.
    """
    who_i_am = settings.get('env.name', '')
    if who_i_am not in BEANSTALK_PROD_ENVS:  # no mirror if we're not in prod
        return None
    return find_other_in_pair(who_i_am, BEANSTALK_PROD_ENVS)


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


def source_beanstalk_env_vars(config_file=BEANSTALK_ENV_PATH):
    """
    set environment variables if we are on Elastic Beanstalk
    AWS_ACCESS_KEY_ID is indicative of whether or not env vars are sourced

    Args:
        config_file (str): filepath to load env vars from
    """
    if os.path.exists(config_file) and not os.environ.get("AWS_ACCESS_KEY_ID"):
        command = ['bash', '-c', 'source ' + config_file + ' && env']
        proc = subprocess.Popen(command, stdout=subprocess.PIPE, universal_newlines=True)
        for line in proc.stdout:
            key, _, value = line.partition("=")
            os.environ[key] = value[:-1]
        proc.communicate()



def app_version(config):
    if not config.registry.settings.get('snovault.app_version'):
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
            except:
                version = "test"

        config.registry.settings['snovault.app_version'] = version

    # GA Config
    ga_conf_file = config.registry.settings.get('ga_config_location')
    ga_conf_existing = config.registry.settings.get('ga_config')
    if ga_conf_file and not ga_conf_existing:
        ga_conf_file = os.path.normpath(
            os.path.join(
                os.path.dirname(os.path.abspath(__file__)), # Absolute loc. of this file
                "../../",                                   # Go back up to repo dir
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
    # set mirrored Elasticsearch location (for webprod/webprod2)
    settings['mirror.env.name'] = get_mirror_env(settings)
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
    #config.include(add_schemas_to_html_responses)
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

    app = config.make_wsgi_app()

    workbook_filename = settings.get('load_workbook', '')
    load_test_only = asbool(settings.get('load_test_only', False))
    docsdir = settings.get('load_docsdir', None)
    if docsdir is not None:
        docsdir = [path.strip() for path in docsdir.strip().split('\n')]
    if workbook_filename:
        load_workbook(app, workbook_filename, docsdir)


    return app
