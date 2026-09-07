"""Checks for native MIME-detection dependencies used by Snovault attachments."""

from io import BytesIO
from zipfile import ZipFile, ZipInfo

import magic


def verify_attachment_mime_detection():
    """Fail before loading inserts if libmagic cannot recognize ZIP buffers.

    libmagic 5.46 recognizes ZIP *files* but misidentifies the same bytes passed
    to magic_buffer as application/octet-stream. loadxl uses the former while
    ItemWithAttachment validates with the latter, causing misleading HTTP 422s.
    Probe behavior rather than a version so vendor-patched builds also work.
    This never changes MIME acceptance or bypasses server-side validation.
    """
    buffer = BytesIO()
    with ZipFile(buffer, 'w') as archive:
        archive.writestr(ZipInfo('probe.txt'), b'Fourfront MIME dependency check\n')
    detected = magic.from_buffer(buffer.getvalue(), mime=True)
    if isinstance(detected, bytes):
        detected = detected.decode('ascii')
    if detected != 'application/zip':
        raise RuntimeError(
            'Native libmagic cannot recognize a ZIP attachment buffer '
            '(detected %r). libmagic 5.46 has this regression; install a working '
            'native libmagic and matching magic database (5.45 or 5.47 tested). '
            'Updating python-magic alone does not fix it. Attachment validation '
            'has not been relaxed. See docs/attachment-mime.md.' % detected
        )
