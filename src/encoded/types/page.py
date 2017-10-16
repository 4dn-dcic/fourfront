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


def get_local_file_contents(filename, contentFilesLocation):
    full_file_path = contentFilesLocation + '/' + filename
    if not os.path.isfile(full_file_path):
        return None
    file = open(full_file_path, encoding="utf-8")
    output = file.read()
    file.close()
    return output


def get_remote_file_contents(uri, cached_remote_files):
    if cached_remote_files.get(uri) is not None:
        return cached_remote_files[uri]
    resp = requests.get(uri)
    cached_remote_files[uri] = resp.text
    return resp.text


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
    embedded_list = []

    @calculated_property(schema={
        "title": "Content",
        "description": "Content for the page",
        "type": "object",
    })
    def content(self, request):
        page = self.properties.get('name', None)
        content = None
        contentFilesLocation = None #os.path.dirname(os.path.realpath(__file__))

        cached_remote_files = {}

        pageMeta = self.properties

        content = {}
        sections = None
        if pageMeta.get('sections', None) is not None:
            sections = pageMeta['sections']



        if pageMeta.get('directory'):
            contentFilesLocation = os.path.dirname(os.path.realpath(__file__))
            contentFilesLocation += "/../../.."  # get us to root of Git repo.
            contentFilesLocation += pageMeta['directory']
        else:
            print("No explicit directory set for page with pathname \"" + page + "\", will check default directory location (/static/data/<pathname>) for sections with filenames")
            contentFilesLocation = os.path.dirname(os.path.realpath(__file__))
            contentFilesLocation += "/static/data/"
            contentFilesLocation += page

        if sections is None and contentFilesLocation is not None and os.path.isdir(contentFilesLocation):
            print("No explicity-defined sections for page " + page + ', attempting to use filenames from this directory as sections: ' + contentFilesLocation)
            sections = [{'filename': fn} for fn in listFilesInInDirectory(contentFilesLocation)]

        if sections is None:
            print("No sections nor local directory of files defined for page " + page + ', CANCELLING - NO CONTENT WILL BE AVAILABLE FOR PAGE')
            return None

        # Set order (dicts don't maintain order)
        i = 0

        try:
            for s in sections:
                sectionID = s.get('id')  # use section 'id', or 'filename' minus extension
                if sectionID is None:
                    sectionID = s['filename'].split('.')[0]
                # We have content defined in JSON definition file already, skip any fetching.
                if s.get('content', None) is not None:
                    content[sectionID] = {
                        'content': s['content'],
                        'title': s.get('title', None),
                        'filetype': 'txt'
                    }
                else:
                    content_for_section = None
                    if s['filename'][0:4] == 'http' and '://' in s['filename'][4:8]:
                        # Remote File
                        content_for_section = get_remote_file_contents(
                            s['filename'], cached_remote_files)
                    else:
                        content_for_section = get_local_file_contents(
                            s['filename'], contentFilesLocation)
                    filenameParts = s['filename'].split('.')
                    content[sectionID] = {
                        'content': content_for_section,
                        'title': s.get('title', None),
                        'filetype': filenameParts[len(filenameParts) - 1]
                    }
                if s.get('title', None):
                    content[sectionID]['title'] = s['title']
                if s.get('toc-title', None):
                    content[sectionID]['toc-title'] = s['toc-title']

                content[sectionID].update({
                    k: v for k, v in s.items() if k not in [
                        'id', 'title', 'toc-title', 'order', 'filetype', 'filename']
                })

                content[sectionID]["order"] = i
                i += 1

        except Exception as e:
            print(e)
            print('Could not get contents for ' + page)

        return content


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
