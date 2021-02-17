import glob
import io
import json
import pkg_resources
import re
import rfc3987

from jsonschema_serialize_fork import FormatChecker
from pyramid.threadlocal import get_current_request
from .server_defaults import (
    ACCESSION_FACTORY,
    ACCESSION_PREFIX,
    TEST_PREFIX,
    test_accession,
)
from uuid import UUID


def compute_accession_codes():
    letter_pairs = set()
    for file in glob.glob(pkg_resources.resource_filename('encoded', 'schemas/*.json')):
        with io.open(file) as fp:
            schema = json.load(fp)
        letter_pair = schema.get('properties', {}).get('accession', {}).get('accessionType')
        if letter_pair:
            if not isinstance(letter_pair, str) or len(letter_pair) != 2:
                raise RuntimeError("accession_type in %s is not a 2-character string:", letter_pair)
            letter_pairs.add(letter_pair)
    return "|".join(sorted(letter_pairs))


ACCESSION_CODES = compute_accession_codes()

accession_re = re.compile(r'^%s(%s)[1-9A-Z]{7}$' % (ACCESSION_PREFIX, ACCESSION_CODES))
test_accession_re = re.compile(r'^%s(%s)[0-9]{4}([0-9][0-9][0-9]|[A-Z][A-Z][A-Z])$' % (TEST_PREFIX, ACCESSION_CODES))
uuid_re = re.compile(r'(?i)\{?(?:[0-9a-f]{4}-?){8}\}?')


@FormatChecker.cls_checks("uuid")
def is_uuid(instance):
    # Python's UUID ignores all dashes, whereas Postgres is more strict
    # http://www.postgresql.org/docs/9.2/static/datatype-uuid.html
    return bool(uuid_re.match(instance))


def is_accession(instance):
    ''' just a pattern checker '''
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
    ''' should check a webservice at HGNC/MGI for validation '''
    return True


@FormatChecker.cls_checks("target_label")
def is_target_label(instance):
    if is_gene_name(instance):
        #note this always returns true
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
    if ':' not in instance:
        # We want only absolute uris
        return False
    return rfc3987.parse(instance, rule="URI_reference")
