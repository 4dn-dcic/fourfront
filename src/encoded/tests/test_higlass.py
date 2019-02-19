import pytest
from .test_file import mcool_file_json, bedGraph_file_json, bigwig_file_json, bigbed_file_json, bed_beddb_file_json, beddb_file_json, chromsizes_file_json
pytestmark = pytest.mark.working

# Test Higlass display endpoints.

@pytest.fixture
def higlass_mcool_viewconf(testapp):
    """ Creates a fixture for an mcool Higlass view config.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.

    Returns:
        Dictionary representing the JSON response after posting the view config.
    """
    viewconf = {
        "title" : "Test MCOOL Display",
        "description" : "An MCOOL file track plus annotations for gene GRCm38 (tileset 'IUcqX4GzTNWJIzE2-b_sZg') and chromosome 'JXbq7f-GTeq3FJy_ilIomQ'.",
        "uuid" : "00000000-1111-0000-1111-000000000002",
        "name" : "higlass-mcool-test-view",
        "genome_assembly" : "GRCm38",
        "viewconfig" : {
            "editable": True,
            "zoomFixed": False,
            "exportViewUrl":"/api/v1/viewconfs",
            "zoomLocks":{
                "locksByViewUid":{

                },
                "locksDict":{

                }
            },
            "locationLocks":{
                "locksByViewUid":{

                },
                "locksDict":{

                }
            },
            "trackSourceServers":[
                "https://higlass.4dnucleome.org/api/v1"
            ],
            "views":[
                {
                    "uid":"view-4dn-mcool-0",
                    "layout":{
                        "w":12,
                        "h":12,
                        "x":0,
                        "y":0,
                        "i":"view-4dn-mcool-0",
                        "moved":False,
                        "static":True
                    },
                    "initialXDomain":[
                        102391829.2052902,
                        2938891536.27695
                    ],
                    "initialYDomain":[
                        129711724.73566854,
                        1810982460.1999617
                    ],
                    "autocompleteSource":"/api/v1/suggest/?d=IUcqX4GzTNWJIzE2-b_sZg&",
                    "genomePositionSearchBox":{
                        "autocompleteServer":"https://higlass.4dnucleome.org/api/v1",
                        "autocompleteId":"IUcqX4GzTNWJIzE2-b_sZg",
                        "chromInfoServer":"https://higlass.4dnucleome.org/api/v1",
                        "chromInfoId":"GRCm38",
                        "visible":True
                    },
                    "tracks":{
                        "top":[
                            {
                                "name":"Gene Annotations (GRCm38)",
                                "server":"https://higlass.4dnucleome.org/api/v1",
                                "tilesetUid":"IUcqX4GzTNWJIzE2-b_sZg",
                                "type":"horizontal-gene-annotations",
                                "options":{
                                    "labelColor":"black",
                                    "labelPosition":"hidden",
                                    "plusStrandColor":"black",
                                    "minusStrandColor":"black",
                                    "trackBorderWidth":0,
                                    "coordSystem":"GRCm38",
                                    "trackBorderColor":"black",
                                    "name":"Gene Annotations (GRCm38)",
                                    "showMousePosition":False,
                                    "mousePositionColor":"#999999"
                                },
                                "minHeight":55,
                                "height":55,
                                "header":"",
                                "position":"top",
                                "orientation":"1d-horizontal",
                                "uid":"top-annotation-track"
                            },
                            {
                                "name":"Chromosome Axis",
                                "server":"https://higlass.4dnucleome.org/api/v1",
                                "tilesetUid":"JXbq7f-GTeq3FJy_ilIomQ",
                                "type":"horizontal-chromosome-labels",
                                "local":True,
                                "minHeight":30,
                                "thumbnail":None,
                                "options":{
                                    "coordSystem":"GRCm38",
                                    "showMousePosition":False,
                                    "mousePositionColor":"#999999"
                                },
                                "height":30,
                                "position":"top",
                                "orientation":"1d-horizontal",
                                "uid":"top-chromosome-track"
                            }
                        ],
                        "left":[
                            {
                                "name":"Gene Annotations (GRCm38)",
                                "server":"https://higlass.4dnucleome.org/api/v1",
                                "tilesetUid":"IUcqX4GzTNWJIzE2-b_sZg",
                                "uid":"left-annotation-track",
                                "type":"vertical-gene-annotations",
                                "options":{
                                    "labelColor":"black",
                                    "labelPosition":"hidden",
                                    "plusStrandColor":"black",
                                    "minusStrandColor":"black",
                                    "trackBorderWidth":0,
                                    "trackBorderColor":"black",
                                    "coordSystem":"GRCm38",
                                    "name":"Gene Annotations (GRCm38)",
                                    "showMousePosition":False,
                                    "mousePositionColor":"#999999"
                                },
                                "width":55,
                                "header":"",
                                "orientation":"1d-vertical",
                                "position":"left"
                            },
                            {
                                "name":"Chromosome Axis",
                                "server":"https://higlass.4dnucleome.org/api/v1",
                                "tilesetUid":"JXbq7f-GTeq3FJy_ilIomQ",
                                "uid":"left-chromosome-track",
                                "type":"vertical-chromosome-labels",
                                "options":{
                                    "showMousePosition":False,
                                    "mousePositionColor":"#999999"
                                },
                                "width":20,
                                "minWidth":20,
                                "orientation":"1d-vertical",
                                "position":"left"
                            }
                        ],
                        "center":[
                            {
                                "uid":"center-mcool-track",
                                "type":"combined",
                                "height":250,
                                "contents":[
                                    {
                                        "server":"https://higlass.4dnucleome.org/api/v1",
                                        "tilesetUid":"LTiacew8TjCOaP9gpDZwZw",
                                        "type":"heatmap",
                                        "position":"center",
                                        "uid":"GjuZed1ySGW1IzZZqFB9BA",
                                        "name":"4DNFI1TBYKV3.mcool",
                                        "options":{
                                            "backgroundColor":"#eeeeee",
                                            "labelPosition":"bottomRight",
                                            "coordSystem":"GRCm38",
                                            "colorRange":[
                                                "white",
                                                "rgba(245,166,35,1.0)",
                                                "rgba(208,2,27,1.0)",
                                                "black"
                                            ],
                                            "maxZoom":None,
                                            "colorbarPosition":"topRight",
                                            "trackBorderWidth":0,
                                            "trackBorderColor":"black",
                                            "heatmapValueScaling":"log",
                                            "showMousePosition":False,
                                            "mousePositionColor":"#999999",
                                            "showTooltip":False,
                                            "name":"4DNFI1TBYKV3.mcool",
                                            "scaleStartPercent":"0.00000",
                                            "scaleEndPercent":"1.00000"
                                        },
                                        "transforms":[
                                            {
                                                "name":"KR",
                                                "value":"KR"
                                            },
                                            {
                                                "name":"ICE",
                                                "value":"weight"
                                            },
                                            {
                                                "name":"VC",
                                                "value":"VC"
                                            },
                                            {
                                                "name":"VC_SQRT",
                                                "value":"VC_SQRT"
                                            }
                                        ],
                                        "resolutions":[
                                            1000,
                                            2000,
                                            5000,
                                            10000,
                                            25000,
                                            50000,
                                            100000,
                                            250000,
                                            500000,
                                            1000000,
                                            2500000,
                                            5000000,
                                            10000000
                                        ]
                                    }
                                ],
                                "position":"center",
                                "options":{}
                            }
                        ],
                        "right":[],
                        "bottom":[],
                        "whole":[],
                        "gallery":[]
                    }
                }
            ],
            "valueScaleLocks":{
                "locksByViewUid":{},
                "locksDict":{}
            }
        }
    }
    return testapp.post_json('/higlass-view-configs/', viewconf).json

