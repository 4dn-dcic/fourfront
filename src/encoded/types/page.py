"""The type file for the collection Pages.  Which is used for static pages on the portal
"""
import os
import requests
from urllib.parse import (
    urlparse,
    urlencode
)
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
from .base import (
    Item,
    item_edit,
    ALLOW_CURRENT, DELETED, ALLOW_LAB_SUBMITTER_EDIT, ALLOW_VIEWING_GROUP_VIEW, ONLY_ADMIN_VIEW
)
from snovault.resource_views import item_view_page


def get_pyramid_http_exception_for_redirect_code(code):
    code_dict = {
        301 : HTTPMovedPermanently,
        302 : HTTPFound,
        303 : HTTPSeeOther,
        307 : HTTPTemporaryRedirect
    }
    return code_dict[code]


def generate_page_tree(request, page_name = None):

    current_page_route_root = None
    if page_name is not None:
        page_name_parts = [ path_component for path_component in page_name.split('/') if path_component ]
        if len(page_name_parts) > 1:
            current_page_route_root = [ path_component for path_component in page_name.split('/') if path_component ][0]

    root = { "name" : "", "children" : [], "@id" : '/', "display_title" : "Home" }

    for page in get_iterable_search_results(
        request,
        search_path='/search/',
        param_lists={
            'type'              : ['Page'],
            'sort'              : ['name', 'uuid'],
            'field'             : ['name', 'uuid', '@id', 'display_title', 'children', 'content.name', 'content.title', 'content.title', 'content.@id', 'description', 'redirect.enabled']
        }
    ):
        path_components = [ path_component for path_component in page['name'].split('/') if path_component ]
        if len(path_components) != 1:
            continue
        if current_page_route_root is not None and current_page_route_root == page['name']:
            page.update(request.embed(page['@id'], '@@embedded', as_user=True))
        child_node = {
            "name"          : path_components[0],
            "children"      : page.get('children',[]),
            "@id"           : page['@id'],
            "uuid"          : page['uuid'],
            "display_title" : page['display_title']
        }
        for optional_field in ['description', 'content', 'redirect']:
            if page.get(optional_field) is not None:
                child_node[optional_field] = page[optional_field]
        root['children'].append(child_node)

    cleanup_page_tree(root)

    return root

def cleanup_page_tree(node):
    node['@id'] = '/' + node['name']
    node['@type'] = generate_at_type_for_page(node)
    node_children_length = len(node.get('children', []))
    if node_children_length == 0:
        if node.get('children') is not None:
            del node['children']
        node['is_leaf'] = True
    else:
        node['children'] = [ c for c in node['children'] if c.get('error') is None ]
        for child in node['children']:
            cleanup_page_tree(child)
        node['children'] = [ c for c in node['children'] if ( len(c.get('children', [])) != 0 or len(c.get('content',[])) != 0) ]
        for child_idx, child in enumerate(node['children']):
            child['sibling_length'] = len(node['children'])
            child['sibling_position'] = child_idx

def generate_at_type_for_page(node):
    capitalized_path_names = [ pg.capitalize() for pg in filter(lambda pg: pg, node['@id'].split('/')) ]
    page_type = []
    capitalized_path_names_len = len(capitalized_path_names)
    for cap_idx in range(0, capitalized_path_names_len):
        typestr = ''
        for idx in range(0, capitalized_path_names_len - cap_idx):
            typestr += capitalized_path_names[idx]
        typestr += 'Page'
        page_type.append(typestr)
    if len(node.get('children',[])) > 0:
        page_type.append('DirectoryPage')
    page_type.extend(["StaticPage", "Portal"])
    return page_type

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

    request.set_property(lambda x: generate_page_tree(x, page_name), name='_static_page_tree', reify=True)
    request.set_property(lambda x: request.registry[CONNECTION].storage.get_by_unique_key('page:name', page_name), name='_static_page_model', reify=True)

    if request._static_page_model:
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

    STATUS_ACL = {
        'released': ALLOW_CURRENT,
        'archived': ALLOW_CURRENT,
        'deleted': DELETED,
        'draft': ONLY_ADMIN_VIEW,
        'released to project': ALLOW_VIEWING_GROUP_VIEW,
        'archived to project': ALLOW_VIEWING_GROUP_VIEW
    }

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
    def filetype(self, request, body=None, file=None, options=None):
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

    STATUS_ACL = StaticSection.STATUS_ACL

    class Collection(Item.Collection):
        pass

