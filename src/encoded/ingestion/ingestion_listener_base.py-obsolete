from dcicutils.misc_utils import environ_bool

STATUS_QUEUED = 'Queued'
STATUS_INGESTED = 'Ingested'
STATUS_DISABLED = 'Ingestion disabled'
STATUS_ERROR = 'Error'
STATUS_IN_PROGRESS = 'In progress'
SHARED = 'shared'
DEBUG_SUBMISSIONS = environ_bool("DEBUG_SUBMISSIONS", default=False)


class IngestionListenerBase:
    """
    This is the type (of the second argument) expected by the
    ingestion_message_handler decorator. In separate file from
    ingestion_listener.py to avoid recursive imports via
    ingestion_message_handler_decorator.py where this is used.
    """
    pass
