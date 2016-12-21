import os
from pyramid.decorator import reify
from snovault import (
    Root,
    calculated_property,
    root,
)
from .schema_formats import is_accession
from pyramid.security import (
    ALL_PERMISSIONS,
    Allow,
    Authenticated,
    Deny,
    Everyone,
)


def includeme(config):
    config.include(static_pages)
    config.scan(__name__)


cachedFileContents = {} # Should we cache in RAM like this (?), let perform file I/O, or something else?

def getStaticFileContent(filename, directory, contentFilesLocation):
    cachedName = directory + '/' + filename.split('.')[0]
    output = cachedFileContents.get(cachedName)
    if output:
        #print("\n\n\nGot cached output for " + filename)     # Works
        return output
    file = open(contentFilesLocation + '/' + filename)
    output = file.read()
    file.close()
    cachedFileContents[cachedName] = output
    return output

def static_pages(config):
    '''Setup static routes & content from static files (HTML or TODO: Markdown)'''
    config.add_route('static-page', '/{page:(help|about|home)}') # TODO: put array of static pages into ini or yaml file?
    def static_page(request):

        page = request.matchdict.get('page','none')
        content = None
        try:
            contentFilesLocation = os.path.dirname(os.path.realpath(__file__))
            contentFilesLocation += "/static/data/"     # Where the static files be stored.
            contentFilesLocation += page
            content = { fn.split('.')[0] : getStaticFileContent(fn, page, contentFilesLocation) for fn in os.listdir(contentFilesLocation) if os.path.isfile(contentFilesLocation + '/' + fn) }
        except FileNotFoundError as e:
            print("No files found for static page: \"" + page + "\"")

        return { # Dummy-like 'context' JSON response 
            "title" : request.matchdict.get('page','').capitalize(),
            "notification" : "success",
            "@type" : [
                request.matchdict.get('page','').capitalize() + "Page", # e.g. AboutPage
                "StaticPage",
                "Portal"
            ],
            "@context" : "/" + request.matchdict.get('page','static-pages'),
            "@id" : "/" + request.matchdict.get('page',''),
            "content" : content
        }

    config.add_view(static_page, route_name='static-page')


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
            return { fn.split('.')[0] : getStaticFileContent(fn, 'home', contentFilesLocation) for fn in os.listdir(contentFilesLocation) if os.path.isfile(contentFilesLocation + '/' + fn) }
        except FileNotFoundError as e:
            print("No content files found for Root object (aka Home, '/').")
            return {}

    @calculated_property(schema={
        "title": "Application version",
        "type": "string",
    })
    def app_version(self, registry):
        return registry.settings['snovault.app_version']
