"""Regression coverage for the S3 credential mechanism behind file upload and download.

Fourfront mints scoped, temporary S3 upload credentials with ``sts:AssumeRole``.
Downloads only discover locations; upload keys are calculated locally.
Neither read path mints PutObject credentials.
The upload path must not use
``sts:GetFederationToken``: AWS only accepts that call from an IAM user holding long-lived
access keys and rejects it whenever the caller itself holds temporary credentials, which is
the case for every role-based caller (ECS task roles, GitHub Actions OIDC).

These tests are deliberately free of AWS, Postgres and Elasticsearch -- ``boto3`` is mocked
wholesale -- so they can run with ``--noconftest``.  They assert the *mechanism*, the
*authorization boundary* (session policy) and the *failure behavior*, since the pre-existing
``test_file.py::test_external_creds`` mocks ``boto3`` without asserting any of the three and
therefore passes under either mechanism.
"""

import boto3
import json
import pytest

from botocore.exceptions import BotoCoreError, ClientError, ParamValidationError
from unittest import mock

from ..types.file import File, external_creds, s3_upload_role_arn


pytestmark = [pytest.mark.working, pytest.mark.unit]


ROLE_ARN = 'arn:aws:iam::643366669028:role/test-s3-upload-role'
BUCKET = 'test-wfout-bucket'
KEY = 'd3b07384-d9a0-4c9b-9a0b-0e4f2ba2c9de/4DNFI000AAAA.fastq.gz'


def _assume_role_response():
    """A structurally faithful (abridged) sts:AssumeRole response."""
    return {
        'Credentials': {
            'AccessKeyId': 'ASIATESTTESTTESTTEST',
            'SecretAccessKey': 'test-secret-access-key',
            'SessionToken': 'test-session-token',
            # Deliberately not a string: external_creds must cast it for JSON serialization.
            'Expiration': mock.sentinel.expiration,
        },
        'AssumedRoleUser': {
            'Arn': 'arn:aws:sts::643366669028:assumed-role/test-s3-upload-role/4DNFI000AAAA.fastq.gz',
            'AssumedRoleId': 'AROATESTTESTTESTTEST:4DNFI000AAAA.fastq.gz',
        },
        'ResponseMetadata': {'RequestId': 'test-request-id'},
    }


@pytest.fixture
def sts(monkeypatch):
    """Mock boto3 inside types.file and hand back the STS client stub."""
    monkeypatch.setenv('S3_UPLOAD_ROLE_ARN', ROLE_ARN)
    monkeypatch.delenv('IDENTITY', raising=False)
    with mock.patch('encoded.types.file.boto3') as mocked_boto3:
        client = mock.MagicMock()
        client.assume_role.return_value = _assume_role_response()
        mocked_boto3.client.return_value = client
        client.mocked_boto3 = mocked_boto3
        yield client


def test_external_creds_uses_assume_role_not_federation_token(sts):
    """The upload credential mint is sts:AssumeRole, called on the ambient credential chain."""
    external_creds(BUCKET, KEY, '4DNFI000AAAA.fastq.gz')

    sts.assume_role.assert_called_once()
    assert not sts.get_federation_token.called
    # No access keys are handed to boto3: passing them is what the old federation-token path
    # needed and what breaks under role-based (temporary) credentials.
    sts.mocked_boto3.client.assert_called_once_with('sts')


def test_external_creds_assume_role_call_shape(sts):
    """Role ARN, session name and session policy are all passed to AssumeRole."""
    external_creds(BUCKET, KEY, '4DNFI000AAAA.fastq.gz')

    kwargs = sts.assume_role.call_args.kwargs
    assert kwargs['RoleArn'] == ROLE_ARN
    assert kwargs['RoleSessionName'] == '4DNFI000AAAA.fastq.gz'
    # RoleSessionName must be 2-64 chars; callers truncate filenames to 32.
    assert 2 <= len(kwargs['RoleSessionName']) <= 64


