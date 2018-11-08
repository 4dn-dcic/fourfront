"""Abstract collection for UserContent and sub-classes of StaticSection, HiglassViewConfig, etc."""

import os, requests
from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema
)
from .base import (
    Item,
    ALLOW_CURRENT,
    DELETED,
    ALLOW_LAB_SUBMITTER_EDIT,
    ALLOW_VIEWING_GROUP_VIEW,
    ONLY_ADMIN_VIEW,
    ALLOW_ANY_USER_ADD
)
import uuid


@abstract_collection(
    name='user-content',
    unique_key='user_content:name',
    properties={
        'title': "User Content Listing",
        'description': 'Listing of all types of content which may be created by people.',
    })
class UserContent(Item):

    base_types = ['UserContent'] + Item.base_types
    schema = load_schema('encoded:schemas/user_content.json')
    embedded_list = ["submitted_by.display_title"]

    STATUS_ACL = {
        'released': ALLOW_CURRENT,
        'archived': ALLOW_CURRENT,
        'deleted': DELETED,
        'draft': ONLY_ADMIN_VIEW,
        'released to project': ALLOW_VIEWING_GROUP_VIEW,
        'archived to project': ALLOW_VIEWING_GROUP_VIEW
    }

    def _update(self, properties, sheets=None):
        if properties.get('name') is None and self.uuid is not None:
            properties['name'] = str(self.uuid)
        super(UserContent, self)._update(properties, sheets)



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
        'description': 'Dsiplays and view configurations for HiGlass',
    })
class HiglassViewConfig(UserContent):
    """
    Item type which contains a `view_config` property and other metadata.
    """

    item_type = 'higlass_view_config'
    schema = load_schema('encoded:schemas/higlass_view_config.json')

    STATUS_ACL = dict(UserContent.STATUS_ACL, released=ALLOW_ANY_USER_ADD)

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
        def __init__(self, *args, **kw):
            super(HiglassViewConfig.Collection, self).__init__(*args, **kw)
            # Emulates base.py Item.Collection
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

    # slugid.nice();
    #https://github.com/higlass/higlass/blob/v1.2.8/app/scripts/HiGlassComponent.js#L2546-L2626

    # always place on the bottom
    #const jsonString = JSON.stringify(lastView);
    #const newView = JSON.parse(jsonString);
    #newView.initialXDomain = this.xScales[newView.uid].domain();
    #newView.initialYDomain = this.yScales[newView.uid].domain();

    # Unique ID
    #newView.uid = slugid.nice();
    #newView.layout.i = newView.uid;

    # Get the initial X & Y Domain. Copy the domain from the current viewconf.

    # Generate a new unique id, or reuse the uuid?


    # Get the file list.
    new_file_uuids = request.params.get('files').split(',')

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
    # All files should have the same genome assembly (or have no assembly). Return an error if they don't match.
    if new_file_model.genome_assembly:
        for file in viewconf_files:
            # If it doesn't have a genome, skip.
            if not file.genome_assembly:
                continue
            if file.genome_assembly != new_file_model.genome_assembly:
                # TODO
                return None, "Genome Assemblies do not match, cannot add"

    # Get the new file's type.
    new_file_info = {
        "higlass_uid": new_file_model.higlass_uid,
        "higlass_type": "TODO",
        "dimensions": 0,
    }

    # Guess the number of dimensions based on the filetype.
    if new_file.file_type in ("chromefile", "contact matrix"):
        new_file_info["dimensions"] = 2
    elif new_file.file_type in ("bigwig"): # TODO. Other formats?
        new_file_info["dimensions"] = 1

    if new_file_info["dimensions"] == 0:
        return None, f"Unknown new file type {new_file.file_type}"

    # Find all of the files in the viewconf. Determine their type and their dimension (1 or 2).
    viewconf_files_by_position = {
        "top" : [],
        "left" : [],
        "center" : [],
    }

    for direction in ("top", "left", "center"):
        for new_view in viewconf.viewconfig.views:
            if direction == "top":
                tracks = new_view.tracks.top
            elif direction == "left":
                tracks = new_view.tracks.left
            elif direction == "center":
                tracks = new_view.tracks.center.contents

            for track in tracks:
                track_info = {
                    "higlass_uid": track["tilesetUid"],
                    "higlass_type": track["type"],
                    "dimensions": 0,
                }

                # Based on the type of higlass display, determine the file dimensions.
                if track_info["higlass_type"] in ("heatmap"):
                    track_info["dimensions"] = 2
                elif track_info["higlass_type"] in ("horizontal-line"):
                    track_info["dimensions"] = 1

                viewconf_files_by_position[direction].append(track_info)

    # If there are already 6 views, stop and return an error.
    views_count = len(viewconf.viewconfig.views)
    if views_count >= 6:
        return None, "You cannot have more than 6 views in a single display."

    # If the new file is 1-D, try to add it to the top section.
    if new_file_info["dimensions"] == 1:
        add_1d_file_to_higlass_viewconf(viewconf, viewconf_files_by_position, new_file)

    # If the new file is 2-D, try to add it to the center section.
    if new_file_info["dimensions"] == 2:
        add_2d_file_to_higlass_viewconf(viewconf, viewconf_files_by_position, new_file)

    # Resize the sections so they fit into a 12 x 12 grid.
    repack_higlass_views(viewconf, viewconf_files_by_position)

    # Success! Return the modified view conf.
    return viewconf, None

