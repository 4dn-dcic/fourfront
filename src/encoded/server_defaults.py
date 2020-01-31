from datetime import datetime
from jsonschema_serialize_fork import NO_DEFAULT
from pyramid.threadlocal import get_current_request
from string import (
    digits,
    ascii_uppercase,
    )
import random
import uuid

from snovault.schema_utils import server_default


ACCESSION_FACTORY = __name__ + ':accession_factory'


def includeme(config):
    from pyramid.path import DottedNameResolver
    accession_factory = config.registry.settings.get('accession_factory')
    if accession_factory:
        factory = DottedNameResolver().resolve(accession_factory)
    else:
        factory = enc_accession
    config.registry[ACCESSION_FACTORY] = factory


# XXX: This stuff is all added based on the serverDefault identifier in the schemas
# removing it altogether will totally break our code


@server_default
def userid(instance, subschema):  # args required by jsonschema-serialize-fork
    return _userid()


def _userid():
    request = get_current_request()
    for principal in request.effective_principals:
        if principal.startswith('userid.'):
            return principal[7:]
    return NO_DEFAULT


@server_default
def now(instance, subschema):  # args required by jsonschema-serialize-fork
    return utc_now_str()


def utc_now_str():
    # from jsonschema_serialize_fork date-time format requires a timezone
    return datetime.utcnow().isoformat() + '+00:00'


@server_default
def uuid4(instance, subschema):
    return str(uuid.uuid4())


@server_default
def accession(instance, subschema):
    if 'external_accession' in instance:
        return NO_DEFAULT
    request = get_current_request()
    factory = request.registry[ACCESSION_FACTORY]
    # With 17 576 000 options
    ATTEMPTS = 10
    for attempt in range(ATTEMPTS):
        new_accession = factory(subschema['accessionType'])
        if new_accession in request.root:
            continue
        return new_accession
    raise AssertionError("Free accession not found in %d attempts" % ATTEMPTS)


def get_userid():
    """ Wrapper for the server_default 'userid' above so it is not called through SERVER_DEFAULTS in our code """
    return _userid()


def get_now():
    """ Wrapper for the server_default 'now' above so it is not called through SERVER_DEFAULTS in our code """
    return utc_now_str()


def add_last_modified(properties, userid=None):
    """
        Uses the above two functions to add the last_modified information to the item
        May have no effect
        Allow someone to override the request userid (none in this case) by passing in a different uuid
    """
    try:
        last_modified = {
            'modified_by': get_userid(),
            'date_modified': get_now(),
        }
    except AttributeError:  # no request in scope ie: we are outside the core application.
        if userid:
            last_modified = {
                'modified_by': userid,
                'date_modified': get_now(),
            }
            properties['last_modified'] = last_modified
    else:
        # get_userid returns NO_DEFAULT if no userid
        if last_modified['modified_by'] != NO_DEFAULT:
            properties['last_modified'] = last_modified


#FDN_ACCESSION_FORMAT = (digits, digits, digits, ascii_uppercase, ascii_uppercase, ascii_uppercase)
FDN_ACCESSION_FORMAT = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789']*7

def enc_accession(accession_type):
    random_part = ''.join(random.choice(s) for s in FDN_ACCESSION_FORMAT)
    return '4DN' + accession_type + random_part


TEST_ACCESSION_FORMAT = (digits, ) * 7


def test_accession(accession_type):
    """ Test accessions are generated on test.encodedcc.org
    """
    random_part = ''.join(random.choice(s) for s in TEST_ACCESSION_FORMAT)
    return 'TST' + accession_type + random_part
