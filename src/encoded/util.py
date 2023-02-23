# utility functions

import boto3
from botocore.client import Config
import contextlib
import datetime
import gzip
import io
from io import BytesIO
import json
import os
import pkg_resources
import pyramid.request
import re
import structlog
import tempfile
import time
from typing import Optional

from dcicutils.ecs_utils import ECSUtils
from dcicutils.misc_utils import check_true, url_path_join, ignored, find_association, VirtualApp, count_if, identity, PRINT
from dcicutils.secrets_utils import assume_identity
from pyramid.httpexceptions import HTTPUnprocessableEntity, HTTPForbidden, HTTPServerError
from snovault import COLLECTIONS, Collection
from snovault.crud_views import collection_add as sno_collection_add
from snovault.embed import make_subrequest
from snovault.schema_utils import validate_request

from .types.base import get_item_or_none


log = structlog.getLogger(__name__)

ENCODED_ROOT_DIR = os.path.dirname(__file__)


def resolve_file_path(path, file_loc=None):
    """ Takes a relative path from this file location and returns an absolute path to
        the desired file, needed for WSGI to resolve embed files.

    :param path: relative path to be converted
    :param file_loc: absolute path to location path is relative to, by default path/to/encoded/src/
    :return: absolute path to location specified by path
    """
    if path.startswith("~"):
        # Really this shouldn't happen, so we could instead raise an error, but at least this is semantically correct.
        path = os.path.expanduser(path)
    if file_loc:
        if file_loc.startswith("~"):
            file_loc = os.path.expanduser(file_loc)
        path_to_this_file = os.path.abspath(os.path.dirname(file_loc))
    else:
        path_to_this_file = os.path.abspath(ENCODED_ROOT_DIR)
    return os.path.join(path_to_this_file, path)


def deduplicate_list(lst):
    """ De-duplicates the given list by converting it to a set then back to a list.

    NOTES:
    * The list must contain 'hashable' type elements that can be used in sets.
    * The result list might not be ordered the same as the input list.
    * This will also take tuples as input, though the result will be a list.

    :param lst: list to de-duplicate
    :return: de-duplicated list
    """
    return list(set(lst))


def gunzip_content(content):
    """ Helper that will gunzip content (into memory) """
    f_in = BytesIO()
    f_in.write(content)
    f_in.seek(0)
    with gzip.GzipFile(fileobj=f_in, mode='rb') as f:
        gunzipped_content = f.read()
    return gunzipped_content.decode('utf-8')


DEBUGLOG = os.environ.get('DEBUGLOG', "")


def debuglog(*args):
    """
    As the name implies, this is a low-tech logging facility for temporary debugging info.
    Prints info to a file in user's home directory.

    The debuglog facility allows simple debugging for temporary debugging of disparate parts of the system.
    It takes arguments like print or one of the logging operations and outputs to ~/DEBUGLOG-yyyymmdd.txt.
    Each line in the log is timestamped.
    """
    if DEBUGLOG:
        try:
            nowstr = str(datetime.datetime.now())
            dateid = nowstr[:10].replace('-', '')
            with io.open(os.path.expanduser(os.path.join(DEBUGLOG, "DEBUGLOG-%s.txt" % dateid)), "a+") as fp:
                PRINT(nowstr, *args, file=fp)
        except Exception:
            # There are many things that could go wrong, but none of them are important enough to fuss over.
            # Maybe it was a bad pathname? Out of disk space? Network error?
            # It doesn't really matter. Just continue...
            pass


def subrequest_object(request, object_id):
    subreq = make_subrequest(request, "/" + object_id)
    subreq.headers['Accept'] = 'application/json'
    # Tweens are suppressed here because this is an internal call and doesn't need things like HTML processing.
    # -kmp 2-Feb-2021
    response = request.invoke_subrequest(subreq, use_tweens=False)
    if response.status_code >= 300:  # alas, the response from a pyramid subrequest has no .raise_for_status()
        raise HTTPServerError("Error obtaining object: %s" % object_id)
    object_json = response.json
    return object_json


