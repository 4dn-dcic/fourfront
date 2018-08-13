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
    embedded_list = [
        'awards.project',
        'awards.center_title'
    ]

    STATUS_ACL = {
        'current': ALLOW_EVERYONE_VIEW_AND_SUBMITTER_EDIT,
        'deleted': ONLY_ADMIN_VIEW,
        'revoked': ALLOW_EVERYONE_VIEW,
        'inactive': ALLOW_EVERYONE_VIEW,
    }

    @calculated_property(schema={
        "title": "Correspondence",
        "description": "Point of contact(s) for this Lab.",
        "type" : "array",
        "uniqueItems": True,
        "items" : {
            "title" : "Lab Contact",
            "description": "A User associated with the lab who is also a point of contact.",
            "type" : "string",
            "linkTo" : "User"
        }
    })
    def correspondence(self):
        """
        Definitive list of users (linkTo User) who are designated as point of contact(s) for this Lab.

        Returns:
            List of @IDs which refer to either PI or alternate list of contacts defined in `contact_persons`.
        """

        ppl = self.properties.get('contact_persons', [])
        pi  = self.properties.get('pi', None)

        if ppl:
            return ppl
        elif not ppl and pi:
            return [pi]
        else:
            return None

    def __init__(self, registry, models):
        super().__init__(registry, models)
        if hasattr(self, 'STATUS_ACL'):
            self.STATUS_ACL.update(self.__class__.STATUS_ACL)
        else:
            self.STATUS_ACL = self.__class__.STATUS_ACL

    def __ac_local_roles__(self):
        """This creates roles that the lab item needs so it can be edited & viewed"""
        roles = {}
        lab_submitters = 'submits_for.%s' % self.uuid
        roles[lab_submitters] = 'role.lab_submitter'
        lab_member = 'lab.%s' % self.uuid
        roles[lab_member] = 'role.lab_member'
        return roles