@pytest.fixture
def higlass_blank_viewconf(testapp):
    """ Creates a fixture for a blank Higlass view config (lacks any files or genome assembly).

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.

    Returns:
        Dictionary representing the JSON response after posting the blank view config.
    """
    viewconf = {
        "title" : "Empty Higlass Viewconfig",
        "description" : "No files in viewconf, ready to clone.",
        "uuid" : "00000000-1111-0000-1111-000000000000",
        "name" : "empty-higlass-viewconf",
        "genome_assembly" : "GRCm38",
        "viewconfig" : {
            "editable": True,
            "zoomFixed": False,
            "trackSourceServers": [
                "//higlass.4dnucleome.org/api/v1"
            ],
            "exportViewUrl": "/api/v1/viewconfs",
            "views": [
                {
                    "uid": "aa",
                    "initialXDomain": [
                        -167962308.59835115,
                        3260659599.528857
                    ],
                    "chromInfoPath": "//s3.amazonaws.com/pkerp/data/hg19/chromSizes.tsv",
                    "tracks": {
                    "top": [],
                    "left": [],
                    "center": [
                        {
                            "contents" : []
                        }
                    ],
                    "right": [],
                    "bottom": [],
                    "whole": [],
                    "gallery": []
                    },
                    "layout": {
                        "w": 12,
                        "h": 12,
                        "x": 0,
                        "y": 0,
                        "i": "aa",
                        "moved": False,
                        "static": False
                    },
                    "initialYDomain": [
                        549528857.4793874,
                        2550471142.5206127
                    ]
                }
            ],
            "zoomLocks": {
                "locksByViewUid": {},
                "locksDict": {}
            },
            "locationLocks": {
                "locksByViewUid": {},
                "locksDict": {}
            },
            "valueScaleLocks": {
                "locksByViewUid": {},
                "locksDict": {}
            }
        }
    }
    return testapp.post_json('/higlass-view-configs/', viewconf).json

def assert_true(bool_to_test, comment=""):
    """ Raises AssertionError if bool is not true.
    Args:
        bool(boolean): Value to be asserted.
        comment(str, optional): String to help explain the error.

    Returns:
        Nothing

    Raises:
        AssertionError: if bool does not evaluate to True.
    """
    if not bool_to_test:
        raise AssertionError(comment)

def test_higlass_noop(testapp, higlass_mcool_viewconf):
    """ Test the python endpoint exists.
    Given a viewconf and no experiments, the viewconf should remain unchanged.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add nothing to the viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files' : [],
    })
    new_higlass_json = response.json["new_viewconfig"]

    # The new viewconf should be a subset of the old one.
    assert_true(len(higlass_json["viewconfig"]["views"]) == len(new_higlass_json["views"]))
    assert_true(len(new_higlass_json["views"]) == 1)
    for index in range(len(new_higlass_json["views"])):
        new_higlass = new_higlass_json["views"][index]
        old_higlass = higlass_json["viewconfig"]["views"][index]
        for key in new_higlass:
            assert_true(old_higlass[key] == new_higlass[key])

def test_add_mcool(testapp, higlass_blank_viewconf, mcool_file_json):
    """ Don't pass in an existing higlass viewconf, but do add a file.
    Expect a new higlass view containing the file.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_blank_viewconf(obj): Empty Higlass view configuration with no file or genome assembly.
        mcool_file_json(dict): Fixture refers to an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    genome_assembly = "GRCm38"

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = genome_assembly
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Try to create a view, adding a file but no base view.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_view_json = response.json["new_viewconfig"]

    assert_true(response.json["new_genome_assembly"] == genome_assembly)

    # There should be 1 view.
    assert_true(len(new_higlass_view_json["views"]) == 1)

    view = new_higlass_view_json["views"][0]

    assert_true("layout" in view)
    assert_true("uid" in view)
    assert_true("tracks" in view)
    assert_true("center" in view["tracks"])
    assert_true(len(view["tracks"]["center"]) == 1)

    center_track = view["tracks"]["center"][0]
    assert_true(center_track["type"] == "combined")
    assert_true("contents" in center_track)

    # The contents should have the mcool's heatmap.
    contents = center_track["contents"]
    assert_true(len(contents) == 1)

    # The central contents should have the mcool file.
    if "tilesetUid" in contents and contents[0]["tilesetUid"] == mcool_file_json['higlass_uid']:
        assert_true(track["type"] == "heatmap")

