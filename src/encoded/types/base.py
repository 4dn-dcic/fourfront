"""base class creation for all the schemas that exist."""
from functools import lru_cache
from pyramid.security import (
    # ALL_PERMISSIONS,
    Allow,
    Authenticated,
    Deny,
    # DENY_ALL,
    Everyone,
)
from pyramid.traversal import find_root
import snovault
# from ..schema_formats import is_accession
# import snovalut default post / patch stuff so we can overwrite it in this file
from snovault.interfaces import CONNECTION
from ..server_defaults import get_userid, add_last_modified

from datetime import date


@lru_cache()
def _award_viewing_group(award_uuid, root):
    award = root.get_by_uuid(award_uuid)
    return award.upgrade_properties().get('viewing_group')


# Item acls
from .acl import (
    ALLOW_CURRENT_AND_SUBMITTER_EDIT_ACL, 
    ALLOW_CURRENT_ACL,
    DELETED_ACL,
    ALLOW_ANY_USER_ADD_ACL,
    ALLOW_EVERYONE_VIEW_ACL, 
    ALLOW_LAB_MEMBER_VIEW_ACL, 
    ALLOW_LAB_SUBMITTER_EDIT_ACL, 
    ALLOW_LAB_VIEW_ADMIN_EDIT_ACL,
    ALLOW_OWNER_EDIT_ACL,
    ALLOW_SUBMITTER_ADD_ACL,
    ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT_ACL, 
    ALLOW_VIEWING_GROUP_VIEW_ACL, 
    ONLY_ADMIN_VIEW_ACL,
    SUBMITTER_CREATE_ACL
)


from snovault import Item as SnovaultItem
from snovault.types.base import get_item_or_none, set_namekey_from_title, validate_item_type_of_linkto_field

##
## Common lists of embeds to be re-used in certain files (similar to schema mixins)
##

static_content_embed_list = [
    "static_headers.*",            # Type: UserContent, may have differing properties
    "static_content.content.@type",
    "static_content.content.content",
    "static_content.content.name",
    "static_content.content.title",
    "static_content.content.status",
    "static_content.content.description",
    "static_content.content.options",
    "static_content.content.lab",
    "static_content.content.contributing_labs",
    "static_content.content.award",
    "static_content.content.filetype"
]

lab_award_attribution_embed_list = [
    "award.project",
    "award.center_title",
    "award.name",  # used in center_title calc prop
    "award.center",  # used in center_title calc prop
    "award.description",  # used in center_title calc prop
    "award.pi.last_name",  # used in center_title calc prop
    "lab.title",
    "lab.correspondence",  # Not a real linkTo - temp workaround
    "lab.pi.first_name",  # this and next used in above calcprop
    "lab.pi.last_name",
    "lab.pi.contact_email",
    "lab.pi.preferred_email",
    "lab.pi.email",
    "contributing_labs.correspondence",  # Not a real linkTo - temp workaround
    "contributing_labs.pi.first_name",
    "contributing_labs.pi.last_name",
    "contributing_labs.pi.contact_email",
    "contributing_labs.pi.preferred_email",
    "contributing_labs.pi.email",
    "submitted_by.job_title",  # XXX: Is this right? below comment suggests no...
    "submitted_by.first_name",  # this and next used in above calcprop
    "submitted_by.last_name",
    "submitted_by.timezone",  # is this used in attribution or elsewhere on item pages so should be included?
]


from snovault.types.base import AbstractCollection

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
            self.__acl__ = ALLOW_SUBMITTER_ADD_ACL


@snovault.abstract_collection(
    name='items',
    properties={
        'title': "Item Listing",
        'description': 'Abstract collection of all Items.',
    })
