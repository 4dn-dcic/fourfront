"""
The type file for the collection Pages.  Which is used for static pages on the portal
"""

from dcicutils.misc_utils import filtered_warnings
from pyramid.httpexceptions import ( # 301-307 redirect code response
    HTTPMovedPermanently,
    HTTPFound,
    HTTPSeeOther,
    HTTPTemporaryRedirect
)
from pyramid.view import view_config
from snovault import collection, load_schema, COLLECTIONS, CONNECTION
from snovault.crud_views import collection_add, item_edit
from snovault.resource_views import item_view_page
from snovault.util import debug_log
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch,
    validate_item_content_in_place,
    no_validate_item_content_post,
    no_validate_item_content_put,
    no_validate_item_content_patch
)
from urllib.parse import urlparse, urlencode
from ..search import get_iterable_search_results
from .base import Item, ALLOW_CURRENT_ACL, DELETED_ACL, ALLOW_LAB_SUBMITTER_EDIT_ACL, ALLOW_VIEWING_GROUP_VIEW_ACL, ONLY_ADMIN_VIEW_ACL
from .user_content import StaticSection


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
    """ Re-ified property on all static pages - note that get_by_json can be expensive on small ES clusters. """
    page_name = "/".join(info.get('match', {}).get('subpath'))
    if '@@' in page_name:
        return False

    path_parts = page_name.split('/')
    if path_parts[0] != "pages" and path_parts[0] in request.registry[COLLECTIONS].keys():
        return False

    request.set_property(lambda x: generate_page_tree(x, page_name), name='_static_page_tree', reify=True)
    request.set_property(lambda x: request.registry[CONNECTION].storage.get_by_json('name', page_name, 'page'), name='_static_page_model', reify=True)

    if request._static_page_model:
        return True
    else:
        return False


def includeme(config):
    with filtered_warnings("ignore", category=DeprecationWarning):
        config.add_route(
            'staticpage',
            '/*subpath',
            # TODO: Replace custom_predicates=[is_static_page] with something more modern.
            # The custom_predicates needs to be rewritten.
            # Although there is a complex rewrite using .add_route_predicate,
            # the simpler case of just using .add_static_view may bypass a lot of complexity.
            # But this needs more study to get right. For now this code will work and
            # we're just going to suppress the warning.  -kmp 16-May-2020
            # Refs:
            #  - https://stackoverflow.com/questions/30102767/custom-route-predicates-in-pyramid
            #  - https://docs.pylonsproject.org/projects/pyramid/en/latest/_modules/pyramid/config/routes.html
            #  - https://docs.pylonsproject.org/projects/pyramid/en/master/narr/hooks.html#view-and-route-predicates
            #  - https://docs.pylonsproject.org/projects/pyramid/en/latest/api/config.html
            custom_predicates=[is_static_page],
            request_method="GET"
        )
    config.add_view(static_page, route_name='staticpage')


@collection(
    name='pages',
    lookup_key='name',
    properties={
        'title': 'Pages',
        'description': 'Static Pages for the Portal',
    })
class Page(Item):
    """Links to StaticSections"""
    item_type = 'page'
    schema = load_schema('encoded:schemas/page.json')
    embedded_list = [
        # StaticSection linkTo
        'content.*'
    ]

    STATUS_ACL = StaticSection.STATUS_ACL

    class Collection(Item.Collection):
        pass


# XXX: Unclear what/why the intended effect is here... - Will 2/10/21
for field in ['display_title', 'name', 'description', 'content.name']:
    Page.embedded_list = Page.embedded_list + [
        'children.' + field, 'children.children.' + field, 'children.children.children.' + field
    ]


#### Must add validators for add/edit since 'name' path is now lookup_key, not unique_key


def validate_unique_page_name(context, request):
    '''validator to ensure page 'name' lookup_key is unique
    '''
    data = request.json
    # name is required; validate_item_content_post/put/patch will handle missing field
    if 'name' in data:
        lookup_res = request.registry[CONNECTION].storage.get_by_json('name', data['name'], 'page')
        if lookup_res:
            # check_only + POST happens on GUI edit; we cannot confirm if found
            # item is the same item. Let the PATCH take care of validation
            if request.method == 'POST' and request.params.get('check_only', False):
                return
            # editing an item will cause it to find itself. That's okay
            if hasattr(context, 'uuid') and getattr(lookup_res, 'uuid', None) == context.uuid:
                return
            error_msg = ("page %s already exists with name '%s'. This field must be unique"
                         % (lookup_res.uuid, data['name']))
            request.errors.add('body', 'Page: non-unique name',  error_msg)
            return


@view_config(context=Page.Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post, validate_unique_page_name])
@view_config(context=Page.Collection, permission='add_unvalidated', request_method='POST',
             validators=[no_validate_item_content_post],
             request_param=['validate=false'])
@debug_log
def page_add(context, request, render=None):
    return collection_add(context, request, render)


@view_config(context=Page, permission='edit', request_method='PUT',
             validators=[validate_item_content_put, validate_unique_page_name])
@view_config(context=Page, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch, validate_unique_page_name])
@view_config(context=Page, permission='edit_unvalidated', request_method='PUT',
             validators=[no_validate_item_content_put],
             request_param=['validate=false'])
@view_config(context=Page, permission='edit_unvalidated', request_method='PATCH',
             validators=[no_validate_item_content_patch],
             request_param=['validate=false'])
@view_config(context=Page, permission='index', request_method='GET',
             validators=[validate_item_content_in_place, validate_unique_page_name],
             request_param=['check_only=true'])
@debug_log
def page_edit(context, request, render=None):
    return item_edit(context, request, render)


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