def test_add_bedGraph_higlass(testapp, higlass_mcool_viewconf, bedGraph_file_json):
    """ Given a viewconf with an mcool file, the viewconf should add a bedGraph on top.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bedGraph_file_json(dict): Fixture refers to a bedgraph file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Get a bedGraph file to add.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['md5sum'] = '00000000000000000000000000000001'
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the bedGraph to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # Make sure the bedGraph has been added above the mcool file.
    assert_true(len(new_higlass_json["views"]) == 1)

    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    # Assert_true(there is still 1 central view)
    assert_true(len(tracks["center"][0]["contents"]) == 1)
    assert_true("mcool" in tracks["center"][0]["contents"][0]["name"])

    # Only one new top track should have appeared.
    assert_true(len(tracks["left"]) == len(old_tracks["left"]))
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

def test_add_bedGraph_to_bedGraph(testapp, higlass_blank_viewconf, bedGraph_file_json):
    """ Given a viewconf with an mcool file, the viewconf should add a bedGraph on top.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_blank_viewconf(obj): Empty Higlass view configuration with no file or genome assembly.
        bedGraph_file_json(dict): Fixture refers to a bedgraph file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Add the bedGraph file with a higlass uid and a genome asssembly.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]

    # Add a higlass file and get the json.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000000"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Add a bedGraph file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)

    assert_true(len(new_higlass_json["views"]) == 1)
    assert_true(len(new_higlass_json["views"][0]["tracks"]["top"]) == 1)

    # Add another bedGraph file. Make sure the bedGraphs are stacked atop each other.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)

    assert_true(len(new_higlass_json["views"]) == 1)
    assert_true(len(new_higlass_json["views"][0]["tracks"]["top"]) == 2)

