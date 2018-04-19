"""The type file for the collection Pages.  Which is used for static pages on the portal
"""
import os
import requests
from pyramid.httpexceptions import ( # 301-307 redirect code response
    HTTPMovedPermanently,
    HTTPFound,
    HTTPSeeOther,
    HTTPTemporaryRedirect
)
from snovault import (
    calculated_property,
    collection,
    load_schema,
    COLLECTIONS,
    CONNECTION
)
from encoded.search import get_iterable_search_results
from .base import Item
from snovault.resource_views import item_view_page
from datetime import datetime, timedelta
import json


def get_pyramid_http_exception_for_redirect_code(code):
    code_dict = {
        301 : HTTPMovedPermanently,
        302 : HTTPFound,
        303 : HTTPSeeOther,
        307 : HTTPTemporaryRedirect
    }
    return code_dict[code]


def generate_page_tree(request):

    # TODO:
    # (a) Get rid of 'content' fields from search request if we don't wanna show sections in directories.

    NODE_FULL_NAME_MAPPING = {    # This is probably/possibly temporary until we create page for each node with own "order" property ?
        '/help/analysis'                : { "order" : 0 },
        '/help/user-guide'              : { "order" : 1 },
        '/help/submitter-guide'         : { "order" : 2 },
        '/help/protocols'               : { "order" : 3 },
        '/help/dcic-processes-protocols': { "order" : 4, "display_title" : "DCIC Processes & Protocols" },
        '/help/visualization'           : { "order" : 5 },
        '/help/faq'                     : { "order" : 6 },
        '/help/release-notes'           : { "order" : 7 },
    }

    root = { "name" : "/", "children" : [], "@id" : '/', "display_title" : "Home" }

    for page in get_iterable_search_results(
        request,
        search_path='/search/',
        param_lists={
            'type'              : ['Page'],
            'sort'              : ['name', 'uuid'],
            'exclude_from_tree!': ['true'],
            #'redirect.enabled!' : ['true'],
            'field'             : ['name', 'uuid', 'display_title', 'order', 'content.name', 'content.title', 'content.title', 'content.@id', 'description', 'redirect.enabled']
        }
    ):
        path_components = [ path_component for path_component in page['name'].split('/') if path_component ]
        current_node = root
        full_name = ''
        for path_component_index, path_component in enumerate(path_components):
            full_name = full_name + '/' + path_component
            child_node = None
            if path_component_index + 1 < len(path_components):
                found_child = False
                for child in current_node['children']:
                    if child['name'] == path_component:
                        child_node = child
                        found_child = True
                        break
                if not found_child:
                    child_node = {
                        "name"      : path_component,
                        "children"  : [],
                        "@id"       : full_name,
                        "order"     : -1
                    }
                    if NODE_FULL_NAME_MAPPING.get(full_name):
                        child_node.update(NODE_FULL_NAME_MAPPING[full_name])
                    current_node['children'].append(child_node)
                current_node = child_node
            else:
                child_node = {
                    "name"          : path_component,
                    "children"      : [],
                    "@id"           : full_name,
                    "order"         : page.get('order', len(current_node['children'])),
                    "uuid"          : page['uuid'],
                    "display_title" : page['display_title']
                }
                for optional_field in ['description', 'content', 'redirect']:
                    if page.get(optional_field) is not None:
                        child_node[optional_field] = page[optional_field]
                current_node['children'].append(child_node)

    def cleanup_tree(node):
        node_children_length = len(node['children'])
        #node['children'] = [ c for c in node['children'] if c.get('redirect', {}).get('enabled') is not True ]
        if node_children_length == 0 or node.get('redirect', {}).get('enabled') is True:
            del node['children']
            node['is_leaf'] = True
        else:
            node['children'].sort(key=lambda n: n.get('order', 99)) # In-place sort
            for child_idx, child in enumerate(node['children']):
                child['sibling_length'] = node_children_length
                child['sibling_position'] = child_idx
                cleanup_tree(child)
        if node.get('description') is not None:
            if not node['description']:
                del node['description']

    cleanup_tree(root)

    return root

