"""The type file for the collection Lab.

moved out of __init.py__ in order to have lab specific acl
that allows a lab member to edit their lab info at any time
"""
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)

from snovault import (
    collection,
    load_schema,
)
from .base import (
    Item,
)

ONLY_ADMIN_VIEW = [
    (Allow, 'group.admin', ['view', 'edit']),
    (Allow, 'group.read-only-admin', ['view']),
    (Allow, 'remoteuser.INDEXER', ['view']),
    (Allow, 'remoteuser.EMBED', ['view']),
    (Deny, Everyone, ['view', 'edit']),
]

ALLOW_EVERYONE_VIEW = [
    (Allow, Everyone, 'view'),
] + ONLY_ADMIN_VIEW

ALLOW_EVERYONE_VIEW_AND_SUBMITTER_EDIT = [
    (Allow, Everyone, 'view'),
    (Allow, 'role.lab_submitter', 'edit'),
] + ONLY_ADMIN_VIEW


@collection(
    name='labs',
    unique_key='lab:name',
    properties={
        'title': 'Labs',
        'description': 'Listing of 4D Nucleome labs',
    })
class Lab(Item):
    """Lab class."""

    item_type = 'lab'
    schema = load_schema('encoded:schemas/lab.json')
    name_key = 'name'
    embedded = ['awards']

    STATUS_ACL = {
        'current': ALLOW_EVERYONE_VIEW_AND_SUBMITTER_EDIT,
        'deleted': ONLY_ADMIN_VIEW,
        'revoked': ALLOW_EVERYONE_VIEW,
        'inactive': ALLOW_EVERYONE_VIEW,
    }

    def __ac_local_roles__(self):
        """this creates roles that the lab item needs so it can be edited"""
        roles = {}
        lab_submitters = 'submits_for.%s' % self.uuid
        roles[lab_submitters] = 'role.lab_submitter'
        return roles