def test_external_creds_session_policy_is_not_broadened(sts):
    """The session policy still grants exactly s3:PutObject on the single target key."""
    external_creds(BUCKET, KEY, '4DNFI000AAAA.fastq.gz')

    policy = json.loads(sts.assume_role.call_args.kwargs['Policy'])
    assert policy['Version'] == '2012-10-17'
    assert policy['Statement'] == [
        {
            'Effect': 'Allow',
            'Action': 's3:PutObject',
            'Resource': f'arn:aws:s3:::{BUCKET}/{KEY}',
        }
    ]


def test_external_creds_maps_assumed_role_user_fields(sts):
    """AssumeRole's AssumedRoleUser replaces GetFederationToken's FederatedUser."""
    response = _assume_role_response()
    result = external_creds(BUCKET, KEY, '4DNFI000AAAA.fastq.gz')

    credentials = result['upload_credentials']
    assert credentials['federated_user_arn'] == response['AssumedRoleUser']['Arn']
    assert credentials['federated_user_id'] == response['AssumedRoleUser']['AssumedRoleId']
    assert credentials['request_id'] == response['ResponseMetadata']['RequestId']
    assert credentials['AccessKeyId'] == response['Credentials']['AccessKeyId']
    assert credentials['SessionToken'] == response['Credentials']['SessionToken']
    # Cast to string so the propsheet stays JSON-serializable.
    assert credentials['Expiration'] == str(mock.sentinel.expiration)


def test_external_creds_preserves_public_key_names(sts):
    """Consumers read `upload_credentials` / `upload_url`; the migration must not rename them."""
    result = external_creds(BUCKET, KEY, '4DNFI000AAAA.fastq.gz')

    assert result['service'] == 's3'
    assert result['bucket'] == BUCKET
    assert result['key'] == KEY
    assert result['upload_credentials']['upload_url'] == f's3://{BUCKET}/{KEY}'
    assert result['upload_credentials']['key'] == KEY


def test_external_creds_without_name_makes_no_sts_call(sts):
    """Linking metadata to a pre-existing S3 object still mints no credentials at all."""
    result = external_creds(BUCKET, KEY, None)

    assert result == {'service': 's3', 'bucket': BUCKET, 'key': KEY, 'upload_credentials': {}}
    assert not sts.assume_role.called
    assert not sts.get_federation_token.called


# --- role ARN sourcing -------------------------------------------------------------------


def test_role_arn_from_identity(monkeypatch):
    """Production sources the role from the global application configuration identity."""
    monkeypatch.setenv('IDENTITY', 'C4AppConfigTest')
    monkeypatch.delenv('S3_UPLOAD_ROLE_ARN', raising=False)
    with mock.patch('encoded.types.file.assume_identity',
                    return_value={'S3_UPLOAD_ROLE_ARN': ROLE_ARN}) as assume_identity:
        assert s3_upload_role_arn() == ROLE_ARN
    assume_identity.assert_called_once_with()


def test_role_arn_from_environment_when_no_identity(monkeypatch):
    monkeypatch.delenv('IDENTITY', raising=False)
    monkeypatch.setenv('S3_UPLOAD_ROLE_ARN', ROLE_ARN)
    with mock.patch('encoded.types.file.assume_identity') as assume_identity:
        assert s3_upload_role_arn() == ROLE_ARN
    assert not assume_identity.called


def test_role_arn_falls_back_to_environment_under_identity(monkeypatch):
    """The repo-root conftest always sets IDENTITY, so the environment must remain reachable."""
    monkeypatch.setenv('IDENTITY', 'C4AppConfigTest')
    monkeypatch.setenv('S3_UPLOAD_ROLE_ARN', ROLE_ARN)
    with mock.patch('encoded.types.file.assume_identity', return_value={}):
        assert s3_upload_role_arn() == ROLE_ARN


def test_role_arn_missing_everywhere_is_none(monkeypatch):
    monkeypatch.setenv('IDENTITY', 'C4AppConfigTest')
    monkeypatch.delenv('S3_UPLOAD_ROLE_ARN', raising=False)
    with mock.patch('encoded.types.file.assume_identity', return_value={}):
        assert s3_upload_role_arn() is None


