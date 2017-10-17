"""base class creation for all the schemas that exist."""
from functools import lru_cache
from pyramid.view import (
    view_config,
)
from pyramid.security import (
    # ALL_PERMISSIONS,
    Allow,
    Authenticated,
    Deny,
    # DENY_ALL,
    Everyone,
)
from pyramid.traversal import (
    find_root,
    traverse,
)
from pyramid.threadlocal import get_current_request
import snovault
# from ..schema_formats import is_accession
# import snovalut default post / patch stuff so we can overwrite it in this file
from snovault.crud_views import collection_add as sno_collection_add
from snovault.crud_views import item_edit as sno_item_edit
from snovault.fourfront_utils import add_default_embeds
from snovault.authentication import calc_principals
from snovault.validators import (
    validate_item_content_post,
    validate_item_content_put,
    validate_item_content_patch
)
from snovault.interfaces import CONNECTION
from snovault.etag import if_match_tid


@lru_cache()
def _award_viewing_group(award_uuid, root):
    award = root.get_by_uuid(award_uuid)
    return award.upgrade_properties().get('viewing_group')


# Item acls
ONLY_ADMIN_VIEW = [
    (Allow, 'group.admin', ['view', 'edit']),
    (Allow, 'group.read-only-admin', ['view']),
    (Allow, 'remoteuser.INDEXER', ['view']),
    (Allow, 'remoteuser.EMBED', ['view']),
    (Deny, Everyone, ['view', 'edit'])
]

# This acl allows item creation; it is easily overwritten in lab and user,
# as these items should not be available for creation
SUBMITTER_CREATE = [
    (Allow, 'group.submitter', 'create'),
]

ALLOW_EVERYONE_VIEW = [
    (Allow, Everyone, 'view'),
] + ONLY_ADMIN_VIEW + SUBMITTER_CREATE

ALLOW_LAB_MEMBER_VIEW = [
    (Allow, 'role.lab_member', 'view'),
] + ONLY_ADMIN_VIEW + SUBMITTER_CREATE

