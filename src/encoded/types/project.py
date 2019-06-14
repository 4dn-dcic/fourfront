"""The type file for the collection Award.

"""
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)

from snovault import (
    calculated_property,
    collection,
    load_schema,
)
from .base import (
    Item
)
import re


@collection(
    name='projects',
    unique_key='project:name',
    properties={
        'title': 'Projects',
        'description': 'Listing of projects',
    })
class Project(Item):
    """Project class."""

    item_type = 'project'
    schema = load_schema('encoded:schemas/project.json')
    embedded_list = Item.embedded_list

    # define some customs acls; awards can only be created/edited by admin
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

    ALLOW_EVERYONE_VIEW_AND_ADMIN_EDIT = [
        (Allow, Everyone, 'view'),
    ] + ONLY_ADMIN_VIEW

    STATUS_ACL = {
        'current': ALLOW_EVERYONE_VIEW_AND_ADMIN_EDIT,
        'deleted': ONLY_ADMIN_VIEW,
        'revoked': ALLOW_EVERYONE_VIEW,
        'replaced': ALLOW_EVERYONE_VIEW,
        'inactive': ALLOW_EVERYONE_VIEW
    }
