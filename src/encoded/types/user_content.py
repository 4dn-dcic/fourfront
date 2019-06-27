"""Abstract collection for UserContent and sub-classes of StaticSection, HiglassViewConfig, etc."""

from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema
)
from snovault.interfaces import STORAGE
from .base import (
    Item,
    ALLOW_CURRENT,
    DELETED,
    ALLOW_PROJECT_MEMBER_VIEW,
    ALLOW_INSTITUTION_MEMBER_VIEW,
    ONLY_ADMIN_VIEW,
    ALLOW_OWNER_EDIT
)
import os
import requests

@abstract_collection(
    name='user-contents',
    unique_key='user_content:name',
    properties={
        'title': "User Content Listing",
        'description': 'Listing of all types of content which may be created by people.',
    })
class UserContent(Item):

    base_types = ['UserContent'] + Item.base_types
    schema = load_schema('encoded:schemas/user_content.json')
    embedded_list = []
    # embedded_list = lab_award_attribution_embed_list

    STATUS_ACL = {              # Defaults + allow owner to edit (in case owner has no labs or submit_for)
        'released': ALLOW_OWNER_EDIT + ALLOW_CURRENT,
        'deleted': ALLOW_OWNER_EDIT + DELETED,
        'draft': ALLOW_OWNER_EDIT + ONLY_ADMIN_VIEW,
        'released to project': ALLOW_OWNER_EDIT + ALLOW_PROJECT_MEMBER_VIEW,
        'released to institution': ALLOW_OWNER_EDIT + ALLOW_INSTITUTION_MEMBER_VIEW
    }

    @calculated_property(schema={
        "title": "Content",
        "description": "Content (unused)",
        "type": "string"
    })
    def content(self, request):
        return None

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of this Item (unused)",
        "type": "string"
    })
    def filetype(self, request):
        return None

    def _update(self, properties, sheets=None):
        if properties.get('name') is None and self.uuid is not None:
            properties['name'] = str(self.uuid)
        super(UserContent, self)._update(properties, sheets)

    @classmethod
    def create(cls, registry, uuid, properties, sheets=None):
        submitted_by_uuid = properties.get('submitted_by')
        institution_schema = cls.schema and cls.schema.get('properties', {}).get('institution')
        project_schema = cls.schema and cls.schema.get('properties', {}).get('project')
        if (
            not submitted_by_uuid                               # Shouldn't happen
            or (not institution_schema and not project_schema)            # If not applicable for Item type (shouldn't happen as props defined on UserContent schema)
            or ('institution' in properties or 'project' in properties)   # If values exist already - ideal case - occurs for general submission process(es)
        ):
            # Default for all other Items
            return super(UserContent, cls).create(registry, uuid, properties, sheets)

        submitted_by_item = registry[STORAGE].get_by_uuid(submitted_by_uuid)

        if submitted_by_item:
            # All linkTo property values, if present, are UUIDs
            if 'institution' not in properties and 'institution' in submitted_by_item.properties:
                # Use institution of submitter
                properties['institution'] = submitted_by_item.properties['institution']

            if 'project' not in properties and 'project' in submitted_by_item.properties:
                # Use project of submitter
                properties['project'] = submitted_by_item.properties['project']

        return super(UserContent, cls).create(registry, uuid, properties, sheets)


@collection(
    name='static-sections',
    unique_key='user_content:name',
    properties={
        'title': 'Static Sections',
        'description': 'Static Sections for the Portal',
    })
class StaticSection(UserContent):
    """The Software class that contains the software... used."""
    item_type = 'static_section'
    schema = load_schema('encoded:schemas/static_section.json')

    @calculated_property(schema={
        "title": "Content",
        "description": "Content for the page",
        "type": "string"
    })
    def content(self, request, body=None, file=None):

        if isinstance(body, str) or isinstance(body, dict) or isinstance(body, list):
            # Don't need to load in anything. We don't currently support dict/json body (via schema) but could in future.
            return body

        if isinstance(file, str):
            if file[0:4] == 'http' and '://' in file[4:8]:  # Remote File
                return get_remote_file_contents(file)
            else:                                           # Local File
                file_path = os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + "/../../.." + file)   # Go to top of repo, append file
                return get_local_file_contents(file_path)

        return None

    @calculated_property(schema={
        "title": "File Type",
        "description": "Type of file used for content",
        "type": "string"
    })
    def filetype(self, request, body=None, file=None, options=None):
        if options and options.get('filetype') is not None:
            return options['filetype']
        if isinstance(body, str):
            return 'txt'
        if isinstance(body, dict) or isinstance(body, list):
            return 'json'
        if isinstance(file, str):
            filename_parts = file.split('.')
            if len(filename_parts) > 1:
                return filename_parts[len(filename_parts) - 1]
            else:
                return 'txt' # Default if no file extension.
        return None


def get_local_file_contents(filename, contentFilesLocation=None):
    if contentFilesLocation is None:
        full_file_path = filename
    else:
        full_file_path = contentFilesLocation + '/' + filename
    if not os.path.isfile(full_file_path):
        return None
    file = open(full_file_path, encoding="utf-8")
    output = file.read()
    file.close()
    return output


def get_remote_file_contents(uri):
    resp = requests.get(uri)
    return resp.text