def test_add_mcool_to_mcool(testapp, higlass_mcool_viewconf, mcool_file_json):
    """ Given a viewconf with a mcool file, the viewconf should add anohter mcool on the side.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        mcool_file_json(dict): Fixture refers to an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Also add an mcool file with a different genome assembly.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCh38"
    mcool_file_json['md5sum'] = '00000000000000000000000000000001'
    mcool_file_with_different_genome_assembly = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the mcool with a different genome assembly, it should fail.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file_with_different_genome_assembly['uuid'])]
    })

    assert_true(response.json["success"] == False)
    assert_true("has the wrong Genome Assembly" in response.json["errors"])

    # Try to add an mcool with the same genome assembly.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    assert_true(response.json["success"] == True)

    # Make sure the mcool displays are next to each other.
    new_higlass_json = response.json["new_viewconfig"]

    assert_true(len(new_higlass_json["views"]) == 2)

    layout0 = new_higlass_json["views"][0]["layout"]
    assert_true(layout0["i"] == new_higlass_json["views"][0]["uid"])
    assert_true(layout0["x"] == 0)
    assert_true(layout0["y"] == 0)
    assert_true(layout0["w"] == 6)
    assert_true(layout0["h"] == 12)

    layout1 = new_higlass_json["views"][1]["layout"]
    assert_true(layout1["i"] == new_higlass_json["views"][1]["uid"])
    assert_true(layout1["x"] == 6)
    assert_true(layout1["y"] == 0)
    assert_true(layout1["w"] == 6)
    assert_true(layout1["h"] == 12)

def test_correct_duplicate_tracks(testapp, higlass_mcool_viewconf, mcool_file_json):
    """When creating new views, make sure the correct number of 2D tracks are copied over.
    """
    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add an mcool with the same genome assembly.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    assert_true(response.json["success"] == True)

    # Make sure the mcool displays are next to each other.
    new_higlass_json = response.json["new_viewconfig"]

    assert_true(len(new_higlass_json["views"]) == 2)

    # Both views should have the same types of tracks.
    view0 = new_higlass_json["views"][0]
    view1 = new_higlass_json["views"][1]

    for side in ("top", "left"):
        assert_true(len(view0["tracks"][side]) == 2, "{side} does not have 2 tracks".format(side=side))

        assert_true(
            len(view0["tracks"][side]) == len(view1["tracks"][side]),
            "{side} number of tracks do not match: {zero} versus {one}".format(
                side=side,
                zero=len(view0["tracks"][side]),
                one= len(view1["tracks"][side]),
            )
        )
        for i in range(len(view0["tracks"][side])):
            assert_true(
                view0["tracks"][side][i]["uid"] == view1["tracks"][side][i]["uid"],
                "{side} track {index} do not match: {zero} versus {one}".format(
                    side=side,
                    index=i,
                    zero=view0["tracks"][side][i]["uid"],
                    one= view1["tracks"][side][i]["uid"]
                )
            )

def assert_expected_viewconf_dimensions(viewconf, expected_dimensions):
    """ Given a viewconf and a list of expected dimensions, assert_true(each view has the correct dimensions in each.)

    Args:
        viewconf(obj): A nested dictionary containing a Higlass viewconfig.
        expected_dimensions(list): A list of dictionaries, in the order of Higlass Viewconfig views.
            Each dictionary should have the "x", "w", "w", "h" keys to represent the position and size of each view.

    Returns:
        Nothing

    Raises:
        AssertionError if a dimension is the wrong size.
    """

    # The correct number of views exist.
    assert_true(
        len(viewconf["views"]) == len(expected_dimensions),
        "Expected {num_expected} views, but there were {num_actual} views instead.".format(
            num_expected = len(expected_dimensions),
            num_actual = len(viewconf["views"]),
        )
    )

    for index, expected_layout in enumerate(expected_dimensions):
        layout = viewconf["views"][index]["layout"]

        # Make sure the uid matches the layout's index.
        assert_true(layout["i"] == viewconf["views"][index]["uid"])

        # Make sure each dimension matches.
        for dimension in ("x", "y", "w", "h"):
            assert_true(layout[dimension] == expected_layout[dimension], "While looking at {num_expected} expected dimensions, index: {index}, dimension: {dim} mismatched.".format(
                num_expected = len(expected_dimensions),
                index = index,
                dim = dimension
            ))

def test_add_multiple_mcool_one_at_a_time(testapp, higlass_mcool_viewconf, mcool_file_json):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        mcool_file_json(dict): Fixture refers to an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Add another mcool file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)

    # Add the third mcool file. It should be to the right of the first.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 3)
    expected_dimensions = (
        {"x":0, "y":0, "w":6, "h":6},
        {"x":6, "y":0, "w":6, "h":6},
        {"x":0, "y":6, "w":6, "h":6},
    )
    assert_expected_viewconf_dimensions(new_higlass_json, expected_dimensions)

    # Add the fourth mcool file. It should be underneath the second.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 4)
    expected_dimensions = (
        {"x":0, "y":0, "w":6, "h":6},
        {"x":6, "y":0, "w":6, "h":6},
        {"x":0, "y":6, "w":6, "h":6},
        {"x":6, "y":6, "w":6, "h":6},
    )
    assert_expected_viewconf_dimensions(new_higlass_json, expected_dimensions)

    # Add the fifth mcool file. It should be to the right of the fourth.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 5)
    expected_dimensions = (
        {"x":0, "y":0, "w":4, "h":6},
        {"x":4, "y":0, "w":4, "h":6},
        {"x":8, "y":0, "w":4, "h":6},
        {"x":0, "y":6, "w":4, "h":6},
        {"x":4, "y":6, "w":4, "h":6},
    )
    assert_expected_viewconf_dimensions(new_higlass_json, expected_dimensions)

    # Add the sixth mcool file. It should be underneath the fifth.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 6)
    expected_dimensions = (
        {"x":0, "y":0, "w":4, "h":6},
        {"x":4, "y":0, "w":4, "h":6},
        {"x":8, "y":0, "w":4, "h":6},
        {"x":0, "y":6, "w":4, "h":6},
        {"x":4, "y":6, "w":4, "h":6},
        {"x":8, "y":6, "w":4, "h":6},
    )
    assert_expected_viewconf_dimensions(new_higlass_json, expected_dimensions)

    # Try to add a seventh mcool file. It should fail because there are six already.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })
    assert_true(response.json["success"] == False)
    assert_true("You cannot have more than 6 views in a single display." in response.json["errors"])

def test_add_multiple_mcool_at_once(testapp, higlass_mcool_viewconf, mcool_file_json):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        mcool_file_json(dict): Fixture refers to an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add 2 mcool files. Confirm there are now 3 mcool files.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': [mcool_file['uuid'],mcool_file['uuid']]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 3)

    # Try to add 4 files. This should fail because you tried to have more than 6 views.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': [mcool_file['uuid'],mcool_file['uuid'],mcool_file['uuid'],mcool_file['uuid']]
    })
    assert_true(response.json["success"] == False)
    assert_true("You cannot have more than 6 views in a single display." in response.json["errors"])

def test_add_bedGraph_to_multiple_mcool(testapp, mcool_file_json, higlass_mcool_viewconf, bedGraph_file_json):
    """ With at least 2 mcool displays, try to add a bedGraph.
    The bedGraph should be atop the mcool displays.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        mcool_file_json(dict): Fixture refers to an mcool file.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bedGraph_file_json(dict): Fixture refers to a bedgraph file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Add the bedGraph file with a higlass uid and a genome asssembly.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bedGraph_file_json['md5sum'] = '00000000000000000000000000000001'
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Add another mcool file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 2)

    old_top_track_count = {}
    for index, view in enumerate(new_higlass_json["views"]):
        old_top_track_count[index] = len(view["tracks"]["top"])

    # Add a bedGraph file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    # The bedGraph file should be above the mcool displays.
    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True)
    assert_true(len(new_higlass_json["views"]) == 2)

    top_track_count = {}
    for index, view in enumerate(new_higlass_json["views"]):
        top_track_count[index] = len(view["tracks"]["top"])

    # It should be on top of every view, and it did not create a new view.
    assert_true(len(top_track_count.keys()) == len(old_top_track_count.keys()))
    for index in range(len(top_track_count.keys())):
        assert_true(top_track_count[index] - old_top_track_count[index] == 1)

