"""Abstract collection for UserContent and sub-classes of StaticSection, HiglassViewConfig, etc."""

import os, requests
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
    ALLOW_LAB_SUBMITTER_EDIT,
    ALLOW_VIEWING_GROUP_VIEW,
    ONLY_ADMIN_VIEW,
    ALLOW_OWNER_EDIT,
    ALLOW_ANY_USER_ADD,
    get_item_if_you_can
)
import uuid


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
    embedded_list = ["submitted_by.display_title"]

    STATUS_ACL = {              # Defaults + allow owner to edit (in case owner has no labs or submit_for)
        'released'              : ALLOW_OWNER_EDIT + ALLOW_CURRENT,
        'deleted'               : ALLOW_OWNER_EDIT + DELETED,
        'draft'                 : ALLOW_OWNER_EDIT + ALLOW_LAB_SUBMITTER_EDIT,
        'released to project'   : ALLOW_OWNER_EDIT + ALLOW_VIEWING_GROUP_VIEW,
        # 'archived'              : ALLOW_OWNER_EDIT + ALLOW_CURRENT,
        # 'archived to project'   : ALLOW_OWNER_EDIT + ALLOW_VIEWING_GROUP_VIEW
    }

    def _update(self, properties, sheets=None):
        if properties.get('name') is None and self.uuid is not None:
            properties['name'] = str(self.uuid)
        super(UserContent, self)._update(properties, sheets)

    @classmethod
    def create(cls, registry, uuid, properties, sheets=None):
        submitted_by_uuid   = properties.get('submitted_by')
        lab_schema          = cls.schema and cls.schema.get('properties', {}).get('lab')
        award_schema        = cls.schema and cls.schema.get('properties', {}).get('award')
        if (
            not submitted_by_uuid                               # Shouldn't happen
            or (not lab_schema and not award_schema)            # If not applicable for Item type (shouldn't happen as props defined on UserContent schema)
            or ('lab' in properties or 'award' in properties)   # If values exist already - ideal case - occurs for general submission process(es)
        ):
            # Default for all other Items
            return super(UserContent, cls).create(registry, uuid, properties, sheets)

        submitted_by_item = registry[STORAGE].get_by_uuid(submitted_by_uuid)

        if submitted_by_item:
            # All linkTo property values, if present, are UUIDs
            if 'lab' not in properties and 'lab' in submitted_by_item.properties:
                # Use lab of submitter - N.B. this differs from other Items where lab comes from 'submits_for' list.
                properties['lab'] = submitted_by_item.properties['lab']

            if 'award' not in properties and 'lab' in submitted_by_item.properties:
                lab_item = registry[STORAGE].get_by_uuid(submitted_by_item.properties['lab'])
                if lab_item and len(lab_item.properties.get('awards', [])) > 0:
                    # Using first award as default/fallback when award not explicitly selected/sent.
                    properties['award'] = lab_item.properties['awards'][0]

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




@collection(
    name='higlass-view-configs',
    properties={
        'title': 'HiGlass Displays',
        'description': 'Displays and view configurations for HiGlass',
    })
class HiglassViewConfig(UserContent):
    """
    Item type which contains a `view_config` property and other metadata.
    """

    item_type = 'higlass_view_config'
    schema = load_schema('encoded:schemas/higlass_view_config.json')

    #@calculated_property(schema={
    #    "title": "ViewConfig Files",
    #    "description": "List of files which are defined in ViewConfig",
    #    "type": "array",
    #    "linkTo" : "File"
    #})
    #def viewconfig_files(self, request):
    #    '''
    #    TODO: Calculate which files are defined in viewconfig, if any.
    #    '''
    #    return None


    #@calculated_property(schema={
    #    "title": "ViewConfig Tileset UIDs",
    #    "description": "List of UIDs which are defined in ViewConfig",
    #    "type": "array",
    #    "items" : {
    #        "type" : "string"
    #    }
    #})
    #def viewconfig_tileset_uids(self, request):
    #    '''
    #    TODO: Calculate which tilesetUids are defined in viewconfig, if any.
    #    '''
    #    return None

    class Collection(Item.Collection):
        '''
        This extension of the default Item collection allows any User to create a new version of these.
        Emulates base.py Item collection setting of self.__acl__

        TODO:
            Eventually we can move this up to UserContent or replicate it on JupyterNotebook if want any
            User to be able to create new one.
        '''
        def __init__(self, *args, **kw):
            super(HiglassViewConfig.Collection, self).__init__(*args, **kw)
            self.__acl__ = ALLOW_ANY_USER_ADD



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

