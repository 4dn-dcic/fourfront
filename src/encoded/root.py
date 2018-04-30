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
from snovault.interfaces import STORAGE
from snovault.fourfront_utils import get_jsonld_types_from_collection_type
from .schema_formats import is_accession
from .search import make_search_subreq
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
    config.include(run_workflow)
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
        # some collections may need to be adjusted because they also contain child counts
        to_subtract = {}
        # find db and es counts for each index
        db_es_counts = OrderedDict()
        db_es_compare = OrderedDict()
        es_counts = {} # keyed by uppercase Item name, such as "ExperimentHic"
        # need to search both status=deleted and status!=deleted (which is now
        # done by default) to get real totals.
        search_req = make_search_subreq(request, '/search/?type=Item&limit=1&status!=deleted')
        search_resp = request.invoke_subrequest(search_req, True)
        if search_resp.status_int < 400: # catch errors
            es_count_facets = [facet for facet in search_resp.json.get('facets', []) if facet.get('field') == 'type']
            if len(es_count_facets) > 0:
                es_count_facets = es_count_facets[0]
                for term in es_count_facets.get('terms'):
                    es_counts[term['key']] = term['doc_count']
        search_req_del = make_search_subreq(request, '/search/?type=Item&limit=1&status=deleted')
        search_resp_del = request.invoke_subrequest(search_req_del, True)
        if search_resp_del.status_int < 400: # catch errors
            es_count_facets = [facet for facet in search_resp_del.json.get('facets', []) if facet.get('field') == 'type']
            if len(es_count_facets) > 0:
                es_count_facets = es_count_facets[0]
                for term in es_count_facets.get('terms'):
                    if term['key'] in es_counts:
                        es_counts[term['key']] += term['doc_count']
                    else:
                        es_counts[term['key']] = term['doc_count']
        for coll_name, collection in request.registry[COLLECTIONS].by_item_type.items():
            db_count = request.registry[STORAGE].write.__len__(coll_name)
            item_name = collection.type_info.name
            # check to see if this collection contains child collections
            check_collections = get_jsonld_types_from_collection_type(request, coll_name, [coll_name])
            to_subtract[coll_name] = [coll for coll in check_collections if coll != coll_name]
            es_count = es_counts.get(item_name, 0)
            db_es_counts[coll_name] = [db_count, es_count] # order is important
        for coll in db_es_counts:
            coll_db_count, coll_es_count = db_es_counts[coll]
            subtract_colls = to_subtract.get(coll)
            if subtract_colls and isinstance(subtract_colls, list):
                for sub_coll in subtract_colls:
                    coll_es_count -= db_es_counts[sub_coll][1]
            db_total += coll_db_count
            es_total += coll_es_count
            warn_str = build_warn_string(coll_db_count, coll_es_count)
            db_es_compare[coll] = ("DB: %s   ES: %s %s" %
                                         (str(coll_db_count), str(coll_es_count), warn_str))
        warn_str = build_warn_string(db_total, es_total)
        db_es_total = ("DB: %s   ES: %s %s" %
                       (str(db_total), str(es_total), warn_str))
        responseDict = {
            'db_es_total': db_es_total,
            'db_es_compare': db_es_compare
        }

        return responseDict

    config.add_view(counts_view, route_name='item-counts')


def run_workflow(config):
    """
    Emulate a lite form of Alex's static page routing
    """
    config.add_route(
        'run-workflow',
        '/runworkflow'
    )

    def run_workflow_view(request):

        response = request.response
        response.content_type = 'application/json; charset=utf-8'
        settings = request.registry.settings
        print(settings)

        responseDict = {'msg': "thanks"}
        return responseDict

    config.add_view(run_workflow_view, route_name='run-workflow', permission='add')


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
            "processed_file_bucket": settings.get('file_wfout_bucket'),
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
        "type": "object"
    })
    def content(self, request):
        '''Returns -object- with pre-named sections'''
        #sections_to_get = ['home.introduction']
        #url_to_request = '/search/?type=StaticSection&' + '&'.join([ 'name=' + s for s in sections_to_get])
        #url_to_request = '/static-sections/home.introduction/@@embedded'
        return request.embed('/static-sections/home.introduction', '@@embedded', as_user=True).get('@graph', [])

    @calculated_property(schema={
        "title": "Application version",
        "type": "string",
    })
    def app_version(self, registry):
        return registry.settings['snovault.app_version']
