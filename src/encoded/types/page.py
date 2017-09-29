"""The type file for the collection Pages.  Which is used for static pages on the portal

"""
import os
import requests
from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)


def listFilesInInDirectory(dirLocation):
    return [fn for fn in os.listdir(dirLocation) if os.path.isfile(dirLocation + '/' + fn)]


def get_local_file_contents(filename, directory, contentFilesLocation):
    file = open(contentFilesLocation + '/' + filename, encoding="utf-8")
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
        contentFilesLocation = os.path.dirname(os.path.realpath(__file__))

        cached_remote_files = {}

        pageMeta = self.properties

        if pageMeta.get('directory', None) is not None:
            contentFilesLocation += "/../../.."  # get us to root of Git repo.
            contentFilesLocation += pageMeta['directory']

            if pageMeta.get('sections', None) is not None:
                sections = pageMeta['sections']
            else:
                sections = [{'filename': fn} for fn in listFilesInInDirectory(contentFilesLocation)]

            # Set order (as py dicts don't maintain order)
            i = 0
            for s in sections:
                s.update(order=i)
                i += 1

            try:
                content = {}
                for s in sections:
                    sectionID = s.get('id')  # use section 'id', or 'filename' minus extension
                    if sectionID is None:
                        sectionID = s['filename'].split('.')[0]
                    # We have content defined in JSON definition file already, skip any fetching.
                    if s.get('content', None) is not None:
                        content[sectionID] = {
                            'content': s['content'],
                            'title': s.get('title', None),
                            'order': s['order'],
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
                                s['filename'], pageMeta['directory'], contentFilesLocation)
                        filenameParts = s['filename'].split('.')
                        content[sectionID] = {
                            'content': content_for_section,
                            'title': s.get('title', None),
                            'order': s['order'],
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

            except Exception as e:
                print(e)
                print('Could not get contents from ' + contentFilesLocation)

        else:
            print("No directory set for page \"" + page + "\" in /static/data/directories.json, checking default (/static/data)")
            try:
                # Where the static files be stored by default.
                contentFilesLocation += "/static/data/"
                contentFilesLocation += page
                content = {fn.split('.')[0]: get_local_file_contents(fn, page, contentFilesLocation)
                           for fn in os.listdir(contentFilesLocation)
                           if os.path.isfile(contentFilesLocation + '/' + fn)}
            except FileNotFoundError as e:
                print("No files found for static page: \"" + page + "\"")

        return content
