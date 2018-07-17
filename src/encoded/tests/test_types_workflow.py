import pytest
import json
from dcicutils.ff_utils import patch_metadata, get_metadata
pytestmark = [pytest.mark.working]


@pytest.fixture()
def input_json(workflow):
    # use workflow that should always be in webdev
    # item uuid (e6814e3b-8adb-4f8c-b7d7-3485f99be2e5) is specified so that
    # the number of
    item = {
      "app_name": "hi-c-processing-bam",
      "uuid": "e6814e3b-8adb-4f8c-b7d7-3485f99be2e5",
      "parameters": {
      },
      "output_bucket": "elasticbeanstalk-fourfront-webdev-wfoutput",
      "tag": "0.2.5",
      "config": {
      },
      "workflow_uuid": "023bfb3e-9a8b-42b9-a9d4-216079526f68",
      "input_files": [
        {
          "object_key": [
            "4DNFI9H51IRL.bam",
            "4DNFIP16HHGH.bam"
          ],
          "bucket_name": "elasticbeanstalk-fourfront-webdev-wfoutput",
          "workflow_argument_name": "input_bams",
          "uuid": [
            "68f38e45-8c66-41e2-99ab-b0b2fcd20d45",
            "7420a20a-aa77-4ea8-b0b0-32a8e80c9bcb"
          ]
        },
        {
          "object_key":"4DNFI823LSII.chrom.sizes",
          "bucket_name": "elasticbeanstalk-fourfront-webprod-files",
          "workflow_argument_name": "chromsize",
          "uuid": "4a6d10ee-2edb-4402-a98f-0edb1d58f5e9"
        }
      ],
      "metadata_only": True,
      "output_files": [
              {"workflow_argument_name": "annotated_bam",
               "uuid": "68f38e45-8c66-41e2-99ab-b0b2fcd20d45"
              },
              {"workflow_argument_name": "filtered_pairs",
               "uuid": "7054061b-e87d-4ca4-9693-d186348f5206"
              }
      ]
    }

    return item


@pytest.fixture()
def workflow(testapp, software, award, lab):
    # ensure we always use uuid that's on fourfront-webdev
    workflow_uuid = '023bfb3e-9a8b-42b9-a9d4-216079526f68'
    return workflow_uuid


def test_pseudo_run(testapp, input_json):
    wfr_uuid = input_json['uuid']
    res = testapp.post_json('/WorkflowRun/pseudo-run', input_json)
    assert(res)
    output = json.loads(res.json['output'])
    assert output['uuid'] == wfr_uuid
    # cleanup -- patch status to deleted if it is not already
    wfr_obj = get_metadata(wfr_uuid, ff_env='fourfront-webdev',
                                    add_on='frame=object&datastore=database')
    if wfr_obj['status'] != 'deleted':
        patch_metadata({'status':'deleted'}, output['ff_meta']['uuid'], ff_env='fourfront-webdev')