def test_add_new_mcool_file(testapp, mcool_file_json, higlass_mcool_viewconf, bedGraph_file_json):
    """ Create one view with a mcool and bedgraph file. Add another mcool file.
    The bedGraph should be atop the mcool displays.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        mcool_file_json(dict): Fixture refers to an mcool file.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bedGraph_file_json(dict): Fixture refers to a bedgraph file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Add the bedGraph file with a higlass uid and a genome asssembly.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bedGraph_file_json['md5sum'] = '00000000000000000000000000000001'
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    old_top_track_count = len(higlass_json["viewconfig"]["views"][0]["tracks"]["top"])

    # Add a bedGraph file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True, "911")
    assert_true(len(new_higlass_json["views"]) == 1, "912")
    assert_true(len(new_higlass_json["views"][0]["tracks"]["top"]) == old_top_track_count + 1, "913")
    assert_true(len(new_higlass_json["views"][0]["tracks"]["center"][0]["contents"]) == 1, "914")

    # Add another mcool file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    # The bedGraph file should be above both views.
    new_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["success"] == True, "925")
    assert_true(len(new_higlass_json["views"]) == 2, "926")

    top_track_count = {}
    for index, view in enumerate(new_higlass_json["views"]):
        top_track_count[index] = len(view["tracks"]["top"])

    # It should be on top of every view, and it did not create a new view.
    for index in range(len(top_track_count.keys())):
        assert_true(top_track_count[index] == 3, "Expected 3 tracks on top for view {view}, found {actual} instead.".format(
            view=index,
            actual=top_track_count[index]
        ))

def test_bogus_fileuuid(testapp, higlass_mcool_viewconf):
    """ Function should fail gracefully if there is no file with the given uuid.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Add a nonexistent file.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["Bogus"]
    })

    # Expect failure.
    assert_true(response.json["success"] == False)
    assert_true("does not exist" in response.json["errors"])

def test_add_files_by_accession(testapp, mcool_file_json, higlass_blank_viewconf, bedGraph_file_json):
    """ Add files by the accession instead of the uuid.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        mcool_file_json(dict): Fixture refers to an mcool file.
        higlass_blank_viewconf(obj): Empty Higlass view configuration with no file or genome assembly.
        bedGraph_file_json(dict): Fixture refers to a bedgraph file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """
    # Add an mcool file. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    assert_true(mcool_file["accession"])

    # Add a bg file.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bedGraph_file_json['md5sum'] = '00000000000000000000000000000001'
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]
    assert_true(bg_file["accession"])

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000000"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the files to the viewconf by passing in the acession.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': [mcool_file["accession"], bg_file["accession"]]
    })

    assert_true(response.json["success"] == True)

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # There should be 1 view.
    assert_true(len(new_higlass_json["views"]) == 1)

    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]
    tracks = new_higlass_json["views"][0]["tracks"]

    # 1 central track should be in the new view.
    assert_true(len(tracks["center"][0]["contents"]) == 1)
    assert_true("mcool" in tracks["center"][0]["contents"][0]["name"])

    # 1 more track should be on top.
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

def test_add_bedGraph_to_mcool(testapp, higlass_mcool_viewconf, bedGraph_file_json):
    """ Given a viewconf with a mcool file, the viewconf should add anohter mcool on the side.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bedGraph_file_json(dict): Fixture refers to a bedgraph file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Add the bedGraph file with a higlass uid and a genome asssembly.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]

    # Add the bedGraph file with a different genome asssembly.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCh38"
    bedGraph_file_json['md5sum'] = '00000000000000000000000000000001'
    bg_file_with_different_genome_assembly = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]

    # Get the json for a viewconfig with a mcool file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the bedGraph with a different genome assembly, it should fail.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file_with_different_genome_assembly['uuid'])]
    })

    assert_true(response.json["success"] == False)
    assert_true("has the wrong Genome Assembly" in response.json["errors"])

    # Try to add an mcool with the same genome assembly.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    assert_true(response.json["success"] == True)

    # Make sure the mcool displays are next to each other.
    new_higlass_json = response.json["new_viewconfig"]

    assert_true(len(new_higlass_json["views"]) == 1)

def test_add_bigwig_higlass(testapp, higlass_mcool_viewconf, bigwig_file_json):
    """ Given a viewconf with an mcool file, the viewconf should add a bigwig on top.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bigwig_file_json(dict): Fixture refers to a bigwig file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Get a bedGraph file to add.
    bigwig_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bigwig_file_json['md5sum'] = '00000000000000000000000000000001'
    bigwig_file_json['genome_assembly'] = "GRCm38"
    bigwig_file = testapp.post_json('/file_processed', bigwig_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the bedGraph to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bigwig_file['uuid'])]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # Make sure the bedGraph has been added above the mcool file.
    assert_true(len(new_higlass_json["views"]) == 1)

    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    # Assert_true(there is still 1 central view)
    assert_true(len(tracks["center"][0]["contents"]) == 1)
    assert_true("mcool" in tracks["center"][0]["contents"][0]["name"])

    # Only one new top track should have appeared.
    assert_true(len(tracks["left"]) == len(old_tracks["left"]))
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