""" Begin Chad's section
"""
@view_config(name='add_files', context=File, request_method='PATCH',
             permission='edit')
def add_files_to_higlass_viewconf(context, request):
    """ Add multiple files to the given Higlass view config.
    """
    # Get the base view conf.
    base_higlass_viewconf_uuid = request.params.get('higlass_viewconf', None)

    # TODO There is a viewconf stored in the database, and there is one (or one can be generated on demand) for the curretn front end state. You want the latter, right? Then, you should probably make a call to a higlass api to generate a viewconf.

    # TODO If there is no base viewconf, create a new one.

    base_higlass_viewconf = request.registry[CONNECTION].storage.get_item_if_you_can(
        base_higlass_viewconf_uuid, '/higlass-view-conf/'
    ) # TODO What's CONNECTION? How do I clone?

    # TODO Clone the base view conf so the original remains unchanged.
    higlass_viewconf = base_higlass_viewconf.copy() # TODO

    # Get the file list.
    new_file_uuids = request.params.get('files').split(',')
    new_viewconf = None

    for file_uuid in new_file_uuids:
        # Get the new file.
        new_file_model = request.registry[CONNECTION].storage.get_item_if_you_can(file_uuid, '/files-processed/') # TODO What's CONNECTION

        # Try to add the new file to the given viewconf.
        new_viewconf, errors = add_single_file_to_higlass_viewconf(higlass_viewconf, new_file_model)

        # If any of the new files failed, abandon progress and return failure.
        if errors:
            # TODO
            return {
                "success" : False,
                "error" : "stuff failed"
            }

    # TODO If all of the files were added successfuly, save to the database and commit.


    # Return success.
    return {
        "success" : True,
        "viewconf" : new_viewconf,
    }

def add_single_file_to_higlass_viewconf(viewconf, new_file_model):
    """ Add a single file to the view config.
    """

    # Find all of the files in the viewconf. Determine their type and their dimension (1 or 2).
    viewconf_file_counts_by_position = {
        "top" : 0,
        "left" : 0,
        "center" : 0,
    }

    for direction in ("top", "left", "center"):
        for new_view in viewconf.viewconfig.views:
            if direction == "top":
                tracks = new_view.tracks.top
            elif direction == "left":
                tracks = new_view.tracks.left
            elif direction == "center":
                tracks = new_view.tracks.center.contents

            # All files should have the same genome assembly (or have no assembly). Return an error if they don't match.
            if new_file_model.genome_assembly:
                for track in tracks:
                    # If it doesn't have a genome, skip.
                    if not "options" in track:
                        continue
                    if not "coordSystem" in track["options"]:
                        continue
                    if track["options"]["coordSystem"] != new_file_model.genome_assembly:
                        # TODO
                        return None, "Genome Assemblies do not match, cannot add"

            viewconf_file_counts_by_position[direction] += len(tracks)

    # If there are already 6 views, stop and return an error.
    views_count = len(viewconf.viewconfig.views)
    if views_count >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # Based on the filetype's dimensions, try to add the file to the viewconf
    # TODO Handle other dimensions
    if new_file_model.file_type in ("chromefile", "contact matrix"):
        add_2d_file_to_higlass_viewconf(viewconf, viewconf_file_counts_by_position, new_file_model.higlass_uid)
    elif new_file_model.file_type in ("bigwig"):
        add_1d_file_to_higlass_viewconf(viewconf, viewconf_file_counts_by_position, new_file_model.higlass_uid)
    else:
        return None, f"Unknown new file type {new_file.file_type}"

    # Resize the sections so they fit into a 12 x 12 grid.
    repack_higlass_views(viewconf, viewconf_file_counts_by_position)

    # Success! Return the modified view conf.
    return viewconf, None