ALLOW_VIEWING_GROUP_VIEW = [
    (Allow, 'role.viewing_group_member', 'view'),
] + ONLY_ADMIN_VIEW + SUBMITTER_CREATE

ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT = [
    (Allow, 'role.viewing_group_member', 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
] + ALLOW_LAB_MEMBER_VIEW

ALLOW_LAB_SUBMITTER_EDIT = [
    (Allow, 'role.lab_member', 'view'),
    (Allow, 'role.award_member', 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
] + ONLY_ADMIN_VIEW + SUBMITTER_CREATE

ALLOW_CURRENT_AND_SUBMITTER_EDIT = [
    (Allow, Everyone, 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
] + ONLY_ADMIN_VIEW + SUBMITTER_CREATE

ALLOW_CURRENT = [
    (Allow, Everyone, 'view'),
] + ONLY_ADMIN_VIEW + SUBMITTER_CREATE

DELETED = [
    (Deny, Everyone, 'visible_for_edit')
] + ONLY_ADMIN_VIEW

# Collection acls

ALLOW_SUBMITTER_ADD = [
    (Allow, 'group.submitter', ['add']),
] + SUBMITTER_CREATE


def paths_filtered_by_status(request, paths, exclude=('deleted', 'replaced'), include=None):
    """filter out status that shouldn't be visible.
    Also convert path to str as functions like rev_links return uuids"""
    if include is not None:
        return [
            path for path in paths
            if traverse(request.root, str(path))['context'].__json__(request).get('status') in include
        ]
    else:
        return [
            path for path in paths
            if traverse(request.root, str(path))['context'].__json__(request).get('status') not in exclude
        ]


def get_item_if_you_can(request, value, itype=None):
    # import pdb; pdb.set_trace()
    try:
        value.get('uuid')
        return value
    except AttributeError:
        svalue = str(value)
        if not svalue.startswith('/'):
            svalue = '/' + svalue
        try:
            item = request.embed(svalue, '@@object')
        except:
            pass
        else:
            try:
                item.get('uuid')
                return item
            except AttributeError:
                pass
        if itype is not None:
            svalue = '/' + itype + svalue + '/?datastore=database'
            try:
                return request.embed(svalue, '@@object')
            except:
                return value


class AbstractCollection(snovault.AbstractCollection):
    """smth."""

    def __init__(self, *args, **kw):
        try:
            self.lookup_key = kw.pop('lookup_key')
        except KeyError:
            pass
        super(AbstractCollection, self).__init__(*args, **kw)

    def get(self, name, default=None):
        '''
        heres' and example of why this is the way it is:
        ontology terms have uuid or term_id as unique ID keys
        and if neither of those are included in post, try to
        use term_name such that:
        No - fail load with non-existing term message
        Multiple - fail load with ‘ambiguous name - more than 1 term with that name exist use ID’
        Single result - get uuid and use that for post/patch
        '''
        resource = super(AbstractCollection, self).get(name, None)
        if resource is not None:
            return resource
        if ':' in name:
            resource = self.connection.get_by_unique_key('alias', name)
            if resource is not None:
                if not self._allow_contained(resource):
                    return default
                return resource
        if getattr(self, 'lookup_key', None) is not None:
            # lookup key translates to query json by key / value and return if only one of the
            # item type was found... so for keys that are mostly unique, but do to whatever
            # reason (bad data mainly..) can be defined as unique keys
            item_type = self.type_info.item_type
            resource = self.connection.get_by_json(self.lookup_key, name, item_type)
            if resource is not None:
                if not self._allow_contained(resource):
                    return default
                return resource
        return default


class Collection(snovault.Collection, AbstractCollection):
    """smth."""

    def __init__(self, *args, **kw):
        """smth."""
        super(Collection, self).__init__(*args, **kw)
        if hasattr(self, '__acl__'):
            return
        # XXX collections should be setup after all types are registered.
        # Don't access type_info.schema here as that precaches calculated schema too early.
        if 'lab' in self.type_info.factory.schema['properties']:
            self.__acl__ = ALLOW_SUBMITTER_ADD


@view_config(context=Collection, permission='add', request_method='POST',
             validators=[validate_item_content_post])
def collection_add(context, request, render=None):
    check_only = request.params.get('check_only', False)

    if check_only:
        return {'status': "success",
                '@type': ['result'],
                }

    return sno_collection_add(context, request, render)


@view_config(context=snovault.Item, permission='edit', request_method='PUT',
             validators=[validate_item_content_put], decorator=if_match_tid)
@view_config(context=snovault.Item, permission='edit', request_method='PATCH',
             validators=[validate_item_content_patch], decorator=if_match_tid)
def item_edit(context, request, render=None):
    check_only = request.params.get('check_only', False)

    if check_only:
        return {'status': "success",
                '@type': ['result'],
                }
    return sno_item_edit(context, request, render)


class Item(snovault.Item):
    """smth."""

    AbstractCollection = AbstractCollection
    Collection = Collection
    STATUS_ACL = {
        # standard_status
        'released': ALLOW_CURRENT,
        'current': ALLOW_CURRENT,
        'revoked': ALLOW_CURRENT,
        'deleted': DELETED,
        'replaced': DELETED,
        'planned': ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT,
        'in review by lab': ALLOW_LAB_SUBMITTER_EDIT,
        'submission in progress': ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT,
        'released to project': ALLOW_VIEWING_GROUP_VIEW,
        # for file
        'obsolete': DELETED,
        'uploading': ALLOW_LAB_SUBMITTER_EDIT,
        'to be uploaded by workflow': ALLOW_LAB_SUBMITTER_EDIT,
        'uploaded': ALLOW_LAB_SUBMITTER_EDIT,
        'upload failed': ALLOW_LAB_SUBMITTER_EDIT,

        # publication
        'published': ALLOW_CURRENT,
    }

    def __init__(self, registry, models):
        super().__init__(registry, models)
        self.STATUS_ACL = self.__class__.STATUS_ACL

    @property
    def __name__(self):
        """smth."""
        if self.name_key is None:
            return self.uuid
        properties = self.upgrade_properties()
        if properties.get('status') == 'replaced':
            return self.uuid
        return properties.get(self.name_key, None) or self.uuid

    def __acl__(self):
        """smth."""
        # Don't finalize to avoid validation here.
        properties = self.upgrade_properties().copy()
        status = properties.get('status')
        return self.STATUS_ACL.get(status, ALLOW_LAB_SUBMITTER_EDIT)

    def __ac_local_roles__(self):
        """this creates roles based on properties of the object being acccessed"""
        roles = {}
        properties = self.upgrade_properties().copy()
        if 'lab' in properties:
            lab_submitters = 'submits_for.%s' % properties['lab']
            roles[lab_submitters] = 'role.lab_submitter'
            # add lab_member as well
            lab_member = 'lab.%s' % properties['lab']
            roles[lab_member] = 'role.lab_member'
        if 'award' in properties:
            viewing_group = _award_viewing_group(properties['award'], find_root(self))
            if viewing_group is not None:
                viewing_group_members = 'viewing_group.%s' % viewing_group
                roles[viewing_group_members] = 'role.viewing_group_member'
                award_group_members = 'award.%s' % properties['award']
                roles[award_group_members] = 'role.award_member'
        return roles

    def add_accession_to_title(self, title):
        if self.properties.get('accession') is not None:
            return title + ' - ' + self.properties.get('accession')
        return title

    def unique_keys(self, properties):
        """smth."""
        keys = super(Item, self).unique_keys(properties)
        if 'accession' not in self.schema['properties']:
            return keys
        keys.setdefault('accession', []).extend(properties.get('alternate_accessions', []))
        if properties.get('status') != 'replaced' and 'accession' in properties:
            keys['accession'].append(properties['accession'])
        return keys

    def is_update_by_admin_user(self):
        # determine if the submitter in the properties is an admin user
        request = get_current_request()
        _, userid = request.unauthenticated_userid.split('.')
        users = self.registry['collections']['User']
        user = users.get(userid)
        if 'groups' in user.properties:
            if 'admin' in user.properties['groups']:
                return True
        return False

    def _update(self, properties, sheets=None):
        # if an item is status 'planned' and an update is submitted
        # by a non-admin user then status should be changed to 'submission in progress'
        try:
            props = self.properties
            if 'status' in props and props['status'] == 'planned':
                if not self.is_update_by_admin_user():
                    properties['status'] = 'submission in progress'
        except KeyError:
            pass
        super(Item, self)._update(properties, sheets)

    @snovault.calculated_property(schema={
        "title": "External Reference URIs",
        "description": "External references to this item.",
        "type": "array",
        "items": {
            "type": "object", "title": "External Reference", "properties": {
                "uri": {"type": "string"},
                "ref": {"type": "string"}
            }
        }
    })
    def external_references(self, request, dbxrefs=None):
        namespaces = request.registry.settings.get('snovault.jsonld.namespaces')
        if dbxrefs and namespaces:
            refs = []
            for r in dbxrefs:
                refObject = {"ref": r, "uri": None}
                refParts = r.split(':')
                if len(refParts) < 2:
                    refs.append(refObject)
                    continue
                refPrefix = refParts[0]
                refID = refParts[1]
                baseUri = namespaces.get(refPrefix)
                if not baseUri:
                    refs.append(refObject)
                    continue

                if '{reference_id}' in baseUri:
                    refObject['uri'] = baseUri.replace('{reference_id}', refID, 1)
                else:
                    refObject['uri'] = baseUri + refID
                refs.append(refObject)

            return refs
        return []

    @snovault.calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    },)
    def display_title(self):
        """create a display_title field."""
        display_title = ""
        look_for = [
            "title",
            "name",
            "location_description",
            "accession",
        ]
        for field in look_for:
            # special case for user: concatenate first and last names
            display_title = self.properties.get(field, None)
            if display_title:
                if field != 'accession':
                    display_title = self.add_accession_to_title(display_title)
                return display_title
        # if none of the existing terms are available, use @type + date_created
        try:
            type_date = self.__class__.__name__ + " from " + self.properties.get("date_created", None)[:10]
            return type_date
        # last resort, use uuid
        except:
            return self.properties.get('uuid', None)

    @snovault.calculated_property(schema={
        "title": "link_id",
        "description": "A copy of @id that can be embedded. Uses ~ instead of /",
        "type": "string"
    },)
    def link_id(self, request):
        """create the link_id field, which is a copy of @id using ~ instead of /"""
        id_str = str(self).split(' at ')
        path_str = id_str[-1].strip('>')
        path_split = path_str.split('/')
        path_str = '~'.join(path_split) + '~'
        return path_str

    @snovault.calculated_property(schema={
        "title": "principals_allowed",
        "description": "calced perms for ES filtering",
        "type": "object",
        'properties': {
            'view': {
                'type': 'string'
            },
            'edit': {
                'type': 'string'
            },
            'audit': {
                'type': 'string'
            }
        }
    },)
    def principals_allowed(self, request):
        principals = calc_principals(self)
        return principals

    def rev_link_atids(self, request, rev_name):
        conn = request.registry[CONNECTION]
        return [request.resource_path(conn[uuid]) for uuid in
                paths_filtered_by_status(request, self.get_rev_links(rev_name))]


class SharedItem(Item):
    """An Item visible to all authenticated users while "proposed" or "in progress"."""

    def __ac_local_roles__(self):
        """smth."""
        roles = {}
        properties = self.upgrade_properties().copy()
        if 'lab' in properties:
            lab_submitters = 'submits_for.%s' % properties['lab']
            roles[lab_submitters] = 'role.lab_submitter'
        roles[Authenticated] = 'role.viewing_group_member'
        return roles


@snovault.calculated_property(context=Item.Collection, category='action')
def add(context, request):
    """smth."""
    if request.has_permission('add'):
        return {
            'name': 'add',
            'title': 'Add',
            'profile': '/profiles/{ti.name}.json'.format(ti=context.type_info),
            'href': '{item_uri}#!add'.format(item_uri=request.resource_path(context)),
        }


@snovault.calculated_property(context=Item, category='action')
def edit(context, request):
    """smth."""
    if request.has_permission('edit'):
        return {
            'name': 'edit',
            'title': 'Edit',
            'profile': '/profiles/{ti.name}.json'.format(ti=context.type_info),
            'href': '{item_uri}#!edit'.format(item_uri=request.resource_path(context)),
        }


@snovault.calculated_property(context=Item, category='action')
def create(context, request):
    """If the user submits for any lab, allow them to create"""
    if request.has_permission('create'):
        return {
            'name': 'create',
            'title': 'Create',
            'profile': '/profiles/{ti.name}.json'.format(ti=context.type_info),
            'href': '{item_uri}#!create'.format(item_uri=request.resource_path(context)),
        }
