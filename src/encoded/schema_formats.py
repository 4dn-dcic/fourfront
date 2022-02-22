import re

from dcicutils.misc_utils import ignored, is_valid_absolute_uri
from jsonschema_serialize_fork import FormatChecker
from pyramid.threadlocal import get_current_request
from .server_defaults import (
    ACCESSION_FACTORY,
    ACCESSION_PREFIX,
    ACCESSION_TEST_PREFIX,
    test_accession,
)


ACCESSION_CODES = "BS|ES|EX|FI|FS|IN|SR|WF"

# Codes we allow for testing go here.
ACCESSION_TEST_CODES = "BS|ES|EX|FI|FS|IN|SR|WF"

accession_re = re.compile(r'^%s(%s)[1-9A-Z]{7}$' % (ACCESSION_PREFIX, ACCESSION_CODES))
test_accession_re = re.compile(r'^%s(%s)[0-9]{4}([0-9][0-9][0-9]|[A-Z][A-Z][A-Z])$' % (
    ACCESSION_TEST_PREFIX, ACCESSION_TEST_CODES))

uuid_re = re.compile(r'(?i)[{]?(?:[0-9a-f]{4}-?){8}[}]?')


@FormatChecker.cls_checks("uuid")
def is_uuid(instance):
    # Python's UUID ignores all dashes, whereas Postgres is more strict
    # http://www.postgresql.org/docs/9.2/static/datatype-uuid.html
    return bool(uuid_re.match(instance))


def is_accession(instance):
    """Just a pattern checker."""
    # Unfortunately we cannot access the accessionType here
    return (
        accession_re.match(instance) is not None or
        test_accession_re.match(instance) is not None
    )


@FormatChecker.cls_checks("accession")
def is_accession_for_server(instance):
    # Unfortunately we cannot access the accessionType here
    if accession_re.match(instance):
        return True
    request = get_current_request()
    if request.registry[ACCESSION_FACTORY] is test_accession:
        if test_accession_re.match(instance):
            return True
    return False


@FormatChecker.cls_checks("gene_name")
def is_gene_name(instance):
    """This SHOULD check a webservice at HGNC/MGI for validation, but for now this just returns True always.."""
    ignored(instance)
    return True


@FormatChecker.cls_checks("target_label")
def is_target_label(instance):
    if is_gene_name(instance):
        return True
    mod_histone_patt = "^H([234]|2A|2B)[KRT][0-9]+(me|ac|ph)"
    fusion_patt = "^(eGFP|HA)-"
    oneoff_patts = "^(Control|Methylcytidine|POLR2Aphospho[ST][0-9+])$"
    if not re.match(mod_histone_patt, instance) or \
       not re.match(fusion_patt, instance) or \
       not re.match(oneoff_patts, instance):
        return False
    return True


@FormatChecker.cls_checks("uri", raises=ValueError)
def is_uri(instance):
    return is_valid_absolute_uri(instance)
