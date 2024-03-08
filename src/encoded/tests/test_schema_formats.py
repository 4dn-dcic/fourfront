import glob
import io
import json
import pkg_resources
import pytest
import uuid

from ..schema_formats import ACCESSION_CODES, ACCESSION_TEST_CODES, is_uri, is_uuid


pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema, pytest.mark.unit]


# Any legacy codes that have been discontinued and aren't mentioned in schemas
# but that have accessions that must still be parsed should go here. -kmp 2-Mar-2021
LEGACY_ACCESSION_CODES = ""

def compute_accession_codes():
    legacy_codes = [x for x in LEGACY_ACCESSION_CODES.split("|") if x]
    letter_pairs = set(legacy_codes)
    for file in glob.glob(pkg_resources.resource_filename('encoded', 'schemas/*.json')):
        with io.open(file) as fp:
            schema = json.load(fp)
        letter_pair = schema.get('properties', {}).get('accession', {}).get('accessionType')
        if letter_pair:
            if not isinstance(letter_pair, str) or len(letter_pair) != 2:
                raise RuntimeError("accession_type in %s is not a 2-character string:", letter_pair)
            letter_pairs.add(letter_pair)
    return "|".join(sorted(letter_pairs))


def test_accession_codes():

    computed_codes = compute_accession_codes()
    assert ACCESSION_TEST_CODES == computed_codes
    assert ACCESSION_CODES == computed_codes


def test_is_uuid():

    good_uuid = str(uuid.uuid4())
    bad_uuid = '123-456-789'

    assert not is_uuid("12345678abcd678123456781234")  # wrong length. expecting 32 digits
    assert not is_uuid("12-3456781234abcd1234567812345678")  # hyphens only allowed at multiple of four boundaries
    assert not is_uuid("12-3456781234abcd1234567-812345678")  # ditto

    assert is_uuid("123456781234abcd1234567812345678")
    assert is_uuid("12345678abcd56781234ABCD12345678")
    assert is_uuid("1234-5678abcd56781234ABCD12345678")
    assert is_uuid("12345678abcd-56781234ABCD1234-5678")
    assert is_uuid("1234-5678-abcd56781234ABCD-12345678")
    assert is_uuid("1234-5678-abcd-56781234ABCD12345678")
    assert is_uuid("1234-5678-abcd-5678-1234-ABCD-1234-5678")
    assert is_uuid("1234-5678-abcd-5678-1234-ABCD-1234-5678-")  # we don't really want this, but we tolerate it

    assert is_uuid("{12345678abcd56781234ABCD12345678}")  # braces are optionally allowed
    assert is_uuid("{1234-5678-abcd5678-1234-ABCD-1234-5678}")  # ditto
    assert is_uuid("1234-5678-abcd5678-1234-ABCD-1234-5678}")  # ditto
    assert is_uuid("{1234-5678-abcd5678-1234-ABCD-1234-5678-}")  # balanced braces trailing hyphen tolerated

    assert is_uuid(good_uuid) is True
    assert is_uuid(bad_uuid) is False


def test_is_uri():

    # http/https scheme and some kind of host are required. We want absolute URIs.
    # See more extensive testing and implementation notes dcicutils test for misc_utils.is_valid_absolute_uri

    assert is_uri("foo") is False  # simple relative URL not allowed
    assert is_uri("//somehost?alpha=1&beta=2") is False  # Host but no scheme also not allowed
    assert is_uri("//somehost/?alpha=1&beta=2&colon=:") is False  # Used to wrongly yield True due to ':' in URI
    assert is_uri("http:/foo?alpha=1") is False  # Scheme but no host. This used to wrongly yield True.
    assert is_uri("ftps://somehost") is False  # Wrong kind of scheme. Used to be True.

    assert is_uri("https://somehost") is True
    assert is_uri("http://user@somehost") is True
    assert is_uri("http://user:pass@somehost") is True
    assert is_uri("http://somehost/x/y/z?alpha=1&beta=2&colon=:") is True

    assert is_uri("http://abc.def/foo#alpha") is True  # TODO: Reconsider tags
    assert is_uri("http://abc.def/foo#alpha:beta") is True  # TODO: Reconsider tags


@pytest.mark.parametrize('obj, expected', [
    ({
        'accession': 'not valid'
    }, False),
    ({
        'accession': 'SNOnotvalid'
    }, False),
    ({
        'accession': 'TSTnotvalid'
    }, False),
    ({
        'accession': 'TSTabcclose'
    }, False),
    ({
         'accession': 'TSTBS439abcd'  # lowercase fails
     }, False),
    ({
         'accession': 'TSTBS4399428'  # real one that matches
     }, True),
    ({
         'accession': 'TSTBS4393BCD'  # real one that matches (can be trailing characters)
     }, True),
    ({}, True),  # serverDefault should work
])
def test_custom_validator_with_real_type(testapp, obj, expected):
    """ Tests that we can validate accessions (or other nonstandard format fields) """
    if not expected:
        testapp.post_json('/TestingServerDefault', obj, status=422)
    else:
        testapp.post_json('/TestingServerDefault', obj, status=201)
