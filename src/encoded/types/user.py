"""The user collection."""
# -*- coding: utf-8 -*-

import os
import logging
import requests
import structlog
import transaction

from pyramid.view import (
    view_config,
)
from pyramid.httpexceptions import HTTPUnprocessableEntity
from pyramid.security import (
    Allow,
    Deny,
    Everyone,
)
from .acl import ONLY_ADMIN_VIEW_ACL, OWNER_ROLE
from .base import Item
from snovault import (
    CONNECTION,
    calculated_property,
    collection,
    load_schema,
)
from snovault.types.user import (
    User as SnovaultUser,
    user_page_view as snovault_user_page_view,
    user_add as snovault_user_add,
    #impersonate as snovault_impersonate,
    #profile as snovault_profile,
    #submissions as snovault_submissions
)

from snovault.storage import User as AuthUser
from snovault.schema_utils import validate_request
from snovault.crud_views import collection_add
# from snovault.calculated import calculate_properties
from snovault.resource_views import item_view_page
from snovault.util import debug_log
from dcicutils.env_utils import is_fourfront_env, is_stg_or_prd_env
from dcicutils.s3_utils import s3Utils
from dcicutils.secrets_utils import assume_identity
from dcicutils.misc_utils import override_environ


logging.getLogger('boto3').setLevel(logging.WARNING)
log = structlog.getLogger(__name__)

ONLY_ADMIN_VIEW_DETAILS_ACL = [
    (Allow, 'group.admin', ['view', 'view_details', 'edit']),
    (Allow, 'group.read-only-admin', ['view', 'view_details']),
    (Allow, 'remoteuser.INDEXER', ['view']),
    (Allow, 'remoteuser.EMBED', ['view']),
    (Deny, Everyone, ['view', 'view_details', 'edit']),
]

SUBMITTER_CREATE_ACL = []

ONLY_OWNER_EDIT_ACL = [
    (Allow, OWNER_ROLE, 'view'),
    (Allow, OWNER_ROLE, 'edit'),
    (Allow, OWNER_ROLE, 'view_details')
] + ONLY_ADMIN_VIEW_DETAILS_ACL

USER_ALLOW_CURRENT_ACL = [
    (Allow, Everyone, 'view'),
] + ONLY_ADMIN_VIEW_DETAILS_ACL

USER_DELETED_ACL = [
    (Deny, Everyone, 'visible_for_edit')
] + ONLY_ADMIN_VIEW_DETAILS_ACL


def _build_user_embedded_list():
    """ Helper function intended to be used to create the embedded list for user.
        All types should implement a function like this going forward.
    """
    return [
        # Lab linkTo
        'lab.name',

        # Award linkTo
        'lab.awards.name',
        'lab.awards.project',

        # Lab linkTo
        'submits_for.name',
    ]

# todo - trying putting contents of file 'u' here ...

@collection(
    name='users',
    unique_key='user:email',
    properties={
        'title': '4D Nucleome Users',
        'description': 'Listing of current 4D Nucleome DCIC users',
    },
    acl=[])
class User(Item, SnovaultUser):
    """The user class."""

    item_type = 'user'
    schema = load_schema('encoded:schemas/user.json')
    embedded_list = _build_user_embedded_list()

    STATUS_ACL = {
        'current': ONLY_OWNER_EDIT_ACL,
        'deleted': USER_DELETED_ACL,
        'replaced': USER_DELETED_ACL,
        'revoked': ONLY_ADMIN_VIEW_DETAILS_ACL,
    }

    def __ac_local_roles__(self):
        """return the owner user."""
        owner = 'userid.%s' % self.uuid
        return {owner: OWNER_ROLE}

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
                if 'IDENTITY' in os.environ:
                    identity = assume_identity()
                    with override_environ(**identity):
                        s3Obj = s3Utils(env='data')
                        jh_key = s3Obj.get_jupyterhub_key()
                        jh_endpoint = ''.join([jh_key['server'], '/hub/api/users/', update_email])
                        jh_headers = {'Authorization': 'token %s' % jh_key['secret']}
                        res = requests.post(jh_endpoint, headers=jh_headers)
                else:
                    raise Exception('Tried to register JH user on beanstalk')
            except Exception as jh_exc:
                log.error('Error posting user %s to JupyterHub' % update_email,
                          error=str(jh_exc))
            else:
                log.info('Updating user %s on JupyterHub. Result: %s' % (update_email, res.text))
        super(User, self)._update(properties, sheets)



USER_PAGE_VIEW_ATTRIBUTES = ['@id', '@type', 'uuid', 'lab', 'title', 'display_title']


@view_config(context=User, permission='view', request_method='GET', name='page')
@debug_log
def user_page_view(context, request, user_page_view_attributes = USER_PAGE_VIEW_ATTRIBUTES):
    return snovault_user_page_view(context, request, user_page_view_attributes)


@view_config(context=User.Collection, permission='add', request_method='POST',
             physical_path="/users")
@debug_log
def user_add(context, request):
    return snovault_user_add(context, request)



#@calculated_property(context=User, category='user_action')
#def impersonate(context, request):
#    return snovault_impersonate(context, request)



#@calculated_property(context=User, category='user_action')
#def profile(context, request):
#    return snovault_profile(context, request)



#@calculated_property(context=User, category='user_action')
#def submissions(request):
#    return snovault_submissions(request)
