"""Access_key types file."""

from pyramid.view import view_config
from pyramid.security import (
    Allow,
    Deny,
    Authenticated,
    Everyone,
)
from pyramid.settings import asbool
from .base import (
    Item,
    DELETED,
    ONLY_ADMIN_VIEW_ACL,
)
from ..authentication import (
    generate_password,
    generate_user,
    CRYPT_CONTEXT,
)
from snovault import (
    collection,
    load_schema,
)
from snovault.crud_views import (
    collection_add,
    item_edit,
)
from snovault.validators import (
    validate_item_content_post,
)
from snovault.util import debug_log
from snovault.types.access_key import (
    AccessKey as SnovaultAccessKey,
    access_key_add as snovault_access_key_add,
    access_key_reset_secret as snovault_access_key_reset_secret,
    access_key_view_raw as snovault_access_key_view_raw
)


@collection(
    name='access-keys',
    unique_key='access_key:access_key_id',
    properties={
        'title': 'Access keys',
        'description': 'Programmatic access keys',
    },
    acl=[
        (Allow, Authenticated, 'add'),
        (Allow, 'group.admin', 'list'),
        (Allow, 'group.read-only-admin', 'list'),
        (Allow, 'remoteuser.INDEXER', 'list'),
        (Allow, 'remoteuser.EMBED', 'list'),
        (Deny, Everyone, 'list'),
    ])
class AccessKey(Item, SnovaultAccessKey):
    """AccessKey class."""

    item_type = 'access_key'
    schema = load_schema('encoded:schemas/access_key.json')
    name_key = 'access_key_id'
    embedded_list = []

    STATUS_ACL = {
        'current': [(Allow, 'role.owner', ['view', 'edit'])] + ONLY_ADMIN_VIEW_ACL,
        'deleted': DELETED,
    }

    def __ac_local_roles__(self):
        """grab and return user as owner."""
        owner = 'userid.%s' % self.properties['user']
        return {owner: 'role.owner'}

    class Collection(Item.Collection):
        pass


# access keys have view permissions for update so readonly admin and the like
# can create access keys to download files.
@view_config(context=AccessKey.Collection, request_method='POST',
             permission='add',
             validators=[validate_item_content_post])
@debug_log
def access_key_add(context, request):
    return snovault_access_key_add(context, request)


@view_config(name='reset-secret', context=AccessKey,
             permission='add',
             request_method='POST', subpath_segments=0)
@debug_log
def access_key_reset_secret(context, request):
    return snovault_access_key_reset_secret(context, request)


@view_config(context=AccessKey, permission='view_raw', request_method='GET',
             name='raw')
@debug_log
def access_key_view_raw(context, request):
    return snovault_access_key_view_raw(context, request)
