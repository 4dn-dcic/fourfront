from dcicutils.misc_utils import environ_bool
from ..util import resolve_file_path

VARIANT_SCHEMA = resolve_file_path('./schemas/variant.json')
VARIANT_SAMPLE_SCHEMA = resolve_file_path('./schemas/variant_sample.json')
STATUS_QUEUED = 'Queued'
STATUS_INGESTED = 'Ingested'
STATUS_DISABLED = 'Ingestion disabled'
STATUS_ERROR = 'Error'
STATUS_IN_PROGRESS = 'In progress'
SHARED = 'shared'
STRUCTURAL_VARIANT_SCHEMA = resolve_file_path("./schemas/structural_variant.json")
STRUCTURAL_VARIANT_SAMPLE_SCHEMA = resolve_file_path(
    "./schemas/structural_variant_sample.json"
)

DEBUG_SUBMISSIONS = environ_bool("DEBUG_SUBMISSIONS", default=False)


class IngestionListenerBase:
    """
    This is the type (of the second argument) expected by the
    ingestion_message_handler decorator. In separate file from
    ingestion_listener.py to avoid recursive imports via
    ingestion_message_handler_decorator.py where this is used.
    """
    pass
