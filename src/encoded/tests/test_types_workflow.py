import pytest
pytestmark = [pytest.mark.working]


@pytest.fixture()
def input_json(workflow):
    # TODO: add object key to input_files
    item = {
        "wfr_alias": ['dekker:hic_run_180101_0001'],
        "workflow_uuid": workflow['uuid'],
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
    item = {
        "award": award['@id'],
        "lab": lab['@id'],
        "title": "some workflow",
        "name": "some workflow",
        "workflow_type": "Other",
        "steps": [{"meta": {"software_used": [software['@id']]}}]
    }

    return testapp.post_json('/workflow', item).json['@graph'][0]


def test_pseudo_run(testapp, workflow, input_json):
    res = testapp.post_json('/WorkflowRun/pseudo-run', input_json)
    print(res)
    assert(res)
