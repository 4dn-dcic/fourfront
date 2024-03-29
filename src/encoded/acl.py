# Considation of ACL related definitions.
from pyramid.security import Allow, Authenticated, Deny, Everyone
from snovault.types.base import DELETED_ACL, ONLY_ADMIN_VIEW_ACL

AWARD_MEMBER_ROLE = 'role.award_member'
LAB_MEMBER_ROLE = 'role.lab_member'
LAB_SUBMITTER_ROLE = 'role.lab_submitter'
OWNER_ROLE = 'role.owner'
VIEWING_GROUP_MEMBER_ROLE = 'role.viewing_group_member'

# This acl allows item creation; it is easily overwritten in lab and user,
# as these items should not be available for creation
SUBMITTER_CREATE_ACL = [
    (Allow, 'group.submitter', 'add'),
    (Allow, 'group.submitter', 'create')
]

ALLOW_EVERYONE_VIEW_ACL = [
    (Allow, Everyone, 'view'),
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL 

ALLOW_LAB_MEMBER_VIEW_ACL = [
    (Allow, LAB_MEMBER_ROLE , 'view'),
    (Allow, AWARD_MEMBER_ROLE , 'view')
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL 

ALLOW_VIEWING_GROUP_VIEW_ACL = [
    (Allow, VIEWING_GROUP_MEMBER_ROLE, 'view'),
] + ALLOW_LAB_MEMBER_VIEW_ACL

ALLOW_VIEWING_GROUP_LAB_SUBMITTER_EDIT_ACL = [
    (Allow, VIEWING_GROUP_MEMBER_ROLE, 'view'),
    (Allow, LAB_SUBMITTER_ROLE, 'edit'),
] + ALLOW_LAB_MEMBER_VIEW_ACL

ALLOW_LAB_SUBMITTER_EDIT_ACL = [
    (Allow, LAB_MEMBER_ROLE , 'view'),
    (Allow, AWARD_MEMBER_ROLE , 'view'),
    (Allow, LAB_SUBMITTER_ROLE, 'edit'),
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL 

ALLOW_CURRENT_AND_SUBMITTER_EDIT_ACL = [
    (Allow, Everyone, 'view'),
    (Allow, LAB_SUBMITTER_ROLE, 'edit'),
] + SUBMITTER_CREATE_ACL + ONLY_ADMIN_VIEW_ACL 

ALLOW_CURRENT_ACL = ALLOW_EVERYONE_VIEW_ACL

# For running pipelines
ALLOW_LAB_VIEW_ADMIN_EDIT_ACL = [
    (Allow, LAB_MEMBER_ROLE , 'view'),
    (Allow, AWARD_MEMBER_ROLE , 'view'),
    (Allow, LAB_SUBMITTER_ROLE, 'view'),
] + ONLY_ADMIN_VIEW_ACL

ALLOW_OWNER_EDIT_ACL = [
    (Allow, OWNER_ROLE, ['edit', 'view', 'view_details']),
]

# Collection acls
ALLOW_SUBMITTER_ADD_ACL = SUBMITTER_CREATE_ACL

ALLOW_ANY_USER_ADD_ACL = [
    (Allow, Authenticated, 'add'),
    (Allow, Authenticated, 'create')
] + ALLOW_EVERYONE_VIEW_ACL