# --- upload minting and read-only location discovery --------------------------------------


class _StubFileFormat:
    properties = {'standard_file_extension': 'fastq.gz'}


class _StubRegistry:
    """Minimal stand-in for the Pyramid registry used by File.build_external_creds."""

    settings = {
        'file_wfout_bucket': 'test-wfout-bucket',
        'file_upload_bucket': 'test-upload-bucket',
        'file_upload_profile_name': 'test-profile',
    }

    def __getitem__(self, item):
        assert item == 'collections'
        return {'FileFormat': {'fastq': _StubFileFormat()}}


def test_build_external_creds_mints_upload_credentials_with_assume_role(sts):
    """Only an upload needs scoped PutObject credentials."""
    uuid = 'd3b07384-d9a0-4c9b-9a0b-0e4f2ba2c9de'
    properties = {'file_format': 'fastq', 'accession': '4DNFI000AAAA', 'filename': 'reads.fastq.gz'}

    result = File.build_external_creds(_StubRegistry(), uuid, properties)

    sts.assume_role.assert_called_once()
    assert not sts.get_federation_token.called
    kwargs = sts.assume_role.call_args.kwargs
    assert kwargs['RoleArn'] == ROLE_ARN
    assert kwargs['RoleSessionName'] == 'reads.fastq.gz'
    assert json.loads(kwargs['Policy'])['Statement'][0]['Resource'] == \
        f"arn:aws:s3:::{result['bucket']}/{result['key']}"
    assert result['key'] == f'{uuid}/4DNFI000AAAA.fastq.gz'


def test_presigned_download_url_uses_ambient_credentials(sts):
    """Serving a download still presigns with the ambient chain -- no credential mint."""
    external = {'bucket': BUCKET, 'key': KEY}
    request = mock.Mock(range=None)

    File.get_presigned_url_location(mock.Mock(), external, request, '4DNFI000AAAA.fastq.gz')

    sts.mocked_boto3.client.assert_called_once_with('s3')
    assert not sts.assume_role.called
    assert not sts.get_federation_token.called


@pytest.mark.parametrize('name', ['x', 'reads with spaces.fastq.gz', 'Δ.fastq.gz', 'a' * 100])
def test_assume_role_session_label_accepts_valid_filenames(sts, name):
    import re
    external_creds(BUCKET, KEY, name)
    kwargs = sts.assume_role.call_args.kwargs
    assert re.fullmatch(r'[A-Za-z0-9_+=,.@-]{2,64}', kwargs['RoleSessionName'])
    assert json.loads(kwargs['Policy'])['Statement'][0]['Resource'] == f'arn:aws:s3:::{BUCKET}/{KEY}'


def test_location_discovery_never_mints_put_credentials(sts):
    properties = {'file_format': 'fastq', 'accession': '4DNFI000AAAA', 'filename': 'reads.fastq.gz'}
    with mock.patch('encoded.types.file.s3_upload_role_arn', side_effect=AssertionError('read requires no role')):
        result = File.build_external_creds(_StubRegistry(), 'uuid', properties, make_upload_credentials=False)
    assert result['upload_credentials'] == {}
    assert result['bucket'] == BUCKET  # wfout wins when both buckets have the key
    sts.head_object.assert_called_once_with(Bucket=BUCKET, Key='uuid/4DNFI000AAAA.fastq.gz')
    sts.assume_role.assert_not_called()


def test_location_discovery_falls_back_to_upload_bucket(sts):
    sts.head_object.side_effect = [ClientError({'Error': {'Code': '404'}}, 'HeadObject'), {}]
    properties = {'file_format': 'fastq', 'accession': '4DNFI000AAAA'}
    result = File.build_external_creds(_StubRegistry(), 'uuid', properties, make_upload_credentials=False)
    assert result['bucket'] == 'test-upload-bucket'
    assert sts.head_object.call_count == 2
    sts.assume_role.assert_not_called()


