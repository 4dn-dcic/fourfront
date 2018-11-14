import pytest
from .test_file import mcool_file_json # TODO move to centralized fixture file
pytestmark = pytest.mark.working

# Test HiGlass config view endpoints on fourfront.

@pytest.fixture
def higlass_mcool_viewconf(testapp):
    viewconf = {
        "title" : "Test MCOOL Display",
        "description" : "An MCOOL file track plus annotations for gene mm10 (tileset 'QDutvmyiSrec5nX4pA5WGQ') and chromosome 'EtrWT0VtScixmsmwFSd7zg'.",
        "uuid" : "00000000-1111-0000-1111-000000000002",
        "name" : "higlass-mcool-test-view",
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
        "uuid" : "00000000-1111-0000-1111-000000000003",
        "name" : "empty-higlass-viewconf",
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
    """ Test the python endpoint exists
    Given a viewconf and no experiments, the viewconf should remain unchanged.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get the JSON.
    higlass_conf_uuid = "00000000-1111-0000-1111-000000000002"
    response = testapp.get(f"/higlass-view-configs/{higlass_conf_uuid}/?format=json")
    higlass_json = response.json

    # Patch a request, passing in the current viewconf with no additional data.
    # Get the new json.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'higlass_viewconf': higlass_conf_uuid
    })

    new_higlass_json = response.json["viewconf"]

    # The new viewconfig should be a subset of the old one.
    for key in new_higlass_json:
        assert higlass_json[key] == new_higlass_json[key]

def test_create_new_higlass_viewconf(testapp, higlass_blank_viewconf, mcool_file_json):
    """ Don't pass in an existing higlass viewconf, but do add a file.
    Expect a new higlass viewconf with a file.
    """

    # Post an mcool file and retrieve its uuid. Add a higlass_uid.
    mcool_file_json['higlass_uid'] = "LTiacew8TjCOaP9gpDZwZw"
    mcool_file_json['genome_assembly'] = "GRCm38"
    mcool_file = testapp.post_json('/file_processed', mcool_file_json).json['@graph'][0]

    # Try to create a viewconf, adding a file but no viewconf.
    response = testapp.post_json("/add_files_to_higlass_viewconf/", {
        'files': f"{mcool_file['uuid']}"
    })

    new_higlass_json = response.json["viewconf"]

    assert "name" in new_higlass_json
    assert "title" in new_higlass_json
    assert "viewconfig" in new_higlass_json
    assert "description" in new_higlass_json
    assert "date_created" in new_higlass_json
    assert "schema_version" in new_higlass_json
    assert "@id" in new_higlass_json
    assert "@type" in new_higlass_json
    assert "uuid" in new_higlass_json
    assert "external_references" in new_higlass_json
    assert "display_title" in new_higlass_json
    assert "link_id" in new_higlass_json
    assert "principals_allowed" in new_higlass_json

def test_add_bigwig_higlass(testapp):
    """ Given a viewconf with an mcool file, the viewconf should add a bigwig on top.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get a bigwig file to add.

    # Patch a request, trying to add the bigwig to the existing viewconf.

    # Get the new json.

    # Make sure the bigwig has been added above the mcool file.
    pass

def test_add_bigwig_to_bigwig(testapp):
    """ Given a viewconf with a bigwig file, the viewconf should add a bigwig on top.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get a bigwig file to add.

    # Patch a request, trying to add the bigwig to the existing viewconf.

    # Get the new json.

    # Make sure the bigwigs are stacked atop each other.
    pass

def test_add_mcool_to_mcool(testapp):
    """ Given a viewconf with a mcool file, the viewconf should add anohter mcool on the side.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get a mcool file to add.

    # Patch a request, trying to add the mcool with a different genome assembly to the existing viewconf.
    # It should fail.

    # Patch a request, trying to add the mcool with the same genome assembly to the existing viewconf.

    # Get the new json.

    # Make sure the mcool displays are next to each other.
    pass

def test_add_multiple_mcool_one_at_a_time(testapp):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.
    """

    # Get the Higlass viewconf with an mcool display.
    # Add another mcool file.

    # Add the third mcool file. It should be to the right of the first.

    # Add the fourth mcool file. It should be underneath the second.

    # Add the fifth mcool file. It should be to the right of the fourth.

    # Add the sixth mcool file. It should be underneath the fifth.

    # Try to add a seventh mcool file. It should fail because there are six already.
    pass

def test_add_multiple_mcool_at_once(testapp):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.
    """

    # Get the Higlass viewconf with an mcool display.

    # Try to add 2 mcool files. Confirm there are now 3 mcool files.

    # Try to add 4 files. Only 3 should be added. There should be a warning stating only 3 were added.
    pass

def test_add_bigwig_to_multiple_mcool(testapp):
    """ With at least 2 mcool displays, try to add a bigwig.
    The bigwig should be atop the mcool displays.
    """
    # Get the Higlass viewconf with an mcool display.
    # Add another mcool file.

    # Add a bigwig file.
    # The bigwig file should be above the mcool displays.
    pass

def test_add_mcool_to_blank(testapp):
    """ Create a viewconf without any files.
    Make sure you can add multiple files to it.
    """

    # Create a blank viewconf.

    # Add 2 mcool files to the test app.

    # Confirm there are 2 files.
    pass
