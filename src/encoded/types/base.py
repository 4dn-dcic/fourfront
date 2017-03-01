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
import snovault
# from ..schema_formats import is_accession
from snovault.crud_views import collection_add as sno_collection_add
from snovault.validators import validate_item_content_post


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
    """smth."""
    if include is not None:
        return [
            path for path in paths
            if traverse(request.root, path)['context'].__json__(request).get('status') in include
        ]
    else:
        return [
            path for path in paths
            if traverse(request.root, path)['context'].__json__(request).get('status') not in exclude
        ]


class AbstractCollection(snovault.AbstractCollection):
    """smth."""

    def get(self, name, default=None):
        """smth."""
        resource = super(AbstractCollection, self).get(name, None)
        if resource is not None:
            return resource
        if ':' in name:
            resource = self.connection.get_by_unique_key('alias', name)
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
        'in review by lab': ALLOW_LAB_SUBMITTER_EDIT,
        'in review by project': ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT,
        'released to project': ALLOW_VIEWING_GROUP_VIEW,
        # for file
        'obsolete': ONLY_ADMIN_VIEW,
        'uploading': ALLOW_LAB_SUBMITTER_EDIT,
        'uploaded': ALLOW_LAB_SUBMITTER_EDIT,
        'upload failed': ALLOW_LAB_SUBMITTER_EDIT,

        # publication
        'published': ALLOW_CURRENT,
    }

    def __init__(self, registry, models):
        super().__init__(registry, models)
        self.STATUS_ACL = self.__class__.STATUS_ACL
        self.update_embeds()

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
        return roles

    def unique_keys(self, properties):
        """smth."""
        keys = super(Item, self).unique_keys(properties)
        if 'accession' not in self.schema['properties']:
            return keys
        keys.setdefault('accession', []).extend(properties.get('alternate_accessions', []))
        if properties.get('status') != 'replaced' and 'accession' in properties:
            keys['accession'].append(properties['accession'])
        return keys

    @snovault.calculated_property(schema={
        "title": "External Reference URIs",
        "description": "External references to this item.",
        "type": "array",
        "items": {"type": "object", "title": "External Reference", "properties": {
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
        path_str = request.path if request.path else self.properties.get('accession', None)
        if path_str:
            path_split = path_str.split('/')
            if len(path_split) == 4 and '@@' in path_split[-1]:
                path_str = '~'.join(path_split[:-1]) + '~'
            return path_str

    def update_embeds(self):
        total_schema = self.schema['properties'].copy() if self.schema else {}
        self.calc_props_schema = {}
        if self.registry and self.registry['calculated_properties']:
            for calc_props_key, calc_props_val in self.registry['calculated_properties'].props_for(self).items():
                if calc_props_val.schema:
                    self.calc_props_schema[calc_props_key] = calc_props_val.schema
        total_schema.update(self.calc_props_schema)
        self.embedded = add_default_embeds(self.embedded, total_schema)


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


def add_default_embeds(embeds, schema={}):
    """Perform default processing on the embeds list.
    This adds display_title to any non-fully embedded linkTo field and defaults
    to using the @id and display_title of non-embedded linkTo's
    """
    if 'properties' in schema:
        schema = schema['properties']
    processed_fields = embeds[:] if len(embeds) > 0 else []
    already_processed = []
    # find pre-existing fields
    for field in embeds:
        split_field = field.strip().split('.')
        if len(split_field) > 1:
            embed_path = '.'.join(split_field[:-1])
            if embed_path not in processed_fields and embed_path not in already_processed:
                already_processed.append(embed_path)
                if embed_path + '.link_id' not in processed_fields:
                    processed_fields.append(embed_path + '.link_id')
                if embed_path + '.display_title' not in processed_fields:
                    processed_fields.append(embed_path + '.display_title')
    # automatically embed top level linkTo's not already embedded
    for key, val in schema.items():
        check_linkTo = 'linkTo' in val or ('items' in val and 'linkTo' in val['items'])
        if key not in processed_fields and check_linkTo:
            if key + '.link_id' not in processed_fields:
                processed_fields.append(key + '.link_id')
            if key + '.display_title' not in processed_fields:
                processed_fields.append(key + '.display_title')
    return processed_fields
