import pytest
from .test_file import mcool_file_json, bedGraph_file_json, bigwig_file_json
pytestmark = pytest.mark.working

# Test Higlass display endpoints.

@pytest.fixture
def higlass_mcool_viewconf(testapp):
    viewconf = {
        "title" : "Test MCOOL Display",
        "description" : "An MCOOL file track plus annotations for gene mm10 (tileset 'QDutvmyiSrec5nX4pA5WGQ') and chromosome 'EtrWT0VtScixmsmwFSd7zg'.",
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
                "https://higlass.io/api/v1"
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
                    "autocompleteSource":"/api/v1/suggest/?d=P0PLbQMwTYGy-5uPIQid7A&",
                    "genomePositionSearchBox":{
                        "autocompleteServer":"https://higlass.io/api/v1",
                        "autocompleteId":"P0PLbQMwTYGy-5uPIQid7A",
                        "chromInfoServer":"https://higlass.io/api/v1",
                        "chromInfoId":"mm10",
                        "visible":True
                    },
                    "tracks":{
                        "top":[
                            {
                                "name":"Gene Annotations (mm10)",
                                "server":"https://higlass.io/api/v1",
                                "tilesetUid":"QDutvmyiSrec5nX4pA5WGQ",
                                "type":"horizontal-gene-annotations",
                                "options":{
                                    "labelColor":"black",
                                    "labelPosition":"hidden",
                                    "plusStrandColor":"black",
                                    "minusStrandColor":"black",
                                    "trackBorderWidth":0,
                                    "coordSystem":"mm10",
                                    "trackBorderColor":"black",
                                    "name":"Gene Annotations (mm10)",
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
                                "server":"https://higlass.io/api/v1",
                                "tilesetUid":"EtrWT0VtScixmsmwFSd7zg",
                                "type":"horizontal-chromosome-labels",
                                "local":True,
                                "minHeight":30,
                                "thumbnail":None,
                                "options":{
                                    "coordSystem":"mm10",
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
                                "name":"Gene Annotations (mm10)",
                                "server":"https://higlass.io/api/v1",
                                "tilesetUid":"QDutvmyiSrec5nX4pA5WGQ",
                                "uid":"left-annotation-track",
                                "type":"vertical-gene-annotations",
                                "options":{
                                    "labelColor":"black",
                                    "labelPosition":"hidden",
                                    "plusStrandColor":"black",
                                    "minusStrandColor":"black",
                                    "trackBorderWidth":0,
                                    "trackBorderColor":"black",
                                    "coordSystem":"mm10",
                                    "name":"Gene Annotations (mm10)",
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
                                "server":"https://higlass.io/api/v1",
                                "tilesetUid":"EtrWT0VtScixmsmwFSd7zg",
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
                "//higlass.io/api/v1"
            ],
            "exportViewUrl": "/api/v1/viewconfs",
            "views": [
                {
                    "uid": "aa",
                    "initialXDomain": [
                        -167962308.59835115,
                        3260659599.528857
                    ],
                    "autocompleteSource": "/api/v1/suggest/?d=OHJakQICQD6gTD7skx4EWA&",
                    "genomePositionSearchBox": {
                        "autocompleteServer": "//higlass.io/api/v1",
                        "autocompleteId": "OHJakQICQD6gTD7skx4EWA",
                        "chromInfoServer": "//higlass.io/api/v1",
                        "chromInfoId": "hg19",
                        "visible": True
                    },
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

def test_higlass_noop(testapp, higlass_mcool_viewconf):
    """ Test the python endpoint exists.
    Given a viewconf and no experiments, the viewconf should remain unchanged.
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
    assert len(higlass_json["viewconfig"]["views"]) == len(new_higlass_json["views"])
    assert len(new_higlass_json["views"]) == 1
    for index in range(len(new_higlass_json["views"])):
        new_higlass = new_higlass_json["views"][index]
        old_higlass = higlass_json["viewconfig"]["views"][index]
        for key in new_higlass:
            assert old_higlass[key] == new_higlass[key]

def test_create_new_higlass_view(testapp, higlass_blank_viewconf, mcool_file_json):
    """ Don't pass in an existing higlass viewconf, but do add a file.
    Expect a new higlass view containing the file.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Try to create a view, adding a file but no base view.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })


    new_higlass_view_json = response.json["new_viewconfig"]

    assert response.json["new_genome_assembly"] == "GRCm38"

    # There should be 1 view.
    assert len(new_higlass_view_json["views"]) == 1
    assert "layout" in new_higlass_view_json["views"][0]
    assert "uid" in new_higlass_view_json["views"][0]
    assert "tracks" in new_higlass_view_json["views"][0]
    assert "center" in new_higlass_view_json["views"][0]["tracks"]
    assert new_higlass_view_json["views"][0]["tracks"]["center"][0]["type"] == "combined"
    assert "contents" in new_higlass_view_json["views"][0]["tracks"]["center"][0]
    contents = new_higlass_view_json["views"][0]["tracks"]["center"][0]["contents"]
    assert contents[0]["type"] == "heatmap"

def test_add_bedGraph_higlass(testapp, higlass_mcool_viewconf, bedGraph_file_json):
    """ Given a viewconf with an mcool file, the viewconf should add a bedGraph on top.
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
    assert len(new_higlass_json["views"]) == 1

    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    # Assert there is still 1 central view
    assert len(tracks["center"][0]["contents"]) == 1
    assert "mcool" in tracks["center"][0]["contents"][0]["name"]

    # Only one new top track should have appeared.
    assert len(tracks["left"]) == len(old_tracks["left"])
    assert len(tracks["top"]) == len(old_tracks["top"]) + 1

def test_add_bedGraph_to_bedGraph(testapp, higlass_blank_viewconf, bedGraph_file_json):
    """ Given a viewconf with a bedGraph file, the viewconf should add a bedGraph on top.
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
    assert response.json["success"] == True

    assert len(new_higlass_json["views"]) == 1
    assert len(new_higlass_json["views"][0]["tracks"]["top"]) == 1

    # Add another bedGraph file. Make sure the bedGraphs are stacked atop each other.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert response.json["success"] == True

    assert len(new_higlass_json["views"]) == 1
    assert len(new_higlass_json["views"][0]["tracks"]["top"]) == 2

def test_add_mcool_to_mcool(testapp, higlass_mcool_viewconf, mcool_file_json):
    """ Given a viewconf with a mcool file, the viewconf should add anohter mcool on the side.
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

    assert response.json["success"] == False
    assert "has the wrong Genome Assembly" in response.json["errors"]

    # Try to add an mcool with the same genome assembly.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    assert response.json["success"] == True

    # Make sure the mcool displays are next to each other.
    new_higlass_json = response.json["new_viewconfig"]

    assert len(new_higlass_json["views"]) == 2

    layout0 = new_higlass_json["views"][0]["layout"]
    assert layout0["i"] == new_higlass_json["views"][0]["uid"]
    assert layout0["x"] == 0
    assert layout0["y"] == 0
    assert layout0["w"] == 6
    assert layout0["h"] == 12

    layout1 = new_higlass_json["views"][1]["layout"]
    assert layout1["i"] == new_higlass_json["views"][1]["uid"]
    assert layout1["x"] == 6
    assert layout1["y"] == 0
    assert layout1["w"] == 6
    assert layout1["h"] == 12

def assert_expected_viewconf_dimensions(viewconf, expected_dimensions):
    """ Given a viewconf and a list of expected dimensions, assert each view has the correct dimensions in each.
    """
    for index, expected_layout in enumerate(expected_dimensions):
        layout = viewconf["views"][index]["layout"]

        # Make sure the uid matches the layout's index.
        assert layout["i"] == viewconf["views"][index]["uid"]

        # Make sure each dimension matches.
        for dimension in ("x", "y", "w", "h"):
            assert layout[dimension] == expected_layout[dimension], "While looking at {num_expected} expected dimensions, index: {index}, dimension: {dim} mismatched.".format(
                num_expected = len(expected_dimensions),
                index = index,
                dim = dimension
            )

def test_add_multiple_mcool_one_at_a_time(testapp, higlass_mcool_viewconf, mcool_file_json):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.
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
    assert response.json["success"] == True

    # Add the third mcool file. It should be to the right of the first.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=mcool_file['uuid'])]
    })

    new_higlass_json = response.json["new_viewconfig"]
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 3
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
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 4
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
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 5
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
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 6
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
    assert response.json["success"] == False
    assert "You cannot have more than 6 views in a single display." in response.json["errors"]

def test_add_multiple_mcool_at_once(testapp, higlass_mcool_viewconf, mcool_file_json):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.
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
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 3

    # Try to add 4 files. This should fail because you tried to have more than 6 views.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': new_higlass_json,
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': [mcool_file['uuid'],mcool_file['uuid'],mcool_file['uuid'],mcool_file['uuid']]
    })
    assert response.json["success"] == False
    assert "You cannot have more than 6 views in a single display." in response.json["errors"]

def test_add_bedGraph_to_multiple_mcool(testapp, mcool_file_json, higlass_mcool_viewconf, bedGraph_file_json):
    """ With at least 2 mcool displays, try to add a bedGraph.
    The bedGraph should be atop the mcool displays.
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
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 2

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
    assert response.json["success"] == True
    assert len(new_higlass_json["views"]) == 2

    top_track_count = {}
    for index, view in enumerate(new_higlass_json["views"]):
        top_track_count[index] = len(view["tracks"]["top"])

    # It should be on top of every view, and it did not create a new view.
    assert len(top_track_count.keys()) == len(old_top_track_count.keys())
    for index in range(len(top_track_count.keys())):
        assert top_track_count[index] - old_top_track_count[index] == 1

def test_bogus_fileuuid(testapp, higlass_mcool_viewconf):
    """ Function should fail gracefully if there is no file with the given uuid.
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
    assert response.json["success"] == False
    assert "does not exist" in response.json["errors"]

def test_add_files_by_accession(testapp, mcool_file_json, higlass_blank_viewconf, bedGraph_file_json):
    """ Add files by the accession instead of the uuid.
    """
    # Add an mcool file. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]
    assert mcool_file["accession"]

    # Add a bg file.
    bedGraph_file_json['higlass_uid'] = "Y08H_toDQ-OxidYJAzFPXA"
    bedGraph_file_json['genome_assembly'] = "GRCm38"
    bedGraph_file_json['md5sum'] = '00000000000000000000000000000001'
    bg_file = testapp.post_json('/file_processed', bedGraph_file_json).json['@graph'][0]
    assert bg_file["accession"]

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

    assert response.json["success"] == True

    # Get the new json.
    new_higlass_json = response.json["new_viewconfig"]

    # There should be 1 view.
    assert len(new_higlass_json["views"]) == 1

    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]
    tracks = new_higlass_json["views"][0]["tracks"]

    # 1 central track should be in the new view.
    assert len(tracks["center"][0]["contents"]) == 1
    assert "mcool" in tracks["center"][0]["contents"][0]["name"]

    # 1 more track should be on top.
    assert len(tracks["top"]) == len(old_tracks["top"]) + 1

def test_add_bedGraph_to_mcool(testapp, higlass_mcool_viewconf, bedGraph_file_json):
    """ Given a viewconf with a mcool file, the viewconf should add anohter mcool on the side.
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

    assert response.json["success"] == False
    assert "has the wrong Genome Assembly" in response.json["errors"]

    # Try to add an mcool with the same genome assembly.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconfig': higlass_json["viewconfig"],
        'genome_assembly' : higlass_json["genome_assembly"],
        'files': ["{uuid}".format(uuid=bg_file['uuid'])]
    })

    assert response.json["success"] == True

    # Make sure the mcool displays are next to each other.
    new_higlass_json = response.json["new_viewconfig"]

    assert len(new_higlass_json["views"]) == 1

def test_add_bigwig_higlass(testapp, higlass_mcool_viewconf, bigwig_file_json):
    """ Given a viewconf with an mcool file, the viewconf should add a bigwig on top.
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
    assert len(new_higlass_json["views"]) == 1

    tracks = new_higlass_json["views"][0]["tracks"]
    old_tracks = higlass_json["viewconfig"]["views"][0]["tracks"]

    # Assert there is still 1 central view
    assert len(tracks["center"][0]["contents"]) == 1
    assert "mcool" in tracks["center"][0]["contents"][0]["name"]

    # Only one new top track should have appeared.
    assert len(tracks["left"]) == len(old_tracks["left"])
    assert len(tracks["top"]) == len(old_tracks["top"]) + 1