#class Item(snovault.Item):
class Item(SnovaultItem):
    """
    The abstract base type for all other Items.
    All methods & properties are inherited by
    sub-types unless overridden.
    """
    item_type = 'item'
    AbstractCollection = AbstractCollection
    Collection = Collection
    STATUS_ACL = {
        # standard_status
        'released': ALLOW_CURRENT_ACL,
        'current': ALLOW_CURRENT_ACL,
        'revoked': ALLOW_CURRENT_ACL,
        'archived': ALLOW_CURRENT_ACL,
        'deleted': DELETED_ACL,
        'replaced': ALLOW_CURRENT_ACL,
        'planned': ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT_ACL,
        'in review by lab': ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'submission in progress': ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT_ACL,
        'released to project': ALLOW_VIEWING_GROUP_VIEW_ACL,
        'archived to project': ALLOW_VIEWING_GROUP_VIEW_ACL,
        # for file
        'obsolete': DELETED_ACL,
        'uploading': ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'to be uploaded by workflow': ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'uploaded': ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'upload failed': ALLOW_LAB_SUBMITTER_EDIT_ACL,
        'restricted': ALLOW_CURRENT_ACL,
        # publication
        'published': ALLOW_CURRENT_ACL,
        # experiment sets
        'pre-release': ALLOW_VIEWING_GROUP_VIEW_ACL,
    }

    # Items of these statuses are filtered out from rev links
    filtered_rev_statuses = ('deleted', 'replaced')

    # Default embed list for all 4DN Items
    embedded_list = static_content_embed_list

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
        return self.STATUS_ACL.get(status, ALLOW_LAB_SUBMITTER_EDIT_ACL)

    def __ac_local_roles__(self):
        """this creates roles based on properties of the object being acccessed"""

        def _is_joint_analysis(props):
            for t in props.get('tags', []):
                if 'joint analysis' in t.lower():
                    return True
            return False

        roles = {}
        properties = self.upgrade_properties()
        status = properties.get('status')
        if 'lab' in properties:
            lab_submitters = 'submits_for.%s' % properties['lab']
            roles[lab_submitters] = 'role.lab_submitter'
            # add lab_member as well
            lab_member = 'lab.%s' % properties['lab']
            roles[lab_member] = 'role.lab_member'
        if 'contributing_labs' in properties:
            for clab in properties['contributing_labs']:
                clab_member = 'lab.%s' % clab
                roles[clab_member] = 'role.lab_member'
        if 'award' in properties:
            viewing_group = _award_viewing_group(properties['award'], find_root(self))
            if viewing_group is not None:
                viewing_group_members = 'viewing_group.%s' % viewing_group
                roles[viewing_group_members] = 'role.viewing_group_member'
                award_group_members = 'award.%s' % properties['award']
                roles[award_group_members] = 'role.award_member'

                # need to add 4DN viewing_group to NOFIC items that are rel2proj
                # or are JA and planned or in progress
                if viewing_group == 'NOFIC':
                    if status == 'released to project':
                        roles['viewing_group.4DN'] = 'role.viewing_group_member'
                    elif status in ['planned', 'submission in progress']:
                        if _is_joint_analysis(properties):
                            roles['viewing_group.4DN'] = 'role.viewing_group_member'
                    # else leave the NOFIC viewing group role in place
                elif (status in ['planned', 'submission in progress'] and not _is_joint_analysis(properties)) or (status == 'pre-release'):
                    # for these statuses view should be restricted to lab members so all viewing_groups are removed
                    # unless in the case of planned and submission in progress it is a joint analysis tagged dataset
                    # or NOFIC group dealt with in the above if
                    grps = []
                    for group, role in roles.items():
                        if role == 'role.viewing_group_member':
                            grps.append(group)
                    for g in grps:
                        del roles[g]

        # this is for access to item specific view group
        if 'viewable_by' in properties:
            viewers = properties.get('viewable_by', [])
            for vg in viewers:
                roles['viewing_group.{}'.format(vg)] = 'role.viewing_group_member'

        # This emulates __ac_local_roles__ of User.py (role.owner)
        if 'submitted_by' in properties:
            submitter = 'userid.%s' % properties['submitted_by']
            roles[submitter] = 'role.owner'
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

    def _update(self, properties, sheets=None):
        props = {}
        try:
            props = self.properties
        except KeyError:
            pass
        if 'status' in props and props['status'] == 'planned':
            # if an item is status 'planned' and an update is submitted
            # by a non-admin user then status should be changed to 'submission in progress'
            if not self.is_update_by_admin_user():
                properties['status'] = 'submission in progress'

        add_last_modified(properties)
        date2status = [{'public_release': ['released', 'current']}, {'project_release': ['released to project']}]
        # if an item is directly released without first being released to project
        # then project_release date is added for same date as public_release
        for dateinfo in date2status:
            datefield, statuses = next(iter(dateinfo.items()))
            if datefield not in props:
                if datefield in self.schema['properties'] and datefield not in properties:
                    if 'status' in properties and properties['status'] in statuses:
                        # check the status and add the date if it's not provided and item has right status
                        properties[datefield] = date.today().isoformat()
                    elif datefield == 'project_release':
                        # case where public_release is added and want to set project_release = public_release
                        public_rel = properties.get('public_release')
                        if public_rel:
                            properties[datefield] = public_rel

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
