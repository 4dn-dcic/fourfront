"""The type file for the collection Pages.  Which is used for static pages on the portal
"""
import os
import requests
from snovault import (
    calculated_property,
    collection,
    load_schema,
    COLLECTIONS,
    CONNECTION
)
from .base import (
    Item
)

from snovault.resource_views import item_view_page


def is_static_page(info, request):
    page_name = "/".join(info.get('match', {}).get('subpath'))
    if '@@' in page_name:
        return False

    col = request.registry[COLLECTIONS]
    page_start = page_name.split('/')[0]
    if page_start != "pages" and page_start in col.keys():
        return False

    # TODO: we could cache this to remove extraneous db requests
    conn = request.registry[CONNECTION]

    if conn.storage.get_by_unique_key('page:name', page_name):
        return True
    else:
        return False


def includeme(config):
    config.add_route(
        'staticpage',
        '/*subpath',
        custom_predicates=[is_static_page],
        request_method="GET"
    )
    config.add_view(static_page, route_name='staticpage')


def listFilesInInDirectory(dirLocation):
    return [fn for fn in os.listdir(dirLocation) if os.path.isfile(dirLocation + '/' + fn)]


def get_local_file_contents(filename, contentFilesLocation=None):
    if contentFilesLocation is None:
        full_file_path = filename
    else:
        full_file_path = contentFilesLocation + '/' + filename
    if not os.path.isfile(full_file_path):
        return None
    file = open(full_file_path, encoding="utf-8")
    output = file.read()
    file.close()
    return output


def get_remote_file_contents(uri, cached_remote_files={}):
    if cached_remote_files.get(uri) is not None:
        return cached_remote_files[uri]
    resp = requests.get(uri)
    cached_remote_files[uri] = resp.text
    return resp.text


@collection(
    name='static-sections',
    lookup_key='name',
    properties={
        'title': 'Static Sections',
        'description': 'Static Sections for the Portal',
    })
class StaticSection(Item):
    """The Software class that contains the software... used."""
    item_type = 'static_section'
    schema = load_schema('encoded:schemas/static_section.json')
    embedded_list = []

    @calculated_property(schema={
        "title": "Content",
        "description": "Content for the page",
        "type": "any"
    })
    def content(self, request, body=None, file=None):

        if isinstance(body, str) or isinstance(body, dict) or isinstance(body, list):
            # Don't need to load in anything. We don't currently support dict/json body (via schema) but could in future.
            return body

        if isinstance(file, str):
            content = None
            if file[0:4] == 'http' and '://' in file[4:8]:  # Remote File
                return get_remote_file_contents(file)
            else:                                           # Local File
                file_path = os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + "/../../.." + file)   # Go to top of repo, append file
                return get_local_file_contents(file_path)

        return None

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of file used for content",
        "type": "string"
    })
    def filetype(self, request, body=None, file=None):
        if isinstance(body, str):
            return 'txt'
        if isinstance(body, dict) or isinstance(body, list):
            return 'json'
        if isinstance(file, str):
            filename_parts = file.split('.')
            if len(filename_parts) > 1:
                return filename_parts[len(filename_parts) - 1]
            else:
                return 'txt' # Default if no file extension.
        return None




@collection(
    name='pages',
    properties={
        'title': 'Pages',
        'description': 'Static Pages for the Portal',
    })
class Page(Item):
    """The Software class that contains the software... used."""
    item_type = 'page'
    schema = load_schema('encoded:schemas/page.json')
    embedded_list = ['content.*']


def static_page(request):
    '''
    basically get the page in a standard way (item_view_page) which will
    do permissions checking.  Then format the return result to be something
    the front-end expects
    '''

    page_name = "/".join(request.subpath)
    caps_list = list(reversed(request.subpath))
    pageType = ([pg.capitalize() + "Page" for pg in caps_list])
    pageType.extend(["StaticPage", "Portal"])

    # creates SubmittingHelpPage, HelpPage, etc..
    conn = request.registry[CONNECTION]
    # at this point we should be guaranteed to have this object, as the custom_predicate
    # should prevent this view being called with invalide pagename
    page_in_db = conn.storage.get_by_unique_key('page:name', page_name)

    context = request.registry[COLLECTIONS]['pages'].get(page_in_db.uuid)
    item = item_view_page(context, request)
    item['@id'] = "/" + page_name
    item['@context'] = "/" + page_name
    item['@type'] = pageType
    item['toc'] = item.get('table-of-contents')

    return item
