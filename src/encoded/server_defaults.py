import random
import uuid

#from jsonschema_serialize_fork import NO_DEFAULT
#from pyramid.path import DottedNameResolver
#from pyramid.threadlocal import get_current_request
#from dcicutils.misc_utils import utc_now_str
#from snovault.schema_utils import server_default
from snovault.server_defaults import (
    add_last_modified,
    enc_accession,
    get_now,
    get_userid,
    test_accession
)

ACCESSION_FACTORY = __name__ + ':accession_factory'
ACCESSION_PREFIX = '4DN'
ACCESSION_TEST_PREFIX = 'TST'
