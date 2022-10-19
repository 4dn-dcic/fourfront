# import json
# import os
import pytest
import requests

from dcicutils.env_utils import get_bucket_env, is_stg_or_prd_env, get_standard_mirror_env
from dcicutils.misc_utils import find_association
from dcicutils.s3_utils import s3Utils


pytestmark = [pytest.mark.working, pytest.mark.integrated]


_S3_UTILS_BUCKET_VAR_DATA = [
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
    {
        'attribute': 'tibanna_cwls_bucket',
        'health_key': 'tibanna_cwls_bucket',
        'description': "The 'tibanna-cwls' bucket",
        'template': 'TIBANNA_CWLS_BUCKET_TEMPLATE',
        'recent': True,
    },
]


def _health_page(*, url):
    return requests.get(url+"/health?format=json").json()


def _apply_s3_bucket_name_template(template, arg):
    if '%' in template:
        return template % arg
    else:
        return template


_PRD_URL = "https://data.4dnucleome.org"
_STG_URL = "http://staging.4dnucleome.org"


def _test_stg_or_prd(*, me, my_twin, env_from_beanstalk, s3utils):
    assert s3utils.url == me
    mirror_env = get_standard_mirror_env(env_from_beanstalk)
    mirror_s = s3Utils(env=mirror_env)
    assert mirror_s.url == my_twin
    mirror_health = _health_page(url=mirror_s.url)
    assert mirror_health['beanstalk_env'] == mirror_env
    assert get_standard_mirror_env(mirror_env) == env_from_beanstalk


def _test_data(*, env_from_beanstalk, s3utils):
    _test_stg_or_prd(me=_PRD_URL, my_twin=_STG_URL, env_from_beanstalk=env_from_beanstalk, s3utils=s3utils)


def _test_staging(*, env_from_beanstalk, s3utils):
    _test_stg_or_prd(me=_STG_URL, my_twin=_PRD_URL, env_from_beanstalk=env_from_beanstalk, s3utils=s3utils)


@pytest.mark.skip  # this test relies on string building the buckets and must be updated
@pytest.mark.parametrize('env', [None, 'fourfront-mastertest', 'fourfront-webdev', 'fourfront-hotseat', 'data', 'staging'])
def test_s3_utils_bare(env):

    # Calling without an env argument or explicit bucket names is only expected to work
    # in orchestrated environments with a single environment.

    s = s3Utils(env=env)

    # No matter where invoked, we should at least get an AWS s3 object
    assert s.s3

    # This is probably the same everywhere. It doesn't need to vary.
    assert s.ACCESS_KEYS_S3_KEY == 'access_key_admin'

    for datum in _S3_UTILS_BUCKET_VAR_DATA:

        attr_name = datum['attribute']
        template_name = datum['template']

        # This is behavior we don't want, but it's the normal behavior, so test stability.
        # e.g., for env=None, assert s.sys_bucket == 'elasticbeanstalk-None-system'
        #   but for env='fourfront-mastertest', assert s.sys_bucket == 'elasticbeanstalk-fourfront-mastertest-system'
        if hasattr(s, attr_name) and hasattr(s, template_name):
            assert getattr(s, attr_name) == _apply_s3_bucket_name_template(getattr(s, template_name),
                                                                           get_bucket_env(env))
        else:
            assert datum['recent'], f"Problem with: {datum}"

    # As of dcicutils 2.3.0 or 2.3.1 (there was a bug fix in the initial patch),
    # the .url is expected to always be set for beanstalk environments, even ones
    # that are not stg/prd. But it's still the case that you can call s3Utils(env=None)
    # and get back an object that has some things filled even though the bucket names
    # are nonsensical and the env is None.

    if env:

        assert s.url != ''

        health = _health_page(url=s.url)

        for k, v in health.items():
            if k.endswith("bucket"):
                print(f"Considering health page key {k}...")
                entry = find_association(_S3_UTILS_BUCKET_VAR_DATA, health_key=k)
                assert entry, f"No entry for health key {k}."
                if v:
                    assert getattr(s, entry['attribute']) == v
                    print("Attribute matches.")
                else:
                    print("No health page value.")

        env_from_beanstalk = health['beanstalk_env']

        if is_stg_or_prd_env(env):

            if env == 'data':
                _test_data(env_from_beanstalk=env_from_beanstalk, s3utils=s)
            elif env == 'staging':
                _test_staging(env_from_beanstalk=env_from_beanstalk, s3utils=s)
            elif is_stg_or_prd_env(env):
                assert env_from_beanstalk == env
                if s.url == _PRD_URL:
                    _test_data(env_from_beanstalk=env_from_beanstalk, s3utils=s)
                else:
                    _test_staging(env_from_beanstalk=env_from_beanstalk, s3utils=s)