def add_1d_file_to_higlass_viewconf(viewconf, viewconf_file_counts_by_position, new_file_higlass_uid):
    """Decide on the best location to add a 1-D file to the Higlass View Config's top track.
    """

    # Choose the first available view. If there are no views, make up some defaults.
    base_view = None

    if viewconf.viewconfig.views:
        base_view = viewconf.viewconfig.views[0]
    else:
        base_view = {
            initialYDomain: [
                -10000,
                10000
            ],
            initialXDomain: [
                -10000,
                10000
            ],
            tracks: {
                right: [ ],
                gallery: [ ],
                left: [ ],
                whole: [ ],
                bottom: [ ],
                top: [
                    {}
                ],
                center: [ ],
            },
            uid: "Not set yet",
            layout: {
                w: 12,
                static: true,
                h: 12,
                y: 0,
                i: "Not set yet",
                moved: false,
                x: 0
            }
        }

    new_view = base_view.deepcopy()
    new_view["uid"] = uuid.uuid4()
    new_view["layout"]["i"] = new_view["uid"]

    # Get the tileset information for this file
    tileset_info = get_higlass_tileset_info_from_file(new_file_higlass_uid)

    new_view["tracks"]["top"][0]["tilesetUid"] = new_file_higlass_uid
    new_view["tracks"]["top"][0]["name"] = tileset_info["name"]
    new_view["tracks"]["top"][0]["type"] = "horizontal-line"
    new_view["tracks"]["top"][0]["options"]["coordSystem"] = tileset_info["coordSystem"]
    new_view["tracks"]["top"][0]["options"]["name"] = tileset_info["name"]

    viewconf_file_counts_by_position["top"] += 1

    viewconf.viewconfig.views.append(new_view)
    # exportAsViewConfString
    # zoomToDataExtent

def add_2d_file_to_higlass_viewconf(viewconf, viewconf_file_counts_by_position, new_file):
    """Decide on the best location to add a 2-D file to the Higlass View Config's center track.
    """

    # Choose the first available view. If there are no views, make up some defaults.
    base_view = None

    if viewconf.viewconfig.views:
        base_view = viewconf.viewconfig.views[0]
    else:
        base_view = {
            initialYDomain: [
                -10000,
                10000
            ],
            initialXDomain: [
                -10000,
                10000
            ],
            tracks: {
                right: [ ],
                gallery: [ ],
                left: [ ],
                whole: [ ],
                bottom: [ ],
                top: [ ],
                center: [
                    {
                        contents: {}
                    }
                ],
            },
            uid: "Not set yet",
            layout: {
                w: 12,
                static: true,
                h: 12,
                y: 0,
                i: "Not set yet",
                moved: false,
                x: 0
            }
        }

    # Get the tileset information for this file
    tileset_info = get_higlass_tileset_info_from_file(new_file_higlass_uid)

    # TODO Do I need to add 1-D tracks?
    new_view["tracks"]["center"][0]["contents"]["tilesetUid"] = new_file_higlass_uid
    new_view["tracks"]["center"][0]["contents"]["name"] = tileset_info["name"]
    new_view["tracks"]["center"][0]["contents"]["type"] = "combined"
    new_view["tracks"]["center"][0]["contents"]["options"]["coordSystem"] = tileset_info["coordSystem"]
    new_view["tracks"]["center"][0]["contents"]["options"]["name"] = tileset_info["name"]

    viewconf_file_counts_by_position["center"] += 1

    viewconf.viewconfig.views.append(new_view)