def test_add_bigbed_higlass(testapp, higlass_mcool_viewconf, bigbed_file_json):
    """ Given a viewconf with an mcool file, the viewconf should add a bigbed on top.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bigbed_file_json(dict): Fixture refers to a bigbed file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Get a bigbed file to add.
    bigbed_file_json['higlass_uid'] = "FTv3kHMmSlm0YTmtdOYAPA"
    bigbed_file_json['md5sum'] = '00000000000000000000000000000001'
    bigbed_file_json['genome_assembly'] = "GRCm38"
    bigbed_file = testapp.post_json('/file_processed', bigbed_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the bigbed to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bigbed_file['uuid'])]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # Make sure the bigbed has been added above the mcool file.
    assert_true(len(new_higlass_json["views"]) == 1)

    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    # Assert_true(there is still 1 central view)
    assert_true(len(tracks["center"][0]["contents"]) == 1)
    assert_true("mcool" in tracks["center"][0]["contents"][0]["name"])

    # Make sure the view has an initialXDomain and initialYDomain.
    assert_true(len(new_higlass_json["views"][0]["initialXDomain"]) == 2)
    assert_true(new_higlass_json["views"][0]["initialXDomain"][0] != None)
    assert_true(new_higlass_json["views"][0]["initialXDomain"][1] != None)

    assert_true(len(new_higlass_json["views"][0]["initialYDomain"]) == 2)
    assert_true(new_higlass_json["views"][0]["initialYDomain"][0] != None)
    assert_true(new_higlass_json["views"][0]["initialYDomain"][1] != None)

    # Only one new top track should have appeared.
    assert_true(len(tracks["left"]) == len(old_tracks["left"]))
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

    # Get the top track and check the format.
    found_annotation_track = False
    found_chromosome_track = False
    found_data_track = False

    for track in tracks["top"]:
        if not found_annotation_track and "annotation-track" in track["uid"]:
            found_annotation_track = True
        if not found_chromosome_track and "chromosome-track" in track["uid"]:
            found_chromosome_track = True
        if not found_data_track and "tilesetUid" in track and track["tilesetUid"] == bigbed_file_json['higlass_uid']:
            found_data_track = True

            assert_true(track["type"] == "horizontal-vector-heatmap")

            assert_true("options" in track)
            options = track["options"]
            assert_true("valueScaling" in options)
            assert_true(options["valueScaling"] == "linear")

            assert_true("colorRange" in options)
            assert_true(len(options["colorRange"]) == 256)

    assert_true(found_annotation_track == True)
    assert_true(found_chromosome_track == True)
    assert_true(found_data_track == True)

def test_add_bed_with_beddb(testapp, higlass_mcool_viewconf, bed_beddb_file_json):
    """ Add a bed file (with a beddb used as a supporting file) to the HiGlass file.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_mcool_viewconf(obj): Higlass view configuration for an mcool file.
        bed_beddb_file_json(dict): Fixture refers to a bed file with a supporting beddb file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Get a file to add.
    bed_beddb_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bed_beddb_file_json['md5sum'] = '00000000000000000000000000000001'
    bed_beddb_file_json['genome_assembly'] = "GRCm38"
    bed_file = testapp.post_json('/file_processed', bed_beddb_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the file to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bed_file['uuid'])]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # There should be 1 view
    assert_true(response.json["errors"] == '')
    assert_true(response.json["success"])

    assert_true(len(new_higlass_json["views"]) == 1)

    # The view should have a new top track
    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    assert_true(len(tracks["left"]) == len(old_tracks["left"]))
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

    # Central track is unchanged
    assert_true(len(tracks["center"][0]["contents"]) == 1)
    assert_true("mcool" in tracks["center"][0]["contents"][0]["name"])

    # The top track should be a bed-like track
    found_data_track = False
    for track in tracks["top"]:
        if "tilesetUid" in track and track["tilesetUid"] == bed_beddb_file_json['higlass_uid']:
            found_data_track = True
            assert_true(track["type"] == "bedlike")

    assert_true(found_data_track == True)

def test_add_beddb(testapp, higlass_mcool_viewconf, beddb_file_json):
    """ Add a beddb file to the HiGlass file.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_blank_viewconf(obj): Empty Higlass view configuration with no file or genome assembly.
        beddb_file_json(dict): Fixture refers to a beddb file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """

    # Add the beddb file.
    genome_assembly = "GRCm38"
    beddb_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    beddb_file_json['md5sum'] = '00000000000000000000000000000001'
    beddb_file_json['genome_assembly'] = genome_assembly
    bed_file = testapp.post_json('/file_processed', beddb_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the file to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bed_file['uuid'])]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # There should be 1 view
    assert_true(response.json["errors"] == '')
    assert_true(response.json["success"])

    assert_true(len(new_higlass_json["views"]) == 1)

    # The view should have a new top track and a new left track
    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    assert_true(len(tracks["left"]) == len(old_tracks["left"]) + 1)
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

    # Central track is unchanged
    assert_true(len(tracks["center"][0]["contents"]) == 1)

    # The top track should contain a bed-like track in the first spot
    track = tracks["top"][0]
    assert_true(track["tilesetUid"] == beddb_file_json['higlass_uid'])
    assert_true(track["type"] == "horizontal-gene-annotations")

    # The left track should contain a bed-like track in the first spot
    track = tracks["left"][0]
    assert_true(track["tilesetUid"] == beddb_file_json['higlass_uid'])
    assert_true(track["type"] == "vertical-gene-annotations")

    # The searchbar needs to be updated, too
    main_view = new_higlass_json["views"][0]
    assert_true("genomePositionSearchBox" in main_view)
    assert_true("chromInfoId" in main_view["genomePositionSearchBox"])
    assert_true(main_view["genomePositionSearchBox"]["chromInfoId"] == genome_assembly)
    assert_true("autocompleteId" in main_view["genomePositionSearchBox"])
    assert_true(main_view["genomePositionSearchBox"]["autocompleteId"] == beddb_file_json['higlass_uid'])
    assert_true("visible" in main_view["genomePositionSearchBox"])
    assert_true(main_view["genomePositionSearchBox"]["visible"] == True)

    assert_true("autocompleteSource" in main_view)
    assert_true(beddb_file_json['higlass_uid'] in main_view["autocompleteSource"])

