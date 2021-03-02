import glob
import io
import json
import pkg_resources
import uuid

from ..schema_formats import ACCESSION_CODES, is_uuid


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


def test_accession_codes():

    assert ACCESSION_CODES == compute_accession_codes()


def test_is_uuid():

    good_uuid = str(uuid.uuid4())
    bad_uuid = '123-456-789'

    assert is_uuid(good_uuid) is True
    assert is_uuid(bad_uuid) is False