def repack_higlass_views(viewconf, viewconf_file_counts_by_position):
    """Set up the higlass views.
    """

    views_count = len(viewconf.viewconfig.views)

    # No views are present, stop
    if views_count < 1:
        return

    # Too many views to deal with, stop
    if views_count > 6:
        return

    # Here are lookup tables to decide on the size of each 1-D and 2-D components per axis.
    # * 2-D content should take up the majority of each axis.
    # * 2-D content should be at least twice as large as 1-D content.
    # * Size for all components should not exceed 12 units.

    # Lookup is organized by the number of 1-D items, then the number of 2-D items. 2-D items will never exceed 3 (because we're using a 3x2 arrangement,) and 1-D items will never exceed 6 (since we assume a max of 6 views.)
    size_for_1d_items = {
        1 : {
            0 : 12,
            1 : 2,
            2 : 2,
            3 : 3
        },
        2 : {
            0 : 6,
            1 : 2,
            2 : 1,
            3 : 1
        },
        3 : {
            0 : 4,
            1 : 1,
            2 : 1,
            3 : 1
        },
        4 : {
            0 : 3,
            1 : 1,
            2 : 1,
        },
        5 : {
            0 : 2,
            1 : 1,
        },
        6 : {
            0 : 2,
        },
    }
    size_for_2d_items = {
        0 : {
            1 : 12,
            2 : 6,
            3 : 4
        },
        1 : {
            1 : 10,
            2 : 5,
            3 : 3
        },
        2 : {
            1 : 8,
            2 : 5,
            3 : 3
        },
        3 : {
            1 : 9,
            2 : 4,
            3 : 3
        },
        4 : {
            1 : 8,
            2 : 4,
        },
        5 : {
            1 : 7,
        },
    }

    # Count the number of 1-D views.
    horizontal_1d_views = viewconf_file_counts_by_position["left"]
    vertical_1d_views = viewconf_file_counts_by_position["top"]

    # Count the number of 2-D views.
    count_2d_views = viewconf_file_counts_by_position["center"]

    # Set up the higlass views so they fit in a 3 x 2 grid. The packing order is:
    # 1 2 5
    # 3 4 6
    horizontal_2d_views = 0
    if count_2d_views == 1:
        horizontal_2d_views = 1
    elif count_2d_views in (2, 3, 4):
        horizontal_2d_views = 2
    elif count_2d_views in (5, 6):
        horizontal_2d_views = 3

    vertical_2d_views = 0
    if count_2d_views in (1, 2):
        vertical_2d_views = 1
    elif count_2d_views > 2:
        vertical_2d_views = 2

    # Handle horizontal placement.
    x = 0
    for higlass_view in viewconf.viewconfig.views:
        # For each left track,
        for track in higlass_view.tracks.left:
            # Set the x location, then increment it.
            higlass_view.layout.x = x
            width = size_for_1d_items[horizontal_1d_views][horizontal_2d_views]
            x += width
            higlass_view.layout.w = width

        # For each top track,
        for track in higlass_view.tracks.top:
            # Set the x location.
            higlass_view.layout.x = x

        # For each center track,
        for track in higlass_view.tracks.center.contents:
            # Set the x location, then increment it.
            higlass_view.layout.x = x
            width = size_for_2d_items[horizontal_1d_views][horizontal_2d_views]
            x += width
            higlass_view.layout.w = width

    # Handle vertical placement.
    y = 0
    for higlass_view in viewconf.viewconfig.views:
        # For each left track,
        for track in higlass_view.tracks.left:
            # Set the y location.
            higlass_view.layout.y = y

        # For each top track,
        for track in higlass_view.tracks.top:
            # Set the y location, then increment it.
            higlass_view.layout.y = y
            height = size_for_1d_items[horizontal_1d_views][horizontal_2d_views]
            y += height
            higlass_view.layout.h = height

        # For each center track,
        for track in higlass_view.tracks.center.contents:
            # Set the y location, then increment it.
            higlass_view.layout.y = y
            height = size_for_2d_items[horizontal_1d_views][horizontal_2d_views]
            y += height
            higlass_view.layout.h = height

def get_higlass_tileset_info_from_file(new_file_higlass_uid):
    """ Contacts higlass servers and returns a dict.
    """
    # TODO if the file lacks higlass_uid, feel free to bail

    # Get the Higlass server.
    higlass_server_urls = ("https://higlass.io/api/v1", "https://higlass.4dnucleome.org/api/v1/")

    # TODO: Generate auth headers for requests to higlass

    for server_url in higlass_server_urls:
        # Query the server.
        #TODO auth = HTTPBasicAuth(settings.PHENOTIPSUSER, settings.PHENOTIPSPASSWORD)
        headers = {'Content-Type': 'application/json'}

        try:
            response = requests.get(
                endpoint_url,
                #auth=auth,
                headers=headers,
                verify=False
            )
        except Exception, e:
            # TODO log the exception
            continue

        # If it says no info was found, skip.
        if "error" in response[new_file_higlass_uid]:
            continue

        # Extract the relevant fields
        return response[new_file_higlass_uid]

    # At this point, none of the servers replied anything useful.
    return None

""" End Chad's section
"""