def test_add_chromsizes(testapp, higlass_blank_viewconf, chromsizes_file_json):
    """ Add a chromsizes file and add a top, left and center tracks to the view.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_blank_viewconf(obj): Empty Higlass view configuration with no file or genome assembly.
        chromsizes_file_json(dict): Fixture refers to a chromsizes file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """
    # Get a file to add.
    genome_assembly = "GRCm38"
    chromsizes_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    chromsizes_file_json['md5sum'] = '00000000000000000000000000000001'
    chromsizes_file_json['genome_assembly'] = genome_assembly
    chrom_file = testapp.post_json('/file_reference', chromsizes_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000000"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Try to add the file to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=chrom_file['uuid'])]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # There should be 1 view
    assert_true(response.json["errors"] == '')
    assert_true(response.json["success"])

    assert_true(len(new_higlass_json["views"]) == 1)

    # The view should have a new top track and a new left track
    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    assert_true(len(tracks["left"]) == len(old_tracks["left"]) + 1)
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

    # There are no other 2D views, so we should not have a center track.
    assert_true(len(tracks["center"][0]["contents"]) == 0)

    # The top track should have chromosome labels
    found_top_data_track = False
    for track in tracks["top"]:
        if "tilesetUid" in track and track["tilesetUid"] == chromsizes_file_json['higlass_uid']:
            found_top_data_track = True
            assert_true(track["type"] == "horizontal-chromosome-labels")

    assert_true(found_top_data_track == True)

    # The left track should have chromosome labels
    found_left_data_track = False
    for track in tracks["left"]:
        if "tilesetUid" in track and track["tilesetUid"] == chromsizes_file_json['higlass_uid']:
            found_left_data_track = True
            assert_true(track["type"] == "vertical-chromosome-labels")

    assert_true(found_left_data_track == True)

def test_add_2d_chromsizes(testapp, higlass_blank_viewconf, chromsizes_file_json, mcool_file_json):
    """ Add a chromsizes file and add a top, left and center tracks to the view.

    Args:
        testapp(obj): This object can make RESTful API calls to the test server.
        higlass_blank_viewconf(obj): Empty Higlass view configuration with no file or genome assembly.
        chromsizes_file_json(dict): Fixture refers to a chromsizes file.
        mcool_file_json(dict): Fixture refers to an mcool file.

    Returns:
        Nothing

    Raises:
        AssertionError if the test fails.
    """
    # Get a file to add.
    genome_assembly = "GRCm38"
    chromsizes_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    chromsizes_file_json['md5sum'] = '00000000000000000000000000000001'
    chromsizes_file_json['genome_assembly'] = genome_assembly
    chrom_file = testapp.post_json('/file_reference', chromsizes_file_json).json['@graph'][0]

    # Get the Higlass Viewconf that will be edited.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000000"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Try to add the file to the existing viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': [
            "{uuid}".format(uuid=chrom_file['uuid']),
            "{uuid}".format(uuid=mcool_file['uuid']),
        ]
    })

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # There should be 1 view
    assert_true(response.json["errors"] == '')
    assert_true(response.json["success"])

    assert_true(len(new_higlass_json["views"]) == 1)

    # The view should have a new top track and a new left track
    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    assert_true(len(tracks["left"]) == len(old_tracks["left"]) + 1)
    assert_true(len(tracks["top"]) == len(old_tracks["top"]) + 1)

    # The top track should have chromosome labels
    found_top_data_track = False
    for track in tracks["top"]:
        if "tilesetUid" in track and track["tilesetUid"] == chromsizes_file_json['higlass_uid']:
            found_top_data_track = True
            assert_true(track["type"] == "horizontal-chromosome-labels")

    assert_true(found_top_data_track == True)

    # The left track should have chromosome labels
    found_left_data_track = False
    for track in tracks["left"]:
        if "tilesetUid" in track and track["tilesetUid"] == chromsizes_file_json['higlass_uid']:
            found_left_data_track = True
            assert_true(track["type"] == "vertical-chromosome-labels")

    assert_true(found_left_data_track == True)

    # The view should also have a new center track with 2 views inside
    assert_true(len(tracks["center"][0]["contents"]) == 2)

    # The central contents should have a chromosome grid and the mcool file.
    found_central_data_track = False

    for track in tracks["center"][0]["contents"]:
        found_central_data_track = True
        if "tilesetUid" in track and track["tilesetUid"] == chromsizes_file_json['higlass_uid']:
            assert_true(track["type"] == "2d-chromosome-grid")
        if "tilesetUid" in track and track["tilesetUid"] == mcool_file_json['higlass_uid']:
            assert_true(track["type"] == "heatmap")
    assert_true(found_central_data_track == True)

    # Add another 2D view to this existing view
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig' : new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': [
            "{uuid}".format(uuid=mcool_file['uuid']),
        ]
    })

    two_view_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["errors"] == '')
    assert_true(response.json["success"])

    # Assert_true(there are 2 views)
    assert_true(len(two_view_higlass_json["views"]) == 2)

    # Assert_true(there is only 1 grid in each view)
    for view in two_view_higlass_json["views"]:
        center_track_contents = view["tracks"]["center"][0]["contents"]
        chromosome_grid_contents = [cont for cont in center_track_contents if cont["type"] == "2d-chromosome-grid" ]
        assert_true(len(chromosome_grid_contents) == 1)

