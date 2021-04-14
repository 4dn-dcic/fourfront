"""The type file for microscopy configuration collection."""

from uuid import uuid4
from snovault import (
    collection,
    calculated_property,
    load_schema
)
from .base import (
    Item,
    ALLOW_OWNER_EDIT,
    ALLOW_CURRENT,
    DELETED,
    ONLY_ADMIN_VIEW,
    ALLOW_LAB_SUBMITTER_EDIT,
    ALLOW_VIEWING_GROUP_VIEW,
    ALLOW_ANY_USER_ADD
)


@collection(
    name='microscope-configurations',
    properties={
        'title': 'Microscope Configurations',
        'description': 'Collection of Metadata for microscope configurations of various Tiers',
    })
class MicroscopeConfiguration(Item):
    """The MicroscopeConfiguration class that holds configuration of a microscope."""

    item_type = 'microscope_configuration'
    schema = load_schema('encoded:schemas/microscope_configuration.json')
    STATUS_ACL = {
        'released'              : ALLOW_OWNER_EDIT + ALLOW_CURRENT,
        'deleted'               : ALLOW_OWNER_EDIT + DELETED,
        'draft'                 : ALLOW_OWNER_EDIT + ONLY_ADMIN_VIEW,
        'released to lab'       : ALLOW_OWNER_EDIT + ALLOW_LAB_SUBMITTER_EDIT,
        'released to project'   : ALLOW_OWNER_EDIT + ALLOW_VIEWING_GROUP_VIEW
    }

    def _update(self, properties, sheets=None):
        '''set microscope ID if empty
        '''
        if properties.get('microscope'):
            microscope = properties.get('microscope')
            if not microscope.get('ID'):
                microscope['ID'] = str(uuid4())
        super(MicroscopeConfiguration, self)._update(properties, sheets)

    @calculated_property(schema={
        "title": "Display Title",
        "description": "A calculated title for every object in 4DN",
        "type": "string"
    })
    def display_title(self, microscope, title=None):
        return microscope.get("Name") or title

    class Collection(Item.Collection):
        '''
        This extension of the default Item collection allows any User to create a new version of these.
        Emulates base.py Item collection setting of self.__acl__
        '''
        def __init__(self, *args, **kw):
            super(MicroscopeConfiguration.Collection, self).__init__(*args, **kw)
            self.__acl__ = ALLOW_ANY_USER_ADD