def add_1d_file_to_higlass_viewconf(viewconf, viewconf_files_by_position, new_file):
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
                top: [ ],
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

    # TODO
    new_view.tracks.top[0] = {
        tilesetUid: "QDutvmyiSrec5nX4pA5WGQ",
        server: "https://higlass.io/api/v1",
        minHeight: 55,
        position: "top",
        header: "",
        orientation: "1d-horizontal",
        type: "horizontal-line",
        options: {
            geneStrandSpacing: 4,
            geneLabelPosition: "outside",
            trackBorderColor: "black",
            valueScaling: "linear",
            geneAnnotationHeight: 10,
            labelColor: "black",
            mousePositionColor: "#999999",
            minusStrandColor: "red",
            showMousePosition: false,
            labelPosition: "hidden",
            coordSystem: "mm10",
            showTooltip: false,
            plusStandColor: "blue",
            name: "Gene Annotations (mm10)",
            trackBorderWidth: 0,
            fontSize: 11,
            plusStrandColor: "blue"
        },
        name: "Gene Annotations (mm10)", # TODO
        uid: "top-annotation-track", # TODO
        height: 55
    }

    new_view = base_view.deepcopy()
    new_view.uid = uuid.uuid4()
    new_view.layout.i = new_view.uid

    viewconf_files_by_position["top"].append({
        "higlass_uid": new_file.higlass_uid,
        "higlass_type": "TODO",
        "dimensions": 1,
    })

    viewconf.viewconfig.views.append(new_view)

def add_2d_file_to_higlass_viewconf(viewconf, viewconf_files_by_position, new_file):
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

    # TODO
    new_view.tracks.center[0]= {
        contents: [
            {
                server: "https://higlass.4dnucleome.org/api/v1",
                type: "heatmap",
                transforms: [],
                tilesetUid: "LTiacew8TjCOaP9gpDZwZw",
                uid: "GjuZed1ySGW1IzZZqFB9BA",
                resolutions: [],
                options: {},
                position: "center",
                name: "4DNFI1TBYKV3.mcool"
            }
        ],
        type: "combined",
        height: 250,
        options: { },
        uid: "center-mcool-track",
        position: "center"
    }
    new_view.tracks.center[0].contents[0].type = "heatmap"

    new_view = base_view.deepcopy()
    new_view.uid = uuid.uuid4()
    new_view.layout.i = new_view.uid

    viewconf_files_by_position["center"].append({
        "higlass_uid": new_file.higlass_uid,
        "higlass_type": "TODO",
        "dimensions": 2,
    })

    viewconf.viewconfig.views.append(new_view)

def repack_higlass_views(viewconf, viewconf_files_by_position):
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
    horizontal_1d_views = len(viewconf_files_by_position["left"])
    vertical_1d_views = len(viewconf_files_by_position["top"])

    # Count the number of 2-D views.
    count_2d_views = len(viewconf_files_by_position["center"])

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
            y += height # TODO I don't think I can increment the height yet
            higlass_view.layout.h = height

""" End Chad's section
"""
