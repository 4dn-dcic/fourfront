import pytest
pytestmark = [pytest.mark.working]


@pytest.fixture()
def input_json(workflow):
    # use workflow that should always be in webdev 
    item = {
        "app_name": "hi-c-processing-bam",
        "workflow_uuid": workflow,
        "input_files": [{
                         "object_key": [
                             "4DNFI9H51IRL.bam",
                             "4DNFIP16HHGH.bam"
                         ],
                         "bucket_name": "elasticbeanstalk-fourfront-webdev-wfoutput",
                         "workflow_argument_name": "input_bams",
                         "uuid": ["68f38e45-8c66-41e2-99ab-b0b2fcd20d45",
                                  "7420a20a-aa77-4ea8-b0b0-32a8e80c9bcb"
                                  ]
                        },
                        {
                        "object_key": "4DNFI823LSII.chrom.sizes",
                        "bucket_name": "elasticbeanstalk-fourfront-webprod-files",
                        "workflow_argument_name": "chromsize",
                        "uuid": "4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
                        }],
        "metadata_only": True,
        "config": {'instance_type': 't2.micro'},
        "parameters": {},
        "output_files": [{
                "workflow_argument_name": "annotated_bam",
                "uuid": "ecabab05-3738-47fe-8b55-b08334463c43"
            },
            {
                "workflow_argument_name": "filtered_pairs",
                "uuid": "7054061b-e87d-4ca4-9693-d186348f5206"
            }
        ]
    }
    return item


@pytest.fixture()
def workflow(testapp, software, award, lab):
    # ensure we always use uuid that's on fourfront-webdev
    workflow_uuid = 'd3f25cd3-e726-4b3c-a022-48f844474b41'
    return workflow_uuid

def test_pseudo_run(testapp, input_json):
    res = testapp.post_json('/WorkflowRun/pseudo-run', input_json)
    print(res)
    assert(res)
