import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]




TEST_VIEW_CONF = {
    "views":[
        {
            "uid":"view-4dn-bigwig-0",
            "layout":{
                "h":12,
                "i":"view-4dn-bigwig-0",
                "w":12,
                "x":0,
                "y":0,
                "moved": False,
                "static": True
            },
            "tracks":{
                "top":[
                    {
                        "uid":"top-annotation-track",
                        "name":"Gene Annotations (mm10)",
                        "type":"horizontal-gene-annotations",
                        "header":"",
                        "height":55,
                        "server":"https://higlass.io/api/v1",
                        "options":{
                            "name":"Gene Annotations (mm10)",
                            "fontSize":11,
                            "labelColor":"black",
                            "coordSystem":"mm10",
                            "showTooltip": False,
                            "valueScaling":"linear",
                            "labelPosition":"hidden",
                            "plusStandColor":"blue",
                            "plusStrandColor":"blue",
                            "minusStrandColor":"red",
                            "trackBorderColor":"black",
                            "trackBorderWidth":0,
                            "geneLabelPosition":"outside",
                            "geneStrandSpacing":4,
                            "showMousePosition": False,
                            "mousePositionColor":"#999999",
                            "geneAnnotationHeight":10
                        },
                        "position":"top",
                        "minHeight":55,
                        "tilesetUid":"QDutvmyiSrec5nX4pA5WGQ",
                        "orientation":"1d-horizontal"
                    },
                    {
                        "uid":"top-chromosome-track",
                        "name":"Chromosome Axis",
                        "type":"horizontal-chromosome-labels",
                        "local":True,
                        "height":35,
                        "server":"https://higlass.io/api/v1",
                        "options":{
                            "color":"#777777",
                            "stroke":"#FFFFFF",
                            "fontSize":12,
                            "labelColor":"#888",
                            "coordSystem":"mm10",
                            "showTooltip":False,
                            "valueScaling":"linear",
                            "fontIsAligned":False,
                            "labelPosition":"hidden",
                            "plusStandColor":"blue",
                            "minusStrandColor":"red",
                            "trackBorderColor":"black",
                            "trackBorderWidth":0,
                            "showMousePosition":False,
                            "mousePositionColor":"#999999"
                        },
                        "position":"top",
                        "minHeight":30,
                        "thumbnail":None,
                        "tilesetUid":"EtrWT0VtScixmsmwFSd7zg",
                        "orientation":"1d-horizontal"
                    },
                    {
                        "uid":"bigwig-content-track-0",
                        "name":"4DNFIBAK3H3F.bw",
                        "type":"horizontal-line",
                        "height":75,
                        "server":"https://higlass.4dnucleome.org/api/v1",
                        "options":{
                            "name":"4DNFIBAK3H3F.bedGraph.gz",
                            "labelColor":"#888",
                            "coordSystem":"mm10",
                            "showTooltip":False,
                            "valueScaling":"linear",
                            "labelPosition":"topRight",
                            "plusStandColor":"blue",
                            "lineStrokeColor":"#333",
                            "lineStrokeWidth":1.25,
                            "labelTextOpacity":0.5,
                            "minusStrandColor":"red",
                            "trackBorderColor":"black",
                            "trackBorderWidth":0,
                            "showMousePosition":True,
                            "mousePositionColor":"#999999",
                            "axisPositionHorizontal":"left"
                        },
                        "position":"top",
                        "tilesetUid":"LiQp5dy7SoycoZ7qF0sqxQ",
                        "orientation":"1d-horizontal"
                    },
                    {
                        "uid":"bigwig-content-track-1",
                        "name":"4DNFIHN2B9WI.bw",
                        "type":"horizontal-line",
                        "height":75,
                        "server":"https://higlass.4dnucleome.org/api/v1",
                        "options":{
                            "name":"4DNFIHN2B9WI.bedGraph.gz",
                            "labelColor":"#888",
                            "coordSystem":"mm10",
                            "showTooltip":False,
                            "valueScaling":"linear",
                            "labelPosition":"topRight",
                            "plusStandColor":"blue",
                            "lineStrokeColor":"#333",
                            "lineStrokeWidth":1.25,
                            "labelTextOpacity":0.5,
                            "minusStrandColor":"red",
                            "trackBorderColor":"black",
                            "trackBorderWidth":0,
                            "showMousePosition":True,
                            "mousePositionColor":"#999999",
                            "axisPositionHorizontal":"left"
                        },
                        "position":"top",
                        "tilesetUid":"KvHa6_NgT_WG1ilBfa9HLg",
                        "orientation":"1d-horizontal"
                    }
                ],
                "left":[

                ],
                "right":[

                ],
                "whole":[

                ],
                "bottom":[

                ],
                "center":[

                ],
                "gallery":[

                ]
            },
            "initialXDomain":[
                -544140022.2230138,
                579928228.3034478
            ],
            "initialYDomain":[
                -58953193.651658446,
                139996939.18488348
            ],
            "autocompleteSource":"/api/v1/suggest/?d=P0PLbQMwTYGy-5uPIQid7A&",
            "genomePositionSearchBox":{
                "visible":True,
                "chromInfoId":"mm10",
                "autocompleteId":"P0PLbQMwTYGy-5uPIQid7A",
                "chromInfoServer":"https://higlass.io/api/v1",
                "autocompleteServer":"https://higlass.io/api/v1"
            }
        }
    ],
    "editable":True,
    "zoomFixed":False,
    "zoomLocks":{
        "locksByViewUid":{

        },
        "locksDict":{

        }
    },
    "exportViewUrl":"/api/v1/viewconfs",
    "locationLocks":{
        "locksByViewUid":{

        },
        "locksDict":{

        }
    },
    "valueScaleLocks":{
        "locksByViewUid":{

        },
        "locksDict":{

        }
    },
    "trackSourceServers":[
        "https://higlass.io/api/v1"
    ]
}




@pytest.fixture
def higlass_view_config_without_lab_award(testapp):
    item = {
        'title': 'Test ViewConf without Lab or Award',
        'viewconfig' : TEST_VIEW_CONF
    }
    return testapp.post_json('/higlass-view-configs', item).json['@graph'][0]


@pytest.fixture
def higlass_view_config_with_lab_award(testapp, lab, award):
    item = {
        'award': award['@id'],
        'lab': lab['@id'],
        'title': 'Test ViewConf without Lab or Award',
        'viewconfig' : TEST_VIEW_CONF
    }
    return testapp.post_json('/higlass-view-configs', item).json['@graph'][0]

