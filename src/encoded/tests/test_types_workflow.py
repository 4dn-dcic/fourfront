import pytest
import json
from dcicutils.ff_utils import patch_metadata
from ..types.workflow import _wfoutput_bucket_for_env
pytestmark = [pytest.mark.setone, pytest.mark.working]


@pytest.fixture()
def input_json(workflow):
    # use workflow that should always be in webdev
    item = {
      "app_name": "hi-c-processing-bam",
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

@pytest.mark.xfail
def test_pseudo_run(testapp, input_json):
    # this test can be problematic; uncomment the following line to disable it
    # assert False

    res = testapp.post_json('/WorkflowRun/pseudo-run', input_json)
    assert(res)

    # cleanup
    output = json.loads(res.json['output'])
    patch_metadata({'status':'deleted'}, output['ff_meta']['uuid'], ff_env='fourfront-webdev')


def test_workflow_for_env():

    # These tests will want to become more abstract sometime, but for transition they test that
    # we're getting obvious values we expect. -kmp 1-Apr-2020

    # Fourfront prod environments

    assert _wfoutput_bucket_for_env('fourfront-webprod') == 'elasticbeanstalk-fourfront-webprod-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-webprod2') == 'elasticbeanstalk-fourfront-webprod-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-blue') == 'elasticbeanstalk-fourfront-webprod-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-green') == 'elasticbeanstalk-fourfront-webprod-wfoutput'

    # Other (non-prod) Fourfront environments

    assert _wfoutput_bucket_for_env('fourfront-mastertest') == 'elasticbeanstalk-fourfront-mastertest-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-webdev') == 'elasticbeanstalk-fourfront-webdev-wfoutput'

    # CGAP prod environments

    assert _wfoutput_bucket_for_env('fourfront-cgap') == 'elasticbeanstalk-fourfront-cgap-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-cgap-green') == 'elasticbeanstalk-fourfront-cgap-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-cgap-blue') == 'elasticbeanstalk-fourfront-cgap-wfoutput'

    # There is a bug in is_stg_or_prd_env that needs to be fixed before these tests can run right:
    from dcicutils.env_utils import is_stg_or_prd_env, CGAP_ENV_PRODUCTION_BLUE_NEW, CGAP_ENV_PRODUCTION_GREEN_NEW
    if is_stg_or_prd_env(CGAP_ENV_PRODUCTION_BLUE_NEW) and is_stg_or_prd_env(CGAP_ENV_PRODUCTION_GREEN_NEW):
        assert _wfoutput_bucket_for_env('cgap-blue') == 'elasticbeanstalk-fourfront-cgap-wfoutput'
        assert _wfoutput_bucket_for_env('cgap-green') == 'elasticbeanstalk-fourfront-cgap-wfoutput'

    # Other (non-prod) CGAP environments

    assert _wfoutput_bucket_for_env('fourfront-cgapwolf') == 'elasticbeanstalk-fourfront-cgapwolf-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-cgaptest') == 'elasticbeanstalk-fourfront-cgaptest-wfoutput'
    assert _wfoutput_bucket_for_env('fourfront-yellow') == 'elasticbeanstalk-fourfront-yellow-wfoutput'

