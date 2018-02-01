import os
import json
import requests
from re import escape
from pyramid.decorator import reify
from snovault import (
    Root,
    calculated_property,
    root,
    COLLECTIONS
)
from snovault.elasticsearch.create_mapping import get_db_es_counts_and_db_uuids
from .schema_formats import is_accession
from .types.page import get_local_file_contents
from pyramid.security import (
    ALL_PERMISSIONS,
    Allow,
    Authenticated,
    Deny,
    Everyone,
)
from collections import OrderedDict


def includeme(config):
    config.include(health_check)
    config.include(item_counts)
    config.include(submissions_page)
    config.scan(__name__)


def item_counts(config):
    config.add_route(
        'item-counts',
        '/counts'
    )

    def counts_view(request):
        response = request.response
        response.content_type = 'application/json; charset=utf-8'

        # how much stuff in database
        db_total = 0

        # how much stuff in elasticsearch (among ALL indexes)
        es = request.registry['elasticsearch']
        es_total = 0

        # find db and es counts for each index
        db_es_compare = OrderedDict()
        all_collections = list(request.registry[COLLECTIONS].by_item_type.keys())
        for collection in all_collections:
            db_count, es_count, _, _ = get_db_es_counts_and_db_uuids(request, es, collection)
            warn_str = build_warn_string(db_count, es_count)
            db_total += db_count
            es_total += es_count
            db_es_compare[collection] = ("DB: %s   ES: %s %s" %
                                         (str(db_count), str(es_count), warn_str))
        warn_str = build_warn_string(db_total, es_total)
        db_es_total = ("DB: %s   ES: %s %s" %
                       (str(db_total), str(es_total), warn_str))

        responseDict = {
            'db_es_total': db_es_total,
            'db_es_compare': db_es_compare
        }

        return responseDict

    config.add_view(counts_view, route_name='item-counts')


def health_check(config):
    """
    Emulate a lite form of Alex's static page routing
    """
    config.add_route(
        'health-check',
        '/health'
    )

    def health_page_view(request):

        response = request.response
        response.content_type = 'application/json; charset=utf-8'
        settings = request.registry.settings

        # when ontologies were imported
        try:
            si = request.embed('/sysinfos/ffsysinfo')
            ont_date = si.json['ontology_updated']
        except:  # pylint:disable
            ont_date = "Never Generated"

        app_url = request.application_url
        if not app_url.endswith('/'):
            app_url = ''.join([app_url, '/'])

        responseDict = {
            "file_upload_bucket": settings.get('file_upload_bucket'),
            "blob_bucket": settings.get('blob_bucket'),
            "system_bucket": settings.get('system_bucket'),
            "elasticsearch": settings.get('elasticsearch.server'),
            "database": settings.get('sqlalchemy.url').split('@')[1],  # don't show user /password
            "load_data": settings.get('snovault.load_test_data'),
            "beanstalk_env": settings.get('env.name'),
            'ontology_updated': ont_date,
            "@type": ["Health", "Portal"],
            "@context": "/health",
            "@id": "/health",
            "content": None,
            "display_title": "Fourfront Status and Foursight Monitoring",
        }

        return responseDict

    config.add_view(health_page_view, route_name='health-check')


def build_warn_string(db_count, es_count):
    if db_count > es_count:
        warn_str = '  < DB has %s more items >' % (str(db_count - es_count))
    elif db_count < es_count:
        warn_str = '  < ES has %s more items >' % (str(es_count - db_count))
    else:
        warn_str = ''
    return warn_str


def submissions_page(config):
    """
    Emulate a lite form of Alex's static page routing
    """
    config.add_route(
        'submissions-page',
        '/submissions'
    )
    def submissions_page_view(request):
        response = request.response
        response.content_type = 'application/json; charset=utf-8'

        responseDict = {
            "title" : "Submissions",
            "notification" : "success",
            "@type" : [ "Submissions", "Portal" ],
            "@context" : "/submissions",
            "@id" : "/submissions",
            "content" : None
        }

        return responseDict

    config.add_view(submissions_page_view, route_name='submissions-page')


def acl_from_settings(settings):
    # XXX Unsure if any of the demo instance still need this
    acl = []
    for k, v in settings.items():
        if k.startswith('allow.'):
            action = Allow
            permission = k[len('allow.'):]
            principals = v.split()
        elif k.startswith('deny.'):
            action = Deny
            permission = k[len('deny.'):]
            principals = v.split()
        else:
            continue
        if permission == 'ALL_PERMISSIONS':
            permission = ALL_PERMISSIONS
        for principal in principals:
            if principal == 'Authenticated':
                principal = Authenticated
            elif principal == 'Everyone':
                principal = Everyone
            acl.append((action, principal, permission))
    return acl


@root
class EncodedRoot(Root):
    properties = {
        'title': 'Home',
        'portal_title': '4DN Data Portal',
    }

    @reify
    def __acl__(self):
        acl = acl_from_settings(self.registry.settings) + [
            (Allow, Everyone, ['list', 'search', 'search_audit', 'audit']),
            (Allow, 'group.admin', ALL_PERMISSIONS),
            # Avoid schema validation errors during audit
            (Allow, 'remoteuser.EMBED', 'import_items'),
        ] + Root.__acl__
        return acl

    def get(self, name, default=None):
        resource = super(EncodedRoot, self).get(name, None)
        if resource is not None:
            return resource
        resource = self.connection.get_by_unique_key('page:location', name)
        if resource is not None:
            return resource
        if is_accession(name):
            resource = self.connection.get_by_unique_key('accession', name)
            if resource is not None:
                return resource
        if ':' in name:
            resource = self.connection.get_by_unique_key('alias', name)
            if resource is not None:
                return resource
        return default

    def get_by_uuid(self, uuid, default=None):
        return self.connection.get_by_uuid(uuid, default)

    def jsonld_context(self):
        '''Inherits from '@context' calculated property of Resource in snovault/resources.py'''
        return '/home'

    def jsonld_type(self):
        '''Inherits from '@type' calculated property of Root in snovault/resources.py'''
        return ['HomePage', 'StaticPage'] + super(EncodedRoot, self).jsonld_type()

    @calculated_property(schema={
        "title": "Static Page Content",
        "type": "object",
    })
    def content(self):
        '''Returns -object- with pre-named sections'''
        return_obj = {}
        try:
            contentFilesLocation = os.path.dirname(os.path.realpath(__file__))
            contentFilesLocation += "/static/data/home" # Where the static files be stored. TODO: Put in .ini file
            return_obj = { fn.split('.')[0] : get_local_file_contents(fn, contentFilesLocation) for fn in os.listdir(contentFilesLocation) if os.path.isfile(contentFilesLocation + '/' + fn) }
        except FileNotFoundError as e:
            print("No content files found for Root object (aka Home, '/').")
        # Maybe TODO: fetch announcements and add to return_obj. No request to make subrequest from?
        return return_obj

    @calculated_property(schema={
        "title": "Application version",
        "type": "string",
    })
    def app_version(self, registry):
        return registry.settings['snovault.app_version']
