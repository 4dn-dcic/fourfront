"""The type file for the collection Lab.

moved out of __init.py__ in order to have lab specific acl
that allows a lab member to edit their lab info at any time
"""
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)
from base64 import b64encode
from snovault import (
    collection,
    load_schema,
    calculated_property
)
from .base import (
    Item
)


ONLY_ADMIN_VIEW = [
    (Allow, 'group.admin', ['view', 'edit']),
    (Allow, 'group.read-only-admin', ['view']),
    (Allow, 'remoteuser.INDEXER', ['view']),
    (Allow, 'remoteuser.EMBED', ['view']),
    (Deny, Everyone, ['view', 'edit'])
]

SUBMITTER_CREATE = []

ALLOW_EVERYONE_VIEW = [
    (Allow, Everyone, 'view'),
]

ALLOW_EVERYONE_VIEW_AND_SUBMITTER_EDIT = [
    (Allow, Everyone, 'view'),
    (Allow, 'role.institution_submitter', 'edit'),
] + ONLY_ADMIN_VIEW


@collection(
    name='institutions',
    unique_key='institution:name',
    properties={
        'title': 'Institutions',
        'description': 'Listing of Institutions',
    })
class Institution(Item):
    """Institution class."""

    item_type = 'institution'
    schema = load_schema('encoded:schemas/institution.json')
    name_key = 'name'
    embedded_list = Item.embedded_list

    STATUS_ACL = {
        'current': ALLOW_EVERYONE_VIEW_AND_SUBMITTER_EDIT,
        'deleted': ONLY_ADMIN_VIEW
    }

    def __init__(self, registry, models):
        super().__init__(registry, models)
        if hasattr(self, 'STATUS_ACL'):
            self.STATUS_ACL.update(self.__class__.STATUS_ACL)
        else:
            self.STATUS_ACL = self.__class__.STATUS_ACL

    def __ac_local_roles__(self):
        """This creates roles that the lab item needs so it can be edited & viewed"""
        roles = {}
        institution_submitters = 'submits_for.%s' % self.uuid
        roles[institution_submitters] = 'role.institution_submitter'
        institution_member = 'lab.%s' % self.uuid
        roles[institution_member] = 'role.institution_member'
        return roles