def subrequest_item_creation(request: pyramid.request.Request, item_type: str, json_body: dict = None) -> dict:
    """
    Acting as proxy on behalf of request, this creates a new item of the given item_type with attributes per json_body.

    For example,

        subrequest_item_creation(request=request, item_type='NobelPrize',
                                 json_body={'category': 'peace', 'year': 2016))

    Args:
        request: the request on behalf of which this subrequest is done
        item_type: the name of the item item type to be created
        json_body: a python dictionary representing JSON containing data to use in initializing the newly created item

    Returns:
        a python dictionary (JSON description) of the item created

    """

    if json_body is None:
        json_body = {}
    collection_path = '/' + item_type
    method = 'POST'
    # json_utf8 = json.dumps(json_body).encode('utf-8')  # Unused, but here just in case
    check_true(not request.remote_user, "request.remote_user has %s before we set it." % request.remote_user)
    request.remote_user = 'EMBED'
    subrequest = make_subrequest(request=request, path=collection_path, method=method, json_body=json_body)
    subrequest.remote_user = 'EMBED'
    subrequest.registry = request.registry
    # Maybe...
    # validated = json_body.copy()
    # subrequest.validated = validated
    collection: Collection = subrequest.registry[COLLECTIONS][item_type]
    check_true(subrequest.json_body, "subrequest.json_body is not properly initialized.")
    check_true(not subrequest.validated, "subrequest was unexpectedly validated already.")
    check_true(not subrequest.errors, "subrequest.errors already has errors before trying to validate.")
    check_true(subrequest.remote_user == request.remote_user,
               "Mismatch: subrequest.remote_user=%r request.remote_user=%r"
               % (subrequest.remote_user, request.remote_user))
    validate_request(schema=collection.type_info.schema, request=subrequest, data=json_body)
    if not subrequest.validated:
        return {
            "@type": ["Exception"],
            "errors": subrequest.errors
        }
    else:
        json_result: dict = sno_collection_add(context=collection, request=subrequest, render=False)
        return json_result


# These next few could be in dcicutils.s3_utils as part of s3Utils, but details of interfaces would have to change.
# For now, for expedience, they can live here and we can refactor later. -kmp 25-Jul-2020

@contextlib.contextmanager
def s3_output_stream(s3_client, bucket: str, key: str, s3_encrypt_key_id: Optional[str] = None):
    """
    This context manager allows one to write:

        with s3_output_stream(s3_client, bucket, key) as fp:
            ... fp.write("foo") ...

    to do output to an s3 bucket.

    In fact, an intermediate local file is involved, so this function yields a file pointer (fp) to a
    temporary local file that is open for write. That fp should be used to supply content to the file
    during the dynamic scope of the context manager. Once the context manager's body executes, the
    file will be closed, its contents will be copied to s3, and finally the temporary local file will
    be deleted.

    Args:
        s3_client: a client object that results from a boto3.client('s3', ...) call.
        bucket: an S3 bucket name
        key: the name of a key within the given S3 bucket
        s3_encrypt_key_id: a KMS encryption key id or None
    """

    tempfile_name = tempfile.mktemp()
    try:
        with io.open(tempfile_name, 'w') as fp:
            yield fp
        extra_kwargs = extra_kwargs_for_s3_encrypt_key_id(s3_encrypt_key_id=s3_encrypt_key_id,
                                                          client_name='s3_output_stream')
        s3_client.upload_file(Filename=tempfile_name, Bucket=bucket, Key=key, **extra_kwargs)
    finally:
        try:
            os.remove(tempfile_name)
        except Exception:
            pass


@contextlib.contextmanager
def s3_local_file(s3_client, bucket: str, key: str):
    """
    This context manager allows one to write:

        with s3_local_file(s3_client, bucket, key) as file:
            with io.open(local_file, 'r') as fp:
                dictionary = json.load(fp)

    to do input from an s3 bucket.

    Args:
        s3_client: a client object that results from a boto3.client('s3', ...) call.
        bucket: an S3 bucket name
        key: the name of a key within the given S3 bucket
    """
    ext = os.path.splitext(key)[-1]
    tempfile_name = tempfile.mktemp() + ext
    try:
        s3_client.download_file(Bucket=bucket, Key=key, Filename=tempfile_name)
        yield tempfile_name
    finally:
        try:
            os.remove(tempfile_name)
        except Exception:
            pass


@contextlib.contextmanager
def s3_input_stream(s3_client, bucket: str, key: str, mode: str = 'r'):
    """
    This context manager allows one to write:

        with s3_input_stream(s3_client, bucket, key) as fp:
            dictionary = json.load(fp)

    to do input from an s3 bucket.

    In fact, an intermediate local file is created, copied, and deleted.

    Args:
        s3_client: a client object that results from a boto3.client('s3', ...) call.
        bucket: an S3 bucket name
        key: the name of a key within the given S3 bucket
        mode: an input mode acceptable to io.open
    """

    with s3_local_file(s3_client, bucket, key) as file:
        with io.open(file, mode=mode) as fp:
            yield fp


