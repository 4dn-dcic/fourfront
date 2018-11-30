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
from .base import (
    Item,
    paths_filtered_by_status
)
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

import logging
logging.getLogger('boto3').setLevel(logging.WARNING)
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

    def display_title(self):
        return self.title(self.properties['first_name'], self.properties['last_name'])

    @calculated_property(schema={
        "title": "Contact Email",
        "description": "E-Mail address by which this person should be contacted.",
        "type": "string",
        "format" : "email"
    })
    def contact_email(self):
        """Returns `email` if `preferred_email` is not defined."""
        return self.properties.get('preferred_email', self.properties['email'])

    def __ac_local_roles__(self):
        """return the owner user."""
        owner = 'userid.%s' % self.uuid
        return {owner: 'role.owner'}

    def _update(self, properties, sheets=None):
        # update user subscriptions to ensure that they include the labs
        # that the user is associated with, as well as their own submissions
        # if they are a sumbitter
        curr_subs = properties.get('subscriptions', [])
        # subscriptions is a list but change to dict here for processing
        curr_subs_dict = {sub['title']: sub for sub in curr_subs}
        labs = {}  # cache lab info. keyed by @id
        # remove old subscriptions
        if 'My submissions' in curr_subs_dict: del curr_subs_dict['My submissions']
        if 'My lab' in curr_subs_dict: del curr_subs_dict['My lab']
        # if user has a lab, include all submissions to that lab
        if properties.get('lab'):
            my_lab = self.collection.get(properties['lab'])
            my_lab_title = my_lab.properties.get('title', 'NO TITLE FOUND')
            curr_subs_dict['All submissions for ' + my_lab_title] = {
                'title': 'All submissions for ' + my_lab_title,
                'url': '?lab.uuid=' + str(my_lab.uuid) + '&sort=-date_created'
            }
            labs[properties['lab']] = my_lab
        # if submitter, add subscriptions to this user submissions for each lab
        for submits_lab in properties.get('submits_for', []):
            submit_lab = labs.get(submits_lab, self.collection.get(submits_lab))
            lab_title = submit_lab.properties.get('title', 'NO TITLE FOUND')
            curr_subs_dict['My submissions for ' + lab_title] = {
                'title': 'My submissions for ' + lab_title,
                'url': '?submitted_by.uuid=' + str(self.uuid) + '&lab.uuid=' +
                       str(submit_lab.uuid) + '&sort=-date_created'
            }
        # sort alphabetically by title
        properties['subscriptions'] = sorted(list(curr_subs_dict.values()), key= lambda v:v['title'])
        super(User, self)._update(properties, sheets)


@view_config(context=User, permission='view', request_method='GET', name='page')
def user_page_view(context, request):
    """smth."""
    properties = item_view_page(context, request)
    if not request.has_permission('view_details'):
        filtered = {}
        for key in ['@id', '@type', 'uuid', 'lab', 'title', 'link_id', 'display_title']:
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
    import pdb; pdb.set_trace()
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

    # if we are on webprod/webprod2, also create a Jupyterhub account for user.
    # this needs to be done because otherwise the user won't show up on JH
    # until the server is restarted
    ff_env = request.registry.settings.get('env.name')
    if 'webprod' in ff_env and request.json.get('email'):
        import requests
        from dcicutils.s3_utils import s3Utils
        s3Obj = s3Utils(env='data')
        jh_key = s3Utils.get_jupyterhub_key()
        jh_endpoint = ''.join([jh_key['server'], '/hub/api/users/', request.json['email']])
        jh_headers = {'Authorization': 'token %s' % jh_key['secret']}
        try:
            requests.post(jh_endpoint, headers=jh_headers)
        except Exception as jh_exc:
            log.warning('Error posting user %s to Jupyterhub' % request.json['email'],
                        error=str(jh_exc))

    return result


@calculated_property(context=User, category='user_action')
def impersonate(request):
    """smth."""
    # This is assuming the user_action calculated properties
    # will only be fetched from the current_user view,
    # which ensures that the user represented by 'context' is also an effective principal
    if request.has_permission('impersonate'):
        return {
            'id': 'impersonate',
            'title': 'Impersonate User…',
            'href': '/#!impersonate-user',
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