@pytest.mark.parametrize('extra', [False, True])
def test_download_without_propsheet_never_requests_upload_credentials(extra):
    from pyramid.httpexceptions import HTTPTemporaryRedirect
    from ..types import file as file_module

    props = {'file_format': 'fastq', 'status': 'uploaded', 'filename': 'reads.fastq.gz'}
    extra_props = {'file_format': 'index', 'filename': 'reads.idx'}
    if extra:
        props['extra_files'] = [extra_props]
    context = mock.Mock(properties=props, propsheets={}, uuid='uuid')
    context.upgrade_properties.return_value = props
    context.build_external_creds.return_value = {'service': 's3', 'bucket': BUCKET, 'key': KEY}
    context.get_open_data_url_or_presigned_url_location.return_value = 'https://example.test/file'
    request = mock.Mock(subpath=(), range=None, datastore='database', client_addr=None)
    request.registry = {'aws_ipset': []}
    # A dict with registry settings is enough for the analytics branch.
    class Registry(dict):
        settings = {}
    request.registry = Registry(request.registry)
    request.params = {}
    with mock.patch.multiple(file_module,
                             check_user_is_logged_in=mock.Mock(),
                             is_range_request_for_vitessce=mock.Mock(return_value=False),
                             session_properties=mock.Mock(return_value={}),
                             get_item_or_none=mock.Mock(return_value={'uuid': 'format-uuid'}),
                             get_file_experiment_type=mock.Mock(return_value=None),
                             is_file_to_download=mock.Mock(side_effect=[None, 'reads.idx'] if extra else ['reads.fastq.gz'])):
        with pytest.raises(HTTPTemporaryRedirect):
            file_module.download(context, request)
    context.build_external_creds.assert_called_once_with(
        request.registry, 'uuid', extra_props if extra else props, make_upload_credentials=False
    )


# --- failure behavior --------------------------------------------------------------------


def test_missing_role_arn_raises_botocore_error_not_client_error(monkeypatch):
    """A missing role ARN fails client-side as a BotoCoreError, not a ClientError.

    Uploads need explicit role configuration. Read-only upload-key calculation
    and downloads must not reach this call at all.
    """
    monkeypatch.delenv('IDENTITY', raising=False)
    monkeypatch.delenv('S3_UPLOAD_ROLE_ARN', raising=False)

    # A real (never-dispatched) STS client, so botocore's own parameter validation runs.
    real_sts = boto3.client('sts', region_name='us-east-1',
                            aws_access_key_id='test', aws_secret_access_key='test')

    with mock.patch('encoded.types.file.boto3.client', return_value=real_sts):
        with pytest.raises(ParamValidationError) as exc_info:
            external_creds(BUCKET, KEY, '4DNFI000AAAA.fastq.gz')

    assert isinstance(exc_info.value, BotoCoreError)
    assert not isinstance(exc_info.value, ClientError)


class _StubFileItem:
    """Enough of a File item to exercise the upload_key calculated property."""

    uuid = 'd3b07384-d9a0-4c9b-9a0b-0e4f2ba2c9de'
    properties = {'file_format': 'fastq', 'accession': '4DNFI000AAAA'}
    propsheets = {}
    registry = _StubRegistry()

    def __init__(self, error):
        self._error = error

    @staticmethod
    def build_key(registry, uuid, properties):
        return 'a-key-that-does-not-match'

    def build_external_creds(self, registry, uuid, properties, *, make_upload_credentials=True):
        assert make_upload_credentials is False
        raise self._error


@pytest.mark.parametrize('error', [
    ParamValidationError(report='S3_UPLOAD_ROLE_ARN is not configured'),
    ClientError({'Error': {'Code': 'AccessDenied', 'Message': 'denied'}}, 'AssumeRole'),
])
@pytest.mark.parametrize('stored_key', [None, 'old-key', 'a-key-that-does-not-match'])
def test_upload_key_is_computed_without_cloud_discovery(error, stored_key):
    """Missing/stale propsheets never require S3 HEADs, secrets discovery or STS."""
    item = _StubFileItem(error)
    item.propsheets = {'external': {'key': stored_key}} if stored_key else {}
    assert File.upload_key(item, request=None) == 'a-key-that-does-not-match'
