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
from snovault.util import debug_log
from dcicutils.env_utils import is_fourfront_env, is_stg_or_prd_env
from dcicutils.s3_utils import s3Utils
import requests
import structlog
import logging


logging.getLogger('boto3').setLevel(logging.WARNING)
log = structlog.getLogger(__name__)

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
        'lab.awards.project',
        'lab.name',
        'lab.display_title',
        'submits_for.name',
        'submits_for.display_title'
    ]

    STATUS_ACL = {
        'current': ONLY_OWNER_EDIT,
        'deleted': USER_DELETED,
        'replaced': USER_DELETED,
        'revoked': ONLY_ADMIN_VIEW_DETAILS,
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

    def _update(self, properties, sheets=None):
        # subscriptions are search queries used on /submissions page
        # always overwrite subscriptions on an update
        new_subscriptions = []
        if properties.get('submits_for'):
            new_subscriptions.append({
                'title': 'My submissions',
                'url': '?submitted_by.uuid=%s&sort=-date_created' % str(self.uuid)
            })
        if properties.get('lab'):
            new_subscriptions.append({
                'title': 'Submissions for my lab',
                'url': '?lab.uuid=%s&sort=-date_created' % properties['lab']
            })
        properties['subscriptions'] = new_subscriptions

        # if we are on a production environment, make sure there is an account for the
        # user that reflects any email changes
        ff_env = self.registry.settings.get('env.name')
        # compare previous and updated emails, respectively
        try:
            prev_email = self.properties.get('email')
        except KeyError:  # if new user, previous properties do not exist
            prev_email = None
        new_email = properties.get('email')
        update_email = new_email if prev_email != new_email else None
        # Is this only for fourfront or does cgap want to do this, too? -kmp 3-Apr-2020
        if ff_env is not None and update_email is not None and is_fourfront_env(ff_env) and is_stg_or_prd_env(ff_env):
            try:
                s3Obj = s3Utils(env='data')
                jh_key = s3Obj.get_jupyterhub_key()
                jh_endpoint = ''.join([jh_key['server'], '/hub/api/users/', update_email])
                jh_headers = {'Authorization': 'token %s' % jh_key['secret']}
                res = requests.post(jh_endpoint, headers=jh_headers)
            except Exception as jh_exc:
                log.error('Error posting user %s to JupyterHub' % update_email,
                          error=str(jh_exc))
            else:
                log.info('Updating user %s on JupyterHub. Result: %s' % (update_email, res.text))
        super(User, self)._update(properties, sheets)


@view_config(context=User, permission='view', request_method='GET', name='page')
@debug_log
def user_page_view(context, request):
    """smth."""
    properties = item_view_page(context, request)
    if not request.has_permission('view_details'):
        filtered = {}
        for key in ['@id', '@type', 'uuid', 'lab', 'title', 'display_title']:
            try:
                filtered[key] = properties[key]
            except KeyError:
                pass
        return filtered
    return properties


@view_config(context=User.Collection, permission='add', request_method='POST',
             physical_path="/users")
@debug_log
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