def add_sibling_parent_relations_to_tree(node):
    '''After this is run, will not be able to use with json.dumps() due to (many) new circular relations.'''
    if len(node.get('children', [])) > 0:
        new_children = []
        for idx, child in enumerate(node.get('children', [])):
            new_child = child.copy()
            new_child['parent'] = node
            if idx > 0:
                new_child['previous'] = node['children'][idx - 1]
            if idx < len(node['children']) - 1:
                new_child['next'] = node['children'][idx + 1]
            new_children.append(add_sibling_parent_relations_to_tree(new_child))
        new_node = node.copy()
        new_node['children'] = new_children
        return new_node
    return node



def is_static_page(info, request):
    page_name = "/".join(info.get('match', {}).get('subpath'))
    if '@@' in page_name:
        return False

    path_parts = page_name.split('/')
    if path_parts[0] != "pages" and path_parts[0] in request.registry[COLLECTIONS].keys():
        return False

    request.set_property(generate_page_tree, name='page_tree', reify=True)

    curr_node = request.page_tree
    for part in path_parts:
        found_child = False
        for child in curr_node.get('children', []):
            if child['name'] == part:
                curr_node = child
                found_child = True
                break
        if not found_child:
            return False
        else:
            continue
    return True


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


def get_remote_file_contents(uri):
    resp = requests.get(uri)
    return resp.text


@collection(
    name='static-sections',
    unique_key='static_section:name',
    properties={
        'title': 'Static Sections',
        'description': 'Static Sections for the Portal',
    })
class StaticSection(Item):
    """The Software class that contains the software... used."""
    item_type = 'static_section'
    schema = load_schema('encoded:schemas/static_section.json')
    embedded_list = ["submitted_by.display_title"]

    @calculated_property(schema={
        "title": "Content",
        "description": "Content for the page",
        "type": "string"
    })
    def content(self, request, body=None, file=None):

        if isinstance(body, str) or isinstance(body, dict) or isinstance(body, list):
            # Don't need to load in anything. We don't currently support dict/json body (via schema) but could in future.
            return body

        if isinstance(file, str):
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
    def filetype(self, request, body=None, file=None, options={}):
        if options and options.get('filetype') is not None:
            return options['filetype']
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
    """Links to StaticSections"""
    item_type = 'page'
    schema = load_schema('encoded:schemas/page.json')
    embedded_list = ['content.*']

@collection(
    name='page-directories',
    properties={
        'title': 'Page Directories',
        'description': 'Directories of Pages',
    })
class PageDirectory(Page):
    """Links to Pages or other PageDirectorys"""
    item_type = 'page_directory'
    schema = load_schema('encoded:schemas/page_directory.json')
    embedded_list = ['content.*']


