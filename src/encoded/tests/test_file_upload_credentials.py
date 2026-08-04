"""Regression coverage for the S3 credential mechanism behind file upload and download.

Fourfront mints scoped, temporary S3 credentials with ``sts:AssumeRole``.  It must not use
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


# --- the download caller shares the same mint ---------------------------------------------


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


def test_build_external_creds_routes_download_path_through_assume_role(sts):
    """`build_external_creds` serves both upload and download, so both use AssumeRole.

    The `@@download` view calls this whenever a File has no stored `external` propsheet --
    which is every File created in a status outside ('uploading', 'to be uploaded by
    workflow', 'upload failed'), and every extra_file whose per-format propsheet is absent.
    """
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


# --- failure behavior --------------------------------------------------------------------


def test_missing_role_arn_raises_botocore_error_not_client_error(monkeypatch):
    """A missing role ARN fails client-side as a BotoCoreError, not a ClientError.

    This is the failure mode the old GetFederationToken call could never produce, and it is
    why `upload_key` must catch BotoCoreError as well.
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

    def build_external_creds(self, registry, uuid, properties):
        raise self._error


@pytest.mark.parametrize('error', [
    ParamValidationError(report='S3_UPLOAD_ROLE_ARN is not configured'),
    ClientError({'Error': {'Code': 'AccessDenied', 'Message': 'denied'}}, 'AssumeRole'),
])
def test_upload_key_degrades_instead_of_raising(error):
    """upload_key keeps masking credential failures rather than 500ing the item view."""
    result = File.upload_key(_StubFileItem(error), request=None)

    assert result.startswith(f'Failed to acquire upload credentials for {_StubFileItem.uuid}')
