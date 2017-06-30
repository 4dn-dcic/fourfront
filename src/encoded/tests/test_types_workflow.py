import pytest
pytestmark = pytest.mark.working


@pytest.fixture
def dummy_software(lab, award):
    return {
        "uuid": "02d636b9-d82d-4da9-950c-2ca994a13131",
        "name": "fastqc",
        "software_type": ["quality metric generator"],
        "version": "0.11.4",
        "lab": lab['@id'],
        "award": award['@id']
    }

@pytest.fixture
def merge_pairs(lab, award, dummy_software):
    return {
        "uuid": "e4068c7a-49e5-4c33-afab-9ec90d65faf3",
        "name": "merge_pairs",
        "version": "13",
        "analysis_step_types": ["file merging"],
        "software_used": dummy_software['uuid'],
        "lab": lab['@id'],
        "award": award['@id']
    }

@pytest.fixture
def cooler(lab, award, dummy_software):
    return {
        "uuid":"302366fb-49e5-4c33-afab-9ec90d65faf3",
        "version":"12",
        "software_used":dummy_software['uuid'],
        "name":"cooler",
        "analysis_step_types":[ "aggregation" ],
        "lab": lab['@id'],
        "award": award['@id']
    }

@pytest.fixture
def hic2mcool(lab, award, dummy_software):
    return {
        "uuid":"0786554a-49e5-4c33-afab-9ec90d65faf3",
        "version":"6",
        "software_used":dummy_software['uuid'],
        "name":"hic2mcool",
        "analysis_step_types":["file format conversion"],
        "lab": lab['@id'],
        "award": award['@id']
    }

@pytest.fixture
def pairs2hic(lab, award, dummy_software):
    return {
        "uuid":"a9d0e56c-49e5-4c33-afab-9ec90d65faf3",
        "software_used":dummy_software['uuid'],
        "name":"pairs2hic",
        "version":"12",
        "analysis_step_types":[ "aggregation", "normalization" ],
        "lab": lab['@id'],
        "award": award['@id']
    }


@pytest.fixture
def custom_workflow_data(lab, award, merge_pairs, cooler, pairs2hic, hic2mcool):
    return {
        "title": "hi-c-processing-partb/15",
        "description":"Hi-C processing part B revision 15",
        "lab": lab['@id'],
        "cwl_pointer":"https://raw.githubusercontent.com/4dn-dcic/pipelines-cwl/master/cwl_sbg/hi-c-processing-partb.15.cwl",
        "uuid":"b9829418-49e5-4c33-afab-9ec90d65faf3",
        "arguments":[
            {
                "workflow_argument_name":"chrsizes",
                "argument_type":"Input file",
                "argument_format":"chromsizes",
                "argument_mapping":[
                    {
                        "step_argument_name":"chromsizes_file",
                        "step_argument_type":"Input file",
                        "workflow_step":"pairs2hic"
                    }
                ]
            },
            {
                "workflow_argument_name":"input_pairs",
                "argument_type":"Input file",
                "argument_format":"pairs",
                "argument_mapping":[
                    {
                        "step_argument_name":"input_pairs",
                        "step_argument_type":"Input file",
                        "workflow_step":"merge_pairs"
                    }
                ]
            },
            {
                "workflow_argument_name":"input_pairs_index",
                "argument_type":"Input file",
                "argument_format":"pairs",
                "argument_mapping":[
                    {
                        "step_argument_name":"input_pairs_index",
                        "step_argument_type":"Input file",
                        "workflow_step":"merge_pairs"
                    }
                ]
            },
            {
                "workflow_argument_name":"ncores",
                "argument_type":"parameter",
                "argument_mapping":[
                    {
                        "step_argument_name":"ncores",
                        "step_argument_type":"parameter",
                        "workflow_step":"cooler"
                    }
                ]
            },
            {
                "workflow_argument_name":"binsize",
                "argument_type":"parameter",
                "argument_mapping":[
                    {
                        "step_argument_name":"binsize",
                        "step_argument_type":"parameter",
                        "workflow_step":"cooler"
                    }
                ]
            },
            {
                "workflow_argument_name":"min_res",
                "argument_type":"parameter",
                "argument_mapping":[
                    {
                        "step_argument_name":"min_res",
                        "step_argument_type":"parameter",
                        "workflow_step":"pairs2hic"
                    }
                ]
            },
            {
                "workflow_argument_name":"normalization_type",
                "argument_type":"parameter",
                "argument_mapping":[
                    {
                        "step_argument_name":"normalization_type",
                        "step_argument_type":"parameter",
                        "workflow_step":"hic2mcool"
                    }
                ]
            },
            {
                "workflow_argument_name":"output_pairs_index",
                "argument_type":"Output processed file",
                "argument_format":"pairs_px2",
                "argument_mapping":[
                    {
                        "step_argument_name":"output_pairs_index",
                        "step_argument_type":"Output file",
                        "workflow_step":"merge_pairs"
                    }
                ]
            },
            {
                "workflow_argument_name":"output_pairs",
                "argument_type":"Output processed file",
                "argument_format":"pairs",
                "argument_mapping":[
                    {
                        "step_argument_name":"output_pairs",
                        "step_argument_type":"Output file",
                        "workflow_step":"merge_pairs"
                    }
                ]
            },
            {
                "workflow_argument_name":"out_cool",
                "argument_type":"Output processed file",
                "argument_format":"cool",
                "argument_mapping":[
                    {
                        "step_argument_name":"out_cool",
                        "step_argument_type":"Output file",
                        "workflow_step":"cooler"
                    }
                ]
            },
            {
                "workflow_argument_name":"output_hic",
                "argument_type":"Output processed file",
                "argument_format":"hic",
                "argument_mapping":[
                    {
                        "step_argument_name":"output_hic",
                        "step_argument_type":"Output file",
                        "workflow_step":"pairs2hic"
                    }
                ]
            },
            {
                "workflow_argument_name":"out_mcool",
                "argument_type":"Output processed file",
                "argument_format":"mcool",
                "argument_mapping":[
                    {
                        "step_argument_name":"out_mcool",
                        "step_argument_type":"Output file",
                        "workflow_step":"hic2mcool"
                    }
                ]
            },
            {
                "argument_mapping":[
                    {
                        "step_argument_name":"pairs_index",
                        "step_argument_type":"Input file or parameter",
                        "workflow_step":"cooler"
                    },
                    {
                        "step_argument_name":"output_pairs_index",
                        "step_argument_type":"Output file or parameter",
                        "workflow_step":"merge_pairs"
                    }
                ]
            },
            {
                "argument_mapping":[
                    {
                        "step_argument_name":"input_pairs",
                        "step_argument_type":"Input file or parameter",
                        "workflow_step":"pairs2hic"
                    },
                    {
                        "step_argument_name":"output_pairs",
                        "step_argument_type":"Output file or parameter",
                        "workflow_step":"merge_pairs"
                    }
                ]
            },
            {
                "argument_mapping":[
                    {
                        "step_argument_name":"input_hic",
                        "step_argument_type":"Input file or parameter",
                        "workflow_step":"hic2mcool"
                    },
                    {
                        "step_argument_name":"output_hic",
                        "step_argument_type":"Output file or parameter",
                        "workflow_step":"pairs2hic"
                    }
                ]
            }
        ],
        "workflow_type":"Hi-C data analysis",
        "name":"hi-c-processing-partb/15",
        "workflow_steps":[
            {
                "step_name":"merge_pairs",
                "step": merge_pairs['uuid']
            },
            {
                "step_name":"cooler",
                "step": cooler['uuid']
            },
            {
                "step_name":"pairs2hic",
                "step": pairs2hic['uuid']
            },
            {
                "step_name":"hic2mcool",
                "step": hic2mcool['uuid']
            }
        ],
        "award": award['@id']
    }