class SettingsKey:
    APPLICATION_BUCKET_PREFIX = 'application_bucket_prefix'
    BLOB_BUCKET = 'blob_bucket'
    EB_APP_VERSION = 'eb_app_version'
    ELASTICSEARCH_SERVER = 'elasticsearch.server'
    ENCODED_VERSION = 'encoded_version'
    FILE_UPLOAD_BUCKET = 'file_upload_bucket'
    FILE_WFOUT_BUCKET = 'file_wfout_bucket'
    FOURSIGHT_BUCKET_PREFIX = 'foursight_bucket_prefix'
    IDENTITY = 'identity'
    INDEXER = 'indexer'
    INDEXER_NAMESPACE = 'indexer.namespace'
    INDEX_SERVER = 'index_server'
    LOAD_TEST_DATA = 'load_test_data'
    METADATA_BUNDLES_BUCKET = 'metadata_bundles_bucket'
    S3_ENCRYPT_KEY_ID = 's3_encrypt_key_id'
    SNOVAULT_VERSION = 'snovault_version'
    SQLALCHEMY_URL = 'sqlalchemy.url'
    SYSTEM_BUCKET = 'system_bucket'
    TIBANNA_CWLS_BUCKET = 'tibanna_cwls_bucket'
    TIBANNA_OUTPUT_BUCKET = 'tibanna_output_bucket'
    UTILS_VERSION = 'utils_version'


class ExtraArgs:
    SERVER_SIDE_ENCRYPTION = "ServerSideEncryption"
    SSE_KMS_KEY_ID = "SSEKMSKeyId"


def extra_kwargs_for_s3_encrypt_key_id(s3_encrypt_key_id, client_name):

    extra_kwargs = {}
    if s3_encrypt_key_id:
        log.error(f"{client_name} adding SSEKMSKeyId ({s3_encrypt_key_id}) arguments in upload_fileobj call.")
        extra_kwargs["ExtraArgs"] = {
            ExtraArgs.SERVER_SIDE_ENCRYPTION: "aws:kms",
            ExtraArgs.SSE_KMS_KEY_ID: s3_encrypt_key_id,
        }
    else:
        log.error(f"{client_name} found no s3 encrypt key id ({SettingsKey.S3_ENCRYPT_KEY_ID})"
                  f" in request.registry.settings.")

    return extra_kwargs


def create_empty_s3_file(s3_client, bucket: str, key: str, s3_encrypt_key_id: Optional[str] = None):
    """
    Args:
        s3_client: a client object that results from a boto3.client('s3', ...) call.
        bucket: an S3 bucket name
        key: the name of a key within the given S3 bucket
        s3_encrypt_key_id: the name of a KMS encrypt key id, or None
    """
    empty_file = "/dev/null"

    extra_kwargs = extra_kwargs_for_s3_encrypt_key_id(s3_encrypt_key_id=s3_encrypt_key_id,
                                                      client_name='create_empty_s3_file')

    s3_client.upload_file(empty_file, Bucket=bucket, Key=key, **extra_kwargs)


def get_trusted_email(request, context=None, raise_errors=True):
    """
    Get an email address on behalf of which we can issue other requests.

    If auth0 has authenticated user info to offer, return that.
    Otherwise, look for a userid.xxx among request.effective_principals and get the email from that.

    This will raise HTTPUnprocessableEntity if there's a problem obtaining the mail.
    """
    try:
        context = context or "Requirement"
        email = getattr(request, '_auth0_authenticated', None)
        if not email:
            user_uuid = None
            for principal in request.effective_principals:
                if principal.startswith('userid.'):
                    user_uuid = principal[7:]
                    break
            if not user_uuid:
                raise HTTPUnprocessableEntity('%s: Must provide authentication' % context)
            user_props = get_item_or_none(request, user_uuid)
            if not user_props:
                raise HTTPUnprocessableEntity('%s: User profile missing' % context)
            if 'email' not in user_props:
                raise HTTPUnprocessableEntity('%s: Entry for "email" missing in user profile.' % context)
            email = user_props['email']
        return email
    except Exception:
        if raise_errors:
            raise
        return None


