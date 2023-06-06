"""Access_key types file."""

from snovault.types.access_key import AccessKey as SnovaultAccessKey
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

def includeme(config):
    config.include("snovault.views.access_key") # xyzzy
    config.scan()


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
#class AccessKey(Item):
class AccessKey(Item, SnovaultAccessKey):
    def __new__(cls, *args, **kwargs): # xyzzy
        pdb.set_trace()
        return super().__new__(cls, *args, **kwargs)
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

    def __json__(self, request):
        """delete the secret access key has from the object when used."""
        properties = super(AccessKey, self).__json__(request)
        del properties['secret_access_key_hash']
        return properties

    def update(self, properties, sheets=None):
        """smth."""
        # make sure PUTs preserve the secret access key hash
        if 'secret_access_key_hash' not in properties:
            new_properties = self.properties.copy()
            new_properties.update(properties)
            properties = new_properties
        self._update(properties, sheets)

    class Collection(Item.Collection):
        pass

# xyzzy
#from snovault.views.access_key import access_key_add, access_key_reset_secret, access_key_view_raw
