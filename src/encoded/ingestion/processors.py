from .exceptions import UndefinedIngestionProcessorType
from ..types.ingestion import SubmissionFolio


INGESTION_UPLOADERS = {}


def ingestion_processor(processor_type):
    """
    @ingestion_uploader(<ingestion-type-name>) is a decorator that declares the upload handler for an ingestion type.
    """

    def ingestion_type_decorator(fn):
        if processor_type in INGESTION_UPLOADERS:
            raise RuntimeError(f"Ingestion type {processor_type} is already defined.")
        INGESTION_UPLOADERS[processor_type] = fn
        return fn

    return ingestion_type_decorator


def get_ingestion_processor(processor_type):
    handler = INGESTION_UPLOADERS.get(processor_type, None)
    if not handler:
        raise UndefinedIngestionProcessorType(processor_type)
    return handler


@ingestion_processor('data_bundle')
def handle_data_bundle(submission: SubmissionFolio):

    # We originally called it 'data_bundle' and we retained that as OK in the schema
    # to not upset anyone testing with the old name, but this is not the name to use
    # any more, so reject new submissions of this kind. -kmp 27-Aug-2020

    with submission.processing_context():

        raise RuntimeError("handle_data_bundle was called (for ingestion_type=%s). This is always an error."
                           " The ingestion_type 'data_bundle' was renamed to 'metadata_bundle'"
                           " prior to the initial release. Your submission program probably needs to be updated."
                           % submission.ingestion_type)


@ingestion_processor('ontology')
def handle_ontology_update(submission: SubmissionFolio):
    """ Idea being you can submit a SubmissionFolio item that corresponds to an ontology
        term update.
    """
    with submission.processing_context():
        pass  # TODO: implement me (from Will's ff_ingester branch)
