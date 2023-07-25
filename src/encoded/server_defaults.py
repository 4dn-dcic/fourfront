from snovault.project_app import app_project
from snovault.server_defaults import (
    add_last_modified,
    enc_accession,
    get_now,
    get_userid,
    test_accession
)

ACCESSION_FACTORY = __name__ + ':accession_factory'
ACCESSION_PREFIX = app_project().ACCESSION_PREFIX
ACCESSION_TEST_PREFIX = 'TST'
