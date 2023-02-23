import json
import structlog
from dcicutils.misc_utils import ignored, PRINT
from ..ingestion_listener import (IngestionListener, DEBUG_SUBMISSIONS)
from ..types.ingestion import SubmissionFolio
from ..util import (debuglog, vapp_for_email, make_s3_client)
from .common import metadata_bundles_bucket
from .ingestion_message import IngestionMessage
from .ingestion_message_handler_decorator import ingestion_message_handler
from .processors import get_ingestion_processor


log = structlog.getLogger(__name__)


def includeme(config):
    pass


@ingestion_message_handler(ingestion_type="default")
def ingestion_message_handler_default(message: IngestionMessage, listener: IngestionListener) -> bool:
    """
    This is the part of listener.IngestionListener.run function which handles a
    single message within the (effectively-infinite) incoming message handling loop,
    specifically for non-VCF files; refactored out of ingestion_listener.py February 2023.
    Returns True if the message was successfully handled, otherwise False.
    """

    PRINT(f"Default ingestion message handler called for message ({message.uuid}) type: {message.type}")

    # Let's minimally disrupt things for now. We can refactor this later
    # to make all the parts work the same -kmp
    if listener.INGEST_AS_USER:
        try:
            debuglog("REQUESTING RESTRICTED PROCESSING:", message.uuid)
            process_submission(submission_id=message.uuid,
                               ingestion_type=message.type,
                               # bundles_bucket=submission.bucket,
                               app=listener.vapp.app)
            debuglog("RESTRICTED PROCESSING DONE:", message.uuid)
        except Exception as e:
            log.error(e)
    else:
        submission = SubmissionFolio(vapp=listener.vapp, ingestion_type=message.type,
                                     submission_id=message.uuid)
        handler = get_ingestion_processor(message.type)
        try:
            debuglog("HANDLING:", message.uuid)
            handler(submission)
            debuglog("HANDLED:", message.uuid)
        except Exception as e:
            log.error(e)
    # If we suceeded, we don't need to do it again, and if we failed we don't need to fail again.
    return True


def process_submission(*, submission_id, ingestion_type, app, bundles_bucket=None, s3_client=None):
    ignored(s3_client)  # we might want to restore the ability to pass this, but no one actually does. -kmp 6-Dec-2021
    bundles_bucket = bundles_bucket or metadata_bundles_bucket(app.registry)
    s3_client = make_s3_client()
    manifest_name = "{id}/manifest.json".format(id=submission_id)
    log.warning(f'Processing submission {manifest_name}')
    obj = s3_client.get_object(Bucket=bundles_bucket, Key=manifest_name)
    # data = json.load(obj)['Body']
    data = json.load(obj['Body'])
    email = None
    try:
        email = data['email']
    except KeyError as e:
        ignored(e)
        debuglog("Manifest data is missing 'email' field.")
        if DEBUG_SUBMISSIONS:
            pass
            # import pdb; pdb.set_trace()
    debuglog("processing submission %s with email %s" % (submission_id, email))
    with vapp_for_email(email=email, app=app) as vapp:
        if DEBUG_SUBMISSIONS:
            PRINT("PROCESSING FOR %s" % email)
        submission = SubmissionFolio(vapp=vapp, ingestion_type=ingestion_type, submission_id=submission_id, log=None)
        handler = get_ingestion_processor(ingestion_type)
        result = handler(submission)
        if DEBUG_SUBMISSIONS:
            PRINT("DONE PROCESSING FOR %s" % email)
        return {
            "result": result,
            "ingestion_type": ingestion_type,
            "submission_id": submission_id,
        }