def static_page(request):
    '''
    basically get the page in a standard way (item_view_page) which will
    do permissions checking.  Then format the return result to be something
    the front-end expects
    '''

    def page_type_from_tree_node(node, item={}):
        capitalized_path_names = [ pg.capitalize() for pg in filter(lambda pg: pg, node['@id'].split('/')) ]
        page_type = []
        for cap_idx, cap_name in enumerate(reversed(capitalized_path_names)):
            typestr = ''
            for idx in range(0, len(capitalized_path_names) - cap_idx):
                typestr += capitalized_path_names[idx]
            typestr += 'Page'
            page_type.append(typestr)
        if len(node.get('children',[])) > 0:
            page_type.append('DirectoryPage')
        page_type.extend(["StaticPage", "Portal"])
        return page_type

    def title_from_tree_node(node):
        if node.get('display_title'):
            return node['display_title']
        else:
            return ' '.join([ substr.capitalize() for substr in node['name'].split('-')])

    def remove_relations_in_tree(node, keep="children"):
        '''Returns (deep-)copy'''
        filtered_node = { "name" : node['name'] }
        if keep == 'children' and node.get('children') is not None:
            filtered_node['children'] = [ remove_relations_in_tree(c, keep) for c in node['children'] ]
        if keep == 'parent' and node.get('parent'):
            filtered_node['parent'] = remove_relations_in_tree(node['parent'], keep)
        for field in node.keys(): #['display_title', 'order', 'uuid', 'page_sections', 'sibling_length', 'sibling_position']:
            if field not in ['next', 'previous', 'children', 'parent'] and node.get(field) is not None:
                filtered_node[field] = node[field]
        filtered_node['display_title'] = title_from_tree_node(node)
        filtered_node['@type'] = page_type_from_tree_node(node)
        return filtered_node

    def remove_nodes_with_redirects_from_tree(root_node):
        '''Modifies in place'''
        node = root_node
        filtered_children = []
        for child in node.get('children', []):
            if child.get('redirect', {}).get('enabled') is not True:
                filtered_children.append(child)
        if len(filtered_children) > 0:
            node['children'] = filtered_children
        elif node.get('children') is not None:
            del node['children']
        for child in node.get('children', []):
            remove_nodes_with_redirects_from_tree(child)

        if node.get('next', {}).get('redirect', {}).get('enabled') is True:
            if node.get('next', {}).get('next') and node.get('next', {}).get('next').get('redirect', {}).get('enabled') is not True:
                node['next'] = node['next']['next']
            else:
                del node['next']
        if node.get('previous', {}).get('redirect', {}).get('enabled') is True:
            if node.get('previous', {}).get('previous') and node.get('previous', {}).get('previous').get('redirect', {}).get('enabled') is not True:
                node['previous'] = node['previous']['previous']
            else:
                del node['previous']


    path_parts = [ path_part for path_part in request.subpath if path_part ]
    page_name = "/".join(path_parts)

    tree = add_sibling_parent_relations_to_tree(request.page_tree)
    curr_node = tree
    page_exists = True
    for path_idx, part in enumerate(path_parts):
        found_child = False
        for child in curr_node['children']:
            if child['name'] == part:
                curr_node = child
                found_child = True
                break
        if path_idx == len(path_parts) - 1 and curr_node.get('uuid') is None:
            page_exists = False
            break


    # creates SubmittingHelpPage, HelpPage, etc..
    #conn = request.registry[CONNECTION]
    # at this point we should be guaranteed to have this object, as the custom_predicate
    # should prevent this view being called with invalide pagename
    #page_in_db = conn.storage.get_by_unique_key('page:name', page_name)

    if page_exists:

        context = request.registry[COLLECTIONS]['pages'].get(curr_node['uuid'])

        if context.properties.get('redirect') and context.properties['redirect'].get('enabled'): # We have a redirect defined.
            return get_pyramid_http_exception_for_redirect_code(context.properties['redirect'].get('code', 307))( # Fallback to 307 as is 'safest' (response isn't cached by browsers)
                location=context.properties['redirect'].get('target', '/'),
                comment="Redirected from " + page_name
            )
        item = item_view_page(context, request)
        item['toc'] = item.get('table-of-contents')
    else:
        item = {
            'display_title': title_from_tree_node(curr_node),
            'content': []
        }

    # Finalize the things. Extend with common/custom properties.
    item['@id'] = item['@context'] = "/" + page_name
    item['@type'] = page_type_from_tree_node(curr_node, item)

    remove_nodes_with_redirects_from_tree(curr_node)

    #print('\n\n\n', [ (c['name'], c.get('redirect')) for c in curr_node.get('children', []) ] )

    if curr_node.get('next'):
        item['next'] =      remove_relations_in_tree(curr_node['next'])
    if curr_node.get('previous'):
        item['previous'] =  remove_relations_in_tree(curr_node['previous'])
    if curr_node.get('parent'):
        item['parent'] =    remove_relations_in_tree(curr_node['parent'], keep="parent")
    if curr_node.get('sibling_length') is not None:
        item['sibling_length'] = curr_node['sibling_length']
        item['sibling_position'] = curr_node['sibling_position']

    if curr_node.get('children'):
        item['children'] = [ remove_relations_in_tree(node) for node in curr_node['children'] ]

    return item
