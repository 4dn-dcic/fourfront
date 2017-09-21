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
from pyramid.security import (
    ALL_PERMISSIONS,
    Allow,
    Authenticated,
    Deny,
    Everyone,
)
from collections import OrderedDict


def includeme(config):
    config.include(static_pages)
    config.include(health_check)
    config.include(submissions_page)
    config.scan(__name__)


cachedFileContents = {} # Should we cache in RAM like this (?), let perform file I/O, or something else?
pageLocations = None

def get_local_file_contents(filename, directory, contentFilesLocation):
    cachedName = directory + '/' + filename.split('.')[0]
    output = cachedFileContents.get(cachedName)
    if output:
        #print("\n\n\nGot cached output for " + filename)     # Works
        return output
    file = open(contentFilesLocation + '/' + filename, encoding="utf-8")
    output = file.read()
    file.close()
    cachedFileContents[cachedName] = output
    return output

def get_remote_file_contents(uri, cached_remote_files):
    if cached_remote_files.get(uri) is not None:
        return cached_remote_files[uri]
    resp = requests.get(uri)
    cached_remote_files[uri] = resp.text
    return resp.text

def listFilesInInDirectory(dirLocation):
    return [ fn for fn in os.listdir(dirLocation) if os.path.isfile(dirLocation + '/' + fn) ]

def static_pages(config):
    '''Setup static routes & content from static files (HTML or Markdown)'''
    try:
        contentFilesLocation = os.path.dirname(os.path.realpath(__file__))
        pageLocations = json.loads(get_local_file_contents("static_pages.json", "/static/data", contentFilesLocation + "/static/data")).get('pages', {})
    except Exception as e:
        print("Error opening '" + contentFilesLocation + "/static/data/static_pages.json'")


    def static_page(request):

        page = request.matchdict.get('page','none')
        content = None
        contentFilesLocation = os.path.dirname(os.path.realpath(__file__))

        cached_remote_files = {}

        pageMeta = pageLocations.get(page, None)

        if isinstance(pageMeta, dict) and pageMeta.get('directory', None) is not None:
            contentFilesLocation += "/../.." # get us to root of Git repo.
            contentFilesLocation += pageMeta['directory']

            if pageMeta.get('sections', None) is not None:
                sections = pageMeta['sections']
            else:
                sections = [ { 'filename' : fn } for fn in listFilesInInDirectory(contentFilesLocation) ]

            # Set order (as py dicts don't maintain order)
            i = 0
            for s in sections:
                s.update(order = i)
                i += 1

            try:
                content = {}
                for s in sections:
                    sectionID = s.get('id') # use section 'id', or 'filename' minus extension ('.*')
                    if sectionID is None:
                        sectionID = s['filename'].split('.')[0]
                    if s.get('content', None) is not None: # We have content defined in JSON definition file already, skip any fetching.
                        content[sectionID] = {
                            'content' : s['content'],
                            'title'   : s.get('title', None),
                            'order'   : s['order'],
                            'filetype': 'txt'
                        }
                    else:
                        content_for_section = None
                        if s['filename'][0:4] == 'http' and '://' in s['filename'][4:8]:
                            # Remote File
                            content_for_section = get_remote_file_contents(s['filename'], cached_remote_files)
                        else:
                            content_for_section = get_local_file_contents(s['filename'], pageMeta['directory'], contentFilesLocation)
                        filenameParts = s['filename'].split('.')
                        content[sectionID] = {
                            'content' : content_for_section,
                            'title'   : s.get('title', None),
                            'order'   : s['order'],
                            'filetype': filenameParts[len(filenameParts) - 1]
                        }
                    if s.get('title', None):
                        content[sectionID]['title'] = s['title']
                    if s.get('toc-title', None):
                        content[sectionID]['toc-title'] = s['toc-title']

                    content[sectionID].update({
                        k : v for k,v in s.items() if k not in ['id', 'title', 'toc-title', 'order', 'filetype', 'filename']
                    })

            except Exception as e:
                print(e)
                print('Could not get contents from ' + contentFilesLocation)

        else:
            print("No directory set for page \"" + page + "\" in /static/data/directories.json, checking default (/static/data)")
            try:
                contentFilesLocation += "/static/data/"     # Where the static files be stored by default.
                contentFilesLocation += page
                content = { fn.split('.')[0] : get_local_file_contents(fn, page, contentFilesLocation) for fn in os.listdir(contentFilesLocation) if os.path.isfile(contentFilesLocation + '/' + fn) }
            except FileNotFoundError as e:
                print("No files found for static page: \"" + page + "\"")

        # Dummy-like 'context' JSON response
        pathParts = request.matchdict.get('page','').split('/')
        atTypes = [
            ''.join([ pgType.capitalize() for pgType in list(reversed(pathParts))[pathIndex:] ]) + 'Page' for pathIndex in range(0, len(pathParts))
        ] # creates e.g. SubmittingHelpPage, HelpPage

        response = request.response
        response.content_type = 'application/json; charset=utf-8'

        responseDict = {
            "title" : (isinstance(pageMeta, dict) and pageMeta.get('title')) or request.matchdict.get('page','').capitalize(),
            "notification" : "success",
            "@type" : atTypes + [ "StaticPage", "Portal" ],
            "@context" : "/" + request.matchdict.get('page','static-pages'),
            "@id" : "/" + request.matchdict.get('page',''),
            "content" : content
        }

        if isinstance(pageMeta, dict) and pageMeta.get('table-of-contents'):
            responseDict['toc'] = pageMeta['table-of-contents']

        return responseDict

    # Add 'effective_principals' kwarg if page definition has permissions.
    for num, key in enumerate(pageLocations.keys()):
        principals = None # Should this be a list instd of None and then we just + to it when encounter in config JSON?
        if isinstance(pageLocations[key], dict) and isinstance(pageLocations[key].get('permissions'), list):
            principals = pageLocations[key]['permissions']
        config.add_route(
            'static-page' + str(num),
            '/{page:' + escape(key) + '}',
            effective_principals=principals,
        )

        config.add_view(static_page, route_name='static-page' + str(num))


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

        # when ontologies were imported
        try:
            si =  request.embed('/sysinfos/ffsysinfo')
            ont_date = si.json['ontology_updated']
        except:  # pylint:disable
            ont_date = "Never Generated"

        responseDict = {
            "file_upload_bucket" : settings.get('file_upload_bucket'),
            "blob_bucket" : settings.get('blob_bucket'),
            "system_bucket" : settings.get('system_bucket'),
            "elasticsearch" : settings.get('elasticsearch.server'),
            "database" : settings.get('sqlalchemy.url').split('@')[1],  # don't show user /password
            "load_data": settings.get('snovault.load_test_data'),
            'ontology_updated': ont_date,
            "@type" : [ "Health", "Portal" ],
            "@context" : "/health",
            "@id" : "/health",
            "content" : None,
            "display_title" : "Health Status",
            'db_es_total': db_es_total,
            'db_es_compare': db_es_compare
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
        try:
            contentFilesLocation = os.path.dirname(os.path.realpath(__file__))
            contentFilesLocation += "/static/data/home" # Where the static files be stored. TODO: Put in .ini file
            return { fn.split('.')[0] : get_local_file_contents(fn, 'home', contentFilesLocation) for fn in os.listdir(contentFilesLocation) if os.path.isfile(contentFilesLocation + '/' + fn) }
        except FileNotFoundError as e:
            print("No content files found for Root object (aka Home, '/').")
            return {}

    @calculated_property(schema={
        "title": "Application version",
        "type": "string",
    })
    def app_version(self, registry):
        return registry.settings['snovault.app_version']
