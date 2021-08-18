import json
import os
import pytest
import requests

from dcicutils.env_utils import get_bucket_env, is_stg_or_prd_env, get_standard_mirror_env
from dcicutils.misc_utils import find_association
from dcicutils.s3_utils import s3Utils



pytestmark = [pytest.mark.working, pytest.mark.unit]


S3_UTILS_BUCKET_VAR_DATA = [
    {
        'attribute': 'sys_bucket',
        'health_key': 'system_bucket',
        'description': "The 'xxx-system' bucket",
        'template': 'SYS_BUCKET_TEMPLATE',
        'recent': False,
    },
    {
        'attribute': 'outfile_bucket',
        'health_key': 'processed_file_bucket',
        'description': "The 'xxx-wfoutput' bucket",
        'template': 'OUTFILE_BUCKET_TEMPLATE',
        'recent': False,
    },
    {
        'attribute': 'raw_file_bucket',
        'health_key': 'file_upload_bucket',
        'description': "The 'xxx-files' bucket",
        'template': 'RAW_BUCKET_TEMPLATE',
        'recent': False,
    },
    {
        'attribute': 'blob_bucket',
        'health_key': 'blob_bucket',
        'description': "The 'xxx-blobs' bucket",
        'template': 'BLOB_BUCKET_TEMPLATE',
        'recent': False,
    },
    {
        'attribute': 'metadata_bucket',
        'health_key': 'metadata_bucket',
        'description': "The 'xxx-metadata-bundles' bucket",
        'template': 'METADATA_BUCKET_TEMPLATE',
        'recent': True,
    },
    {
        'attribute': 'tibanna_output_bucket',
        'health_key': 'tibanna_output_bucket',
        'description': "The 'tibanna-output' bucket",
        'template': 'TIBANNA_OUTPUT_BUCKET_TEMPLATE',
        'recent': True,
    },
]    


@pytest.mark.parametrize('env', [None, 'fourfront-mastertest', 'fourfront-green', 'fourfront-blue', 'data', 'staging'])
def test_s3_utils_bare(env):

    # Calling without an env argument or explicit bucket names is only expected to work
    # in orchestrated environments with a single environment.

    s = s3Utils(env=env)

    # No matter where invoked, we should at least get an AWS s3 object
    assert s.s3

    # This is probably the same everywhere. It doesn't need to vary.
    assert s.ACCESS_KEYS_S3_KEY == 'access_key_admin'

    def apply_template(template, arg):
        if '%' in template:
            return template % arg
        else:
            return template

    for datum in S3_UTILS_BUCKET_VAR_DATA:

        attr_name = datum['attribute']
        template_name = datum['template']

        # This is behavior we don't want, but it's the normal behavior, so test stability.
        # e.g., for env=None, assert s.sys_bucket == 'elasticbeanstalk-None-system'
        #   but for env='fourfront-mastertest', assert s.sys_bucket == 'elasticbeanstalk-fourfront-mastertest-system'
        if hasattr(s, attr_name) and hasattr(s, template_name):
            assert getattr(s, attr_name) == apply_template(getattr(s, template_name), get_bucket_env(env))
        else:
            assert datum['recent'], f"Problem with: {datum}"

    if s.url is not '':

        assert is_stg_or_prd_env(env)

        def health_page(url):
            return requests.get(s.url+"/health?format=json").json()

        health = health_page(s.url)

        for k, v in health.items():
            if k.endswith("bucket"):
                print(f"Considering health page key {k}...")
                entry = find_association(S3_UTILS_BUCKET_VAR_DATA, health_key=k)
                assert entry, f"No entry for health key {k}."
                if v:
                    assert getattr(s, entry['attribute']) == v
                    print("Attribute matches.")
                else:
                    print("No health page value.")

        beanstalk_env = health['beanstalk_env']

        prd_url = "https://data.4dnucleome.org"
        stg_url = "http://staging.4dnucleome.org"

        def test_stg_or_prd(me, my_twin):
            assert s.url == me
            mirror_s = s3Utils(env=get_standard_mirror_env(beanstalk_env))
            assert mirror_s.url == my_twin
            mirror_health = health_page(mirror_s.url)
            assert mirror_health['beanstalk_env'] == beanstalk_env

        def test_data():
            test_stg_or_prd(prd_url, stg_url)

        def test_staging():
            test_stg_or_prd(stg_url, prd_url)

        if env == 'data':
            test_data()
        elif env == 'staging':
            test_staging()
        else:
            assert beanstalk_env == env
            if s.url == prd_url:
                test_data()
            else:
                test_staging()