def test_remove_1d(testapp, higlass_mcool_viewconf, chromsizes_file_json, bigwig_file_json, mcool_file_json):
    genome_assembly = "GRCm38"

    # Save the mcool file and add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = genome_assembly
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Add the chromsizes file.
    chromsizes_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    chromsizes_file_json['md5sum'] = '00000000000000000000000000000001'
    chromsizes_file_json['genome_assembly'] = genome_assembly
    chrom_file = testapp.post_json('/file_reference', chromsizes_file_json).json['@graph'][0]

    # Get a bedGraph file to add.
    bigwig_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bigwig_file_json['md5sum'] = '00000000000000000000000000000001'
    bigwig_file_json['genome_assembly'] = genome_assembly
    bigwig_file = testapp.post_json('/file_processed', bigwig_file_json).json['@graph'][0]

    # Post the chromsizes file.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get("/higlass-view-configs/{higlass_conf_uuid}/?format=json".format(higlass_conf_uuid=higlass_conf_uuid))
    higlass_json = response.json

    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : genome_assembly,
        'files': [
            "{uuid}".format(uuid=chrom_file['uuid']),
        ]
    })

    # Check the left and top sides to make sure there are tracks.
    full_higlass_json = response.json["new_viewconfig"]
    assert_true(response.json["errors"] == '')
    assert_true(response.json["success"])
    assert_true(len(full_higlass_json["views"]) == 1)

    # The chromsizes should have been added to the left and top sides.
    assert_true(len(higlass_json["viewconfig"]["views"][0]["tracks"]["left"]) + 1 == len(full_higlass_json["views"][0]["tracks"]["left"]), "left side mismatch")

    assert_true(len(higlass_json["viewconfig"]["views"][0]["tracks"]["top"]) + 1 == len(full_higlass_json["views"][0]["tracks"]["top"]), "top side mismatch")

    assert_true(full_higlass_json["views"][0]["tracks"]["top"][0]["type"], "horizontal-chromosome-labels")

    # Add a height to the chromosome labels.
    for t in full_higlass_json["views"][0]["tracks"]["top"]:
        if t["type"] == "horizontal-chromosome-labels":
            t['height'] = 50
            t["orientation"] = "1d-horizontal"

    # Remove the mcool from the central contents.
    full_higlass_json["views"][0]["tracks"]["center"] = []

    # Add another 1D file. Tell the view to clean up the view.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': full_higlass_json,
        'genome_assembly' : genome_assembly,
        'files': [
            "{uuid}".format(uuid=bigwig_file['uuid']),
        ],
        'remove_unneeded_tracks': True,
    })

    all_1d_higlass_json = response.json["new_viewconfig"]

    # Make sure there are no left tracks.
    assert_true(len(all_1d_higlass_json["views"][0]["tracks"]["left"]) == 0, "Left tracks found")

    top_chromsizes_tracks =[t for t in all_1d_higlass_json["views"][0]["tracks"]["top"] if t["type"] == "horizontal-chromosome-labels"]
    assert_true(top_chromsizes_tracks[0]["height"] == 50, "Top chromsize track lost its height")

    # Add a 2D file. Tell the view to clean up the view.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': all_1d_higlass_json,
        'genome_assembly' : genome_assembly,
        'files': [
            "{uuid}".format(uuid=mcool_file['uuid']),
        ],
        'remove_unneeded_tracks': True,
    })

    # Make sure the left chromsize tracks have been added.
    restored_2d_track_higlass_json = response.json["new_viewconfig"]

    found_left_chromsizes = any([t for t in restored_2d_track_higlass_json["views"][0]["tracks"]["left"] if t["type"] == "vertical-chromosome-labels"])
    assert_true(found_left_chromsizes, "Could not find left chromsizes track")

    # Make sure the top tracks have horizontal types and the left side have vertical types
    types_to_find = {
        "horizontal-gene-annotations": 0,
        "horizontal-chromosome-labels": 0,
        "vertical-gene-annotations" : 0,
        "vertical-chromosome-labels" : 0,
    }

    top_track_uids = []
    for track in restored_2d_track_higlass_json["views"][0]["tracks"]["top"]:
        if "uid" in track:
            top_track_uids.append(track["uid"])
        if track["type"] in types_to_find:
            types_to_find[ track["type"] ] += 1

    assert_true(types_to_find["horizontal-gene-annotations"] > 0)
    assert_true(types_to_find["horizontal-chromosome-labels"] > 0)

    vertical_tracks_found = 0
    for track in restored_2d_track_higlass_json["views"][0]["tracks"]["left"]:
        if "uid" in track:
            assert_true(
                track["uid"] not in top_track_uids,
                "Top track uid reused for left track: {uid}".format(uid=track["uid"])
            )
        if track["type"] in types_to_find:
            types_to_find[ track["type"] ] += 1
        if track["orientation"] == "1d-vertical":
            vertical_tracks_found += 1

    assert_true(types_to_find["vertical-gene-annotations"] > 0)
    assert_true(types_to_find["vertical-chromosome-labels"] > 0)
    assert_true(vertical_tracks_found > 0)

    # The chromsizes had a height when it was horizontal. Make sure it has a width when vertical.
    top_chromsizes_tracks =[t for t in restored_2d_track_higlass_json["views"][0]["tracks"]["top"] if t["type"] == "horizontal-chromosome-labels"]

    assert_true(top_chromsizes_tracks[0]["height"] == 50, "Top chromsize track lost its height")

    left_chromsizes_tracks = [t for t in restored_2d_track_higlass_json["views"][0]["tracks"]["left"] if t["type"] == "vertical-chromosome-labels"]
    assert_true(left_chromsizes_tracks[0]["width"] == 50, "Left chromsize track has no width")
    assert_true("height" not in left_chromsizes_tracks[0], "Left chromsize track still has a height")