@pytest.fixture
def workflow_dependencies(testapp, dummy_software, merge_pairs, cooler, pairs2hic, hic2mcool):
    res1 = testapp.post_json('/software', dummy_software).json['@graph'][0]
    res2 = testapp.post_json('/analysis-steps', merge_pairs).json['@graph'][0]
    res3 = testapp.post_json('/analysis-steps', cooler).json['@graph'][0]
    res4 = testapp.post_json('/analysis-steps', pairs2hic).json['@graph'][0]
    return testapp.post_json('/analysis-steps', hic2mcool).json['@graph'][0]

def test_workflow_dependencies(workflow_dependencies):
    assert workflow_dependencies['version'] == "6"

def test_calculated_analysis_steps(testapp, workflow_dependencies, custom_workflow_data):
    res = testapp.post_json('/workflow', custom_workflow_data).json['@graph'][0]

    assert res['display_title'] == custom_workflow_data["title"]

    # Remove this line if analysis_steps becomes embedded. Maybe.
    res = testapp.get('/workflows/' + custom_workflow_data['uuid'] + '/').json

    assert isinstance(res['analysis_steps'], list)

    assert len(res['analysis_steps']) == len(custom_workflow_data['workflow_steps'])

    assert isinstance(res['analysis_steps'][0]["inputs"], list)
    assert isinstance(res['analysis_steps'][0]["outputs"], list)
    assert len(res['analysis_steps'][0]["inputs"]) == 2
    assert len(res['analysis_steps'][0]["outputs"]) == 2
    
    assert isinstance(res['analysis_steps'][0]["inputs"][0]["source"], list)
    assert isinstance(res['analysis_steps'][0]["outputs"][0]["target"], list)
    assert len(res['analysis_steps'][0]["inputs"][0]["source"]) == 1

    assert res['analysis_steps'][0]["inputs"][0]["name"] == 'input_pairs'
    assert res['analysis_steps'][0]["inputs"][0]["source"][0]["name"] == 'input_pairs'
    assert res['analysis_steps'][0]["inputs"][0]["source"][0]["type"] == 'Workflow Input File'

    assert res['analysis_steps'][0]["outputs"][0]["name"] in ['output_pairs', 'output_pairs_index']
    assert res['analysis_steps'][0]["outputs"][1]["name"] in ['output_pairs', 'output_pairs_index']

    assert len(res['analysis_steps'][0]["outputs"][0]["target"]) == 2
    assert res['analysis_steps'][0]["outputs"][0]["target"][0]["type"] == "Workflow Output File"
    assert res['analysis_steps'][0]["outputs"][0]["target"][1]["type"] == "Input file or parameter"
    assert res['analysis_steps'][0]["outputs"][0]["target"][1]["step"] == "cooler"

#TODO: Tests for WorkflowRun. Will do after that structure / method is stable for some time.