for field in ['display_title', 'name', 'description', 'content.name']:
    Page.embedded_list = Page.embedded_list + [ 'children.' + field, 'children.children.' + field, 'children.children.children.' + field ]




#### Static Page Routing/Endpoint

def static_page(request):
    '''
    basically get the page in a standard way (item_view_page) which will
    do permissions checking.  Then format the return result to be something
    the front-end expects
    '''

    def remove_relations_in_tree(node, keep="children"):
        '''Returns (deep-)copy'''
        filtered_node = { "name" : node['name'] }
        if keep == 'children' and node.get('children') is not None:
            filtered_node['children'] = [ remove_relations_in_tree(c, keep) for c in node['children'] ]
        if keep == 'parent' and node.get('parent'):
            filtered_node['parent'] = remove_relations_in_tree(node['parent'], keep)
        for field in node.keys():
            if field not in ['next', 'previous', 'children', 'parent'] and node.get(field) is not None:
                filtered_node[field] = node[field]
        return filtered_node

    path_parts = [ path_part for path_part in request.subpath if path_part ]
    page_name = "/".join(path_parts)

    tree = request._static_page_tree

    if tree is not None:

        tree = add_sibling_parent_relations_to_tree(tree)

        curr_node = tree
        page_in_tree = True
        for path_idx, part in enumerate(path_parts):
            for child in curr_node.get('children',[]):
                split_child_name = child['name'].split('/')
                if len(split_child_name) > path_idx and split_child_name[path_idx] == part:
                    curr_node = child
                    break
            if path_idx == len(path_parts) - 1 and curr_node.get('uuid') is None:
                page_in_tree = False
                break
    else:
        page_in_tree = False

    context = Page(request.registry, request._static_page_model)

    if context.properties.get('redirect') and context.properties['redirect'].get('enabled'): # We have a redirect defined.
        parsed_redirect_uri = urlparse(context.properties['redirect'].get('target', '/'))
        uri_to_use = (parsed_redirect_uri.scheme and (parsed_redirect_uri.scheme + ':') or '') + '//' if parsed_redirect_uri.netloc else ''
        uri_to_use += parsed_redirect_uri.path
        uri_to_use += '?' + urlencode({ 'redirected_from' : '/' + context.properties.get('name', str(context.uuid)) }) + ((parsed_redirect_uri.query and ('&' + parsed_redirect_uri.query)) or '')
         # Fallback to 307 as is 'safest' (response isn't cached by browsers)
        return get_pyramid_http_exception_for_redirect_code(context.properties['redirect'].get('code', 307))(location=uri_to_use, detail="Redirected from " + page_name)
    item = item_view_page(context, request)
    cleanup_page_tree(item)
    item['toc'] = item.get('table-of-contents')
    item['@context'] = item['@id']

    if page_in_tree:
        if curr_node.get('next'):
            item['next'] =      remove_relations_in_tree(curr_node['next'])
        if curr_node.get('previous'):
            item['previous'] =  remove_relations_in_tree(curr_node['previous'])
        if curr_node.get('parent'):
            item['parent'] =    remove_relations_in_tree(curr_node['parent'], keep="parent")
        if curr_node.get('sibling_length') is not None:
            item['sibling_length'] = curr_node['sibling_length']
            item['sibling_position'] = curr_node['sibling_position']

    return item
