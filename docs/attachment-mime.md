# Attachment MIME dependencies

Fourfront requires working **native libmagic and its matching magic database**,
not just the `python-magic` package in `poetry.lock`. Startup probes ZIP buffer
recognition before environment discovery or insert loading. A failing probe is
an installation error; do not add `application/octet-stream` to attachment enums
or skip the filename/content/checksum checks.

## PR 1936 document-insert report

The reported UUID, `dcf15d5e-40aa-43bc-b81c-32c70c9afb48`, is the `photo.zip`
record in `src/encoded/tests/data/inserts/document.json`. It is **not** a
browser-uploaded PDF. The archive is valid (its CRC checks pass).

`loadxl.format_for_attachment` checks the file using `magic.from_file` and emits
`data:application/zip;base64,...`. Loadxl first creates a minimal Document and
then PATCHes the attachment onto it. Snovault checks the decoded bytes using
`magic.from_buffer` during that PATCH.

Native **libmagic 5.46** recognizes the file as ZIP but returns
`application/octet-stream` for those same bytes in a buffer. Consequently the
server correctly rejects the mismatch with HTTP 422 at `attachment.href`.
An installed **5.45** masks this problem; changing the Python dependency lock
alone does not reproduce it. **5.47** fixes the identical input without changing
validation. Its upstream ChangeLog identifies PR/622: handling negative offsets
in `file_buffer` when a file descriptor is unavailable.

A storage-isolated WebTest comparison used the real Fourfront routes, schema,
parser, and native detectors, with SQLite replacing PostgreSQL and external
services disabled:

| Source / dependencies | libmagic 5.45 | libmagic 5.46 | libmagic 5.47 |
| --- | --- | --- | --- |
| Intake master / snovault 11.27.0, utils 8.18.3 | ZIP PATCH 200 | ZIP PATCH 422 | — |
| Intake PR / snovault 11.35.2, utils 8.18.8 | ZIP PATCH 200 | ZIP PATCH 422 | ZIP PATCH 200 |

Snovault's MIME-validation and loadxl attachment code is unchanged between
these releases. Repacking the ZIP and changing its local-header size/CRC fields
did **not** fix 5.46. The smallest successful counterfactual was replacing only
its native library with 5.47 while retaining the **5.46 magic database**: the same
ZIP buffer becomes `application/zip`. Correctly typed PDFs succeed on all three native versions;
a generic-MIME PDF is a separate browser compatibility case handled by
Fourfront's normalization. Binary junk named `.pdf` still gets 422.

## Remediation and regression coverage

Install a working native libmagic and matching database; 5.47 is verified, as is
5.45. Restart the application so it reloads the native library. Vendor-patched
builds are accepted if the behavioral startup probe passes. Reinstalling only
`python-magic` is insufficient. No fixture archive or MIME allowlist is changed.

- `encoded.attachment.verify_attachment_mime_detection`: actionable startup
  error instead of discovering an incompatible installation partway through a
  deployment's inserts.
- `test_attachment_runtime.py`: behavioral dependency check and failure before
  AWS discovery.
- `test_download.py::test_document_insert_archive_round_trip`: exact insert UUID,
  loadxl formatting, POST/PATCH and byte-for-byte download.
- The same module tests browser MIME normalization on POST, PUT and PATCH,
  permissions, checksum failures, and content mismatches.

The storage-isolated comparison is **not** a full PostgreSQL/Elasticsearch
integration run. The initial local PostgreSQL application fixture encountered an
initialization error and timed out in teardown. No production service or ambient
credential was used to replace that missing validation.