def beanstalk_env_from_request(request):
    return beanstalk_env_from_registry(request.registry)


def beanstalk_env_from_registry(registry):
    return registry.settings.get('env.name')


def customized_delay_rerun(sleep_seconds=1):
    def parameterized_delay_rerun(*args):
        """ Rerun function for flaky """
        ignored(args)
        time.sleep(sleep_seconds)
        return True
    return parameterized_delay_rerun


delay_rerun = customized_delay_rerun(sleep_seconds=1)


def check_user_is_logged_in(request):
    """ Raises HTTPForbidden if the request did not come from a logged in user. """
    for principal in request.effective_principals:
        if principal.startswith('userid.') or principal == 'group.admin':  # allow if logged in OR has admin
            break
    else:
        raise HTTPForbidden(title="Not logged in.")


# IMPLEMENTATION NOTE:
#
#    We have middleware that overrides various details about content type that are declared in the view_config.
#    It used to work by having a wired set of exceptions, but this facility allows us to do it in a more data-driven
#    way. Really I think we should just rely on the information in the view_config, but I didn't have time to explore
#    why we are not using that.
#
#    See validate_request_tween_factory in renderers.py for where this is used. This declaration info is here
#    rather than there to simplify the load order dependencies.
#
#    -kmp 1-Sep-2020

CONTENT_TYPE_SPECIAL_CASES = {
    'application/x-www-form-urlencoded': [
        # Single legacy special case to allow us to POST to metadata TSV requests via form submission.
        # All other special case values should be added using register_path_content_type.
        '/metadata/'
    ]
}


def register_path_content_type(*, path, content_type):
    """
    Registers that endpoints that begin with the specified path use the indicated content_type.

    This is part of an inelegant workaround for an issue in renderers.py that maybe we can make go away in the future.
    See the 'implementation note' in ingestion/common.py for more details.
    """
    exceptions = CONTENT_TYPE_SPECIAL_CASES.get(content_type, None)
    if exceptions is None:
        CONTENT_TYPE_SPECIAL_CASES[content_type] = exceptions = []
    if path not in exceptions:
        exceptions.append(path)


def content_type_allowed(request):
    """
    Returns True if the current request allows the requested content type.

    This is part of an inelegant workaround for an issue in renderers.py that maybe we can make go away in the future.
    See the 'implementation note' in ingestion/common.py for more details.
    """
    if request.content_type == "application/json":
        # For better or worse, we always allow this.
        return True

    exceptions = CONTENT_TYPE_SPECIAL_CASES.get(request.content_type)

    if exceptions:
        for text in exceptions:
            if text in request.path:
                return True

    return False


JSON_CONTENT_HEADERS = {'Content-Type': 'application/json', 'Accept': 'application/json'}


@contextlib.contextmanager
def posted_temporary_page(testapp, base_url, content):
    [val] = testapp.post_json(base_url, content, status=(201, 301)).maybe_follow().json['@graph']
    uuid = val.get('uuid')
    yield val
    if uuid:
        # Note: Without JSON headers, this will get a 415 even if it's not using the result data. -kmp 23-Feb-2021
        testapp.delete(url_path_join('/', uuid), headers=JSON_CONTENT_HEADERS)


def workbook_lookup(item_type, **attributes):
    return any_inserts_lookup('workbook-inserts', item_type=item_type, **attributes)


def any_inserts_lookup(inserts_directory_name, item_type, **attributes):
    item_filename = pkg_resources.resource_filename('encoded', 'tests/data/' + inserts_directory_name
                                                    + "/" + item_type.lower() + ".json")
    with io.open(item_filename) as fp:
        data = json.load(fp)
        return find_association(data, **attributes)


