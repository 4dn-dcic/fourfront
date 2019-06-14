"""The user collection."""
# -*- coding: utf-8 -*-

from pyramid.view import (
    view_config,
)
from pyramid.httpexceptions import HTTPUnprocessableEntity
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)
from .base import Item
from snovault import (
    CONNECTION,
    calculated_property,
    collection,
    load_schema,
)

from snovault.storage import User as AuthUser
from snovault.schema_utils import validate_request
from snovault.crud_views import collection_add
from snovault.calculated import calculate_properties
from snovault.resource_views import item_view_page
from dcicutils.s3_utils import s3Utils
import requests
import logging

logging.getLogger('boto3').setLevel(logging.INFO)
log = logging.getLogger(__name__)

ONLY_ADMIN_VIEW_DETAILS = [
    (Allow, 'group.admin', ['view', 'view_details', 'edit']),
    (Allow, 'group.read-only-admin', ['view', 'view_details']),
    (Allow, 'remoteuser.INDEXER', ['view']),
    (Allow, 'remoteuser.EMBED', ['view']),
    (Deny, Everyone, ['view', 'view_details', 'edit']),
]

SUBMITTER_CREATE = []

ONLY_OWNER_EDIT = [
    (Allow, 'role.owner', 'view'),
    (Allow, 'role.owner', 'edit'),
    (Allow, 'role.owner', 'view_details')
] + ONLY_ADMIN_VIEW_DETAILS

USER_ALLOW_CURRENT = [
    (Allow, Everyone, 'view'),
] + ONLY_ADMIN_VIEW_DETAILS

USER_DELETED = [
    (Deny, Everyone, 'visible_for_edit')
] + ONLY_ADMIN_VIEW_DETAILS


@collection(
    name='users',
    unique_key='user:email',
    properties={
        'title': '4D Nucleome Users',
        'description': 'Listing of current 4D Nucleome DCIC users',
    },
    acl=[])
class User(Item):
    """The user class."""

    item_type = 'user'
    schema = load_schema('encoded:schemas/user.json')
    embedded_list = [
        'institution.name',
        'project.name',
        'submits_for.name',
        'submits_for.display_title'
    ]

    STATUS_ACL = {
        'current': ONLY_OWNER_EDIT,
        'deleted': USER_DELETED,
        'replaced': USER_DELETED
    }

    @calculated_property(schema={
        "title": "Title",
        "type": "string",
    })
    def title(self, first_name, last_name):
        """return first and last name."""
        title = u'{} {}'.format(first_name, last_name)
        return title

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, first_name, last_name):
        return self.title(first_name, last_name)

    @calculated_property(schema={
        "title": "Contact Email",
        "description": "E-Mail address by which this person should be contacted.",
        "type": "string",
        "format": "email"
    })
    def contact_email(self, email, preferred_email=None):
        """Returns `email` if `preferred_email` is not defined."""
        if preferred_email:
            return preferred_email
        else:
            return email

    def __ac_local_roles__(self):
        """return the owner user."""
        owner = 'userid.%s' % self.uuid
        return {owner: 'role.owner'}


@view_config(context=User, permission='view', request_method='GET', name='page')
def user_page_view(context, request):
    """smth."""
    properties = item_view_page(context, request)
    if not request.has_permission('view_details'):
        filtered = {}
        for key in ['@id', '@type', 'uuid', 'institution', 'project', 'title', 'display_title']:
            try:
                filtered[key] = properties[key]
            except KeyError:
                pass
        return filtered
    return properties


@view_config(context=User.Collection, permission='add', request_method='POST',
             physical_path="/users")
def user_add(context, request):
    '''
    if we have a password in our request, create and auth entry
    for the user as well
    '''
    # do we have valid data
    pwd = request.json.get('password', None)
    pwd_less_data = request.json.copy()

    if pwd is not None:
        del pwd_less_data['password']

    validate_request(context.type_info.schema, request, pwd_less_data)

    if request.errors:
        return HTTPUnprocessableEntity(json={'errors': request.errors},
                                       content_type='application/json')

    result = collection_add(context, request)
    if result:
        email = request.json.get('email')
        pwd = request.json.get('password', None)
        name = request.json.get('first_name')
        if pwd is not None:
            auth_user = AuthUser(email, pwd, name)
            db = request.registry['dbsession']
            db.add(auth_user)

            import transaction
            transaction.commit()
    return result


@calculated_property(context=User, category='user_action')
def impersonate(context, request):
    """smth."""
    # This is assuming the user_action calculated properties
    # will only be fetched from the current_user view,
    # which ensures that the user represented by 'context' is also an effective principal
    if request.has_permission('impersonate'):
        return {
            'id': 'impersonate',
            'title': 'Impersonate User…',
            'href': request.resource_path(context) + '?currentAction=impersonate-user',
        }


@calculated_property(context=User, category='user_action')
def profile(context, request):
    """smth."""
    return {
        'id': 'profile',
        'title': 'Profile',
        'href': request.resource_path(context),
    }


@calculated_property(context=User, category='user_action')
def submissions(request):
    """smth."""
    return {
        'id': 'submissions',
        'title': 'Submissions',
        'href': '/submissions',
    }
