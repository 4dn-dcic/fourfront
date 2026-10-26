"""Native libmagic compatibility must fail before an insert becomes an opaque 422."""

from unittest import mock

import pytest

from encoded import main
from encoded.attachment import verify_attachment_mime_detection

pytestmark = [pytest.mark.working, pytest.mark.unit]


def test_native_magic_recognizes_zip_buffers():
    verify_attachment_mime_detection()


@pytest.mark.parametrize('detected', ['application/octet-stream', b'application/octet-stream'])
def test_broken_native_magic_is_an_actionable_startup_error(detected):
    with mock.patch('encoded.attachment.magic.from_buffer', return_value=detected):
        with mock.patch('encoded.assumed_identity') as identity:
            with pytest.raises(RuntimeError, match='libmagic 5.46'):
                main({})
    identity.assert_not_called()


def test_patched_native_magic_is_not_rejected_by_version():
    with mock.patch('encoded.attachment.magic.from_buffer', return_value=b'application/zip'):
        verify_attachment_mime_detection()