# for more information, visit http://detectmobilebrowsers.com/
_IS_MOBILE_BROWSER_MATCH_B = re.compile(r"(android|bb\\d+|meego).+mobile|avantgo|bada\\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\\.(browser|link)|vodafone|wap|windows ce|xda|xiino", re.I | re.M)
_IS_MOBILE_BROWSER_MATCH_V = re.compile(r"1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\\-(n|u)|c55\\/|capi|ccwa|cdm\\-|cell|chtm|cldc|cmd\\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\\-s|devi|dica|dmob|do(c|p)o|ds(12|\\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\\-|_)|g1 u|g560|gene|gf\\-5|g\\-mo|go(\\.w|od)|gr(ad|un)|haie|hcit|hd\\-(m|p|t)|hei\\-|hi(pt|ta)|hp( i|ip)|hs\\-c|ht(c(\\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\\-(20|go|ma)|i230|iac( |\\-|\\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\\/)|klon|kpt |kwc\\-|kyo(c|k)|le(no|xi)|lg( g|\\/(k|l|u)|50|54|\\-[a-w])|libw|lynx|m1\\-w|m3ga|m50\\/|ma(te|ui|xo)|mc(01|21|ca)|m\\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\\-2|po(ck|rt|se)|prox|psio|pt\\-g|qa\\-a|qc(07|12|21|32|60|\\-[2-7]|i\\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\\-|oo|p\\-)|sdk\\/|se(c(\\-|0|1)|47|mc|nd|ri)|sgh\\-|shar|sie(\\-|m)|sk\\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\\-|v\\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\\-|tdg\\-|tel(i|m)|tim\\-|t\\-mo|to(pl|sh)|ts(70|m\\-|m3|m5)|tx\\-9|up(\\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\\-|your|zeto|zte\\-", re.I | re.M)

def is_mobile_browser(request):
    if hasattr(request, 'user_agent') and request.user_agent is not None:
        user_agent = request.user_agent
        b = _IS_MOBILE_BROWSER_MATCH_B.search(user_agent)
        v = _IS_MOBILE_BROWSER_MATCH_V.search(user_agent[0:4])
        if b or v:
            return True      
    # fallback
    return False


def _app_from_clues(app=None, registry=None, context=None):
    if count_if(identity, [app, registry, context]) != 1:
        raise RuntimeError("Expected exactly one of app, registry, or context.")
    if not app:
        app = (registry or context).app
    return app


EMAIL_PATTERN = re.compile(r'[^@]+[@][^@]+')


def make_vapp_for_email(*, email, app=None, registry=None, context=None):
    app = _app_from_clues(app=app, registry=registry, context=context)
    if not isinstance(email, str) or not EMAIL_PATTERN.match(email):
        # It's critical to check that the pattern has an '@' so we know it's not a system account (injection).
        raise RuntimeError("Expected email to be a string of the form 'user@host'.")
    user_environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': email,
    }
    vapp = VirtualApp(app, user_environ)
    return vapp


@contextlib.contextmanager
def vapp_for_email(email, app=None, registry=None, context=None):
    yield make_vapp_for_email(email=email, app=app, registry=registry, context=context)


def make_vapp_for_ingestion(*, app=None, registry=None, context=None):
    app = _app_from_clues(app=app, registry=registry, context=context)
    user_environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'INGESTION',
    }
    vapp = VirtualApp(app, user_environ)
    return vapp


@contextlib.contextmanager
def vapp_for_ingestion(app=None, registry=None, context=None):
    yield make_vapp_for_ingestion(app=app, registry=registry, context=context)


def make_s3_client():
    s3_client_extra_args = {}
    if 'IDENTITY' in os.environ:
        identity = assume_identity()
        s3_client_extra_args['aws_access_key_id'] = key_id = identity.get('S3_AWS_ACCESS_KEY_ID')
        s3_client_extra_args['aws_secret_access_key'] = identity.get('S3_AWS_SECRET_ACCESS_KEY')
        s3_client_extra_args['region_name'] = ECSUtils.REGION
        log.info(f"make_s3_client using S3 entity ID {key_id[:10]} arguments in `boto3 client creation call.")
        if 'ENCODED_S3_ENCRYPT_KEY_ID' in identity:
            # This setting is required when testing locally and encrypted buckets need to be accessed.
            s3_client_extra_args['config'] = Config(signature_version='s3v4')
    else:
        log.info(f'make_s3_client called with no identity')

    s3_client = boto3.client('s3', **s3_client_extra_args)
    return s3_client


def build_s3_presigned_get_url(*, params):
    """ Helper function that builds a presigned URL. """
    s3_client = make_s3_client()
    return s3_client.generate_presigned_url(
        ClientMethod='get_object',
        Params=params,
        ExpiresIn=36 * 60 * 60
    )


def convert_integer_to_comma_string(value):
    """Convert integer to comma-formatted string for displaying SV
    position.

    :param value: Value to format.
    :type value: int
    :returns: Comma-formatted integer or None
    :rtype: str or None
    """
    result = None
    if isinstance(value, int):
        result = format(value, ",d")
    return result
