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
    Item,
    get_item_or_none,
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


def _build_lab_embedded_list():
    """ Helper function intended to be used to create the embedded list for lab.
        All types should implement a function like this going forward.
    """
    return Item.embedded_list + [
        # Award linkTo
        'awards.project',
        'awards.name',
        'awards.pi.last_name',
        'awards.center_title'
    ]


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
    embedded_list = _build_lab_embedded_list()

    STATUS_ACL = {
        'current': ALLOW_EVERYONE_VIEW_AND_SUBMITTER_EDIT,
        'deleted': ONLY_ADMIN_VIEW,
        'revoked': ALLOW_EVERYONE_VIEW,
        'inactive': ALLOW_EVERYONE_VIEW,
    }

    @calculated_property(schema={
        "title": "Correspondence",
        "description": "Point of contact(s) for this Lab.",
        "type": "array",
        "uniqueItems": True,
        "items": {
            "title": "Lab Contact - Public Snippet",
            "description": "A User associated with the lab who is also a point of contact.",
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "display_title": {
                    "type": "string"
                },
                "contact_email": {
                    "type": "string",
                    "format": "email"
                },
                "@id": {
                    "type": "string"
                }
            }
        }
    })
    def correspondence(self, request, pi=None, contact_persons=None):
        """
        Definitive list of users (linkTo User) who are designated as point of contact(s) for this Lab.

        Returns:
            List of @IDs which refer to either PI or alternate list of contacts defined in `contact_persons`.
        """

        contact_people = None

        if contact_persons:
            contact_people = contact_persons
        elif pi:
            contact_people = [pi]

        def fetch_and_pick_embedded_properties(person_at_id):
            '''Clear out some properties from person'''
            try:
                person = request.embed(person_at_id, '@@object')
            except Exception:
                return None
            encoded_email = b64encode(person['contact_email'].encode('utf-8')).decode('utf-8') if person.get('contact_email') else None
            return {
                "contact_email": encoded_email,  # Security against web scrapers
                "@id": person.get('@id'),
                "display_title": person.get('display_title')
            }

        if contact_people is not None:
            contact_people_dicts = [ fetch_and_pick_embedded_properties(person) for person in contact_people ]
            return [ person for person in contact_people_dicts if person is not None ]

    @calculated_property(schema={
        "title": "P.I. Name",
        "description": "Name of the lab principal investigator.",
        "type": "string",
    })
    def pi_name(self, request, pi=None):
        if pi:
            return get_item_or_none(request, pi, 'users').get('display_title')
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
