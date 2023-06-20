# Considation of ACL related definitions.
from pyramid.security import Allow, Authenticated, Deny, Everyone
from snovault.types.base import DELETED_ACL, ONLY_ADMIN_VIEW_ACL

# This acl allows item creation; it is easily overwritten in lab and user,
# as these items should not be available for creation
SUBMITTER_CREATE_ACL = [
    (Allow, 'group.submitter', ['add', 'create', 'edit', 'view'])
#   (Allow, 'group.submitter', 'add'),
#   (Allow, 'group.submitter', 'create'),
    #(Allow, 'group.submitter', 'view'),  # need this (xyzzy) for test_post_put_patch.py::test_submitter_post but this breaks 
    #(Allow, 'group.submitter', 'edit'),  # xyzzy ?
    # xyzzy This does NOT fix it
    # (Allow, 'group.submitter', ['add', 'edit', 'view'])
    # xyzzy (Allow, 'group.submitter', 'edit'),
    # xyzzy (Allow, 'group.submitter', 'view'),
    # xyzzy (Allow, 'group.submitter', ['add', 'edit', 'view'])
]

ALLOW_EVERYONE_VIEW_ACL = [
    (Allow, Everyone, 'view'),
#] + ONLY_ADMIN_VIEW_ACL + SUBMITTER_CREATE_ACL
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL

ALLOW_LAB_MEMBER_VIEW_ACL = [
    (Allow, 'role.lab_member', 'view'),
    (Allow, 'role.award_member', 'view')
#] + ONLY_ADMIN_VIEW_ACL + SUBMITTER_CREATE_ACL
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL

ALLOW_VIEWING_GROUP_VIEW_ACL = [
    (Allow, 'role.viewing_group_member', 'view'),
] + ALLOW_LAB_MEMBER_VIEW_ACL

ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT_ACL = [
    (Allow, 'role.viewing_group_member', 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
] + ALLOW_LAB_MEMBER_VIEW_ACL

ALLOW_LAB_SUBMITTER_EDIT_ACL = [
    (Allow, 'role.lab_member', 'view'),
    (Allow, 'role.award_member', 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
    # xyzzy This fixes it ...
    # (Allow, 'group.submitter', ['add', 'edit', 'view'])
#] + ONLY_ADMIN_VIEW_ACL + SUBMITTER_CREATE_ACL
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL  # xyzzy - reordered these

ALLOW_CURRENT_AND_SUBMITTER_EDIT_ACL = [
    (Allow, Everyone, 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
#] + ONLY_ADMIN_VIEW_ACL + SUBMITTER_CREATE_ACL
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL

ALLOW_CURRENT_ACL = ALLOW_EVERYONE_VIEW_ACL

# For running pipelines
ALLOW_LAB_VIEW_ADMIN_EDIT_ACL = [
    (Allow, 'role.lab_member', 'view'),
    (Allow, 'role.award_member', 'view'),
    (Allow, 'role.lab_submitter', 'view'),
] + ONLY_ADMIN_VIEW_ACL

ALLOW_OWNER_EDIT_ACL = [
    (Allow, 'role.owner', ['edit', 'view', 'view_details']),
]

# Collection acls
ALLOW_SUBMITTER_ADD_ACL = SUBMITTER_CREATE_ACL

ALLOW_ANY_USER_ADD_ACL = [
    (Allow, Authenticated, 'add'),
    (Allow, Authenticated, 'create')
] + ALLOW_EVERYONE_VIEW_ACL
